// src/components/Topbar.jsx
import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useApp } from '../hooks/useApp'
import { useBooking } from '../hooks/useBooking'

function initialsFromEmail(email) {
  if (!email) return 'FS'
  const name = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ')
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 0) return 'FS'
  if (parts.length === 1) return parts[0].slice(0,2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function Topbar() {
  const { user, logout, isTrainer, isClient } = useApp()
  const navigate = useNavigate()
  
  // Get booking data for notifications (only for trainers)
  const { pendingBookings } = useBooking()
  const pendingCount = isTrainer ? pendingBookings.length : 0

  // Notification badge component
  const NotificationBadge = ({ count, children }) => (
    <div className="relative">
      {children}
      {count > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  )

  const handleLogout = async () => {
    await logout()
    window.location.href = '/' // Force full redirect to landing page
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-900/80 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Brand */}
          <button 
            onClick={() => {
              if (user) {
                const path = isTrainer ? '/app/inbox' : '/app/discover'
                window.location.href = path
              } else {
                window.location.href = '/'
              }
            }} 
            className="flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer bg-transparent border-none p-0"
            title={user ? 'Go to Dashboard' : 'Go to Home'}
          >
            <img src="/logo/logo_transparent.png" alt="FitStream" className="h-8 w-8 rounded" />
            <span className="text-white text-lg font-extrabold tracking-tight">FitStream</span>
          </button>

          {/* Center: Nav - Role-based navigation */}
          <nav className="hidden md:flex items-center gap-4 text-slate-200/90">
            {isTrainer ? (
              // Trainer Navigation
              <>
                <NotificationBadge count={pendingCount}>
                  <Link to="/app/inbox" className="hover:text-white transition">📥 Inbox</Link>
                </NotificationBadge>
                <Link to="/app/availability" className="hover:text-white transition">📅 Availability</Link>
                <Link to="/app/profile" className="hover:text-white transition">👤 Profile</Link>
                <Link to="/app/payouts" className="hover:text-white transition">💰 Payouts</Link>
                <Link to="/app/messages" className="hover:text-white transition">💬 Messages</Link>
                <Link to="/app/settings" className="hover:text-white transition">⚙️ Settings</Link>
              </>
            ) : (
              // Client Navigation  
              <>
                <Link to="/app/discover" className="hover:text-white transition">🔍 Discover</Link>
                <Link to="/app/book" className="hover:text-white transition">📅 Book Session</Link>
                <Link to="/app/progress" className="hover:text-white transition">📊 Progress</Link>
                <Link to="/app/payments" className="hover:text-white transition">💳 Payments</Link>
                <Link to="/app/messages" className="hover:text-white transition">💬 Messages</Link>
                <Link to="/app/settings" className="hover:text-white transition">⚙️ Settings</Link>
              </>
            )}
          </nav>

          {/* Right: Auth actions */}
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <div className="text-sm text-slate-300">{user.full_name || user.email}</div>
                <div className="text-xs text-slate-400 capitalize">
                  {isTrainer ? '🏅 Trainer' : '👤 Client'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  title={`${user.full_name || user.email} (${user.role})`}
                  className={`grid h-9 w-9 place-items-center rounded-full text-white text-sm font-bold ${
                    isTrainer 
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-500' 
                      : 'bg-gradient-to-br from-cyan-500 to-indigo-500'
                  }`}
                >
                  {user.full_name ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : initialsFromEmail(user.email)}
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

        {/* Mobile nav - Role-based */}
        <div className="mt-2 md:hidden">
          <nav className="flex items-center gap-3 overflow-x-auto text-slate-200/90 text-sm">
            {isTrainer ? (
              // Trainer Mobile Navigation
              <>
                <NotificationBadge count={pendingCount}>
                  <Link to="/app/inbox" className="hover:text-white transition whitespace-nowrap">📥 Inbox</Link>
                </NotificationBadge>
                <Link to="/app/availability" className="hover:text-white transition whitespace-nowrap">📅 Schedule</Link>
                <Link to="/app/profile" className="hover:text-white transition whitespace-nowrap">👤 Profile</Link>
                <Link to="/app/payouts" className="hover:text-white transition whitespace-nowrap">💰 Payouts</Link>
                <Link to="/app/messages" className="hover:text-white transition whitespace-nowrap">💬 Messages</Link>
                <Link to="/app/settings" className="hover:text-white transition whitespace-nowrap">⚙️ Settings</Link>
              </>
            ) : (
              // Client Mobile Navigation
              <>
                <Link to="/app/discover" className="hover:text-white transition whitespace-nowrap">🔍 Discover</Link>
                <Link to="/app/book" className="hover:text-white transition whitespace-nowrap">📅 Book</Link>
                <Link to="/app/progress" className="hover:text-white transition whitespace-nowrap">📊 Progress</Link>
                <Link to="/app/payments" className="hover:text-white transition whitespace-nowrap">💳 Payments</Link>
                <Link to="/app/messages" className="hover:text-white transition whitespace-nowrap">💬 Messages</Link>
                <Link to="/app/settings" className="hover:text-white transition whitespace-nowrap">⚙️ Settings</Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}