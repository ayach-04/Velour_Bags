import { useState, useEffect, useCallback, useRef } from 'react'
import { HiPencil, HiTrash, HiSquaresPlus, HiMagnifyingGlass, HiChevronDown } from 'react-icons/hi2'
import type { Brand } from '../../types'
import { fetchBrands, createBrand, updateBrand, deleteBrand } from '../../api/brands'
import { uploadToCloudinary } from '../../api/upload'
import ImageUpload from '../../components/ImageUpload'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'

const COUNTRIES = [
  'Afghanistan', 'Afrique du Sud', 'Albanie', 'Algérie', 'Allemagne', 'Andorre', 'Angola',
  'Antigua-et-Barbuda', 'Arabie Saoudite', 'Argentine', 'Arménie', 'Australie', 'Autriche',
  'Azerbaïdjan', 'Bahamas', 'Bahreïn', 'Bangladesh', 'Barbade', 'Belgique', 'Belize',
  'Bénin', 'Bhoutan', 'Biélorussie', 'Birmanie', 'Bolivie', 'Bosnie-Herzégovine',
  'Botswana', 'Brésil', 'Brunei', 'Bulgarie', 'Burkina Faso', 'Burundi', 'Cambodge',
  'Cameroun', 'Canada', 'Cap-Vert', 'Chili', 'Chine', 'Chypre', 'Colombie', 'Comores',
  'Congo', 'Corée du Nord', 'Corée du Sud', 'Costa Rica', "Côte d'Ivoire", 'Croatie',
  'Cuba', 'Danemark', 'Djibouti', 'Dominique', 'Égypte', 'Émirats Arabes Unis',
  'Équateur', 'Érythrée', 'Espagne', 'Estonie', 'Eswatini', 'États-Unis', 'Éthiopie',
  'Fidji', 'Finlande', 'France', 'Gabon', 'Gambie', 'Géorgie', 'Ghana', 'Grèce',
  'Grenade', 'Guatemala', 'Guinée', 'Guinée-Bissau', 'Guinée Équatoriale', 'Guyana',
  'Haïti', 'Honduras', 'Hongrie', 'Inde', 'Indonésie', 'Irak', 'Iran', 'Irlande',
  'Islande', 'Israël', 'Italie', 'Jamaïque', 'Japon', 'Jordanie', 'Kazakhstan',
  'Kenya', 'Kirghizistan', 'Kiribati', 'Koweït', 'Laos', 'Lesotho', 'Lettonie',
  'Liban', 'Libéria', 'Libye', 'Liechtenstein', 'Lituanie', 'Luxembourg', 'Macédoine',
  'Madagascar', 'Malaisie', 'Malawi', 'Maldives', 'Mali', 'Malte', 'Maroc',
  'Marshall', 'Maurice', 'Mauritanie', 'Mexique', 'Micronésie', 'Moldavie', 'Monaco',
  'Mongolie', 'Monténégro', 'Mozambique', 'Namibie', 'Nauru', 'Népal', 'Nicaragua',
  'Niger', 'Nigeria', 'Norvège', 'Nouvelle-Zélande', 'Oman', 'Ouganda', 'Ouzbékistan',
  'Pakistan', 'Palaos', 'Palestine', 'Panama', 'Papouasie-Nouvelle-Guinée', 'Paraguay',
  'Pays-Bas', 'Pérou', 'Philippines', 'Pologne', 'Portugal', 'Qatar', 'République Centrafricaine',
  'République Dominicaine', 'République Tchèque', 'Roumanie', 'Royaume-Uni', 'Russie',
  'Rwanda', 'Saint-Christophe-et-Niévès', 'Saint-Marin', 'Saint-Vincent-et-les-Grenadines',
  'Sainte-Lucie', 'Salomon', 'Salvador', 'Samoa', 'Sao Tomé-et-Principe', 'Sénégal',
  'Serbie', 'Seychelles', 'Sierra Leone', 'Singapour', 'Slovaquie', 'Slovénie',
  'Somalie', 'Soudan', 'Soudan du Sud', 'Sri Lanka', 'Suède', 'Suisse', 'Suriname',
  'Syrie', 'Tadjikistan', 'Tanzanie', 'Tchad', 'Thaïlande', 'Timor Oriental', 'Togo',
  'Tonga', 'Trinité-et-Tobago', 'Tunisie', 'Turkménistan', 'Turquie', 'Tuvalu',
  'Ukraine', 'Uruguay', 'Vanuatu', 'Vatican', 'Venezuela', 'Viêt Nam', 'Yémen',
  'Zambie', 'Zimbabwe',
]

