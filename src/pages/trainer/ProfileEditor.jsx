import React, { useState, useEffect } from 'react'
import { useApp } from '../../hooks/useApp'
import { supabase } from '../../supabaseClient'
import ImageUpload from '../../components/ImageUpload'
import TrainerProfilePreview from '../../components/TrainerProfilePreview'

const COMMON_SPECIALTIES = [
  'Strength Training', 'Weight Loss', 'Muscle Gain', 'Cardio Training', 'HIIT',
  'Yoga', 'Pilates', 'CrossFit', 'Powerlifting', 'Olympic Lifting',
  'Bodybuilding', 'Functional Training', 'Sports Conditioning', 'Rehabilitation',
  'Senior Fitness', 'Youth Training', 'Pregnancy Fitness', 'Nutrition Coaching'
]

const COMMON_CERTIFICATIONS = [
  'NASM-CPT', 'ACSM-CPT', 'ACE-CPT', 'NSCA-CSCS', 'ISSA-CPT',
  'RYT-200', 'RYT-500', 'PMA-CPT', 'CF-L1', 'CF-L2',
  'Precision Nutrition', 'FMS', 'TRX-STC'
]

const LANGUAGES = [
  'English', 'Greek', 'Spanish', 'French', 'German', 'Italian',
  'Portuguese', 'Russian', 'Arabic', 'Chinese', 'Japanese', 'Other'
]

const TRAINING_LOCATIONS = [
  'Online Sessions', 'Client\'s Home', 'Gym', 'Outdoor Training',
  'My Studio', 'Corporate Offices', 'Hotels'
]

