import React from 'react'

export default function Footer() {
  return (
    <footer className="w-full bg-gray-800 text-gray-300 p-4 text-center">
      © {new Date().getFullYear()} FitStream — All rights reserved.
    </footer>
  )
}