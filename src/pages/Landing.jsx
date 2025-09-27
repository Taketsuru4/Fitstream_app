import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../hooks/useApp'
import { supabase } from '../supabaseClient'

export default function Landing(){
  const navigate = useNavigate()
  const { login } = useApp()

  const [email, setEmail] = useState('')
  const [role, setRole] = useState('client') // 'client' | 'trainer'
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const valid = useMemo(() => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), [email])

  // Remember role preference before leaving for OAuth or sending OTP
  const rememberRolePref = () => {
    try { localStorage.setItem('fitstream:rolePref', role) } catch (e) { console.error('Failed to save role preference', e) }
  }

  // Resolve final role after auth (prefers profile.role if set, else local pref)
  const resolveRoleAfterAuth = useCallback(async (user) => {
    let pref = null
    try { pref = localStorage.getItem('fitstream:rolePref') || null } catch (e) { console.error('Failed to get role preference', e) }
    const desired = pref === 'trainer' ? 'trainer' : role || 'client'

    const { data: prof, error } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', user.id)
      .maybeSingle()

    if (error) throw error

    if (!prof?.role) {
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ role: desired })
        .eq('id', user.id)
      if (updErr) throw updErr
      return { finalRole: desired, full_name: prof?.full_name }
    }
    return { finalRole: prof.role, full_name: prof.full_name }
  }, [role])

  // After successful auth/session present
  const handlePostAuth = useCallback(async (user) => {
    try {
      const { finalRole, full_name } = await resolveRoleAfterAuth(user)

      // clear one-shot pref
      try { localStorage.removeItem('fitstream:rolePref') } catch (e) { console.error('Failed to remove role preference', e) }

      login({
        id: user.id,
        email: user.email,
        role: finalRole,
        name: full_name || (finalRole === 'trainer' ? 'Coach' : 'Athlete'),
      })

      navigate('/app/' + (finalRole === 'client' ? 'discover' : 'inbox'), { replace: true })
    } catch (e) {
      console.error(e)
      setMsg(e.message || 'Post-auth error')
    }
  }, [login, navigate, resolveRoleAfterAuth])

  // Send magic link / OTP
  const start = async () => {
    try {
      if (!valid) return alert('Enter a valid email')
      setLoading(true)
      setMsg('Sending sign-in link to your email...')

      rememberRolePref()

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
          data: { role_pref: role }
        }
      })
      if (error) throw error
      setMsg('✅ Check your email for the sign-in link.')
    } catch (err) {
      console.error(err)
      setMsg(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // OAuth providers
  const signInWithGoogle = async () => {
    rememberRolePref()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { access_type: 'offline', prompt: 'consent' }
      }
    })
    if (error) setMsg(error.message)
  }

  const signInWithFacebook = async () => {
    rememberRolePref()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: window.location.origin }
    })
    if (error) setMsg(error.message)
  }

  // Session listener (covers redirect back & refresh)
  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange(async (_evt, session) => {
      if (session?.user) await handlePostAuth(session.user)
    })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) handlePostAuth(data.session.user)
    })
    return () => { sub?.data?.subscription?.unsubscribe?.() }
  }, [handlePostAuth])

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
    <div style={{ position:'relative', overflow:'hidden', background: 'var(--bg-primary)' }} ref={revealRoot}>
      <style>{`
        [data-reveal]{opacity:0;transform:translateY(18px);transition:opacity .6s ease, transform .6s ease}
        .reveal-in{opacity:1 !important;transform:none !important}
        
        .hero-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at 20% 50%, rgba(6, 182, 212, 0.1) 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
                      radial-gradient(circle at 40% 80%, rgba(6, 182, 212, 0.05) 0%, transparent 50%);
          pointer-events: none;
        }
        
        .floating-element {
          position: absolute;
          width: 6px;
          height: 6px;
          background: var(--accent-primary);
          border-radius: 50%;
          opacity: 0.3;
          animation: float 8s ease-in-out infinite;
        }
        
        .floating-element:nth-child(1) { top: 20%; left: 10%; animation-delay: 0s; }
        .floating-element:nth-child(2) { top: 60%; left: 20%; animation-delay: 2s; }
        .floating-element:nth-child(3) { top: 30%; right: 15%; animation-delay: 4s; }
        .floating-element:nth-child(4) { top: 70%; right: 10%; animation-delay: 6s; }
      `}</style>

      {/* Background Elements */}
      <div className="hero-bg" />
      <div className="floating-element" />
      <div className="floating-element" />
      <div className="floating-element" />
      <div className="floating-element" />

      {/* Hero Section */}
