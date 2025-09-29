import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../hooks/useApp'

export default function OAuthCallback() {
  const navigate = useNavigate()
  const { user, loading, isAuthenticated } = useApp()

  useEffect(() => {
    // Wait for authentication to complete
    if (!loading) {
      if (isAuthenticated && user) {
        // Redirect to appropriate dashboard based on user role
        const path = user.role === 'trainer' ? '/app/inbox' : '/app/discover'
        navigate(path, { replace: true })
      } else {
        // If not authenticated after OAuth callback, redirect to landing
        navigate('/', { replace: true })
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