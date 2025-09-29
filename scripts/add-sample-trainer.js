#!/usr/bin/env node

// Script to add a sample trainer profile for testing the discover functionality
// Run with: node scripts/add-sample-trainer.js

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables')
  console.error('Make sure you have VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Sample trainer data
const sampleTrainer = {
  id: crypto.randomUUID(),
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
  is_verified: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

async function addSampleTrainer() {
  try {
    console.log('🏋️‍♂️ Adding sample trainer profile...')
    
    // Check if trainer already exists
    const { data: existingTrainer } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('email', sampleTrainer.email)
      .single()
    
    if (existingTrainer) {
      console.log(`✅ Trainer already exists: ${existingTrainer.full_name} (${existingTrainer.email})`)
      return existingTrainer
    }
    
    // Insert the sample trainer
    const { data: newTrainer, error } = await supabase
      .from('profiles')
      .insert([sampleTrainer])
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error inserting trainer:', error.message)
      throw error
    }
    
    console.log('✅ Successfully added sample trainer!')
    console.log(`   Name: ${newTrainer.full_name}`)
    console.log(`   Email: ${newTrainer.email}`)
    console.log(`   Location: ${newTrainer.location}`)
    console.log(`   Specialties: ${newTrainer.specialties.join(', ')}`)
    console.log(`   Hourly Rate: €${newTrainer.hourly_rate}`)
    console.log(`   Rating: ${newTrainer.rating} (${newTrainer.total_reviews} reviews)`)
    console.log('   🎉 Ready to appear in the Discover page!')
    
    return newTrainer
    
  } catch (error) {
    console.error('❌ Failed to add sample trainer:', error.message)
    throw error
  }
}

async function main() {
  console.log('🚀 FitStream Sample Trainer Setup\n')
  
  try {
    // Test connection first
    console.log('🔍 Testing Supabase connection...')
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'trainer')
      .limit(1)
      
    if (error) {
      console.error('❌ Connection failed:', error.message)
      return
    }
    
    console.log(`✅ Connected successfully!\n`)
    
    // Add the sample trainer
    const trainer = await addSampleTrainer()
    
    console.log('\n🎯 Next steps:')
    console.log('   1. Open http://localhost:5174/ in your browser')
    console.log('   2. Login or bypass auth using the Dev Tools')
    console.log('   3. Navigate to Discover as a Client')
    console.log('   4. Look for "Dimitris Komninos" in the trainers list')
    console.log('   5. Test filtering by specialties like "Strength Training"')
    
    // Show Discover URL
    console.log(`\n📍 Direct Discover URL: http://localhost:5174/app/discover`)
    
  } catch (error) {
    console.error('\n💥 Script failed:', error.message)
    process.exit(1)
  }
}

// Run the script
main()