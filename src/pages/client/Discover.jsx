import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { Button, Card, Input, Badge } from '../../components/ui'

const currency = (n) => `€${Number(n).toFixed(2)}`

export default function Discover() {
  const [q, setQ] = useState('')
  const [activeTags, setActiveTags] = useState([])
  const [sort, setSort] = useState('rating') // rating | price-asc | price-desc | experience
  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tags, setTags] = useState([])

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
  
  // Mock trainers for testing when database is empty
  const mockTrainers = [
    {
      id: 'mock-1',
      full_name: 'Dimitris Komninos',
      bio: 'Πιστοποιημένος προπονητής με εξειδίκευση στην αύξηση μυικής μάζας και functional training. 8 χρόνια εμπειρίας με επιτυχημένα αποτελέσματα. Διαθέσιμος για online και δια ζώσης προπονήσεις στην Αθήνα.',
      avatar_url: 'https://images.unsplash.com/photo-1567013127542-490d757e51cd?auto=format&fit=crop&w=800&q=80',
      location: 'Αθήνα, Ελλάδα',
      specialties: ['Strength Training', 'Muscle Building', 'Functional Training', 'Weight Loss'],
      hourly_rate: 45,
      currency: 'EUR',
      years_experience: 8,
      rating: 4.8,
      total_reviews: 42,
      total_sessions: 156,
      profile_completion: 95
    },
    {
      id: 'mock-2', 
      full_name: 'Maria Papadopoulou',
      bio: 'Yoga και Pilates instructor με passion για την ευεξία. Εξειδικεύομαι σε stress management και flexibility training. 5 χρόνια εμπειρίας με holistic προσέγγιση.',
      avatar_url: 'https://images.unsplash.com/photo-1599058917212-d750089bc07f?auto=format&fit=crop&w=800&q=80',
      location: 'Θεσσαλονίκη, Ελλάδα',
      specialties: ['Yoga', 'Pilates', 'Flexibility', 'Stress Management'],
      hourly_rate: 35,
      currency: 'EUR',
      years_experience: 5,
      rating: 4.9,
      total_reviews: 28,
      total_sessions: 89,
      profile_completion: 88
    },
    {
      id: 'mock-3',
      full_name: 'Alex Johnson',
      bio: 'HIIT and cardio specialist focused on fat loss and athletic performance. International experience with top-tier athletes. Available for online sessions worldwide.',
      avatar_url: 'https://images.unsplash.com/photo-1594737625785-c38e6c310c05?auto=format&fit=crop&w=800&q=80',
      location: 'London, UK',
      specialties: ['HIIT', 'Cardio', 'Weight Loss', 'Athletic Performance'],
      hourly_rate: 65,
      currency: 'EUR',
      years_experience: 12,
      rating: 4.7,
      total_reviews: 156,
      total_sessions: 340,
      profile_completion: 92
    }
  ]

  const loadTrainers = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'trainer')
        .gte('profile_completion', 10)
      
      // Apply search filter
      if (q.trim()) {
        query = query.or(`full_name.ilike.%${q.trim()}%,location.ilike.%${q.trim()}%,bio.ilike.%${q.trim()}%`)
      }
      
      // Apply specialty filter
      if (activeTags.length > 0) {
        // Filter trainers that have ALL selected specialties
        const specialtyFilters = activeTags.map(tag => `specialties.cs.{"${tag}"}`)
        query = query.and(specialtyFilters.join(','))
      }
      
      // Apply sorting
      switch (sort) {
        case 'price-asc':
          query = query.order('hourly_rate', { ascending: true, nullsLast: true })
          break
        case 'price-desc':
          query = query.order('hourly_rate', { ascending: false, nullsLast: true })
          break
        case 'experience':
          query = query.order('years_experience', { ascending: false, nullsLast: true })
          break
        case 'rating':
        default:
          query = query.order('rating', { ascending: false })
          break
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('Error loading trainers:', error)
        // Use mock data if database fails
        setTrainers(mockTrainers)
        const allSpecialties = new Set()
        mockTrainers.forEach(trainer => {
          trainer.specialties?.forEach(specialty => allSpecialties.add(specialty))
        })
        setTags(Array.from(allSpecialties).sort())
        return
      }
      
      // If no trainers in database, use mock data for demo
      let trainersToShow = data && data.length > 0 ? data : mockTrainers
      setTrainers(trainersToShow)
      
      // Build tags from all trainers' specialties
      const allSpecialties = new Set()
      trainersToShow?.forEach(trainer => {
        trainer.specialties?.forEach(specialty => allSpecialties.add(specialty))
      })
      setTags(Array.from(allSpecialties).sort())
      
    } catch (error) {
      console.error('Error in loadTrainers:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleTag = (tag) => {
    setActiveTags((prev) => prev.includes(tag) ? prev.filter(t=>t!==tag) : [...prev, tag])
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
            
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop: 12 }}>
              <Button variant="secondary" onClick={() => alert(`Viewing ${trainer.full_name}`)}>View Profile</Button>
              <Button onClick={() => window.location.assign('/app/book')}>Book</Button>
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
    </section>
  )
}
