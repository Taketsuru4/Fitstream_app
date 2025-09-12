import React from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useApp } from '../context/appContext'

/**
 * Minimal, modern navigation bar with glass/blur, underline animation
 * - Role-based tabs (client / trainer)
 * - Active route highlight via NavLink
 * - Subtle hover + focus styles
 */
export default function Topbar() {
  const { user, role, setRole, logout } = useApp()

  const clientTabs = [
    { id: 'discover', label: 'Discover' },
    { id: 'book', label: 'Book' },
    { id: 'messages', label: 'Messages' },
    { id: 'progress', label: 'Progress' },
    { id: 'payments', label: 'Payments' },
    { id: 'settings', label: 'Settings' },
  ]
  const trainerTabs = [
    { id: 'inbox', label: 'Inbox' },
    { id: 'availability', label: 'Availability' },
    { id: 'messages', label: 'Messages' },
    { id: 'payouts', label: 'Payouts' },
    { id: 'profile', label: 'Profile' },
    { id: 'settings', label: 'Settings' },
  ]
  const tabs = role === 'trainer' ? trainerTabs : clientTabs

  const tabClass = ({ isActive }) => (
    'fs-tab' + (isActive ? ' fs-active' : '')
  )

  return (
    <header className="fs-nav-wrap">
      <style>{`
        .fs-nav-wrap{position:sticky;top:0;z-index:40;backdrop-filter: blur(10px);}
        .fs-nav{display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.06);
          background:linear-gradient(180deg,rgba(15,15,18,.75),rgba(15,15,18,.55));}
        .fs-brand{display:inline-flex;align-items:center;gap:8;text-decoration:none;color:#fff;font-weight:800;letter-spacing:.2px}
        .fs-brand img{width:24px;height:24px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.35)}
        .fs-spacer{flex:1}
        .fs-role{height:34px;border-radius:10px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.2);
          color:#fff;padding:0 10px}
        .fs-btn{height:34px;border-radius:10px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.2);
          color:#fff;padding:0 12px;font-weight:700;cursor:pointer}
        .fs-tabs{display:flex;gap:6;padding:8px 14px;overflow:auto}
        .fs-tab{position:relative;display:inline-flex;align-items:center;gap:6;padding:8px 10px;border-radius:10px;
          color:#e5e7eb;text-decoration:none;border:1px solid transparent;transition:background .2s ease,color .2s ease}
        .fs-tab:hover{background:rgba(255,255,255,.06);color:#fff}
        .fs-tab::after{content:"";position:absolute;left:10px;right:10px;bottom:6px;height:2px;border-radius:2px;
          background:linear-gradient(90deg,#06b6d4,#6366f1);opacity:0;transform:scaleX(.3);transform-origin:left;transition:all .25s ease}
        .fs-tab.fs-active{color:#fff;background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.12)}
        .fs-tab.fs-active::after{opacity:1;transform:scaleX(1)}
        @media (max-width: 740px){ .fs-brand strong{display:none} }
      `}</style>

      <div className="fs-nav">
        <Link to="/" className="fs-brand">
          <img src="/logo/fitstream.png" alt="FitStream" />
          <strong>FitStream</strong>
          <span style={{fontSize:12,opacity:.8,marginLeft:6}}>Beta</span>
        </Link>

        <div className="fs-spacer" />

        {user && (
          <>
            <select className="fs-role" value={role} onChange={(e)=>setRole(e.target.value)}>
              <option value="client">Client</option>
              <option value="trainer">Trainer</option>
            </select>
            <button className="fs-btn" onClick={logout}>Logout</button>
          </>
        )}
      </div>

      {user && (
        <nav className="fs-tabs">
          {tabs.map(t => (
            <NavLink key={t.id} to={`/app/${t.id}`} className={tabClass}>
              {t.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}
