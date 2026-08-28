import { useState } from 'react'

interface BrandLogoProps {
  src: string
  name: string
  className?: string
  textClassName?: string
}

export default function BrandLogo({ src, name, className = '', textClassName = '' }: BrandLogoProps) {
  const [errored, setErrored] = useState(false)

  if (errored) {
    return (
      <span className={`text-xs font-semibold text-text text-center leading-tight ${textClassName}`}>
        {name}
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={name}
      className={`max-w-full max-h-full object-contain ${className}`}
      loading="lazy"
      onError={() => setErrored(true)}
    />
  )
}