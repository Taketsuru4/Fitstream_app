import React, { useState, useEffect } from 'react'
import { useApp } from '../../hooks/useApp'
import { useBooking } from '../../hooks/useBooking'
import { Button, Card, Badge } from '../../components/ui'

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

  // Calculate stats
  const stats = {
    totalBookings: bookings.length,
    pendingBookings: pendingBookings.length,
    confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
    completedBookings: bookings.filter(b => b.status === 'completed').length,
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
    const notes = prompt('Any notes about this session? (optional)')
    const result = await completeBooking(bookingId, notes || null)
    if (result.success) {
      console.log('Session marked as completed')
    } else {
      alert('Failed to complete booking: ' + result.error)
    }
  }

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
            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>
              {currency(stats.totalEarnings)}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Total Earnings</div>
          </div>
        </Card>
      </div>

      {/* Bookings List */}
      <Card title="Recent Bookings">
        {bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📅</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              No bookings yet
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              When clients book sessions, they'll appear here
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Button onClick={() => window.location.href = '/app/profile'}>
                Complete Profile
              </Button>
              <Button variant="secondary" onClick={() => window.location.href = '/app/availability'}>
                Set Availability
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {bookings.map(booking => (
              <div key={booking.id} style={{ 
                border: '1px solid var(--border-primary)', 
                borderRadius: '8px', 
                padding: '1.5rem',
                background: 'var(--bg-secondary)'
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
                            onClick={() => handleConfirmBooking(booking.id)}
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelBooking(booking.id)}
                          >
                            Decline
                          </Button>
                        </>
                      )}
                      
                      {booking.status === 'confirmed' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleCompleteBooking(booking.id)}
                          >
                            Mark Complete
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelBooking(booking.id)}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
