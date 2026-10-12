// Local screenshot gallery. No tracking or automatic slide changes.
(() => {
  'use strict';
  for (const gallery of document.querySelectorAll('[data-carousel]')) {
    const track = gallery.querySelector('.carousel-track');
    const slides = [...gallery.querySelectorAll('.carousel-slide')];
    const dots = [...gallery.querySelectorAll('[data-slide]')];
    const count = gallery.querySelector('.carousel-count');
    const dialog = gallery.querySelector('dialog');
    let active = 0;
    let settleTimeout;
    let opener;
    const update = index => {
      active = index;
      const label = `${index + 1} / ${slides.length}`;
      if (count.textContent !== label) count.textContent = label;
      dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === index)));
    };
    const go = index => {
      clearTimeout(settleTimeout);
      const target = (index + slides.length) % slides.length;
      update(target);
      track.scrollTo({
        left: slides[target].offsetLeft - slides[0].offsetLeft,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
      });
    };
    gallery.querySelector('[data-previous]').addEventListener('click', () => go(active - 1));
    gallery.querySelector('[data-next]').addEventListener('click', () => go(active + 1));
    dots.forEach((dot, index) => dot.addEventListener('click', () => go(index)));
    track.addEventListener('keydown', event => {
      if (event.target !== track) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = {ArrowLeft: active - 1, ArrowRight: active + 1, Home: 0, End: slides.length - 1}[event.key];
      if (target === undefined) return;
      event.preventDefault();
      go(target);
    });
    track.addEventListener('scroll', () => {
      clearTimeout(settleTimeout);
      settleTimeout = setTimeout(() => {
        const distances = slides.map(slide => Math.abs(slide.offsetLeft - slides[0].offsetLeft - track.scrollLeft));
        update(distances.indexOf(Math.min(...distances)));
      }, 150);
    }, {passive: true});
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(() => {
        track.scrollTo({left: slides[active].offsetLeft - slides[0].offsetLeft, behavior: 'instant'});
      }).observe(track);
    }
    if (dialog && typeof dialog.showModal === 'function') {
      const largeImage = dialog.querySelector('img');
      const caption = dialog.querySelector('figcaption');
      slides.forEach(slide => {
        const link = slide.querySelector('a');
        link.addEventListener('click', event => {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          opener = link;
          largeImage.src = link.href;
          largeImage.alt = slide.querySelector('img').alt;
          caption.textContent = slide.querySelector('figcaption').textContent;
          dialog.showModal();
        });
      });
      dialog.querySelector('button').addEventListener('click', () => dialog.close());
      dialog.addEventListener('click', event => {if (event.target === dialog) dialog.close();});
      dialog.addEventListener('close', () => opener?.focus({preventScroll: true}));
    }
    gallery.setAttribute('data-carousel-ready', '');
  }
})();
