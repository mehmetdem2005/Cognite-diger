export function applyTheme(t: string) {
  if (typeof document === 'undefined') return
  const isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  localStorage.setItem('theme', t)
  window.dispatchEvent(new CustomEvent('themechange'))
}

export function getTheme(): string {
  if (typeof window === 'undefined') return 'light'
  return localStorage.getItem('theme') || 'light'
}

export function initTheme() {
  if (typeof window === 'undefined') return
  applyTheme(getTheme())
}
