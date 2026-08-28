import { HiCheck, HiChevronDown, HiPhone, HiShoppingBag } from 'react-icons/hi2'
import type { Order } from '../api/orders'

interface OrderMobileCardProps {
  order: Order
  selected?: boolean
  onToggle?: () => void
  badge?: React.ReactNode
  detailLines?: React.ReactNode[]
  footer?: React.ReactNode
}

export default function OrderMobileCard({ order, selected = false, onToggle, badge, detailLines = [], footer }: OrderMobileCardProps) {
  return (
    <div className="md:hidden m-3 rounded-xl border border-gray-100 bg-white shadow-sm p-4">
      <div className="flex items-center gap-3">
        {onToggle && (
          <button onClick={e => { e.stopPropagation(); onToggle() }} className={`w-5 h-5 flex items-center justify-center border transition-all cursor-pointer shrink-0 rounded-md ${selected ? 'bg-primary border-primary' : 'bg-white border-gray-300 hover:border-primary'}`}>
            {selected && <HiCheck size={10} className="text-white" />}
          </button>
        )}
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <span className="text-[11px] font-bold text-primary">#{order.orderNumber}</span>
          {badge}
        </div>
        <HiChevronDown size={16} className="text-gray-300 -rotate-90 shrink-0" />
      </div>
      <p className="text-[15px] font-semibold text-text mt-2.5 truncate">{order.firstName} {order.lastName}</p>
      <div className="mt-2.5 space-y-1.5">
        <p className="flex items-center gap-2 text-xs text-gray-500">
          <HiPhone size={13} className="text-gray-300 shrink-0" />
          <span className="truncate">{order.phone}</span>
          <span className="w-1 h-1 rounded-full bg-gray-200 shrink-0" />
          <span className="truncate">{order.wilaya}</span>
        </p>
        <p className="flex items-center gap-2 text-xs text-gray-500">
          <HiShoppingBag size={13} className="text-gray-300 shrink-0" />
          <span>{order.items.length} article{order.items.length !== 1 ? 's' : ''}</span>
          <span className="w-1 h-1 rounded-full bg-gray-200 shrink-0" />
          <span>{order.deliveryMethod === 'home' ? 'Domicile' : order.deliveryMethod === 'stopdesk' ? 'Stop desk' : 'Gratuit'}</span>
          <span className="w-1 h-1 rounded-full bg-gray-200 shrink-0" />
          <span>{new Date(order.createdAt).toLocaleDateString('fr-FR')}</span>
        </p>
        {detailLines}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total</span>
        <span className="text-[15px] font-bold text-text tabular-nums">{Math.round(order.total)} DA</span>
      </div>
      {footer}
    </div>
  )
}
