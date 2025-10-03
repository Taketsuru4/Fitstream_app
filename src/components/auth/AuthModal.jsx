import React, { useEffect, useState } from 'react'
import { useApp } from '../../hooks/useApp'
import Modal from '../Modal'

const AuthModal = ({ isOpen, onClose, defaultTab = 'login' }) => {
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'client'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showRoleSelection, setShowRoleSelection] = useState(false)
  const [signinRole, setSigninRole] = useState('client')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const { signUp, signIn, signInWithProvider, resetPassword, isAuthenticated, user, loading: appLoading } = useApp()

  // If a valid session exists when the modal opens, close it and route to app
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      // Close the modal immediately to avoid user interacting while signed in
      onClose?.()
      // If role is present, route to the proper app section
      if (user?.role) {
        const path = user.role === 'trainer' ? '/app/inbox' : '/app/discover'
        try { window.location.assign(path) } catch {}
      }
    }
  }, [isOpen, isAuthenticated, user])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
    setSuccess('')
  }

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      let result
      if (activeTab === 'login') {
        // If the app is already authenticated, short-circuit to app
        if (isAuthenticated) {
          onClose()
          if (user?.role) {
            const path = user.role === 'trainer' ? '/app/inbox' : '/app/discover'
            try { window.location.assign(path) } catch {}
          }
          return
        }

        // If role selection is shown, pass the selected role to signin
        result = await signIn(
          formData.email, 
          formData.password, 
          showRoleSelection ? { role: signinRole } : undefined
        )
        if (!result.error) {
          onClose()
          // Reset form and role selection
          setFormData({
            email: '',
            password: '',
            fullName: '',
            role: 'client'
          })
          setShowRoleSelection(false)
          setSigninRole('client')
        }
      } else {
        result = await signUp(formData.email, formData.password, {
          full_name: formData.fullName,
          role: formData.role
        })
        
        if (!result.error) {
          if (formData.role === 'trainer') {
            setSuccess(`Account created successfully! Your trainer profile has been set up and will appear in the Discover section shortly.`)
          } else {
            setSuccess(`Account created successfully! Welcome to FitStream!`)
          }
          
          // Clear form but keep modal open to show success message
          setFormData({
            email: '',
            password: '',
            fullName: '',
            role: 'client'
          })
          
          // Close modal after showing success for 2 seconds
          setTimeout(() => {
            setSuccess('')
            onClose()
          }, 2000)
        }
      }

      if (result.error) {
        console.error('Auth error:', result.error)
        // Enhanced error handling for better user experience
        const errorMessage = getAuthErrorMessage(result.error)
        setError(errorMessage)
      }
    } catch (err) {
      console.error('Unexpected auth error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialAuth = async (provider) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const result = await signInWithProvider(provider)
      if (result.error) {
        setError(result.error.message)
      }
      // Note: Social auth will redirect, so we don't need to close modal here
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const switchTab = (tab) => {
    setActiveTab(tab)
    setError('')
    setSuccess('')
    setShowRoleSelection(false)
    setShowForgotPassword(false)
  }

  const getAuthErrorMessage = (error) => {
    const errorCode = error.message || error.error_description || ''
    
    // Common authentication errors with user-friendly messages
    if (errorCode.includes('Invalid login credentials') || errorCode.includes('invalid_credentials')) {
      return 'Incorrect email or password. Please check your credentials and try again.'
    }
    if (errorCode.includes('Email not confirmed') || errorCode.includes('email_not_confirmed')) {
      return 'Please check your email and click the confirmation link before signing in.'
    }
    if (errorCode.includes('Too many requests') || errorCode.includes('rate_limit')) {
      return 'Too many login attempts. Please wait a few minutes before trying again.'
    }
    if (errorCode.includes('User not found') || errorCode.includes('user_not_found')) {
      return 'No account found with this email. Please check your email or create a new account.'
    }
    if (errorCode.includes('Signup disabled') || errorCode.includes('signup_disabled')) {
      return 'New account creation is currently disabled. Please contact support.'
    }
    if (errorCode.includes('Weak password') || errorCode.includes('password_too_short')) {
      return 'Password must be at least 6 characters long.'
    }
    if (errorCode.includes('User already registered') || errorCode.includes('email_address_already_used')) {
      return 'An account with this email already exists. Please sign in instead.'
    }
    
    // Network errors
    if (errorCode.includes('network') || errorCode.includes('fetch')) {
      return 'Network error. Please check your internet connection and try again.'
    }
    
    // Default fallback
    return error.message || 'An unexpected error occurred. Please try again.'
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    if (!resetEmail || !resetEmail.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setResetLoading(true)
    setError('')
    setSuccess('')

    try {
      const result = await resetPassword(resetEmail)
      if (result.error) {
        setError(result.error.message || 'Failed to send reset email')
      } else {
        setSuccess('Password reset email sent! Please check your inbox and follow the instructions.')
        setResetEmail('')
        // Auto-hide forgot password form after successful send
        setTimeout(() => {
          setShowForgotPassword(false)
          setSuccess('')
        }, 3000)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setResetLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal open={isOpen} onClose={onClose} title="">
      <div className="w-full max-w-md mx-auto">
        {/* Tab Headers */}
        <div className="flex mb-6 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => switchTab('login')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'login'
                ? 'bg-cyan-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
            disabled={isAuthenticated || appLoading}
            title={isAuthenticated ? 'Already signed in' : undefined}
          >
            {isAuthenticated ? 'Signed In' : 'Sign In'}
          </button>
          <button
            onClick={() => switchTab('signup')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'signup'
                ? 'bg-cyan-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}
        
        {/* Success Message */}
        {success && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-500 rounded-lg text-green-300 text-sm">
            {success}
          </div>
        )}

        {/* Social Auth Buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleSocialAuth('google')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <button
            onClick={() => handleSocialAuth('facebook')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[#1877F2] text-white rounded-lg font-medium hover:bg-[#166FE5] transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Continue with Facebook
          </button>
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-900 text-gray-400">Or</span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {activeTab === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                required={activeTab === 'signup'}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                placeholder="Enter your full name"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              minLength={6}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
              placeholder="Enter your password"
            />
          </div>

          {activeTab === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                I am a
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="client"
                    checked={formData.role === 'client'}
                    onChange={handleInputChange}
                    className="mr-2 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-gray-300">Client</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="trainer"
                    checked={formData.role === 'trainer'}
                    onChange={handleInputChange}
                    className="mr-2 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-gray-300">Trainer</span>
                </label>
              </div>
            </div>
          )}

          {/* Role Selection for Sign In */}
          {activeTab === 'login' && showRoleSelection && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                I am signing in as a
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="signinRole"
                    value="client"
                    checked={signinRole === 'client'}
                    onChange={(e) => setSigninRole(e.target.value)}
                    className="mr-2 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-gray-300">Client</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="signinRole"
                    value="trainer"
                    checked={signinRole === 'trainer'}
                    onChange={(e) => setSigninRole(e.target.value)}
                    className="mr-2 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-gray-300">Trainer</span>
                </label>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || appLoading || (activeTab === 'login' && isAuthenticated)}
            className="w-full py-3 px-4 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading || appLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                {activeTab === 'login' ? (isAuthenticated ? 'Redirecting...' : 'Signing In...') : 'Creating Account...'}
              </div>
            ) : (
              activeTab === 'login' ? (isAuthenticated ? 'Signed In' : 'Sign In') : 'Create Account'
            )}
          </button>
        </form>

        {/* Forgot Password Link for Sign In */}
        {activeTab === 'login' && !showForgotPassword && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-cyan-500 hover:text-cyan-400 underline"
            >
              Forgot your password?
            </button>
          </div>
        )}

        {/* Forgot Password Form */}
        {activeTab === 'login' && showForgotPassword && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-600">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-white mb-2">Reset Password</h3>
              <p className="text-sm text-gray-400">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>
            
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  placeholder="Enter your email address"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 py-2 px-4 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Sending...
                    </div>
                  ) : (
                    'Send Reset Email'
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false)
                    setResetEmail('')
                    setError('')
                    setSuccess('')
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Role Selection Toggle for Sign In */}
        {activeTab === 'login' && !showRoleSelection && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowRoleSelection(true)}
              className="text-sm text-cyan-500 hover:text-cyan-400 underline"
            >
              Need to specify your role? Click here
            </button>
          </div>
        )}
        
        {activeTab === 'login' && showRoleSelection && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setShowRoleSelection(false)
                setSigninRole('client')
              }}
              className="text-sm text-gray-400 hover:text-gray-300 underline"
            >
              Hide role selection
            </button>
          </div>
        )}

        {/* Switch Tab Link */}
        <p className="mt-4 text-center text-sm text-gray-400">
          {activeTab === 'login' ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => switchTab(activeTab === 'login' ? 'signup' : 'login')}
            className="text-cyan-500 hover:text-cyan-400 font-medium"
          >
            {activeTab === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </Modal>
  )
}

export default AuthModal