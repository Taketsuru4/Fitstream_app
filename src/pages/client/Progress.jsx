import React, { useMemo, useState } from 'react'
import { Card, Button, Input, Badge } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
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
  const { progress: ctxProgress = {}, setProgress } = useApp?.() || {}

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
    weekly: ctxProgress?.weekly?.length ? ctxProgress.weekly : demo.weekly,
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
    </div>
  )
}
