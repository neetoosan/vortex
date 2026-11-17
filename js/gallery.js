/* Vortex Wraps — gallery: filters, hover previews, lightbox */
(() => {
  'use strict';
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  const items = [...grid.querySelectorAll('.g-item')];
  const chips = [...document.querySelectorAll('.chip')];

  /* ---------- Filters ---------- */
  chips.forEach(chip => chip.addEventListener('click', () => {
    const f = chip.dataset.filter;
    chips.forEach(c => { c.classList.toggle('is-active', c === chip); c.setAttribute('aria-pressed', c === chip); });
    items.forEach(it => { it.hidden = f !== 'all' && it.dataset.type !== f; });
  }));

  /* ---------- Video tiles: preview on hover / when in view on touch ---------- */
  const canHover = window.matchMedia('(hover: hover)').matches;
  grid.querySelectorAll('.g-item[data-type="video"] video').forEach(v => {
    if (canHover) {
      const btn = v.closest('.g-open');
      btn.addEventListener('mouseenter', () => { v.preload = 'auto'; v.play().catch(() => {}); });
      btn.addEventListener('mouseleave', () => v.pause());
    }
  });

  /* ---------- Lightbox ---------- */
  const lb = document.getElementById('lightbox');
  const stage = document.getElementById('lbStage');
  const caption = document.getElementById('lbCaption');
  let current = -1;
  const visible = () => items.filter(it => !it.hidden);

  function show(item) {
    const btn = item.querySelector('.g-open');
    const { full, kind, alt, title } = btn.dataset;
    stage.innerHTML = '';
    let el;
    if (kind === 'video') {
      el = document.createElement('video');
      el.src = full;
      el.controls = true;
      el.autoplay = true;
      el.playsInline = true;
      el.setAttribute('aria-label', alt);
    } else {
      el = document.createElement('img');
      el.src = full;
      el.alt = alt;
    }
    stage.appendChild(el);
    caption.innerHTML = '';
    const t = document.createElement('strong'); t.textContent = title;
    const d = document.createElement('span'); d.textContent = alt;
    caption.append(t, d);
    current = visible().indexOf(item);
  }
  function step(dir) {
    const list = visible();
    if (!list.length) return;
    show(list[(current + dir + list.length) % list.length]);
  }
  function close() {
    stage.innerHTML = '';
    lb.close();
  }

  grid.addEventListener('click', e => {
    const btn = e.target.closest('.g-open');
    if (!btn) return;
    show(btn.closest('.g-item'));
    lb.showModal();
  });
  document.getElementById('lbClose').addEventListener('click', close);
  document.getElementById('lbPrev').addEventListener('click', () => step(-1));
  document.getElementById('lbNext').addEventListener('click', () => step(1));
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  lb.addEventListener('cancel', e => { e.preventDefault(); close(); });
  document.addEventListener('keydown', e => {
    if (!lb.open) return;
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });

  /* swipe on touch */
  let x0 = null;
  stage.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    x0 = null;
  });
})();
