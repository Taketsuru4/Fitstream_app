import React, { useState } from 'react'
import { useApp } from '../../hooks/useApp'

const RoleSwitcher = ({ className = '' }) => {
  const { user, updateUserRole, isClient, isTrainer } = useApp()
  const [switching, setSwitching] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [targetRole, setTargetRole] = useState(null)

  const handleRoleSwitch = async (newRole) => {
    if (newRole === user?.role) return

    setTargetRole(newRole)
    setShowConfirm(true)
  }

  const confirmRoleSwitch = async () => {
    setSwitching(true)
    
    try {
      const result = await updateUserRole(targetRole)
      
      if (result.error) {
        console.error('Error switching role:', result.error)
        alert('Failed to switch role. Please try again.')
      } else {
        // Role switch successful, page will re-render with new role
        setShowConfirm(false)
      }
    } catch (error) {
      console.error('Unexpected error switching role:', error)
      alert('An unexpected error occurred. Please try again.')
    } finally {
      setSwitching(false)
      setTargetRole(null)
    }
  }

  const cancelRoleSwitch = () => {
    setShowConfirm(false)
    setTargetRole(null)
  }

  if (!user) return null

  return (
    <div className={`role-switcher ${className}`}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Current Role
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => handleRoleSwitch('client')}
            disabled={switching}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              isClient
                ? 'bg-cyan-600 text-white border-cyan-600'
                : 'bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700'
            } border disabled:opacity-50`}
          >
            <div className="text-center">
              <div className="text-lg mb-1">🏃‍♀️</div>
              <div className="text-sm font-semibold">Client</div>
              <div className="text-xs opacity-75 mt-1">
                Find trainers, book sessions
              </div>
            </div>
          </button>

          <button
            onClick={() => handleRoleSwitch('trainer')}
            disabled={switching}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              isTrainer
                ? 'bg-cyan-600 text-white border-cyan-600'
                : 'bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700'
            } border disabled:opacity-50`}
          >
            <div className="text-center">
              <div className="text-lg mb-1">💪</div>
              <div className="text-sm font-semibold">Trainer</div>
              <div className="text-xs opacity-75 mt-1">
                Manage clients, offer services
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              Switch to {targetRole === 'client' ? 'Client' : 'Trainer'}?
            </h3>
            
            <div className="mb-6">
              <p className="text-gray-300 mb-3">
                You're about to switch from <strong>{user.role}</strong> to <strong>{targetRole}</strong>.
              </p>
              
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-3">
                <p className="text-sm text-gray-400 mb-2">
                  <strong>What will change:</strong>
                </p>
                <ul className="text-sm text-gray-300 space-y-1">
                  {targetRole === 'client' ? (
                    <>
                      <li>• Access client dashboard and features</li>
                      <li>• Find and book trainers</li>
                      <li>• Track your fitness progress</li>
                    </>
                  ) : (
                    <>
                      <li>• Access trainer dashboard and tools</li>
                      <li>• Manage your clients</li>
                      <li>• Set availability and pricing</li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={cancelRoleSwitch}
                disabled={switching}
                className="flex-1 py-2 px-4 bg-gray-800 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmRoleSwitch}
                disabled={switching}
                className="flex-1 py-2 px-4 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50"
              >
                {switching ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Switching...
                  </div>
                ) : (
                  'Confirm Switch'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoleSwitcher