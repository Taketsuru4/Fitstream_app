import React, { useState, useEffect } from 'react'
import { useApp } from '../../hooks/useApp'
import stripeService from '../../services/stripeService'

export default function Payouts() {
  const { user } = useApp()
  const [earnings, setEarnings] = useState(null)
  const [connectAccount, setConnectAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processingPayout, setProcessingPayout] = useState(false)

  useEffect(() => {
    loadEarningsData()
    loadConnectAccount()
  }, [])

  const loadEarningsData = async () => {
    if (!user?.id) return
    
    const { data, error } = await stripeService.getTrainerEarnings(user.id)
    
    if (error) {
      setError('Failed to load earnings data')
    } else {
      setEarnings(data)
    }
  }

  const loadConnectAccount = async () => {
    if (!user?.id) return
    
    const { data, error } = await stripeService.getConnectAccountStatus(user.id)
    
    if (error) {
      console.error('Error loading connect account:', error)
    } else {
      setConnectAccount(data)
    }
    setLoading(false)
  }

  const handleCreateConnectAccount = async () => {
    setLoading(true)
    const { data, error } = await stripeService.createConnectAccount(user.id)
    
    if (error) {
      setError('Failed to create payout account. Please try again.')
    } else if (data?.account_link_url) {
      // Redirect to Stripe Connect onboarding
      window.location.href = data.account_link_url
    }
    setLoading(false)
  }

  const handleRequestPayout = async () => {
    if (!earnings?.totalEarnings || earnings.totalEarnings <= 0) return
    
    setProcessingPayout(true)
    const { data, error } = await stripeService.processPayout(user.id, earnings.totalEarnings)
    
    if (error) {
      setError('Failed to process payout. Please try again.')
    } else {
      // Refresh earnings after successful payout
      await loadEarningsData()
    }
    setProcessingPayout(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading payout information...</p>
        </div>
      </div>
    )
  }

  const isConnectAccountReady = connectAccount?.details_submitted && connectAccount?.charges_enabled

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Payouts & Earnings</h1>
        <p className="text-gray-400">Manage your earnings and payout preferences</p>
      </div>

      {error && (
        <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-300">
          {error}
        </div>
      )}

      {/* Earnings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Earnings</p>
              <p className="text-2xl font-bold text-white">
                {earnings ? stripeService.formatCurrency(earnings.totalEarnings) : '€0.00'}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-900/50 rounded-full flex items-center justify-center">
              <span className="text-green-400 text-xl">💰</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">This Month</p>
              <p className="text-2xl font-bold text-white">
                {earnings ? stripeService.formatCurrency(earnings.monthlyEarnings) : '€0.00'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-900/50 rounded-full flex items-center justify-center">
              <span className="text-blue-400 text-xl">📅</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Sessions</p>
              <p className="text-2xl font-bold text-white">
                {earnings?.totalSessions || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-900/50 rounded-full flex items-center justify-center">
              <span className="text-purple-400 text-xl">🏃‍♂️</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Monthly Sessions</p>
              <p className="text-2xl font-bold text-white">
                {earnings?.monthlySessions || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-cyan-900/50 rounded-full flex items-center justify-center">
              <span className="text-cyan-400 text-xl">🎯</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payout Account Setup */}
      {!isConnectAccountReady ? (
        <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-yellow-900/50 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-yellow-400 text-xl">⚠️</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">Setup Payout Account</h3>
              <p className="text-gray-300 mb-4">
                To receive payouts, you need to setup your bank account details with Stripe Connect. 
                This is a secure process that allows us to transfer your earnings directly to your bank account.
              </p>
              <button
                onClick={handleCreateConnectAccount}
                disabled={loading}
                className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 font-medium"
              >
                {loading ? 'Setting up...' : 'Setup Payout Account'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-900/50 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-green-400 text-xl">✅</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">Payout Account Ready</h3>
              <p className="text-gray-300 mb-4">
                Your payout account is setup and ready to receive payments. 
                Earnings will be automatically transferred to your bank account.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleRequestPayout}
                  disabled={processingPayout || !earnings?.totalEarnings || earnings.totalEarnings <= 0}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
                >
                  {processingPayout ? 'Processing...' : 'Request Payout'}
                </button>
                <button className="px-6 py-3 bg-gray-700 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors">
                  Payout Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Earnings */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Recent Earnings</h2>
          <span className="text-sm text-gray-400">
            Last {earnings?.payments?.length || 0} payments
          </span>
        </div>

        {!earnings?.payments || earnings.payments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-400 text-2xl">💰</span>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No earnings yet</h3>
            <p className="text-gray-400 text-sm">
              Your earnings will appear here after clients pay for sessions.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {earnings.payments.slice(0, 10).map((payment) => {
              const fees = stripeService.calculateFees(payment.amount / 100)
              return (
                <div key={payment.id} className="border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-white mb-1">
                        Session Payment
                      </h3>
                      <div className="text-sm text-gray-400 space-y-1">
                        <p>Date: {new Date(payment.created_at).toLocaleDateString('el-GR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</p>
                        <p>Platform fee: {stripeService.formatCurrency(fees.platformFee)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-green-400">
                        {stripeService.formatCurrency(fees.trainerAmount)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Gross: {stripeService.formatCurrency(payment.amount / 100)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Payout Information */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Payout Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-white mb-2">How Payouts Work</h4>
            <ul className="text-sm text-gray-400 space-y-2">
              <li>• Earnings are available 7 days after the session</li>
              <li>• Platform fee: {Math.round(stripeService.calculateFees(100).platformFeeRate * 100)}% + €0.30 per transaction</li>
              <li>• Automatic payouts every week to your bank account</li>
              <li>• Manual payout requests available anytime</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-white mb-2">Tax Information</h4>
            <ul className="text-sm text-gray-400 space-y-2">
              <li>• You are responsible for reporting earnings</li>
              <li>• Annual tax documents provided via email</li>
              <li>• Consult with a tax professional for advice</li>
              <li>• Keep records of all business expenses</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
