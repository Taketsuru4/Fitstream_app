import React, { useState } from 'react'
import { sendWelcomeEmail, sendBookingConfirmation, sendPasswordResetEmail, sendEmail } from '../services/emailService'

export default function EmailTester() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [email, setEmail] = useState('')

  const testEmail = async (emailType) => {
    if (!email) {
      setResult('Please enter an email address first')
      return
    }

    setLoading(true)
    setResult('Sending email...')

    try {
      let response
      
      switch (emailType) {
        case 'welcome-client':
          response = await sendWelcomeEmail(email, 'Test Client', 'client')
          break
          
        case 'welcome-trainer':
          response = await sendWelcomeEmail(email, 'Test Trainer', 'trainer')
          break
          
        case 'booking':
          response = await sendBookingConfirmation(
            email, 
            'John Doe (Trainer)', 
            'January 15, 2024', 
            '10:00 AM - 11:00 AM'
          )
          break
          
        case 'password-reset':
          response = await sendPasswordResetEmail(email, 'https://fitstream.app/reset-password?token=test123')
          break
          
        case 'custom':
          response = await sendEmail({
            to: email,
            subject: 'Test Email from FitStream',
            htmlContent: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #06B6D4;">Test Email</h1>
                <p>This is a test email from your FitStream app!</p>
                <p>If you received this, your email configuration is working correctly! 🎉</p>
                <p>Time sent: ${new Date().toLocaleString()}</p>
              </div>
            `
          })
          break
          
        default:
          setResult('Unknown email type')
          setLoading(false)
          return
      }

      if (response.success) {
        setResult(`✅ ${emailType} email sent successfully! Email ID: ${response.data?.id || 'N/A'}`)
      } else {
        setResult(`❌ Failed to send email: ${response.error?.message || 'Unknown error'}`)
      }
    } catch (error) {
      setResult(`❌ Error: ${error.message}`)
    }

    setLoading(false)
  }

  return (
    <div className="fixed top-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-96 z-50">
      <h3 className="text-lg font-bold mb-4 text-gray-800">Email Tester</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Test Email Address:
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your-email@example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-2 mb-4">
        <button
          onClick={() => testEmail('custom')}
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Send Test Email
        </button>
        
        <button
          onClick={() => testEmail('welcome-client')}
          disabled={loading}
          className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:opacity-50"
        >
          Welcome Email (Client)
        </button>
        
        <button
          onClick={() => testEmail('welcome-trainer')}
          disabled={loading}
          className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 disabled:opacity-50"
        >
          Welcome Email (Trainer)
        </button>
        
        <button
          onClick={() => testEmail('booking')}
          disabled={loading}
          className="w-full bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600 disabled:opacity-50"
        >
          Booking Confirmation
        </button>
        
        <button
          onClick={() => testEmail('password-reset')}
          disabled={loading}
          className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 disabled:opacity-50"
        >
          Password Reset
        </button>
      </div>

      {result && (
        <div className={`mt-4 p-3 rounded text-sm ${
          result.includes('✅') 
            ? 'bg-green-100 text-green-800' 
            : result.includes('❌')
            ? 'bg-red-100 text-red-800'
            : 'bg-blue-100 text-blue-800'
        }`}>
          {result}
        </div>
      )}

      {loading && (
        <div className="mt-2 text-center">
          <div className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  )
}