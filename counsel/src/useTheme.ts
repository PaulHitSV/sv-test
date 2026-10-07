import { useEffect, useState } from 'react';
type Theme = 'light' | 'dark';
const KEY = 'counsel.theme';
function stored(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}
function systemTheme(): Theme {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}
/** Follows the system theme until the person picks one; the choice stays on this device. */
export function useTheme() {
  const [choice, setChoice] = useState<Theme | null>(stored);
  const [system, setSystem] = useState<Theme>(systemTheme);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const sync = () => setSystem(media.matches ? 'dark' : 'light');
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  const theme = choice ?? system;
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setChoice(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Storage unavailable: the choice lasts for this session only.
    }
  }
  return { theme, toggleTheme };
}
