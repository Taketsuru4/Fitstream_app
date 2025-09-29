import React, { useState, useEffect } from 'react'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { getStripe, stripeService } from '../../services/stripeService'
import { useApp } from '../../hooks/useApp'

const CheckoutForm = ({ booking, amount, onSuccess, onCancel }) => {
  const stripe = useStripe()
  const elements = useElements()
  const { user } = useApp()
  
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [clientSecret, setClientSecret] = useState('')

  // Create payment intent when component mounts
  useEffect(() => {
    const createPaymentIntent = async () => {
      const { data, error } = await stripeService.createBookingPaymentIntent(
        booking.id,
        amount,
        'eur'
      )
      
      if (error) {
        setError('Failed to initialize payment. Please try again.')
      } else {
        setClientSecret(data.client_secret)
      }
    }

    createPaymentIntent()
  }, [booking.id, amount])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setProcessing(true)
    setError('')

    const card = elements.getElement(CardElement)

    // Create payment method
    const { error: methodError, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: card,
      billing_details: {
        name: user?.full_name || user?.email,
        email: user?.email,
      },
    })

    if (methodError) {
      setError(methodError.message)
      setProcessing(false)
      return
    }

    // Confirm payment
    const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: paymentMethod.id
    })

    if (confirmError) {
      setError(confirmError.message)
      setProcessing(false)
    } else {
      // Payment successful
      console.log('Payment succeeded:', paymentIntent)
      onSuccess(paymentIntent)
    }
  }

  const fees = stripeService.calculateFees(amount)

  return (
    <div className="max-w-md mx-auto bg-gray-800 rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">Complete Payment</h2>
        <p className="text-gray-300 text-sm">
          Session with {booking.trainer?.full_name || 'Trainer'}
        </p>
      </div>

      {/* Payment Summary */}
      <div className="mb-6 p-4 bg-gray-700 rounded-lg">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-300">
            <span>Session fee:</span>
            <span>{stripeService.formatCurrency(fees.grossAmount)}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>Platform fee ({Math.round(fees.platformFeeRate * 100)}%):</span>
            <span>{stripeService.formatCurrency(fees.platformFee)}</span>
          </div>
          <div className="border-t border-gray-600 pt-2 flex justify-between font-semibold text-white">
            <span>Total:</span>
            <span>{stripeService.formatCurrency(amount)}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Card Details
          </label>
          <div className="p-3 bg-gray-700 border border-gray-600 rounded-lg">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#ffffff',
                    '::placeholder': {
                      color: '#9CA3AF',
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-gray-700 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!stripe || processing}
            className="flex-1 py-3 px-4 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Processing...
              </div>
            ) : (
              `Pay ${stripeService.formatCurrency(amount)}`
            )}
          </button>
        </div>
      </form>

      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>🔒 Your payment information is secure and encrypted</p>
        <p className="mt-1">Powered by Stripe</p>
      </div>
    </div>
  )
}

const BookingPayment = ({ booking, amount, onSuccess, onCancel }) => {
  const [stripePromise, setStripePromise] = useState(null)

  useEffect(() => {
    setStripePromise(getStripe())
  }, [])

  if (!stripePromise) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading payment system...</p>
        </div>
      </div>
    )
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm
        booking={booking}
        amount={amount}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  )
}

export default BookingPayment