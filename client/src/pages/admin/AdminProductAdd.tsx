import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { HiCheck, HiPlus, HiXMark, HiPhoto, HiChevronDown, HiSwatch, HiLink } from 'react-icons/hi2'
import AutocompleteInput from '../../components/AutocompleteInput'
import RichTextEditor from '../../components/RichTextEditor'
import { fetchFamilles, fetchCategories } from '../../api/categories'
import type { Famille, Category } from '../../types'

const API_BASE = import.meta.env.DEV ? '' : import.meta.env.VITE_API_URL

function getToken() { return localStorage.getItem('admin_token') }

async function uploadToCloudinary(dataUrl: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/upload/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ image: dataUrl }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Upload failed')
  return json.url
}

interface ColorRow { color: string; stock: string; image: string; images: string[] }
const emptyColor: ColorRow = { color: '', stock: '', image: '', images: [] }

const PRESETS = [
  { label: 'Noir', value: '#1a1a1a' },
  { label: 'Marron', value: '#8B4513' },
  { label: 'Beige', value: '#D2B48C' },
  { label: 'Blanc', value: '#F5F5F5' },
  { label: 'Rouge', value: '#DC143C' },
  { label: 'Bleu', value: '#2F5D8C' },
  { label: 'Vert', value: '#2D5A27' },
  { label: 'Gris', value: '#808080' },
]

function isHexColor(v: string) { return /^#[0-9A-Fa-f]{6}$/.test(v) }

function Swatch({ value, size = 'sm' }: { value: string; size?: 'sm' | 'lg' }) {
  const s = size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'
  if (isHexColor(value)) return <span className={`${s} rounded-full border border-gray-200 shrink-0`} style={{ backgroundColor: value }} />
  return <span className={`${s} rounded-full bg-gray-200 shrink-0 flex items-center justify-center text-[7px] font-bold text-gray-500 uppercase`}>{value.charAt(0)}</span>
}

function MiniImagePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader(); r.onload = () => onChange(r.result as string); r.readAsDataURL(f)
  }
  return (
    <div onClick={() => ref.current?.click()} className="relative w-16 h-16 bg-gray-50 border border-gray-200 border-dashed rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-all group overflow-hidden shrink-0">
      {value ? (
        <>
          <img src={value} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all" />
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange('') }} className="absolute top-0.5 right-0.5 w-4 h-4 bg-white/80 hover:bg-white text-gray-500 hover:text-red-400 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer z-10 rounded-full"><HiXMark size={8} /></button>
        </>
      ) : (
        <HiPhoto size={14} className="text-gray-300" />
      )}
      <input ref={ref} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  )
}

