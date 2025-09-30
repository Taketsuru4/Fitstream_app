import React, { createContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { sendWelcomeEmail } from '../services/emailService'

export const AppCtx = createContext(null) // eslint-disable-line react-refresh/only-export-components

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  // Initialize auth listener and restore session
  useEffect(() => {
    let mounted = true

    // Fallback timeout to prevent infinite loading (10 seconds max)
    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('Loading timeout reached, forcing loading to false')
        setLoading(false)
      }
    }, 10000)

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (mounted) {
          setSession(session)
          if (session?.user) {
            await loadUserProfile(session.user)
          } else {
            // Try to restore from localStorage as fallback
            try {
              const cached = localStorage.getItem('fitstream:user')
              if (cached) {
                const u = JSON.parse(cached)
                console.log('Restored user from localStorage:', u)
                setUser(u)
                setRole(u.role)
              } else {
                console.log('No cached user found')
              }
            } catch (e) {
              console.error('Failed to parse cached user', e)
            }
          }
          console.log('Setting loading to false in initializeAuth')
          setLoading(false)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (mounted) setLoading(false)
      } finally {
        // Clear the loading timeout since we're done
        clearTimeout(loadingTimeout)
      }
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change event:', event, 'session:', !!session)
        
        if (mounted) {
          setSession(session)
          
          if (session?.user) {
            console.log('Loading user profile for:', session.user.email)
            await loadUserProfile(session.user)
          } else {
            console.log('No session, clearing user data')
            setUser(null)
            setRole(null)
            localStorage.removeItem('fitstream:user')
          }
          console.log('Setting loading to false in auth state change')
          setLoading(false)
        }
      }
    )

    initializeAuth()

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(loadingTimeout)
    }
  }, [])

  // Load user profile and role from database
  const loadUserProfile = async (authUser) => {
    console.log('loadUserProfile called for user:', authUser.id)
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (error) {
        console.error('Error loading profile:', error)
        
        // If profiles table doesn't exist, create basic user data
        if (error.code === '42P01') {
          console.warn('Profiles table not found, using basic user data')
          const userData = {
            id: authUser.id,
            email: authUser.email,
            full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
            avatar_url: authUser.user_metadata?.avatar_url,
            role: 'client' // default role
          }
          setUser(userData)
          setRole(userData.role)
          localStorage.setItem('fitstream:user', JSON.stringify(userData))
          return
        }
        
        // If profile doesn't exist (PGRST116), create basic user data and attempt to create profile
        if (error.code === 'PGRST116') {
          console.log('No profile found for authenticated user, creating basic profile...')
          const userData = {
            id: authUser.id,
            email: authUser.email,
            full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
            avatar_url: authUser.user_metadata?.avatar_url,
            role: 'client' // default role
          }
          
          // Try to create the missing profile
          try {
            const { error: createError } = await supabase
              .from('profiles')
              .insert({
                id: authUser.id,
                email: authUser.email,
                full_name: userData.full_name,
                role: userData.role,
                avatar_url: userData.avatar_url,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
            
            if (createError && createError.code !== '23505') {
              console.error('Failed to create profile for authenticated user:', createError)
            } else {
              console.log('Profile created successfully for authenticated user')
            }
          } catch (createErr) {
            console.error('Error creating profile for authenticated user:', createErr)
          }
          
          setUser(userData)
          setRole(userData.role)
          localStorage.setItem('fitstream:user', JSON.stringify(userData))
          return
        }
        
        // For other errors, create basic user data and continue
        console.error('Profile error, creating basic user data:', error.message)
        const fallbackUserData = {
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
          avatar_url: authUser.user_metadata?.avatar_url,
          role: 'client' // default role
        }
        setUser(fallbackUserData)
        setRole(fallbackUserData.role)
        localStorage.setItem('fitstream:user', JSON.stringify(fallbackUserData))
        return
      }

      // Success case - profile found
      const userData = {
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
        avatar_url: profile?.avatar_url || authUser.user_metadata?.avatar_url,
        role: profile?.role || 'client', // default to client
        ...profile
      }

      console.log('Successfully loaded user profile:', userData)
      setUser(userData)
      setRole(userData.role)
      
      // Cache user data
      try {
        localStorage.setItem('fitstream:user', JSON.stringify(userData))
      } catch (e) {
        console.error('Failed to save user to localStorage', e)
      }
    } catch (error) {
      console.error('Unexpected error in loadUserProfile:', error)
      // Create fallback user data even on unexpected errors
      const fallbackUserData = {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
        avatar_url: authUser.user_metadata?.avatar_url,
        role: 'client'
      }
      setUser(fallbackUserData)
      setRole(fallbackUserData.role)
      localStorage.setItem('fitstream:user', JSON.stringify(fallbackUserData))
    }
  }

  // Email/Password Sign Up
  const signUp = async (email, password, userData = {}) => {
    console.log('SignUp called with:', { email, userData })
    
    try {
      // Sign up without user_metadata to avoid database trigger issues
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      })

      if (error) {
        console.error('Supabase auth signUp error:', error)
        return { data: null, error }
      }

      console.log('Auth signup successful:', data)

      // Handle profile creation/update after successful signup
      if (data.user) {
        try {
          // Wait for Supabase triggers to create the basic profile
          await new Promise(resolve => setTimeout(resolve, 500))
          
          const role = userData.role || 'client'
          const fullName = userData.full_name || email.split('@')[0]
          
          // Check if profile already exists (created by Supabase trigger)
          const { data: existingProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single()
          
          if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching profile:', fetchError)
          }
          
          // Prepare profile data for create or update
          const profileData = {
            full_name: fullName,
            role: role,
            avatar_url: userData.avatar_url || null,
            updated_at: new Date().toISOString()
          }
          
          // Add trainer-specific defaults
          if (role === 'trainer') {
            profileData.bio = userData.bio || ''  
            profileData.specialties = userData.specialties || []
            profileData.hourly_rate = userData.hourly_rate || null
            profileData.currency = userData.currency || 'EUR'
            profileData.years_experience = userData.years_experience || null
            profileData.certifications = userData.certifications || []
            profileData.languages = userData.languages || []
            profileData.training_locations = userData.training_locations || []
            profileData.profile_completion = 20 
            profileData.rating = 5.0
            profileData.total_reviews = 0
            profileData.total_sessions = 0
            profileData.is_verified = false
          }
          
          let profileResult
          if (existingProfile) {
            // Update existing profile
            console.log('Updating existing profile with data:', profileData)
            const { error: updateError, data: updateResult } = await supabase
              .from('profiles')
              .update(profileData)
              .eq('id', data.user.id)
              .select()
              .single()
              
            if (updateError) {
              console.error('Error updating profile:', updateError)
            } else {
              console.log('Profile updated successfully:', updateResult)
              profileResult = updateResult
            }
          } else {
            // Create new profile (fallback if no trigger exists)
            console.log('Creating new profile with data:', {
              id: data.user.id,
              email: data.user.email,
              created_at: new Date().toISOString(),
              ...profileData
            })
            
            const { error: createError, data: createResult } = await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                email: data.user.email,
                created_at: new Date().toISOString(),
                ...profileData
              })
              .select()
              .single()

            
            if (createError) {
              console.error('Error creating profile:', createError)
              // Don't fail the signup if profile creation fails
              console.log('Signup completed but profile creation failed - user can complete profile later')
            } else {
              console.log('Profile created successfully:', createResult)
              profileResult = createResult
              
              // Send welcome email after successful profile creation
              try {
                await sendWelcomeEmail(data.user.email, fullName, role)
                console.log('Welcome email sent successfully')
              } catch (emailError) {
                console.error('Failed to send welcome email:', emailError)
                // Don't fail signup if email fails
              }
            }
          }
          
        } catch (profileError) {
          console.error('Error in profile creation:', profileError)
          return { data: null, error: profileError }
        }
      }

      return { data, error }
    } catch (error) {
      console.error('Sign up error:', error)
      return { data: null, error }
    }
  }

  // Email/Password Sign In
  const signIn = async (email, password, options = {}) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      // If signin was successful and a role was specified, update the profile role
      if (!error && data.user && options.role) {
        console.log('Sign in successful, updating role to:', options.role)
        try {
          const { error: roleUpdateError } = await supabase
            .from('profiles')
            .update({ 
              role: options.role,
              updated_at: new Date().toISOString()
            })
            .eq('id', data.user.id)
          
          if (roleUpdateError) {
            console.error('Error updating role after signin:', roleUpdateError)
            // Don't fail the signin if role update fails, just log it
          } else {
            console.log('Role updated successfully after signin')
          }
        } catch (roleError) {
          console.error('Error updating role after signin:', roleError)
        }
      }
      
      return { data, error }
    } catch (error) {
      console.error('Sign in error:', error)
      return { data: null, error }
    }
  }

  // Social Auth (Google, Facebook)
  const signInWithProvider = async (provider) => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      return { data, error }
    } catch (error) {
      console.error(`${provider} sign in error:`, error)
      return { data: null, error }
    }
  }

  // Reset Password
  const resetPassword = async (email) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      
      return { data, error }
    } catch (error) {
      console.error('Reset password error:', error)
      return { data: null, error }
    }
  }

  // Update user role
  const updateUserRole = async (newRole) => {
    if (!user) return { error: 'No user logged in' }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', user.id)

      if (error) throw error

      const updatedUser = { ...user, role: newRole }
      setUser(updatedUser)
      setRole(newRole)
      
      localStorage.setItem('fitstream:user', JSON.stringify(updatedUser))
      
      return { error: null }
    } catch (error) {
      console.error('Error updating role:', error)
      return { error }
    }
  }

  // Legacy login method for backward compatibility
  const login = (payload) => {
    console.log('DEV Login called with:', payload)
    setUser(payload)
    setRole(payload.role)
    setSession(null) // Clear session for dev login
    setLoading(false) // Immediately set loading to false for dev login
    
    try { 
      localStorage.setItem('fitstream:user', JSON.stringify(payload)) 
    } catch (e) { 
      console.error('Failed to save user to localStorage', e) 
    }
    
    console.log('DEV Login completed, loading set to false')
  }

  const logout = async () => {
    try { 
      await supabase.auth.signOut() 
    } catch (e) { 
      console.error('Logout error:', e) 
    }
    setUser(null)
    setRole(null)
    setSession(null)
    try { 
      localStorage.removeItem('fitstream:user') 
    } catch (e) { 
      console.error('Failed to remove user from localStorage', e) 
    }
  }

  const value = useMemo(() => ({
    user,
    role,
    session,
    loading,
    login, // backward compatibility
    logout,
    signUp,
    signIn,
    signInWithProvider,
    resetPassword,
    updateUserRole,
    isAuthenticated: !!user,
    isTrainer: role === 'trainer',
    isClient: role === 'client'
  }), [user, role, session, loading])

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

