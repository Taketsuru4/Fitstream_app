import { useState, useEffect, useCallback } from 'react'
import { BookingService } from '../services/bookingService'
import { useApp } from './useApp'

/**
 * Custom React hook for booking system functionality
 * Provides state management and methods for bookings and availability
 */
export function useBooking() {
  const { user, role } = useApp()
  
  // State
  const [bookings, setBookings] = useState([])
  const [availability, setAvailability] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load user bookings
  const loadBookings = useCallback(async (status = null) => {
    if (!user || !role) return
    
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await BookingService.getUserBookings(user.id, role, status)
      if (error) throw error
      
      setBookings(data)
    } catch (err) {
      console.error('Failed to load bookings:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user, role])

  // Load trainer availability
  const loadAvailability = useCallback(async (trainerId = null) => {
    const targetTrainerId = trainerId || (role === 'trainer' ? user?.id : null)
    if (!targetTrainerId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await BookingService.getTrainerAvailability(targetTrainerId)
      if (error) throw error
      
      setAvailability(data || {})
    } catch (err) {
      console.error('Failed to load availability:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user, role])

  // Create a new booking
  const createBooking = useCallback(async (bookingData) => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await BookingService.createBooking({
        ...bookingData,
        clientId: user.id
      })
      
      if (error) throw error
      
      // Add to local state
      setBookings(prev => [...prev, data])
      
      return { success: true, data }
    } catch (err) {
      console.error('Failed to create booking:', err)
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [user])

  // Update booking status
  const updateBookingStatus = useCallback(async (bookingId, newStatus, reason = null) => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await BookingService.updateBookingStatus(bookingId, newStatus, reason)
      if (error) throw error
      
      // Update local state
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId ? data : booking
      ))
      
      return { success: true, data }
    } catch (err) {
      console.error('Failed to update booking status:', err)
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  // Convenience methods for common status updates
  const confirmBooking = useCallback((bookingId) => 
    updateBookingStatus(bookingId, 'confirmed'), [updateBookingStatus])

  const cancelBooking = useCallback((bookingId, reason) => 
    updateBookingStatus(bookingId, 'cancelled', reason), [updateBookingStatus])

  const completeBooking = useCallback((bookingId, notes) => 
    updateBookingStatus(bookingId, 'completed', notes), [updateBookingStatus])

  // Set availability slot (for trainers)
  const setAvailabilitySlot = useCallback(async (dayOfWeek, startTime, endTime, specificDate = null) => {
    if (role !== 'trainer' || !user) return { success: false, error: 'Not authorized' }
    
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await BookingService.setAvailabilitySlot(
        user.id, dayOfWeek, startTime, endTime, { specificDate }
      )
      
      if (error) throw error
      
      // Reload availability
      await loadAvailability()
      
      return { success: true, data }
    } catch (err) {
      console.error('Failed to set availability slot:', err)
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [user, role, loadAvailability])

  // Remove availability slot (for trainers)
  const removeAvailabilitySlot = useCallback(async (slotId) => {
    if (role !== 'trainer' || !user) return { success: false, error: 'Not authorized' }
    
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await BookingService.removeAvailabilitySlot(slotId)
      if (error) throw error
      
      // Reload availability
      await loadAvailability()
      
      return { success: true, data }
    } catch (err) {
      console.error('Failed to remove availability slot:', err)
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [user, role, loadAvailability])

  // Get available slots for a specific trainer and date
  const getAvailableSlots = useCallback(async (trainerId, date) => {
    try {
      const { data, error } = await BookingService.getAvailableSlots(trainerId, date)
      if (error) throw error
      
      return data
    } catch (err) {
      console.error('Failed to get available slots:', err)
      return []
    }
  }, [])

  // Auto-load user's bookings on mount
  useEffect(() => {
    if (user && role) {
      loadBookings()
      
      // Load availability if user is a trainer
      if (role === 'trainer') {
        loadAvailability()
      }
    }
  }, [user, role, loadBookings, loadAvailability])

  // Derived state
  const upcomingBookings = bookings.filter(booking => {
    const bookingDate = new Date(`${booking.booking_date}T${booking.start_time}`)
    return bookingDate > new Date() && booking.status !== 'cancelled'
  })

  const pendingBookings = bookings.filter(booking => booking.status === 'pending')
  
  const completedBookings = bookings.filter(booking => booking.status === 'completed')

  return {
    // State
    bookings,
    availability,
    loading,
    error,
    
    // Derived state
    upcomingBookings,
    pendingBookings,
    completedBookings,
    
    // Methods
    loadBookings,
    loadAvailability,
    createBooking,
    updateBookingStatus,
    confirmBooking,
    cancelBooking,
    completeBooking,
    setAvailabilitySlot,
    removeAvailabilitySlot,
    getAvailableSlots,
    
    // Utilities
    clearError: () => setError(null)
  }
}