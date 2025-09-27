import React, { createContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

export const AppCtx = createContext(null) // eslint-disable-line react-refresh/only-export-components

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  // Initialize auth listener and restore session
  useEffect(() => {
    let mounted = true

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
                setUser(u)
                setRole(u.role)
              }
            } catch (e) {
              console.error('Failed to parse cached user', e)
            }
          }
          setLoading(false)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (mounted) setLoading(false)
      }
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)
        
        if (mounted) {
          setSession(session)
          
          if (session?.user) {
            await loadUserProfile(session.user)
          } else {
            setUser(null)
            setRole(null)
            localStorage.removeItem('fitstream:user')
          }
          setLoading(false)
        }
      }
    )

    initializeAuth()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Load user profile and role from database
  const loadUserProfile = async (authUser) => {
    try {
      console.log('Loading profile for user:', authUser.id)
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      console.log('Profile query result:', { profile, error })

      if (error && error.code !== 'PGRST116') {
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
        return
      }

      const userData = {
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
        avatar_url: profile?.avatar_url || authUser.user_metadata?.avatar_url,
        role: profile?.role || 'client', // default to client
        ...profile
      }

      setUser(userData)
      setRole(userData.role)
      
      // Cache user data
      try {
        localStorage.setItem('fitstream:user', JSON.stringify(userData))
      } catch (e) {
        console.error('Failed to save user to localStorage', e)
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error)
    }
  }

  // Email/Password Sign Up
  const signUp = async (email, password, userData = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.full_name,
            role: userData.role || 'client'
          }
        }
      })

      if (error) throw error

      // Create profile record (if table exists)
      if (data.user && !error) {
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email,
              full_name: userData.full_name || email.split('@')[0],
              role: userData.role || 'client',
              avatar_url: userData.avatar_url
            })

          if (profileError && profileError.code !== '23505' && profileError.code !== '42P01') {
            console.error('Error creating profile:', profileError)
          }
        } catch (profileError) {
          console.warn('Could not create profile record:', profileError)
        }
      }

      return { data, error }
    } catch (error) {
      console.error('Sign up error:', error)
      return { data: null, error }
    }
  }

  // Email/Password Sign In
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
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
          redirectTo: `${window.location.origin}/app`
        }
      })
      
      return { data, error }
    } catch (error) {
      console.error(`${provider} sign in error:`, error)
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
    setUser(payload)
    setRole(payload.role)
    try { 
      localStorage.setItem('fitstream:user', JSON.stringify(payload)) 
    } catch (e) { 
      console.error('Failed to save user to localStorage', e) 
    }
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
    updateUserRole,
    isAuthenticated: !!user,
    isTrainer: role === 'trainer',
    isClient: role === 'client'
  }), [user, role, session, loading])

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

