import React, { useState, useEffect, useMemo } from 'react'
import { Button, Card, Input, Badge } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { supabase } from '../../supabaseClient'
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar
} from 'recharts'

/**
 * Workout History for Clients
 * - View past workout sessions
 * - Track exercise progress over time
 * - Session details and notes from trainer
 */
export default function WorkoutHistory() {
  const { user } = useApp()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedSession, setSelectedSession] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    loadWorkoutHistory()
  }, [user?.id])

  const loadWorkoutHistory = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('workout_sessions')
        .select(`
          *,
          trainer:trainer_id(id, name, email),
          exercises:workout_exercises(*)
        `)
        .eq('client_id', user.id)
        .order('session_date', { ascending: false })
      
      if (error) throw error
      setSessions(data || [])
    } catch (err) {
      console.error('Error loading workout history:', err)
      setError('Failed to load workout history')
    } finally {
      setLoading(false)
    }
  }

  // Filter and search sessions
  const filteredSessions = useMemo(() => {
    let filtered = sessions

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(session => session.session_type === filterType)
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(session => 
        session.notes?.toLowerCase().includes(query) ||
        session.trainer?.name?.toLowerCase().includes(query) ||
        session.exercises?.some(ex => ex.exercise_name?.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [sessions, filterType, searchQuery])

  // Progress analytics
  const progressData = useMemo(() => {
    if (sessions.length === 0) return { weekly: [], exercises: {} }

    // Weekly session count
    const weeklyMap = new Map()
    sessions.forEach(session => {
      const date = new Date(session.session_date)
      const weekStart = new Date(date.setDate(date.getDate() - date.getDay()))
      const weekKey = weekStart.toISOString().slice(0, 10)
      
      weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + 1)
    })

    const weekly = Array.from(weeklyMap.entries())
      .map(([date, count]) => ({ date, sessions: count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-8) // Last 8 weeks

    // Exercise progress (weight progression for common exercises)
    const exercises = {}
    sessions.forEach(session => {
      session.exercises?.forEach(exercise => {
        if (!exercises[exercise.exercise_name]) {
          exercises[exercise.exercise_name] = []
        }
        
        // Find max weight for this exercise in this session
        const maxWeight = Math.max(...(exercise.sets_data?.map(set => parseFloat(set.weight) || 0) || [0]))
        if (maxWeight > 0) {
          exercises[exercise.exercise_name].push({
            date: session.session_date,
            weight: maxWeight
          })
        }
      })
    })

    // Keep only exercises with multiple data points and sort by date
    Object.keys(exercises).forEach(exerciseName => {
      if (exercises[exerciseName].length < 2) {
        delete exercises[exerciseName]
      } else {
        exercises[exerciseName].sort((a, b) => new Date(a.date) - new Date(b.date))
      }
    })

    return { weekly, exercises }
  }, [sessions])

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const getTotalStats = () => {
    const totalSessions = sessions.length
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0)
    const uniqueExercises = new Set(sessions.flatMap(s => s.exercises?.map(e => e.exercise_name) || [])).size
    
    return { totalSessions, totalMinutes, uniqueExercises }
  }

  const stats = getTotalStats()

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Header & Stats */}
      <Card
        title="Workout History"
        subtitle="Track your fitness journey"
        style={{ position: 'sticky', top: 64, zIndex: 10 }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div style={{ textAlign: 'center', padding: 12, background: 'rgba(6,182,212,.1)', borderRadius: 8 }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#06b6d4' }}>{stats.totalSessions}</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>Total Sessions</div>
          </div>
          <div style={{ textAlign: 'center', padding: 12, background: 'rgba(16,185,129,.1)', borderRadius: 8 }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#10b981' }}>{Math.round(stats.totalMinutes / 60)}h</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>Time Trained</div>
          </div>
          <div style={{ textAlign: 'center', padding: 12, background: 'rgba(99,102,241,.1)', borderRadius: 8 }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#6366f1' }}>{stats.uniqueExercises}</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>Unique Exercises</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Input
            placeholder="Search sessions, exercises, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ minWidth: 250 }}
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ 
              background: 'rgba(18,21,27,.96)', 
              border: '1px solid rgba(255,255,255,.18)', 
              borderRadius: 8, 
              color: '#fff', 
              padding: '8px 12px' 
            }}
          >
            <option value="all">All Sessions</option>
            <option value="training">Training</option>
            <option value="assessment">Assessment</option>
            <option value="consultation">Consultation</option>
          </select>
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.3)', 
            borderRadius: 8, 
            padding: 12, 
            marginTop: 12, 
            color: '#fca5a5' 
          }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Error</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>{error}</div>
          </div>
        )}
      </Card>

      {/* Progress Charts */}
      {progressData.weekly.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16 }}>
          {/* Weekly Sessions */}
          <Card title="Weekly Sessions" subtitle="Your training consistency">
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progressData.weekly} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#9ca3af', fontSize: 12 }} width={30} />
                  <Tooltip contentStyle={{ background: 'rgba(18,21,27,.96)', border: '1px solid rgba(255,255,255,.12)' }} />
                  <Bar dataKey="sessions" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Exercise Progress */}
          {Object.keys(progressData.exercises).length > 0 && (
            <Card title="Strength Progress" subtitle="Weight progression over time">
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={Object.values(progressData.exercises)[0]} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} width={40} />
                    <Tooltip contentStyle={{ background: 'rgba(18,21,27,.96)', border: '1px solid rgba(255,255,255,.12)' }} />
                    <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
                Showing: {Object.keys(progressData.exercises)[0]}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Session History */}
      <div style={{ display: 'grid', gap: 12 }}>
        {loading ? (
          <Card>
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
              Loading workout history...
            </div>
          </Card>
        ) : filteredSessions.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
              {sessions.length === 0 
                ? "No workout sessions yet. Your trainer will log sessions here after each training!"
                : "No sessions match your search criteria."
              }
            </div>
          </Card>
        ) : (
          filteredSessions.map(session => (
            <Card key={session.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedSession(session)}>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18 }}>
                      Session with {session.trainer?.name || 'Trainer'}
                    </h3>
                    <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                      <Badge tone="neutral">
                        {new Date(session.session_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </Badge>
                      <Badge tone="success">
                        {formatDuration(session.duration)}
                      </Badge>
                      <Badge tone="info">
                        {session.session_type}
                      </Badge>
                      <Badge>
                        {session.exercises?.length || 0} exercises
                      </Badge>
                    </div>
                  </div>
                </div>

                {session.notes && (
                  <div style={{ 
                    background: 'rgba(255,255,255,.06)', 
                    borderRadius: 8, 
                    padding: 12 
                  }}>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Trainer Notes</div>
                    <div style={{ fontSize: 14 }}>{session.notes}</div>
                  </div>
                )}

                {session.exercises && session.exercises.length > 0 && (
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Exercises ({session.exercises.length})</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {session.exercises.slice(0, 3).map((exercise, idx) => (
                        <div key={idx} style={{ 
                          background: 'rgba(255,255,255,.04)', 
                          borderRadius: 6, 
                          padding: '6px 10px',
                          fontSize: 12
                        }}>
                          {exercise.exercise_name}
                          {exercise.sets_data && exercise.sets_data.length > 0 && (
                            <span style={{ color: '#9ca3af', marginLeft: 4 }}>
                              ({exercise.sets_data.length} sets)
                            </span>
                          )}
                        </div>
                      ))}
                      {session.exercises.length > 3 && (
                        <div style={{ 
                          background: 'rgba(255,255,255,.04)', 
                          borderRadius: 6, 
                          padding: '6px 10px',
                          fontSize: 12,
                          color: '#9ca3af'
                        }}>
                          +{session.exercises.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Session Detail Modal */}
      {selectedSession && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }} onClick={() => setSelectedSession(null)}>
          <div style={{
            background: 'rgba(16,19,25,.96)',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,.08)',
            maxWidth: 600,
            maxHeight: '80vh',
            overflow: 'auto',
            padding: 16,
            width: '100%'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Session Details</h2>
              <Button variant="secondary" onClick={() => setSelectedSession(null)}>×</Button>
            </div>

            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                  <Badge tone="neutral">
                    {new Date(selectedSession.session_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Badge>
                  <Badge tone="success">{formatDuration(selectedSession.duration)}</Badge>
                  <Badge tone="info">{selectedSession.session_type}</Badge>
                </div>
                <p style={{ color: '#9ca3af', margin: 0 }}>
                  Trainer: {selectedSession.trainer?.name || 'Unknown'}
                </p>
              </div>

              {selectedSession.notes && (
                <div style={{ 
                  background: 'rgba(255,255,255,.06)', 
                  borderRadius: 8, 
                  padding: 12 
                }}>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Trainer Notes</div>
                  <div>{selectedSession.notes}</div>
                </div>
              )}

              {selectedSession.exercises && selectedSession.exercises.length > 0 && (
                <div>
                  <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>
                    Exercises ({selectedSession.exercises.length})
                  </div>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {selectedSession.exercises.map((exercise, idx) => (
                      <div key={idx} style={{ 
                        background: 'rgba(255,255,255,.04)', 
                        borderRadius: 8, 
                        padding: 12 
                      }}>
                        <div style={{ fontWeight: 500, marginBottom: 8 }}>{exercise.exercise_name}</div>
                        {exercise.sets_data && exercise.sets_data.length > 0 && (
                          <div style={{ display: 'grid', gap: 4 }}>
                            {exercise.sets_data.map((set, setIdx) => (
                              <div key={setIdx} style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                fontSize: 12,
                                padding: '4px 0',
                                borderBottom: setIdx < exercise.sets_data.length - 1 ? '1px solid rgba(255,255,255,.06)' : 'none'
                              }}>
                                <span>Set {setIdx + 1}</span>
                                <span>
                                  {set.reps} reps
                                  {set.weight && ` @ ${set.weight}kg`}
                                  {set.notes && (
                                    <span style={{ color: '#9ca3af', marginLeft: 8 }}>({set.notes})</span>
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}