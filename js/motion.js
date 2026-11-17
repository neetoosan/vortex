/* =========================================================
   VORTEX WRAPS — premium motion layer (all pages)
   Needs GSAP + ScrollTrigger (+ optional Lenis) loaded first.
   Everything degrades gracefully: no libraries, touch devices
   and prefers-reduced-motion all get a calm, static page.
   ========================================================= */
(() => {
  'use strict';
  const root = document.documentElement;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* private mode */ } },
  };

  const ready = () => root.classList.add('is-ready');

  if (!hasGSAP || reduce) {
    ready();
    return;
  }
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (window.Lenis && !('ontouchstart' in window && !finePointer)) {
    lenis = new window.Lenis({ duration: 1.15, easing: t => 1 - Math.pow(1 - t, 4), smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    window.vortexLenis = lenis;

    // in-page anchors go through Lenis
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: id === '#top' ? 0 : -70 });
    }));
    // pause while the menu / a dialog is open
    const lockCheck = new MutationObserver(() => {
      const locked = document.body.classList.contains('menu-open') || !!$('dialog[open]');
      locked ? lenis.stop() : lenis.start();
    });
    lockCheck.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    $$('dialog').forEach(d => lockCheck.observe(d, { attributes: true, attributeFilter: ['open'] }));
  }

  /* ---------- Injected chrome: progress bar, grain, cursor ---------- */
  const progress = Object.assign(document.createElement('div'), { className: 'scroll-progress' });
  const grain = Object.assign(document.createElement('div'), { className: 'grain' });
  document.body.append(progress, grain);
  gsap.to(progress, {
    scaleX: 1, ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
  });

  if (finePointer) {
    const dot = Object.assign(document.createElement('div'), { className: 'cursor-dot' });
    const ring = Object.assign(document.createElement('div'), { className: 'cursor-ring' });
    const label = Object.assign(document.createElement('span'), { className: 'cursor-label' });
    ring.appendChild(label);
    document.body.append(dot, ring);
    root.classList.add('has-cursor');
    const dx = gsap.quickTo(dot, 'x', { duration: 0.08 }), dy = gsap.quickTo(dot, 'y', { duration: 0.08 });
    const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
    window.addEventListener('pointermove', e => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
    document.addEventListener('pointerover', e => {
      const t = e.target.closest('[data-cursor], a, button, input, select, textarea, label');
      ring.classList.toggle('is-link', !!t && !t.hasAttribute('data-cursor'));
      const txt = t && t.getAttribute('data-cursor');
      ring.classList.toggle('is-label', !!txt);
      label.textContent = txt || '';
    });
    document.addEventListener('pointerdown', () => ring.classList.add('is-down'));
    document.addEventListener('pointerup', () => ring.classList.remove('is-down'));
    document.addEventListener('mouseleave', () => root.classList.add('cursor-out'));
    document.addEventListener('mouseenter', () => root.classList.remove('cursor-out'));
  }

  /* ---------- Page transitions (veil) ---------- */
  const veil = $('.veil');
  const isInternalPage = a => {
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return false;
    const url = new URL(a.href, location.href);
    return url.origin === location.origin && url.pathname !== location.pathname && /\.html$|\/$/.test(url.pathname);
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!veil || !isInternalPage(a) || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    store.set('vx-nav', '1');
    gsap.timeline({ onComplete: () => { location.href = a.href; } })
      .set(veil, { yPercent: 100, display: 'block' })
      .to(veil, { yPercent: 0, duration: 0.7, ease: 'power4.inOut' });
  });
  window.addEventListener('pageshow', e => { if (e.persisted && veil) gsap.set(veil, { yPercent: -100 }); });

  /* ---------- Preloader (first visit per session) ---------- */
  function intro() {
    return new Promise(resolve => {
      const first = !store.get('vx-seen');
      store.set('vx-seen', '1');
      if (!first) {
        if (veil) gsap.to(veil, { yPercent: -100, duration: 0.8, ease: 'power4.inOut', delay: 0.05, onComplete: () => { veil.style.display = 'none'; } });
        ready();
        return resolve();
      }
      const pre = document.createElement('div');
      pre.className = 'preloader';
      pre.innerHTML = `
        <img src="assets/web/logo-wide.png" alt="" class="preloader__logo">
        <div class="preloader__bar"><i></i></div>
        <div class="preloader__count"><span>0</span>%</div>
        <p class="preloader__tag">Premium wraps &amp; paint protection</p>`;
      document.body.appendChild(pre);
      if (veil) veil.style.display = 'none';
      const n = { v: 0 };
      const count = $('.preloader__count span', pre);
      gsap.timeline({ onComplete: () => { pre.remove(); resolve(); } })
        .from('.preloader__logo', { opacity: 0, scale: 0.9, filter: 'blur(12px)', duration: 0.9, ease: 'power3.out' })
        .from('.preloader__tag', { opacity: 0, y: 12, duration: 0.6 }, '-=0.5')
        .to(n, { v: 100, duration: 1.3, ease: 'power2.inOut', onUpdate: () => { count.textContent = Math.round(n.v); } }, 0.2)
        .to('.preloader__bar i', { scaleX: 1, duration: 1.3, ease: 'power2.inOut' }, 0.2)
        .add(ready, '-=0.15')
        .to(pre, { yPercent: -100, duration: 0.9, ease: 'power4.inOut' });
    });
  }

  /* ---------- Text: split headings into rising words ---------- */
  function splitWords(el) {
    const out = [];
    const walk = (node, wrapEm) => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const mask = document.createElement('span'); mask.className = 'w-mask';
            const inner = document.createElement(wrapEm ? 'em' : 'span'); inner.className = 'w-in';
            inner.textContent = part;
            mask.appendChild(inner); frag.appendChild(mask); out.push(inner);
          });
          n.replaceWith(frag);
        } else if (n.nodeName === 'EM') {
          const frag = document.createDocumentFragment();
          const tmp = document.createElement('span');
          tmp.textContent = n.textContent;
          walk(tmp, true);
          [...tmp.childNodes].forEach(c => frag.appendChild(c));
          n.replaceWith(frag);
        } else if (n.nodeName === 'BR') {
          /* keep */
        } else if (n.nodeType === Node.ELEMENT_NODE) {
          walk(n, wrapEm);
        }
      });
    };
    walk(el, false);
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    return out;
  }

  /* ---------- Build everything after the intro ---------- */
  intro().then(() => {
    /* "In the bay": pinned horizontal scroll on desktop */
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px)', () => {
      const bay = $('.bay'), bayTrack = $('.bay__track');
      if (!bay || !bayTrack) return;
      $$('[aria-hidden="true"]', bayTrack).forEach(c => c.remove());
      bayTrack.style.animation = 'none';
      bay.classList.add('bay--pinned');
      const dist = () => bayTrack.scrollWidth - window.innerWidth + 80;
      const tween = gsap.to(bayTrack, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: bay, start: 'top top', end: () => `+=${dist()}`, scrub: 0.8, pin: true, invalidateOnRefresh: true },
      });
      $$('img', bayTrack).forEach(img => gsap.from(img, {
        rotate: 6, y: 80, opacity: 0.3, ease: 'none',
        scrollTrigger: { trigger: img, containerAnimation: tween, start: 'left 100%', end: 'left 60%', scrub: true },
      }));
      return () => bay.classList.remove('bay--pinned');
    });

    /* hero intro */
    const hero = $('.hero');
    if (hero) {
      gsap.timeline()
        .from('.hero__tags', { y: 20, opacity: 0, duration: 0.8, ease: 'power3.out' }, 0.1)
        .from('.hero__video', { opacity: 0, duration: 1.6, ease: 'power2.out' }, 0);
      gsap.to('.hero__video', { yPercent: 18, scale: 1.12, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero__title', { yPercent: -35, opacity: 0.15, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      const hb = $('.hero__bottom'); if (hb) hb.style.animation = 'none';
      if (hb) gsap.from(hb.children, { opacity: 0, y: 30, duration: 1, delay: 0.6, stagger: 0.1, ease: 'power3.out' });
      gsap.to('.hero__bottom', { y: -60, opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: '30% top', end: '80% top', scrub: true } });
    }

    /* headings */
    $$('[data-reveal="words"]').forEach(el => {
      const words = splitWords(el);
      gsap.from(words, {
        yPercent: 115, rotate: 4, duration: 1.1, ease: 'power4.out', stagger: 0.045,
        scrollTrigger: { trigger: el, start: 'top 88%' },
      });
    });

    /* labels & paragraphs fade-up */
    $$('[data-reveal="fade"]').forEach(el => {
      gsap.from(el, { y: 30, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
    });
    $$('[data-reveal="stagger"]').forEach(el => {
      gsap.from(el.children, { y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: el, start: 'top 88%' } });
    });

    /* images: clip reveal + inner zoom */
    $$('[data-reveal="img"]').forEach(el => {
      const media = el.querySelector('img, video');
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%' } });
      tl.fromTo(el, { clipPath: 'inset(100% 0% 0% 0% round 18px)' }, { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.3, ease: 'power4.inOut' });
      if (media) tl.from(media, { scale: 1.35, duration: 1.6, ease: 'power3.out' }, 0);
    });

    /* parallax */
    $$('[data-speed]').forEach(el => {
      const s = parseFloat(el.dataset.speed) || 0.1;
      gsap.fromTo(el, { yPercent: -s * 100 }, { yPercent: s * 100, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    /* velocity marquee */
    const track = $('.marquee__track');
    if (track) {
      track.style.animation = 'none';
      let x = 0, dir = 1, boost = 0;
      const half = () => track.scrollWidth / 2;
      ScrollTrigger.create({
        start: 0, end: 'max',
        onUpdate: self => { dir = self.direction; boost = Math.min(Math.abs(self.getVelocity()) / 120, 14); },
      });
      gsap.ticker.add(() => {
        boost *= 0.92;
        x -= (1 + boost) * dir * 0.9;
        const h = half();
        if (x <= -h) x += h;
        if (x > 0) x -= h;
        track.style.transform = `translate3d(${x}px,0,0)`;
        track.style.setProperty('--skew', `${(-boost * dir * 0.9).toFixed(2)}deg`);
      });
    }

    /* stats: line draw */
    $$('.stat').forEach((s, i) => gsap.from(s, { y: 60, opacity: 0, duration: 1, delay: i * 0.1, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 90%' } }));

    /* reel frame grows in */
    const reelFrame = $('.reel__frame');
    if (reelFrame) gsap.from(reelFrame, { rotate: -8, scale: 0.85, y: 80, ease: 'none', scrollTrigger: { trigger: '.reel', start: 'top bottom', end: 'center center', scrub: true } });

    /* footer word */
    const fw = $('.footer__word');
    if (fw) {
      fw.innerHTML = [...fw.textContent].map(c => `<span>${c}</span>`).join('');
      gsap.from('.footer__word span', { yPercent: 100, opacity: 0, stagger: 0.06, ease: 'power4.out', duration: 1.2, scrollTrigger: { trigger: '.footer', start: 'top 80%' } });
    }

    /* services: floating preview follows the cursor */
    if (finePointer) {
      const acc = $('#servicesAcc');
      if (acc) {
        const fl = document.createElement('div');
        fl.className = 'float-preview';
        fl.innerHTML = '<img alt="">';
        document.body.appendChild(fl);
        const img = $('img', fl);
        const fx = gsap.quickTo(fl, 'x', { duration: 0.6, ease: 'power3' }), fy = gsap.quickTo(fl, 'y', { duration: 0.6, ease: 'power3' });
        $$('.acc__item', acc).forEach(item => {
          const head = $('.acc__head', item);
          const src = $('.acc__inner img', item)?.src;
          head.addEventListener('pointerenter', () => {
            if (item.classList.contains('is-open') || !src) return;
            img.src = src;
            gsap.to(fl, { opacity: 1, scale: 1, rotate: -4, duration: 0.4, ease: 'power3.out' });
          });
          head.addEventListener('pointerleave', () => gsap.to(fl, { opacity: 0, scale: 0.6, rotate: 0, duration: 0.3 }));
          head.addEventListener('click', () => gsap.to(fl, { opacity: 0, scale: 0.6, duration: 0.2 }));
          head.addEventListener('pointermove', e => { fx(e.clientX); fy(e.clientY); });
        });
      }
    }

    /* magnetic buttons */
    if (finePointer) {
      $$('.btn, .menu-btn, [data-magnetic]').forEach(el => {
        const strength = el.hasAttribute('data-magnetic') ? 0.45 : 0.25;
        const mx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' }), my = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
        el.addEventListener('pointermove', e => {
          const r = el.getBoundingClientRect();
          mx((e.clientX - r.left - r.width / 2) * strength);
          my((e.clientY - r.top - r.height / 2) * strength);
        });
        el.addEventListener('pointerleave', () => { gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.35)' }); });
      });
    }

    /* tilt cards */
    if (finePointer) {
      $$('[data-tilt]').forEach(el => {
        gsap.set(el, { transformPerspective: 900 });
        const rX = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' }), rY = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
        el.addEventListener('pointermove', e => {
          const r = el.getBoundingClientRect();
          rY(((e.clientX - r.left) / r.width - 0.5) * 10);
          rX(-((e.clientY - r.top) / r.height - 0.5) * 10);
          el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
          el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
        });
        el.addEventListener('pointerleave', () => { rX(0); rY(0); });
      });
    }

    /* gallery tiles */
    $$('.g-item').forEach(it => gsap.from(it, { y: 70, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: it, start: 'top 95%' } }));

    /* menu link stagger */
    const menuBtn = $('#menuBtn');
    if (menuBtn) menuBtn.addEventListener('click', () => {
      if (document.body.classList.contains('menu-open')) {
        gsap.fromTo('.menu__links li', { yPercent: 120, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.06, duration: 0.9, delay: 0.25, ease: 'power4.out' });
      }
    });

    // images loading late can change layout
    let refreshTimer;
    const refreshSoon = () => { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 250); };
    window.addEventListener('load', refreshSoon);
    $$('img[loading="lazy"]').forEach(img => img.addEventListener('load', refreshSoon, { once: true }));
  });
})();
