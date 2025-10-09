import React, { useState, useEffect } from 'react'
import { useBooking } from '../../hooks/useBooking'
import { Button, Card } from '../../components/ui'

export default function AvailabilityManager() {
  const { availability, loading, error, setAvailabilitySlot, removeAvailabilitySlot, loadAvailability } = useBooking()
  
  const [newTime, setNewTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [selectedDay, setSelectedDay] = useState('Monday')
  const [newDate, setNewDate] = useState('') // YYYY-MM-DD (optional one-off)
  const [saving, setSaving] = useState(false)

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const dayNumbers = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 }

  const handleAddSlot = async () => {
    if (!newTime || !endTime) {
      alert('Please select both start and end times')
      return
    }

    if (newTime >= endTime) {
      alert('End time must be after start time')
      return
    }

    // Determine day number based on either explicit day or chosen date
    const computedDayNum = newDate
      ? new Date(`${newDate}T00:00:00`).getDay()
      : dayNumbers[selectedDay]

    setSaving(true)
    try {
      const result = await setAvailabilitySlot(
        computedDayNum,
        newTime,
        endTime,
        newDate || null
      )
      
      if (result.success) {
        setNewTime('09:00')
        setEndTime('10:00')
        // Do not reset selectedDay so weekly flows stay quick
        setNewDate('')
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
      }
    } catch (err) {
      console.error('Error removing slot:', err)
      alert('Failed to remove slot')
    } finally {
      setSaving(false)
    }
  }

  if (loading && !availability) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading availability...</p>
        </div>
      </div>
    )
  }

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
              Day
            </label>
            <select 
              value={selectedDay} 
              onChange={e => setSelectedDay(e.target.value)}
              style={{
                width: '100%',
                height: '40px',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)',
                padding: '0 12px'
              }}
            >
              {dayNames.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Date (optional)
            </label>
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
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
            disabled={saving || loading}
            style={{ height: '40px' }}
          >
            {saving ? 'Adding...' : 'Add Slot'}
          </Button>
        </div>
      </Card>

      {/* Weekly Schedule Display */}
      <Card title="Weekly Schedule">
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '1.5rem'
        }}>
          {dayNames.map(day => {
            const daySlots = availability[day] || []
            return (
              <div key={day} style={{ 
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
                  {day}
                </h3>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {daySlots.length === 0 ? (
                    <span style={{ 
                      fontSize: '14px', 
                      color: 'var(--text-muted)', 
                      fontStyle: 'italic'
                    }}>
                      No availability set
                    </span>
                  ) : (
                    daySlots.map(slot => (
                      <div
                        key={slot.id || `${slot.startTime}-${slot.endTime}`}
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
                        {!slot.isRecurring && (
                          <span style={{ fontSize: '12px', opacity: 0.85 }}> • one-off</span>
                        )}
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
