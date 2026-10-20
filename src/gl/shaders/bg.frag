precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2  uRes;
uniform vec2  uMouse;   // сглаженная позиция курсора, -1..1
uniform float uScroll;  // прогресс страницы 0..1
uniform float uIntro;   // проявление после прелоадера 0..1

uniform vec3  uBg;
uniform vec3  uFog;
uniform vec3  uGlow;

// Веса режимов: x=void, y=cream, z=mono, w=neon.
// Их тюнит GSAP, поэтому смена акта — это перетекание, а не переключатель.
uniform vec4  uW;

/* ---------- шум ---------- */

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// Четыре октавы — компромисс между «дымом» и мобильным GPU.
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8); // поворот убирает сеточные артефакты
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = rot * p * 2.02;
    a *= 0.5;
  }
  return v;
}

void main() {
  // Координаты с поправкой на пропорции: круг остаётся кругом
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime * 0.05;

  vec2 q = p + uMouse * 0.10;
  float f  = fbm(q * 1.6 + vec2(0.0, t));
  float f2 = fbm(q * 3.1 - vec2(t * 0.7, t * 0.3));

  /* --- 0. ПУСТОТА: объёмный туман со свечением у курсора --- */
  vec3 c0 = mix(uBg, uFog, smoothstep(0.25, 0.95, f));
  float d = length(p - uMouse * 0.55);
  c0 += uGlow * 0.05 * exp(-d * 2.4) * (0.6 + 0.4 * f2);

  /* --- 1. КРЕМ: рассеянный свет, бумага, мягкая каустика --- */
  float caust = pow(abs(sin(f * 6.2831 + uTime * 0.12)), 3.0);
  vec3 c1 = mix(uBg, uFog, 0.30 + 0.45 * f);
  c1 -= uGlow * 0.05 * (1.0 - f2);   // тёплая тень
  c1 += uGlow * 0.09 * caust;        // блик

  /* --- 2. МОНО: жёсткие полосы света и плёночные сканлайны --- */
  float bands = smoothstep(0.42, 0.58, f + 0.14 * sin(p.y * 34.0 + uTime * 0.3));
  vec3 c2 = mix(uBg, uFog, bands * 0.75);
  c2 *= 0.94 + 0.06 * sin(gl_FragCoord.y * 1.6);

  /* --- 3. НЕОН: сетка, уходящая за горизонт --- */
  vec2 g = p;
  g.y += 0.40;
  float persp = 1.0 / max(abs(g.y), 0.0015);
  vec2 gp = vec2(g.x * persp * 0.55, persp * 0.45 + uTime * 0.25);
  vec2 gw = fwidth(gp);
  vec2 grid = abs(fract(gp) - 0.5) / max(gw, vec2(0.0001));
  float ln = 1.0 - min(min(grid.x, grid.y), 1.0);
  float horizon = smoothstep(0.0, 0.45, abs(g.y));
  vec3 c3 = uBg + uGlow * ln * horizon * 0.85;
  c3 += uFog * 0.10 * f;

  /* --- сборка --- */
  vec3 col = c0 * uW.x + c1 * uW.y + c2 * uW.z + c3 * uW.w;

  // Виньетка — только в тёмных актах, кремовый должен остаться воздушным
  float dark = uW.x + uW.z + uW.w;
  col *= 1.0 - 0.26 * pow(length(p * vec2(0.72, 1.0)), 2.2) * dark;

  // Дизеринг: без него на градиентах видны ступеньки
  col += (hash(gl_FragCoord.xy + uTime) - 0.5) / 255.0;

  col = mix(uBg, col, uIntro);

  gl_FragColor = vec4(col, 1.0);
}
