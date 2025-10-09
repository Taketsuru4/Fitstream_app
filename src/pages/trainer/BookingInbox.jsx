import React, { useState, useEffect, useMemo } from 'react'
import { useApp } from '../../hooks/useApp'
import { useBooking } from '../../hooks/useBooking'
import { Button, Card, Badge } from '../../components/ui'
import SessionNotesModal from '../../components/SessionNotesModal'

export default function BookingInbox() {
  const { user, role } = useApp()
  const { 
    bookings, 
    pendingBookings, 
    loading, 
    confirmBooking, 
    cancelBooking, 
    completeBooking 
  } = useBooking()
  
  // Filter and view state
  const [statusFilter, setStatusFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [notesModalOpen, setNotesModalOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Filter and group bookings
  const filteredBookings = useMemo(() => {
    let filtered = [...bookings]
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === statusFilter)
    }
    
    // Time filter
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    if (timeFilter === 'today') {
      filtered = filtered.filter(b => b.booking_date === todayStr)
    } else if (timeFilter === 'upcoming') {
      filtered = filtered.filter(b => {
        const bookingDateTime = new Date(`${b.booking_date}T${b.start_time}`)
        return bookingDateTime > today
      })
    } else if (timeFilter === 'past') {
      filtered = filtered.filter(b => {
        const bookingDateTime = new Date(`${b.booking_date}T${b.start_time}`)
        return bookingDateTime < today
      })
    }
    
    return filtered.sort((a, b) => {
      // Sort by date and time
      const aDateTime = new Date(`${a.booking_date}T${a.start_time}`)
      const bDateTime = new Date(`${b.booking_date}T${b.start_time}`)
      return aDateTime - bDateTime
    })
  }, [bookings, statusFilter, timeFilter])
  
  // Group bookings by time period
  const groupedBookings = useMemo(() => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    
    const groups = {
      today: [],
      tomorrow: [],
      upcoming: [],
      past: []
    }
    
    filteredBookings.forEach(booking => {
      const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`)
      
      if (booking.booking_date === todayStr) {
        groups.today.push(booking)
      } else if (booking.booking_date === tomorrowStr) {
        groups.tomorrow.push(booking)
      } else if (bookingDateTime > today) {
        groups.upcoming.push(booking)
      } else {
        groups.past.push(booking)
      }
    })
    
    return groups
  }, [filteredBookings])
  
  // Calculate stats
  const stats = {
    totalBookings: bookings.length,
    pendingBookings: pendingBookings.length,
    confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
    completedBookings: bookings.filter(b => b.status === 'completed').length,
    todaysSessions: groupedBookings.today.length,
    totalEarnings: bookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0)
  }

  const handleConfirmBooking = async (bookingId) => {
    const result = await confirmBooking(bookingId)
    if (result.success) {
      // Could show a success toast here
      console.log('Booking confirmed successfully')
    } else {
      alert('Failed to confirm booking: ' + result.error)
    }
  }

  const handleCancelBooking = async (bookingId) => {
    const reason = prompt('Please provide a reason for cancellation:')
    if (!reason) return
    
    const result = await cancelBooking(bookingId, reason)
    if (result.success) {
      console.log('Booking cancelled successfully')
    } else {
      alert('Failed to cancel booking: ' + result.error)
    }
  }

  const handleCompleteBooking = async (bookingId) => {
    const booking = bookings.find(b => b.id === bookingId)
    if (!booking) return
    
    setSelectedBooking(booking)
    setNotesModalOpen(true)
  }
  
  const handleSaveNotes = async (bookingId, notesData) => {
    const result = await completeBooking(bookingId, notesData)
    if (result.success) {
      console.log('Session completed with notes')
      setNotesModalOpen(false)
      setSelectedBooking(null)
    } else {
      throw new Error(result.error || 'Failed to save notes')
    }
  }
  
  const quickConfirm = async (bookingId) => {
    const result = await confirmBooking(bookingId)
    if (!result.success) {
      alert('Failed to confirm booking: ' + result.error)
    }
  }
  
  const quickCancel = async (bookingId, reason = 'Cancelled by trainer') => {
    const result = await cancelBooking(bookingId, reason)
    if (!result.success) {
      alert('Failed to cancel booking: ' + result.error)
    }
  }
  
  const manualRefresh = async () => {
    setRefreshing(true)
    try {
      // Trigger a refresh in the useBooking hook
      window.location.reload()
    } catch (error) {
      console.error('Refresh failed:', error)
    } finally {
      setRefreshing(false)
    }
  }
  
  // Auto-refresh every 30 seconds when page is visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden && !loading && !refreshing) {
        window.location.reload()
      }
    }, 30000) // 30 seconds
    
    return () => clearInterval(interval)
  }, [loading, refreshing])

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    })
  }

  const formatTime = (time) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const currency = (amount) => `€${Number(amount || 0).toFixed(2)}`

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading bookings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="h1">Booking Inbox</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Manage your client bookings and sessions
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              {stats.totalBookings}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Total Bookings</div>
          </div>
        </Card>
        
        <Card>
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b', marginBottom: '0.5rem' }}>
              {stats.pendingBookings}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Pending</div>
          </div>
        </Card>
        
        <Card>
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981', marginBottom: '0.5rem' }}>
              {stats.confirmedBookings}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Confirmed</div>
          </div>
        </Card>
        
        <Card>
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#8b5cf6', marginBottom: '0.5rem' }}>
              {stats.todaysSessions}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Today's Sessions</div>
          </div>
        </Card>
        
        <Card>
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>
              {currency(stats.totalEarnings)}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Total Earnings</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
            Bookings
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {filteredBookings.length} {filteredBookings.length === 1 ? 'booking' : 'bookings'}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={manualRefresh}
              disabled={refreshing || loading}
              title="Refresh bookings"
            >
              {refreshing ? '⏳' : '🔄'}
            </Button>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                borderRadius: '6px',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                padding: '0.25rem 0.5rem',
                fontSize: '14px'
              }}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          {/* Time Filter */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Time:</span>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              style={{
                borderRadius: '6px',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                padding: '0.25rem 0.5rem',
                fontSize: '14px'
              }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
          </div>
          
          {/* Quick Actions */}
          {pendingBookings.length > 0 && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setStatusFilter('pending')}
              >
                {pendingBookings.length} Pending
              </Button>
            </div>
          )}
        </div>
      </Card>
      
      {/* Grouped Bookings List */}
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {filteredBookings.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                {statusFilter !== 'all' || timeFilter !== 'all' ? '🔍' : '📅'}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                {statusFilter !== 'all' || timeFilter !== 'all' ? 'No bookings match filters' : 'No bookings yet'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                {statusFilter !== 'all' || timeFilter !== 'all' 
                  ? 'Try adjusting your filters to see more bookings'
                  : 'When clients book sessions, they will appear here'
                }
              </p>
              {(statusFilter !== 'all' || timeFilter !== 'all') ? (
                <Button variant="secondary" onClick={() => { setStatusFilter('all'); setTimeFilter('all') }}>
                  Clear Filters
                </Button>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <Button onClick={() => window.location.href = '/app/profile'}>
                    Complete Profile
                  </Button>
                  <Button variant="secondary" onClick={() => window.location.href = '/app/availability'}>
                    Set Availability
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ) : (
          // Render grouped bookings
          <>
            {groupedBookings.today.length > 0 && (
              <BookingGroup
                title="Today"
                bookings={groupedBookings.today}
                onConfirm={quickConfirm}
                onCancel={quickCancel}
                onComplete={handleCompleteBooking}
                formatDate={formatDate}
                formatTime={formatTime}
                currency={currency}
              />
            )}
            
            {groupedBookings.tomorrow.length > 0 && (
              <BookingGroup
                title="Tomorrow"
                bookings={groupedBookings.tomorrow}
                onConfirm={quickConfirm}
                onCancel={quickCancel}
                onComplete={handleCompleteBooking}
                formatDate={formatDate}
                formatTime={formatTime}
                currency={currency}
              />
            )}
            
            {groupedBookings.upcoming.length > 0 && (
              <BookingGroup
                title="Upcoming"
                bookings={groupedBookings.upcoming}
                onConfirm={quickConfirm}
                onCancel={quickCancel}
                onComplete={handleCompleteBooking}
                formatDate={formatDate}
                formatTime={formatTime}
                currency={currency}
              />
            )}
            
            {groupedBookings.past.length > 0 && (
              <BookingGroup
                title="Past Sessions"
                bookings={groupedBookings.past}
                onConfirm={quickConfirm}
                onCancel={quickCancel}
                onComplete={handleCompleteBooking}
                formatDate={formatDate}
                formatTime={formatTime}
                currency={currency}
              />
            )}
          </>
        )}
      </div>
      
      {/* Session Notes Modal */}
      <SessionNotesModal
        booking={selectedBooking}
        isOpen={notesModalOpen}
        onClose={() => {
          setNotesModalOpen(false)
          setSelectedBooking(null)
        }}
        onSave={handleSaveNotes}
      />
    </div>
  )
}

// BookingGroup component for better organization
const BookingGroup = ({ title, bookings, onConfirm, onCancel, onComplete, formatDate, formatTime, currency }) => {
  const [expanded, setExpanded] = useState(title === 'Today' || title === 'Tomorrow')
  
  return (
    <Card>
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          cursor: 'pointer',
          marginBottom: expanded ? '1rem' : 0
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
          {title} ({bookings.length})
        </h3>
        <span style={{ color: 'var(--text-secondary)' }}>
          {expanded ? '−' : '+'}
        </span>
      </div>
      
      {expanded && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {bookings.map(booking => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onConfirm={onConfirm}
              onCancel={onCancel}
              onComplete={onComplete}
              formatDate={formatDate}
              formatTime={formatTime}
              currency={currency}
            />
          ))}
        </div>
      )}
    </Card>
  )
}

// BookingCard component for individual bookings
const BookingCard = ({ booking, onConfirm, onCancel, onComplete, formatDate, formatTime, currency }) => {
  const isToday = booking.booking_date === new Date().toISOString().split('T')[0]
  const isPast = new Date(`${booking.booking_date}T${booking.start_time}`) < new Date()
  
  return (
    <div style={{ 
      border: isToday ? '2px solid var(--accent-primary)' : '1px solid var(--border-primary)', 
      borderRadius: '8px', 
      padding: '1.5rem',
      background: isToday ? 'rgba(6,182,212,0.05)' : 'var(--bg-secondary)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          {/* Client Avatar */}
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '50%', 
            background: 'var(--bg-tertiary)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            {booking.client?.avatar_url ? (
              <img 
                src={booking.client.avatar_url} 
                alt={booking.client.full_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: '1.5rem' }}>👤</span>
            )}
          </div>
          
          {/* Booking Details */}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {booking.client?.full_name || 'Unknown Client'}
              {isToday && (
                <span style={{
                  marginLeft: '8px',
                  fontSize: '12px',
                  padding: '2px 8px',
                  background: 'var(--accent-primary)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontWeight: '700'
                }}>
                  TODAY
                </span>
              )}
            </div>
            
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              {formatDate(booking.booking_date)} at {formatTime(booking.start_time)}
            </div>
            
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              {booking.session_type === 'virtual' ? '💻 Virtual' : '🏢 In-person'} • {currency(booking.total_price)}
            </div>
            
            {booking.client_notes && (
              <div style={{ 
                fontSize: '14px', 
                color: 'var(--text-muted)', 
                fontStyle: 'italic',
                marginTop: '0.5rem',
                padding: '0.5rem',
                background: 'var(--bg-tertiary)',
                borderRadius: '4px'
              }}>
                Note: {booking.client_notes}
              </div>
            )}
          </div>
        </div>

        {/* Status & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: '0.5rem' }}>
          <Badge 
            variant={
              booking.status === 'pending' ? 'warning' :
              booking.status === 'confirmed' ? 'success' :
              booking.status === 'cancelled' ? 'error' :
              booking.status === 'completed' ? 'success' :
              'default'
            }
          >
            {booking.status}
          </Badge>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {booking.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  onClick={() => onConfirm(booking.id)}
                >
                  Confirm
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const reason = prompt('Reason for declining:')
                    if (reason) onCancel(booking.id, reason)
                  }}
                >
                  Decline
                </Button>
              </>
            )}
            
            {booking.status === 'confirmed' && (
              <>
                <Button
                  size="sm"
                  onClick={() => onComplete(booking.id)}
                  disabled={!isPast}
                  title={!isPast ? 'Can only complete past sessions' : 'Add session notes'}
                >
                  {isPast ? 'Complete' : 'Complete'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const reason = prompt('Reason for cancelling:')
                    if (reason) onCancel(booking.id, reason)
                  }}
                >
                  Cancel
                </Button>
              </>
            )}
            
            {booking.status === 'completed' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onComplete(booking.id)}
              >
                View Notes
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