<section className="container" style={{ padding: '10px 16px 40px', position: 'relative', zIndex: 2 }}>
  {/* Wrapper κεντραρισμένος */}
  <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
    {/* Logo */}
    <div data-reveal style={{ marginBottom:2, alignItems:'center', justifyContent:'center', display:'flex' }}>
      <img src="/logo/logo_transparent.png" alt="FitStream" width={180} height={260} />
    </div>

    {/* Badge */}
    <div data-reveal style={{ display:'inline-flex', alignItems:'center', gap:2, padding:'2px 12px', borderRadius:999,
                              border:'1px solid rgba(255,255,255,.18)', background:'rgba(255,255,255,.08)',
                              fontSize:12, fontWeight:700, letterSpacing:.4, marginBottom:4 }}>
      NEW • FitStream v0.1
    </div>

    {/* Τίτλος + υπότιτλος */}
    <h1 className="h1 text-gradient" data-reveal style={{ margin:'10px 0 10px' }}>
      Find your trainer. Book in seconds. Track real results.
    </h1>
    <p data-reveal style={{ color:'var(--text-secondary)', fontSize:18, maxWidth:620, margin:'0 auto 22px' }}>
      A single, elegant workflow for clients and coaches: discovery, scheduling, payments, progress, and messaging.
    </p>

    {/* Επιλογή ρόλου – κεντραρισμένη */}
    <div data-reveal style={{ display:'flex', gap:12, margin:'12px auto 18px', justifyContent:'center', flexWrap:'wrap' }}>
      <button onClick={() => setRole('client')}
              className={`btn ${role === 'client' ? 'btn-primary' : 'btn-secondary'}`}>
        🏃‍♀️ I'm a Client
      </button>
      <button onClick={() => setRole('trainer')}
              className={`btn ${role === 'trainer' ? 'btn-primary' : 'btn-secondary'}`}>
        💪 I'm a Trainer
      </button>
    </div>

    {/* Email form – ΠΛΗΡΩΣ κεντραρισμένο */}
    <div data-reveal
         style={{
           display:'grid',
           gridTemplateColumns:'1fr auto',
           gap:12,
           maxWidth:540,
           margin:'0 auto'
         }}>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@fitstream.app"
        className="input"
        type="email"
        autoComplete="email"
      />
      <button
        onClick={start}
        disabled={!valid || loading}
        className={`btn ${valid && !loading ? 'btn-primary' : 'btn-secondary'}`}
        style={{ opacity: valid && !loading ? 1 : .6, cursor: valid && !loading ? 'pointer' : 'not-allowed' }}
      >
        {loading ? 'Sending...' : 'Get Started'}
      </button>
    </div>

    {/* OAuth κουμπιά – επίσης κεντραρισμένα */}
    <div data-reveal style={{ display:'flex', gap:14, margin:'16px auto 10px', justifyContent:'center', flexWrap:'wrap' }}>
      <button onClick={signInWithGoogle} className="btn btn-secondary">🔍 Continue with Google</button>
      <button onClick={signInWithFacebook} className="btn btn-secondary">📘 Continue with Facebook</button>
    </div>

    {/* Status */}
    {!!msg && (
      <div data-reveal style={{ margin:'8px auto 0', maxWidth:540, padding:'10px 12px',
                                borderRadius:10, background:'var(--bg-card)', border:'1px solid var(--border-primary)',
                                color:'var(--text-secondary)', fontSize:14 }}>
        {msg}
      </div>
    )}

    {/* Trust badges (κεντραρισμένα) */}
    <div data-reveal style={{ display:'flex', gap:14, flexWrap:'wrap', alignItems:'center', justifyContent:'center',
                              color:'var(--text-muted)', fontSize:13, marginTop:12 }}>
      <span className="badge">✅ Secure payments</span>
      <span className="badge">✅ EU GDPR ready</span>
      <span className="badge">✅ Easy reschedule</span>
    </div>

    {/* 📊 STATS – ΚΑΤΩ ΑΠΟ ΤΟ LOGIN, ΣΕ ΜΙΑ ΣΕΙΡΑ (responsive) */}
    <div data-reveal
         style={{
           display:'grid',
           gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))',
           gap:14,
           maxWidth:760,
           margin:'26px auto 0'
         }}>
      <div className="card" style={{ padding:16 }}>
        <div className="stat-number" style={{ fontSize:28, fontWeight:900 }}>10k+</div>
        <div style={{ color:'var(--text-secondary)', marginTop:4 }}>Happy clients</div>
      </div>
      <div className="card" style={{ padding:16 }}>
        <div className="stat-number" style={{ fontSize:28, fontWeight:900 }}>500+</div>
        <div style={{ color:'var(--text-secondary)', marginTop:4 }}>Expert trainers</div>
      </div>
      <div className="card" style={{ padding:16 }}>
        <div className="stat-number" style={{ fontSize:28, fontWeight:900 }}>98%</div>
        <div style={{ color:'var(--text-secondary)', marginTop:4 }}>Satisfaction rate</div>
      </div>
    </div>
  </div>
