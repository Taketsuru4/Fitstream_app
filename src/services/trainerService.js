import { supabase } from '../supabaseClient'

// Service for managing trainer discovery and profile operations
export class TrainerService {
  // Fetch trainers with filtering, sorting, and search
  static async discoverTrainers({
    search = '',
    specialties = [],
    location = '',
    minRating = 0,
    maxPrice = null,
    minPrice = null,
    sortBy = 'rating', // 'rating', 'price_asc', 'price_desc', 'experience', 'recent'
    limit = 50,
    offset = 0
  } = {}) {
    try {
      let query = supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          bio,
          avatar_url,
          location,
          specialties,
          hourly_rate,
          currency,
          years_experience,
          certifications,
          languages,
          training_locations,
          rating,
          total_reviews,
          total_sessions,
          profile_completion,
          created_at
        `)
        .eq('role', 'trainer')
        .gte('profile_completion', 30) // Only show trainers with reasonable profile completion

      // Apply search filter
      if (search.trim()) {
        const searchTerm = search.trim().toLowerCase()
        query = query.or(`
          full_name.ilike.%${searchTerm}%,
          bio.ilike.%${searchTerm}%,
          location.ilike.%${searchTerm}%
        `)
      }

      // Apply location filter
      if (location.trim()) {
        query = query.ilike('location', `%${location.trim()}%`)
      }

      // Apply rating filter
      if (minRating > 0) {
        query = query.gte('rating', minRating)
      }

      // Apply price filters
      if (minPrice !== null) {
        query = query.gte('hourly_rate', minPrice)
      }
      if (maxPrice !== null) {
        query = query.lte('hourly_rate', maxPrice)
      }

      // Apply sorting
      switch (sortBy) {
        case 'price_asc':
          query = query.order('hourly_rate', { ascending: true, nullsLast: true })
          break
        case 'price_desc':
          query = query.order('hourly_rate', { ascending: false, nullsLast: true })
          break
        case 'experience':
          query = query.order('years_experience', { ascending: false, nullsLast: true })
          break
        case 'recent':
          query = query.order('created_at', { ascending: false })
          break
        case 'rating':
        default:
          query = query.order('rating', { ascending: false, nullsLast: true })
          break
      }

      // Apply pagination
      if (offset > 0) {
        query = query.range(offset, offset + limit - 1)
      } else {
        query = query.limit(limit)
      }

      const { data: trainers, error, count } = await query

      if (error) throw error

      // Filter by specialties in memory (since PostgreSQL array operations can be complex)
      let filteredTrainers = trainers || []
      
      if (specialties.length > 0) {
        filteredTrainers = filteredTrainers.filter(trainer => {
          return specialties.some(specialty => 
            trainer.specialties?.includes(specialty)
          )
        })
      }

      // Transform data to match UI expectations
      const transformedTrainers = filteredTrainers.map(trainer => ({
        id: trainer.id,
        name: trainer.full_name || 'Unnamed Trainer',
        photo: trainer.avatar_url || '/placeholder-trainer.png',
        specialties: trainer.specialties || [],
        rating: trainer.rating || 0,
        reviews: trainer.total_reviews || 0,
        sessions: trainer.total_sessions || 0,
        location: trainer.location || 'Location not specified',
        remote: trainer.training_locations?.includes('Online Sessions') || false,
        price: trainer.hourly_rate || 0,
        currency: trainer.currency || 'EUR',
        bio: trainer.bio || 'No bio available',
        experience: trainer.years_experience || 0,
        certifications: trainer.certifications || [],
        languages: trainer.languages || [],
        profileCompletion: trainer.profile_completion || 0,
        joinedAt: trainer.created_at
      }))

      return {
        trainers: transformedTrainers,
        total: count || transformedTrainers.length,
        hasMore: transformedTrainers.length === limit
      }

    } catch (error) {
      console.error('Error fetching trainers:', error)
      throw error
    }
  }

  // Get single trainer profile by ID
  static async getTrainerProfile(trainerId) {
    try {
      const { data: trainer, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          bio,
          avatar_url,
          phone,
          location,
          specialties,
          hourly_rate,
          currency,
          years_experience,
          certifications,
          languages,
          training_locations,
          rating,
          total_reviews,
          total_sessions,
          profile_completion,
          is_verified,
          created_at,
          updated_at
        `)
        .eq('id', trainerId)
        .eq('role', 'trainer')
        .single()

      if (error) throw error
      if (!trainer) throw new Error('Trainer not found')

      return {
        id: trainer.id,
        name: trainer.full_name || 'Unnamed Trainer',
        email: trainer.email,
        photo: trainer.avatar_url || '/placeholder-trainer.png',
        bio: trainer.bio || '',
        phone: trainer.phone || '',
        location: trainer.location || '',
        specialties: trainer.specialties || [],
        hourlyRate: trainer.hourly_rate || 0,
        currency: trainer.currency || 'EUR',
        experience: trainer.years_experience || 0,
        certifications: trainer.certifications || [],
        languages: trainer.languages || [],
        trainingLocations: trainer.training_locations || [],
        rating: trainer.rating || 0,
        totalReviews: trainer.total_reviews || 0,
        totalSessions: trainer.total_sessions || 0,
        profileCompletion: trainer.profile_completion || 0,
        isVerified: trainer.is_verified || false,
        joinedAt: trainer.created_at,
        updatedAt: trainer.updated_at
      }

    } catch (error) {
      console.error('Error fetching trainer profile:', error)
      throw error
    }
  }

  // Get all unique specialties from trainers
  static async getAvailableSpecialties() {
    try {
      const { data, error } = await supabase
        .from('trainer_specialties')
        .select('name, category, description')
        .order('name')

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching specialties:', error)
      // Fallback to common specialties if database query fails
      return [
        'Strength Training', 'Weight Loss', 'Muscle Gain', 'Cardio Training', 'HIIT',
        'Yoga', 'Pilates', 'CrossFit', 'Powerlifting', 'Olympic Lifting',
        'Bodybuilding', 'Functional Training', 'Sports Conditioning', 'Rehabilitation'
      ].map(name => ({ name, category: 'General', description: '' }))
    }
  }

  // Get trainer statistics for discovery page
  static async getTrainerStats() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, hourly_rate, rating, total_reviews, specialties')
        .eq('role', 'trainer')
        .gte('profile_completion', 30)

      if (error) throw error

      const trainers = data || []
      const totalTrainers = trainers.length
      const avgPrice = trainers
        .filter(t => t.hourly_rate > 0)
        .reduce((sum, t) => sum + t.hourly_rate, 0) / trainers.filter(t => t.hourly_rate > 0).length
      
      const avgRating = trainers
        .filter(t => t.rating > 0)
        .reduce((sum, t) => sum + t.rating, 0) / trainers.filter(t => t.rating > 0).length

      const totalReviews = trainers.reduce((sum, t) => sum + (t.total_reviews || 0), 0)

      // Get most popular specialties
      const specialtyCount = {}
      trainers.forEach(trainer => {
        (trainer.specialties || []).forEach(specialty => {
          specialtyCount[specialty] = (specialtyCount[specialty] || 0) + 1
        })
      })

      const popularSpecialties = Object.entries(specialtyCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }))

      return {
        totalTrainers,
        avgPrice: avgPrice || 0,
        avgRating: avgRating || 0,
        totalReviews,
        popularSpecialties
      }

    } catch (error) {
      console.error('Error fetching trainer stats:', error)
      return {
        totalTrainers: 0,
        avgPrice: 0,
        avgRating: 0,
        totalReviews: 0,
        popularSpecialties: []
      }
    }
  }

  // Search trainers with advanced text search
  static async searchTrainers(searchTerm, options = {}) {
    if (!searchTerm.trim()) {
      return this.discoverTrainers(options)
    }

    return this.discoverTrainers({
      ...options,
      search: searchTerm
    })
  }
}