/* =========================================================
   VORTEX WRAPS — site script
   ---------------------------------------------------------
   ✏️  EDIT CONTACT DETAILS HERE — every phone / WhatsApp /
   email / social link on the page is filled from this block.
   ========================================================= */
const CONTACT = {
  phoneDisplay: '+234 806 655 5086',   // shown on the page
  phoneIntl:    '2348066555086',       // digits only, with country code (used for tel: and WhatsApp)
  email:        'vortexwraps02@gmail.com',             // (empty = hidden)
  location:     'Lagos, Nigeria',
  instagram:    'https://www.instagram.com/vortexwraps_/', // (empty = hidden)
  tiktok:       'https://www.tiktok.com/@vortexwraps__',   // (empty = hidden)
};

(() => {
  'use strict';
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const waLink = (text = '') =>
    `https://wa.me/${CONTACT.phoneIntl}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

  /* ---------- Fill contact details ---------- */
  $$('[data-contact]').forEach(el => {
    const kind = el.dataset.contact;
    switch (kind) {
      case 'phone':
        el.textContent = CONTACT.phoneDisplay;
        el.href = `tel:+${CONTACT.phoneIntl}`;
        break;
      case 'email':
        if (!CONTACT.email) { el.hidden = true; break; }
        el.textContent = CONTACT.email;
        el.href = `mailto:${CONTACT.email}`;
        break;
      case 'location':
        el.textContent = CONTACT.location;
        break;
      case 'whatsapp':
        el.href = waLink("Hi Vortex Wraps! I'd like to ask about wrapping my car.");
        break;
      case 'instagram':
      case 'tiktok':
        if (CONTACT[kind]) el.href = CONTACT[kind];
        else el.hidden = true;
        break;
    }
  });
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Floating WhatsApp button (every page) ---------- */
  const wa = document.createElement('a');
  wa.className = 'wa-float';
  wa.href = waLink("Hi Vortex Wraps! I'd like to ask about wrapping my car.");
  wa.target = '_blank';
  wa.rel = 'noopener';
  wa.setAttribute('aria-label', 'Chat with Vortex Wraps on WhatsApp');
  wa.innerHTML = `
    <span class="wa-float__tip">Chat with us</span>
    <span class="wa-float__btn">
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><path fill="currentColor" d="M16.04 3C9.4 3 4 8.36 4 14.97c0 2.1.55 4.16 1.6 5.97L4 27l6.24-1.63a12.1 12.1 0 0 0 5.8 1.47h.01C22.68 26.84 28 21.48 28 14.87 28 8.3 22.68 3 16.04 3Zm0 21.8h-.01a10 10 0 0 1-5.13-1.4l-.37-.22-3.7.97.99-3.6-.24-.37a9.86 9.86 0 0 1-1.52-5.21c0-5.48 4.48-9.94 10-9.94 2.67 0 5.18 1.04 7.07 2.92a9.84 9.84 0 0 1 2.92 7.03c0 5.48-4.49 9.82-10.01 9.82Zm5.49-7.38c-.3-.15-1.78-.87-2.05-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.96 1.17-.18.2-.35.22-.65.08-.3-.15-1.27-.47-2.42-1.49a9.04 9.04 0 0 1-1.67-2.07c-.18-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.68-.51h-.58c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.48.71.31 1.27.5 1.7.63.72.22 1.37.19 1.88.12.57-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.08-.13-.28-.2-.58-.35Z"/></svg>
    </span>`;
  document.body.appendChild(wa);

  /* ---------- Finish configurator (home) ---------- */
  const config = $('#finish');
  if (config) {
    const car = $('#configCar');
    const nameEl = $('#configName'), finishEl = $('#configFinish'), book = $('#configBook');
    const seg = $('.seg', config), pill = $('.seg__pill', config);
    let finish = 'satin', colour = 'Satin Grey';
    const movePill = btn => { pill.style.width = `${btn.offsetWidth}px`; pill.style.transform = `translateX(${btn.offsetLeft - 4}px)`; };
    const sync = () => {
      const label = finish[0].toUpperCase() + finish.slice(1);
      finishEl.textContent = label;
      nameEl.textContent = colour;
      book.href = `book.html?service=colour-change&finish=${encodeURIComponent(label)}&colour=${encodeURIComponent(colour)}`;
      car.classList.remove('is-changing'); void car.offsetWidth; car.classList.add('is-changing');
    };
    $$('.seg__btn', seg).forEach(b => b.addEventListener('click', () => {
      $$('.seg__btn', seg).forEach(x => { x.classList.toggle('is-active', x === b); x.setAttribute('aria-checked', x === b); });
      finish = b.dataset.finish;
      car.dataset.finish = finish;
      movePill(b); sync();
    }));
    $$('.swatch', config).forEach(s => s.addEventListener('click', () => {
      $$('.swatch', config).forEach(x => { x.classList.toggle('is-active', x === s); x.setAttribute('aria-checked', x === s); });
      car.style.setProperty('--car', s.style.getPropertyValue('--sw'));
      colour = s.dataset.name;
      sync();
    }));
    const activeSeg = $('.seg__btn.is-active', seg);
    requestAnimationFrame(() => movePill(activeSeg));
    window.addEventListener('resize', () => movePill($('.seg__btn.is-active', seg)));
    book.href = 'book.html?service=colour-change&finish=Satin&colour=Satin%20Grey';
  }

  /* ---------- Header state ---------- */
  const header = $('#header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Menu ---------- */
  const menuBtn = $('#menuBtn');
  const menu = $('#menu');
  const setMenu = open => {
    document.body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open);
    menu.setAttribute('aria-hidden', !open);
    $('.menu-btn__label').textContent = open ? 'Close' : 'Menu';
  };
  menuBtn.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Hero letters ---------- */
  $$('[data-split]').forEach(el => {
    const text = el.textContent.trim();
    el.textContent = '';
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = ch;
      s.style.animationDelay = `${0.1 + i * 0.07}s`;
      el.appendChild(s);
    });
  });

  /* ---------- Rotating service tag ---------- */
  const rot = $('#rotator');
  if (rot) {
    const items = $$('span', rot);
    let i = 0;
    items[0].classList.add('is-active');
    if (!reduceMotion) {
      setInterval(() => {
        const cur = items[i];
        cur.classList.remove('is-active');
        cur.classList.add('is-leaving');
        setTimeout(() => cur.classList.remove('is-leaving'), 600);
        i = (i + 1) % items.length;
        items[i].classList.add('is-active');
      }, 2400);
    }
  }

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.15 });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- Count-up stats ---------- */
  const countIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target;
      const end = +el.dataset.count;
      const dur = 1600;
      const t0 = performance.now();
      const tick = now => {
        const p = Math.min((now - t0) / dur, 1);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      reduceMotion ? (el.textContent = end) : requestAnimationFrame(tick);
      countIO.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------- Statement: words light up on scroll ---------- */
  const statement = $('#statement');
  if (statement) {
    const words = [];
    [...statement.childNodes].forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const s = document.createElement('span');
          s.className = 'w';
          s.textContent = part;
          words.push(s);
          frag.appendChild(s);
        });
        node.replaceWith(frag);
      } else if (node.nodeName === 'EM') {
        node.classList.add('w');
        words.push(node);
      }
    });
    const update = () => {
      const r = statement.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(Math.max((vh * 0.85 - r.top) / (r.height + vh * 0.35), 0), 1);
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < n));
    };
    if (reduceMotion) words.forEach(w => w.classList.add('on'));
    else { update(); window.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', update); }
  }

  /* ---------- "In the bay" strip: duplicate for a seamless loop ---------- */
  const bay = $('.bay__track');
  if (bay) [...bay.children].forEach(img => {
    const c = img.cloneNode(true);
    c.alt = '';
    c.setAttribute('aria-hidden', 'true');
    bay.appendChild(c);
  });

  /* ---------- Accordions (one open at a time) ---------- */
  $$('.acc').forEach(acc => {
    $$('.acc__head', acc).forEach(head => {
      head.addEventListener('click', () => {
        const item = head.parentElement;
        const open = !item.classList.contains('is-open');
        $$('.acc__item', acc).forEach(it => {
          it.classList.remove('is-open');
          $('.acc__head', it).setAttribute('aria-expanded', 'false');
        });
        if (open) { item.classList.add('is-open'); head.setAttribute('aria-expanded', 'true'); }
      });
    });
  });

  /* ---------- "Book this" pre-selects the service ---------- */
  const select = $('#serviceSelect');
  $$('[data-service]').forEach(btn => btn.addEventListener('click', () => {
    if (select) select.value = btn.dataset.service;
  }));

  /* ---------- Show reel ---------- */
  const reelVideo = $('#reelVideo');
  const reelPlay = $('#reelPlay');
  const reel = $('#reel');
  if (reelVideo && reelPlay) {
    reelPlay.addEventListener('click', () => {
      reelVideo.controls = true;
      reelVideo.play();
      reel.classList.add('is-playing');
    });
    reelVideo.addEventListener('ended', () => {
      reel.classList.remove('is-playing');
      reelVideo.controls = false;
    });
  }

  /* ---------- Pause hero video when off-screen (saves battery) ---------- */
  const heroVideo = $('.hero__video');
  if (heroVideo) {
    if (reduceMotion) heroVideo.pause();
    else new IntersectionObserver(([en]) => {
      en.isIntersecting ? heroVideo.play().catch(() => {}) : heroVideo.pause();
    }).observe(heroVideo);
  }

  /* ---------- Booking form → WhatsApp ---------- */
  const form = $('#bookingForm');
  const note = $('#formNote');
  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const required = ['name', 'phone'];
    let ok = true;
    required.forEach(k => {
      const field = form.elements[k];
      const bad = !String(data[k] || '').trim();
      field.classList.toggle('is-invalid', bad);
      if (bad) ok = false;
    });
    if (!ok) { note.textContent = 'Please add your name and phone number.'; return; }

    const lines = [
      'Hi Vortex Wraps! I\'d like to book a wrap.',
      '',
      `Name: ${data.name}`,
      `Phone: ${data.phone}`,
      data.car && `Car: ${data.car}`,
      data.service && `Service: ${data.service}`,
      data.message && `Details: ${data.message}`,
    ].filter(Boolean);
    window.open(waLink(lines.join('\n')), '_blank', 'noopener');
    note.textContent = 'Opening WhatsApp… If nothing happens, message us directly on ' + CONTACT.phoneDisplay + '.';
    form.reset();
  });
})();
