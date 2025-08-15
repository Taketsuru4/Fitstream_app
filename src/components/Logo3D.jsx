import React, { useState } from 'react'

export default function Logo3D({ src = '/logo/fitstream.png', size = 320 }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    const y = (px - 0.5) * 14
    const x = (0.5 - py) * 14
    setTilt({ x, y })
  }

  const onLeave = () => setTilt({ x: 0, y: 0 })

  return (
    <div style={{ perspective: 600, display: 'grid', placeItems: 'center' }}>
      <div
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: 'transform .25s cubic-bezier(.2,.7,.2,1)',
          position: 'relative',
          borderRadius: 14,
          padding: 14,
          background: 'linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.04))',
          border: '1px solid rgba(255,255,255,.18)',
          boxShadow: '0 10px 30px rgba(0,0,0,.35)',
        }}
      >
        <div style={{
          position: 'relative', background: 'rgba(0,0,0,.65)', borderRadius: 8, padding: 18, display: 'grid', placeItems: 'center'
        }}>
          <img src={src} alt="FitStream" width={size} height={size} style={{ userSelect: 'none', filter: 'drop-shadow(0 12px 28px rgba(0,0,0,.55))' }} />
        </div>
      </div>
    </div>
  )
}