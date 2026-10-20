import gsap from 'gsap';

/**
 * Курсор из трёх слоёв: точка держится за мышью жёстко, кольцо отстаёт.
 * Разница в скорости и создаёт ощущение веса.
 */
export function initCursor() {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const root = document.getElementById('cursor');
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  const label = document.getElementById('cursor-label');
  if (!root) return;

  const dotX = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
  const dotY = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
  const ringX = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3' });
  const ringY = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3' });
  const labX = gsap.quickTo(label, 'x', { duration: 0.5, ease: 'power3' });
  const labY = gsap.quickTo(label, 'y', { duration: 0.5, ease: 'power3' });

  let shown = false;

  window.addEventListener('pointermove', (e) => {
    if (!shown) {
      shown = true;
      gsap.to(root, { opacity: 1, duration: 0.3 });
    }
    dotX(e.clientX); dotY(e.clientY);
    ringX(e.clientX); ringY(e.clientY);
    labX(e.clientX);  labY(e.clientY + 34);
  }, { passive: true });

  document.addEventListener('pointerleave', () => {
    shown = false;
    gsap.to(root, { opacity: 0, duration: 0.3 });
  });

  // Кольцо раскрывается, появляется подпись — курсор объясняет, что будет по клику
  const targets = document.querySelectorAll('a, button, [data-cursor], [data-tilt]');
  targets.forEach((el) => {
    el.addEventListener('pointerenter', () => {
      const text = el.dataset.cursor || '';
      gsap.to(ring, { scale: text ? 2.3 : 1.7, opacity: text ? 0.35 : 1, duration: 0.35, ease: 'power3.out' });
      gsap.to(dot, { scale: 0.4, duration: 0.35, ease: 'power3.out' });
      if (text) {
        label.textContent = text;
        gsap.to(label, { opacity: 1, duration: 0.3 });
      }
    });
    el.addEventListener('pointerleave', () => {
      gsap.to(ring, { scale: 1, opacity: 1, duration: 0.4, ease: 'power3.out' });
      gsap.to(dot, { scale: 1, duration: 0.4, ease: 'power3.out' });
      gsap.to(label, { opacity: 0, duration: 0.2 });
    });
  });
}

/**
 * Магнитные кнопки: элемент тянется к курсору в пределах своей зоны,
 * содержимое — чуть сильнее корпуса, отсюда ощущение упругости.
 */
export function initMagnetic() {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const strength = Number(el.dataset.magnetic) || 0.35;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });

    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    });

    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

/** Наклон карточек услуг + блик, идущий за курсором */
export function initTilt() {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  document.querySelectorAll('[data-tilt]').forEach((el) => {
    const rotX = gsap.quickTo(el, 'rotationX', { duration: 0.7, ease: 'power3' });
    const rotY = gsap.quickTo(el, 'rotationY', { duration: 0.7, ease: 'power3' });
    gsap.set(el, { transformPerspective: 900 });

    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      rotY((px - 0.5) * 11);
      rotX((0.5 - py) * 11);
      el.style.setProperty('--mx', `${px * 100}%`);
      el.style.setProperty('--my', `${py * 100}%`);
    });

    el.addEventListener('pointerleave', () => { rotX(0); rotY(0); });
  });
}
