import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, Input, Badge, Textarea } from '../../components/ui'
import { useApp } from '../../hooks/useApp'
import Modal from '../../components/Modal'
import { supabase } from '../../supabaseClient'

/**
 * Mobile‑first Messages with threads + chat + New Message modal
 * Tweaks: semi‑transparent composer, modal blur, safe‑area padding, FABs above composer
 */
export default function Messages(){
  const { messages = [], setMessages, user, TRAINERS = [] } = useApp()
  const [q, setQ] = useState('')
  const [openList, setOpenList] = useState(false)
  const [openNew, setOpenNew] = useState(false)
  const [searchTrainer, setSearchTrainer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Threads
  const threads = useMemo(() => {
    const map = new Map()
    for (const m of messages){
      const key = m.threadId || m.with || 'general'
      const arr = map.get(key) || []
      arr.push(m)
      map.set(key, arr)
    }
    const list = Array.from(map.entries()).map(([id, msgs])=>({
      id,
      with: msgs[0]?.with || 'Conversation',
      last: msgs[msgs.length-1]?.text || msgs[msgs.length-1]?.last || '',
      ts: msgs[msgs.length-1]?.ts || 0,
      msgs
    }))
    list.sort((a,b)=> (b.ts||0) - (a.ts||0))
    return list
  }, [messages])

  const [activeId, setActiveId] = useState(() => threads[0]?.id)
  useEffect(()=>{ if (!activeId && threads[0]) setActiveId(threads[0].id) },[threads, activeId])
  const active = useMemo(()=> threads.find(t=>t.id===activeId) || threads[0], [threads, activeId])

  // Load messages on mount
  useEffect(() => {
    loadMessages()
    subscribeToMessages()
    return () => {
      supabase.removeAllChannels()
    }
  }, [user?.id])

  const loadMessages = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(id, name, avatar_url),
          recipient:recipient_id(id, name, avatar_url)
        `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      
      // Transform Supabase data to match existing format
      const transformedMessages = data.map(msg => ({
        id: msg.id,
        threadId: `dm-${[msg.sender_id, msg.recipient_id].sort().join('-')}`,
        with: msg.sender_id === user.id ? msg.recipient?.name : msg.sender?.name,
        role: msg.sender_id === user.id ? 'me' : 'them',
        text: msg.content,
        ts: new Date(msg.created_at).getTime(),
        sender: msg.sender,
        recipient: msg.recipient
      }))
      
      setMessages(transformedMessages)
    } catch (err) {
      console.error('Error loading messages:', err)
      setError('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const subscribeToMessages = () => {
    if (!user?.id) return
    
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(sender_id.eq.${user.id},recipient_id.eq.${user.id})`
        },
        async (payload) => {
          // Fetch full message with user data
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              sender:sender_id(id, name, avatar_url),
              recipient:recipient_id(id, name, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single()
          
          if (data) {
            const newMessage = {
              id: data.id,
              threadId: `dm-${[data.sender_id, data.recipient_id].sort().join('-')}`,
              with: data.sender_id === user.id ? data.recipient?.name : data.sender?.name,
              role: data.sender_id === user.id ? 'me' : 'them',
              text: data.content,
              ts: new Date(data.created_at).getTime(),
              sender: data.sender,
              recipient: data.recipient
            }
            
            setMessages(prev => {
              // Avoid duplicates
              const exists = prev.some(m => m.id === newMessage.id)
              return exists ? prev : [...prev, newMessage]
            })
            
            setTimeout(scrollToBottom, 100)
          }
        }
      )
      .subscribe()
    
    return () => supabase.removeChannel(channel)
  }

  const filteredThreads = useMemo(()=>{
    const s = q.trim().toLowerCase()
    if (!s) return threads
    return threads.filter(t => t.with?.toLowerCase().includes(s) || t.last?.toLowerCase().includes(s))
  }, [threads, q])

  // Send
  const [draft, setDraft] = useState('')
  const endRef = useRef(null)
  const scrollToBottom = () => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  useEffect(scrollToBottom, [active])

  const send = async () => {
    const text = draft.trim()
    if (!text || !user?.id || !active) return
    
    // Extract recipient from thread ID or find trainer
    let recipientId = null
    
    if (active.id.startsWith('dm-')) {
      // Extract recipient from thread participants
      const participants = active.id.replace('dm-', '').split('-')
      recipientId = participants.find(id => id !== user.id)
    } else {
      // Find trainer by name for legacy threads
      const trainer = TRAINERS.find(t => t.name === active.with)
      recipientId = trainer?.id
    }
    
    if (!recipientId) {
      setError('Unable to send message - recipient not found')
      return
    }
    
    try {
      setLoading(true)
      setError('')
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: recipientId,
          content: text,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) throw error
      
      // Message will be added via real-time subscription
      setDraft('')
      setTimeout(scrollToBottom, 100)
      
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message. Please try again.')
      
      // Fallback to local state for demo purposes
      const now = Date.now()
      const entry = { id: `${now}`, threadId: active.id, with: active.with, role: 'me', text, ts: now }
      setMessages(prev => [...prev, entry])
      setDraft('')
      setTimeout(scrollToBottom, 0)
    } finally {
      setLoading(false)
    }
  }
  const onKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  // New Message modal helpers
  const trainerList = useMemo(() => {
    const s = searchTrainer.trim().toLowerCase()
    let list = TRAINERS
    if (s) list = list.filter(t => t.name.toLowerCase().includes(s) || t.specialties.join(' ').toLowerCase().includes(s) || t.location.toLowerCase().includes(s))
    return list
  }, [TRAINERS, searchTrainer])

  const startThread = (trainer) => {
    if (!user?.id || !trainer?.id) return
    
    // Create thread ID with consistent participant ordering
    const participants = [user.id, trainer.id].sort()
    const threadId = `dm-${participants.join('-')}`
    
    // Check if thread already exists
    const existingThread = threads.find(t => t.id === threadId)
    if (existingThread) {
      setActiveId(threadId)
      setOpenNew(false)
      return
    }
    
    // Create a system message to initialize the thread
    const now = Date.now()
    const seed = { 
      id: `${now}-seed`, 
      threadId, 
      with: trainer.name, 
      role: 'system', 
      text: `Started conversation with ${trainer.name}`, 
      ts: now 
    }
    
    setMessages(prev => [...prev, seed])
    setActiveId(threadId)
    setOpenNew(false)
    setTimeout(scrollToBottom, 0)
  }

  return (
    <div className="fs-msg" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 12 }}>
      <style>{`
        :root{ --safe: env(safe-area-inset-bottom, 0px); }
        @media (max-width: 900px){
          .fs-msg{ grid-template-columns: 1fr; }
          .fs-threads{ display: ${openList ? 'block' : 'none'}; }
        }
        /* Composer: semi-transparent, readable, respects safe area */
        .chat-footer{ position: sticky; bottom: 0; background: rgba(15,18,22,.96); border-top: 1px solid rgba(255,255,255,.12); z-index: 1; backdrop-filter: blur(6px); padding-bottom: 8px; }
        @supports (padding: max(0px)) { .chat-footer{ padding-bottom: max(8px, var(--safe)); } }
        .chat-input{ background: rgba(18,21,27,.96) !important; border:1px solid rgba(255,255,255,.18) !important; color:#fff !important; backdrop-filter: blur(4px); }
        .chat-input::placeholder{ color:#9ca3af; }
        /* Modal visual tweaks */
        .modal-panel{ background: rgba(16,19,25,.96); backdrop-filter: blur(8px); border-radius: 12px; border: 1px solid rgba(255,255,255,.08); }
        .modal-card{ background: rgba(18,21,27,.96); border: 1px solid rgba(255,255,255,.10); border-radius: 12px; backdrop-filter: blur(6px); }
        /* Floating actions positioned above composer & safe area */
        .fs-fab{ position: fixed; right: 16px; z-index: 50; display: flex; flex-direction: column; gap: 10px; }
        .fs-fab .fs-btn{ box-shadow: 0 8px 26px rgba(0,0,0,.35); }
        .fs-fab{ bottom: 112px; }
        @supports (padding: max(0px)) { .fs-fab{ bottom: calc(112px + var(--safe)); } }
      `}</style>

      {/* Threads */}
      <div className="fs-threads">
        <Card
          title={(
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
              <span>Messages</span>
              <Button size="sm" onClick={()=>setOpenNew(true)} disabled={loading}>New Message</Button>
            </div>
          )}
          subtitle={loading ? "Loading conversations..." : "Your conversations"}
          style={{ position:'sticky', top: 64 }}
        >
          <div style={{ marginBottom: 10 }}>
            <Input placeholder="Search" value={q} onChange={(e)=>setQ(e.target.value)} right={<span style={{fontSize:12,opacity:.8}}>⌘K</span>} />
          </div>

          <div style={{ display:'grid', gap:8 }}>
            {filteredThreads.map(t => (
              <button
                key={t.id}
                onClick={()=>{ setActiveId(t.id); setOpenList(false) }}
                style={{ textAlign:'left', border:'1px solid rgba(255,255,255,.14)', borderRadius:10,
                  background: active?.id===t.id ? 'rgba(7,7,7,.1)' : 'rgba(8,8,8,.06)',
                  color:'#fff', padding:12, cursor:'pointer' }}
              >
                <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                  <strong style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.with}</strong>
                  <Badge tone="neutral">{new Date(t.ts||0).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</Badge>
                </div>
                <div style={{ fontSize:12, color:'#9ca3af', marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.last || ' '}</div>
              </button>
            ))}
            {filteredThreads.length===0 && <div style={{color:'#9ca3af'}}>No conversations.</div>}
          </div>
        </Card>
      </div>

      {/* Chat */}
      <div>
        <Card
          title={active ? active.with : 'Conversation'}
          subtitle={active ? 'Direct messages' : '—'}
          style={{ minHeight: 420, position:'relative' }}
          footer={(
            <div className="chat-footer">
              <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:8, padding: 8 }}>
                <Textarea
                  rows={2}
                  value={draft}
                  onChange={(e)=>setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Write a message… (Enter to send, Shift+Enter for line)"
                  className="chat-input"
                />
                <Button onClick={send} disabled={!draft.trim() || loading}>
                  {loading ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
          )}
        >
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, padding: 12, marginBottom: 12, color: '#fca5a5' }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Error</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>{error}</div>
            </div>
          )}
          
          <div style={{ maxHeight: 400, overflow:'auto', display:'grid', gap:8, paddingBottom: 12 }}>
            {(active?.msgs || []).map(m => (
              <div key={m.id} style={{ justifySelf: m.role==='me' ? 'end' : 'start', background: m.role==='me' ? 'rgba(6,182,212,.20)' : 'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.14)', borderRadius: 12, padding: '8px 10px', maxWidth: '80%' }}>
                <div style={{ fontSize: 12, color:'#52688d', marginBottom: 2 }}>{m.role==='me' ? (user?.name || 'Me') : (m.with || 'Contact')}</div>
                <div>{m.text || m.last}</div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        </Card>

        {/* Mobile floating toggles */}
        <div className="show-sm fs-fab">
          <Button variant="secondary" onClick={()=>setOpenList(v=>!v)}>Show Threads</Button>
          <Button variant="secondary" onClick={()=>setOpenNew(true)}>New Message</Button>
        </div>
      </div>

      {/* New Message modal */}
      <Modal open={openNew} onClose={()=>setOpenNew(false)} title="Start a new message">
        <div className="modal-panel" style={{ display:'grid', gap:10, padding:12 }}>
          <Input placeholder="Search trainers…" value={searchTrainer} onChange={(e)=>setSearchTrainer(e.target.value)} />
          <div style={{ display:'grid', gap:10, gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {trainerList.map(t => (
              <div key={t.id} className="modal-card" style={{ padding:12 }}>
                <img src={t.photo} alt={t.name} style={{ width:'100%', height:120, objectFit:'cover', borderRadius:8, marginBottom:8 }} />
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:8 }}>
                  <strong style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.name}</strong>
                  <Badge tone="neutral">★ {t.rating}</Badge>
                </div>
                <div style={{ color:'#6c8fca', fontSize:12, marginTop:4 }}>{t.location}{t.remote ? ' • Virtual' : ''}</div>
                <div style={{ display:'flex', gap:8, marginTop:10 }}>
                  <Button fullWidth onClick={()=>startThread(t)}>Message</Button>
                </div>
              </div>
            ))}
            {trainerList.length===0 && <div style={{ color:'#738ebc' }}>No trainers found.</div>}
          </div>
        </div>
      </Modal>
    </div>
  )
}
