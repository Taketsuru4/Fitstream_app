import React, { useState } from 'react'
import { supabase } from './supabaseClient'

export default function AuthTest() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const handleSignUp = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: 'Test Client' } }
    })
    if (error) setMessage(error.message)
    else setMessage('✅ User created! Check Supabase > profiles')
    console.log(data)
  }

  const handleSignIn = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message)
    else setMessage('✅ Signed in successfully!')
    console.log(data)
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Supabase Auth Test</h2>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
      <button onClick={handleSignUp}>Sign Up</button>
      <button onClick={handleSignIn}>Sign In</button>
      <p>{message}</p>
    </div>
  )
}