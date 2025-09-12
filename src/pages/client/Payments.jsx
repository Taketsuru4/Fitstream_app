import React from 'react'
import { useApp } from '../../context/appContext'
const currency = n => `€${Number(n).toFixed(2)}`
export default function Payments(){
  const { wallet } = useApp()
  return (
    <section>
      <h2>Payments & Wallet</h2>
      <div style={{marginTop:12, border:'1px solid #333', borderRadius:12, padding:12}}>
        <div style={{fontSize:12, color:'#9ca3af'}}>Wallet Balance</div>
        <div style={{fontSize:24, fontWeight:800}}>{currency(wallet.balance)}</div>
      </div>
    </section>
  )
}