interface SwatchColor {
  name: string
  image?: string
  stock?: number
}

interface ColorSwatchesProps {
  colors: SwatchColor[]
  selectedName?: string
  onSelect: (name: string, index: number) => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-9 h-9 sm:w-10 sm:h-10',
  lg: 'w-12 h-12 md:w-[68px] md:h-[68px]',
}

export default function ColorSwatches({ colors, selectedName, onSelect, size = 'md', className = '' }: ColorSwatchesProps) {
  return (
    <div className={`flex flex-wrap gap-2.5 ${className}`}>
      {colors.map((c, i) => {
        const cOut = (c.stock ?? 0) <= 0
        const active = selectedName === c.name
        return (
          <button
            key={i}
            type="button"
            onClick={() => !cOut && onSelect(c.name, i)}
            disabled={cOut}
            title={c.name}
            className={`relative overflow-hidden bg-white transition-all cursor-pointer ${sizeClasses[size]} ${active ? 'ring-1 ring-foreground ring-offset-1' : ''} ${cOut ? 'cursor-not-allowed' : ''}`}
          >
            {c.image ? (
              <img src={c.image} alt={c.name} className="w-full h-full object-contain" loading="lazy" />
            ) : (
              <span className="block w-full h-full" style={{ backgroundColor: c.name }} />
            )}
            {cOut && (
              <span className="absolute inset-0 overflow-hidden pointer-events-none">
                <span className="absolute inset-0 bg-white/60" />
                <span className="absolute inset-0 grid place-items-center">
                  <span className="block w-[141.4%] h-px bg-white -rotate-45" />
                </span>
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}