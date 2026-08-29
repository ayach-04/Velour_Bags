import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { HiShoppingBag, HiPhoto, HiCheck, HiMinus, HiPlus, HiTruck, HiShieldCheck, HiCreditCard, HiChevronDown } from 'react-icons/hi2'
import { useCart } from '../context/CartContext'
import { isProductNew } from '../utils/product'
import ScrollCarousel from '../components/ScrollCarousel'
import ProductCard from '../components/ProductCard'
import ColorSwatches from '../components/ColorSwatches'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-gray-200">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-4 cursor-pointer">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.15em]">{title}</span>
        <HiChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-[500px] opacity-100 pb-5' : 'max-h-0 opacity-0'}`}>
        {children}
      </div>
    </div>
  )
}

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [apiProduct, setApiProduct] = useState<any>(null)
  const [related, setRelated] = useState<any[]>([])
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedColor, setSelectedColor] = useState(0)
  const [imgError, setImgError] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const { addItem } = useCart()

  useEffect(() => {
    setSelectedImage(0)
    setSelectedColor(0)
    setImgError(false)
    setQuantity(1)

    let cancelled = false
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/products/${id}`)
      .then(res => { if (res.ok) return res.json(); throw new Error() })
      .then(data => { if (!cancelled) { setApiProduct(data); setImgError(false) } })
      .catch(() => {})

    fetch('/api/products')
      .then(res => res.json())
      .then((all: any[]) => {
        if (cancelled) return
        const pid = Number(id)
        setRelated(all.filter((p: any) => (p.id !== undefined ? p.id !== pid : p._id !== id) && p.published !== false).sort(() => Math.random() - 0.5).slice(0, 6))
      })
      .catch(() => {
        if (!cancelled) setRelated([])
      })

    return () => { cancelled = true }
  }, [id])

  const product = apiProduct

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-foreground rounded-full animate-spin" />
        </main>
        <Footer />
      </div>
    )
  }

  const colors = product.colors && product.colors.length > 0 ? product.colors : null
  const selectedCol = colors ? colors[Math.min(selectedColor, colors.length - 1)] : null
  const colStock = selectedCol ? (selectedCol.stock ?? 0) : product.stock
  const allOut = colors
    ? colors.every((c: any) => (c.stock ?? 0) <= 0)
    : (product.stock !== undefined && product.stock <= 0)
  const outOfStock = colors ? (selectedCol?.stock ?? 0) <= 0 : allOut
  const displayPrice = selectedCol ? selectedCol.price : product.price
  const displayBase = selectedCol?.oldPrice ?? product.oldPrice
  const discount = displayBase && displayBase > displayPrice ? Math.round((1 - displayPrice / displayBase) * 100) : 0

  const mainImage = selectedCol?.image || product.image
  const colorImages = selectedCol?.images?.length
    ? [selectedCol.image, ...selectedCol.images.filter((i: string) => i !== selectedCol.image)]
    : [product.image, ...(product.images?.filter((i: string) => i !== product.image) || [])]
  const allImages = colorImages.length > 0 ? colorImages : [product.image]

  const handleAddToCart = () => {
    addItem(product, quantity, selectedCol || undefined)
  }

  const totalColorStock = colors ? colors.reduce((sum: number, c: any) => sum + (c.stock ?? 0), 0) : (colStock ?? 0)

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="flex-1 overflow-x-hidden bg-white">
        <div className="max-w-[1360px] mx-auto px-5 md:px-6 pt-6 pb-20">

          {/* Breadcrumb - Mobile */}
          <nav className="flex lg:hidden items-center gap-2 text-[11px] uppercase tracking-wide text-gray-400 mb-4">
            <Link to="/" className="hover:text-foreground transition-colors">Accueil</Link>
            <span>/</span>
            {product.brand && (
              <>
                <Link to="/search" className="hover:text-foreground transition-colors">{product.brand}</Link>
                <span>/</span>
              </>
            )}
            <span className="text-foreground">{product.name}</span>
          </nav>

          {/* 50/50 Grid: Gallery + Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">

            {/* Left: Gallery */}
            <div className="flex gap-3">
              {/* Vertical Thumbnails (desktop) */}
              {allImages.length > 1 && (
                <div className="hidden lg:flex flex-col gap-2 max-h-[520px] overflow-y-auto scrollbar-hide">
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => { setSelectedImage(i); setImgError(false) }}
                      className={`relative w-[68px] h-[68px] shrink-0 overflow-hidden transition-all cursor-pointer ${i === selectedImage ? 'ring-1 ring-foreground' : 'opacity-50 hover:opacity-80'}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Main Image */}
              <div className="relative aspect-square w-full max-w-[520px] bg-gray-50 overflow-hidden">
                {imgError ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <HiPhoto size={64} className="text-gray-200" />
                  </div>
                ) : (
                  <img
                    src={allImages[selectedImage] || mainImage}
                    alt={product.name}
                    className={`w-full h-full object-cover transition-opacity duration-500 ${allOut ? 'opacity-40' : ''}`}
                    onError={() => setImgError(true)}
                  />
                )}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                  {allOut && (
                    <span className="bg-foreground text-white text-[9px] font-bold px-3 py-1 uppercase tracking-[0.15em]">
                      Epuise
                    </span>
                  )}
                  {!allOut && isProductNew(product) && (
                    <span className="bg-accent text-white text-[9px] font-bold px-3 py-1 uppercase tracking-[0.15em]">
                      New
                    </span>
                  )}
                  {!allOut && discount > 0 && (
                    <span className="bg-accent text-white text-[9px] font-bold px-3 py-1 uppercase tracking-[0.15em]">
                      -{discount}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex lg:hidden gap-2 overflow-x-auto scrollbar-hide -mx-5 md:-mx-6 px-5 md:px-6 mb-4 col-span-full">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelectedImage(i); setImgError(false) }}
                    className={`relative w-16 h-16 shrink-0 overflow-hidden transition-all cursor-pointer ${i === selectedImage ? 'ring-1 ring-foreground' : 'opacity-50 hover:opacity-80'}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Right: Product Info */}
            <div className="flex flex-col max-w-[520px] w-full mx-auto">

              {/* Breadcrumb - Desktop */}
              <nav className="hidden lg:flex items-center gap-2 text-[11px] uppercase tracking-wide text-gray-400 mb-6">
                <Link to="/" className="hover:text-foreground transition-colors">Accueil</Link>
                <span>/</span>
                {product.brand && (
                  <>
                    <Link to="/search" className="hover:text-foreground transition-colors">{product.brand}</Link>
                    <span>/</span>
                  </>
                )}
                <span className="text-foreground">{product.name}</span>
              </nav>

              {/* Title */}
              <h1 className="font-display text-2xl md:text-3xl text-foreground leading-tight mb-1">
                {product.name}
              </h1>

              {/* Price */}
              <div className="mb-5">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-xl font-medium text-gray-500">
                    {Math.round(displayPrice)} DA
                  </span>
                  {displayBase && displayBase > displayPrice && (
                    <span className="text-sm text-gray-400 line-through">
                      {Math.round(displayBase)} DA
                    </span>
                  )}
                </div>
              </div>

              {/* Variant Picker (Image Swatches) */}
              {colors && colors.length > 0 && (
                <div className="mb-6">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em] mb-3">
                    {selectedCol?.name || 'Coloris'}
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    <ColorSwatches
                      colors={colors}
                      selectedName={selectedCol?.name}
                      size="lg"
                      onSelect={(_, i) => { setSelectedColor(i); setSelectedImage(0); setQuantity(1) }}
                    />
                  </div>
                  {selectedCol && (selectedCol.stock ?? 0) <= 0 && (
                    <p className="text-xs text-accent mt-2">Cette couleur est epuisee.</p>
                  )}
                </div>
              )}

              {/* Add to Cart */}
              <div className="mb-3">
                <button
                  onClick={handleAddToCart}
                  disabled={outOfStock}
                  className={`group w-full py-3 px-6 text-[12px] font-normal uppercase tracking-normal flex items-center justify-center cursor-pointer border transition-all duration-[450ms] ease-[cubic-bezier(.785,.135,.15,.86)] ${outOfStock ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-foreground text-white border-foreground hover:bg-white hover:text-foreground'}`}
                >
                  {outOfStock ? 'Epuise' : 'Ajouter au panier'}
                </button>
              </div>

              {/* Stock Status */}
              <p className="text-[12px] mb-5">
                {!outOfStock ? (
                  <span className="text-green-700">
                    En stock - Expedition sous 2-5 jours ouvrables
                  </span>
                ) : (
                  <span className="text-gray-400">Epuise</span>
                )}
              </p>

              {/* Trust Badges (2-col grid, Alemi style) */}
              <div className="grid grid-cols-2 gap-1.5 mb-6">
                {[
                  { icon: HiTruck, text: 'Livraison 69 wilayas', underline: false },
                  { icon: HiShieldCheck, text: '100% Authentique', underline: true },
                  { icon: HiCreditCard, text: 'Paiement a la livraison', underline: true },
                ].map((item, idx) => (
                  <div
                    key={item.text}
                    className={`flex items-center gap-2 text-gray-500 ${idx === 2 ? 'col-span-2 justify-start' : ''}`}
                  >
                    <item.icon size={16} strokeWidth={1} className="text-gray-400 shrink-0" />
                    <span className={`text-[12px] ${item.underline ? 'underline' : ''}`}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Separator */}
              <div className="border-t border-gray-200 mb-5" />

              {/* Short Description */}
              {product.description && (
                <div
                  className="rich-text text-sm text-gray-500 leading-relaxed mb-4"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              )}

              {/* Accordions */}
              {product.howToUse && (
                <Accordion title="Size & Features">
                  <div className="rich-text text-sm text-gray-500 leading-relaxed" dangerouslySetInnerHTML={{ __html: product.howToUse }} />
                </Accordion>
              )}

              {product.ingredients && (
                <Accordion title="MATERIALS">
                  <div className="rich-text text-sm text-gray-500 leading-relaxed" dangerouslySetInnerHTML={{ __html: product.ingredients }} />
                </Accordion>
              )}

              {product.benefits && product.benefits.length > 0 && (
                <Accordion title="Details">
                  <ul className="space-y-2">
                    {product.benefits.map((b: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-500">
                        <HiCheck size={14} className="text-foreground shrink-0 mt-0.5" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </Accordion>
              )}
            </div>
          </div>

          {/* Related Products */}
          {related.length > 0 && (
            <section className="mt-20 md:mt-28">
              <div className="text-center mb-10">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.18em]">
                  A decouvrir
                </span>
                <h2 className="font-display text-2xl md:text-3xl text-foreground mt-1">
                  Vous aimerez aussi
                </h2>
              </div>
              <ScrollCarousel columns={5}>
                {related.map((p: any) => (
                  <div key={p._id || p.id} className="w-full">
                    <ProductCard product={p} />
                  </div>
                ))}
              </ScrollCarousel>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
