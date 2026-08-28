import { useState, useEffect } from 'react'
import { ShoppingBag } from 'lucide-react'
import SideMenu from './SideMenu'
import SearchOverlay from './SearchOverlay'
import CartDrawer from './CartDrawer'
import { useCart } from '../context/CartContext'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { itemCount } = useCart()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <nav
        className={`sticky top-0 z-50 border-b border-border transition-all duration-300 ${
          scrolled ? 'bg-foreground/95 backdrop-blur-md' : 'bg-foreground'
        }`}
      >
        <div className="relative max-w-screen-xl mx-auto px-6 md:px-10 flex items-center justify-between h-12 md:h-14">
          <button
            className="relative z-10 flex flex-col justify-center items-center w-10 h-10 gap-1.5"
            onClick={() => setMenuOpen(true)}
            aria-label="Menu"
          >
            <span className="block w-6 h-[1.5px] bg-background" />
            <span className="block w-6 h-[1.5px] bg-background" />
            <span className="block w-6 h-[1.5px] bg-background" />
          </button>

          <a href="/" className="font-display text-2xl md:text-3xl tracking-wider text-background">
            Velour
          </a>

          <div className="relative z-10 flex items-center gap-5">
            <button
              className="bg-transparent border-none cursor-pointer text-background p-1 hover:opacity-60 transition-opacity"
              onClick={() => setSearchOpen(true)}
              aria-label="Rechercher"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </button>
            <button
              className="relative text-background bg-transparent border-none cursor-pointer p-0"
              onClick={() => setCartOpen(true)}
              aria-label="Panier"
            >
              <ShoppingBag size={19} strokeWidth={1.5} />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-accent text-background text-[8px] flex items-center justify-center font-sans font-semibold">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      <SideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}
