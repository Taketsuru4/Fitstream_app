import React from 'react'
import { useApp } from '../../hooks/useApp'
const currency = n => `€${Number(n).toFixed(2)}`
export default function BookingInbox(){
  const { bookings } = useApp()
  return (
    <section>
      <h2>Booking Inbox</h2>
      <div style={{marginTop:12}}>
        {bookings.length===0 ? <p>No upcoming sessions.</p> : bookings.map(b=>(
          <div key={b.id} style={{border:'1px solid #333', borderRadius:10, padding:12, marginBottom:8}}>
            <div style={{display:'flex', justifyContent:'space-between'}}>
              <div><strong>{b.date} {b.time}</strong> • {b.virtual?'Virtual':'In-person'}</div>
              <div>{currency(b.price)}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}