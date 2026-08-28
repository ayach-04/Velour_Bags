import { useState, useEffect } from 'react'
import { HiCheck, HiArrowUturnLeft } from 'react-icons/hi2'
import Modal from './Modal'
import { returnOrder as apiReturnOrder, type Order } from '../api/orders'

interface ShippedReturnDialogProps {
  open: boolean
  orders: Order[]
  onClose: () => void
  onDone: () => void
}

export default function ShippedReturnDialog({ open, orders, onClose, onDone }: ShippedReturnDialogProps) {
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [restoreMap, setRestoreMap] = useState<Record<string, Set<string>>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      const m: Record<string, Set<string>> = {}
      orders.forEach(o => {
        m[o._id] = new Set(o.items.map(i => i.product))
      })
      setRestoreMap(m)
      setReasons({})
    }
  }, [open])

  function toggleItem(orderId: string, productId: string) {
    setRestoreMap(prev => {
      const next = { ...prev }
      const set = new Set(next[orderId])
      if (set.has(productId)) set.delete(productId)
      else set.add(productId)
      next[orderId] = set
      return next
    })
  }

  async function handleConfirm() {
    setSaving(true)
    try {
      await Promise.all(orders.map(o =>
        apiReturnOrder(o._id, {
          restoreItems: [...(restoreMap[o._id] || [])],
          reason: reasons[o._id] || '',
        })
      ))
      onDone()
    } finally {
      setSaving(false)
    }
  }

  const totalItems = orders.reduce((s, o) => s + o.items.length, 0)

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-5xl" className="lg:ml-64 z-[1001]" title={<>Retourner ({orders.length} commande{orders.length !== 1 ? 's' : ''} · {totalItems} article{totalItems !== 1 ? 's' : ''})</>}>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto -mx-5 px-5">
        {orders.map(order => {
          const checkedCount = restoreMap[order._id]?.size || 0
          const allRestored = checkedCount === order.items.length

          return (
            <div key={order._id} className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text">Commande #{order.orderNumber}</span>
                  {order.deliveryCompany?.returnPrice != null && (
                    <span className="ml-auto text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                      Retour: {order.deliveryCompany.returnPrice === 0 ? 'Gratuit' : `${order.deliveryCompany.returnPrice} DA`}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                  <span>{order.firstName} {order.lastName}</span>
                  <span>·</span>
                  <span>{order.phone}</span>
                  <span>·</span>
                  <span>{order.wilaya}</span>
                  <span>·</span>
                  <span>{order.deliveryCompany?.abbreviation || order.deliveryCompany?.name || 'Sans transporteur'}</span>
                </div>
              </div>

              <div className="px-5 py-4 space-y-2">
                {order.items.length > 1 && (
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border border-gray-200">
                    <div
                      className={`w-4 h-4 flex items-center justify-center border transition-all cursor-pointer shrink-0 rounded-md ${allRestored ? 'bg-[#1a1a2e] border-[#1a1a2e]' : 'bg-white border-gray-300'}`}
                      onClick={() => {
                        if (allRestored) setRestoreMap(prev => ({ ...prev, [order._id]: new Set() }))
                        else setRestoreMap(prev => ({ ...prev, [order._id]: new Set(order.items.map(i => i.product)) }))
                      }}
                    >
                      {allRestored && <HiCheck size={10} className="text-white" />}
                    </div>
                    <span className="text-xs font-medium text-text">Tout sélectionner</span>
                    <span className="text-[10px] text-gray-400 ml-auto">{checkedCount}/{order.items.length} sélectionné{checkedCount > 1 ? 's' : ''}</span>
                  </div>
                )}
                {order.items.map(item => {
                  const checked = restoreMap[order._id]?.has(item.product) || false
                  return (
                    <div
                      key={item.product}
                      className={`flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer ${checked ? 'bg-white border border-gray-200' : 'bg-white border border-gray-100 opacity-70 hover:opacity-100'}`}
                      onClick={() => toggleItem(order._id, item.product)}
                    >
                      <div className={`w-4 h-4 flex items-center justify-center border transition-all shrink-0 rounded-md ${checked ? 'bg-[#1a1a2e] border-[#1a1a2e]' : 'bg-white border-gray-300'}`}>
                        {checked && <HiCheck size={10} className="text-white" />}
                      </div>
                      {item.image && (
                        <img src={item.image} alt="" className="w-9 h-9 object-cover rounded shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${checked ? 'text-text' : 'text-gray-400'}`}>{item.name}</p>
                        <p className="text-xs text-gray-400">{item.quantity} × {Math.round(item.price)} DA</p>
                      </div>
                      <span className="text-xs font-medium text-gray-500 shrink-0">{Math.round(item.price * item.quantity)} DA</span>
                    </div>
                  )
                })}
                <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
                  {checkedCount > 0 ? (
                    <span>{checkedCount}/{order.items.length} à restituer</span>
                  ) : (
                    <span className="text-orange-500">Aucun produit à restituer</span>
                  )}
                  {allRestored && <span className="text-green-500">· Tous les produits seront restitués</span>}
                </div>
              </div>

              <div className="px-5 py-3 border-t border-gray-200 bg-gray-100/50">
                <input
                  value={reasons[order._id] || ''}
                  onChange={e => setReasons(prev => ({ ...prev, [order._id]: e.target.value }))}
                  placeholder="Motif du retour (optionnel)"
                  className="w-full h-9 px-3 bg-white border border-gray-200 rounded-lg text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-gray-100 -mx-5 px-5">
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="h-9 px-4 bg-[#1a1a2e] hover:bg-[#2a2a3e] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 rounded-lg"
        >
          {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          <HiArrowUturnLeft size={14} /> Retourner ({orders.length})
        </button>
      </div>
    </Modal>
  )
}