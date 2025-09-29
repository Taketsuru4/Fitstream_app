import React, { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function DevSampleTrainer() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const sampleTrainer = {
    email: 'trainer.demo@fitstream.app',
    full_name: 'Dimitris Komninos',
    bio: 'Πιστοποιημένος προπονητής με εξειδίκευση στην αύξηση μυικής μάζας και functional training. 8 χρόνια εμπειρίας με επιτυχημένα αποτελέσματα. Διαθέσιμος για online και δια ζώσης προπονήσεις στην Αθήνα.',
    avatar_url: 'https://images.unsplash.com/photo-1567013127542-490d757e51cd?auto=format&fit=crop&w=800&q=80',
    phone: '+30 698 123 4567',
    location: 'Αθήνα, Ελλάδα',
    role: 'trainer',
    specialties: ['Strength Training', 'Muscle Building', 'Functional Training', 'Weight Loss'],
    hourly_rate: 45,
    currency: 'EUR',
    years_experience: 8,
    certifications: ['ACSM Certified Personal Trainer', 'NSCA-CSCS', 'Functional Movement Screen'],
    languages: ['Ελληνικά', 'English'],
    training_locations: ['Online Sessions', 'Gym Training', 'Home Visits'],
    rating: 4.8,
    total_reviews: 42,
    total_sessions: 156,
    profile_completion: 95,
    is_verified: true
  }

  const createSampleTrainer = async () => {
    try {
      setLoading(true)
      setMessage('')

      // First, check if trainer already exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('email', sampleTrainer.email)
        .single()

      if (existing) {
        setMessage(`✅ Trainer already exists: ${existing.full_name} (${existing.email})`)
        return
      }

      // Create auth user first
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: sampleTrainer.email,
        password: 'FitStream2024!',
        email_confirm: true,
        user_metadata: {
          full_name: sampleTrainer.full_name,
          role: 'trainer'
        }
      })

      if (authError) {
        throw new Error(`Auth creation failed: ${authError.message}`)
      }

      // Create profile
      const profileData = {
        ...sampleTrainer,
        id: authUser.user.id
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single()

      if (profileError) {
        throw new Error(`Profile creation failed: ${profileError.message}`)
      }

      setMessage(`✅ Successfully created trainer: ${profile.full_name} - ${profile.email}`)

    } catch (error) {
      console.error('Error creating sample trainer:', error)
      setMessage(`❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const addManualProfile = async () => {
    try {
      setLoading(true)
      setMessage('')

      // Try to insert directly to profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .insert([{
          ...sampleTrainer,
          id: crypto.randomUUID()
        }])
        .select()
        .single()

      if (error) {
        throw error
      }

      setMessage(`✅ Profile added: ${profile.full_name}`)

    } catch (error) {
      console.error('Error:', error)
      setMessage(`❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return null // Don't show in production
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 p-4 rounded-lg border border-gray-600 shadow-lg max-w-sm">
      <h3 className="text-sm font-bold text-white mb-2">🧪 Dev Tools</h3>
      <p className="text-xs text-gray-300 mb-3">
        Add sample trainer "Dimitris Komninos" to test Discover functionality
      </p>
      
      <div className="space-y-2">
        <button
          onClick={createSampleTrainer}
          disabled={loading}
          className="w-full px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Add Sample Trainer (With Auth)'}
        </button>
        
        <button
          onClick={addManualProfile}
          disabled={loading}
          className="w-full px-3 py-2 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Profile Only'}
        </button>
      </div>
      
      {message && (
        <div className="mt-3 p-2 bg-gray-700 rounded text-xs text-gray-200">
          {message}
        </div>
      )}
    </div>
  )
}