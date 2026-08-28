import { useState, useRef, useEffect } from 'react'
import { HiChevronDown, HiArrowsUpDown } from 'react-icons/hi2'

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  formatOption?: (option: string) => string
  renderOption?: (option: string, isSelected: boolean) => React.ReactNode
  disabled?: boolean
  disabledPlaceholder?: string
  iconOnMobile?: boolean
  sharp?: boolean
}

export default function Select({ value, onChange, options, placeholder, formatOption, renderOption, disabled, disabledPlaceholder, iconOnMobile, sharp }: SelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const radius = sharp ? 'rounded-none' : 'rounded-lg'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        className={`flex items-center ${iconOnMobile ? 'justify-center md:justify-between' : 'justify-between'} gap-2 h-10 ${iconOnMobile ? 'pl-0 pr-0 md:pl-3 md:pr-2.5' : 'pl-3 pr-2.5'} bg-gray-50 border text-sm w-full whitespace-nowrap ${radius} transition-all ${iconOnMobile ? 'border-gray-200 text-text' : ''} ${disabled ? 'border-gray-100 text-gray-300 cursor-not-allowed' : 'border-gray-200 text-text hover:border-primary cursor-pointer'}`}
      >
        {iconOnMobile && (
          <HiArrowsUpDown size={16} className="text-gray-400 md:hidden shrink-0" />
        )}
        <span className={`${iconOnMobile ? 'hidden md:inline' : ''} ${value ? 'text-text' : 'text-gray-400'}`}>{disabled ? (disabledPlaceholder || placeholder || 'Tous') : (value ? (renderOption ? renderOption(value, true) : (formatOption ? formatOption(value) : value)) : (placeholder || 'Tous'))}</span>
        <HiChevronDown size={14} className={`text-gray-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''} ${iconOnMobile ? 'hidden md:inline' : ''}`} />
      </button>
      {!disabled && open && (
        <ul className={`absolute z-20 top-full mt-0.5 bg-white border border-gray-200 max-h-48 overflow-y-auto ${radius} shadow-sm ${iconOnMobile ? 'right-0 left-auto min-w-[200px] md:left-0 md:right-auto md:min-w-0' : 'left-0 right-0'}`}>
          {options.map((option) => (
            <li
              key={option}
              onClick={() => { onChange(option); setOpen(false) }}
              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${value === option ? 'bg-primary/5 text-primary font-medium' : 'text-text hover:bg-gray-50'}`}
            >
              {renderOption ? renderOption(option, value === option) : (formatOption ? formatOption(option) : option)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
