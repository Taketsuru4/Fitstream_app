import React from 'react'
import { Button, Badge } from './ui'

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
          maxWidth: '600px',
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
            {title || 'Trainer Profile'}
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

export default function TrainerProfileModal({ trainer, isOpen, onClose, onBook }) {
  if (!trainer) return null

  const formatPrice = (rate, currency) => {
    if (!rate) return 'Contact for pricing'
    const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€'
    return `${symbol}${rate}/hour`
  }

  const formatExperience = (years) => {
    if (!years) return 'Experience level not specified'
    if (years === 1) return '1 year of experience'
    return `${years} years of experience`
  }

  return (
    <Modal 
      open={isOpen} 
      onClose={onClose} 
      title={trainer.full_name}
    >
      <div style={{ display: 'grid', gap: '24px' }}>
        {/* Profile Header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '16px', alignItems: 'start' }}>
          {/* Avatar */}
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
            {trainer.avatar_url ? (
              <img
                src={trainer.avatar_url}
                alt={trainer.full_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1594737625785-c38e6c310c05?auto=format&fit=crop&w=800&q=80'
                }}
              />
            ) : (
              <div style={{ 
                width: '100%', 
                height: '100%', 
                background: '#374151', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '2rem' 
              }}>
                👤
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff', margin: 0 }}>
                {trainer.full_name}
              </h3>
              {trainer.is_verified && (
                <Badge tone="success">✓ Verified</Badge>
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <Badge tone="neutral">
                ★ {trainer.rating || '5.0'} ({trainer.total_reviews || 0} reviews)
              </Badge>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                {trainer.total_sessions || 0} sessions completed
              </span>
            </div>

            {trainer.location && (
              <div style={{ color: '#cbd5e1', fontSize: '14px' }}>
                📍 {trainer.location}
              </div>
            )}
          </div>
        </div>

        {/* Price & Experience */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px',
          padding: '16px',
          background: 'rgba(255,255,255,.05)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,.1)'
        }}>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>HOURLY RATE</div>
            <div style={{ color: '#fff', fontSize: '18px', fontWeight: '700' }}>
              {formatPrice(trainer.hourly_rate, trainer.currency)}
            </div>
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>EXPERIENCE</div>
            <div style={{ color: '#fff', fontSize: '18px', fontWeight: '700' }}>
              {formatExperience(trainer.years_experience)}
            </div>
          </div>
        </div>

        {/* Specialties */}
        {trainer.specialties && trainer.specialties.length > 0 && (
          <div>
            <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              Specialties
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {trainer.specialties.map((specialty, index) => (
                <Badge key={index} tone="neutral">{specialty}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Bio */}
        {trainer.bio && (
          <div>
            <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              About
            </h4>
            <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
              {trainer.bio}
            </p>
          </div>
        )}

        {/* Certifications */}
        {trainer.certifications && trainer.certifications.length > 0 && (
          <div>
            <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              Certifications
            </h4>
            <div style={{ display: 'grid', gap: '8px' }}>
              {trainer.certifications.map((cert, index) => (
                <div key={index} style={{
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,.1)',
                  color: '#cbd5e1',
                  fontSize: '14px'
                }}>
                  🏆 {cert}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Languages */}
        {trainer.languages && trainer.languages.length > 0 && (
          <div>
            <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              Languages
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {trainer.languages.map((language, index) => (
                <Badge key={index} tone="warn">🌍 {language}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Training Locations */}
        {trainer.training_locations && trainer.training_locations.length > 0 && (
          <div>
            <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              Training Locations
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {trainer.training_locations.map((location, index) => (
                <Badge key={index} tone="neutral">📍 {location}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
          gap: '12px',
          marginTop: '8px'
        }}>
          <Button 
            variant="secondary" 
            onClick={() => {
              // TODO: Add message functionality
              alert('Messaging feature coming soon!')
            }}
          >
            💬 Message
          </Button>
          <Button 
            onClick={() => {
              onClose()
              if (onBook) {
                onBook(trainer)
              } else {
                window.location.assign(`/app/book?trainerId=${trainer.id}`)
              }
            }}
          >
            📅 Book Session
          </Button>
        </div>

        {/* Profile Completion Indicator */}
        {trainer.profile_completion && (
          <div style={{ 
            padding: '12px 16px',
            background: 'rgba(6,182,212,.1)',
            border: '1px solid rgba(6,182,212,.3)',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#67e8f9'
          }}>
            Profile {trainer.profile_completion}% complete
          </div>
        )}
      </div>
    </Modal>
  )
}