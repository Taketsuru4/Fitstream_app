import React, { useState } from 'react'
export default function ProfileEditor(){
  const [name, setName] = useState('Coach Name')
  const [price, setPrice] = useState(45)
  const [tags, setTags] = useState('Strength, Mobility')
  const [bio, setBio] = useState('Short bio here...')
  return (
    <section>
      <h2>Profile</h2>
      <div style={{display:'grid', gap:24, gridTemplateColumns:'1fr 1fr', marginTop:12}}>
        <div><label style={{fontSize:12}}>Name</label><input value={name} onChange={e=>setName(e.target.value)} style={{width:'100%', height:40, borderRadius:8, background:'rgba(255,255,255,.06)', border:'1px solid #333', color:'white', padding:'0 10px'}}/></div>
        <div><label style={{fontSize:12}}>Price (€)</label><input type="number" value={price} onChange={e=>setPrice(Number(e.target.value))} style={{width:'100%', height:40, borderRadius:8, background:'rgba(255,255,255,.06)', border:'1px solid #333', color:'white', padding:'0 10px'}}/></div>
      </div>
      <div style={{marginTop:8}}><label style={{fontSize:12}}>Specialties</label><input value={tags} onChange={e=>setTags(e.target.value)} style={{width:'100%', height:40, borderRadius:8, background:'rgba(255,255,255,.06)', border:'1px solid #333', color:'white', padding:'0 10px'}}/></div>
      <div style={{marginTop:8}}><label style={{fontSize:12}}>Bio</label><textarea value={bio} onChange={e=>setBio(e.target.value)} rows={4} style={{width:'100%', borderRadius:8, background:'rgba(255,255,255,.06)', border:'1px solid #333', color:'white', padding:'10px'}}/></div>
      <button style={{marginTop:12, height:44, borderRadius:10, background:'#2563eb', color:'white', border:'none', padding:'0 16px'}}>Save Profile</button>
    </section>
  )
}