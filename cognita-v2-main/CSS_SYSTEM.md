# 🎨 Cognita v5 — CSS & Design System

**Modern, Professional UI/UX** oluşturulmak için baştan yazılan tasarım sistemi.

## 📋 İçerik Tablosu

1. [Tema Sistem](#tema-sistem)
2. [CSS Variables](#css-variables)
3. [Component Classes](#component-classes)
4. [Animation Library](#animation-library)
5. [Best Practices](#best-practices)

---

## 🌓 Tema Sistem

Cognita light ve dark modları destekler. CSS variables otomatik olarak tema ile değişir.

### Light Mode (Default)
```css
:root {
  --bg: #fafbfc;
  --bg-card: #ffffff;
  --text-primary: #0f1117;
  --accent-primary: #405DE6;
}
```

### Dark Mode
```css
[data-theme="dark"] {
  --bg: #0a0c0d;
  --bg-card: #1a1d1f;
  --text-primary: #ecedee;
  --accent-primary: #667EEA;
}
```

---

## 🎯 CSS Variables

### 📐 Renk Paletı

```
Light Mode          Dark Mode
─────────────────   ─────────────────
--bg: #fafbfc       --bg: #0a0c0d
--bg-card: #fff     --bg-card: #1a1d1f
--text-primary      --text-primary
--accent-primary    --accent-primary (muted)
```

### 🎨 Accent Renkler

| Variable | Light | Dark | Kullanım |
|----------|-------|------|---------|
| `--accent-primary` | #405DE6 | #667EEA | CTA, Links |
| `--accent-secondary` | #833AB4 | #A855F7 | Gradients |
| `--accent-success` | #16a34a | #22c55e | Success states |
| `--accent-error` | #E63946 | #ff4d57 | Errors, Alerts |
| `--accent-warning` | #f59e0b | #fbbf24 | Warnings |

### 📏 Spacing Scale

```css
--spacing-xs: 0.25rem  /* 4px */
--spacing-sm: 0.5rem   /* 8px */
--spacing-md: 1rem     /* 16px */
--spacing-lg: 1.5rem   /* 24px */
--spacing-xl: 2rem     /* 32px */
```

### 📐 Border Radius

```css
--radius-xs: 4px
--radius-sm: 8px
--radius-md: 12px
--radius-lg: 16px
--radius-xl: 20px
--radius-full: 9999px
```

### 🌑 Shadows (Depth)

```css
--shadow-xs: 0 1px 2px rgba(0,0,0,0.04)
--shadow-sm: 0 2px 4px rgba(0,0,0,0.06)
--shadow-md: 0 4px 12px rgba(0,0,0,0.08)
--shadow-lg: 0 8px 24px rgba(0,0,0,0.12)
--shadow-xl: 0 12px 32px rgba(0,0,0,0.15)
```

---

## 🧩 Component Classes

### Buttons

```jsx
<button className="btn-primary">Primary CTA</button>
<button className="btn-secondary">Secondary Action</button>
<button className="btn-ghost">Light Button</button>
```

### Cards

```jsx
<div className="card">Content</div>
<div className="card-soft">Soft Background</div>
```

### Tags

```jsx
<span className="tag">Default</span>
<span className="tag tag-accent">Accent</span>
<span className="tag tag-green">Success</span>
```

### Empty States

```jsx
<div className="empty-state">
  <div className="empty-state-icon">📭</div>
  <h3 className="empty-state-title">No Data</h3>
  <p className="empty-state-desc">Nothing to display</p>
</div>
```

### Loading Skeleton

```jsx
<div className="skeleton" style={{ width: '100%', height: '40px' }} />
```

---

## ✨ Animation Library

### Fade-in Animation

```jsx
<div className="animate-fade-in">Content fades in</div>
```

### Shimmer (Loading)

```jsx
<div className="skeleton" />
```

### Custom Transitions (Tailwind)

```jsx
<div className="transition-all duration-150 ease-in-out hover:scale-105">
  Smooth hover effect
</div>
```

---

## 🎯 Best Practices

### ✅ DO (Yeni Sistem)

```jsx
// ✅ Use Tailwind + CSS Classes
<section className="card animate-fade-in">
  <div className="flex items-center gap-2 mb-4">
    <h2 className="text-sm font-bold text-text-primary">Title</h2>
  </div>
</section>

// ✅ Use CSS Variables for colors
style={{ color: 'var(--accent-primary)' }}

// ✅ Use provided component classes
<button className="btn-primary">Click me</button>
```

### ❌ DON'T (Eski Sistem)

```jsx
// ❌ Avoid inline style objects
style={{
  display: 'flex',
  gap: '0.8rem',
  padding: '0.75rem 1rem',
  background: 'var(--bg-card)',
  borderRadius: 'var(--radius-md)'
}}

// ❌ Avoid magic numbers
style={{ padding: '0.75rem 1rem' }}

// ❌ Avoid custom shadow strings
boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
```

### 🔄 Migration Path

Eski bileşenleri yeni sisteme geçirmek için:

1. Inline styles → Tailwind classes
2. Magic numbers → CSS variables & spacing scale
3. Custom shadows → `--shadow-*` variables
4. Hardcoded colors → Color variables

**Örnek Refactor:**

```jsx
// BEFORE
<div style={{
  padding: '0.75rem 1rem',
  background: 'var(--bg-card)',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}}>

// AFTER
<div className="card">
```

---

## 📱 Responsive Design

Tailwind breakpoints:

```
xs: 480px
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
3xl: 1920px
```

```jsx
<div className="text-sm md:text-base lg:text-lg">
  Responsive text
</div>
```

---

## 🚀 Next Steps

1. ✅ Modern CSS System created
2. ⏳ Update remaining components (500+ lines)
3. ⏳ Add Framer Motion animations
4. ⏳ Performance optimizations
5. ⏳ Accessibility audit

---

**Created:** March 29, 2026  
**Version:** Cognita v5.0  
**Status:** 🟢 LiveDesignSystem
