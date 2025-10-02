import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../hooks/useApp'
import { supabase } from '../../supabaseClient'

export default function OAuthCallback() {
  const navigate = useNavigate()
  const { user, loading, isAuthenticated } = useApp()

  // 1) Exchange the OAuth code for a session (Supabase v2)
  useEffect(() => {
    const url = window.location.href
    const hasCode = url.includes('code=') || url.includes('access_token=')
    if (!hasCode) return

    const doExchange = async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(url)
      if (error) {
        console.error('OAuth exchange error:', error)
        navigate('/?auth_error=oauth_exchange_failed', { replace: true })
        return
      }
      // Clean query params to avoid re-exchanging on re-render/back-navigation
      try {
        window.history.replaceState({}, document.title, '/auth/callback')
      } catch {}
      // If success, onAuthStateChange in AppContext will kick in and redirect accordingly
    }

    doExchange()
  }, [navigate])

  // 2) After session is set, redirect by role
  useEffect(() => {
    if (!loading) {
      if (isAuthenticated && user) {
        const path = user.role === 'trainer' ? '/app/inbox' : '/app/discover'
        navigate(path, { replace: true })
      }
    }
  }, [loading, isAuthenticated, user, navigate])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Completing sign in...</p>
      </div>
    </div>
  )
}
