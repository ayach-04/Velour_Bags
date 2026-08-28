import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiArrowRight } from 'react-icons/hi2'
import TopBar from '../components/TopBar'
import Navbar from '../components/Navbar'
import SideMenu from '../components/SideMenu'
import ProductCard from '../components/ProductCard'
import SectionDivider from '../components/SectionDivider'
import ScrollCarousel from '../components/ScrollCarousel'
import FeaturesSection from '../components/FeaturesSection'
import Footer from '../components/Footer'
import { isProductNew } from '../utils/product'
import { getCachedProducts, refreshProducts } from '../api/catalog'
import { fetchFamilles } from '../api/categories'
import heroVid from '../assets/hero-vid.mp4'

function Hero({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <section className="relative min-h-[95vh] grid grid-cols-1 md:grid-cols-[1fr_55%] overflow-hidden">
      <div className="flex flex-col px-6 md:px-10 py-20 bg-background order-2 md:order-1">
        <p className="font-sans text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-10">
          Automne &mdash; Hiver 2026
        </p>
        <h1 className="font-display text-[4.5rem] md:text-[5.5rem] lg:text-[7rem] leading-[0.88] text-foreground mb-10">
          L'Art du Cuir
        </h1>
        <p className="font-sans text-sm text-muted-foreground leading-relaxed mb-12 font-light tracking-wide">
          Maroquinerie de caractere, faconnee a la main. Chaque piece porte l'empreinte d'un savoir-faire qui traverse le temps.
        </p>
        <div className="flex items-center gap-5 md:gap-8 flex-wrap">
          <button
            onClick={() => onNavigate('/search')}
            className="bg-foreground text-background font-sans px-6 py-3 md:px-9 md:py-3.5 text-[10px] tracking-[0.18em] uppercase hover:bg-accent transition-colors duration-300 cursor-pointer"
          >
            Decouvrir
          </button>
          <a
            href="/search"
            className="font-sans text-[10px] tracking-[0.18em] uppercase border-b border-foreground pb-0.5 hover:text-accent hover:border-accent transition-colors duration-200 flex items-center gap-2"
          >
            Voir tout <HiArrowRight size={11} />
          </a>
        </div>
      </div>

      <div className="relative h-[110vw] md:h-auto order-1 md:order-2 bg-muted overflow-hidden">
        <video
          src={heroVid}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-foreground/[0.07]" />
        <div className="absolute bottom-8 left-8 bg-background/90 backdrop-blur-sm px-5 py-3">
          <p className="font-sans text-[9px] tracking-[0.2em] uppercase text-muted-foreground">Collection</p>
          <p className="font-display text-xl text-foreground leading-tight">Automne 2026</p>
        </div>
      </div>
    </section>
  )
}

function CategoryCarousel({ onOpenMenu, onNavigate }: { onOpenMenu: () => void; onNavigate: (path: string) => void }) {
  const [familles, setFamilles] = useState<{ name: string; image: string; slug: string }[]>([])

  useEffect(() => {
    fetchFamilles()
      .then(f => {
        const order = ['Bags', 'Wallets', 'Accessories']
        const sorted = f.filter(x => x.isActive)
          .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name))
        setFamilles(sorted.map(x => ({ name: x.name, image: x.image, slug: x.slug })))
      })
      .catch(() => {})
  }, [])

  const allCategories = [
    { name: 'Nouvelle Arrivée', img: 'https://i.pinimg.com/1200x/72/89/52/7289520efbae6efed83d343a72bde0fb.jpg', link: '/search?sort=newest' },
    ...familles.map(f => ({ name: f.name, img: f.image || 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=900&h=1100&fit=crop&auto=format', link: `/search?famille=${encodeURIComponent(f.name)}` })),
  ]

  return (
    <section className="py-14 bg-foreground text-background">
      <div className="max-w-screen-xl mx-auto px-8 md:px-10 mb-8 flex items-baseline justify-between">
        <h2 className="font-display text-3xl md:text-4xl text-background">Nos Univers</h2>
        <button onClick={onOpenMenu} className="font-sans text-[10px] tracking-[0.18em] uppercase text-background hover:text-background/70 flex items-center gap-2 transition-colors cursor-pointer">
          Tout explorer <HiArrowRight size={11} />
        </button>
      </div>
      <div className="max-w-screen-xl mx-auto px-8 md:px-10 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {allCategories.map(cat => (
          <a key={cat.name} href={cat.link} onClick={(e) => { e.preventDefault(); onNavigate(cat.link) }} className="group block">
            <div className="relative h-60 md:h-80 overflow-hidden bg-muted mb-3">
              <img src={cat.img} alt={cat.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
            </div>
            <p className="font-sans text-xs tracking-[0.18em] uppercase font-medium text-background group-hover:underline underline-offset-4">{cat.name}</p>
          </a>
        ))}
      </div>
    </section>
  )
}

