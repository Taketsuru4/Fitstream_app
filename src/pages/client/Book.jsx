import React, { useState, useEffect, useMemo } from 'react'
import { useApp } from '../../hooks/useApp'
import { useBooking } from '../../hooks/useBooking'
import { Button, Card, Input, Badge } from '../../components/ui'
import { supabase } from '../../supabaseClient'

const currency = (n) => `€${Number(n || 0).toFixed(2)}`

export default function Book() {
  const { user } = useApp()
  const { upcomingBookings, createBooking, getAvailableSlots } = useBooking()
  
  // State
  const [trainers, setTrainers] = useState([])
  const [selectedTrainerId, setSelectedTrainerId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [sessionType, setSessionType] = useState('virtual')
  const [clientNotes, setClientNotes] = useState('')
  const [availableSlots, setAvailableSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)

  const selectedTrainer = useMemo(() => 
    trainers.find(t => t.id === selectedTrainerId), [trainers, selectedTrainerId]
  )

  // Load trainers on mount and check for URL params
  useEffect(() => {
    loadTrainers()
    
    // Check URL params for preselected trainer
    const urlParams = new URLSearchParams(window.location.search)
    const preselectedTrainerId = urlParams.get('trainerId')
    if (preselectedTrainerId) {
      setSelectedTrainerId(preselectedTrainerId)
    }
  }, [])

  // Load available slots when trainer or date changes
  useEffect(() => {
    if (selectedTrainerId && selectedDate) {
      loadAvailableSlots()
    } else {
      setAvailableSlots([])
    }
  }, [selectedTrainerId, selectedDate])

  // Set default date to tomorrow
  useEffect(() => {
    if (!selectedDate) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setSelectedDate(tomorrow.toISOString().split('T')[0])
    }
  }, [])

  const loadTrainers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'trainer')
        .order('full_name')

      if (error) throw error
      
      setTrainers(data || [])
      
      // Only auto-select first trainer if no trainer is already selected (from URL or previous state)
      if (data?.length > 0 && !selectedTrainerId) {
        // Check URL params again in case they loaded after component mount
        const urlParams = new URLSearchParams(window.location.search)
        const preselectedTrainerId = urlParams.get('trainerId')
        
        if (preselectedTrainerId && data.find(t => t.id === preselectedTrainerId)) {
          setSelectedTrainerId(preselectedTrainerId)
        } else {
          setSelectedTrainerId(data[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading trainers:', error)
    }
  }

  const loadAvailableSlots = async () => {
    setLoadingSlots(true)
    try {
      const slots = await getAvailableSlots(selectedTrainerId, selectedDate)
      setAvailableSlots(slots || [])
      setSelectedSlot('') // Reset selected slot when slots change
    } catch (error) {
      console.error('Error loading available slots:', error)
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleBookingSubmit = async () => {
    if (!selectedTrainer || !selectedSlot || !selectedDate) {
      alert('Please select a trainer, date, and time slot')
      return
    }

    setLoading(true)
    
    try {
      // Calculate end time (assuming 1-hour sessions)
      const startTime = selectedSlot
      const endTime = addHoursToTime(startTime, 1)
      
      const result = await createBooking({
        trainerId: selectedTrainerId,
        bookingDate: selectedDate,
        startTime: startTime,
        endTime: endTime,
        sessionType: sessionType,
        hourlyRate: selectedTrainer.hourly_rate || 50,
        totalPrice: selectedTrainer.hourly_rate || 50,
        clientNotes: clientNotes.trim() || null,
        durationMinutes: 60
      })
      
      if (result.success) {
        alert('Booking request sent! The trainer will confirm your session shortly.')
        // Reset form
        setSelectedSlot('')
        setClientNotes('')
        // Refresh available slots
        await loadAvailableSlots()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Booking error:', error)
      alert('Failed to create booking: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to add hours to time string
  const addHoursToTime = (timeStr, hours) => {
    const [h, m] = timeStr.split(':').map(Number)
    const totalMinutes = h * 60 + m + (hours * 60)
    const newHours = Math.floor(totalMinutes / 60) % 24
    const newMinutes = totalMinutes % 60
    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`
  }

  if (loading && trainers.length === 0) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading trainers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '1200px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="h1">Book a Session</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Choose a trainer and schedule your next fitness session.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}>
        {/* Booking Form */}
        <Card title="Schedule Your Session">
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {/* Trainer Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Select Trainer
              </label>
              <select
                value={selectedTrainerId}
                onChange={(e) => {
                  setSelectedTrainerId(e.target.value)
                  setSelectedSlot('') // Reset slot when trainer changes
                }}
                style={{
                  width: '100%',
                  height: '48px',
                  borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-primary)',
                  padding: '0 12px',
                  fontSize: '16px'
                }}
              >
                <option value="">Choose a trainer...</option>
                {trainers.map(trainer => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.full_name} — {currency(trainer.hourly_rate || 50)}/hr
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selection */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value)
                    setSelectedSlot('') // Reset slot when date changes
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    height: '48px',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)',
                    padding: '0 12px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Session Type
                </label>
                <select
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value)}
                  style={{
                    width: '100%',
                    height: '48px',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)',
                    padding: '0 12px',
                    fontSize: '16px'
                  }}
                >
                  <option value="virtual">Virtual Session</option>
                  <option value="in_person">In-Person Session</option>
                </select>
              </div>
            </div>

            {/* Available Time Slots */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Available Times
              </label>
              
              {loadingSlots ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <div style={{ width: '24px', height: '24px', border: '2px solid var(--accent-primary)', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 0.5rem' }}></div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading available times...</span>
                </div>
              ) : availableSlots.length === 0 ? (
                <div style={{ 
                  padding: '1rem', 
                  textAlign: 'center', 
                  border: '1px dashed var(--border-primary)', 
                  borderRadius: '8px',
                  color: 'var(--text-secondary)'
                }}>
                  {selectedTrainerId && selectedDate ? 'No available slots for this date' : 'Please select a trainer and date'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {availableSlots.map(slot => (
                    <Button
                      key={slot.startTime}
                      variant={selectedSlot === slot.startTime ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setSelectedSlot(slot.startTime)}
                    >
                      {slot.startTime}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Client Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Notes (Optional)
              </label>
              <textarea
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                placeholder="Any specific goals or requirements for this session?"
                rows={3}
                style={{
                  width: '100%',
                  borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-primary)',
                  padding: '12px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Booking Summary & Submit */}
            {selectedTrainer && selectedSlot && (
              <div style={{ 
                padding: '1rem', 
                background: 'var(--bg-tertiary)', 
                borderRadius: '8px',
                border: '1px solid var(--border-secondary)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {selectedTrainer.full_name}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      {selectedDate} at {selectedSlot} ({sessionType})
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent-primary)' }}>
                      {currency(selectedTrainer.hourly_rate || 50)}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      1 hour session
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={handleBookingSubmit} 
                  disabled={loading || !selectedSlot}
                  style={{ width: '100%', height: '48px', fontSize: '16px' }}
                >
                  {loading ? 'Booking...' : 'Book'}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Upcoming Bookings */}
        <Card title="Upcoming Sessions">
          {upcomingBookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              <p>No upcoming sessions yet.</p>
              <p style={{ fontSize: '14px', marginTop: '0.5rem' }}>Book your first session to get started!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {upcomingBookings.map(booking => (
                <div key={booking.id} style={{ 
                  border: '1px solid var(--border-primary)', 
                  borderRadius: '8px', 
                  padding: '1rem',
                  background: 'var(--bg-secondary)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {booking.trainer?.full_name || 'Unknown Trainer'}
                    </div>
                    <Badge 
                      variant={booking.status === 'confirmed' ? 'success' : booking.status === 'pending' ? 'warning' : 'default'}
                    >
                      {booking.status}
                    </Badge>
                  </div>
                  
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    {booking.booking_date} at {booking.start_time}
                  </div>
                  
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {booking.session_type === 'virtual' ? '💻 Virtual' : '🏢 In-person'} • {currency(booking.total_price)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
