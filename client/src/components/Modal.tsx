import { useEffect, useRef } from 'react'
import { HiXMark } from 'react-icons/hi2'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  children: React.ReactNode
  className?: string
  maxWidth?: string
}

export default function Modal({ open, onClose, title, children, className, maxWidth }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  const maxWidthClasses: Record<string, string> = {
    'max-w-lg': 'sm:max-w-lg',
    'max-w-xl': 'sm:max-w-xl',
    'max-w-2xl': 'sm:max-w-2xl',
    'max-w-3xl': 'sm:max-w-3xl',
    'max-w-5xl': 'sm:max-w-5xl',
  }

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[1000] flex items-start justify-center pt-4 px-4 pb-8 overflow-y-auto ${className || ''}`}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="fixed inset-0 bg-black/40" />
      <div className={`relative bg-white shadow-xl w-full max-w-sm ${maxWidth ? maxWidthClasses[maxWidth] : 'sm:max-w-lg'} rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-text">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-text hover:bg-gray-100 rounded-none transition-all cursor-pointer">
            <HiXMark size={18} />
          </button>
        </div>
        <div className="px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  )
}
