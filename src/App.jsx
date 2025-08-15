import React from 'react';
import Topbar from './components/Topbar';
import Footer from './components/Footer';
import Landing from './pages/Landing';
import { Routes, Route, Navigate } from 'react-router-dom';
import Discover from './pages/client/Discover';
import Book from './pages/client/Book';
import Messages from './pages/common/Messages';
import Progress from './pages/client/Progress';
import Payments from './pages/client/Payments';
import Settings from './pages/common/Settings';
import BookingInbox from './pages/trainer/BookingInbox';
import AvailabilityManager from './pages/trainer/AvailabilityManager';
import Payouts from './pages/trainer/Payouts';
import ProfileEditor from './pages/trainer/ProfileEditor';
import { AppProvider, useApp } from './context/appContext';

function AppShell() {
  const { user, role } = useApp()
  const isClient = role === 'client' // why: route sets change by role

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppProvider>
  )
}