// Only a colour preference is stored locally. This file makes no network calls.
(() => {
  const root = document.documentElement;
  const key = 'kapibara-site-theme';
  const choices = new Set(['light', 'dark', 'auto']);
  let theme = 'auto';
  try {
    const stored = localStorage.getItem(key);
    if (choices.has(stored)) theme = stored;
  } catch {
    // Storage may be disabled. The controls still work for the current page.
  }

  function applyTheme(value) {
    if (value === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', value);
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === value));
    });
  }

  applyTheme(theme);
  root.classList.add('js');
  function bindControls() {
    applyTheme(theme);
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.addEventListener('click', () => {
        const value = button.dataset.themeChoice;
        if (!choices.has(value)) return;
        theme = value;
        applyTheme(theme);
        try {
          localStorage.setItem(key, theme);
        } catch {
          // A blocked preference store must not prevent theme changes.
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindControls, { once: true });
  } else {
    bindControls();
  }
})();
