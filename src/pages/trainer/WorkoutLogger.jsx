import React, { useState, useEffect } from 'react'
import { Button, Card, Input, Badge, Textarea } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { supabase } from '../../supabaseClient'
import Modal from '../../components/Modal'

/**
 * Workout Logger for Trainers
 * - Log workout sessions for clients
 * - Add exercises with sets, reps, weight
 * - Session notes and client progress
 */
export default function WorkoutLogger() {
  const { user, clients = [] } = useApp()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedClient, setSelectedClient] = useState(null)
  const [showNewSession, setShowNewSession] = useState(false)

  // New session form state
  const [sessionForm, setSessionForm] = useState({
    client_id: '',
    session_type: 'training',
    duration: '',
    date: new Date().toISOString().slice(0, 16), // datetime-local format
    notes: '',
    exercises: []
  })

  // Exercise form state
  const [exerciseForm, setExerciseForm] = useState({
    name: '',
    sets: [{ reps: '', weight: '', notes: '' }]
  })

  useEffect(() => {
    loadSessions()
  }, [user?.id])

  const loadSessions = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('workout_sessions')
        .select(`
          *,
          client:client_id(id, name, email),
          exercises:workout_exercises(*)
        `)
        .eq('trainer_id', user.id)
        .order('session_date', { ascending: false })
      
      if (error) throw error
      setSessions(data || [])
    } catch (err) {
      console.error('Error loading sessions:', err)
      setError('Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  const saveSession = async () => {
    if (!sessionForm.client_id || !sessionForm.duration) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      setError('')

      // Insert workout session
      const { data: sessionData, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          trainer_id: user.id,
          client_id: sessionForm.client_id,
          session_type: sessionForm.session_type,
          duration: parseInt(sessionForm.duration),
          session_date: new Date(sessionForm.date).toISOString(),
          notes: sessionForm.notes,
          status: 'completed'
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      // Insert exercises
      if (sessionForm.exercises.length > 0) {
        const exerciseData = sessionForm.exercises.map(exercise => ({
          session_id: sessionData.id,
          exercise_name: exercise.name,
          sets_data: exercise.sets
        }))

        const { error: exerciseError } = await supabase
          .from('workout_exercises')
          .insert(exerciseData)

        if (exerciseError) throw exerciseError
      }

      // Reload sessions
      await loadSessions()
      
      // Reset form
      setSessionForm({
        client_id: '',
        session_type: 'training',
        duration: '',
        date: new Date().toISOString().slice(0, 16),
        notes: '',
        exercises: []
      })
      setShowNewSession(false)
      
    } catch (err) {
      console.error('Error saving session:', err)
      setError('Failed to save session')
    } finally {
      setLoading(false)
    }
  }

  const addExercise = () => {
    if (!exerciseForm.name) return
    
    setSessionForm(prev => ({
      ...prev,
      exercises: [...prev.exercises, { ...exerciseForm }]
    }))
    
    setExerciseForm({
      name: '',
      sets: [{ reps: '', weight: '', notes: '' }]
    })
  }

  const addSet = () => {
    setExerciseForm(prev => ({
      ...prev,
      sets: [...prev.sets, { reps: '', weight: '', notes: '' }]
    }))
  }

  const updateSet = (index, field, value) => {
    setExerciseForm(prev => ({
      ...prev,
      sets: prev.sets.map((set, i) => 
        i === index ? { ...set, [field]: value } : set
      )
    }))
  }

  const removeExercise = (index) => {
    setSessionForm(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
    }))
  }

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Header */}
      <Card
        title="Workout Sessions"
        subtitle="Log and manage your client workouts"
        style={{ position: 'sticky', top: 64, zIndex: 10 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input 
              placeholder="Search sessions..."
              style={{ minWidth: 250 }}
            />
            <select style={{ 
              background: 'rgba(18,21,27,.96)', 
              border: '1px solid rgba(255,255,255,.18)', 
              borderRadius: 8, 
              color: '#fff', 
              padding: '8px 12px' 
            }}>
              <option value="">All Clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>
          <Button onClick={() => setShowNewSession(true)} disabled={loading}>
            New Session
          </Button>
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

      {/* Sessions List */}
      <div style={{ display: 'grid', gap: 12 }}>
        {loading ? (
          <Card>
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
              Loading sessions...
            </div>
          </Card>
        ) : sessions.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
              No sessions logged yet. Start by creating your first workout session!
            </div>
          </Card>
        ) : (
          sessions.map(session => (
            <Card key={session.id}>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18 }}>{session.client?.name || 'Unknown Client'}</h3>
                    <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                      <Badge tone="neutral">
                        {new Date(session.session_date).toLocaleDateString()}
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
                    <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Session Notes</div>
                    <div>{session.notes}</div>
                  </div>
                )}

                {session.exercises && session.exercises.length > 0 && (
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Exercises</div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {session.exercises.map((exercise, idx) => (
                        <div key={idx} style={{ 
                          background: 'rgba(255,255,255,.04)', 
                          borderRadius: 6, 
                          padding: 10 
                        }}>
                          <div style={{ fontWeight: 500, marginBottom: 6 }}>{exercise.exercise_name}</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
                            {exercise.sets_data?.map((set, setIdx) => (
                              <span key={setIdx} style={{ 
                                background: 'rgba(6,182,212,.15)', 
                                padding: '2px 6px', 
                                borderRadius: 4 
                              }}>
                                {set.reps} reps {set.weight && `@ ${set.weight}kg`}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* New Session Modal */}
      <Modal 
        open={showNewSession} 
        onClose={() => setShowNewSession(false)}
        title="Log New Workout Session"
        size="large"
      >
        <div style={{ display: 'grid', gap: 16, padding: 16 }}>
          {/* Basic Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Client *</label>
              <select 
                value={sessionForm.client_id}
                onChange={(e) => setSessionForm(prev => ({ ...prev, client_id: e.target.value }))}
                style={{ 
                  width: '100%',
                  background: 'rgba(18,21,27,.96)', 
                  border: '1px solid rgba(255,255,255,.18)', 
                  borderRadius: 8, 
                  color: '#fff', 
                  padding: '10px 12px' 
                }}
              >
                <option value="">Select client...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Session Type</label>
              <select
                value={sessionForm.session_type}
                onChange={(e) => setSessionForm(prev => ({ ...prev, session_type: e.target.value }))}
                style={{ 
                  width: '100%',
                  background: 'rgba(18,21,27,.96)', 
                  border: '1px solid rgba(255,255,255,.18)', 
                  borderRadius: 8, 
                  color: '#fff', 
                  padding: '10px 12px' 
                }}
              >
                <option value="training">Training Session</option>
                <option value="assessment">Assessment</option>
                <option value="consultation">Consultation</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Duration (minutes) *"
              type="number"
              value={sessionForm.duration}
              onChange={(e) => setSessionForm(prev => ({ ...prev, duration: e.target.value }))}
              placeholder="60"
            />
            <Input
              label="Date & Time *"
              type="datetime-local"
              value={sessionForm.date}
              onChange={(e) => setSessionForm(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>

          <Textarea
            label="Session Notes"
            value={sessionForm.notes}
            onChange={(e) => setSessionForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="How did the session go? Any observations or feedback..."
            rows={3}
          />

          {/* Exercises */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Exercises</h3>
              <Badge>{sessionForm.exercises.length} added</Badge>
            </div>

            {/* Exercise Form */}
            <Card subtitle="Add Exercise">
              <div style={{ display: 'grid', gap: 12 }}>
                <Input
                  label="Exercise Name"
                  value={exerciseForm.name}
                  onChange={(e) => setExerciseForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Bench Press, Squats, Deadlifts..."
                />

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ fontSize: 14 }}>Sets</label>
                    <Button size="sm" onClick={addSet}>Add Set</Button>
                  </div>
                  
                  {exerciseForm.sets.map((set, idx) => (
                    <div key={idx} style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '80px 80px 1fr auto', 
                      gap: 8, 
                      marginBottom: 8,
                      alignItems: 'end'
                    }}>
                      <Input
                        label={idx === 0 ? "Reps" : ""}
                        type="number"
                        value={set.reps}
                        onChange={(e) => updateSet(idx, 'reps', e.target.value)}
                        placeholder="12"
                      />
                      <Input
                        label={idx === 0 ? "Weight (kg)" : ""}
                        type="number"
                        step="0.5"
                        value={set.weight}
                        onChange={(e) => updateSet(idx, 'weight', e.target.value)}
                        placeholder="50"
                      />
                      <Input
                        label={idx === 0 ? "Notes" : ""}
                        value={set.notes}
                        onChange={(e) => updateSet(idx, 'notes', e.target.value)}
                        placeholder="RPE 8, good form"
                      />
                      {exerciseForm.sets.length > 1 && (
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          onClick={() => setExerciseForm(prev => ({
                            ...prev,
                            sets: prev.sets.filter((_, i) => i !== idx)
                          }))}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <Button onClick={addExercise} disabled={!exerciseForm.name}>
                  Add Exercise
                </Button>
              </div>
            </Card>

            {/* Added Exercises */}
            {sessionForm.exercises.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 14, marginBottom: 8 }}>Added Exercises:</div>
                {sessionForm.exercises.map((exercise, idx) => (
                  <div key={idx} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: 'rgba(255,255,255,.06)', 
                    borderRadius: 6, 
                    padding: 8, 
                    marginBottom: 4 
                  }}>
                    <div>
                      <span style={{ fontWeight: 500 }}>{exercise.name}</span>
                      <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>
                        {exercise.sets.length} sets
                      </span>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => removeExercise(idx)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.12)' }}>
            <Button variant="secondary" onClick={() => setShowNewSession(false)}>
              Cancel
            </Button>
            <Button onClick={saveSession} disabled={loading}>
              {loading ? 'Saving...' : 'Save Session'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}