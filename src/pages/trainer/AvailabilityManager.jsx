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
  
  // Bulk creation state
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [bulkStartDate, setBulkStartDate] = useState('')
  const [bulkEndDate, setBulkEndDate] = useState('')
  const [bulkDays, setBulkDays] = useState([]) // array of day numbers: [1,2,3,4,5] for Mon-Fri
  const [bulkStartTime, setBulkStartTime] = useState('09:00')
  const [bulkEndTime, setBulkEndTime] = useState('17:00')
  const [bulkSlotDuration, setBulkSlotDuration] = useState(60) // minutes
  const [bulkSaving, setBulkSaving] = useState(false)
  
  // Copy/paste state
  const [copiedWeekSlots, setCopiedWeekSlots] = useState(null) // { [dayNumber]: [{startTime, endTime}] }
  const [pasting, setPasting] = useState(false)

  // Weekly view state (with navigation)
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date()
    const day = today.getDay()
    const diff = (day === 0 ? -6 : 1) - day // Monday as start
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff)
    monday.setHours(0,0,0,0)
    return monday
  })
  const [weekSlots, setWeekSlots] = useState({}) // { 'YYYY-MM-DD': [ {id,startTime,endTime,isRecurring} ] }
  const [weekLoading, setWeekLoading] = useState(false)
  const [weekError, setWeekError] = useState(null)

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const dayNumbers = [1, 2, 3, 4, 5, 6, 0] // Mon=1, Tue=2, ..., Sun=0
  const dayOptions = dayNames.map((name, i) => ({ name, number: dayNumbers[i] }))

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
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))
  }, [currentWeekStart])
  
  const weekRange = useMemo(() => {
    const start = currentWeekStart
    const end = addDays(start, 6)
    const startStr = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    const endStr = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    return `${startStr} - ${endStr}`
  }, [currentWeekStart])
  
  const isCurrentWeek = useMemo(() => {
    const today = new Date()
    const thisWeekStart = startOfWeek(today)
    return toISODate(currentWeekStart) === toISODate(thisWeekStart)
  }, [currentWeekStart])

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
  }, [user?.id, currentWeekStart])
  
  const goToPrevWeek = () => {
    setCurrentWeekStart(prev => {
      const newStart = new Date(prev)
      newStart.setDate(newStart.getDate() - 7)
      return newStart
    })
  }
  
  const goToNextWeek = () => {
    setCurrentWeekStart(prev => {
      const newStart = new Date(prev)
      newStart.setDate(newStart.getDate() + 7)
      return newStart
    })
  }
  
  const goToCurrentWeek = () => {
    const today = new Date()
    const thisWeekStart = startOfWeek(today)
    setCurrentWeekStart(thisWeekStart)
  }
  
  // Bulk slot creation
  const handleBulkCreate = async () => {
    if (!bulkStartDate || !bulkEndDate || bulkDays.length === 0) {
      alert('Please fill in all required fields')
      return
    }
    
    if (bulkStartTime >= bulkEndTime) {
      alert('End time must be after start time')
      return
    }
    
    setBulkSaving(true)
    try {
      const startDate = new Date(bulkStartDate + 'T00:00:00')
      const endDate = new Date(bulkEndDate + 'T00:00:00')
      const slotDurationMs = bulkSlotDuration * 60 * 1000
      
      // Generate time slots
      const timeSlots = []
      const startTimeMs = new Date(`1970-01-01T${bulkStartTime}:00`).getTime()
      const endTimeMs = new Date(`1970-01-01T${bulkEndTime}:00`).getTime()
      
      for (let timeMs = startTimeMs; timeMs < endTimeMs; timeMs += slotDurationMs) {
        const slotStart = new Date(timeMs).toTimeString().slice(0, 5)
        const slotEnd = new Date(timeMs + slotDurationMs).toTimeString().slice(0, 5)
        timeSlots.push({ start: slotStart, end: slotEnd })
      }
      
      // Generate dates for selected days
      const slots = []
      const currentDate = new Date(startDate)
      
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay()
        if (bulkDays.includes(dayOfWeek)) {
          const dateStr = toISODate(currentDate)
          timeSlots.forEach(timeSlot => {
            slots.push({
              date: dateStr,
              dayOfWeek,
              startTime: timeSlot.start,
              endTime: timeSlot.end
            })
          })
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      // Create slots (in batches to avoid overwhelming the API)
      let successCount = 0
      let errorCount = 0
      
      for (const slot of slots) {
        try {
          const result = await setAvailabilitySlot(
            slot.dayOfWeek,
            slot.startTime,
            slot.endTime,
            slot.date
          )
          if (result.success) {
            successCount++
          } else {
            errorCount++
            console.warn('Failed to create slot:', slot, result.error)
          }
        } catch (err) {
          errorCount++
          console.warn('Error creating slot:', slot, err)
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      
      // Reset form and refresh
      setShowBulkForm(false)
      setBulkStartDate('')
      setBulkEndDate('')
      setBulkDays([])
      setBulkStartTime('09:00')
      setBulkEndTime('17:00')
      setBulkSlotDuration(60)
      
      await refreshWeekSlots()
      
      alert(`Bulk creation completed! Created ${successCount} slots${errorCount > 0 ? `, ${errorCount} failed` : ''}.`)
      
    } catch (err) {
      console.error('Bulk creation error:', err)
      alert('Failed to create bulk slots: ' + err.message)
    } finally {
      setBulkSaving(false)
    }
  }
  
  const toggleBulkDay = (dayNumber) => {
    setBulkDays(prev => 
      prev.includes(dayNumber) 
        ? prev.filter(d => d !== dayNumber)
        : [...prev, dayNumber]
    )
  }
  
  // Copy/paste week functionality
  const copyCurrentWeek = () => {
    const weekData = {}
    weekDays.forEach((dateObj, index) => {
      const iso = toISODate(dateObj)
      const slots = weekSlots[iso] || []
      const dayNumber = dateObj.getDay()
      
      if (slots.length > 0) {
        weekData[dayNumber] = slots.map(slot => ({
          startTime: slot.startTime,
          endTime: slot.endTime
        }))
      }
    })
    
    setCopiedWeekSlots(weekData)
    alert(`Copied ${Object.values(weekData).flat().length} slots from this week!`)
  }
  
  const pasteToCurrentWeek = async () => {
    if (!copiedWeekSlots || Object.keys(copiedWeekSlots).length === 0) {
      alert('No week data to paste! Copy a week first.')
      return
    }
    
    if (!confirm('This will create slots for the current week. Continue?')) {
      return
    }
    
    setPasting(true)
    try {
      let successCount = 0
      let errorCount = 0
      
      // Create slots for each day in current week
      for (const [dayIndex, dateObj] of weekDays.entries()) {
        const dayNumber = dateObj.getDay()
        const slotsForDay = copiedWeekSlots[dayNumber] || []
        const dateStr = toISODate(dateObj)
        
        for (const slot of slotsForDay) {
          try {
            const result = await setAvailabilitySlot(
              dayNumber,
              slot.startTime,
              slot.endTime,
              dateStr
            )
            if (result.success) {
              successCount++
            } else {
              errorCount++
            }
          } catch (err) {
            errorCount++
            console.warn('Error pasting slot:', slot, err)
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 30))
        }
      }
      
      await refreshWeekSlots()
      alert(`Paste completed! Created ${successCount} slots${errorCount > 0 ? `, ${errorCount} failed (might be duplicates)` : ''}.`)
      
    } catch (err) {
      console.error('Paste error:', err)
      alert('Failed to paste slots: ' + err.message)
    } finally {
      setPasting(false)
    }
  }
  
  // Quick preset functions
  const createMorningBlock = () => {
    setBulkStartTime('09:00')
    setBulkEndTime('12:00')
    setBulkSlotDuration(60)
    setBulkDays([1,2,3,4,5]) // Mon-Fri
    if (!showBulkForm) setShowBulkForm(true)
  }
  
  const createAfternoonBlock = () => {
    setBulkStartTime('14:00')
    setBulkEndTime('18:00')
    setBulkSlotDuration(60)
    setBulkDays([1,2,3,4,5]) // Mon-Fri
    if (!showBulkForm) setShowBulkForm(true)
  }
  
  const createWeekdayBlock = () => {
    setBulkStartTime('09:00')
    setBulkEndTime('17:00')
    setBulkSlotDuration(60)
    setBulkDays([1,2,3,4,5]) // Mon-Fri
    if (!showBulkForm) setShowBulkForm(true)
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
      <Card style={{ marginBottom: '2rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1.5rem' 
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
            Add Time Slots
          </h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* Quick presets */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={createMorningBlock}
              title="Quick: Morning hours (9AM-12PM, Mon-Fri)"
            >
              🌅 Morning
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={createAfternoonBlock}
              title="Quick: Afternoon hours (2PM-6PM, Mon-Fri)"
            >
              🌞 Afternoon
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={createWeekdayBlock}
              title="Quick: Full weekday (9AM-5PM, Mon-Fri)"
            >
              📅 Weekdays
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowBulkForm(!showBulkForm)}
            >
              {showBulkForm ? 'Single Slot' : 'Bulk Create'}
            </Button>
          </div>
        </div>
        
        {!showBulkForm ? (
          // Single slot form (existing)
          <>
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
          </>
        ) : (
          // Bulk creation form
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={bulkStartDate}
                  onChange={(e) => setBulkStartDate(e.target.value)}
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
                  End Date
                </label>
                <input
                  type="date"
                  value={bulkEndDate}
                  onChange={(e) => setBulkEndDate(e.target.value)}
                  min={bulkStartDate || new Date().toISOString().split('T')[0]}
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
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Days of Week
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {dayOptions.map(day => (
                  <button
                    key={day.number}
                    type="button"
                    onClick={() => toggleBulkDay(day.number)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: bulkDays.includes(day.number) ? '2px solid var(--accent-primary)' : '1px solid var(--border-primary)',
                      background: bulkDays.includes(day.number) ? 'rgba(6,182,212,0.1)' : 'var(--bg-secondary)',
                      color: bulkDays.includes(day.number) ? 'var(--accent-primary)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {day.name.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Start Time
                </label>
                <input
                  type="time"
                  value={bulkStartTime}
                  onChange={(e) => setBulkStartTime(e.target.value)}
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
                  value={bulkEndTime}
                  onChange={(e) => setBulkEndTime(e.target.value)}
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
                  Slot Duration (mins)
                </label>
                <select
                  value={bulkSlotDuration}
                  onChange={(e) => setBulkSlotDuration(Number(e.target.value))}
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
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
            </div>
            
            <div style={{
              padding: '1rem',
              background: 'rgba(6,182,212,0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(6,182,212,0.2)'
            }}>
              <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500', marginBottom: '4px' }}>
                Preview:
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {bulkDays.length > 0 && bulkStartDate && bulkEndDate && bulkStartTime && bulkEndTime ? (
                  <>Creating slots from {bulkStartTime} to {bulkEndTime} every {bulkSlotDuration} minutes on {bulkDays.map(d => dayOptions.find(opt => opt.number === d)?.name.slice(0,3)).join(', ')} from {bulkStartDate} to {bulkEndDate}</>
                ) : (
                  'Fill in the fields above to see preview'
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button 
                variant="ghost" 
                onClick={() => setShowBulkForm(false)}
                disabled={bulkSaving}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBulkCreate} 
                disabled={bulkSaving || !bulkStartDate || !bulkEndDate || bulkDays.length === 0}
              >
                {bulkSaving ? 'Creating...' : 'Create Slots'}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Weekly Schedule Display (with navigation) */}
      <Card>
        {/* Week Navigation Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border-primary)'
        }}>
          <div>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '700', 
              color: 'var(--text-primary)',
              margin: '0 0 4px 0'
            }}>
              Weekly Schedule
            </h2>
            <p style={{ 
              fontSize: '14px', 
              color: 'var(--text-secondary)',
              margin: 0
            }}>
              {weekRange}
              {isCurrentWeek && (
                <span style={{ 
                  marginLeft: '8px',
                  padding: '2px 8px',
                  background: 'var(--accent-primary)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#fff'
                }}>
                  This Week
                </span>
              )}
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={goToPrevWeek}
              disabled={weekLoading}
              title="Previous week"
            >
              ←
            </Button>
            
            {!isCurrentWeek && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={goToCurrentWeek}
                disabled={weekLoading}
                title="Go to current week"
              >
                Today
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={goToNextWeek}
              disabled={weekLoading}
              title="Next week"
            >
              →
            </Button>
            
            {/* Copy/Paste controls */}
            <div style={{ marginLeft: '16px', display: 'flex', gap: '8px' }}>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={copyCurrentWeek}
                disabled={weekLoading || Object.keys(weekSlots).length === 0}
                title="Copy this week's schedule"
              >
                📋 Copy Week
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={pasteToCurrentWeek}
                disabled={weekLoading || pasting || !copiedWeekSlots}
                title="Paste copied schedule to this week"
              >
                {pasting ? '⏳' : '📌'} Paste Week
              </Button>
            </div>
          </div>
        </div>
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
            const isToday = toISODate(dateObj) === toISODate(new Date())
            
            return (
              <div key={iso} style={{ 
                border: isToday ? '2px solid var(--accent-primary)' : '1px solid var(--border-primary)', 
                borderRadius: '12px', 
                padding: '1rem',
                background: isToday ? 'rgba(6,182,212,0.05)' : 'var(--bg-secondary)',
                position: 'relative'
              }}>
                {/* Day header with slot count */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem'
                }}>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '16px', 
                    fontWeight: '600',
                    color: isToday ? 'var(--accent-primary)' : 'var(--text-primary)'
                  }}>
                    {label}
                    {isToday && (
                      <span style={{
                        marginLeft: '6px',
                        fontSize: '10px',
                        padding: '2px 6px',
                        background: 'var(--accent-primary)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontWeight: '700'
                      }}>
                        TODAY
                      </span>
                    )}
                  </h3>
                  
                  {slots.length > 0 && (
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      fontWeight: '600'
                    }}>
                      {slots.length} slot{slots.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                
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
