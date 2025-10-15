import React, { useMemo, useState, useEffect } from 'react'
import { Card, Button, Input, Badge } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import { supabase } from '../../supabaseClient'
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
  AreaChart, Area,
} from 'recharts'

/**
 * Client Progress — mobile‑first, Recharts powered
 * - Weight trend (Area)
 * - Personal Records (Bar)
 * - Weekly activity (Line)
 * - Quick add weight entry (local state -> context if available)
 */
export default function Progress(){
  const { progress: ctxProgress = {}, setProgress, user } = useApp?.() || {}
  const [workoutStats, setWorkoutStats] = useState(null)
  const [exerciseProgress, setExerciseProgress] = useState({})
  const [loading, setLoading] = useState(false)

  // Load workout stats on mount
  useEffect(() => {
    loadWorkoutStats()
  }, [user?.id])

  const loadWorkoutStats = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      
      // Get client workout statistics
      const { data: stats, error: statsError } = await supabase
        .rpc('get_client_workout_stats', { client_uuid: user.id })
      
      if (statsError) throw statsError
      if (stats && stats.length > 0) {
        setWorkoutStats(stats[0])
      }
      
      // Get recent workout sessions for weekly data
      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('session_date, duration, exercises:workout_exercises(exercise_name, sets_data)')
        .eq('client_id', user.id)
        .eq('status', 'completed')
        .gte('session_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days
        .order('session_date', { ascending: true })
      
      if (sessionsError) throw sessionsError
      
      // Transform sessions data for charts
      if (sessions && sessions.length > 0) {
        // Weekly session counts
        const weeklyMap = new Map()
        sessions.forEach(session => {
          const date = new Date(session.session_date)
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()))
          const weekKey = weekStart.toISOString().slice(0, 10)
          
          weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + 1)
        })
        
        const weeklyData = Array.from(weeklyMap.entries())
          .map(([d, sessions]) => ({ d, sessions }))
          .slice(-8) // Last 8 weeks
        
        // Exercise progress - get top exercises
        const exerciseData = {}
        sessions.forEach(session => {
          session.exercises?.forEach(exercise => {
            if (!exerciseData[exercise.exercise_name]) {
              exerciseData[exercise.exercise_name] = []
            }
            
            // Find max weight for this exercise in this session
            const maxWeight = Math.max(...(exercise.sets_data?.map(set => parseFloat(set.weight) || 0) || [0]))
            if (maxWeight > 0) {
              exerciseData[exercise.exercise_name].push({
                d: session.session_date.slice(0, 10),
                kg: maxWeight
              })
            }
          })
        })
        
        // Keep only exercises with multiple data points
        Object.keys(exerciseData).forEach(exerciseName => {
          if (exerciseData[exerciseName].length < 2) {
            delete exerciseData[exerciseName]
          } else {
            exerciseData[exerciseName].sort((a, b) => new Date(a.d) - new Date(b.d))
          }
        })
        
        setExerciseProgress({ weekly: weeklyData, exercises: exerciseData })
      }
      
    } catch (err) {
      console.error('Error loading workout stats:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fallback demo data if context empty
  const demo = {
    weight: [
      { d: '2025-07-01', kg: 83.6 }, { d: '2025-07-08', kg: 83.2 }, { d: '2025-07-15', kg: 82.8 },
      { d: '2025-07-22', kg: 82.5 }, { d: '2025-07-29', kg: 82.4 }, { d: '2025-08-05', kg: 82.0 },
    ],
    prs: [
      { lift: 'Squat', kg: 140 }, { lift: 'Bench', kg: 100 }, { lift: 'Deadlift', kg: 180 }, { lift: 'OHP', kg: 65 }
    ],
    weekly: [
      { w: 'W26', sessions: 3 }, { w: 'W27', sessions: 4 }, { w: 'W28', sessions: 4 }, { w: 'W29', sessions: 5 }, { w: 'W30', sessions: 4 }
    ],
  }

  const data = {
    weight: ctxProgress?.weight?.length ? ctxProgress.weight : demo.weight,
    prs: ctxProgress?.prs?.length ? ctxProgress.prs : demo.prs,
    weekly: exerciseProgress?.weekly?.length ? exerciseProgress.weekly.map(w => ({ w: `W${Math.ceil((new Date(w.d) - new Date(new Date().getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000))}`, sessions: w.sessions })) : demo.weekly,
  }

  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0,10))
  const [newKg, setNewKg] = useState('')

  const addWeight = () => {
    const kg = Number(newKg)
    if (!kg || Number.isNaN(kg)) return alert('Enter a valid weight (kg)')
    const entry = { d: newDate, kg }
    if (setProgress) {
      setProgress((p) => ({ ...p, weight: [...(p?.weight || data.weight), entry] }))
    } else {
      // fallback local push when no context setter is present
      data.weight.push(entry)
    }
    setNewKg('')
  }

  const delta = useMemo(() => {
    if (data.weight.length < 2) return 0
    const first = data.weight[0].kg
    const last = data.weight[data.weight.length - 1].kg
    return +(last - first).toFixed(1)
  }, [data.weight])

  return (
    <div style={{ display:'grid', gap:16 }}>
      {/* Workout Stats Summary */}
      {workoutStats && (
        <Card title="Workout Overview" subtitle="Your training journey so far">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
            <div style={{ textAlign: 'center', padding: 12, background: 'rgba(6,182,212,.1)', borderRadius: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: '#06b6d4' }}>{workoutStats.total_sessions}</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>Total Sessions</div>
            </div>
            <div style={{ textAlign: 'center', padding: 12, background: 'rgba(16,185,129,.1)', borderRadius: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: '#10b981' }}>{Math.round(workoutStats.total_minutes / 60)}h</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>Time Trained</div>
            </div>
            <div style={{ textAlign: 'center', padding: 12, background: 'rgba(99,102,241,.1)', borderRadius: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: '#6366f1' }}>{workoutStats.unique_exercises}</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>Exercises</div>
            </div>
            <div style={{ textAlign: 'center', padding: 12, background: 'rgba(245,158,11,.1)', borderRadius: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: '#f59e0b' }}>{Math.round(workoutStats.avg_session_duration)}min</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>Avg Session</div>
            </div>
            <div style={{ textAlign: 'center', padding: 12, background: 'rgba(239,68,68,.1)', borderRadius: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: '#ef4444' }}>{workoutStats.recent_sessions}</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>This Month</div>
            </div>
          </div>
        </Card>
      )}
      {/* Weight trend */}
      <Card
        title={(<div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
          <span>Weight Trend</span>
          <Badge tone={delta <= 0 ? 'success' : 'warn'}>
            {delta <= 0 ? '▼' : '▲'} {Math.abs(delta)} kg
          </Badge>
        </div>)}
        subtitle="Track your progress over time"
      >
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.weight} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={.1} />
              <XAxis dataKey="d" tick={{ fill:'#9ca3af', fontSize:12 }} />
              <YAxis tick={{ fill:'#9ca3af', fontSize:12 }} width={40} />
              <Tooltip contentStyle={{ background:'rgba(18,21,27,.96)', border:'1px solid rgba(255,255,255,.12)' }} />
              <Area type="monotone" dataKey="kg" stroke="#06b6d4" fill="url(#wGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick add */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:8, marginTop:12 }}>
          <Input label="Date" type="date" value={newDate} onChange={(e)=>setNewDate(e.target.value)} />
          <Input label="Weight (kg)" type="number" placeholder="82.0" value={newKg} onChange={(e)=>setNewKg(e.target.value)} />
          <Button onClick={addWeight}>Add</Button>
        </div>
      </Card>

      {/* PRs */}
      <Card title="Personal Records" subtitle="Best lifts so far">
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.prs} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={.1} />
              <XAxis dataKey="lift" tick={{ fill:'#9ca3af', fontSize:12 }} />
              <YAxis tick={{ fill:'#9ca3af', fontSize:12 }} width={40} />
              <Tooltip contentStyle={{ background:'rgba(18,21,27,.96)', border:'1px solid rgba(255,255,255,.12)' }} />
              <Bar dataKey="kg" fill="#6366f1" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Weekly activity */}
      <Card title="Weekly Sessions" subtitle="Consistency matters">
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.weekly} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={.1} />
              <XAxis dataKey="w" tick={{ fill:'#9ca3af', fontSize:12 }} />
              <YAxis allowDecimals={false} tick={{ fill:'#9ca3af', fontSize:12 }} width={28} />
              <Tooltip contentStyle={{ background:'rgba(18,21,27,.96)', border:'1px solid rgba(255,255,255,.12)' }} />
              <Line type="monotone" dataKey="sessions" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      
      {/* Exercise Strength Progress */}
      {exerciseProgress?.exercises && Object.keys(exerciseProgress.exercises).length > 0 && (
        <div>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>Strength Progress</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16 }}>
            {Object.entries(exerciseProgress.exercises).slice(0, 4).map(([exerciseName, progressData]) => (
              <Card key={exerciseName} title={exerciseName} subtitle="Weight progression over time">
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={.1} />
                      <XAxis dataKey="d" tick={{ fill:'#9ca3af', fontSize:11 }} />
                      <YAxis tick={{ fill:'#9ca3af', fontSize:11 }} width={35} />
                      <Tooltip 
                        contentStyle={{ background:'rgba(18,21,27,.96)', border:'1px solid rgba(255,255,255,.12)' }}
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={(value) => [`${value}kg`, 'Max Weight']}
                      />
                      <Line type="monotone" dataKey="kg" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
