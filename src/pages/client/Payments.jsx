import React, { useState, useEffect } from 'react'
import { useApp } from '../../hooks/useApp'
import stripeService from '../../services/stripeService'
import BookingPayment from '../../components/payments/BookingPayment'
import Modal from '../../components/Modal'

export default function Payments() {
  const { user } = useApp()
  const [paymentHistory, setPaymentHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(null)

  useEffect(() => {
    loadPaymentHistory()
  }, [])

  const loadPaymentHistory = async () => {
    if (!user?.id) return
    
    setLoading(true)
    const { data, error } = await stripeService.getPaymentHistory(user.id)
    
    if (error) {
      setError('Failed to load payment history')
    } else {
      setPaymentHistory(data || [])
    }
    setLoading(false)
  }

  const handlePaymentSuccess = async (paymentIntent) => {
    console.log('Payment completed:', paymentIntent)
    setShowPaymentModal(false)
    setSelectedBooking(null)
    await loadPaymentHistory()
    // You might want to update the booking status here
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'succeeded': return 'text-green-400'
      case 'pending': return 'text-yellow-400'
      case 'failed': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'succeeded': return 'bg-green-900/50 border-green-500 text-green-300'
      case 'pending': return 'bg-yellow-900/50 border-yellow-500 text-yellow-300'
      case 'failed': return 'bg-red-900/50 border-red-500 text-red-300'
      default: return 'bg-gray-900/50 border-gray-500 text-gray-300'
    }
  }

  // Calculate totals
  const totalSpent = paymentHistory
    .filter(p => p.status === 'succeeded')
    .reduce((sum, payment) => sum + (payment.amount / 100), 0)

  const thisMonthSpent = paymentHistory
    .filter(payment => {
      const paymentDate = new Date(payment.created_at)
      const now = new Date()
      return paymentDate.getMonth() === now.getMonth() &&
             paymentDate.getFullYear() === now.getFullYear() &&
             payment.status === 'succeeded'
    })
    .reduce((sum, payment) => sum + (payment.amount / 100), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading payment information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Payments & Billing</h1>
        <p className="text-gray-400">Manage your payments and view transaction history</p>
      </div>

      {error && (
        <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-300">
          {error}
        </div>
      )}

      {/* Payment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Spent</p>
              <p className="text-2xl font-bold text-white">
                {stripeService.formatCurrency(totalSpent)}
              </p>
            </div>
            <div className="w-12 h-12 bg-cyan-900/50 rounded-full flex items-center justify-center">
              <span className="text-cyan-400 text-xl">💳</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">This Month</p>
              <p className="text-2xl font-bold text-white">
                {stripeService.formatCurrency(thisMonthSpent)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-900/50 rounded-full flex items-center justify-center">
              <span className="text-green-400 text-xl">📅</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Sessions</p>
              <p className="text-2xl font-bold text-white">
                {paymentHistory.filter(p => p.status === 'succeeded').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-900/50 rounded-full flex items-center justify-center">
              <span className="text-purple-400 text-xl">🏃‍♂️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Payment History</h2>
          <span className="text-sm text-gray-400">
            {paymentHistory.length} total transactions
          </span>
        </div>

        {paymentHistory.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-400 text-2xl">💳</span>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No payments yet</h3>
            <p className="text-gray-400 text-sm">
              Your payment history will appear here after you book your first session.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {paymentHistory.map((payment) => (
              <div key={payment.id} className="border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-white">
                        Session with {payment.booking?.trainer?.full_name || 'Trainer'}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getStatusBadge(payment.status)}`}>
                        {payment.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 space-y-1">
                      <p>Payment ID: {payment.stripe_payment_intent_id}</p>
                      <p>Date: {new Date(payment.created_at).toLocaleDateString('el-GR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-semibold ${getStatusColor(payment.status)}`}>
                      {stripeService.formatCurrency(payment.amount / 100)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {payment.currency.toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Security Info */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Payment Security</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <span className="text-green-400 text-xl">🔒</span>
            <div>
              <h4 className="font-medium text-white">Secure Payments</h4>
              <p className="text-sm text-gray-400">
                All payments are processed securely through Stripe with industry-standard encryption.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-blue-400 text-xl">🛡️</span>
            <div>
              <h4 className="font-medium text-white">Purchase Protection</h4>
              <p className="text-sm text-gray-400">
                Your payments are protected. Contact support if you have any issues with your sessions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedBooking && (
        <Modal
          open={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          title="Complete Payment"
        >
          <BookingPayment
            booking={selectedBooking}
            amount={selectedBooking.amount || 50} // Default amount, should come from booking
            onSuccess={handlePaymentSuccess}
            onCancel={() => setShowPaymentModal(false)}
          />
        </Modal>
      )}
    </div>
  )
}
