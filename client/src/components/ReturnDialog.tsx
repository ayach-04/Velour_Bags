import { useState } from 'react'
import { HiXMark, HiArrowUturnLeft } from 'react-icons/hi2'

interface ReturnDialogProps {
  open: boolean
  orderNumber?: number
  onConfirm: (reason: string, restoreStock: boolean) => void
  onCancel: () => void
  loading?: boolean
}

export default function ReturnDialog({ open, orderNumber, onConfirm, onCancel, loading }: ReturnDialogProps) {
  const [reason, setReason] = useState('')
  const [restoreStock, setRestoreStock] = useState(true)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative bg-white w-full max-w-md mx-4 p-6 rounded-2xl shadow-xl">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-text transition-colors cursor-pointer"
        >
          <HiXMark size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-orange-50 flex items-center justify-center rounded-lg">
            <HiArrowUturnLeft size={18} className="text-orange-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text">Retourner la commande</h2>
            {orderNumber && <p className="text-xs text-gray-400">Commande #{orderNumber}</p>}
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Motif du retour</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ex: Client absent, changement d'avis..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none"
            />
          </div>

          <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl overflow-hidden">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={restoreStock}
                onChange={e => setRestoreStock(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-[#1a1a2e] cursor-pointer"
              />
              <div>
                <span className="text-sm font-medium text-text block">Restituer le stock</span>
                <span className="text-xs text-gray-400">Remettre les produits en stock automatiquement</span>
              </div>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="h-9 px-4 text-sm text-gray-500 hover:text-text transition-colors cursor-pointer rounded-lg"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(reason, restoreStock)}
            disabled={loading}
            className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 rounded-lg"
          >
            {loading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <HiArrowUturnLeft size={14} /> Retourner
          </button>
        </div>
      </div>
    </div>
  )
}
