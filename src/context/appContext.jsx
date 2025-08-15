import React, { createContext, useContext, useEffect, useState } from 'react'
import { TRAINERS } from '../data/trainers'

const uid = () => Math.random().toString(36).slice(2, 10)

const AppCtx = createContext(null)
export const useApp = () => useContext(AppCtx)

export function AppProvider({ children }) {
  const [role, setRole] = useState('client')
  const [user, setUser] = useState(null)
  const [bookings, setBookings] = useState([])
  const [messages, setMessages] = useState([])
  const [wallet, setWallet] = useState({ balance: 0 })

  useEffect(() => {
    const cached = sessionStorage.getItem('fitstream:user')
    if (cached) {
      const u = JSON.parse(cached)
      setUser(u)
      setRole(u.role)
    } else {
      const demo = { id: uid(), email: 'you@example.com', role: 'client', name: 'Athlete' }
      setUser(demo)
      sessionStorage.setItem('fitstream:user', JSON.stringify(demo))
    }
  }, [])

  const login = (payload) => {
    setUser(payload)
    setRole(payload.role)
    sessionStorage.setItem('fitstream:user', JSON.stringify(payload))
  }
  const logout = () => {
    setUser(null)
    sessionStorage.removeItem('fitstream:user')
  }

  const addBooking = (b) => {
    setBookings((prev) => [...prev, b])
    setMessages((prev) => [
      ...prev,
      { id: uid(), with: b.trainer.name, threadId: b.id, last: `Booking confirmed for ${b.date} ${b.time}`, role: 'system' },
    ])
  }

  const pay = (amount) => {
    setWallet((w) => ({ ...w, balance: Math.max(0, w.balance - Number(amount || 0)) }))
    return { id: uid(), status: 'succeeded' }
  }

  return (
    <AppCtx.Provider value={{ role, setRole, user, setUser, login, logout, bookings, addBooking, messages, setMessages, wallet, pay, TRAINERS }}>
      {children}
    </AppCtx.Provider>
  )
}