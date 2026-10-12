// Buildless website validation. No packages or network calls are required.
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const failures = [];
const pages = [];
for (const directory of ['', 'en']) {
  for (const entry of await readdir(path.join(root, directory))) {
    if (entry.endsWith('.html')) pages.push(path.join(root, directory, entry));
  }
}
const documents = new Map(await Promise.all(pages.map(async file => [file, await readFile(file, 'utf8')])));
for (const [file, html] of documents) {
  const label = path.relative(root, file);
  for (const required of ['<title>', 'name="viewport"', '<main', 'lang=']) {
    if (!html.includes(required)) failures.push(`${label}: missing ${required}`);
  }
  if (/\b(TODO|TBD|PLACEHOLDER)\b|example\.com|YOUR_[A-Z_]+|\{\{/.test(html)) {
    failures.push(`${label}: unfinished content`);
  }
  if (/<form\b|<iframe\b/i.test(html)) failures.push(`${label}: unexpected active or embedded content`);
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const prefix = label.startsWith('en' + path.sep) ? '../assets/' : 'assets/';
  const allowedScripts = [`src="${prefix}theme.js"`];
  if (path.basename(file) === 'index.html') allowedScripts.push(`src="${prefix}carousel.js"`);
  for (const script of scripts) {
    if (!allowedScripts.includes(script[1].trim()) || script[2].trim()) {
      failures.push(`${label}: unexpected script`);
    }
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  if (new Set(ids).size !== ids.length) failures.push(`${label}: duplicate IDs`);
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const href = match[1];
    if (/^https:\/\//.test(href)) continue;
    if (/^mailto:/.test(href)) {
      if (!/^mailto:support@lemric\.com(?:\?|$)/.test(href)) failures.push(`${label}: unexpected contact ${href}`);
      continue;
    }
    if (href.startsWith('/') || /^[a-z][\w+.-]*:/i.test(href)) {
      failures.push(`${label}: unsupported or host-root URL ${href}`);
      continue;
    }
    const [relative, fragment] = href.split('#');
    const target = path.resolve(path.dirname(file), decodeURIComponent(relative || path.basename(file)));
    if (target !== root && !target.startsWith(root + path.sep)) {
      failures.push(`${label}: link escapes website ${href}`);
      continue;
    }
    try {
      if (!(await stat(target)).isFile()) throw new Error('Not a file');
      if (fragment) {
        const content = documents.get(target);
        if (!content || !content.includes(`id="${fragment}"`)) failures.push(`${label}: missing anchor ${href}`);
      }
    } catch {
      failures.push(`${label}: missing local resource ${href}`);
    }
  }
}
const stylesheet = path.join(root, 'assets', 'style.css');
const css = await readFile(stylesheet, 'utf8');
for (const match of css.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)) {
  const resource = match[1];
  const target = path.resolve(path.dirname(stylesheet), resource);
  if (/^[a-z][\w+.-]*:|^\//i.test(resource) || !target.startsWith(root + path.sep)) {
    failures.push(`assets/style.css: unexpected resource ${resource}`);
    continue;
  }
  try {
    if (!(await stat(target)).isFile()) throw new Error('Not a file');
  } catch {
    failures.push(`assets/style.css: missing resource ${resource}`);
  }
}
for (const language of ['', 'en/']) {
  for (const name of ['index.html', 'support.html', 'privacy.html', 'privacy-choices.html', 'terms.html']) {
    const html = documents.get(path.join(root, language, name));
    if (!html) failures.push(`Missing required page ${language}${name}`);
    if (['support.html', 'privacy.html', 'privacy-choices.html'].includes(name) && !html?.includes('Lemric Dominik Łabudziński')) {
      failures.push(`${language}${name}: missing publisher`);
    }
  }
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`PASS: ${pages.length} HTML pages; local links, images, anchors, languages and contact information verified.`);
}
