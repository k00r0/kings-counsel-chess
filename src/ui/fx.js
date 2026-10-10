// Toasts and confetti.
let toastTimer = null;
export function toast(msg, ms = 2600) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), ms);
}

export function confetti(kids) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas'); c.className = 'confetti'; document.body.appendChild(c);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = c.width = innerWidth * dpr, H = c.height = innerHeight * dpr;
  const x = c.getContext('2d');
  const cols = kids ? ['#ff6b6b', '#ffd93d', '#6bcB77', '#4d96ff', '#c77dff', '#ff9f1c'] : ['#d4a63a', '#f3e2b3', '#1f6f6b', '#ffffff', '#b08a3e'];
  const P = Array.from({ length: kids ? 180 : 120 }, () => ({ x: W / 2 + (Math.random() - .5) * 140 * dpr, y: H * .35, vx: (Math.random() - .5) * 16 * dpr, vy: (-Math.random() * 15 - 5) * dpr, r: (Math.random() * 6 + 4) * dpr, c: cols[Math.random() * cols.length | 0], a: Math.random() * 6, s: Math.random() * .3 + .1 }));
  let f = 0;
  (function step() {
    x.clearRect(0, 0, W, H);
    for (const p of P) { p.vy += .38 * dpr; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.s; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); x.restore(); }
    if (++f < 170) requestAnimationFrame(step); else c.remove();
  })();
}
