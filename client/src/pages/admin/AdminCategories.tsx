import { useState, useEffect, useCallback } from 'react'
import { HiPencil, HiTrash, HiSquaresPlus, HiMagnifyingGlass, HiRectangleGroup, HiTag } from 'react-icons/hi2'
import type { Famille, Category } from '../../types'
import {
  fetchFamilles, createFamille, updateFamille, deleteFamille,
  fetchCategories, createCategory, updateCategory, deleteCategory,
} from '../../api/categories'
import { uploadToCloudinary } from '../../api/upload'
import ImageUpload from '../../components/ImageUpload'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'

type Tab = 'familles' | 'categories'

export default function AdminCategories() {
  const [tab, setTab] = useState<Tab>('familles')

  return (
    <div>
      <div className="sticky top-0 z-30 -mx-4 md:-mx-6 lg:-mx-8 pl-16 pr-4 md:pl-16 md:pr-6 lg:px-8 bg-foreground md:bg-white/90 md:backdrop-blur-xl border-b border-border md:border-gray-200 shadow-sm mb-6">
        <div className="flex items-center justify-between h-20">
          <div>
            <h1 className="text-xl font-bold text-white md:text-text tracking-tight">Catégories</h1>
            <p className="text-[13px] text-gray-300 md:text-gray-400 mt-1">Catégories &middot; Sous-catégories</p>
          </div>
        </div>
      </div>

      <div className="-mx-2 md:-mx-4 lg:-mx-6 px-2 md:px-4 lg:px-6 mb-6">
        <div className="flex gap-0 border-b border-gray-200">
          <button onClick={() => setTab('familles')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-[1px] ${tab === 'familles' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-text'}`}>
            <HiRectangleGroup size={16} />Catégories
          </button>
          <button onClick={() => setTab('categories')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-[1px] ${tab === 'categories' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-text'}`}>
            <HiTag size={16} />Sous-catégories
          </button>
        </div>
      </div>

      {tab === 'familles' && <FamillesSection />}
      {tab === 'categories' && <CategoriesSection />}
    </div>
  )
}

function FamillesSection() {
  const [items, setItems] = useState<Famille[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', image: '', sortOrder: 0, isActive: true })
  const [initialForm, setInitialForm] = useState(form)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await fetchFamilles())
    } catch { setItems([]) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = items.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))

  const openAdd = () => { setEditId(null); const empty = { name: '', description: '', image: '', sortOrder: 0, isActive: true }; setForm(empty); setInitialForm(empty); setShowForm(true) }
  const openEdit = (f: Famille) => { setEditId(f._id); const filled = { name: f.name, description: f.description || '', image: f.image || '', sortOrder: f.sortOrder || 0, isActive: f.isActive }; setForm(filled); setInitialForm(filled); setShowForm(true) }

  const save = async () => {
    if (!form.name.trim()) return
    try {
      let image = form.image.trim()
      if (image.startsWith('data:')) image = await uploadToCloudinary(image)
      const data = { name: form.name.trim(), description: form.description.trim(), image, sortOrder: form.sortOrder, isActive: form.isActive }
      if (editId !== null) {
        const updated = await updateFamille(editId, data)
        setItems(prev => prev.map(f => (f._id === editId ? updated : f)))
      } else {
        const created = await createFamille(data)
        setItems(prev => [...prev, created])
      }
      setShowForm(false); setEditId(null)
    } catch { load() }
  }

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return
    try { await deleteFamille(confirmDelete.id); setItems(prev => prev.filter(f => f._id !== confirmDelete.id)) } catch { load() }
    setConfirmDelete(null)
  }

  return (
    <>
      <div className="-mx-2 md:-mx-4 lg:-mx-6 px-2 md:px-4 lg:px-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="relative flex-1">
            <HiMagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full h-10 pl-9 pr-4 bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-white transition-all rounded-lg" />
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 h-10 px-5 bg-primary hover:scale-105 text-white text-xs font-bold uppercase tracking-wider transition-transform shadow-sm shadow-primary/20 cursor-pointer ml-3 shrink-0 rounded-lg">
            <HiSquaresPlus size={16} />Ajouter
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : (
        <div className="divide-y divide-gray-100/80">
          {filtered.map(f => (
            <div key={f._id} className="flex items-center justify-between px-3 py-3 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-sm text-text truncate">{f.name}</span>
                  {!f.isActive && <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">INACTIVE</span>}
                </div>
                {f.description && <span className="text-xs text-gray-400 truncate hidden md:inline max-w-[300px]">{f.description}</span>}
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <button onClick={() => openEdit(f)} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer rounded-md" title="Modifier"><HiPencil size={15} /></button>
                <button onClick={() => setConfirmDelete({ id: f._id, name: f.name })} className="p-2 text-gray-400 hover:text-foreground hover:bg-foreground/10 transition-all cursor-pointer rounded-md" title="Supprimer"><HiTrash size={15} /></button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="flex flex-col items-center justify-center py-16 text-center"><p className="text-sm font-medium text-gray-500 mb-1">Aucune famille trouvée</p></div>}
        </div>)}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Modifier la famille' : 'Nouvelle famille'} className="lg:ml-64">
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
              <HiPencil size={14} className="text-primary" />
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Informations générales</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nom *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: K-Beauty, Skincare..." className="w-full h-10 px-3 bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-white transition-all rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Courte description..." rows={2} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-white transition-all resize-none rounded-lg" />
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
              <HiSquaresPlus size={14} className="text-primary" />
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Image</h3>
            </div>
            <ImageUpload value={form.image} onChange={image => setForm(f => ({ ...f, image }))} label="Image" />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <div className={`w-9 h-5 rounded-full transition-all relative ${form.isActive ? 'bg-primary' : 'bg-gray-300'}`} onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}>
                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${form.isActive ? 'left-[18px]' : 'left-[2px]'}`} />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active</span>
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
            <button onClick={() => setShowForm(false)} className="h-9 px-5 text-sm font-medium text-gray-500 hover:text-text hover:bg-gray-100 transition-all cursor-pointer rounded-md">Annuler</button>
            <button onClick={save} disabled={JSON.stringify(form) === JSON.stringify(initialForm)} className="h-9 px-5 bg-foreground hover:bg-foreground/90 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer rounded-md shadow-sm shadow-black/20 disabled:opacity-40 disabled:cursor-not-allowed">{editId ? 'Enregistrer' : 'Ajouter'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={confirmDelete !== null} title="Supprimer la famille" message={`Êtes-vous sûr de vouloir supprimer "${confirmDelete?.name}" ?`} onConfirm={confirmDeleteAction} onCancel={() => setConfirmDelete(null)} />
    </>
  )
}

function CategoriesSection() {
  const [items, setItems] = useState<Category[]>([])
  const [familleList, setFamilleList] = useState<Famille[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', familleId: '', description: '', image: '', sortOrder: 0, isActive: true })
  const [initialForm, setInitialForm] = useState(form)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cats, fams] = await Promise.all([fetchCategories(), fetchFamilles()])
      setItems(cats); setFamilleList(fams)
    } catch { setItems([]); setFamilleList([]) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = items.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  const familleName = (id?: string | Famille) => {
    if (!id) return '—'
    if (typeof id === 'object') return id.name
    return familleList.find(f => f._id === id)?.name || '—'
  }

  const getFamilleId = (c: Category): string => {
    if (!c.familleId) return ''
    return typeof c.familleId === 'object' ? c.familleId._id : c.familleId
  }

  const openAdd = () => { setEditId(null); const empty = { name: '', familleId: '', description: '', image: '', sortOrder: 0, isActive: true }; setForm(empty); setInitialForm(empty); setShowForm(true) }
  const openEdit = (c: Category) => { setEditId(c._id); const filled = { name: c.name, familleId: getFamilleId(c), description: c.description || '', image: c.image || '', sortOrder: c.sortOrder || 0, isActive: c.isActive }; setForm(filled); setInitialForm(filled); setShowForm(true) }

  const save = async () => {
    if (!form.name.trim()) return
    try {
      let image = form.image.trim()
      if (image.startsWith('data:')) image = await uploadToCloudinary(image)
      const data = { name: form.name.trim(), familleId: form.familleId || undefined, description: form.description.trim(), image, sortOrder: form.sortOrder, isActive: form.isActive }
      if (editId !== null) {
        const updated = await updateCategory(editId, data)
        setItems(prev => prev.map(c => (c._id === editId ? updated : c)))
      } else {
        const created = await createCategory(data)
        setItems(prev => [...prev, created])
      }
      setShowForm(false); setEditId(null)
    } catch { load() }
  }

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return
    try { await deleteCategory(confirmDelete.id); setItems(prev => prev.filter(c => c._id !== confirmDelete.id)) } catch { load() }
    setConfirmDelete(null)
  }

  return (
    <>
      <div className="-mx-2 md:-mx-4 lg:-mx-6 px-2 md:px-4 lg:px-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="relative flex-1">
            <HiMagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full h-10 pl-9 pr-4 bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-white transition-all rounded-lg" />
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 h-10 px-5 bg-primary hover:scale-105 text-white text-xs font-bold uppercase tracking-wider transition-transform shadow-sm shadow-primary/20 cursor-pointer ml-3 shrink-0 rounded-lg">
            <HiSquaresPlus size={16} />Ajouter
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : (
        <div className="divide-y divide-gray-100/80">
          {filtered.map(c => (
            <div key={c._id} className="flex items-center justify-between px-3 py-3 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-sm text-text truncate">{c.name}</span>
                  {!c.isActive && <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">INACTIVE</span>}
                  <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 shrink-0 rounded-full">{familleName(c.familleId)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <button onClick={() => openEdit(c)} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer rounded-md" title="Modifier"><HiPencil size={15} /></button>
                <button onClick={() => setConfirmDelete({ id: c._id, name: c.name })} className="p-2 text-gray-400 hover:text-foreground hover:bg-foreground/10 transition-all cursor-pointer rounded-md" title="Supprimer"><HiTrash size={15} /></button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="flex flex-col items-center justify-center py-16 text-center"><p className="text-sm font-medium text-gray-500 mb-1">Aucune catégorie trouvée</p></div>}
        </div>)}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Modifier la catégorie' : 'Nouvelle catégorie'} className="lg:ml-64">
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
              <HiPencil size={14} className="text-primary" />
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Informations générales</h3>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nom *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Sérum, Crème..." className="w-full h-10 px-3 bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-white transition-all rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Famille</label>
                  <select value={form.familleId} onChange={e => setForm(f => ({ ...f, familleId: e.target.value }))} className="w-full h-10 px-3 bg-gray-50 border border-gray-200 text-sm text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-white transition-all cursor-pointer rounded-lg">
                    <option value="">Aucune</option>
                    {familleList.filter(f => f.isActive !== false).map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Courte description..." rows={2} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-white transition-all resize-none rounded-lg" />
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
              <HiSquaresPlus size={14} className="text-primary" />
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Image</h3>
            </div>
            <ImageUpload value={form.image} onChange={image => setForm(f => ({ ...f, image }))} label="Image" />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <div className={`w-9 h-5 rounded-full transition-all relative ${form.isActive ? 'bg-primary' : 'bg-gray-300'}`} onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}>
                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${form.isActive ? 'left-[18px]' : 'left-[2px]'}`} />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active</span>
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
            <button onClick={() => setShowForm(false)} className="h-9 px-5 text-sm font-medium text-gray-500 hover:text-text hover:bg-gray-100 transition-all cursor-pointer rounded-md">Annuler</button>
            <button onClick={save} disabled={JSON.stringify(form) === JSON.stringify(initialForm)} className="h-9 px-5 bg-foreground hover:bg-foreground/90 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer rounded-md shadow-sm shadow-black/20 disabled:opacity-40 disabled:cursor-not-allowed">{editId ? 'Enregistrer' : 'Ajouter'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={confirmDelete !== null} title="Supprimer la catégorie" message={`Êtes-vous sûr de vouloir supprimer "${confirmDelete?.name}" ?`} onConfirm={confirmDeleteAction} onCancel={() => setConfirmDelete(null)} />
    </>
  )
}
