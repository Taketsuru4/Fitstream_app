// src/components/Topbar.jsx
import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useApp } from '../hooks/useApp'

function initialsFromEmail(email) {
  if (!email) return 'FS'
  const name = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ')
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 0) return 'FS'
  if (parts.length === 1) return parts[0].slice(0,2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function Topbar() {
  const { user, logout } = useApp()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-900/80 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Brand */}
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo/fitstream.png" alt="FitStream" className="h-8 w-8 rounded" />
            <span className="text-white text-lg font-extrabold tracking-tight">FitStream</span>
          </Link>

          {/* Center: Nav (can extend later) */}
          <nav className="hidden md:flex items-center gap-4 text-slate-200/90">
            <Link to="/app/discover" className="hover:text-white transition">Discover</Link>
            <Link to="/app/messages" className="hover:text-white transition">Messages</Link>
            <Link to="/app/settings" className="hover:text-white transition">Settings</Link>
          </nav>

          {/* Right: Auth actions */}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-sm text-slate-300">{user.email}</span>
              <div className="flex items-center gap-2">
                <div
                  title={user.email}
                  className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 text-white text-sm font-bold"
                >
                  {initialsFromEmail(user.email)}
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 active:opacity-90"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/"
                className="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-semibold text-white hover:bg-white/15 active:bg-white/20"
              >
                Login
              </Link>
            </div>
          )}
        </div>

        {/* Mobile nav */}
        <div className="mt-2 md:hidden">
          <nav className="flex items-center gap-4 overflow-x-auto text-slate-200/90">
            <Link to="/app/discover" className="hover:text-white transition">Discover</Link>
            <Link to="/app/messages" className="hover:text-white transition">Messages</Link>
            <Link to="/app/settings" className="hover:text-white transition">Settings</Link>
          </nav>
        </div>
      </div>
    </header>
  )
}