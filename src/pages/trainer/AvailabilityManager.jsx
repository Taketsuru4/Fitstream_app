import React, { useState } from 'react'
export default function AvailabilityManager(){
  const [days, setDays] = useState({ Mon:['09:00','11:00'], Tue:['09:00','11:00'], Wed:['09:00','11:00'], Thu:['09:00','11:00'], Fri:['09:00','11:00'], Sat:[], Sun:[] })
  const [newTime, setNewTime] = useState('09:00')
  const [selectedDay, setSelectedDay] = useState('Mon')
  const addSlot = () => setDays(d=>({...d, [selectedDay]: Array.from(new Set([...(d[selectedDay]||[]), newTime])).sort()}))
  const remove = (day,t) => setDays(d=>({...d, [day]: d[day].filter(x=>x!==t)}))
  return (
    <section>
      <h2>Availability</h2>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12, marginTop:12}}>
        {Object.entries(days).map(([day, slots])=>(
          <div key={day} style={{border:'1px solid #333', borderRadius:10, padding:12}}>
            <strong>{day}</strong>
            <div style={{display:'flex', flexWrap:'wrap', gap:8, marginTop:8}}>
              {slots.length? slots.map(t=>(
                <button key={t} onClick={()=>remove(day,t)} style={{height:32, padding:'0 10px', borderRadius:8, background:'rgba(255,255,255,.06)', border:'1px solid #333', color:'white'}}> {t} ✕ </button>
              )) : <span style={{fontSize:12, color:'#9ca3af'}}>Off</span>}
            </div>
          </div>
        ))}
      </div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:8, marginTop:12}}>
        <select value={selectedDay} onChange={e=>setSelectedDay(e.target.value)} style={{height:40, borderRadius:8, background:'rgba(255,255,255,.06)', border:'1px solid #333', color:'white', padding:'0 10px'}}>
          {Object.keys(days).map(d=><option key={d}>{d}</option>)}
        </select>
        <input value={newTime} onChange={e=>setNewTime(e.target.value)} placeholder="HH:MM" style={{height:40, borderRadius:8, background:'rgba(255,255,255,.06)', border:'1px solid #333', color:'white', padding:'0 10px'}}/>
        <button onClick={addSlot} style={{height:40, borderRadius:8, background:'#2563eb', color:'white', border:'none', padding:'0 16px'}}>Add Slot</button>
      </div>
    </section>
  )
}