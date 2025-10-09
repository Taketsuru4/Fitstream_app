import React, { useState, useEffect, useMemo } from 'react'
import { useBooking } from '../../hooks/useBooking'
import { useApp } from '../../hooks/useApp'
import { BookingService } from '../../services/bookingService'
import { Button, Card } from '../../components/ui'

export default function AvailabilityManager() {
  const { availability, loading, error, setAvailabilitySlot, removeAvailabilitySlot } = useBooking()
  const { user } = useApp()
  
  const [newTime, setNewTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [newDate, setNewDate] = useState('') // YYYY-MM-DD (required)
  const [saving, setSaving] = useState(false)

  // Weekly view state (current week)
  const [weekSlots, setWeekSlots] = useState({}) // { 'YYYY-MM-DD': [ {id,startTime,endTime,isRecurring} ] }
  const [weekLoading, setWeekLoading] = useState(false)
  const [weekError, setWeekError] = useState(null)

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  const handleAddSlot = async () => {
    if (!newDate) {
      alert('Please select a date')
      return
    }
    if (!newTime || !endTime) {
      alert('Please select both start and end times')
      return
    }
    if (newTime >= endTime) {
      alert('End time must be after start time')
      return
    }

    // Compute day num from date
    const computedDayNum = new Date(`${newDate}T00:00:00`).getDay()

    setSaving(true)
    try {
      const result = await setAvailabilitySlot(
        computedDayNum,
        newTime,
        endTime,
        newDate
      )
      
      if (result.success) {
        setNewTime('09:00')
        setEndTime('10:00')
        setNewDate('')
        await refreshWeekSlots()
      } else {
        alert('Failed to add slot: ' + result.error)
      }
    } catch (err) {
      console.error('Error adding slot:', err)
      alert('Failed to add slot')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveSlot = async (slotId) => {
    if (!confirm('Are you sure you want to remove this time slot?')) return

    setSaving(true)
    try {
      const result = await removeAvailabilitySlot(slotId)
      if (!result.success) {
        alert('Failed to remove slot: ' + result.error)
      } else {
        await refreshWeekSlots()
      }
    } catch (err) {
      console.error('Error removing slot:', err)
      alert('Failed to remove slot')
    } finally {
      setSaving(false)
    }
  }

  // Helpers for current week view
  const toISODate = (d) => d.toISOString().split('T')[0]
  const startOfWeek = (date = new Date()) => {
    // Monday as start of week
    const d = new Date(date)
    const day = d.getDay()
    const diff = (day === 0 ? -6 : 1) - day
    d.setDate(d.getDate() + diff)
    d.setHours(0,0,0,0)
    return d
  }
  const addDays = (date, n) => {
    const d = new Date(date)
    d.setDate(d.getDate() + n)
    return d
  }
  const formatLabel = (date) => {
    const intl = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: '2-digit', month: 'short' })
    return intl.format(date)
  }

  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date())
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [])

  const refreshWeekSlots = async () => {
    if (!user?.id) return
    try {
      setWeekLoading(true)
      setWeekError(null)
      const start = toISODate(weekDays[0])
      const end = toISODate(weekDays[6])
      const { data, error } = await BookingService.getTrainerSlotsForRange(user.id, start, end)
      if (error) throw error
      setWeekSlots(data || {})
    } catch (e) {
      console.error('Failed to load weekly slots:', e)
      setWeekError(e.message)
      setWeekSlots({})
    } finally {
      setWeekLoading(false)
    }
  }

  useEffect(() => {
    refreshWeekSlots()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return (
    <div className="container" style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="h1">Manage Your Availability</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Set your weekly schedule so clients can book sessions with you.
        </p>
      </div>

      {error && (
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '1rem',
          color: '#f87171'
        }}>
          Error: {error}
        </div>
      )}

      {/* Add New Slot Form */}
      <Card title="Add New Time Slot" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Date
            </label>
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              style={{
                width: '100%',
                height: '40px',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)',
                padding: '0 12px'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Start Time
            </label>
            <input 
              type="time" 
              value={newTime} 
              onChange={e => setNewTime(e.target.value)}
              style={{
                width: '100%',
                height: '40px',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)',
                padding: '0 12px'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              End Time
            </label>
            <input 
              type="time" 
              value={endTime} 
              onChange={e => setEndTime(e.target.value)}
              style={{
                width: '100%',
                height: '40px',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)',
                padding: '0 12px'
              }}
            />
          </div>
          
          <Button 
            onClick={handleAddSlot} 
            disabled={saving || weekLoading}
            style={{ height: '40px' }}
          >
            {saving ? 'Adding...' : 'Add Slot'}
          </Button>
        </div>
      </Card>

      {/* Weekly Schedule Display (current week) */}
      <Card title="This Week's Schedule">
        {weekError && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '1rem',
            color: '#f87171'
          }}>
            Error: {weekError}
          </div>
        )}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '1.5rem'
        }}>
          {weekDays.map((dateObj) => {
            const iso = toISODate(dateObj)
            const label = formatLabel(dateObj)
            const slots = weekSlots[iso] || []
            return (
              <div key={iso} style={{ 
                border: '1px solid var(--border-primary)', 
                borderRadius: '12px', 
                padding: '1rem',
                background: 'var(--bg-secondary)'
              }}>
                <h3 style={{ 
                  margin: '0 0 1rem 0', 
                  fontSize: '18px', 
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  {label}
                </h3>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {weekLoading ? (
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Loading...</span>
                  ) : slots.length === 0 ? (
                    <span style={{ 
                      fontSize: '14px', 
                      color: 'var(--text-muted)', 
                      fontStyle: 'italic'
                    }}>
                      No availability set
                    </span>
                  ) : (
                    slots.map(slot => (
                      <div
                        key={slot.id || `${iso}-${slot.startTime}-${slot.endTime}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 12px',
                          background: 'var(--accent-primary)',
                          borderRadius: '20px',
                          fontSize: '14px',
                          color: 'white'
                        }}
                      >
                        <span>{slot.startTime} - {slot.endTime}</span>
                        <button
                          onClick={() => handleRemoveSlot(slot.id)}
                          disabled={saving}
                          style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'white',
                            fontSize: '12px'
                          }}
                          title="Remove slot"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
