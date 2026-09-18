import React, { useState, useEffect } from 'react'
import { imageStorage } from '../services/imageStorage.js'

export function AvatarImage({
  src,
  alt = '',
  className = '',
  fallbackContent = null,
  fallbackClassName = 'avatar-fallback-inner',
  fallbackStyle,
  isUser = false,
  isNsfw = false,
}) {
  const [resolvedSrc, setResolvedSrc] = useState(() => imageStorage.getCachedImage(src))
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setHasError(false)
    if (!src) {
      setResolvedSrc(null)
      return
    }

    if (!src.startsWith('idb:')) {
      setResolvedSrc(src)
      return
    }

    const cached = imageStorage.getCachedImage(src)
    if (cached) {
      setResolvedSrc(cached)
      return
    }

    let cancelled = false
    imageStorage
      .getImage(src)
      .then((dataUrl) => {
        if (!cancelled) {
          if (dataUrl) {
            setResolvedSrc(dataUrl)
          } else {
            setHasError(true)
          }
        }
      })
      .catch(() => {
        if (!cancelled) setHasError(true)
      })

    return () => {
      cancelled = true
    }
  }, [src])

  if (resolvedSrc && !hasError) {
    return (
      <img
        src={resolvedSrc}
        alt={alt}
        className={className}
        onError={() => setHasError(true)}
      />
    )
  }

  const classes = [
    fallbackClassName,
    isUser ? 'avatar-fallback-user' : '',
    isNsfw ? 'nsfw' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} style={fallbackStyle}>
      {fallbackContent}
    </div>
  )
}
