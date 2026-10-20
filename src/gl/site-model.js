import { Group, Mesh, MeshPhysicalMaterial, Color, MathUtils } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * Объёмный макет сайта: экран, шапка, первый блок, карточки и кнопка.
 * По скроллу детали слетаются из хаоса в собранный интерфейс — объект
 * показывает ровно то, что продаётся, а не просто украшает страницу.
 *
 * Позиции заданы в локальных единицах группы; группа целиком масштабируется
 * под тему в scene.js.
 */

// [ширина, высота, глубина, x, y, z, роль]
const PARTS = [
  [3.10, 1.95, 0.07,  0.00,  0.00, -0.06, 'screen'],
  [2.86, 0.20, 0.05,  0.00,  0.76,  0.02, 'bar'],
  [1.55, 0.66, 0.05, -0.60,  0.24,  0.04, 'hero'],
  [1.02, 0.20, 0.05, -0.83, -0.20,  0.04, 'line'],
  [0.74, 0.52, 0.05,  0.84,  0.20,  0.04, 'card'],
  [0.74, 0.52, 0.05,  0.84, -0.42,  0.04, 'card'],
  [0.60, 0.52, 0.05, -0.05, -0.52,  0.04, 'card'],
  [0.62, 0.17, 0.06, -0.86, -0.62,  0.06, 'cta'],
];

/** Детерминированный разброс: сборка должна выглядеть одинаково при каждой загрузке */
function scatterFor(i) {
  const a = i * 2.399963; // золотой угол — детали расходятся равномерно
  return {
    x: Math.cos(a) * (2.6 + (i % 3) * 0.9),
    y: Math.sin(a) * (1.9 + (i % 4) * 0.5),
    z: -1.6 - (i % 5) * 0.8,
    rx: Math.sin(a * 1.7) * 1.5,
    ry: Math.cos(a * 1.3) * 1.6,
    rz: Math.sin(a * 0.9) * 0.9,
  };
}

export function createSiteModel() {
  const group = new Group();

  // Один общий материал на все стеклянные детали: так тема тюнится
  // в одном месте, а transmission-проход остаётся единственным.
  const glass = new MeshPhysicalMaterial({
    color: new Color('#8f96a8'),
    transmission: 0.92,
    roughness: 0.16,
    metalness: 0,
    thickness: 1.2,
    ior: 1.45,
    dispersion: 1.2,
    iridescence: 0.35,
    transparent: true,
    opacity: 0.9,
  });

  // Кнопка — единственная акцентная деталь. Глаз сразу читает «действие».
  const accent = new MeshPhysicalMaterial({
    color: new Color('#d4ff4f'),
    emissive: new Color('#d4ff4f'),
    emissiveIntensity: 0.55,
    roughness: 0.25,
    metalness: 0.1,
    transmission: 0,
  });

  const pieces = [];

  PARTS.forEach((p, i) => {
    const [w, h, d, x, y, z, role] = p;
    const radius = Math.min(0.05, Math.min(w, h) * 0.28);
    const mesh = new Mesh(
      new RoundedBoxGeometry(w, h, d, 3, radius),
      role === 'cta' ? accent : glass
    );
    mesh.position.set(x, y, z);
    group.add(mesh);
    pieces.push({ mesh, home: { x, y, z }, scatter: scatterFor(i) });
  });

  /** t = 0 — детали разлетелись, t = 1 — макет собран */
  function setAssembly(t) {
    const e = MathUtils.clamp(t, 0, 1);
    pieces.forEach(({ mesh, home, scatter }, i) => {
      // Детали приходят не одновременно: небольшой сдвиг по индексу
      // превращает сборку в последовательность, а не в общий рывок.
      const delay = (i / pieces.length) * 0.35;
      const local = MathUtils.clamp((e - delay) / (1 - delay), 0, 1);
      // easeOutCubic — деталь тормозит у своего места
      const k = 1 - Math.pow(1 - local, 3);

      mesh.position.set(
        MathUtils.lerp(scatter.x, home.x, k),
        MathUtils.lerp(scatter.y, home.y, k),
        MathUtils.lerp(scatter.z, home.z, k)
      );
      mesh.rotation.set(
        MathUtils.lerp(scatter.rx, 0, k),
        MathUtils.lerp(scatter.ry, 0, k),
        MathUtils.lerp(scatter.rz, 0, k)
      );
    });
  }

  setAssembly(0);

  return { group, glass, accent, setAssembly };
}
