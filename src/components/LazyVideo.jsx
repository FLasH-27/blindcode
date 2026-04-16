'use client'
import { useEffect, useRef, useState } from 'react'

export default function LazyVideo({ src, className, style }) {
  const ref = useRef(null)
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setShouldLoad(true) },
      { rootMargin: '200px' }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={className} style={style}>
      {shouldLoad && (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          onContextMenu={(e) => e.preventDefault()}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        >
          <source src={src} type="video/mp4" />
        </video>
      )}
    </div>
  )
}