</section>

      {/* Features Section */}
      <section className="container" style={{ padding: '60px 0' }}>
        <div data-reveal style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 className="h2 text-gradient" style={{ marginBottom: '1rem' }}>
            Everything you need to succeed
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', maxWidth: '600px', margin: '0 auto' }} className="text-balance">
            Whether you're a trainer looking to grow your business or a client seeking the perfect coach, we've got you covered.
          </p>
        </div>
        
        <div className="grid-features">
          <div data-reveal className="card">
            <div className="feature-icon">🎯</div>
            <h3 className="h3" style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Smart Matching</h3>
            <p style={{ color: 'var(--text-secondary)' }}>AI-powered matching connects you with the perfect trainer based on your goals, location, and preferences.</p>
          </div>
          
          <div data-reveal className="card">
            <div className="feature-icon">📅</div>
            <h3 className="h3" style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Easy Scheduling</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Book, reschedule, or cancel sessions with just a few taps. Real-time availability sync keeps everyone updated.</p>
          </div>
          
          <div data-reveal className="card">
            <div className="feature-icon">💳</div>
            <h3 className="h3" style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Secure Payments</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Automated, secure payments with multiple options. Trainers get paid instantly, clients enjoy seamless transactions.</p>
          </div>
          
          <div data-reveal className="card">
            <div className="feature-icon">📊</div>
            <h3 className="h3" style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Progress Tracking</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Visual progress tracking with photos, measurements, and performance metrics to keep you motivated.</p>
          </div>
          
          <div data-reveal className="card">
            <div className="feature-icon">💬</div>
            <h3 className="h3" style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Direct Messaging</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Stay connected with your trainer or clients through secure, built-in messaging and file sharing.</p>
          </div>
          
          <div data-reveal className="card">
            <div className="feature-icon">🏆</div>
            <h3 className="h3" style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Goal Achievement</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Set goals, track milestones, and celebrate achievements with gamified progress and rewards.</p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="container" style={{ padding: '60px 0' }}>
        <div data-reveal style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 className="h2 text-gradient" style={{ marginBottom: '1rem' }}>
            Loved by trainers & clients worldwide
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
            Don't just take our word for it
          </p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
          <div data-reveal className="testimonial-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>👩</div>
              <div>
                <h4 style={{ color: 'var(--text-primary)', margin: 0, fontWeight: 600 }}>Sarah M.</h4>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>Fitness Enthusiast</p>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
              FitStream completely transformed my fitness journey. Finding the right trainer was so easy, and the progress tracking keeps me motivated every day.
            </p>
            <div style={{ color: 'var(--accent-primary)' }}>⭐⭐⭐⭐⭐</div>
          </div>
          
          <div data-reveal className="testimonial-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>👨</div>
              <div>
                <h4 style={{ color: 'var(--text-primary)', margin: 0, fontWeight: 600 }}>Mike R.</h4>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>Personal Trainer</p>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
              As a trainer, FitStream has streamlined my entire business. Client management, scheduling, and payments are all handled seamlessly.
            </p>
            <div style={{ color: 'var(--accent-primary)' }}>⭐⭐⭐⭐⭐</div>
          </div>
          
          <div data-reveal className="testimonial-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>👩‍🦰</div>
              <div>
                <h4 style={{ color: 'var(--text-primary)', margin: 0, fontWeight: 600 }}>Emma L.</h4>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>Yoga Instructor</p>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
              The platform is incredibly intuitive. My clients love how easy it is to book sessions and track their progress. Highly recommended!
            </p>
            <div style={{ color: 'var(--accent-primary)' }}>⭐⭐⭐⭐⭐</div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container" style={{ padding: '60px 0 80px' }}>
        <div data-reveal className="card" style={{ textAlign: 'center', padding: '3rem 2rem', background: 'var(--bg-card)', border: '1px solid var(--border-secondary)' }}>
          <h2 className="h2 text-gradient" style={{ marginBottom: '1rem' }}>
            Ready to start your fitness journey?
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem' }} className="text-balance">
            Join thousands of trainers and clients who have already transformed their fitness experience with FitStream.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={start} disabled={!valid || loading} className={`btn ${valid && !loading ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: '1rem', padding: '1rem 2rem' }}>
              {loading ? 'Getting Started...' : 'Get Started Free'}
            </button>
            <button className="btn btn-ghost" style={{ fontSize: '1rem', padding: '1rem 2rem' }}>
              Learn More
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
