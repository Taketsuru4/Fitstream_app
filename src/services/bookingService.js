import { supabase } from '../supabaseClient'

/**
 * Booking Service - Handles all booking-related database operations
 * Compatible with React + Vite architecture
 */
export class BookingService {
  
  // ===== AVAILABILITY MANAGEMENT =====
  
  /**
   * Get trainer's weekly availability schedule
   */
  static async getTrainerAvailability(trainerId) {
    try {
      const { data, error } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) throw error
      
      // Group by day of week
      const schedule = {}
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      
      data.forEach(slot => {
        const dayName = dayNames[slot.day_of_week]
        if (!schedule[dayName]) {
          schedule[dayName] = []
        }
        schedule[dayName].push({
          id: slot.id,
          startTime: slot.start_time,
          endTime: slot.end_time,
          isRecurring: slot.is_recurring
        })
      })
      
      return { data: schedule, error: null }
    } catch (error) {
      console.error('Error fetching trainer availability:', error)
      return { data: null, error }
    }
  }

  /**
   * Get availability for multiple trainers in a single query
   * Returns a map: { [trainerId]: { [dayName]: Array<{id, startTime, endTime, isRecurring}> } }
   */
  static async getAvailabilityForTrainers(trainerIds = []) {
    try {
      if (!Array.isArray(trainerIds) || trainerIds.length === 0) {
        return { data: {}, error: null }
      }

      const { data, error } = await supabase
        .from('availability_slots')
        .select('id, trainer_id, day_of_week, start_time, end_time, is_recurring')
        .in('trainer_id', trainerIds)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) throw error

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const map = {}

      ;(data || []).forEach(slot => {
        const tId = slot.trainer_id
        const dayName = dayNames[slot.day_of_week]
        if (!map[tId]) map[tId] = {}
        if (!map[tId][dayName]) map[tId][dayName] = []
        map[tId][dayName].push({
          id: slot.id,
          startTime: slot.start_time,
          endTime: slot.end_time,
          isRecurring: slot.is_recurring
        })
      })

      return { data: map, error: null }
    } catch (error) {
      console.error('Error fetching availability for trainers:', error)
      return { data: {}, error }
    }
  }

  /**
   * Set trainer availability slot
   */
  static async setAvailabilitySlot(trainerId, dayOfWeek, startTime, endTime) {
    try {
      const { data, error } = await supabase
        .from('availability_slots')
        .upsert({
          trainer_id: trainerId,
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          is_recurring: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'trainer_id,day_of_week,start_time'
        })
        .select()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error setting availability slot:', error)
      return { data: null, error }
    }
  }

  /**
   * Remove trainer availability slot
   */
  static async removeAvailabilitySlot(slotId) {
    try {
      const { data, error } = await supabase
        .from('availability_slots')
        .delete()
        .eq('id', slotId)
        .select()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error removing availability slot:', error)
      return { data: null, error }
    }
  }

  /**
   * Get available time slots for a trainer on a specific date
   */
  static async getAvailableSlots(trainerId, date) {
    try {
      const { data, error } = await supabase
        .rpc('get_trainer_availability', {
          trainer_uuid: trainerId,
          target_date: date
        })

      if (error) throw error

      return { 
        data: data.filter(slot => slot.is_available).map(slot => ({
          startTime: slot.start_time,
          endTime: slot.end_time
        })), 
        error: null 
      }
    } catch (error) {
      console.error('Error fetching available slots:', error)
      return { data: [], error }
    }
  }

  // ===== BOOKING MANAGEMENT =====

  /**
   * Create a new booking
   */
  static async createBooking(bookingData) {
    try {
      const {
        clientId,
        trainerId, 
        bookingDate,
        startTime,
        endTime,
        sessionType = 'virtual',
        hourlyRate,
        totalPrice,
        clientNotes = '',
        durationMinutes = 60
      } = bookingData

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          client_id: clientId,
          trainer_id: trainerId,
          booking_date: bookingDate,
          start_time: startTime,
          end_time: endTime,
          duration_minutes: durationMinutes,
          session_type: sessionType,
          hourly_rate: hourlyRate,
          total_price: totalPrice,
          client_notes: clientNotes,
          status: 'pending'
        })
        .select(`
          *,
          client:profiles!bookings_client_id_fkey(id, full_name, email, avatar_url),
          trainer:profiles!bookings_trainer_id_fkey(id, full_name, email, avatar_url, hourly_rate)
        `)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error creating booking:', error)
      return { data: null, error }
    }
  }

  /**
   * Get bookings for a user (client or trainer)
   */
  static async getUserBookings(userId, role, status = null) {
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          client:profiles!bookings_client_id_fkey(id, full_name, email, avatar_url),
          trainer:profiles!bookings_trainer_id_fkey(id, full_name, email, avatar_url, hourly_rate)
        `)

      // Filter by user role
      if (role === 'client') {
        query = query.eq('client_id', userId)
      } else if (role === 'trainer') {
        query = query.eq('trainer_id', userId)
      }

      // Filter by status if provided
      if (status) {
        query = query.eq('status', status)
      }

      query = query.order('booking_date', { ascending: true })
                   .order('start_time', { ascending: true })

      const { data, error } = await query

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error) {
      console.error('Error fetching user bookings:', error)
      return { data: [], error }
    }
  }

  /**
   * Update booking status
   */
  static async updateBookingStatus(bookingId, newStatus, reason = null) {
    try {
      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      if (reason) {
        if (newStatus === 'cancelled') {
          updateData.cancellation_reason = reason
        } else {
          updateData.trainer_notes = reason
        }
      }

      const { data, error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)
        .select(`
          *,
          client:profiles!bookings_client_id_fkey(id, full_name, email, avatar_url),
          trainer:profiles!bookings_trainer_id_fkey(id, full_name, email, avatar_url, hourly_rate)
        `)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error updating booking status:', error)
      return { data: null, error }
    }
  }

  // Convenience methods
  static async cancelBooking(bookingId, reason) {
    return this.updateBookingStatus(bookingId, 'cancelled', reason)
  }

  static async confirmBooking(bookingId) {
    return this.updateBookingStatus(bookingId, 'confirmed')
  }

  static async completeBooking(bookingId, trainerNotes = null) {
    return this.updateBookingStatus(bookingId, 'completed', trainerNotes)
  }
}