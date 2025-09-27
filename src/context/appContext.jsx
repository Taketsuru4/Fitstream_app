import React, { createContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

export const AppCtx = createContext(null) // eslint-disable-line react-refresh/only-export-components

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)

  // Restore session from localStorage
  useEffect(() => {
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
  }, [])

  const login = (payload) => {
    setUser(payload)
    setRole(payload.role)
    try { localStorage.setItem('fitstream:user', JSON.stringify(payload)) } catch (e) { console.error('Failed to save user to localStorage', e) }
  }

  const logout = async () => {
    try { await supabase.auth.signOut() } catch (e) { console.error(e) }
    setUser(null)
    setRole(null)
    try { localStorage.removeItem('fitstream:user') } catch (e) { console.error('Failed to remove user from localStorage', e) }
  }

  const value = useMemo(() => ({
    user,
    role,
    login,
    logout
  }), [user, role])

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

