import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import './css/base.css';
import './css/ui.css';
import './css/hero.css';
import './css/cases.css';
import './css/sections.css';

import { applyTheme, THEMES, DEFAULT_THEME } from './js/themes.js';
import { initCursor, initMagnetic, initTilt } from './js/cursor.js';
import {
  buildHeroIntro, initSplitHeadings, initReveals, initManifest,
  initCases, initTicker, initProcess, initHeader, initProgressRail,
} from './js/animations.js';

gsap.registerPlugin(ScrollTrigger);

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   ПЛАВНЫЙ СКРОЛЛ
   ============================================================ */

let lenisRef = null;

function initSmoothScroll() {
  if (reduced) return null;

  const lenis = new Lenis({
    lerp: 0.085,
    wheelMultiplier: 1,
    smoothWheel: true,
  });

  // Lenis двигает окно сам — ScrollTrigger достаточно уведомлять об обновлении.
  lenis.on('scroll', ScrollTrigger.update);

  // Один общий тикер вместо двух конкурирующих rAF-циклов
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Якорные ссылки должны ехать через Lenis, иначе будет рывок
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -20, duration: 1.5 });
    });
  });

  lenisRef = lenis;
  return lenis;
}

/* ============================================================
   СМЕНА АКТОВ
   ============================================================ */

/** Three.js подгружается отдельным чанком, поэтому сцена появляется позже.
 *  Держим её в изменяемом контейнере, а не в захваченной переменной. */
const gl = { scene: null, theme: DEFAULT_THEME, revealed: false };

function initThemeDirector() {
  const set = (name) => {
    if (name === gl.theme || !THEMES[name]) return;
    gl.theme = name;
    applyTheme(name);
    gl.scene?.setTheme(name);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEMES[name].bg);
    // Зерно заметно только на тёмном — на светлом это грязь
    document.querySelector('.grain').style.opacity = THEMES[name].grain;
  };

  document.querySelectorAll('[data-theme-section]').forEach((el) => {
    const name = el.dataset.themeSection;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 50%',
      end: 'bottom 50%',
      onEnter: () => set(name),
      onEnterBack: () => set(name),
    });
  });

  applyTheme(DEFAULT_THEME);
}

/* ============================================================
   ПРЕЛОАДЕР
   ============================================================ */

function runPreloader() {
  const el = document.getElementById('preloader');
  const count = document.getElementById('preloader-count');
  const fill = document.getElementById('preloader-fill');
  const status = document.getElementById('preloader-status');

  return new Promise((resolve) => {
    if (reduced) {
      el.remove();
      document.body.classList.remove('is-loading');
      resolve();
      return;
    }

    const state = { v: 0 };
    const render = () => {
      const v = Math.round(state.v);
      count.textContent = v;
      gsap.set(fill, { scaleX: state.v / 100 });
      if (v > 55) status.textContent = 'Подготовка сцены';
      if (v > 88) status.textContent = 'Почти готово';
    };

    // Ползём до 90 сами, последние 10% отдаём реальной готовности —
    // так полоса не врёт и не застывает на месте.
    const crawl = gsap.to(state, {
      v: 90, duration: 2.2, ease: 'power2.out', onUpdate: render,
    });

    const ready = Promise.race([
      Promise.all([
        document.fonts.ready,
        new Promise((r) => (document.readyState === 'complete' ? r() : window.addEventListener('load', r, { once: true }))),
      ]),
      // Страховка: если Google Fonts недоступен или картинка висит,
      // сайт всё равно обязан открыться.
      new Promise((r) => setTimeout(r, 6000)),
    ]);

    ready.then(() => {
      crawl.kill();
      gsap.to(state, {
        v: 100,
        duration: 0.5,
        ease: 'power2.inOut',
        onUpdate: render,
        onComplete: () => {
          const out = gsap.timeline({
            onComplete: () => { el.remove(); resolve(); },
          });
          out.to('.preloader__inner', { y: -30, opacity: 0, duration: 0.5, ease: 'power2.in' })
             .to(el, {
               yPercent: -100,
               duration: 1.0,
               ease: 'expo.inOut',
               onStart: () => document.body.classList.remove('is-loading'),
             }, '-=0.15');
        },
      });
    });
  });
}

