import React, { useState, useEffect, useMemo } from 'react'
import { Button } from './ui'

const AvailabilityCalendar = ({ 
  selectedDate, 
  onDateSelect, 
  availabilityMap = {}, // { 'YYYY-MM-DD': { available: boolean, slotsCount: number } }
  minDate = null,
  maxDate = null,
  loading = false 
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const minSelectableDate = useMemo(() => {
    if (minDate) return new Date(minDate)
    return today
  }, [minDate, today])

  const maxSelectableDate = useMemo(() => {
    if (maxDate) return new Date(maxDate)
    // Default to 3 months from today
    const d = new Date(today)
    d.setMonth(d.getMonth() + 3)
    return d
  }, [maxDate, today])

  const monthStart = useMemo(() => {
    const d = new Date(currentMonth)
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  }, [currentMonth])

  const monthEnd = useMemo(() => {
    const d = new Date(monthStart)
    d.setMonth(d.getMonth() + 1)
    d.setDate(0)
    return d
  }, [monthStart])

  const calendarStart = useMemo(() => {
    const d = new Date(monthStart)
    const dayOfWeek = d.getDay()
    // Start from Monday (if Sunday=0, go back 6 days; if Monday=1, go back 0 days)
    const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    d.setDate(d.getDate() - offset)
    return d
  }, [monthStart])

  const calendarDays = useMemo(() => {
    const days = []
    const current = new Date(calendarStart)
    
    // Generate 6 weeks (42 days) to ensure consistent grid
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }, [calendarStart])

  const formatDate = (date) => date.toISOString().split('T')[0]
  const formatMonthYear = (date) => {
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  }

  const isToday = (date) => date.getTime() === today.getTime()
  const isSelected = (date) => selectedDate && formatDate(date) === selectedDate
  const isCurrentMonth = (date) => date.getMonth() === currentMonth.getMonth()
  const isSelectable = (date) => date >= minSelectableDate && date <= maxSelectableDate
  
  const getAvailabilityStatus = (date) => {
    const dateKey = formatDate(date)
    return availabilityMap[dateKey] || { available: false, slotsCount: 0 }
  }

  const goToPrevMonth = () => {
    setCurrentMonth(prev => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() - 1)
      return d
    })
  }

  const goToNextMonth = () => {
    setCurrentMonth(prev => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + 1)
      return d
    })
  }

  const handleDateClick = (date) => {
    if (!isSelectable(date)) return
    onDateSelect(formatDate(date))
  }

  return (
    <div style={{ 
      border: '1px solid var(--border-primary)', 
      borderRadius: '12px', 
      background: 'var(--bg-secondary)',
      padding: '1rem',
      minWidth: '320px'
    }}>
      {/* Calendar Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1rem' 
      }}>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={goToPrevMonth}
          disabled={loading}
        >
          ←
        </Button>
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          color: 'var(--text-primary)',
          margin: 0 
        }}>
          {formatMonthYear(currentMonth)}
        </h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={goToNextMonth}
          disabled={loading}
        >
          →
        </Button>
      </div>

      {/* Days of Week Header */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(7, 1fr)', 
        gap: '4px', 
        marginBottom: '8px' 
      }}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} style={{ 
            textAlign: 'center', 
            fontSize: '12px', 
            fontWeight: '600', 
            color: 'var(--text-secondary)',
            padding: '8px 4px'
          }}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(7, 1fr)', 
        gap: '2px' 
      }}>
        {calendarDays.map((date, index) => {
          const availability = getAvailabilityStatus(date)
          const selectable = isSelectable(date)
          const currentMonthDay = isCurrentMonth(date)
          
          return (
            <div
              key={index}
              onClick={() => handleDateClick(date)}
              style={{
                position: 'relative',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                borderRadius: '6px',
                cursor: selectable ? 'pointer' : 'default',
                opacity: loading ? 0.6 : currentMonthDay ? 1 : 0.4,
                color: isSelected(date) 
                  ? '#fff' 
                  : isToday(date) 
                    ? 'var(--accent-primary)' 
                    : selectable 
                      ? 'var(--text-primary)' 
                      : 'var(--text-muted)',
                background: isSelected(date) 
                  ? 'var(--accent-primary)' 
                  : selectable && currentMonthDay 
                    ? 'rgba(255,255,255,0.05)' 
                    : 'transparent',
                border: isToday(date) ? '1px solid var(--accent-primary)' : '1px solid transparent',
                transition: 'all 0.2s ease'
              }}
            >
              {date.getDate()}
              
              {/* Availability Indicator */}
              {currentMonthDay && selectable && availability.slotsCount > 0 && (
                <div style={{
                  position: 'absolute',
                  bottom: '2px',
                  right: '2px',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: availability.available ? '#10b981' : '#ef4444'
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '12px'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '2px solid var(--accent-primary)',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      )}

      {/* Legend */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginTop: '12px', 
        fontSize: '12px', 
        color: 'var(--text-secondary)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
          Available
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
          Booked
        </div>
      </div>
    </div>
  )
}

export default AvailabilityCalendar