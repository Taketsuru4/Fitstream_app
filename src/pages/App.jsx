import React from 'react'
import Topbar from '../components/Topbar'
import Footer from '../components/Footer'
import Landing from './Landing'
import Discover from './client/Discover'
import TrainerProfile from './client/TrainerProfile'
import Book from './client/Book'
import Messages from './common/Messages'
import Progress from './client/Progress'
import Payments from './client/Payments'
import Settings from './common/Settings'
import BookingInbox from './trainer/BookingInbox'
import AvailabilityManager from './trainer/AvailabilityManager'
import Payouts from './trainer/Payouts'
import ProfileEditor from './trainer/ProfileEditor'
import ResetPassword from '../components/auth/ResetPassword'
import { AppProvider } from '../context/appContext'
import { useApp } from '../hooks/useApp'
import { Routes, Route, Navigate } from 'react-router-dom'


import AuthTest from '../AuthTest' // <-- src/AuthTest.tsx
import AuthLoadingDebug from '../components/AuthLoadingDebug'
import DevAuthBypassEnhanced from '../components/DevAuthBypassEnhanced'

function AppShell() {
  const { user, loading, isAuthenticated, isClient, isTrainer } = useApp()

  // Show loading while authentication is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to landing if not authenticated
  if (!isAuthenticated || !user) return <Navigate to="/" replace />

  // Redirect if user doesn't have a role set
  if (!user.role || user.role === '') return <Navigate to="/" replace />

  return (
    <>
      <Topbar />
      <main className="container">
        <Routes>
          {isClient ? (
            <>
              <Route path="discover" element={<Discover />} />
              <Route path="trainer/:trainerId" element={<TrainerProfile />} />
              <Route path="book" element={<Book />} />
              <Route path="messages" element={<Messages />} />
              <Route path="progress" element={<Progress />} />
              <Route path="payments" element={<Payments />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="discover" replace />} />
            </>
          ) : (
            <>
              <Route path="inbox" element={<BookingInbox />} />
              <Route path="availability" element={<AvailabilityManager />} />
              <Route path="messages" element={<Messages />} />
              <Route path="payouts" element={<Payouts />} />
              <Route path="profile" element={<ProfileEditor />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="inbox" replace />} />
            </>
          )}
        </Routes>
      </main>
      <Footer />
      <DevStateDebug />
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app/*" element={<AppShell />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth-test" element={<AuthTest />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AuthLoadingDebug />
    </AppProvider>
  )
}
