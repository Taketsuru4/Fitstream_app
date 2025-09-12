import React, { useMemo, useState } from 'react'
import { TRAINERS } from '../../data/trainers'
import { Button, Card, Input, Badge } from '../../components/ui'

const currency = (n) => `€${Number(n).toFixed(2)}`

export default function Discover() {
  const [q, setQ] = useState('')
  const [activeTags, setActiveTags] = useState([])
  const [sort, setSort] = useState('relevance') // relevance | price-asc | price-desc | rating-desc

  // Build a small tag cloud from specialties
  const tags = useMemo(() => {
    const s = new Set()
    TRAINERS.forEach(t => t.specialties.forEach(x => s.add(x)))
    return Array.from(s).sort()
  }, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    let list = TRAINERS.filter(t => {
      const textMatch = !term ||
        t.name.toLowerCase().includes(term) ||
        t.location.toLowerCase().includes(term) ||
        t.specialties.join(' ').toLowerCase().includes(term)
      const tagMatch = activeTags.length === 0 || activeTags.every(tag => t.specialties.includes(tag))
      return textMatch && tagMatch
    })

    switch (sort) {
      case 'price-asc':   list = list.slice().sort((a,b)=>a.price-b.price); break
      case 'price-desc':  list = list.slice().sort((a,b)=>b.price-a.price); break
      case 'rating-desc': list = list.slice().sort((a,b)=>b.rating-a.rating); break
      default: break // relevance keeps original order
    }
    return list
  }, [q, activeTags, sort])

  const toggleTag = (tag) => {
    setActiveTags((prev) => prev.includes(tag) ? prev.filter(t=>t!==tag) : [...prev, tag])
  }

  return (
    <section>
      {/* Controls */}
      <div style={{ position:'sticky', top: 64, zIndex: 5, background:'rgba(10,10,10,.6)', backdropFilter:'blur(8px)', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:10 }}>
          <Input
            label="Search"
            placeholder="Try: strength, mobility, Athens…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            right={<span style={{ fontSize: 12, opacity: .8 }}>⌘K</span>}
          />
          <label style={{ display:'grid', gap:6 }}>
            <span style={{ fontSize: 12, color: '#cbd5e1' }}>Sort</span>
            <select
              value={sort}
              onChange={(e)=>setSort(e.target.value)}
              style={{ height: 40, borderRadius: 10, border:'1px solid rgba(255,255,255,.22)', background:'rgba(255,255,255,.08)', color:'#fff', padding:'0 10px' }}
            >
              <option value="relevance">Relevance</option>
              <option value="rating-desc">Rating</option>
              <option value="price-asc">Price (low → high)</option>
              <option value="price-desc">Price (high → low)</option>
            </select>
          </label>
        </div>

        {/* Tag filters */}
        <div style={{ display:'flex', gap:8, overflowX:'auto', paddingTop:8 }}>
          {tags.map(tag => (
            <button
              key={tag}
              onClick={()=>toggleTag(tag)}
              style={{
                height:32, padding:'0 10px', borderRadius:999,
                border: activeTags.includes(tag) ? '1px solid rgba(6,182,212,.6)' : '1px solid rgba(255,255,255,.22)',
                background: activeTags.includes(tag) ? 'rgba(6,182,212,.18)' : 'rgba(255,255,255,.08)',
                color:'#fff', cursor:'pointer', whiteSpace:'nowrap'
              }}
            >{tag}</button>
          ))}
          {activeTags.length>0 && (
            <Button variant="ghost" onClick={()=>setActiveTags([])}>Clear</Button>
          )}
        </div>
      </div>

      {/* Results */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:16, marginTop:16 }}>
        {filtered.map((t) => (
          <Card
            key={t.id}
            title={(
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap:8, flexWrap:'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ fontWeight: 800, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.name}</span>
                  <Badge tone="neutral">★ {t.rating} ({t.reviews})</Badge>
                </div>
                <div style={{ fontWeight: 800 }}>{currency(t.price)}</div>
              </div>
            )}
            subtitle={`${t.location}${t.remote ? ' • Virtual' : ''}`}
          >
            <img
              src={t.photo}
              alt={t.name}
              style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 10, marginBottom: 10 }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {t.specialties.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            </div>
            <p style={{ color: '#cbd5e1', fontSize: 14, margin: 0 }}>{t.bio}</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop: 12 }}>
              <Button variant="secondary" onClick={() => alert(`Viewing ${t.name}`)}>View Profile</Button>
              <Button onClick={() => window.location.assign('/app/book')}>Book</Button>
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ marginTop: 12, color: '#9ca3b8' }}>No trainers match your search.</p>
      )}
    </section>
  )
}
