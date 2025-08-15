import React from 'react'

export default function Footer() {
  return (
    <footer style={{
      backgroundColor: '#0a0a0a',
      color: '#fff',
      padding: '20px',
      textAlign: 'center',
      fontSize: '14px',
      borderTop: '1px solid rgba(255,255,255,0.1)'
    }}>
      <p>© {new Date().getFullYear()} FitStream. All rights reserved.</p>
      <p style={{ opacity: 0.7 }}>
        Helping trainers & clients connect worldwide.
      </p>
    </footer>
  )
}