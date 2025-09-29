import React, { useState } from 'react'
import { useApp } from '../hooks/useApp'

const DevStateDebug = () => {
  const { user, role, loading, isAuthenticated, isClient, isTrainer } = useApp()
  const [isVisible, setIsVisible] = useState(false)

  // Only show in development
  if (process.env.NODE_ENV === 'production') return null

  return (
    <div className="fixed top-4 left-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-gray-800 text-yellow-400 px-2 py-1 rounded text-xs font-mono border border-yellow-400"
      >
        🐛 DEBUG
      </button>
      
      {isVisible && (
        <div className="mt-2 bg-gray-900 text-green-400 p-3 rounded-lg shadow-xl border border-green-400 font-mono text-xs max-w-xs">
          <div className="text-yellow-400 font-bold mb-2">🔍 Auth State</div>
          
          <div className="space-y-1">
            <div>loading: <span className="text-cyan-400">{loading.toString()}</span></div>
            <div>isAuthenticated: <span className="text-cyan-400">{isAuthenticated.toString()}</span></div>
            <div>role: <span className="text-cyan-400">{role || 'null'}</span></div>
            <div>isClient: <span className="text-cyan-400">{isClient.toString()}</span></div>
            <div>isTrainer: <span className="text-cyan-400">{isTrainer.toString()}</span></div>
          </div>
          
          {user && (
            <div className="mt-3 pt-2 border-t border-green-600">
              <div className="text-yellow-400 font-bold mb-1">👤 User</div>
              <div>id: <span className="text-cyan-400">{user.id?.slice(0, 8)}...</span></div>
              <div>email: <span className="text-cyan-400">{user.email}</span></div>
              <div>name: <span className="text-cyan-400">{user.full_name}</span></div>
              <div>role: <span className="text-cyan-400">{user.role}</span></div>
            </div>
          )}
          
          <div className="mt-2 text-xs text-gray-500">
            Development Only
          </div>
        </div>
      )}
    </div>
  )
}

export default DevStateDebug