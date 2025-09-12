import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/appContext'
import Logo3D from '../components/Logo3d'

export default function Landing(){
  const navigate = useNavigate()
  const { login } = useApp()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('client')
  const valid = useMemo(() => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), [email])

  const start = () => {
    if (!valid) return alert('Enter a valid email')
    login({ id: Date.now().toString(36), email, role, name: role === 'client' ? 'Athlete' : 'Coach' })
    navigate('/app/' + (role === 'client' ? 'discover' : 'inbox'))
  }

  const revealRoot = useRef(null)
  useEffect(() => {
    const els = revealRoot.current?.querySelectorAll('[data-reveal]')
    if (!els?.length) return
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('reveal-in'); io.unobserve(e.target) } })
    },{ threshold: .08 })
    els.forEach(el=>io.observe(el))
    return ()=>io.disconnect()
  }, [])

  return (
    <div style={{ position:'relative', overflow:'hidden' }} ref={revealRoot}>
      <style>{`
        [data-reveal]{opacity:0;transform:translateY(18px);transition:opacity .6s ease, transform .6s ease}
        .reveal-in{opacity:1 !important;transform:none !important}
      `}</style>

      {/* Background deco */}
      <div style={{ position:'absolute', inset:0, zIndex:-1 }}>
        <div style={{ position:'absolute', top:-220, left:-180, width:560, height:560, borderRadius:'50%', background:'radial-gradient(circle at 30% 30%, rgba(20,184,166,.35), transparent 60%)', filter:'blur(28px)' }} />
        <div style={{ position:'absolute', bottom:-240, right:-180, width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle at 60% 60%, rgba(99,102,241,.30), transparent 65%)', filter:'blur(28px)' }} />
      </div>

      {/* Hero */}
      <section className="container" style={{ padding: '64px 16px 32px' }}>
  <div className="grid-hero">
    <div style={{ textAlign: 'center', marginBottom: 20 }}>
      <Logo3D src="/logo/fitstream.png" size={120} />
    </div>
    <div>
      <div data-reveal style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 999, border: '1px solid rgba(255,255,255,.18)', background: 'rgba(255,255,255,.08)', fontSize: 12, fontWeight: 700, letterSpacing: .4 }}>
        NEW • FitStream v0.1
      </div>
      <h1 className="h1" style={{ margin: '14px 0 8px', background: 'linear-gradient(180deg, #fff, #d1d5db)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
        Find your trainer. Book in seconds. Track real results.
      </h1>
      <p data-reveal style={{ color: '#cbd5e1', fontSize: 18, maxWidth: 560 }}>
        A single, elegant workflow for clients and coaches: discovery, scheduling, payments, progress, and messaging.
      </p>

      <div data-reveal style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
        <button onClick={() => setRole('client')} className="btn-full-sm" style={{ height: 44, padding: '0 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,.22)', background: role === 'client' ? '#0891b2' : 'rgba(255,255,255,.10)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
          I'm a Client
        </button>
        <button onClick={() => setRole('trainer')} className="btn-full-sm" style={{ height: 44, padding: '0 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,.22)', background: role === 'trainer' ? '#0891b2' : 'rgba(255,255,255,.10)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
          I'm a Trainer
        </button>
      </div>

      <div data-reveal style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, maxWidth: 540, marginTop: 14 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@fitstream.app"
          className="input"
        />
        <button onClick={start} disabled={!valid} className="btn-full-sm" style={{ height: 48, padding: '0 18px', borderRadius: 12, background: valid ? 'linear-gradient(90deg,#06b6d4,#6366f1)' : 'rgba(255,255,255,.15)', color: '#fff', border: 'none', fontWeight: 900, letterSpacing: .2, cursor: valid ? 'pointer' : 'not-allowed' }}>
          Get Started
        </button>
      </div>

      <div data-reveal style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginTop: 14, color: '#94a3b8', fontSize: 13 }}>
        <span>✅ Secure payments</span>
        <span>✅ EU GDPR ready</span>
        <span>✅ Reschedule & cancel</span>
      </div>
    </div>
  </div>
</section>

      {/* Social proof bar */}
      <section className="container" data-reveal style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12, padding:'8px 16px 24px' }}>
        {['Athens','Thessaloniki','Patra','Ioannina'].map((city) => (
          <div key={city} style={{ border:'1px solid rgba(255,255,255,.14)', background:'rgba(255,255,255,.06)', borderRadius:12, padding:12, textAlign:'center', color:'#e5e7eb', fontWeight:700 }}>{city} • Coaches</div>
        ))}
      </section>

      {/* Feature grid */}
      <section className="container" data-reveal style={{ padding:'20px 16px 8px' }}>
        <div className="cards">
          {[
            { t:'Discover Trainers', d:'Powerful search with specialties, price and location.' },
            { t:'Instant Booking', d:'Time slots with one‑click confirm, reschedule, cancel.' },
            { t:'Secure Payments', d:'Card on file and wallet receipts. Stripe‑ready.' },
            { t:'Progress Tracking', d:'Charts, notes and milestones that keep you motivated.' },
          ].map((f) => (
            <div key={f.t} style={{ border:'1px solid rgba(255,255,255,.14)', background:'linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03))', padding:16, borderRadius:14 }}>
              <div style={{ fontWeight:800, marginBottom:6 }}>{f.t}</div>
              <div style={{ color:'#cbd5e1' }}>{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA stripe */}
      <section className="container" data-reveal style={{ padding:'28px 16px 60px' }}>
        <div style={{ border:'1px solid rgba(255,255,255,.16)', background:'linear-gradient(90deg, rgba(6,182,212,.18), rgba(99,102,241,.22))', borderRadius:16, padding:18, display:'grid', gridTemplateColumns:'1fr auto', gap:12, alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:900, fontSize:20 }}>Ready to start?</div>
            <div style={{ color:'#e2e8f0' }}>Create your free account as a client or trainer.</div>
          </div>
          <button onClick={start} disabled={!valid} className="btn-full-sm" style={{ height:44, padding:'0 16px', borderRadius:10, background: valid?'#10b981':'rgba(255,255,255,.2)', border:'1px solid rgba(255,255,255,.25)', color:'#fff', fontWeight:800, cursor: valid?'pointer':'not-allowed' }}>Join FitStream</button>
        </div>
      </section>
    </div>
  )
}
