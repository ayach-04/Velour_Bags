import { HiXMark } from 'react-icons/hi2'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  badge?: React.ReactNode
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Supprimer', badge, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center lg:ml-64">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative bg-white w-full max-w-sm mx-4 p-6 rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-text transition-colors cursor-pointer"
        >
          <HiXMark size={20} />
        </button>
        {badge && <div className="mb-4">{badge}</div>}
        <h2 className="text-lg font-semibold text-text mb-2">{title}</h2>
        <p className="text-sm text-text-secondary mb-6">{message}</p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="h-10 px-5 text-sm text-text-secondary hover:text-text hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="h-10 px-5 bg-[#1a1a2e] hover:scale-105 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-transform cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
