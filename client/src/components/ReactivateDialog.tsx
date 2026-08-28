import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiExclamationTriangle, HiBuildingStorefront, HiArrowPath, HiXMark, HiTrash } from 'react-icons/hi2'
import type { OutOfStockItem } from '../api/orders'

export interface ReactivateConflict {
  orderId: string
  orderNumber: number
  items: OutOfStockItem[]
  totalItems: number
}

interface ReactivateDialogProps {
  open: boolean
  conflicts: ReactivateConflict[]
  loading: boolean
  onReactivate: (conflicts: { orderId: string; removeProducts: string[] }[]) => void
  onRetry: () => void
  onClose: () => void
}

export default function ReactivateDialog({ open, conflicts, loading, onReactivate, onRetry, onClose }: ReactivateDialogProps) {
  const navigate = useNavigate()
  const [retrying, setRetrying] = useState(false)
  const [actionIds, setActionIds] = useState<Set<string>>(new Set())

  if (!open) return null

  async function handleRetry() {
    setRetrying(true)
    try { onRetry() } finally { setRetrying(false) }
  }

  function handleOrderAction(conflict: ReactivateConflict) {
    setActionIds(prev => new Set(prev).add(conflict.orderId))
    onReactivate([{
      orderId: conflict.orderId,
      removeProducts: conflict.items.map(i => i.product),
    }])
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center lg:ml-64">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-xl mx-4 animate-in fade-in zoom-in-95 duration-200 rounded-2xl shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-text transition-colors cursor-pointer z-10"
        >
          <HiXMark size={20} />
        </button>

        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-red-50 flex items-center justify-center rounded-lg">
              <HiExclamationTriangle size={18} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">Stock insuffisant</h2>
              <p className="text-xs text-gray-400">Produits indisponibles pour la réactivation</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-4 space-y-4 max-h-[50vh] overflow-y-auto">
          {conflicts.map(conflict => {
            const allOut = (conflict.totalItems ?? conflict.items.length) === conflict.items.length
            const pending = actionIds.has(conflict.orderId)
            return (
              <div key={conflict.orderId} className="border border-gray-100 bg-gray-50/50 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white">
                  <span className="text-xs font-semibold text-text">Commande #{conflict.orderNumber}</span>
                  {allOut ? (
                    <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">Tous en rupture</span>
                  ) : (
                    <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">{conflict.items.length}/{conflict.totalItems} produits en rupture</span>
                  )}
                </div>
                <div className="px-4 py-3 space-y-1.5">
                  {conflict.items.map(item => (
                    <div key={item.product} className="flex items-center gap-3 px-3 py-2.5 bg-white border border-red-100">
                      {item.image && (
                        <img src={item.image} alt="" className="w-8 h-8 object-cover rounded shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">{item.name}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">{item.available}</span>
                        <span className="text-[10px] text-gray-300">/</span>
                        <span className="text-[10px] font-medium text-gray-500">{item.needed}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 border-t border-gray-100 bg-white flex justify-end">
                  <button
                    onClick={() => handleOrderAction(conflict)}
                    disabled={loading || pending}
                    className={`h-8 px-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 rounded-lg ${
                      allOut
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-[#1a1a2e] text-white hover:scale-105'
                    }`}
                  >
                    {pending && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                    {allOut ? (
                      <><HiTrash size={12} /> Supprimer</>
                    ) : (
                      'Réactiver sans'
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-2">
          <button
            onClick={() => navigate('/admin/stock')}
            className="h-9 px-3 flex items-center gap-1.5 text-xs font-medium text-[#1a1a2e] bg-gray-100 hover:bg-gray-200 transition-all cursor-pointer rounded-lg"
          >
            <HiBuildingStorefront size={14} />
            Restock
          </button>
          <button
            onClick={handleRetry}
            disabled={retrying || loading}
            className="h-9 px-3 flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-all cursor-pointer disabled:opacity-50 rounded-lg"
          >
            <HiArrowPath size={13} className={retrying ? 'animate-spin' : ''} />
            Re-vérifier
          </button>
        </div>
      </div>
    </div>
  )
}
