import React from 'react'
const currency = n => `€${Number(n).toFixed(2)}`
export default function Payouts(){
  return (
    <section>
      <h2>Payouts</h2>
      <div style={{marginTop:12, border:'1px solid #333', borderRadius:12, padding:12}}>
        <div style={{fontSize:12, color:'#9ca3af'}}>Pending Payout</div>
        <div style={{fontSize:24, fontWeight:800}}>{currency(0)}</div>
      </div>
    </section>
  )
}