import React, { useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * Reusable, accessible Modal (no external deps)
 * - Portal to <body>
 * - ESC / backdrop close (configurable)
 * - Focus trap + return focus to opener
 * - Sizes + mobile full‑screen
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  closeOnEsc = true,
  closeOnBackdrop = true,
  initialFocus, // ref to element to focus on open
  fullScreenOn = 640, // px breakpoint for full screen on small devices
}) {
  const overlayRef = useRef(null)
  const panelRef = useRef(null)
  const lastActiveRef = useRef(null)

  // Return focus to trigger on unmount
  useEffect(() => {
    if (open) lastActiveRef.current = document.activeElement
    return () => {
      if (lastActiveRef.current && typeof lastActiveRef.current.focus === 'function') {
        lastActiveRef.current.focus()
      }
    }
  }, [open])

  // Handle ESC
  useEffect(() => {
    if (!open || !closeOnEsc) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeOnEsc, onClose])

  // Focus management + simple trap
  useLayoutEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return

    const focusables = () => Array.from(panel.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )).filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'))

    const toFocus = initialFocus?.current || focusables()[0] || panel
    toFocus?.focus()

    const trap = (e) => {
      if (e.key !== 'Tab') return
      const els = focusables()
      if (els.length === 0) { e.preventDefault(); return }
      const first = els[0]
      const last = els[els.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus()
      }
    }

    panel.addEventListener('keydown', trap)
    return () => panel.removeEventListener('keydown', trap)
  }, [open, initialFocus])

  if (!open) return null

  const sizes = {
    sm: 420,
    md: 640,
    lg: 800,
    xl: 1040,
  }
  const maxW = sizes[size] || sizes.md

  const content = (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : undefined}
      onMouseDown={(e) => {
        // backdrop close
        if (!closeOnBackdrop) return
        if (e.target === overlayRef.current) onClose?.()
      }}
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        background: 'rgba(0,0,0,.5)',
        display: 'grid', placeItems: 'center',
        padding: 16,
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        style={{
          width: `min(${maxW}px, 96vw)`,
          maxHeight: '90vh',
          overflow: 'auto',
          border: '1px solid rgba(255,255,255,.16)',
          borderRadius: 14,
          background: 'linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.04))',
          boxShadow: '0 20px 60px rgba(0,0,0,.45)'
        }}
      >
        {/* Header */}
        {(title || onClose) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottom: '1px solid rgba(255,255,255,.12)' }}>
            <div style={{ fontWeight: 800 }}>{title}</div>
            {onClose && (
              <button onClick={onClose} style={{ height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,.22)', background: 'rgba(255,255,255,.10)', color: '#fff', cursor: 'pointer' }} aria-label="Close modal">✕</button>
            )}
          </div>
        )}

        {/* Body */}
        <div style={{ padding: 12 }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,.12)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {footer}
          </div>
        )}
      </div>

      {/* Mobile full-screen tweak */}
      <style>{`
        @media (max-width: ${fullScreenOn}px){
          [data-modal-panel]{
            width: 100vw !important;
            height: 100vh !important;
            max-height: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  )

  return createPortal(content, document.body)
}
