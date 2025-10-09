import React, { useState } from 'react'
import { Button } from './ui'

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
        overflow: 'auto'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.05))',
          border: '1px solid rgba(255,255,255,.15)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,.1)'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#fff',
            margin: 0
          }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,.1)',
              border: '1px solid rgba(255,255,255,.2)',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ×
          </button>
        </div>
        
        {/* Content */}
        <div style={{ padding: '24px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

const SessionNotesModal = ({ 
  booking, 
  isOpen, 
  onClose, 
  onSave 
}) => {
  const [notes, setNotes] = useState('')
  const [clientFeedback, setClientFeedback] = useState('')
  const [nextSteps, setNextSteps] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const sessionNotes = {
        notes: notes.trim(),
        clientFeedback: clientFeedback.trim(),
        nextSteps: nextSteps.trim(),
        timestamp: new Date().toISOString()
      }
      
      await onSave(booking.id, JSON.stringify(sessionNotes))
      onClose()
      
      // Reset form
      setNotes('')
      setClientFeedback('')
      setNextSteps('')
    } catch (error) {
      console.error('Error saving session notes:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!booking) return null

  return (
    <Modal 
      open={isOpen} 
      onClose={onClose} 
      title="Session Notes"
    >
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {/* Booking Info */}
        <div style={{
          padding: '1rem',
          background: 'rgba(255,255,255,.05)',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,.1)'
        }}>
          <div style={{ fontWeight: '600', color: '#fff', marginBottom: '4px' }}>
            {booking.client?.full_name || 'Client'}
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,.7)' }}>
            {new Date(booking.booking_date).toLocaleDateString()} • {booking.start_time}
          </div>
        </div>

        {/* Session Notes */}
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            color: 'rgba(255,255,255,.8)', 
            marginBottom: '0.5rem',
            fontWeight: '500'
          }}>
            Session Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did the session go? What exercises did you do?"
            rows={4}
            style={{
              width: '100%',
              borderRadius: '8px',
              background: 'rgba(255,255,255,.05)',
              border: '1px solid rgba(255,255,255,.2)',
              color: '#fff',
              padding: '12px',
              fontSize: '14px',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Client Feedback */}
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            color: 'rgba(255,255,255,.8)', 
            marginBottom: '0.5rem',
            fontWeight: '500'
          }}>
            Client Feedback
          </label>
          <textarea
            value={clientFeedback}
            onChange={(e) => setClientFeedback(e.target.value)}
            placeholder="Any feedback from the client? How did they feel?"
            rows={3}
            style={{
              width: '100%',
              borderRadius: '8px',
              background: 'rgba(255,255,255,.05)',
              border: '1px solid rgba(255,255,255,.2)',
              color: '#fff',
              padding: '12px',
              fontSize: '14px',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Next Steps */}
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            color: 'rgba(255,255,255,.8)', 
            marginBottom: '0.5rem',
            fontWeight: '500'
          }}>
            Next Steps / Recommendations
          </label>
          <textarea
            value={nextSteps}
            onChange={(e) => setNextSteps(e.target.value)}
            placeholder="What should the client work on next? Any homework or recommendations?"
            rows={3}
            style={{
              width: '100%',
              borderRadius: '8px',
              background: 'rgba(255,255,255,.05)',
              border: '1px solid rgba(255,255,255,.2)',
              color: '#fff',
              padding: '12px',
              fontSize: '14px',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end',
          marginTop: '8px'
        }}>
          <Button 
            variant="ghost" 
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving || (!notes.trim() && !clientFeedback.trim() && !nextSteps.trim())}
          >
            {saving ? 'Saving...' : 'Save Notes'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default SessionNotesModal