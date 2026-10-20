/**
 * Единственный источник правды по палитрам.
 * DOM читает их как CSS-переменные, WebGL — как числа. Дублировать нельзя:
 * фон сцены и фон страницы обязаны совпадать пиксель в пиксель.
 */

export const THEMES = {
  // Акт I — тёмный кинематограф. Пустота, туман, лайм.
  void: {
    bg: '#050507',
    surface: '#0e0e13',
    fg: '#f4f2ec',
    muted: '#8f8d86',
    accent: '#d4ff4f',
    accentInk: '#0b1000',
    line: '#1e1e26',
    // WebGL
    fog: '#1a1a24',
    glow: '#d4ff4f',
    mode: 0, // 0 = туман
    grain: 0.055,
  },

  // Акт II — СТРЕЛА. Кремовый свет, стекло, издательская эстетика.
  cream: {
    bg: '#ece5d8',
    surface: '#f6f1e7',
    fg: '#16130d',
    muted: '#6b6355',
    accent: '#b4462a',
    accentInk: '#fff8ee',
    line: '#d3c9b6',
    fog: '#ffffff',
    glow: '#b4462a',
    mode: 1, // 1 = стекло
    grain: 0.02,
  },

  // Акт III — NIX. Чистое чёрно-белое кино, максимальный контраст.
  mono: {
    bg: '#08080a',
    surface: '#121216',
    fg: '#ffffff',
    muted: '#8a8a92',
    accent: '#ffffff',
    accentInk: '#08080a',
    line: '#2a2a30',
    fog: '#3a3a44',
    glow: '#ffffff',
    mode: 2, // 2 = сканлайны / плёнка
    grain: 0.09,
  },

  // Акт IV — КОМПРОМАТ. Неон, японские улицы, маджента.
  neon: {
    bg: '#0a0210',
    surface: '#170624',
    fg: '#ffe9f8',
    muted: '#a678b8',
    accent: '#ff2d92',
    accentInk: '#12000a',
    line: '#3a1150',
    fog: '#5c1268',
    glow: '#ff2d92',
    mode: 3, // 3 = неоновая сетка
    grain: 0.07,
  },
};

export const DEFAULT_THEME = 'void';

/** '#ff2d92' -> [1, 0.176, 0.573] для three.js/шейдеров */
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Пишет палитру в CSS-переменные. Плавность даёт transition в base.css. */
export function applyTheme(name) {
  const t = THEMES[name] || THEMES[DEFAULT_THEME];
  const root = document.documentElement;
  root.style.setProperty('--bg', t.bg);
  root.style.setProperty('--surface', t.surface);
  root.style.setProperty('--fg', t.fg);
  root.style.setProperty('--muted', t.muted);
  root.style.setProperty('--accent', t.accent);
  root.style.setProperty('--accent-ink', t.accentInk);
  root.style.setProperty('--line', t.line);
  root.dataset.theme = name;
  return t;
}
