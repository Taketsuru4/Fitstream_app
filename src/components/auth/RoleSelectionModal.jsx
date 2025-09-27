import React, { useState } from 'react'
import { useApp } from '../../hooks/useApp'
import Modal from '../Modal'

const RoleSelectionModal = ({ isOpen, onClose }) => {
  const [selectedRole, setSelectedRole] = useState('client')
  const [loading, setLoading] = useState(false)
  const { updateUserRole } = useApp()

  const handleRoleSelection = async () => {
    setLoading(true)
    
    try {
      const result = await updateUserRole(selectedRole)
      
      if (result.error) {
        console.error('Error updating role:', result.error)
      } else {
        onClose()
      }
    } catch (error) {
      console.error('Unexpected error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal open={isOpen} onClose={() => {}} title="Welcome to FitStream!">
      <div className="w-full max-w-md mx-auto text-center">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white mb-2">
            Tell us about yourself
          </h3>
          <p className="text-gray-400">
            Choose your role to get the best experience
          </p>
        </div>

        {/* Role Options */}
        <div className="space-y-4 mb-6">
          <div 
            onClick={() => setSelectedRole('client')}
            className={`p-6 border rounded-lg cursor-pointer transition-all ${
              selectedRole === 'client' 
                ? 'border-cyan-500 bg-cyan-500/10' 
                : 'border-gray-600 hover:border-gray-500'
            }`}
          >
            <div className="flex items-start space-x-4">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 ${
                selectedRole === 'client' ? 'border-cyan-500' : 'border-gray-400'
              }`}>
                {selectedRole === 'client' && (
                  <div className="w-2.5 h-2.5 bg-cyan-500 rounded-full"></div>
                )}
              </div>
              <div className="text-left flex-1">
                <h4 className="font-semibold text-white mb-1">I'm a Client</h4>
                <p className="text-sm text-gray-400">
                  Looking for personal trainers, book sessions, track my fitness progress
                </p>
              </div>
            </div>
          </div>

          <div 
            onClick={() => setSelectedRole('trainer')}
            className={`p-6 border rounded-lg cursor-pointer transition-all ${
              selectedRole === 'trainer' 
                ? 'border-cyan-500 bg-cyan-500/10' 
                : 'border-gray-600 hover:border-gray-500'
            }`}
          >
            <div className="flex items-start space-x-4">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 ${
                selectedRole === 'trainer' ? 'border-cyan-500' : 'border-gray-400'
              }`}>
                {selectedRole === 'trainer' && (
                  <div className="w-2.5 h-2.5 bg-cyan-500 rounded-full"></div>
                )}
              </div>
              <div className="text-left flex-1">
                <h4 className="font-semibold text-white mb-1">I'm a Trainer</h4>
                <p className="text-sm text-gray-400">
                  Offering personal training services, managing clients, building my business
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleRoleSelection}
          disabled={loading}
          className="w-full py-3 px-4 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Setting up your account...
            </div>
          ) : (
            'Continue'
          )}
        </button>

        <p className="mt-4 text-xs text-gray-500">
          You can change this later in your settings
        </p>
      </div>
    </Modal>
  )
}

export default RoleSelectionModal