function NewDrops({ products }: { products: any[] }) {
  const drops = products.filter(p => isProductNew(p)).slice(0, 5)
  const items = drops.length === 0 ? products.slice(0, 5) : drops
  return (
    <section className="pb-16 bg-foreground text-background">
      <SectionDivider label="Nouvelle Arrivée" />
      <div className="max-w-screen-xl mx-auto px-8 md:px-10">
        <ScrollCarousel>
          {items.map(p => (
            <div key={p.id || (p as any)._id} className="flex-none w-[45vw] md:w-auto">
              <ProductCard product={p} />
            </div>
          ))}
        </ScrollCarousel>
      </div>
    </section>
  )
}

function PromoBanner({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [product, setProduct] = useState<any>(null)

  useEffect(() => {
    let mounted = true
    const findEdition = (list: any[]) =>
      list.find((p: any) =>
        p.published !== false && p.colors?.some((c: any) => c.name?.toLowerCase() === '#78262d')
      )
    const fromCache = findEdition(getCachedProducts())
    if (fromCache) { setProduct(fromCache); return }
    refreshProducts()
      .then(list => { if (mounted) { const match = findEdition(list); if (match) setProduct(match) } })
      .catch(() => {})
    return () => { mounted = false }
  }, [])

  if (!product) return null

  const editionColor = product.colors.find((c: any) => c.name?.toLowerCase() === '#78262d')
  const stock = editionColor?.stock ?? 0

  return (
    <section className="bg-accent text-background overflow-hidden h-[480px] md:h-[560px]">
      <div className="max-w-screen-xl mx-auto grid grid-cols-1 md:grid-cols-[50%_1fr] h-full">
        <div className="flex flex-col px-6 md:px-10 pt-16 md:pt-24 pb-10 md:pb-16 order-2 md:order-2">
          <p className="font-sans text-[10px] tracking-[0.22em] uppercase text-background/50 mb-6">Edition Limitee</p>
          <h2 className="font-display text-[3.5rem] md:text-[4.5rem] lg:text-[6rem] leading-[0.88] mb-6">
            {product.name}
          </h2>
          <p className="font-sans text-sm leading-relaxed text-background/65 mb-8 font-light tracking-wide">
            {product.description}
          </p>
          <div className="flex items-center gap-5 md:gap-8 flex-wrap">
            <button
              onClick={() => onNavigate(`/product/${product.id || product._id}`)}
              className="bg-background text-foreground font-sans px-6 py-3 md:px-9 md:py-3.5 text-[10px] tracking-[0.18em] uppercase hover:bg-muted transition-colors duration-300 cursor-pointer"
            >
              Decouvrir l'edition
            </button>
            <span className="font-sans text-[10px] tracking-[0.15em] uppercase text-background/40">{stock} pieces restantes</span>
          </div>
        </div>
        <div className="relative h-full order-1 md:order-1 bg-accent/80">
          <img
            src="https://alemi-zurich.com/cdn/shop/files/alemi-seefeld-mini-small-bag-red-saffiano-leather-model-carrying-bag-by-handle-close-up.jpg?v=1776547843&width=1000"
            alt={`Edition ${product.name}`}
            className="w-full h-full object-cover object-bottom"
          />
        </div>
      </div>
    </section>
  )
}

function BestSellers({ products }: { products: any[] }) {
  const sellers = products.slice(0, 4)
  return (
    <section className="py-16 bg-foreground text-background">
      <SectionDivider label="Meilleures Ventes" />
      <div className="max-w-screen-xl mx-auto px-8 md:px-10">
        <ScrollCarousel columns={4}>
          {sellers.map(p => (
            <div key={p.id || (p as any)._id} className="flex-none w-[45vw] md:w-auto">
              <ProductCard product={p} size="lg" />
            </div>
          ))}
        </ScrollCarousel>
      </div>
    </section>
  )
}

function EditorialStrip() {
  return (
    <section className="relative h-64 md:h-80 overflow-hidden bg-muted">
      <img
        src="https://images.unsplash.com/photo-1732210571848-1e673e7f1391?w=1400&h=400&fit=crop&auto=format&crop=top"
        alt="Editorial Velour"
        className="w-full h-full object-cover object-top"
      />
      <div className="absolute inset-0 bg-foreground/40" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-background text-center px-6">
        <p className="font-sans text-[10px] tracking-[0.25em] uppercase text-background/60 mb-4">Editorial &mdash; Saison Automne</p>
        <h3 className="font-display text-4xl md:text-6xl mb-6">Habillee pour durer</h3>
        <a href="#" className="font-sans text-[10px] tracking-[0.18em] uppercase border-b border-background/60 pb-0.5 hover:border-background transition-colors duration-200">
          Lire le lookbook
        </a>
      </div>
    </section>
  )
}

function ProductGridSkeleton() {
  return (
    <section className="py-16 bg-foreground text-background">
      <SectionDivider label="Nouvelle Arrivée" />
      <div className="max-w-screen-xl mx-auto px-8 md:px-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-square bg-foreground/60 animate-pulse" />
              <div className="h-3 bg-foreground/50 animate-pulse w-3/4" />
              <div className="h-3 bg-foreground/50 animate-pulse w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CategoryBanners() {
  const [banners, setBanners] = useState<{ title: string; img: string; link: string }[]>([])

  useEffect(() => {
    fetch('/api/categories')
      .then(res => { if (res.ok) return res.json(); throw new Error() })
      .then((cats: any[]) => {
        const targets = ['Mini Bags', 'Clutch Bags']
        const found = cats.filter((c: any) => targets.includes(c.name))
        setBanners(found.map((c: any) => ({
          title: c.name,
          img: c.image || 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=900&h=1100&fit=crop&auto=format',
          link: `/search?category=${encodeURIComponent(c.name)}`,
        })))
      })
      .catch(() => {})
  }, [])

  if (banners.length < 2) return null

  return (
    <section className="grid grid-cols-2 h-[480px] md:h-[560px]">
      {banners.map(b => (
        <a key={b.title} href={b.link} className="group relative overflow-hidden">
          <img src={b.img} alt={b.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-foreground/30" />
          <p className="absolute bottom-4 left-4 font-display text-lg md:text-2xl text-background">{b.title}</p>
        </a>
      ))}
    </section>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [apiProducts, setApiProducts] = useState<any[] | null>(() => {
    const cached = getCachedProducts()
    return cached.length > 0 ? cached : null
  })
  const [loading, setLoading] = useState(() => getCachedProducts().length === 0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    refreshProducts()
      .then(data => { if (mounted) { setApiProducts(data); setLoading(false) } })
      .catch(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const products = apiProducts ?? []
  const publishedProducts = products.filter((p: any) => p.published !== false)

  const handleNavigate = useCallback((path: string) => {
    navigate(path)
  }, [navigate])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <SideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="flex-1 overflow-x-hidden">
        <Hero onNavigate={handleNavigate} />
        <TopBar />
        <CategoryCarousel onOpenMenu={() => setMenuOpen(true)} onNavigate={handleNavigate} />

        {loading ? (
          <ProductGridSkeleton />
        ) : (
          <>
            <NewDrops products={publishedProducts} />
            <PromoBanner onNavigate={handleNavigate} />
            <CategoryBanners />
            <BestSellers products={publishedProducts} />
          </>
        )}

        <EditorialStrip />
        <FeaturesSection />
      </main>

      <Footer onNavigate={handleNavigate} />
    </div>
  )
}
