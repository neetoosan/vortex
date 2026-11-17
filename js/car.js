/* =========================================================
   VORTEX WRAPS — illustrated car used by the finish
   configurator (home) and the booking summary (book.html).
   Colour comes from the CSS variable --car on the container,
   the finish from data-finish="gloss|satin|matte".
   ========================================================= */
(() => {
  'use strict';
  let uid = 0;

  const BODY = 'M48,212 C36,206 34,186 44,172 C52,160 74,154 100,150 L150,144 C190,128 228,104 282,94 C340,84 430,82 488,90 C528,96 560,114 596,134 C626,140 676,146 712,152 C744,157 764,170 770,188 C774,200 770,210 760,214 L700,214 A56,56 0 0 0 588,214 L262,214 A56,56 0 0 0 150,214 Z';
  const GLASS = 'M196,140 C232,114 262,104 300,100 L470,98 C508,102 538,116 566,136 C520,138 260,141 196,140 Z';

  function wheel(cx) {
    const spokes = [0, 72, 144, 216, 288]
      .map(a => `<rect x="-3" y="-28" width="6" height="24" rx="3" transform="rotate(${a})"/>`).join('');
    return `
      <g transform="translate(${cx} 214)">
        <circle r="44" fill="#0b0b0b"/>
        <circle r="41" fill="none" stroke="#1d1d1d" stroke-width="3"/>
        <g class="car__rim">
          <circle r="30" fill="#1a1a1a" stroke="#3a3a3a" stroke-width="2"/>
          <g fill="#4a4a4a">${spokes}</g>
          <circle r="7" fill="#8a8a8a"/>
        </g>
        <path d="M-26,-20 A33,33 0 0 1 10,-31" fill="none" stroke="#e3141b" stroke-width="5" stroke-linecap="round" class="car__caliper"/>
      </g>`;
  }

  function markup() {
    const id = `vx${++uid}`;
    return `
<svg class="car" viewBox="0 0 800 280" role="img" aria-label="Illustration of a coupé showing the selected wrap colour and finish">
  <defs>
    <clipPath id="${id}-clip"><path d="${BODY}"/></clipPath>
    <linearGradient id="${id}-shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".22"/>
      <stop offset=".42" stop-color="#fff" stop-opacity="0"/>
      <stop offset=".7" stop-color="#000" stop-opacity=".12"/>
      <stop offset="1" stop-color="#000" stop-opacity=".55"/>
    </linearGradient>
    <linearGradient id="${id}-streak" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset=".5" stop-color="#fff" stop-opacity=".9"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="${id}-glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2b2f36"/>
      <stop offset=".55" stop-color="#0b0d10"/>
      <stop offset="1" stop-color="#1b1f25"/>
    </linearGradient>
    <filter id="${id}-blur" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="9"/></filter>
  </defs>

  <ellipse cx="405" cy="262" rx="370" ry="13" fill="#000" opacity=".75" filter="url(#${id}-blur)"/>
  <ellipse class="car__glow" cx="405" cy="262" rx="330" ry="10" filter="url(#${id}-blur)"/>

  <path class="car__body" d="${BODY}"/>
  <g clip-path="url(#${id}-clip)">
    <rect width="800" height="280" fill="url(#${id}-shade)"/>
    <path class="car__shoulder" d="M100,152 C250,124 520,116 712,156 L712,163 C520,127 250,134 100,160 Z" fill="#fff"/>
    <rect class="car__streak" x="-260" y="88" width="230" height="140" fill="url(#${id}-streak)" transform="skewX(-28)"/>
    <path d="M262,204 L588,204 L588,214 L262,214 Z" fill="#000" opacity=".35"/>
    <path d="M392,142 C394,170 396,190 397,206" stroke="#000" stroke-opacity=".35" stroke-width="2" fill="none"/>
    <path d="M574,138 C580,165 582,188 580,206" stroke="#000" stroke-opacity=".3" stroke-width="2" fill="none"/>
    <path d="M300,152 l26,0" stroke="#000" stroke-opacity=".45" stroke-width="4" stroke-linecap="round"/>
    <path d="M466,150 l26,0" stroke="#000" stroke-opacity=".45" stroke-width="4" stroke-linecap="round"/>
  </g>
  <path d="${GLASS}" fill="url(#${id}-glass)"/>
  <path d="M215,136 C250,116 280,108 312,105 L330,105 L262,136 Z" fill="#fff" opacity=".08"/>
  <path d="M388,99 L392,140" stroke="var(--car-trim, #0a0a0a)" stroke-width="7"/>
  <path class="car__body" d="M556,128 l22,-7 l8,11 l-20,5 Z"/>
  <path d="M716,160 C738,163 754,170 761,179 L728,177 Z" fill="#f4f4f4" opacity=".9"/>
  <path class="car__tail" d="M50,170 C64,162 84,158 106,156 L102,166 C84,168 66,171 50,177 Z"/>
  ${wheel(206)}
  ${wheel(644)}
</svg>`;
  }

  window.VortexCar = {
    mount(el) { el.innerHTML = markup(); return el; },
  };
  document.querySelectorAll('[data-car]').forEach(el => window.VortexCar.mount(el));
})();