function MiniGallery({ images, mainImage, onChange, onSwapMain }: { images: string[]; mainImage: string; onChange: (imgs: string[]) => void; onSwapMain: (img: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = e.target.files; if (!fl?.length) return
    const readers: Promise<string>[] = []
    for (let i = 0; i < fl.length; i++) readers.push(new Promise(r => { const rd = new FileReader(); rd.onload = () => r(rd.result as string); rd.readAsDataURL(fl[i]) }))
    Promise.all(readers).then(urls => onChange([...images, ...urls]))
    if (ref.current) ref.current.value = ''
  }
  return (
    <div className="flex items-center gap-1.5">
      {images.map((img, i) => (
        <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 group shrink-0 cursor-pointer" onClick={() => onSwapMain(img)} title="Cliquer pour mettre en image principale">
          <img src={img} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
            <span className="text-[8px] font-bold uppercase text-white bg-black/50 px-1.5 py-0.5 rounded-full">Principal</span>
          </div>
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(images.filter((_, idx) => idx !== i)) }} className="absolute top-0.5 right-0.5 w-4 h-4 bg-white/80 hover:bg-white text-gray-500 hover:text-red-400 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer z-10 rounded-full">
            <HiXMark size={8} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => ref.current?.click()} className="w-16 h-16 rounded-xl border border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 hover:bg-gray-50 transition-all cursor-pointer shrink-0">
        <HiPlus size={14} className="text-gray-300" />
      </button>
      <input ref={ref} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
    </div>
  )
}

function ColorCard({ color, index, onUpdate, onRemove, canRemove, isLast, isDefault, onSetDefault }: {
  color: ColorRow; index: number; canRemove: boolean; isLast: boolean; isDefault: boolean
  onUpdate: (field: keyof ColorRow, value: any) => void; onRemove: () => void; onSetDefault: () => void
}) {
  const [open, setOpen] = useState(isLast && !color.image)
  const inputRef = useRef<HTMLInputElement>(null)
  const [urlInput, setUrlInput] = useState('')

  const handleColorInput = (val: string) => {
    onUpdate('color', val)
  }

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden transition-all">
      {/* Header row — always visible */}
      <div role="button" tabIndex={0} onClick={() => setOpen(!open)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open) } }} className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer text-left">
        <div className="relative shrink-0">
          <Swatch value={color.color} size="lg" />
          {(!color.stock || Number(color.stock) <= 0) && (
            <span className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
              <span className="absolute inset-0 rounded-full bg-white/60" />
              <span className="absolute inset-0 grid place-items-center">
                <span className="block w-[141.4%] h-px bg-white -rotate-45" />
              </span>
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-text block truncate">{color.color || 'Nouvelle couleur'}</span>
          <span className="text-[11px] text-gray-400">
            {color.stock ? `${color.stock} en stock` : 'Pas de stock'}
            {color.image ? ' · Image' : ''}
            {color.images.length ? ` · ${color.images.length} gal.` : ''}
          </span>
        </div>
        {!isDefault && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onSetDefault() }} className="hidden sm:inline-flex px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-400 hover:text-foreground border border-gray-200 hover:border-foreground/30 rounded-full transition-all cursor-pointer shrink-0" title="Définir comme image principale">
            Défaut
          </button>
        )}
        {isDefault && (
          <span className="hidden sm:inline-flex px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground bg-foreground/10 rounded-full shrink-0">
            Défaut
          </span>
        )}
        {canRemove && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onRemove() }} className="p-1.5 text-gray-300 hover:text-red-400 transition-colors cursor-pointer shrink-0" title="Supprimer">
            <HiXMark size={16} />
          </button>
        )}
        <HiChevronDown size={16} className={`text-gray-300 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </div>

      {/* Expanded body */}
      {open && (
        <div className="px-3 sm:px-4 pb-4 pt-1 space-y-3 sm:space-y-4 border-t border-gray-100">
          {/* Color input */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Couleur (hex)</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <input ref={inputRef} value={color.color} onChange={(e) => handleColorInput(e.target.value)} placeholder="#1a1a1a" className="w-full h-9 pl-9 pr-3 bg-white border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-foreground focus:bg-white transition-all rounded-xl" />
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2"><Swatch value={color.color} /></div>
              </div>
              <div className="relative w-9 h-9 shrink-0">
                <input type="color" value={isHexColor(color.color) ? color.color : '#808080'} onChange={(e) => onUpdate('color', e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" title="Sélecteur de couleur" />
                <span className="w-9 h-9 rounded-full border border-gray-200 shrink-0 block" style={{ backgroundColor: isHexColor(color.color) ? color.color : '#d1d5db' }} />
              </div>
            </div>
          </div>

          {/* Stock + Default toggle row */}
          <div className="flex items-end gap-3">
            <div className="flex-1 sm:max-w-[160px]">
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Stock <span className="text-red-400">*</span></label>
              <input type="number" value={color.stock} onChange={(e) => onUpdate('stock', e.target.value)} onWheel={(e) => e.currentTarget.blur()} min="0" placeholder="0" className="w-full h-9 px-3 bg-white border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-foreground focus:bg-white transition-all rounded-xl" />
            </div>
            <button type="button" onClick={onSetDefault} className={`h-9 px-3 text-[10px] font-bold uppercase tracking-wider rounded-xl border transition-all cursor-pointer shrink-0 ${isDefault ? 'bg-foreground text-white border-foreground' : 'bg-white text-gray-400 border-gray-200 hover:border-foreground/30 hover:text-foreground'}`}>
              {isDefault ? '★ Défaut' : 'Défaut'}
            </button>
          </div>

          {/* Images */}
          <div className="space-y-2">
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Images</label>
            <div className="flex items-start gap-3 overflow-x-auto pb-1">
              <MiniImagePicker value={color.image} onChange={(v) => onUpdate('image', v)} />
              <MiniGallery
                images={color.images}
                mainImage={color.image}
                onChange={(imgs) => onUpdate('images', imgs)}
                onSwapMain={(img) => {
                  const prev = color.image
                  onUpdate('image', img)
                  onUpdate('images', color.images.map(i => i === img ? prev : i).filter(Boolean))
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <HiLink size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const v = urlInput.trim()
                      if (!v) return
                      if (!color.image) {
                        onUpdate('image', v)
                      } else {
                        onUpdate('images', [...color.images, v])
                      }
                      setUrlInput('')
                    }
                  }}
                  placeholder="Ou collez une URL d'image"
                  className="w-full h-9 pl-8 pr-3 bg-white border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-foreground focus:bg-white transition-all rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminProductAdd() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    name: '', category: '', brand: '',
    price: '', costPrice: '',
    description: '', howToUse: '', ingredients: '',
    published: true,
  })
  const [initialForm, setInitialForm] = useState(form)
  const [mongoId, setMongoId] = useState('')
  const [colors, setColors] = useState<ColorRow[]>([])
  const [initialColors, setInitialColors] = useState<ColorRow[]>([])
  const [colorInput, setColorInput] = useState('')
  const [defaultColorIndex, setDefaultColorIndex] = useState(0)
  const [initialDefaultColorIndex, setInitialDefaultColorIndex] = useState(0)
  const [familles, setFamilles] = useState<Famille[]>([])
  const [allCategories, setAllCategories] = useState<Category[]>([])

  useEffect(() => {
    Promise.all([fetchFamilles(), fetchCategories()])
      .then(([f, c]) => { setFamilles(f); setAllCategories(c) })
      .catch(() => {})
  }, [])

  const familleNames = familles.filter(f => f.isActive).sort((a, b) => a.sortOrder - b.sortOrder).map(f => f.name)
  const selectedFamille = familles.find(f => f.name === form.category)
  const subCategoryNames = allCategories
    .filter(c => {
      if (!c.isActive) return false
      if (!selectedFamille) return true
      const fId = typeof c.familleId === 'object' ? c.familleId?._id : c.familleId
      return fId === selectedFamille._id
    })
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(c => c.name)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`${API_BASE}/api/products/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(res => { if (!res.ok) throw new Error(); return res.json() })
      .then((product: any) => {
        setMongoId(product._id)
        const filled = {
          name: product.name,
          category: product.category || '',
          brand: product.brand || '',
          price: product.price != null ? String(product.price) : '',
          costPrice: product.costPrice != null ? String(product.costPrice) : '',
          description: product.description || '',
          howToUse: product.howToUse || '',
          ingredients: product.ingredients || '',
          published: product.published !== false,
        }
        setForm(filled)
        setInitialForm(filled)

        const loaded: ColorRow[] = []
        if (Array.isArray(product.colors) && product.colors.length > 0) {
          for (const c of product.colors) {
            loaded.push({ color: c.name || '', stock: c.stock != null ? String(c.stock) : '', image: c.image || '', images: c.images || [] })
          }
        } else if (Array.isArray(product.volumes) && product.volumes.length > 0 && product.volumes[0]?.label) {
          for (const v of product.volumes) {
            loaded.push({ color: v.label || '', stock: v.stock != null ? String(v.stock) : '', image: '', images: [] })
          }
        }
        setColors(loaded)
        setInitialColors(loaded)

        if (loaded.length > 0 && product.image) {
          const idx = loaded.findIndex(c => c.image === product.image)
          const defIdx = idx >= 0 ? idx : 0
          setDefaultColorIndex(defIdx)
          setInitialDefaultColorIndex(defIdx)
        } else {
          setDefaultColorIndex(0)
          setInitialDefaultColorIndex(0)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [e.target.name]: e.target.value })

  const updateColor = (i: number, field: keyof ColorRow, value: any) => setColors(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  const removeColor = (i: number) => setColors(prev => prev.filter((_, idx) => idx !== i))

  const addColorFromInput = () => {
    const raw = colorInput.trim()
    if (!raw) return
    const v = raw.startsWith('#') ? raw : `#${raw}`
    if (colors.some(c => c.color.toLowerCase() === v.toLowerCase())) { setColorInput(''); return }
    const lastStock = [...colors].reverse().find(c => c.stock)?.stock || ''
    setColors(prev => [{ ...emptyColor, color: v, stock: lastStock }, ...prev])
    setColorInput('')
  }

  const addPreset = (preset: typeof PRESETS[0]) => {
    if (colors.some(c => c.color.toLowerCase() === preset.value.toLowerCase())) return
    const lastStock = [...colors].reverse().find(c => c.stock)?.stock || ''
    setColors(prev => [{ ...emptyColor, color: preset.value, stock: lastStock }, ...prev])
  }

  const hasChanges = JSON.stringify(form) !== JSON.stringify(initialForm) || JSON.stringify(colors) !== JSON.stringify(initialColors) || defaultColorIndex !== initialDefaultColorIndex

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const token = getToken()
      if (!token) { navigate('/admin'); return }
      const isDataUrl = (s: string) => s.startsWith('data:')

      const cleanedColors = colors.filter(c => c.color.trim()).map(c => ({ name: c.color.trim(), price: Number(form.price) || 0, costPrice: form.costPrice !== '' ? Number(form.costPrice) : undefined, stock: c.stock !== '' ? Number(c.stock) : 0, image: c.image, images: c.images }))
      for (const c of cleanedColors) {
        if (c.image && isDataUrl(c.image)) c.image = await uploadToCloudinary(c.image)
        if (c.images?.length) c.images = await Promise.all(c.images.map(img => isDataUrl(img) ? uploadToCloudinary(img) : img))
      }

      // Move default color to first position so backend derives main image from it
      const defIdx = Math.min(defaultColorIndex, cleanedColors.length - 1)
      const orderedColors = defIdx > 0 ? [cleanedColors[defIdx], ...cleanedColors.slice(0, defIdx), ...cleanedColors.slice(defIdx + 1)] : cleanedColors

      const mainImage = orderedColors[0]?.image || ''
      const additionalImages = orderedColors[0]?.images || []

      const body: any = {
        name: form.name, category: form.category, brand: form.brand,
        price: Number(form.price) || 0, costPrice: form.costPrice !== '' ? Number(form.costPrice) : undefined,
        image: mainImage, images: additionalImages,
        description: form.description, howToUse: form.howToUse, ingredients: form.ingredients,
        published: form.published,
      }

      if (orderedColors.length > 0) {
        body.colors = orderedColors
        body.stock = orderedColors.reduce((sum, c) => sum + (c.stock || 0), 0)
      } else {
        setError('Ajoutez au moins une couleur.'); setSaving(false); return
      }

      const url = isEdit ? `${API_BASE}/api/products/${mongoId || id}` : `${API_BASE}/api/products`
      const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
      if (res.status === 401) { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_token_exp'); window.location.href = '/admin'; return }
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || (isEdit ? 'Erreur lors de la modification' : "Erreur lors de l'ajout")) }

      setSuccess(isEdit ? 'Produit modifié avec succès' : 'Produit ajouté avec succès')
      setTimeout(() => navigate('/admin/products'), 1500)
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement") }
    finally { setSaving(false) }
  }

  const totalStock = colors.reduce((s, c) => s + (Number(c.stock) || 0), 0)

  return (
    <div>
      <div className="sticky top-0 z-30 -mx-4 md:-mx-6 lg:-mx-8 pl-16 pr-4 md:pl-16 md:pr-6 lg:px-8 bg-foreground md:bg-white/90 md:backdrop-blur-xl border-b border-border md:border-gray-200 shadow-sm mb-6">
        <div className="flex items-center h-20">
          <div>
            <h1 className="text-xl font-bold text-white md:text-text tracking-tight">{isEdit ? 'Modifier le produit' : 'Ajouter un produit'}</h1>
            <p className="text-sm text-gray-300 md:text-gray-400">{isEdit ? 'Modifiez les informations du produit' : 'Renseignez les détails du nouveau produit'}</p>
          </div>
        </div>
      </div>

      <form id="product-form" onSubmit={handleSubmit}>
        <div className="space-y-5">

          {/* Product Info */}
          <div className="bg-white border border-gray-100 p-6 rounded-2xl space-y-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Informations produit</h3>
            <div>
              <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">Nom du produit <span className="text-red-400">*</span></label>
              <input name="name" value={form.name} onChange={handleChange} required placeholder="ex: Sac Cabas Cuir" className="w-full h-11 px-4 bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-foreground focus:bg-white transition-all rounded-xl" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <AutocompleteInput name="category" label="Catégorie" value={form.category} onChange={(v) => setForm({ ...form, category: v, brand: '' })} options={familleNames} placeholder="Choisir une catégorie" required disableInput />
              <AutocompleteInput name="brand" label="Sous-catégorie" value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} options={subCategoryNames} placeholder={selectedFamille ? `Sous-catégories de ${form.category}` : 'Choisir une catégorie d\'abord'} required disableInput={!selectedFamille} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">Prix <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input type="number" name="price" value={form.price} onChange={handleChange} onWheel={(e) => e.currentTarget.blur()} min="0" required placeholder="0" className="w-full h-11 pl-4 pr-10 bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-foreground focus:bg-white transition-all rounded-xl" />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">DA</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">Prix de revient</label>
                <div className="relative">
                  <input type="number" name="costPrice" value={form.costPrice} onChange={handleChange} onWheel={(e) => e.currentTarget.blur()} min="0" placeholder="0" className="w-full h-11 pl-4 pr-10 bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-foreground focus:bg-white transition-all rounded-xl" />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">DA</span>
                </div>
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <HiSwatch size={14} className="text-primary" />
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Couleurs {colors.length > 0 && <span className="text-gray-400 normal-case font-medium">({colors.length}){totalStock > 0 ? ` · ${totalStock} stock` : ''}</span>}</h3>
              </div>
            </div>
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              {/* Presets */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Raccourcis</label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map(p => {
                    const exists = colors.some(c => c.color.toLowerCase() === p.value.toLowerCase())
                    return (
                      <button key={p.value} type="button" onClick={() => exists ? removeColor(colors.findIndex(c => c.color.toLowerCase() === p.value.toLowerCase())) : addPreset(p)} className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full border transition-all cursor-pointer ${exists ? 'bg-foreground text-white border-foreground' : 'bg-white text-text border-gray-200 hover:border-primary/30 hover:shadow-sm'}`}>
                        <span className="w-3 h-3 rounded-full border shrink-0" style={{ backgroundColor: p.value, borderColor: exists ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)' }} />
                        {p.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Add custom */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ajouter une couleur</label>
                <div className="flex items-center gap-2">
                  <input value={colorInput} onChange={(e) => { const v = e.target.value; if (v === '' || /^[0-9A-Fa-f]{0,6}$/.test(v) || /^#[0-9A-Fa-f]{0,6}$/.test(v)) setColorInput(v) }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColorFromInput() } }} placeholder="#ffffff ou ffffff" className="flex-1 min-w-0 h-10 px-3 bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all rounded-xl" />
                  <button type="button" onClick={addColorFromInput} disabled={!/^[0-9A-Fa-f]{6}$/.test(colorInput) && !isHexColor(colorInput)} className="h-10 px-4 bg-foreground hover:bg-foreground/90 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer rounded-xl disabled:opacity-40 disabled:cursor-not-allowed shrink-0">Ajouter</button>
                </div>
              </div>

              {/* Color cards */}
              {colors.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Variantes</label>
                  <div className="space-y-2">
                    {colors.map((c, i) => (
                      <ColorCard key={i} color={c} index={i} canRemove isLast={i === colors.length - 1} isDefault={i === defaultColorIndex} onUpdate={(field, val) => updateColor(i, field, val)} onRemove={() => { removeColor(i); if (i === defaultColorIndex) setDefaultColorIndex(0) }} onSetDefault={() => setDefaultColorIndex(i)} />
                    ))}
                  </div>
                </div>
              )}

              {colors.length === 0 && (
                <div className="text-center py-4 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
                  Aucune couleur. Utilisez les raccourcis ci-dessus ou tapez un nom/hex.
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white border border-gray-100 p-6 rounded-2xl space-y-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description & Détails</h3>
            <div>
              <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">Description <span className="text-red-400">*</span></label>
              <RichTextEditor value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Decrivez le produit, son style, ses finitions..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">Size & Features</label>
                <RichTextEditor value={form.howToUse} onChange={(v) => setForm({ ...form, howToUse: v })} placeholder="Cuir veritable, doublure interieure en alcantara..." minH="min-h-[100px]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">MATERIALS</label>
                <RichTextEditor value={form.ingredients} onChange={(v) => setForm({ ...form, ingredients: v })} placeholder="Dimensions, poids, nombre de compartiments..." minH="min-h-[100px]" />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <div className={`w-10 h-6 rounded-full transition-all duration-300 relative shadow-inner cursor-pointer ${form.published ? 'bg-foreground' : 'bg-gray-200'}`} onClick={() => setForm({ ...form, published: !form.published })}>
                <div className={`w-[18px] h-[18px] rounded-full bg-white absolute top-[3px] transition-all duration-300 shadow-md ${form.published ? 'left-[19px]' : 'left-[3px]'}`} />
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-wider transition-colors duration-300 ${form.published ? 'text-foreground' : 'text-gray-400'}`}>{form.published ? 'Publié' : 'Brouillon'}</span>
            </div>
          </div>
        </div>

        {success && <div className="mt-4 bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-xl">{success}</div>}
        {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
        {loading && <div className="mt-4 text-sm text-gray-400">Chargement du produit...</div>}
      </form>

      <div className="h-16" />
      <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-20 bg-white border-t border-gray-200 px-4 md:px-6 lg:px-8 py-3 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-text">{isEdit ? 'Modifier le produit' : 'Nouveau produit'}</span>
          <div className="flex w-full sm:w-auto items-center justify-end gap-2">
            <button type="button" onClick={() => navigate('/admin/products')} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-text hover:bg-gray-100 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed rounded-xl">Annuler</button>
            <button type="submit" form="product-form" disabled={saving || !!success || !hasChanges} className="h-9 px-4 bg-foreground hover:scale-105 text-white text-xs font-bold uppercase tracking-wider transition-transform cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 rounded-xl">
              {saving ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <HiCheck size={14} />}
              {saving ? 'Enregistrement...' : (isEdit ? 'Enregistrer' : 'Ajouter')}
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}