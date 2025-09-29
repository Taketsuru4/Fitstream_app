import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { TrainerService } from '../../services/trainerService'
import TrainerProfilePreview from '../../components/TrainerProfilePreview'
import { Button } from '../../components/ui'

export default function TrainerProfile() {
  const { trainerId } = useParams()
  const navigate = useNavigate()
  
  const [trainer, setTrainer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (trainerId) {
      loadTrainerProfile()
    }
  }, [trainerId])

  const loadTrainerProfile = async () => {
    try {
      setLoading(true)
      setError('')
      
      const trainerData = await TrainerService.getTrainerProfile(trainerId)
      setTrainer(trainerData)
      
    } catch (err) {
      console.error('Error loading trainer profile:', err)
      setError(err.message || 'Failed to load trainer profile')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading trainer profile...</p>
        </div>
      </div>
    )
  }

  if (error || !trainer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-white mb-4">Trainer Not Found</h2>
          <p className="text-gray-400 mb-6">
            {error || 'The trainer profile you\'re looking for doesn\'t exist or is not available.'}
          </p>
          <div className="space-x-4">
            <Button onClick={() => navigate('/app/discover')}>
              Back to Discovery
            </Button>
            <Button variant="secondary" onClick={loadTrainerProfile}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Transform trainer data to match preview component format
  const previewData = {
    full_name: trainer.name,
    bio: trainer.bio,
    avatar_url: trainer.photo,
    location: trainer.location,
    specialties: trainer.specialties,
    hourly_rate: trainer.hourlyRate,
    currency: trainer.currency,
    years_experience: trainer.experience,
    certifications: trainer.certifications,
    languages: trainer.languages,
    training_locations: trainer.trainingLocations,
    rating: trainer.rating,
    total_reviews: trainer.totalReviews,
    total_sessions: trainer.totalSessions,
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/app/discover')}
          className="flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <span className="mr-2">←</span>
          Back to Discovery
        </button>
      </div>

      {/* Trainer Profile */}
      <TrainerProfilePreview profile={previewData} />

      {/* Additional Actions */}
      <div className="mt-8 bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Ready to get started?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button 
            onClick={() => alert(`Booking session with ${trainer.name}`)}
            className="w-full"
          >
            📅 Book a Session
          </Button>
          <Button 
            variant="secondary"
            onClick={() => alert(`Messaging ${trainer.name}`)}
            className="w-full"
          >
            💬 Send Message
          </Button>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-gray-400 text-sm">
            Have questions? Message {trainer.name.split(' ')[0]} to discuss your fitness goals
          </p>
        </div>
      </div>

      {/* Profile Metadata */}
      <div className="mt-6 bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Profile Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Profile Completion:</span>
            <div className="flex items-center mt-1">
              <div className="flex-1 bg-gray-700 rounded-full h-2 mr-2">
                <div 
                  className={`h-2 rounded-full ${
                    trainer.profileCompletion >= 80 ? 'bg-green-500' :
                    trainer.profileCompletion >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${trainer.profileCompletion}%` }}
                ></div>
              </div>
              <span className="text-white font-medium">{trainer.profileCompletion}%</span>
            </div>
          </div>
          
          <div>
            <span className="text-gray-400">Joined:</span>
            <p className="text-white font-medium">
              {new Date(trainer.joinedAt).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
          
          <div>
            <span className="text-gray-400">Last Updated:</span>
            <p className="text-white font-medium">
              {new Date(trainer.updatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Verification Status */}
      {trainer.isVerified && (
        <div className="mt-6 bg-green-900/20 border border-green-500 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-green-400 text-xl mr-3">✓</span>
            <div>
              <h4 className="text-green-300 font-semibold">Verified Trainer</h4>
              <p className="text-green-200 text-sm">
                This trainer has been verified by FitStream and meets our quality standards.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}