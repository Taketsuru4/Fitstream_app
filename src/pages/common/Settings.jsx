import React, { useState } from 'react'
import { useApp } from '../../hooks/useApp'
import RoleSwitcher from '../../components/auth/RoleSwitcher'

export default function Settings(){
  const { user, logout } = useApp()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleLogout = async () => {
    await logout()
    setShowLogoutConfirm(false)
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Manage your account preferences and settings</p>
      </div>

      {/* Profile Information */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Profile Information</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email Address
            </label>
            <div className="text-white bg-gray-700 px-3 py-2 rounded border">
              {user?.email || 'Not provided'}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Full Name
            </label>
            <div className="text-white bg-gray-700 px-3 py-2 rounded border">
              {user?.full_name || 'Not provided'}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Member Since
            </label>
            <div className="text-white bg-gray-700 px-3 py-2 rounded border">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently'}
            </div>
          </div>
        </div>
      </div>

      {/* Role Management */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Account Type</h2>
        <p className="text-gray-400 mb-6">
          Switch between client and trainer roles to access different features.
        </p>
        <RoleSwitcher />
      </div>

      {/* Account Actions */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Account Actions</h2>
        
        <div className="space-y-4">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">More Settings Coming Soon</h2>
        <div className="space-y-2 text-gray-400">
          <p>• Notification preferences</p>
          <p>• Privacy settings</p>
          <p>• Timezone configuration</p>
          <p>• Export your data (GDPR)</p>
          <p>• Delete account</p>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              Sign Out?
            </h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to sign out of your account?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 px-4 bg-gray-800 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
