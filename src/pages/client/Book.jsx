import React, { useMemo, useState } from 'react'
import { useApp } from '../../context/appContext'
import { Button, Card, Input, Badge } from '../../components/ui'

const currency = (n) => `€${Number(n || 0).toFixed(2)}`

export default function Book() {
  const { TRAINERS, addBooking, pay, bookings } = useApp()

  const [trainerId, setTrainerId] = useState(TRAINERS[0]?.id || '')
  const trainer = useMemo(() => TRAINERS.find(t => t.id === trainerId) || TRAINERS[0], [TRAINERS, trainerId])

  const [date, setDate] = useState(Object.keys(trainer?.slots || {})[0] || '2025-08-13')
  const [time, setTime] = useState('')
  const [isVirtual, setIsVirtual] = useState(true)
  const times = (trainer?.slots?.[date]) || []

  const confirm = () => {
    if (!trainer) return alert('Select a trainer')
    if (!time) return alert('Select a time')
    const intent = pay(trainer.price)
    if (intent.status !== 'succeeded') return alert('Payment failed')
    addBooking({
      id: Math.random().toString(36).slice(2,10),
      trainer,
      date,
      time,
      virtual: isVirtual,
      status: 'confirmed',
      price: trainer.price,
    })
    setTime('')
    alert('Booking confirmed!')
  }

  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '2fr 1fr' }}>
      {/* Booking form */}
      <Card title="Book a Session" subtitle="Pick a trainer, date and time">
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#cbd5e1' }}>Trainer</span>
            <select
              value={trainerId}
              onChange={(e)=>{
                setTrainerId(e.target.value)
                const next = TRAINERS.find(t=>t.id===e.target.value)
                const firstDate = Object.keys(next?.slots || {})[0]
                setDate(firstDate || '')
                setTime('')
              }}
              style={{
                width: '100%', height: 40, borderRadius: 10,
                border: '1px solid rgba(255,255,255,.22)', background: 'rgba(255,255,255,.08)', color: 'white', padding: '0 10px'
              }}
            >
              {TRAINERS.map(t => (
                <option key={t.id} value={t.id}>{t.name} — {currency(t.price)}</option>
              ))}
            </select>
          </label>

          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e)=>{ setDate(e.target.value); setTime('') }}
            min="2025-08-10" max="2025-12-31"
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <span style={{ fontSize: 12, color: '#cbd5e1' }}>Time</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {times.length === 0 && <Badge>No slots</Badge>}
            {times.map(t => (
              <Button
                key={t}
                variant={time === t ? 'primary' : 'secondary'}
                size="sm"
                onClick={()=>setTime(t)}
              >
                {t}
              </Button>
            ))}
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <input id="virtual" type="checkbox" checked={isVirtual} onChange={(e)=>setIsVirtual(e.target.checked)} />
          <span style={{ fontSize: 14 }}>Virtual session (video)</span>
        </label>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <div style={{ color: '#94a3b8', fontSize: 14 }}>
            {trainer ? `${trainer.name} • ${currency(trainer.price)}` : 'Select a trainer'}
          </div>
          <Button onClick={confirm} size="lg" disabled={!trainer || !time}>
            Confirm & Pay • {currency(trainer?.price)}
          </Button>
        </div>
      </Card>

      {/* Upcoming list */}
      <Card title="Upcoming" subtitle="Your next sessions">
        {bookings.length === 0 && <p style={{ color: '#cbd5e1', fontSize: 14 }}>No bookings yet.</p>}
        <div style={{ display: 'grid', gap: 10 }}>
          {bookings.map(b => (
            <div key={b.id} style={{ border: '1px solid rgba(255,255,255,.14)', borderRadius: 10, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontWeight: 700 }}>{b.trainer.name}</div>
                <div>{currency(b.price)}</div>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                {b.date} {b.time} • {b.virtual ? 'Virtual' : 'In-person'}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Button variant="ghost" size="sm" onClick={()=>alert('Reschedule flow coming soon')}>Reschedule</Button>
                <Button variant="ghost" size="sm" onClick={()=>alert('Cancel flow coming soon')}>Cancel</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
