import type { CSSProperties } from 'react';

export interface ThemeColorConfig {
  id: string;
  name: string;
  primaryHsl: string; // e.g. "221.2 83.2% 53.3%"
  primaryHex: string; // e.g. "#2563eb"
  accentGradient: string; // e.g. "from-blue-600 to-indigo-600"
}

export const THEME_COLOR_MAP: Record<string, ThemeColorConfig> = {
  color1: {
    id: 'color1',
    name: 'Royal Indigo',
    primaryHsl: '238.7 83.5% 66.7%', // #6366f1
    primaryHex: '#6366f1',
    accentGradient: 'from-indigo-600 via-indigo-500 to-violet-600',
  },
  color2: {
    id: 'color2',
    name: 'Emerald Teal',
    primaryHsl: '160.1 84.1% 39.4%', // #10b981
    primaryHex: '#10b981',
    accentGradient: 'from-emerald-600 via-teal-500 to-emerald-600',
  },
  color3: {
    id: 'color3',
    name: 'Crimson Rose',
    primaryHsl: '346.8 77.2% 49.8%', // #e11d48
    primaryHex: '#e11d48',
    accentGradient: 'from-rose-600 via-pink-500 to-rose-600',
  },
  color4: {
    id: 'color4',
    name: 'Golden Amber',
    primaryHsl: '37.7 92.1% 50.2%', // #f59e0b
    primaryHex: '#f59e0b',
    accentGradient: 'from-amber-600 via-orange-500 to-amber-600',
  },
  color5: {
    id: 'color5',
    name: 'Ocean Cyan',
    primaryHsl: '198.6 88.7% 48.4%', // #0ea5e9
    primaryHex: '#0ea5e9',
    accentGradient: 'from-sky-600 via-cyan-500 to-sky-600',
  },
  color6: {
    id: 'color6',
    name: 'Midnight Violet',
    primaryHsl: '262.1 83.3% 57.8%', // #8b5cf6
    primaryHex: '#8b5cf6',
    accentGradient: 'from-violet-600 via-purple-500 to-purple-600',
  },
};

export function resolveThemeConfig(themeColorString?: string): ThemeColorConfig {
  if (!themeColorString) {
    return THEME_COLOR_MAP.color1;
  }

  // Extract key such as "color1" from "color1-Formlayout1" or "color2-Formlayout2"
  const match = themeColorString.match(/color\d+/i);
  const key = match ? match[0].toLowerCase() : 'color1';

  return THEME_COLOR_MAP[key] || THEME_COLOR_MAP.color1;
}

export function getThemeStyles(themeColorString?: string): CSSProperties {
  const config = resolveThemeConfig(themeColorString);

  return {
    ['--primary' as string]: config.primaryHsl,
    ['--ring' as string]: config.primaryHsl,
  };
}
