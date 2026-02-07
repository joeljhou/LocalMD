import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';
export type AccentColor = 'default' | 'purple' | 'blue';

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme-mode') as ThemeMode || 
             (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
    return 'light';
  });

  const [accent, setAccent] = useState<AccentColor>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme-accent') as AccentColor) || 'default';
    }
    return 'default';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme-mode', theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('theme-purple', 'theme-blue');
    if (accent !== 'default') {
      root.classList.add(`theme-${accent}`);
    }
    localStorage.setItem('theme-accent', accent);
  }, [accent]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const changeAccent = (newAccent: AccentColor) => {
    setAccent(newAccent);
  };

  return { theme, toggleTheme, accent, changeAccent };
}