/* ============================================================
   СТАРТ
   ============================================================ */

/** Three.js — самый тяжёлый чанк. Грузим его параллельно, не задерживая
 *  ни разметку, ни интерактив: сцена подключится, когда будет готова. */
function loadScene() {
  if (reduced) return;
  import('./gl/scene.js')
    .then(({ createScene }) => {
      const scene = createScene(document.getElementById('gl'));
      gl.scene = scene;
      scene.setTheme(gl.theme, 0); // догоняем акт, если пользователь уже прокрутил
      if (gl.revealed) scene.reveal();
    })
    .catch((err) => console.error('[portfolio] сцена не загрузилась:', err));
}

async function main() {
  loadScene();
  initSmoothScroll();
  initThemeDirector();

  // Шрифты должны быть готовы до SplitText: иначе строки разобьются
  // по метрикам запасного шрифта и после подмены поедут.
  await document.fonts.ready;

  if (reduced) {
    // Без движения — но сайт целый: показываем всё, что анимация бы проявила
    gsap.set('[data-fade]', { opacity: 1, y: 0 });
    gsap.set('[data-case-media]', { clipPath: 'inset(0% 0% 0% 0%)' });
    gsap.set('.manifest__text .word', { opacity: 1 });
    document.getElementById('preloader')?.remove();
    document.body.classList.remove('is-loading');
    initProgressRail();
    return;
  }

  const heroIntro = buildHeroIntro();

  // Ни один спецэффект не стоит белого экрана. Если что-то упало —
  // логируем, показываем контент и идём дальше.
  try {
    initReveals();
    initSplitHeadings();
    initManifest();
    initCases();
    initTicker();
    initProcess();
    initHeader();
    initProgressRail();
    initCursor();
    initMagnetic();
    initTilt();

    // Прогресс страницы крутит объект в сцене
    ScrollTrigger.create({
      start: 'top top',
      end: 'max',
      onUpdate: (self) => gl.scene?.setScrollProgress(self.progress),
    });
  } catch (err) {
    console.error('[portfolio] анимации не инициализировались:', err);
    gsap.set('[data-fade]', { opacity: 1, y: 0 });
    gsap.set('[data-case-media]', { clipPath: 'inset(0% 0% 0% 0%)' });
    gsap.set('.manifest__text .word', { opacity: 1 });
  }

  await runPreloader();

  gl.revealed = true;
  gl.scene?.reveal(); // если сцена ещё грузится, она проявится сама при готовности
  heroIntro.play();

  // Пины и триггеры считаны до появления скроллбара — пересчитываем
  ScrollTrigger.refresh();
}

// Отладочный доступ только в dev-режиме: в прод-сборку не попадает.
// Удобно щёлкать акты руками: __pf.applyTheme('neon')
if (import.meta.env.DEV) {
  window.__pf = {
    gsap, ScrollTrigger, gl, applyTheme, THEMES,
    // Мгновенный прыжок по странице для съёмки кадров
    jump: (y) => lenisRef?.scrollTo(y, { immediate: true }),
  };
}

main().catch((err) => {
  // Последний рубеж: что бы ни случилось, убираем прелоадер и отдаём страницу
  console.error('[portfolio] сбой инициализации:', err);
  document.getElementById('preloader')?.remove();
  document.body.classList.remove('is-loading');
  gsap.set('[data-fade]', { opacity: 1, y: 0 });
  gsap.set('[data-case-media]', { clipPath: 'inset(0% 0% 0% 0%)' });
  gsap.set('.manifest__text .word', { opacity: 1 });
});
