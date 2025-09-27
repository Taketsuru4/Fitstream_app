import React from 'react'
import Topbar from '../components/Topbar'
import Footer from '../components/Footer'
import Landing from './Landing'
import Discover from './client/Discover'
import Book from './client/Book'
import Messages from './common/Messages'
import Progress from './client/Progress'
import Payments from './client/Payments'
import Settings from './common/Settings'
import BookingInbox from './trainer/BookingInbox'
import AvailabilityManager from './trainer/AvailabilityManager'
import Payouts from './trainer/Payouts'
import ProfileEditor from './trainer/ProfileEditor'
import { AppProvider } from '../context/appContext'
import { useApp } from '../hooks/useApp'
import { Routes, Route, Navigate } from 'react-router-dom'


import AuthTest from '../AuthTest' // <-- src/AuthTest.tsx

function AppShell() {
  const { user, role } = useApp()
  const isClient = role === 'client'

  if (!user) return <Navigate to="/" replace />

  return (
    <>
      <Topbar />
      <main className="container">
        <Routes>
          {isClient ? (
            <>
              <Route path="discover" element={<Discover />} />
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
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app/*" element={<AppShell />} />
        <Route path="/auth-test" element={<AuthTest />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppProvider>
  )
}