export default function AdminBrands() {
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', logo: '', description: '', website: '', country: '', sortOrder: 0, isActive: true })
  const [initialForm, setInitialForm] = useState(form)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  const [countryOpen, setCountryOpen] = useState(false)
  const [countryInput, setCountryInput] = useState('')
  const countryRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await fetchBrands())
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) setCountryOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = items.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.country || '').toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => {
    setEditId(null)
    const empty = { name: '', logo: '', description: '', website: '', country: '', sortOrder: 0, isActive: true }
    setForm(empty)
    setInitialForm(empty)
    setShowForm(true)
  }

  const openEdit = (brand: Brand) => {
    setEditId(brand._id)
    const filled = {
      name: brand.name,
      logo: brand.logo || '',
      description: brand.description || '',
      website: brand.website || '',
      country: brand.country || '',
      sortOrder: brand.sortOrder || 0,
      isActive: brand.isActive,
    }
    setForm(filled)
    setInitialForm(filled)
    setShowForm(true)
  }

  const save = async () => {
    if (!form.name.trim()) return
    try {
      let logo = form.logo.trim()
      if (logo.startsWith('data:')) logo = await uploadToCloudinary(logo)
      const data = { ...form, name: form.name.trim(), logo, website: form.website.trim(), country: form.country.trim() }
      if (editId !== null) {
        const updated = await updateBrand(editId, data)
        setItems(prev => prev.map(b => (b._id === editId ? updated : b)))
      } else {
        const created = await createBrand(data)
        setItems(prev => [...prev, created])
      }
      setShowForm(false)
      setEditId(null)
    } catch {
      load()
    }
  }

  const confirmDeleteBrand = async () => {
    if (!confirmDelete) return
    try {
      await deleteBrand(confirmDelete.id)
      setItems(prev => prev.filter(b => b._id !== confirmDelete.id))
    } catch {
      load()
    }
    setConfirmDelete(null)
  }

  return (
    <div>
      <div className="sticky top-0 z-30 -mx-4 md:-mx-6 lg:-mx-8 pl-16 pr-4 md:pl-16 md:pr-6 lg:px-8 bg-foreground md:bg-white/90 md:backdrop-blur-xl border-b border-border md:border-gray-200 shadow-sm mb-6">
        <div className="flex items-center h-20">
          <div>
            <h1 className="text-xl font-bold text-white md:text-text tracking-tight">Marques</h1>
            <p className="text-[13px] text-gray-300 md:text-gray-400 mt-1">{items.length} marques</p>
          </div>
        </div>
      </div>

      <div className="-mx-2 md:-mx-4 lg:-mx-6 px-2 md:px-4 lg:px-6 mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <HiMagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom ou pays..." className="w-full h-10 pl-9 pr-4 bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-white transition-all rounded-lg" />
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 h-10 px-5 bg-primary hover:scale-105 text-white text-xs font-bold uppercase tracking-wider transition-transform shadow-sm shadow-primary/20 cursor-pointer shrink-0 rounded-lg">
            <HiSquaresPlus size={16} />Ajouter
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : (
        <div className="divide-y divide-gray-100/80">
          {filtered.map(brand => (
            <div key={brand._id} className="flex items-center justify-between px-3 py-3 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 bg-gray-100 shrink-0 overflow-hidden flex items-center justify-center ring-1 ring-gray-200/50 rounded-lg">
                  {brand.logo ? <img src={brand.logo} alt="" className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-text truncate">{brand.name}</span>
                    {!brand.isActive && <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">MASQUÉE</span>}
                    {brand.country && <span className="text-[11px] text-gray-400 hidden sm:inline">{brand.country}</span>}
                  </div>
                  {brand.description && <p className="text-xs text-gray-400 truncate mt-0.5">{brand.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <button onClick={() => openEdit(brand)} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer rounded-md" title="Modifier"><HiPencil size={15} /></button>
                <button onClick={() => setConfirmDelete({ id: brand._id, name: brand.name })} className="p-2 text-gray-400 hover:text-foreground hover:bg-foreground/10 transition-all cursor-pointer rounded-md" title="Supprimer"><HiTrash size={15} /></button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-gray-500 mb-1">Aucune marque trouvée</p>
              <p className="text-xs text-gray-400">Essayez de modifier votre recherche</p>
            </div>
          )}
        </div>)}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Modifier la marque' : 'Nouvelle marque'} className="lg:ml-64">
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
              <HiPencil size={14} className="text-primary" />
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Informations générales</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nom *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom de la marque" className="w-full h-10 px-3 bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-white transition-all rounded-lg" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div ref={countryRef} className="relative">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Pays</label>
                  <div
                    onClick={() => setCountryOpen(true)}
                    className="flex items-center h-10 px-3 bg-gray-50 border border-gray-200 text-sm text-text cursor-pointer focus-within:border-primary transition-all rounded-lg"
                  >
                    <input
                      value={countryInput || form.country}
                      onChange={e => { setCountryInput(e.target.value); setCountryOpen(true) }}
                      onFocus={() => setCountryOpen(true)}
                      placeholder="Tapez un pays..."
                      className="flex-1 bg-transparent text-sm text-text placeholder-gray-400 focus:outline-none cursor-text"
                    />
                    <HiChevronDown size={14} className={`text-gray-400 transition-transform shrink-0 ${countryOpen ? 'rotate-180' : ''}`} />
                  </div>
                  {countryOpen && (
                    <ul className="absolute z-20 left-0 right-0 top-full mt-0.5 bg-white border border-gray-200 max-h-36 overflow-y-auto shadow-sm">
                      {COUNTRIES.filter(c => c.toLowerCase().includes((countryInput || '').toLowerCase())).map(c => (
                        <li
                          key={c}
                          onClick={() => { setForm(f => ({ ...f, country: c })); setCountryInput(''); setCountryOpen(false) }}
                          className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors ${form.country === c ? 'bg-primary/10 text-primary font-medium' : 'text-text'}`}
                        >
                          {c}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Site web</label>
                  <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." className="w-full h-10 px-3 bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-white transition-all rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Courte description..." rows={3} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-white transition-all resize-none rounded-lg" />
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
              <HiSquaresPlus size={14} className="text-primary" />
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Logo</h3>
            </div>
            <ImageUpload value={form.logo} onChange={logo => setForm(f => ({ ...f, logo }))} label="Logo" />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <div className={`w-9 h-5 rounded-full transition-all relative ${form.isActive ? 'bg-primary' : 'bg-gray-300'}`}
                onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}>
                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${form.isActive ? 'left-[18px]' : 'left-[2px]'}`} />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active</span>
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
            <button onClick={() => setShowForm(false)} className="h-9 px-5 text-sm font-medium text-gray-500 hover:text-text hover:bg-gray-100 transition-all cursor-pointer rounded-md">
              Annuler
            </button>
            <button onClick={save} disabled={JSON.stringify(form) === JSON.stringify(initialForm)} className="h-9 px-5 bg-foreground hover:bg-foreground/90 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer rounded-md shadow-sm shadow-black/20 disabled:opacity-40 disabled:cursor-not-allowed">
              {editId ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={confirmDelete !== null} title="Supprimer la marque" message={`Êtes-vous sûr de vouloir supprimer "${confirmDelete?.name}" ?`} onConfirm={confirmDeleteBrand} onCancel={() => setConfirmDelete(null)} />
    </div>
  )
}
