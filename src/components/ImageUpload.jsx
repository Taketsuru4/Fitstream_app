import React, { useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useApp } from '../hooks/useApp'

const ImageUpload = ({ 
  currentImage, 
  onImageUpload, 
  onImageDelete,
  size = 'large', // 'small', 'medium', 'large'
  className = ''
}) => {
  const { user } = useApp()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(currentImage)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const sizes = {
    small: { width: 'w-16 h-16', text: 'text-xs' },
    medium: { width: 'w-24 h-24', text: 'text-sm' },
    large: { width: 'w-32 h-32', text: 'text-base' }
  }

  const sizeClasses = sizes[size] || sizes.large

  const validateFile = (file) => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return 'Please upload a JPG, PNG, or WebP image'
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return 'Image size must be less than 5MB'
    }

    return null
  }

  const uploadImage = async (file) => {
    try {
      setUploading(true)
      setError('')

      // Validate file
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return null
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      const filePath = `profile-images/${fileName}`

      // Upload to Supabase storage
      const { data, error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath)

      return publicUrl

    } catch (error) {
      console.error('Error uploading image:', error)
      setError(error.message || 'Failed to upload image')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result)
    }
    reader.readAsDataURL(file)

    // Upload file
    const imageUrl = await uploadImage(file)
    if (imageUrl) {
      onImageUpload?.(imageUrl)
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = async () => {
    if (currentImage) {
      try {
        // Extract file path from URL for deletion
        const url = new URL(currentImage)
        const pathParts = url.pathname.split('/')
        const filePath = pathParts.slice(-2).join('/') // Get last two parts: folder/filename
        
        await supabase.storage
          .from('profile-images')
          .remove([filePath])
      } catch (error) {
        console.error('Error deleting image:', error)
        // Continue with local removal even if server deletion fails
      }
    }

    setPreview(null)
    onImageDelete?.()
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={`image-upload ${className}`}>
      <div className="flex items-center space-x-4">
        {/* Image Preview */}
        <div className={`relative ${sizeClasses.width} flex-shrink-0`}>
          {preview ? (
            <div className="relative group">
              <img
                src={preview}
                alt="Profile"
                className={`${sizeClasses.width} rounded-full object-cover border-2 border-gray-600`}
              />
              {/* Remove button */}
              <button
                onClick={handleRemoveImage}
                disabled={uploading}
                className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                title="Remove image"
              >
                ×
              </button>
            </div>
          ) : (
            <div className={`${sizeClasses.width} rounded-full bg-gray-800 border-2 border-dashed border-gray-600 flex items-center justify-center cursor-pointer hover:border-gray-500 transition-colors`} onClick={triggerFileSelect}>
              <div className="text-center">
                <div className="text-2xl mb-1">📷</div>
                <div className={`${sizeClasses.text} text-gray-400`}>Add Photo</div>
              </div>
            </div>
          )}

          {/* Loading overlay */}
          {uploading && (
            <div className={`absolute inset-0 ${sizeClasses.width} rounded-full bg-black/50 flex items-center justify-center`}>
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1">
          <div className="space-y-2">
            <div>
              <button
                onClick={triggerFileSelect}
                disabled={uploading}
                className="inline-flex items-center px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    📎 {preview ? 'Change Photo' : 'Upload Photo'}
                  </>
                )}
              </button>
            </div>

            <div className="text-xs text-gray-400">
              JPG, PNG or WebP. Max size 5MB.
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}

export default ImageUpload