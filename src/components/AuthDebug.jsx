import React, { useState } from 'react'
import { useApp } from '../hooks/useApp'
import { supabase } from '../supabaseClient'

export default function AuthDebug() {
  const { user, loading, session, signUp, signIn } = useApp()
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('password123')
  const [testResult, setTestResult] = useState('')

  const testConnection = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1)
      if (error) {
        setTestResult(`Connection Error: ${error.message}`)
      } else {
        setTestResult('✅ Connected to Supabase successfully!')
      }
    } catch (err) {
      setTestResult(`Connection Error: ${err.message}`)
    }
  }

  const testSignUp = async () => {
    try {
      const result = await signUp(email, password, { 
        full_name: 'Test User', 
        role: 'client' 
      })
      setTestResult(result.error ? `SignUp Error: ${result.error.message}` : '✅ SignUp successful!')
    } catch (err) {
      setTestResult(`SignUp Error: ${err.message}`)
    }
  }

  const testSignIn = async () => {
    try {
      const result = await signIn(email, password)
      setTestResult(result.error ? `SignIn Error: ${result.error.message}` : '✅ SignIn successful!')
    } catch (err) {
      setTestResult(`SignIn Error: ${err.message}`)
    }
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: '#1a1a1a', 
      border: '1px solid #333',
      borderRadius: '8px',
      padding: '16px',
      color: '#fff',
      fontSize: '12px',
      maxWidth: '300px',
      zIndex: 1000
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Auth Debug Panel</h3>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Status:</strong><br/>
        Loading: {loading ? 'Yes' : 'No'}<br/>
        User: {user ? '✅ Logged in' : '❌ Not logged in'}<br/>
        Role: {user?.role || 'None'}<br/>
        Session: {session ? '✅ Active' : '❌ None'}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          style={{ width: '100%', margin: '2px 0', padding: '4px', fontSize: '11px' }}
        />
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          style={{ width: '100%', margin: '2px 0', padding: '4px', fontSize: '11px' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <button onClick={testConnection} style={{ padding: '4px 8px', fontSize: '11px' }}>
          Test DB Connection
        </button>
        <button onClick={testSignUp} style={{ padding: '4px 8px', fontSize: '11px' }}>
          Test Sign Up
        </button>
        <button onClick={testSignIn} style={{ padding: '4px 8px', fontSize: '11px' }}>
          Test Sign In
        </button>
      </div>

      {testResult && (
        <div style={{ 
          marginTop: '8px', 
          padding: '8px', 
          backgroundColor: testResult.includes('Error') ? '#331' : '#131',
          borderRadius: '4px',
          fontSize: '10px'
        }}>
          {testResult}
        </div>
      )}
    </div>
  )
}