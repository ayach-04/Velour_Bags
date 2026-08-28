import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { HiChevronRight, HiXMark } from 'react-icons/hi2'
import { fetchFamilles, fetchCategories } from '../api/categories'
import type { Famille, Category } from '../types'

interface SideMenuProps {
  isOpen: boolean
  onClose: () => void
}

interface MenuCategory {
  name: string
  sub: { name: string; slug: string }[]
}

function SideMenu({ isOpen, onClose }: SideMenuProps) {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const isHome = useLocation().pathname === '/'

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    Promise.all([fetchFamilles(), fetchCategories()]).then(([familles, cats]) => {
      const sortedFamilles = (familles as Famille[]).sort((a, b) => a.sortOrder - b.sortOrder)
      const mapped: MenuCategory[] = sortedFamilles.map(f => {
        const sub = (cats as Category[])
          .filter(c => {
            if (typeof c.familleId === 'object' && c.familleId !== null) {
              return (c.familleId as Famille)._id === f._id
            }
            return c.familleId === f._id
          })
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(c => ({ name: c.name, slug: c.slug }))
        return { name: f.name, sub }
      })
      setCategories(mapped)
    }).catch(() => {})
  }, [])

  const toggleCategory = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/40 transition-opacity duration-300"
        onClick={onClose}
      />

      <div className={`absolute top-0 left-0 bottom-0 w-[380px] max-w-[85vw] ${isHome ? 'bg-background' : 'bg-white'} flex flex-col overflow-y-auto animate-slide-in-left`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5">
          <h2 className="font-display text-2xl text-foreground">Menu</h2>
          <button
            onClick={onClose}
            className="cursor-pointer text-foreground p-1 hover:bg-muted flex items-center justify-center transition-colors"
            aria-label="Fermer"
          >
            <HiXMark size={22} />
          </button>
        </div>

        <div className="h-px bg-border" />

        {/* Nav Links */}
        <div className="flex flex-col">
          <Link
            to="/"
            onClick={onClose}
            className="w-full text-left px-6 py-4 font-sans text-[12px] tracking-[0.12em] uppercase text-foreground/70 hover:text-foreground transition-colors duration-200 hover:bg-muted border-b border-border/50"
          >
            Accueil
          </Link>
        </div>

        {/* Categories */}
        <div className="flex-1">
          {categories.map((cat, index) => (
            <div key={cat.name}>
              <div className="w-full flex items-center border-b border-border/50">
                <Link
                  to={`/search?famille=${encodeURIComponent(cat.name)}`}
                  onClick={onClose}
                  className="flex-1 text-left px-6 py-4 font-sans text-[12px] tracking-[0.12em] uppercase text-foreground/70 hover:text-foreground transition-colors duration-200 hover:bg-muted"
                >
                  {cat.name}
                </Link>
                {cat.sub.length > 0 && (
                  <button
                    onClick={() => toggleCategory(index)}
                    className="cursor-pointer p-4 hover:bg-muted transition-colors"
                  >
                    <HiChevronRight
                      size={13}
                      className={`text-foreground/30 transition-transform duration-300 ${expandedIndex === index ? 'rotate-90' : ''}`}
                    />
                  </button>
                )}
              </div>
              {cat.sub.length > 0 && (
                <div className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${expandedIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  {cat.sub.map((sub, i) => (
                    <Link
                      key={sub.name}
                      to={`/search?category=${encodeURIComponent(sub.name)}`}
                      onClick={onClose}
                      className={`w-full text-left block pl-14 pr-6 py-3 font-sans text-[11px] tracking-[0.08em] text-muted-foreground/60 hover:text-foreground transition-colors duration-200 hover:bg-muted ${i < cat.sub.length - 1 ? 'border-b border-border/30' : ''}`}
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="h-px bg-border" />

        {/* CTA */}
        <div className="px-6 py-6">
          <Link
            to="/search"
            onClick={onClose}
            className="w-full block py-3 bg-foreground text-background font-sans text-[11px] tracking-[0.15em] uppercase text-center hover:bg-background hover:text-foreground border border-foreground transition-all duration-300"
          >
            Toute la boutique
          </Link>
        </div>
      </div>
    </div>
  )
}

export default SideMenu
