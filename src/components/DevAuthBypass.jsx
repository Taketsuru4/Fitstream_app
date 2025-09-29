import React, { useState } from 'react'
import { useApp } from '../hooks/useApp'

const DevAuthBypass = () => {
  const { login, logout, user, loading } = useApp()
  const [selectedRole, setSelectedRole] = useState('client')

  // Only show in development
  if (process.env.NODE_ENV === 'production') return null

  const handleDevLogin = (role) => {
    const mockUser = {
      id: `dev-user-${role}-${Date.now()}`,
      email: `dev-${role}@fitstream.local`,
      full_name: role === 'trainer' ? 'Dev Trainer' : 'Dev Client',
      role: role,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('🚀 DEV LOGIN:', mockUser)
    login(mockUser)
  }

  const handleDevLogout = () => {
    console.log('🚪 DEV LOGOUT')
    logout()
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-yellow-600 text-black px-3 py-2 rounded-lg shadow-lg border-2 border-yellow-400">
        <div className="text-xs font-bold mb-2 text-center">🛠️ DEV MODE</div>
        
        {!user ? (
          <div className="space-y-2">
            <div className="text-xs">Quick Login:</div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDevLogin('client')}
                disabled={loading}
                className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:opacity-50"
              >
                Client
              </button>
              <button
                onClick={() => handleDevLogin('trainer')}
                disabled={loading}
                className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50"
              >
                Trainer
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs">
              <div>👤 {user.full_name}</div>
              <div>🎭 {user.role}</div>
              <div>📧 {user.email}</div>
            </div>
            <button
              onClick={handleDevLogout}
              className="w-full px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        )}
        
        <div className="mt-2 text-xs text-center opacity-75">
          Development Only
        </div>
      </div>
    </div>
  )
}

export default DevAuthBypass