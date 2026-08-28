import { HiXMark, HiMinus, HiPlus, HiTrash } from 'react-icons/hi2'
import { ShoppingBag } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, itemCount, total, removeItem, updateQuantity } = useCart()
  const isHome = useLocation().pathname === '/'

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-[1000] transition-opacity duration-300 ease-in ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 h-[100dvh] w-[400px] max-w-[90vw] ${isHome ? 'bg-background' : 'bg-white'} z-[1001] flex flex-col transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-border">
          <span className="font-display text-2xl text-foreground">
            Panier ({itemCount})
          </span>
          <button
            className="cursor-pointer text-foreground p-1 hover:bg-muted flex items-center justify-center transition-colors"
            onClick={onClose}
          >
            <HiXMark size={22} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-16 h-16 bg-muted flex items-center justify-center mb-5">
              <ShoppingBag size={26} strokeWidth={1.5} className="text-muted-foreground/40" />
            </div>
            <p className="text-[13px] font-sans text-muted-foreground mb-4">Votre panier est vide</p>
            <Link
              to="/search"
              onClick={onClose}
              className="px-6 py-2.5 bg-foreground text-background font-sans text-[11px] tracking-[0.15em] uppercase hover:bg-background hover:text-foreground border border-foreground transition-all duration-300"
            >
              Découvrir nos produits
            </Link>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {items.map((item, index) => (
              <div
                key={(item.product as any)._id || item.product.id || index}
                className={`flex gap-4 px-6 py-5 ${index < items.length - 1 ? 'border-b border-border/50' : ''}`}
              >
                <div className="w-20 h-20 bg-muted shrink-0 overflow-hidden">
                  <img
                    src={item.color?.image || item.product.image}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h4 className="text-[13px] font-medium text-foreground line-clamp-2 mb-1">
                      {item.product.name}
                    </h4>
                    {item.color?.name && (
                      <p className="text-[11px] text-muted-foreground/60 mb-0.5">Couleur: {item.color.name}</p>
                    )}
                    {item.volume && (
                      <p className="text-[11px] text-muted-foreground/60 mb-0.5">Format: {item.volume.label}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border border-border">
                      <button
                        onClick={() => updateQuantity(item.key, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="w-7 h-7 flex items-center justify-center text-foreground hover:bg-muted transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <HiMinus size={10} />
                      </button>
                      <span className="w-8 text-center text-[12px] font-medium text-foreground">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.key, item.quantity + 1)}
                        disabled={item.color?.stock !== undefined ? item.quantity >= item.color.stock : item.volume?.stock !== undefined ? item.quantity >= item.volume.stock : (item.product as any).stock !== undefined && item.quantity >= (item.product as any).stock}
                        className="w-7 h-7 flex items-center justify-center text-foreground hover:bg-muted transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <HiPlus size={10} />
                      </button>
                    </div>
                    <p className="text-[13px] text-foreground">
                      {Math.round(item.color?.price ?? item.volume?.price ?? item.product.price)} DA
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeItem(item.key)}
                  className="self-start text-muted-foreground/30 hover:text-accent transition-colors cursor-pointer mt-0.5"
                >
                  <HiTrash size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="border-t border-border px-6 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground font-sans">Sous-total</span>
              <span className="text-[15px] font-medium text-foreground">{Math.round(total)} DA</span>
            </div>
            {total >= 10000 ? (
              <p className="text-[11px] text-accent font-medium font-sans">Livraison offerte</p>
            ) : (
              <p className="text-[11px] text-muted-foreground/60 font-sans">
                Plus que <span className="font-semibold text-foreground">{Math.round(10000 - total)} DA</span> pour la livraison offerte
              </p>
            )}
            <Link
              to="/paiement"
              onClick={onClose}
              className="w-full block py-3 bg-foreground text-background font-sans text-[11px] tracking-[0.15em] uppercase text-center hover:bg-background hover:text-foreground border border-foreground transition-all duration-300"
            >
              Paiement
            </Link>
          </div>
        )}
      </div>
    </>
  )
}

export default CartDrawer