export default function ProfileEditor(){
  const { user, updateUserRole } = useApp()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState({})
  const [activeTab, setActiveTab] = useState('edit') // 'edit' or 'preview'
  
  // Profile completion tracking
  const [profileCompletion, setProfileCompletion] = useState(0)
  
  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    avatar_url: '',
    phone: '',
    location: '',
    specialties: [],
    hourly_rate: '',
    currency: 'EUR',
    years_experience: '',
    certifications: [],
    languages: [],
    training_locations: []
  })

  // Load existing profile data
  useEffect(() => {
    if (user) {
      loadProfileData()
    }
  }, [user])

  const loadProfileData = async () => {
    if (!user) {
      console.log('No user found, cannot load profile')
      return
    }
    
    console.log('Loading profile for user:', user.id)
    setLoading(true)
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      console.log('Profile query result:', { profile, error })

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error)
        setMessage(`Error loading profile: ${error.message}`)
        return
      }
      
      if (error && error.code === 'PGRST116') {
        console.log('Profile not found, creating new profile')
        // Profile doesn't exist, create one
        const newProfile = {
          id: user.id,
          email: user.email,
          full_name: user.full_name || user.email?.split('@')[0],
          role: 'trainer',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        console.log('Creating profile with data:', newProfile)
        
        const { error: insertError, data: insertData } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          
        if (insertError) {
          console.error('Error creating profile:', insertError)
          setMessage(`Error creating profile: ${insertError.message}`)
        } else {
          console.log('Profile created successfully:', insertData)
          // Set the created profile data
          if (insertData && insertData[0]) {
            const createdProfile = insertData[0]
            setFormData({
              full_name: createdProfile.full_name || '',
              bio: createdProfile.bio || '',
              avatar_url: createdProfile.avatar_url || '',
              phone: createdProfile.phone || '',
              location: createdProfile.location || '',
              specialties: createdProfile.specialties || [],
              hourly_rate: createdProfile.hourly_rate || '',
              currency: createdProfile.currency || 'EUR',
              years_experience: createdProfile.years_experience || '',
              certifications: createdProfile.certifications || [],
              languages: createdProfile.languages || [],
              training_locations: createdProfile.training_locations || []
            })
            setProfileCompletion(createdProfile.profile_completion || 0)
          }
          return
        }
      }

      if (profile) {
        setFormData({
          full_name: profile.full_name || '',
          bio: profile.bio || '',
          avatar_url: profile.avatar_url || '',
          phone: profile.phone || '',
          location: profile.location || '',
          specialties: profile.specialties || [],
          hourly_rate: profile.hourly_rate || '',
          currency: profile.currency || 'EUR',
          years_experience: profile.years_experience || '',
          certifications: profile.certifications || [],
          languages: profile.languages || [],
          training_locations: profile.training_locations || []
        })
        setProfileCompletion(profile.profile_completion || 0)
      }
    } catch (error) {
      console.error('Error in loadProfileData:', error)
      setMessage(`Failed to load profile data: ${error.message}`)
    } finally {
      console.log('Setting loading to false')
      setLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const handleArrayToggle = (field, item) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }))
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required'
    }
    
    if (!formData.bio.trim() || formData.bio.length < 50) {
      newErrors.bio = 'Bio must be at least 50 characters'
    }
    
    if (formData.hourly_rate && (isNaN(formData.hourly_rate) || formData.hourly_rate <= 0)) {
      newErrors.hourly_rate = 'Please enter a valid hourly rate'
    }
    
    if (formData.years_experience && (isNaN(formData.years_experience) || formData.years_experience < 0)) {
      newErrors.years_experience = 'Please enter valid years of experience'
    }
    
    if (formData.specialties.length === 0) {
      newErrors.specialties = 'Please select at least one specialty'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const saveProfile = async () => {
    if (!validateForm()) {
      setMessage('Please fix the errors below')
      return
    }

    setSaving(true)
    setMessage('')
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error
      
      setMessage('✅ Profile updated successfully!')
      
      // Refresh profile data to get updated completion score
      await loadProfileData()
      
    } catch (error) {
      console.error('Error saving profile:', error)
      setMessage('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (imageUrl) => {
    handleInputChange('avatar_url', imageUrl)
    
    // Auto-save avatar_url immediately
    try {
      await supabase
        .from('profiles')
        .update({ avatar_url: imageUrl })
        .eq('id', user.id)
    } catch (error) {
      console.error('Error saving avatar:', error)
    }
  }

  const handleImageDelete = async () => {
    handleInputChange('avatar_url', '')
    
    // Auto-save empty avatar_url
    try {
      await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id)
    } catch (error) {
      console.error('Error removing avatar:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Trainer Profile</h1>
        <p className="text-gray-400 mb-4">
          Complete your profile to attract more clients. Profile completion: 
          <span className={`font-semibold ml-1 ${
            profileCompletion >= 80 ? 'text-green-400' :
            profileCompletion >= 50 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {profileCompletion}%
          </span>
        </p>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-700 rounded-full h-2 mb-6">
          <div 
            className={`h-2 rounded-full transition-all ${
              profileCompletion >= 80 ? 'bg-green-500' :
              profileCompletion >= 50 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${profileCompletion}%` }}
          ></div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-gray-800 rounded-lg p-1 mb-6">
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'edit'
                ? 'bg-cyan-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            ✏️ Edit Profile
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'preview'
                ? 'bg-cyan-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            👁️ Preview
          </button>
        </div>
      </div>

      {/* Status Message */}
      {message && activeTab === 'edit' && (
        <div className={`p-4 rounded-lg ${
          message.startsWith('✅') 
            ? 'bg-green-900/20 border border-green-500 text-green-300'
            : 'bg-red-900/20 border border-red-500 text-red-300'
        }`}>
          {message}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'preview' ? (
        <TrainerProfilePreview profile={formData} />
      ) : (
        <div className="space-y-8">
          {/* Profile Photo */}
          <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Profile Photo</h2>
        <ImageUpload
          currentImage={formData.avatar_url}
          onImageUpload={handleImageUpload}
          onImageDelete={handleImageDelete}
          size="large"
        />
        {errors.avatar_url && (
          <p className="text-red-400 text-sm mt-2">{errors.avatar_url}</p>
        )}
      </div>

      {/* Basic Information */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Basic Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
              placeholder="Enter your full name"
            />
            {errors.full_name && (
              <p className="text-red-400 text-sm mt-1">{errors.full_name}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
              placeholder="+1 (555) 123-4567"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
              placeholder="City, State/Country"
            />
          </div>
        </div>
      </div>

      {/* Professional Bio */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Professional Bio *</h2>
        <textarea
          value={formData.bio}
          onChange={(e) => handleInputChange('bio', e.target.value)}
          rows={6}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
          placeholder="Tell potential clients about your experience, training philosophy, and what makes you unique as a trainer. Be specific about your approach and what clients can expect from working with you."
        />
        <div className="flex justify-between items-center mt-2">
          {errors.bio && (
            <p className="text-red-400 text-sm">{errors.bio}</p>
          )}
          <p className="text-gray-400 text-sm ml-auto">
            {formData.bio.length}/500 characters (minimum 50)
          </p>
        </div>
      </div>

      {/* Specialties */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Specialties *</h2>
        <p className="text-gray-400 text-sm mb-4">
          Select the areas you specialize in (choose at least 1)
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {COMMON_SPECIALTIES.map(specialty => (
            <button
              key={specialty}
              onClick={() => handleArrayToggle('specialties', specialty)}
              className={`p-3 rounded-lg text-sm font-medium transition-all ${
                formData.specialties.includes(specialty)
                  ? 'bg-cyan-600 text-white border-cyan-600'
                  : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
              } border`}
            >
              {specialty}
            </button>
          ))}
        </div>
        
        {errors.specialties && (
          <p className="text-red-400 text-sm mt-2">{errors.specialties}</p>
        )}
      </div>

      {/* Pricing & Experience */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Pricing & Experience</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Hourly Rate
            </label>
            <div className="flex">
              <input
                type="number"
                value={formData.hourly_rate}
                onChange={(e) => handleInputChange('hourly_rate', e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-l-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                placeholder="45"
                min="0"
                step="0.01"
              />
              <select
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 border-l-0 rounded-r-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            {errors.hourly_rate && (
              <p className="text-red-400 text-sm mt-1">{errors.hourly_rate}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Years of Experience
            </label>
            <input
              type="number"
              value={formData.years_experience}
              onChange={(e) => handleInputChange('years_experience', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
              placeholder="5"
              min="0"
            />
            {errors.years_experience && (
              <p className="text-red-400 text-sm mt-1">{errors.years_experience}</p>
            )}
          </div>
        </div>
      </div>

      {/* Certifications */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Certifications</h2>
        <p className="text-gray-400 text-sm mb-4">
          Select your professional certifications
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {COMMON_CERTIFICATIONS.map(cert => (
            <button
              key={cert}
              onClick={() => handleArrayToggle('certifications', cert)}
              className={`p-3 rounded-lg text-sm font-medium transition-all ${
                formData.certifications.includes(cert)
                  ? 'bg-cyan-600 text-white border-cyan-600'
                  : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
              } border`}
            >
              {cert}
            </button>
          ))}
        </div>
      </div>

      {/* Languages & Training Locations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Languages */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Languages</h2>
          <div className="space-y-2">
            {LANGUAGES.map(language => (
              <label key={language} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.languages.includes(language)}
                  onChange={() => handleArrayToggle('languages', language)}
                  className="mr-3 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-gray-300">{language}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Training Locations */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Training Locations</h2>
          <div className="space-y-2">
            {TRAINING_LOCATIONS.map(location => (
              <label key={location} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.training_locations.includes(location)}
                  onChange={() => handleArrayToggle('training_locations', location)}
                  className="mr-3 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-gray-300">{location}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={saveProfile}
              disabled={saving}
              className="px-8 py-3 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="flex items-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </div>
              ) : (
                'Save Profile'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
