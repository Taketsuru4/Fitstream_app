import React, { useState, useEffect } from 'react'
import { Button, Card, Input, Badge } from '../../components/ui'
import { TrainerService } from '../../services/trainerService'
import TrainerProfileModal from '../../components/TrainerProfileModal'
import { BookingService } from '../../services/bookingService'

const currency = (n) => `€${Number(n).toFixed(2)}`

const formatTime = (t) => {
  if (!t) return ''
  // Expecting HH:MM or HH:MM:SS; display HH:MM
  const parts = String(t).split(':')
  return `${parts[0].padStart(2,'0')}:${parts[1].padStart(2,'0')}`
}

export default function Discover() {
  const [q, setQ] = useState('')
  const [activeTags, setActiveTags] = useState([])
  const [sort, setSort] = useState('rating') // rating | price-asc | price-desc | experience
  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tags, setTags] = useState([])
  const [selectedTrainer, setSelectedTrainer] = useState(null)
  const [profileModalOpen, setProfileModalOpen] = useState(false)

  // Load trainers from database
  useEffect(() => {
    loadTrainers()
  }, [])
  
  // Load trainers when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      loadTrainers()
    }, 300) // Debounce search
    
    return () => clearTimeout(timer)
  }, [q, activeTags, sort])
  
  // Removed mock trainers: always show real data from the database

  const loadTrainers = async () => {
    try {
      setLoading(true)

      // Map UI sort to service sort values
      const sortBy =
        sort === 'price-asc' ? 'price_asc' :
        sort === 'price-desc' ? 'price_desc' :
        sort === 'experience' ? 'experience' : 'rating'

      const { trainers: results } = await TrainerService.discoverTrainers({
        search: q,
        specialties: activeTags,
        sortBy,
        limit: 50
      })

      // Convert to the shape this page expects
      let trainersToShow = (results || []).map(t => ({
        id: t.id,
        full_name: t.name,
        avatar_url: t.photo,
        specialties: t.specialties,
        rating: t.rating,
        total_reviews: t.reviews,
        total_sessions: t.sessions,
        location: t.location,
        hourly_rate: t.price,
        currency: t.currency,
        bio: t.bio,
        years_experience: t.experience,
        availability: null,
        availability_preview: []
      }))

      // Fetch availability for all trainers in one query and attach
      const trainerIds = trainersToShow.map(t => t.id)
      const { data: availabilityMap } = await BookingService.getAvailabilityForTrainers(trainerIds)

      // Prepare a compact preview: up to 6 slot chips across the week
      const buildPreview = (scheduleObj) => {
        const preview = []
        if (!scheduleObj) return preview
        for (const [day, slots] of Object.entries(scheduleObj)) {
          slots.forEach(s => {
            if (preview.length < 6) {
              preview.push({ day, start: s.startTime, end: s.endTime })
            }
          })
          if (preview.length >= 6) break
        }
        return preview
      }

      trainersToShow = trainersToShow.map(t => {
        const schedule = availabilityMap?.[t.id] || null
        return {
          ...t,
          availability: schedule,
          availability_preview: buildPreview(schedule)
        }
      })

      setTrainers(trainersToShow)

      // Build tags from specialties
      const allSpecialties = new Set()
      trainersToShow.forEach(trainer => {
        trainer.specialties?.forEach(specialty => allSpecialties.add(specialty))
      })
      setTags(Array.from(allSpecialties).sort())

    } catch (error) {
      console.error('Error in loadTrainers:', error)
      setTrainers([])
      setTags([])
    } finally {
      setLoading(false)
    }
  }

  const toggleTag = (tag) => {
    setActiveTags((prev) => prev.includes(tag) ? prev.filter(t=>t!==tag) : [...prev, tag])
  }

  const openTrainerProfile = (trainer) => {
    setSelectedTrainer(trainer)
    setProfileModalOpen(true)
  }

  const closeTrainerProfile = () => {
    setSelectedTrainer(null)
    setProfileModalOpen(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Finding trainers for you...</p>
        </div>
      </div>
    )
  }

  return (
    <section>
      {/* Controls */}
      <div style={{ position:'sticky', top: 64, zIndex: 5, background:'rgba(10,10,10,.6)', backdropFilter:'blur(8px)', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:10 }}>
          <Input
            label="Search"
            placeholder="Try: strength, mobility, Athens…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            right={<span style={{ fontSize: 12, opacity: .8 }}>⌘K</span>}
          />
          <label style={{ display:'grid', gap:6 }}>
            <span style={{ fontSize: 12, color: '#cbd5e1' }}>Sort</span>
            <select
              value={sort}
              onChange={(e)=>setSort(e.target.value)}
              style={{ height: 40, borderRadius: 10, border:'1px solid rgba(255,255,255,.22)', background:'rgba(255,255,255,.08)', color:'#fff', padding:'0 10px' }}
            >
              <option value="rating">Top Rated</option>
              <option value="price-asc">Price (low → high)</option>
              <option value="price-desc">Price (high → low)</option>
              <option value="experience">Most Experience</option>
            </select>
          </label>
        </div>

        {/* Tag filters */}
        <div style={{ display:'flex', gap:8, overflowX:'auto', paddingTop:8 }}>
          {tags.map(tag => (
            <button
              key={tag}
              onClick={()=>toggleTag(tag)}
              style={{
                height:32, padding:'0 10px', borderRadius:999,
                border: activeTags.includes(tag) ? '1px solid rgba(6,182,212,.6)' : '1px solid rgba(255,255,255,.22)',
                background: activeTags.includes(tag) ? 'rgba(6,182,212,.18)' : 'rgba(255,255,255,.08)',
                color:'#fff', cursor:'pointer', whiteSpace:'nowrap'
              }}
            >{tag}</button>
          ))}
          {activeTags.length>0 && (
            <Button variant="ghost" onClick={()=>setActiveTags([])}>Clear</Button>
          )}
        </div>
      </div>

      {/* Results */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:16, marginTop:16 }}>
        {trainers.map((trainer) => (
          <Card
            key={trainer.id}
            title={(
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap:8, flexWrap:'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ fontWeight: 800, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{trainer.full_name}</span>
                  <Badge tone="neutral">★ {trainer.rating || '5.0'} ({trainer.total_reviews || 0})</Badge>
                </div>
                <div style={{ fontWeight: 800 }}>
                  {trainer.hourly_rate ? 
                    `${trainer.currency === 'USD' ? '$' : trainer.currency === 'GBP' ? '£' : '€'}${trainer.hourly_rate}` : 
                    'Contact'
                  }
                </div>
              </div>
            )}
            subtitle={`${trainer.location || 'Location TBD'}${trainer.years_experience ? ` • ${trainer.years_experience}y exp.` : ''}`}
          >
            {trainer.avatar_url ? (
              <img
                src={trainer.avatar_url}
                alt={trainer.full_name}
                style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 10, marginBottom: 10 }}
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1594737625785-c38e6c310c05?auto=format&fit=crop&w=800&q=80'
                }}
              />
            ) : (
              <div style={{ width: '100%', height: 160, background: '#374151', borderRadius: 10, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                👤
              </div>
            )}
            
            {trainer.specialties && trainer.specialties.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {trainer.specialties.slice(0, 3).map((specialty) => (
                  <Badge key={specialty}>{specialty}</Badge>
                ))}
                {trainer.specialties.length > 3 && (
                  <Badge tone="neutral">+{trainer.specialties.length - 3} more</Badge>
                )}
              </div>
            )}
            
            {trainer.bio && (
              <p style={{ color: '#cbd5e1', fontSize: 14, margin: '0 0 10px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {trainer.bio}
              </p>
            )}

            {/* Availability preview */}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Availability</div>
              {trainer.availability_preview && trainer.availability_preview.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {trainer.availability_preview.map((slot, i) => (
                    <span key={i} style={{
                      border: '1px solid rgba(255,255,255,.22)',
                      background: 'rgba(255,255,255,.08)',
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: 999,
                      fontSize: 12
                    }}>
                      {slot.day.slice(0,3)} {formatTime(slot.start)}–{formatTime(slot.end)}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#94a3b8' }}>No slots set</div>
              )}
            </div>
            
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop: 12 }}>
              <Button variant="secondary" onClick={() => openTrainerProfile(trainer)}>View Profile</Button>
              <Button onClick={() => window.location.assign(`/app/book?trainerId=${trainer.id}`)}>Book</Button>
            </div>
          </Card>
        ))}
      </div>

      {trainers.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-white mb-2">No trainers found</h3>
          <p className="text-gray-400 mb-4">
            {q || activeTags.length > 0 
              ? 'Try adjusting your search or filters' 
              : 'No trainers have completed their profiles yet'
            }
          </p>
          {(q || activeTags.length > 0) && (
            <Button variant="secondary" onClick={() => { setQ(''); setActiveTags([]) }}>
              Clear Filters
            </Button>
          )}
        </div>
      )}
      
      {/* Trainer Profile Modal */}
      <TrainerProfileModal 
        trainer={selectedTrainer}
        isOpen={profileModalOpen}
        onClose={closeTrainerProfile}
      />
    </section>
  )
}
