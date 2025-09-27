import React from 'react'

const TrainerProfilePreview = ({ profile }) => {
  if (!profile) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-400">Complete your profile to see how it appears to clients</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {/* Header with photo and basic info */}
      <div className="relative bg-gradient-to-r from-cyan-600 to-blue-700 p-6">
        <div className="flex items-start space-x-6">
          {/* Profile Photo */}
          <div className="flex-shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-24 h-24 rounded-full border-4 border-white object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-600 border-4 border-white flex items-center justify-center">
                <span className="text-2xl text-gray-300">👤</span>
              </div>
            )}
          </div>

          {/* Name and basic info */}
          <div className="flex-1 text-white">
            <h2 className="text-2xl font-bold mb-2">
              {profile.full_name || 'Your Name'}
            </h2>
            
            <div className="flex items-center space-x-4 text-sm opacity-90 mb-3">
              {profile.location && (
                <div className="flex items-center">
                  <span className="mr-1">📍</span>
                  {profile.location}
                </div>
              )}
              
              {profile.years_experience && (
                <div className="flex items-center">
                  <span className="mr-1">⭐</span>
                  {profile.years_experience} years experience
                </div>
              )}
            </div>

            {/* Rating placeholder */}
            <div className="flex items-center space-x-2">
              <div className="flex text-yellow-400">
                {[1,2,3,4,5].map(star => (
                  <span key={star}>⭐</span>
                ))}
              </div>
              <span className="text-sm opacity-75">5.0 ({profile.total_reviews || 0} reviews)</span>
            </div>
          </div>

          {/* Pricing */}
          <div className="text-right text-white">
            {profile.hourly_rate ? (
              <div>
                <div className="text-2xl font-bold">
                  {profile.currency === 'USD' ? '$' : profile.currency === 'GBP' ? '£' : '€'}
                  {profile.hourly_rate}
                </div>
                <div className="text-sm opacity-75">per hour</div>
              </div>
            ) : (
              <div className="text-sm opacity-75">
                Price on request
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Specialties */}
        {profile.specialties?.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Specialties</h3>
            <div className="flex flex-wrap gap-2">
              {profile.specialties.map(specialty => (
                <span
                  key={specialty}
                  className="px-3 py-1 bg-cyan-600/20 text-cyan-300 rounded-full text-sm font-medium"
                >
                  {specialty}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">About</h3>
            <p className="text-gray-300 leading-relaxed">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Certifications */}
        {profile.certifications?.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Certifications</h3>
            <div className="grid grid-cols-2 gap-2">
              {profile.certifications.map(cert => (
                <div
                  key={cert}
                  className="flex items-center space-x-2 text-gray-300"
                >
                  <span className="text-green-400">✓</span>
                  <span className="text-sm">{cert}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Languages and Training Locations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Languages */}
          {profile.languages?.length > 0 && (
            <div>
              <h4 className="font-semibold text-white mb-2">Languages</h4>
              <div className="flex flex-wrap gap-1">
                {profile.languages.map(language => (
                  <span
                    key={language}
                    className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs"
                  >
                    {language}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Training Locations */}
          {profile.training_locations?.length > 0 && (
            <div>
              <h4 className="font-semibold text-white mb-2">Training Options</h4>
              <div className="space-y-1">
                {profile.training_locations.map(location => (
                  <div key={location} className="flex items-center space-x-2">
                    <span className="text-cyan-400">•</span>
                    <span className="text-gray-300 text-sm">{location}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex space-x-3 pt-4 border-t border-gray-700">
          <button className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white py-3 px-4 rounded-lg font-medium transition-colors">
            Book Session
          </button>
          <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors">
            Message
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{profile.total_sessions || 0}</div>
            <div className="text-sm text-gray-400">Sessions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{profile.total_reviews || 0}</div>
            <div className="text-sm text-gray-400">Reviews</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {profile.rating ? profile.rating.toFixed(1) : '5.0'}
            </div>
            <div className="text-sm text-gray-400">Rating</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrainerProfilePreview