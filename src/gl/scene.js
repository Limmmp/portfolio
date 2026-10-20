import {
  Scene, PerspectiveCamera, WebGLRenderer, Color, Vector2, Vector4,
  PlaneGeometry, ShaderMaterial, Mesh, Group,
  PMREMGenerator, MathUtils, SRGBColorSpace, ACESFilmicToneMapping,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import gsap from 'gsap';

import bgVert from './shaders/bg.vert?raw';
import bgFrag from './shaders/bg.frag?raw';
import { createSiteModel } from './site-model.js';
import { THEMES, DEFAULT_THEME } from '../js/themes.js';

const BG_Z = -12;      // фоновая плоскость
const CAM_Z = 6;       // камера

/**
 * Плоскость фона и стеклянный объект живут в ОДНОЙ сцене — только так
 * transmission-материал захватывает фон и по-настоящему его преломляет.
 */

// Как выглядит материал макета в каждом акте
// На чёрном фоне полупрозрачное стекло почти не читается, поэтому в тёмных
// актах transmission ниже: больше отражений среды — видны грани макета.
const GLASS = {
  void:  { transmission: 0.62, roughness: 0.13, metalness: 0.15, dispersion: 1.4, thickness: 1.0, ior: 1.5,  iridescence: 0.55, color: '#b6bece', scale: 0.50, opacity: 0.95 },
  cream: { transmission: 1.0,  roughness: 0.02, metalness: 0.0,  dispersion: 4.5, thickness: 2.2, ior: 1.62, iridescence: 0.6,  color: '#ffffff', scale: 0.56, opacity: 1.0 },
  mono:  { transmission: 0.08, roughness: 0.20, metalness: 1.0,  dispersion: 0.0, thickness: 0.6, ior: 1.4,  iridescence: 0.0,  color: '#ffffff', scale: 0.50, opacity: 1.0 },
  neon:  { transmission: 0.30, roughness: 0.06, metalness: 0.85, dispersion: 2.0, thickness: 1.0, ior: 1.5,  iridescence: 1.0,  color: '#6b2050', scale: 0.52, opacity: 1.0 },
};

export function createScene(canvas) {
  const params = new URLSearchParams(location.search);
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  // Transmission рендерит сцену дважды. На телефонах это слишком дорого —
  // там остаётся только шейдерный фон, и он несёт всю нагрузку.
  // ?glass=off — принудительно, для отладки и слабых машин.
  const useGlass = !isCoarse && window.innerWidth > 820 && params.get('glass') !== 'off';

  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,      // на fullscreen-шейдере не нужен, а стоит дорого
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCoarse ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new Scene();
  const camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = CAM_Z;

  const base = THEMES[DEFAULT_THEME];

  /* ---------- фон ---------- */
  const uniforms = {
    uTime:   { value: 0 },
    uRes:    { value: new Vector2(1, 1) },
    uMouse:  { value: new Vector2(0, 0) },
    uScroll: { value: 0 },
    uIntro:  { value: 0 },
    uBg:     { value: new Color(base.bg) },
    uFog:    { value: new Color(base.fog) },
    uGlow:   { value: new Color(base.glow) },
    uW:      { value: new Vector4(1, 0, 0, 0) },
  };

  const bg = new Mesh(
    new PlaneGeometry(1, 1),
    new ShaderMaterial({
      vertexShader: bgVert,
      fragmentShader: bgFrag,
      uniforms,
      depthWrite: false,
    })
  );
  bg.position.z = BG_Z;
  bg.renderOrder = -1;
  scene.add(bg);

  /* ---------- макет сайта ---------- */
  let model = null;
  // Внешняя обёртка нужна, чтобы уводить макет со сцены, не конфликтуя
  // с масштабом, который тюнит смена темы на внутренней группе.
  const holder = new Group();
  scene.add(holder);

  if (useGlass) {
    const pmrem = new PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    model = createSiteModel();
    Object.assign(model.glass, toMaterialProps(GLASS[DEFAULT_THEME]));
    model.group.scale.setScalar(GLASS[DEFAULT_THEME].scale);
    holder.add(model.group);
    pmrem.dispose();
  }

  /* ---------- размеры ---------- */
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());

    // Растягиваем плоскость ровно под frustum на её глубине
    const dist = CAM_Z - BG_Z;
    const vh = 2 * Math.tan(MathUtils.degToRad(camera.fov) / 2) * dist;
    bg.scale.set(vh * camera.aspect, vh, 1);

    // Держим макет в правом поле страницы: контент шире, чем кажется,
    // и ближе к центру объект наезжал на заголовки кейсов.
    if (model) {
      const halfWidth = Math.tan(MathUtils.degToRad(camera.fov) / 2) * CAM_Z * camera.aspect;
      holder.position.x = halfWidth * (w > 1200 ? 0.56 : 0.34);
    }
  }
  resize();
  window.addEventListener('resize', resize);

  /* ---------- курсор ---------- */
  const mouse = new Vector2(0, 0);
  const mouseTarget = new Vector2(0, 0);
  window.addEventListener('pointermove', (e) => {
    mouseTarget.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      -((e.clientY / window.innerHeight) * 2 - 1)
    );
  }, { passive: true });

  /* ---------- цикл ---------- */
  let raf = 0;
  let running = true;
  let scrollProgress = 0;
  const clockStart = performance.now();

  // Адаптивное качество: сайт должен впечатлять и на слабом железе.
  // Копим время кадра и, если стабильно не укладываемся в бюджет,
  // снимаем самое дорогое — сначала стекло, потом разрешение.
  let lastFrame = performance.now();
  let degraded = 0;
  let windowSum = 0;
  let windowCount = 0;
  let badWindows = 0;

  /**
   * Деградируем только при устойчиво низком FPS.
   * Прошлая версия считала отдельные медленные кадры и срабатывала на
   * разовой просадке при компиляции шейдеров — макет исчезал навсегда
   * на машинах, которые прекрасно его тянут.
   */
  function watchPerf(now) {
    const dt = now - lastFrame;
    lastFrame = now;

    // Первые секунды всегда тяжёлые: компиляция шейдеров, PMREM, загрузка
    if (now - clockStart < 4000 || degraded > 1) return;

    windowSum += dt;
    windowCount++;
    if (windowCount < 120) return; // окно ~2 с

    const avg = windowSum / windowCount;
    windowSum = 0;
    windowCount = 0;

    if (avg < 38) { badWindows = 0; return; }   // ~26 fps и выше — терпимо
    if (++badWindows < 2) return;                // два окна подряд, не случайность

    badWindows = 0;
    degraded++;
    if (degraded === 1 && model) {
      model.group.visible = false;
      model.glass.transmission = 0; // снимаем сам transmission-проход
      console.info(`[gl] устойчиво низкий FPS (${Math.round(1000 / avg)}) — 3D-макет отключён`);
    } else {
      renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() * 0.7));
      resize();
      console.info('[gl] низкий FPS — снижено разрешение');
    }
  }

  function frame() {
    raf = requestAnimationFrame(frame);
    if (!running) return;

    watchPerf(performance.now());

    const t = (performance.now() - clockStart) / 1000;
    uniforms.uTime.value = t;

    // Инерция курсора: сцена догоняет мышь, а не дёргается за ней
    mouse.lerp(mouseTarget, 0.045);
    uniforms.uMouse.value.copy(mouse);

    if (model) {
      // Сборка завершается к первой трети страницы — ровно там,
      // где пользователь переходит от обещания к работам.
      const settle = MathUtils.clamp(scrollProgress / 0.3, 0, 1);
      model.setAssembly(settle);

      // Собранный макет разворачивается к зрителю, а не крутится волчком:
      // это интерфейс, его надо разглядывать.
      model.group.rotation.y = MathUtils.lerp(-0.9, -0.34, settle) + mouse.x * 0.12 + Math.sin(t * 0.24) * 0.05;
      model.group.rotation.x = MathUtils.lerp(0.5, 0.1, settle) - mouse.y * 0.09 + Math.sin(t * 0.31) * 0.03;
      model.group.position.y = mouse.y * 0.22 + Math.sin(t * 0.5) * 0.08;

      // Мысль донесена — макет уходит. Дальше по странице он только
      // наезжал бы на карточки услуг и заголовки кейсов.
      const exit = 1 - MathUtils.smoothstep(scrollProgress, 0.33, 0.44);
      holder.scale.setScalar(exit);
      holder.visible = exit > 0.01;
    }

    renderer.render(scene, camera);
  }
  frame();

  // Вкладка не видна — не жжём батарею
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
  });

  /* ---------- публичное API ---------- */

  const WEIGHT_INDEX = { void: 'x', cream: 'y', mono: 'z', neon: 'w' };

  return {
    /** Перетекание в тему: цвета фона, веса режимов и материал стекла */
    setTheme(name, duration = 0.9) {
      const theme = THEMES[name];
      if (!theme) return;

      gsap.to(uniforms.uBg.value,   { ...toRgb(theme.bg),   duration, ease: 'power2.inOut' });
      gsap.to(uniforms.uFog.value,  { ...toRgb(theme.fog),  duration, ease: 'power2.inOut' });
      gsap.to(uniforms.uGlow.value, { ...toRgb(theme.glow), duration, ease: 'power2.inOut' });

      const w = { x: 0, y: 0, z: 0, w: 0 };
      w[WEIGHT_INDEX[name]] = 1;
      gsap.to(uniforms.uW.value, { ...w, duration, ease: 'power2.inOut' });

      if (model) {
        const g = GLASS[name];
        gsap.to(model.glass, {
          transmission: g.transmission,
          roughness: g.roughness,
          metalness: g.metalness,
          dispersion: g.dispersion,
          thickness: g.thickness,
          ior: g.ior,
          iridescence: g.iridescence,
          opacity: g.opacity,
          duration,
          ease: 'power2.inOut',
        });
        gsap.to(model.glass.color, { ...toRgb(g.color), duration, ease: 'power2.inOut' });
        // Кнопка макета всегда носит акцент текущей темы
        gsap.to(model.accent.color, { ...toRgb(theme.accent), duration, ease: 'power2.inOut' });
        gsap.to(model.accent.emissive, { ...toRgb(theme.accent), duration, ease: 'power2.inOut' });
        gsap.to(model.group.scale, { x: g.scale, y: g.scale, z: g.scale, duration, ease: 'power2.inOut' });
      }
    },

    /** Прогресс страницы 0..1 — крутит объект по мере чтения */
    setScrollProgress(v) {
      scrollProgress = v;
      uniforms.uScroll.value = v;
    },

    /** Проявление сцены после прелоадера */
    reveal() {
      gsap.to(canvas, { opacity: 1, duration: 1.4, ease: 'power2.out' });
      gsap.to(uniforms.uIntro, { value: 1, duration: 1.8, ease: 'power2.out' });
    },

    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      renderer.dispose();
    },
  };
}

/* ---------- утилиты ---------- */

function toRgb(hex) {
  const c = new Color(hex);
  return { r: c.r, g: c.g, b: c.b };
}

function toMaterialProps(g) {
  return {
    color: new Color(g.color),
    transmission: g.transmission,
    roughness: g.roughness,
    metalness: g.metalness,
    dispersion: g.dispersion,
    thickness: g.thickness,
    ior: g.ior,
    iridescence: g.iridescence,
    opacity: g.opacity,
  };
}
