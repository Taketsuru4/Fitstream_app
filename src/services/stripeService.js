import { loadStripe } from '@stripe/stripe-js'
import { supabase } from '../supabaseClient'

// Initialize Stripe (use test key for development)
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_...'
let stripePromise = null

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey)
  }
  return stripePromise
}

export const stripeService = {
  // Create payment intent for session booking
  async createBookingPaymentIntent(bookingId, amount, currency = 'eur') {
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          bookingId,
          amount: Math.round(amount * 100), // Convert to cents
          currency,
          metadata: {
            type: 'session_booking',
            booking_id: bookingId
          }
        }
      })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error creating payment intent:', error)
      return { data: null, error }
    }
  },

  // Process payment for a booking
  async processBookingPayment(bookingId, paymentMethodId, amount) {
    try {
      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: {
          bookingId,
          paymentMethodId,
          amount: Math.round(amount * 100),
          currency: 'eur'
        }
      })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error processing payment:', error)
      return { data: null, error }
    }
  },

  // Get payment history for user
  async getPaymentHistory(userId) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          booking:bookings(
            id,
            created_at,
            trainer:trainer_id(full_name),
            client:client_id(full_name)
          )
        `)
        .or(`client_id.eq.${userId},trainer_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error fetching payment history:', error)
      return { data: [], error }
    }
  },

  // Get trainer earnings
  async getTrainerEarnings(trainerId) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('trainer_id', trainerId)
        .eq('status', 'succeeded')

      if (error) throw error

      const totalEarnings = data.reduce((sum, payment) => sum + (payment.amount / 100), 0)
      const thisMonth = data.filter(payment => {
        const paymentDate = new Date(payment.created_at)
        const now = new Date()
        return paymentDate.getMonth() === now.getMonth() && 
               paymentDate.getFullYear() === now.getFullYear()
      })
      const monthlyEarnings = thisMonth.reduce((sum, payment) => sum + (payment.amount / 100), 0)

      return {
        data: {
          totalEarnings,
          monthlyEarnings,
          totalSessions: data.length,
          monthlySessions: thisMonth.length,
          payments: data
        },
        error: null
      }
    } catch (error) {
      console.error('Error fetching trainer earnings:', error)
      return { data: null, error }
    }
  },

  // Create Stripe Connect account for trainer payouts
  async createConnectAccount(trainerId) {
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        body: { trainerId }
      })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error creating connect account:', error)
      return { data: null, error }
    }
  },

  // Get connect account status
  async getConnectAccountStatus(trainerId) {
    try {
      const { data, error } = await supabase
        .from('trainer_stripe_accounts')
        .select('*')
        .eq('trainer_id', trainerId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return { data: data || null, error: null }
    } catch (error) {
      console.error('Error fetching connect account status:', error)
      return { data: null, error }
    }
  },

  // Process payout to trainer
  async processPayout(trainerId, amount) {
    try {
      const { data, error } = await supabase.functions.invoke('process-payout', {
        body: {
          trainerId,
          amount: Math.round(amount * 100)
        }
      })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error processing payout:', error)
      return { data: null, error }
    }
  },

  // Format currency for display
  formatCurrency(amount, currency = 'EUR') {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: currency
    }).format(amount)
  },

  // Calculate platform fee (e.g., 10% + €0.30)
  calculateFees(amount) {
    const platformFeeRate = 0.10 // 10%
    const fixedFee = 0.30 // €0.30
    const platformFee = (amount * platformFeeRate) + fixedFee
    const trainerAmount = amount - platformFee
    
    return {
      grossAmount: amount,
      platformFee,
      trainerAmount,
      platformFeeRate
    }
  }
}

export default stripeService