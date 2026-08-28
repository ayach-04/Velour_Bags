import { useState, useRef, useEffect } from 'react'
import { HiXMark, HiChevronDown } from 'react-icons/hi2'

interface AutocompleteInputProps {
  name: string
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  required?: boolean
  label: string
  multiple?: boolean
  className?: string
  disableInput?: boolean
  openUp?: boolean
}

export default function AutocompleteInput({
  name,
  value,
  onChange,
  options,
  placeholder,
  required,
  label,
  multiple,
  className = '',
  disableInput = false,
  openUp = false,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = value ? value.split(',').map((s) => s.trim()).filter(Boolean) : []
  const inputDisabled = disableInput || (!multiple && selected.length > 0)
  const current = input.trim()
  const filtered = options.filter(
    (o) =>
      (!multiple || !selected.includes(o)) &&
      o.toLowerCase().includes(current.toLowerCase())
  )

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const addValue = (v: string) => {
    if (multiple) {
      const newVal = selected.includes(v) ? selected : [...selected, v]
      onChange(newVal.join(', '))
    } else {
      onChange(v)
    }
    setInput('')
    setOpen(false)
  }

  const removeValue = (v: string) => {
    const newVal = selected.filter((s) => s !== v)
    onChange(newVal.join(', '))
    inputRef.current?.focus()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (multiple && val.endsWith(',')) {
      const part = val.slice(0, -1).trim()
      if (part) addValue(part)
      else setInput('')
      return
    }
    if (!multiple && val === '' && selected.length > 0) {
      onChange('')
    }
    setInput(val)
    setOpen(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !input && selected.length > 0) {
      removeValue(selected[selected.length - 1])
    }
    if (e.key === 'Enter' && current && filtered.length > 0) {
      e.preventDefault()
      addValue(filtered[0])
    }
  }

  return (
    <div className={`space-y-1.5 relative ${className}`} ref={ref}>
      <label className="block text-xs font-semibold text-text uppercase tracking-wider">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div
        onClick={() => setOpen(!open)}
        className="flex flex-wrap items-center gap-1.5 min-h-10 pl-3 pr-2.5 bg-gray-50 border border-gray-200 hover:border-primary focus-within:border-primary transition-all cursor-pointer rounded-lg"
      >
        {selected.map((s) => (
          <span key={s} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
            {s}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeValue(s) }}
              className="cursor-pointer hover:text-red-400 transition-colors"
            >
              <HiXMark size={12} />
            </button>
          </span>
        ))}
        {!inputDisabled ? (
          <input
            ref={inputRef}
            name={name}
            value={!multiple && selected.length > 0 && !input ? selected[0] : input}
            onChange={handleInputChange}
            onFocus={() => setOpen(true)}
            required={required && !multiple && !value}
            placeholder={multiple && selected.length > 0 ? 'Ajouter...' : placeholder}
            className={`flex-1 min-w-[80px] h-9 bg-transparent text-sm text-text placeholder-gray-400 focus:outline-none cursor-text`}
          />
        ) : (
          <span className={`flex-1 text-sm ${selected.length === 0 ? 'text-gray-400' : 'text-text'}`}>
            {selected.length === 0 ? (placeholder || 'Tous') : ''}
          </span>
        )}
        <HiChevronDown size={14} className={`text-gray-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && filtered.length > 0 && (
        <ul className={`absolute z-20 left-0 right-0 bg-white border border-gray-200 max-h-48 overflow-y-auto shadow-sm rounded-lg ${openUp ? 'bottom-full mb-0.5' : 'top-full mt-0.5'}`}>
          {filtered.map((option) => (
            <li
              key={option}
              onClick={() => addValue(option)}
              className="px-4 py-2.5 text-sm text-text hover:bg-gray-50 cursor-pointer transition-colors"
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
