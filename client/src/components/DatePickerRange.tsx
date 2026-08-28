import { useState, useRef, useEffect } from 'react'
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi2'

interface DatePickerRangeProps {
  from: string
  to: string
  onChange: (from: string, to: string) => void
  placeholder?: string
  maxDate?: string
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

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function DatePickerRange({ from, to, onChange, placeholder, maxDate }: DatePickerRangeProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const initialDate = from ? new Date(from + 'T00:00:00') : new Date()
  const [viewYear, setViewYear] = useState(initialDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth())
  const [hoverDate, setHoverDate] = useState('')

  useEffect(() => {
    if (from) {
      const d = new Date(from + 'T00:00:00')
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }, [from])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setHoverDate('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const today = new Date()
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())
  const effectiveMax = maxDate || todayStr

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)

  function selectDate(day: number) {
    const dateStr = toDateStr(viewYear, viewMonth, day)
    if (dateStr > effectiveMax) return

    if (!from || (from && to)) {
      onChange(dateStr, '')
      setHoverDate('')
    } else {
      if (dateStr < from) {
        onChange(dateStr, from)
      } else {
        onChange(from, dateStr)
      }
      setHoverDate('')
      setOpen(false)
    }
  }

  const pickingEnd = from && !to

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen(!open); setHoverDate('') }}
        className="flex items-center gap-2 h-10 pl-3 pr-2.5 bg-gray-50 border border-gray-200 text-sm w-full whitespace-nowrap transition-all hover:border-primary cursor-pointer rounded-lg"
      >
        {from || to ? (
          <span className="text-text">{formatDisplay(from)}{to ? ` → ${formatDisplay(to)}` : ' → ...'}</span>
        ) : (
          <span className="text-gray-400">{placeholder || 'Choisir une période'}</span>
        )}
      </button>
      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 bg-white border border-gray-200 shadow-lg p-3 w-[280px] rounded-lg">
          {pickingEnd && (
            <div className="text-[10px] text-primary font-medium mb-2 text-center">Cliquez sur la date de fin</div>
          )}
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
              const dateStr = toDateStr(viewYear, viewMonth, day)
              const isDisabled = dateStr > effectiveMax
              const isFrom = dateStr === from
              const isTo = dateStr === to
              const isToday = dateStr === todayStr

              let inRange = false
              if (from && to && dateStr > from && dateStr < to) {
                inRange = true
              } else if (from && !to && hoverDate && dateStr > from && dateStr <= hoverDate) {
                inRange = true
              } else if (from && !to && hoverDate && dateStr < from && dateStr >= hoverDate) {
                inRange = true
              }

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isDisabled}
                  onMouseEnter={() => { if (pickingEnd && !isDisabled) setHoverDate(dateStr) }}
                  onMouseLeave={() => { if (pickingEnd) setHoverDate('') }}
                  onClick={() => !isDisabled && selectDate(day)}
                  className={`h-7 text-[11px] font-medium transition-all cursor-pointer flex items-center justify-center rounded-lg ${
                    isDisabled ? 'text-gray-200 cursor-not-allowed' :
                    isFrom || isTo ? 'bg-primary text-white font-bold' :
                    inRange ? 'bg-primary/15 text-primary' :
                    isToday ? 'bg-gray-100 text-text font-bold' :
                    'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>
          {(from || to) && (
            <button type="button" onClick={() => { onChange('', ''); setHoverDate('') }} className="mt-2 w-full text-[10px] font-medium text-gray-400 hover:text-primary transition-colors cursor-pointer text-center">
              Effacer
            </button>
          )}
        </div>
      )}
    </div>
  )
}
