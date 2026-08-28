import { useState, useRef, useEffect } from 'react'
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi2'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxDate?: string
  rangeStart?: string
  rangeEnd?: string
}

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

function formatDisplay(val: string): string {
  if (!val) return ''
  const [y, m, d] = val.split('-')
  return `${d}/${m}/${y}`
}

export default function DatePicker({ value, onChange, placeholder, maxDate, rangeStart, rangeEnd }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const now = value ? new Date(value + 'T00:00:00') : new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00')
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }, [value])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selectDate(day: number) {
    const m = String(viewMonth + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    onChange(`${viewYear}-${m}-${d}`)
    setOpen(false)
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const selectedStr = value || ''

  const effectiveMax = maxDate || todayStr

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-10 pl-3 pr-2.5 bg-gray-50 border border-gray-200 text-sm w-full whitespace-nowrap transition-all hover:border-primary cursor-pointer rounded-lg"
      >
        <span className={value ? 'text-text' : 'text-gray-400'}>{value ? formatDisplay(value) : (placeholder || 'Choisir')}</span>
      </button>
      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 bg-white border border-gray-200 shadow-lg p-3 w-[260px] rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) } else setViewMonth(m => m - 1) }} className="p-1 text-gray-400 hover:text-primary transition-colors cursor-pointer rounded-md">
              <HiChevronLeft size={14} />
            </button>
            <span className="text-xs font-bold text-text">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) } else setViewMonth(m => m + 1) }} className="p-1 text-gray-400 hover:text-primary transition-colors cursor-pointer rounded-md">
              <HiChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0">
            {DAYS.map(d => (
              <div key={d} className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider text-center py-1">{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isSelected = dateStr === selectedStr
              const isToday = dateStr === todayStr
              const isDisabled = dateStr > effectiveMax
              const inRange = rangeStart && rangeEnd && dateStr > rangeStart && dateStr < rangeEnd
              const isRangeStart = rangeStart && dateStr === rangeStart
              const isRangeEnd = rangeEnd && dateStr === rangeEnd
              return (
                <button
                  key={day}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && selectDate(day)}
                  className={`h-7 text-[11px] font-medium transition-all cursor-pointer flex items-center justify-center relative rounded-lg ${
                    isDisabled ? 'text-gray-200 cursor-not-allowed' :
                    isSelected ? 'bg-primary text-white font-bold' :
                    isToday ? 'bg-primary/10 text-primary font-bold' :
                    inRange ? 'bg-primary/10 text-primary' :
                    isRangeStart || isRangeEnd ? 'bg-primary text-white font-bold' :
                    'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
