import React from 'react'

/**
 * Tiny UI kit for FitStream (no external deps)
 * - Consistent look/feel across pages
 * - Variants + sizes + fullWidth
 * - Minimal inline styles to avoid global CSS
 */

// ---- BUTTON ----
export function Button({
  as: Tag = 'button', // eslint-disable-line no-unused-vars
  variant = 'primary', // 'primary' | 'secondary' | 'ghost' | 'danger'
  size = 'md', // 'sm' | 'md' | 'lg'
  fullWidth = false,
  loading = false,
  disabled,
  style,
  children,
  ...rest
}) {
  const heights = { sm: 34, md: 40, lg: 48 }
  const paddings = { sm: '0 10px', md: '0 14px', lg: '0 18px' }

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: fullWidth ? '100%' : undefined,
    height: heights[size] ?? heights.md,
    padding: paddings[size] ?? paddings.md,
    borderRadius: 10,
    border: '1px solid transparent',
    fontWeight: 800,
    color: '#fff',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    transition: 'transform .08s ease, box-shadow .2s ease, background .2s ease',
    boxShadow: variant === 'primary' ? '0 10px 26px rgba(6,182,212,.28)' : 'none',
    userSelect: 'none',
    textDecoration: 'none'
  }

  const variants = {
    primary: { background: 'linear-gradient(90deg,#06b6d4,#6366f1)', border: '1px solid rgba(255,255,255,.22)' },
    secondary: { background: 'rgba(255,255,255,.10)', border: '1px solid rgba(255,255,255,.22)' },
    ghost: { background: 'transparent', border: '1px solid rgba(255,255,255,.22)' },
    danger: { background: '#dc2626', border: '1px solid rgba(255,255,255,.22)' },
  }

  return (
    <Tag
      {...rest}
      disabled={disabled || loading}
      className={`fs-btn fs-btn-${variant}`}
      style={{ ...base, ...(variants[variant] || variants.primary), ...style }}
      onMouseDown={(e)=>{ base.transform = 'translateY(1px) scale(.99)'; rest.onMouseDown?.(e) }}
      onMouseUp={(e)=>{ base.transform = 'none'; rest.onMouseUp?.(e) }}
    >
      {loading && (
        <span aria-hidden style={{
          width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,.5)',
          borderTopColor: '#fff', animation: 'fs-spin 1s linear infinite'
        }} />
      )}
      <span>{children}</span>
      <style>{`@keyframes fs-spin { to { transform: rotate(360deg) } }`}</style>
    </Tag>
  )
}

// ---- CARD ----
export function Card({ title, subtitle, footer, children, style }) {
  return (
    <section style={{
      border: '1px solid rgba(255,255,255,.14)',
      background: 'linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03))',
      borderRadius: 14,
      overflow: 'hidden',
      ...style,
    }}>
      {(title || subtitle) && (
        <header style={{ padding: 14, borderBottom: '1px solid rgba(255,255,255,.12)' }}>
          {title && <div style={{ fontWeight: 800 }}>{title}</div>}
          {subtitle && <div style={{ color: '#94a3b8', fontSize: 12 }}>{subtitle}</div>}
        </header>
      )}
      <div style={{ padding: 16 }}>{children}</div>
      {footer && (
        <footer style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,.12)' }}>{footer}</footer>
      )}
    </section>
  )
}

// ---- INPUT ----
export function Input({ label, hint, error, right, style, ...rest }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      {label && <span style={{ fontSize: 12, color: '#cbd5e1' }}>{label}</span>}
      <div style={{ position: 'relative' }}>
        <input
          {...rest}
          style={{
            width: '100%', height: 40, padding: right ? '0 36px 0 12px' : '0 12px',
            borderRadius: 10,
            background: 'rgba(255,255,255,.08)',
            border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,.22)'}`,
            color: 'white', outline: 'none', ...style
          }}
        />
        {right && (
          <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>{right}</div>
        )}
      </div>
      {hint && !error && <span style={{ fontSize: 12, color: '#94a3b8' }}>{hint}</span>}
      {error && <span style={{ fontSize: 12, color: '#fca5a5' }}>{error}</span>}
    </label>
  )}

// ---- TEXTAREA ----
export function Textarea({ label, hint, error, style, rows = 4, ...rest }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      {label && <span style={{ fontSize: 12, color: '#cbd5e1' }}>{label}</span>}
      <textarea
        rows={rows}
        {...rest}
        style={{
          width: '100%', padding: '10px 12px',
          borderRadius: 10,
          background: 'rgba(255,255,255,.08)',
          border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,.22)'}`,
          color: 'white', outline: 'none', resize: 'vertical', ...style
        }}
      />
      {hint && !error && <span style={{ fontSize: 12, color: '#94a3b8' }}>{hint}</span>}
      {error && <span style={{ fontSize: 12, color: '#fca5a5' }}>{error}</span>}
    </label>
  )}

// ---- BADGE ----
export function Badge({ children, tone = 'neutral', style }) {
  const colors = {
    neutral: { background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.20)', color: '#e5e7eb' },
    success: { background: 'rgba(16,185,129,.18)', border: '1px solid rgba(16,185,129,.35)', color: '#bbf7d0' },
    warn:    { background: 'rgba(234,179,8,.18)', border: '1px solid rgba(234,179,8,.35)', color: '#fde68a' },
    danger:  { background: 'rgba(239,68,68,.18)', border: '1px solid rgba(239,68,68,.35)', color: '#fecaca' },
  }
  return (
    <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, ...colors[tone], ...style }}>{children}</span>
  )
}
