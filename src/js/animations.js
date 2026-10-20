import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

/* ============================================================
   ГЕРОЙ — интро, играется после прелоадера
   ============================================================ */

export function buildHeroIntro() {
  const title = document.getElementById('hero-title');
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });

  // mask: 'lines' сам оборачивает строки в overflow:hidden — буквы
  // выезжают из-под маски, а не проявляются прозрачностью.
  const split = SplitText.create(title, { type: 'lines', mask: 'lines' });

  tl.from('.hero__meta', { y: 20, opacity: 0, duration: 0.7 })
    .from(split.lines, { yPercent: 115, duration: 1.05, stagger: 0.09 }, '-=0.45')
    .from('.hero__sub', { y: 24, opacity: 0, duration: 0.8 }, '-=0.6')
    .from('.hero__cta > *', { y: 24, opacity: 0, duration: 0.7, stagger: 0.09 }, '-=0.55')
    .from('.hero__scroll', { opacity: 0, duration: 0.6 }, '-=0.4')
    .from('.header', { yPercent: -100, opacity: 0, duration: 0.7 }, '-=0.9');

  return tl;
}

/* ============================================================
   ЗАГОЛОВКИ СЕКЦИЙ
   ============================================================ */

export function initSplitHeadings() {
  document.querySelectorAll('[data-split]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true, // пересобирается при смене размера и подгрузке шрифта
      onSplit(self) {
        // Возврат анимации из onSplit — GSAP сам убьёт её при пересборке
        return gsap.from(self.lines, {
          yPercent: 115,
          duration: 1,
          ease: 'power3.out',
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        });
      },
    });
  });
}

/* ============================================================
   ПРОСТЫЕ ПОЯВЛЕНИЯ
   ============================================================ */

export function initReveals() {
  const items = gsap.utils.toArray('[data-fade]');
  gsap.set(items, { y: 30, opacity: 0 });

  // batch собирает всё, что вошло в кадр за один тик, в общий stagger —
  // иначе соседние карточки дёргаются вразнобой.
  ScrollTrigger.batch(items, {
    start: 'top 88%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.09 }),
  });
}

/* ============================================================
   МАНИФЕСТ — слова загораются по мере скролла
   ============================================================ */

export function initManifest() {
  const el = document.querySelector('[data-manifest]');
  if (!el) return;

  const split = SplitText.create(el, { type: 'words', wordsClass: 'word' });

  gsap.to(split.words, {
    opacity: 1,
    ease: 'none',
    stagger: 0.5,
    scrollTrigger: {
      trigger: el,
      start: 'top 78%',
      end: 'bottom 55%',
      scrub: true,
    },
  });
}

/* ============================================================
   КЕЙСЫ — шторка + параллакс
   ============================================================ */

export function initCases() {
  document.querySelectorAll('[data-case-media]').forEach((media) => {
    const img = media.querySelector('img');

    // Шторка снизу вверх — картинка «проявляется», а не «прилетает»
    gsap.to(media, {
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: 1.3,
      ease: 'power3.inOut',
      scrollTrigger: { trigger: media, start: 'top 82%', once: true },
    });

    // Лёгкий параллакс внутри рамки. Масштаб маленький: при 1.14 кадр
    // сайта обрезался по краям и терял и логотип, и кнопку.
    gsap.fromTo(
      img,
      { scale: 1.05, yPercent: -2 },
      {
        scale: 1.0,
        yPercent: 2,
        ease: 'none',
        scrollTrigger: {
          trigger: media,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
        },
      }
    );
  });

  // Кадры галереи въезжают каскадом
  document.querySelectorAll('.case__gallery').forEach((gallery) => {
    gsap.from(gallery.children, {
      y: 44,
      opacity: 0,
      duration: 0.85,
      ease: 'power3.out',
      stagger: 0.1,
      scrollTrigger: { trigger: gallery, start: 'top 88%', once: true },
    });
  });
}

/* ============================================================
   БЕГУЩАЯ СТРОКА
   ============================================================ */

export function initTicker() {
  const track = document.getElementById('ticker');
  if (!track) return;

  // Дублируем содержимое: пока первая половина уходит влево,
  // вторая занимает её место — шов не виден.
  track.innerHTML += track.innerHTML;

  const loop = gsap.to(track, {
    xPercent: -50,
    duration: 38,
    ease: 'none',
    repeat: -1,
  });

  // Лента реагирует на скорость скролла и меняет направление
  ScrollTrigger.create({
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      const v = self.getVelocity();
      const dir = v < 0 ? -1 : 1;
      gsap.to(loop, {
        timeScale: dir * gsap.utils.clamp(1, 5, 1 + Math.abs(v) / 900),
        duration: 0.4,
        overwrite: true,
      });
    },
  });
}

/* ============================================================
   ПРОЦЕСС — горизонтальная лента внутри пина
   ============================================================ */

export function initProcess() {
  const section = document.querySelector('.process');
  const track = document.getElementById('process-track');
  if (!section || !track) return;

  // matchMedia сам разрушит анимацию, когда условие перестанет выполняться:
  // на мобильных лента разворачивается в вертикальный список средствами CSS.
  const mm = gsap.matchMedia();

  mm.add('(min-width: 721px) and (prefers-reduced-motion: no-preference)', () => {
    // scrollWidth уже включает padding ленты, поэтому хватает разницы с окном.
    // Считать --pad через getComputedStyle нельзя: это незарегистрированная
    // переменная, и наружу отдаётся строка "clamp(...)", а не пиксели.
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none', // обязательно: иначе скролл и сдвиг разъезжаются
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        anticipatePin: 1,
      },
    });

    // Каждая карточка — свой триггер вдоль горизонтальной оси.
    // Триггером обязана быть сама движущаяся карточка, а не пиннящаяся секция.
    const steps = gsap.utils.toArray('.process__step:not(.process__step--head)');
    const stepTweens = steps.map((step) =>
      gsap.from(step, {
        opacity: 0,
        y: 50,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: step,
          containerAnimation: tween,
          start: 'left 85%',
          once: true,
        },
      })
    );

    return () => {
      tween.kill();
      stepTweens.forEach((t) => t.kill());
    };
  });
}

/* ============================================================
   ШАПКА — прячется при скролле вниз
   ============================================================ */

export function initHeader() {
  const header = document.getElementById('header');
  if (!header) return;

  // Без trigger отсчёт идёт от самого скроллера — считаем позицию напрямую
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      const scrollingDown = self.direction === 1;
      header.classList.toggle('is-hidden', scrollingDown && self.scroll() > 300);
    },
  });
}

/* ============================================================
   РЕЛЬСА ПРОГРЕССА
   ============================================================ */

export function initProgressRail() {
  document.querySelectorAll('.progress__item').forEach((item) => {
    const target = document.getElementById(item.dataset.progress);
    if (!target) return;

    ScrollTrigger.create({
      trigger: target,
      start: 'top 55%',
      end: 'bottom 45%',
      onToggle: (self) => item.classList.toggle('is-active', self.isActive),
    });
  });

  // Подсветка активного пункта в меню
  document.querySelectorAll('.nav a').forEach((link) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    ScrollTrigger.create({
      trigger: target,
      start: 'top 55%',
      end: 'bottom 45%',
      onToggle: (self) => link.classList.toggle('is-active', self.isActive),
    });
  });
}
