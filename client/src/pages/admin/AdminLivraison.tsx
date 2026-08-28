import { useState, useEffect, useCallback, useRef } from 'react'
import { HiPencil, HiTrash, HiSquaresPlus, HiMagnifyingGlass, HiDocumentArrowUp, HiEye, HiStar, HiTag } from 'react-icons/hi2'
import * as XLSX from 'xlsx'
import {
  fetchDeliveryCompanies,
  createDeliveryCompany,
  updateDeliveryCompany,
  deleteDeliveryCompany,
  importDeliveryPrices,
  setDefaultDeliveryCompany,
  type DeliveryCompany,
  type PriceInput,
} from '../../api/delivery'
import { api } from '../../api'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import Select from '../../components/Select'

interface WilayaOption {
  code: string
  name: string
}

const emptyForm = { name: '', logo: '', location: '', abbreviation: '', isActive: true, returnPrice: '' }

export default function AdminLivraison() {
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<DeliveryCompany[]>([])
  const [wilayas, setWilayas] = useState<WilayaOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [initialForm, setInitialForm] = useState(emptyForm)
  const [prices, setPrices] = useState<PriceInput[]>([])
  const [initialPrices, setInitialPrices] = useState<PriceInput[]>([])
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  const [showView, setShowView] = useState(false)
  const [viewItem, setViewItem] = useState<DeliveryCompany | null>(null)
  const [successMsg, setSuccessMsg] = useState('')

  const [importMode, setImportMode] = useState<'none' | 'json' | 'csv' | 'excel'>('none')
  const [importText, setImportText] = useState('')
  const [unifiedReturnFee, setUnifiedReturnFee] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [companies, w] = await Promise.all([
        fetchDeliveryCompanies(),
        api<WilayaOption[]>('/api/wilayas'),
      ])
      setItems(companies)
      setWilayas(w)
    } catch (err) {
      console.error('Load error:', err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = items.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.location?.toLowerCase().includes(search.toLowerCase())
  )

  const sortedWilayas = [...wilayas].sort((a, b) => Number(a.code) - Number(b.code))

  async function handleSetDefault(id: string) {
    try {
      await setDefaultDeliveryCompany(id)
      setItems(prev => prev.map(c => ({ ...c, isDefault: c._id === id })))
    } catch {
      load()
    }
  }

  function openAdd() {
    setEditId(null)
    setForm(emptyForm)
    setInitialForm(emptyForm)
    setPrices([])
    setInitialPrices([])
    setImportMode('none')
    setImportText('')
    setSuccessMsg('')
    setShowForm(true)
  }

  function openEdit(company: DeliveryCompany) {
    setEditId(company._id)
    const filled = { name: company.name, logo: company.logo || '', location: company.location, abbreviation: company.abbreviation || '', isActive: company.isActive, returnPrice: company.returnPrice != null ? String(company.returnPrice) : '' }
    const filledPrices = company.prices.map(p => ({
      wilayaCode: normCode(p.wilaya.code),
      homeDelivery: p.homeDelivery,
      stopDesk: p.stopDesk,
      returnFee: p.returnFee ?? null,
    }))
    setForm(filled)
    setInitialForm(filled)
    setPrices(filledPrices)
    setInitialPrices(filledPrices)
    setImportMode('none')
    setImportText('')
    setSuccessMsg('')
    setShowForm(true)
  }

  function normCode(code: unknown): string {
    return String(Number(code))
  }

  function updatePrice(codeRaw: string, field: 'homeDelivery' | 'stopDesk' | 'returnFee', value: string) {
    const num = value === '' ? null : Number(value)
    const code = normCode(codeRaw)
    setPrices(prev => {
      const existing = prev.find(p => normCode(p.wilayaCode) === code)
      if (existing) {
        return prev.map(p => normCode(p.wilayaCode) === code ? { ...p, [field]: num } : p)
      }
      return [...prev, { wilayaCode: code, homeDelivery: field === 'homeDelivery' ? num : null, stopDesk: field === 'stopDesk' ? num : null, returnFee: field === 'returnFee' ? num : null }]
    })
  }

  function getPrice(wilayaCode: string, field: 'homeDelivery' | 'stopDesk' | 'returnFee'): string {
    const nc = normCode(wilayaCode)
    const p = prices.find(p => normCode(p.wilayaCode) === nc)
    if (!p) return ''
    const val = p[field]
    return val === null ? '' : String(val)
  }

  function applyUnifiedReturnFee() {
    const num = unifiedReturnFee === '' ? null : Number(unifiedReturnFee)
    setPrices(prev => {
      const map = new Map(prev.map(p => [normCode(p.wilayaCode), p]))
      for (const w of sortedWilayas) {
        const code = normCode(w.code)
        const existing = map.get(code)
        map.set(code, { wilayaCode: code, homeDelivery: existing?.homeDelivery ?? null, stopDesk: existing?.stopDesk ?? null, returnFee: num })
      }
      return Array.from(map.values())
    })
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const content = evt.target?.result
      if (!content) return

      if (file.name.endsWith('.csv')) {
        const text = typeof content === 'string' ? content : new TextDecoder().decode(content as ArrayBuffer)
        const lines = text.trim().split('\n')
        const dataLines = lines.slice(1)
        const parsed = dataLines.map(line => {
          const parts = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''))
          return {
            wilayaCode: String(parts[1] || ''),
            homeDelivery: parts[2] ? Number(parts[2]) : null,
            stopDesk: parts[3] ? Number(parts[3]) : null,
          }
        }).filter(p => p.wilayaCode && wilayas.some(w => normCode(w.code) === normCode(p.wilayaCode)))
        applyImportedPrices(parsed)
      } else {
        const data = new Uint8Array(content as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
        const parsed = rows.slice(1).map(row => ({
          wilayaCode: String(row[1] || '').trim(),
          homeDelivery: row[2] ? Number(row[2]) : null,
          stopDesk: row[3] ? Number(row[3]) : null,
        })).filter(p => p.wilayaCode && wilayas.some(w => normCode(w.code) === normCode(p.wilayaCode)))
        applyImportedPrices(parsed)
      }
    }
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file)
    } else {
      reader.readAsArrayBuffer(file)
    }
  }

  function applyImportedPrices(imported: PriceInput[]) {
    if (imported.length === 0) {
      setSuccessMsg('Aucune ligne valide trouvée. Vérifiez que la 2e colonne contient le code wilaya.')
      return
    }
    setPrices(prev => {
      const map = new Map(prev.map(p => [normCode(p.wilayaCode), p]))
      for (const p of imported) {
        if (p.wilayaCode) map.set(normCode(p.wilayaCode), { ...p, wilayaCode: normCode(p.wilayaCode) })
      }
      return Array.from(map.values())
    })
    setImportMode('none')
    setImportText('')
    setSuccessMsg(`${imported.length} wilaya${imported.length > 1 ? 's' : ''} importée${imported.length > 1 ? 's' : ''} avec succès`)
  }

  const toggleActive = async () => {
    const newVal = !form.isActive
    setForm(f => ({ ...f, isActive: newVal }))
    if (editId) {
      try {
        const updated = await updateDeliveryCompany(editId, { isActive: newVal })
        setItems(prev => prev.map(c => c._id === editId ? updated : c))
      } catch {
        setForm(f => ({ ...f, isActive: !newVal }))
      }
    }
  }

  const save = async () => {
    if (!form.name.trim() || !form.location) return
    try {
      const body = { ...form, name: form.name.trim(), returnPrice: form.returnPrice ? Number(form.returnPrice) : null, prices }
      if (editId !== null) {
        const updated = await updateDeliveryCompany(editId, body)
        setItems(prev => prev.map(c => (c._id === editId ? updated : c)))
        setSuccessMsg('Transporteur modifié avec succès')
        setShowForm(false)
      } else {
        const created = await createDeliveryCompany(body)
        setItems(prev => [...prev, created])
        setSuccessMsg('Transporteur ajouté avec succès')
        setShowForm(false)
      }
    } catch {
      load()
    }
  }

  const confirmDeleteCompany = async () => {
    if (!confirmDelete) return
    try {
      await deleteDeliveryCompany(confirmDelete.id)
      setItems(prev => prev.filter(c => c._id !== confirmDelete.id))
    } catch {
      load()
    }
    setConfirmDelete(null)
  }

  const doImport = async () => {
    if (importMode === 'none') return
    let parsed: PriceInput[] = []
    if (importMode === 'json') {
      try {
        const raw: any[] = JSON.parse(importText)
        if (!Array.isArray(raw)) return
        parsed = raw.map(item => ({
          wilayaCode: String(item.code_wilaya ?? item['code wilaya'] ?? item.wilayaCode ?? ''),
          homeDelivery: item.livraison_à_domicile ?? item['livraison à domicile'] ?? item.homeDelivery ?? null,
          stopDesk: item.stop_desk ?? item['stop desk'] ?? item.stopDesk ?? null,
        })).filter(p => p.wilayaCode && wilayas.some(w => normCode(w.code) === normCode(p.wilayaCode)))
      } catch { return }
    }
    if (parsed.length === 0) return
    if (editId) {
      try {
        const updated = await importDeliveryPrices(editId, parsed)
        setItems(prev => prev.map(c => (c._id === editId ? updated : c)))
        setPrices(updated.prices.map(p => ({
          wilayaCode: normCode(p.wilaya.code),
          homeDelivery: p.homeDelivery,
          stopDesk: p.stopDesk,
          returnFee: p.returnFee ?? null,
        })))
      } catch {
        load()
      }
    } else {
      applyImportedPrices(parsed)
    }
    setImportMode('none')
    setImportText('')
  }

  return (
    <div>
      <div className="sticky top-0 z-30 -mx-4 md:-mx-6 lg:-mx-8 pl-16 pr-4 md:pl-16 md:pr-6 lg:px-8 bg-foreground md:bg-white/90 md:backdrop-blur-xl border-b border-border md:border-gray-200 shadow-sm mb-6">
        <div className="flex items-center h-20">
          <div>
            <h1 className="text-xl font-bold text-white md:text-text tracking-tight">Livraison</h1>
            <p className="text-[13px] text-gray-300 md:text-gray-400 mt-1">{items.length} transporteur{items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="-mx-2 md:-mx-4 lg:-mx-6 px-2 md:px-4 lg:px-6 mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <HiMagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom ou localisation..." className="w-full h-10 pl-9 pr-4 bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-white transition-all rounded-lg" />
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 h-10 px-5 bg-primary hover:scale-105 text-white text-xs font-bold uppercase tracking-wider transition-transform shadow-sm shadow-primary/20 cursor-pointer shrink-0 rounded-lg">
            <HiSquaresPlus size={16} />Ajouter
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : (
        <div className="divide-y divide-gray-100/80">
          {filtered.map(company => (
            <div key={company._id} className="flex items-center justify-between px-3 py-3 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 bg-gray-100 shrink-0 overflow-hidden rounded-lg flex items-center justify-center ring-1 ring-gray-200/50">
                  {company.logo ? <img src={company.logo} alt="" className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} /> : <HiTruck size={18} className="text-gray-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-text truncate">{company.name}</span>
                    {company.isDefault && <span className="text-[9px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><HiStar size={8} /> Défaut</span>}
                    {!company.isActive && <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">INACTIF</span>}
                    {company.abbreviation && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{company.abbreviation}</span>}
                    {company.location && <span className="text-[11px] text-gray-400 hidden sm:inline">- {wilayas.find(w => w.code === company.location)?.name || company.location}</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{company.prices.length} wilayas desservies</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                {!company.isDefault && (
                  <button onClick={() => handleSetDefault(company._id)} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer rounded-md" title="Définir par défaut"><HiStar size={15} /></button>
                )}
                <button onClick={() => { setViewItem(company); setShowView(true) }} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer rounded-md" title="Voir"><HiEye size={15} /></button>
                <button onClick={() => openEdit(company)} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer rounded-md" title="Modifier"><HiPencil size={15} /></button>
                <button onClick={() => setConfirmDelete({ id: company._id, name: company.name })} className="p-2 text-gray-400 hover:text-foreground hover:bg-foreground/10 transition-all cursor-pointer rounded-md" title="Supprimer"><HiTrash size={15} /></button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-gray-500 mb-1">Aucun transporteur trouvé</p>
              <p className="text-xs text-gray-400">Essayez de modifier votre recherche</p>
            </div>
          )}
        </div>)}
      </div>

      {/* Form Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={
        <div className="flex flex-wrap items-center w-full pr-8 gap-2">
          <span className="mr-6">{editId ? 'Modifier le transporteur' : 'Nouveau transporteur'}</span>
          <label className="flex items-center gap-2.5 cursor-pointer select-none" onClick={e => e.stopPropagation()}>
            <div className={`w-10 h-6 rounded-full transition-all duration-300 relative shadow-inner ${form.isActive ? 'bg-primary shadow-primary/25' : 'bg-gray-200'}`}
              onClick={toggleActive}>
              <div className={`w-[18px] h-[18px] rounded-full bg-white absolute top-[3px] transition-all duration-300 shadow-md ${form.isActive ? 'left-[19px]' : 'left-[3px]'}`} />
            </div>
            <span className={`text-[10px] font-semibold uppercase tracking-wider transition-colors duration-300 ${form.isActive ? 'text-primary' : 'text-gray-400'}`}>Active</span>
          </label>
        </div>
      } className="lg:ml-64" maxWidth="max-w-2xl">
        <div className="space-y-5">
          {/* Section: Informations générales */}
          <div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nom *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom du transporteur" className="w-full h-10 px-3 bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-white transition-all rounded-md" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Abréviation</label>
                  <input value={form.abbreviation} onChange={e => setForm(f => ({ ...f, abbreviation: e.target.value }))} placeholder="Noest, Yalidine..." className="w-full h-10 px-3 bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-white transition-all rounded-md" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Départ</label>
                  <Select
                    value={form.location}
                    onChange={v => setForm(f => ({ ...f, location: v }))}
                    options={sortedWilayas.map(w => w.code)}
                    formatOption={code => { const w = sortedWilayas.find(x => x.code === code); return w ? `${w.code} - ${w.name}` : code }}
                    placeholder="Sélectionnez la wilaya de départ"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Logo (URL)</label>
                  <input value={form.logo} onChange={e => setForm(f => ({ ...f, logo: e.target.value }))} placeholder="https://..." className="w-full h-10 px-3 bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-white transition-all rounded-md" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Frais de retour unifiés</label>
                <div className="flex flex-wrap items-center gap-2 rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
                  <HiTag size={14} className="text-gray-400 shrink-0" />
                  <div className="relative">
                    <input
                      type="number"
                      value={unifiedReturnFee}
                      onChange={e => setUnifiedReturnFee(e.target.value)}
                      onWheel={e => e.currentTarget.blur()}
                      min="0"
                      className="w-24 h-8 px-2.5 pr-8 bg-white border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all rounded-md"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">DA</span>
                  </div>
                  <button
                    onClick={applyUnifiedReturnFee}
                    className="h-8 px-3 bg-primary text-white text-[10px] font-bold uppercase tracking-wider hover:scale-105 transition-transform cursor-pointer rounded-md"
                  >
                    Appliquer à tous
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Frais facturés par le transporteur en cas de retour. Laissez vide ou 0 pour gratuit.</p>
              </div>
            </div>
          </div>

          {/* Section: Tarifs */}
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <HiSquaresPlus size={14} className="text-primary" />
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tarifs par wilaya</h3>
              </div>
              <button
                onClick={() => setImportMode(importMode === 'none' ? 'json' : 'none')}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                <HiDocumentArrowUp size={14} /> Importer
              </button>
            </div>

            {importMode !== 'none' && (
              <div className="mb-4 rounded-md bg-white border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                  Importer les prix
                </div>
                <div className="p-3 space-y-2">
                  <div className="text-xs text-gray-500">
                    Colonnes attendues : <strong>1</strong> (Nom wilaya), <strong>2</strong> (Code wilaya), <strong>3</strong> (Livraison à domicile), <strong>4</strong> (Stop desk)
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                    {(['json', 'csv', 'excel'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setImportMode(mode)}
                        className={`px-2.5 py-1 border rounded-md transition-colors cursor-pointer ${importMode === mode ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200 hover:border-primary'}`}
                      >
                        {mode === 'excel' ? 'Excel' : mode.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  {importMode === 'json' && (
                    <div>
                      <textarea
                        value={importText}
                        onChange={e => setImportText(e.target.value)}
                        placeholder='[{"wilayaCode":"31","homeDelivery":500,"stopDesk":250}, ...]'
                        rows={4}
                        className="w-full px-3 py-2 bg-white border border-gray-200 text-xs text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all resize-none rounded-md"
                      />
                      <button onClick={doImport} className="mt-2 h-8 px-4 bg-primary text-white text-xs font-bold uppercase tracking-wider hover:scale-105 transition-transform cursor-pointer rounded-md">
                        Appliquer
                      </button>
                    </div>
                  )}

                  {importMode === 'csv' && (
                    <div>
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:border-0 file:text-xs file:font-medium file:bg-primary file:text-white file:cursor-pointer hover:file:scale-105 file:transition-transform file:rounded-md"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Fichier CSV avec en-têtes</p>
                    </div>
                  )}

                  {importMode === 'excel' && (
                    <div>
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileUpload}
                        className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white file:cursor-pointer hover:file:scale-105 file:transition-transform file:rounded-md"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-md border border-gray-200 overflow-hidden">
              <div className="hidden md:block max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2 font-semibold text-gray-500 uppercase tracking-wider">Wilaya</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-500 uppercase tracking-wider">Domicile</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-500 uppercase tracking-wider">Stop desk</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-500 uppercase tracking-wider">Retour</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedWilayas.map((w, i) => (
                      <tr key={w.code} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="px-3 py-1.5 text-text whitespace-nowrap text-xs font-medium">{w.code} - {w.name}</td>
                        <td className="px-3 py-1.5">
                          <input
                            type="number"
                            value={getPrice(w.code, 'homeDelivery')}
                            onChange={e => updatePrice(w.code, 'homeDelivery', e.target.value)}
                            onWheel={e => e.currentTarget.blur()}
                            placeholder="-"
                            className="w-full h-7 px-2 bg-white border border-gray-200 text-xs text-right text-text placeholder-gray-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all rounded-sm"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="number"
                            value={getPrice(w.code, 'stopDesk')}
                            onChange={e => updatePrice(w.code, 'stopDesk', e.target.value)}
                            onWheel={e => e.currentTarget.blur()}
                            placeholder="-"
                            className="w-full h-7 px-2 bg-white border border-gray-200 text-xs text-right text-text placeholder-gray-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all rounded-sm"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="number"
                            value={getPrice(w.code, 'returnFee')}
                            onChange={e => updatePrice(w.code, 'returnFee', e.target.value)}
                            onWheel={e => e.currentTarget.blur()}
                            placeholder="-"
                            className="w-full h-7 px-2 bg-white border border-gray-200 text-xs text-right text-text placeholder-gray-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all rounded-sm"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden max-h-64 overflow-y-auto">
                <div className="divide-y divide-gray-100">
                  {sortedWilayas.map(w => (
                    <div key={w.code} className="px-3 py-2">
                      <p className="text-xs font-medium text-text truncate mb-2">{w.code} - {w.name}</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        <input
                          type="number"
                          value={getPrice(w.code, 'homeDelivery')}
                          onChange={e => updatePrice(w.code, 'homeDelivery', e.target.value)}
                          onWheel={e => e.currentTarget.blur()}
                          placeholder="Domicile"
                          className="w-full min-w-0 h-9 px-2 bg-white border border-gray-200 text-xs text-text placeholder-gray-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all rounded-md"
                        />
                        <input
                          type="number"
                          value={getPrice(w.code, 'stopDesk')}
                          onChange={e => updatePrice(w.code, 'stopDesk', e.target.value)}
                          onWheel={e => e.currentTarget.blur()}
                          placeholder="Stop desk"
                          className="w-full min-w-0 h-9 px-2 bg-white border border-gray-200 text-xs text-text placeholder-gray-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all rounded-md"
                        />
                        <input
                          type="number"
                          value={getPrice(w.code, 'returnFee')}
                          onChange={e => updatePrice(w.code, 'returnFee', e.target.value)}
                          onWheel={e => e.currentTarget.blur()}
                          placeholder="Retour"
                          className="w-full min-w-0 h-9 px-2 bg-white border border-gray-200 text-xs text-text placeholder-gray-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all rounded-md"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {successMsg && (
            <div className="rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              {successMsg}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
            <button onClick={() => setShowForm(false)} className="h-9 px-5 text-sm font-medium text-gray-500 hover:text-text hover:bg-gray-100 transition-all cursor-pointer rounded-md">
              Annuler
            </button>
            <button onClick={save} disabled={JSON.stringify(form) === JSON.stringify(initialForm) && JSON.stringify(prices) === JSON.stringify(initialPrices)} className="h-9 px-5 bg-primary hover:bg-primary/90 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer rounded-md shadow-sm shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed">
              {editId ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={confirmDelete !== null} title="Supprimer le transporteur" message={`Êtes-vous sûr de vouloir supprimer "${confirmDelete?.name}" ?`} onConfirm={confirmDeleteCompany} onCancel={() => setConfirmDelete(null)} />

      <Modal open={showView} onClose={() => setShowView(false)} title={
        <div className="flex items-center gap-3">
          <span>{viewItem?.name || ''}</span>
          {viewItem && (
            <button onClick={() => { setShowView(false); openEdit(viewItem) }} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer rounded-md" title="Modifier">
              <HiPencil size={14} />
            </button>
          )}
        </div>
      } className="lg:ml-64">
        {viewItem && (
          <div className="space-y-5">
            {/* Section: Informations */}
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <HiPencil size={14} className="text-primary" />
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Informations</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3">
                <div className="px-4 py-3 sm:border-r border-gray-100">
                  <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Départ</span>
                  <span className="text-sm font-medium text-text">{wilayas.find(w => w.code === viewItem.location)?.name || viewItem.location || '-'}</span>
                </div>
                <div className="px-4 py-3 sm:border-r border-gray-100">
                  <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Abréviation</span>
                  <span className="text-sm font-medium text-text">{viewItem.abbreviation || '-'}</span>
                </div>
                <div className="px-4 py-3">
                  <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Wilayas desservies</span>
                  <span className="text-sm font-medium text-text">{viewItem.prices.filter(p => p.homeDelivery !== null || p.stopDesk !== null).length} / 58</span>
                </div>
              </div>
            </div>

            {/* Section: Tarifs */}
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <HiSquaresPlus size={14} className="text-primary" />
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tarifs</h3>
              </div>
              <div className="hidden md:block max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2 font-semibold text-gray-500 uppercase tracking-wider">Wilaya</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-500 uppercase tracking-wider">Domicile</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-500 uppercase tracking-wider">Stop desk</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-500 uppercase tracking-wider">Retour</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...viewItem.prices].sort((a, b) => Number(a.wilaya.code) - Number(b.wilaya.code)).map((p, i) => (
                      <tr key={p.wilaya.code} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="px-3 py-1.5 text-text whitespace-nowrap text-xs font-medium">{p.wilaya.code} - {p.wilaya.name}</td>
                        <td className="px-3 py-1.5 text-right text-text">{p.homeDelivery !== null ? `${Math.round(p.homeDelivery)} DA` : <span className="text-gray-300">-</span>}</td>
                        <td className="px-3 py-1.5 text-right text-text">{p.stopDesk !== null ? `${Math.round(p.stopDesk)} DA` : <span className="text-gray-300">-</span>}</td>
                        <td className="px-3 py-1.5 text-right text-text">{p.returnFee != null ? `${Math.round(p.returnFee)} DA` : <span className="text-gray-300">-</span>}</td>
                      </tr>
                    ))}
                    {viewItem.prices.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-gray-400">Aucun tarif configuré</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden max-h-64 overflow-y-auto">
                {[...viewItem.prices].sort((a, b) => Number(a.wilaya.code) - Number(b.wilaya.code)).map(p => (
                  <div key={p.wilaya.code} className="px-3 py-2.5 border-t border-gray-100 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-text truncate">{p.wilaya.code} - {p.wilaya.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Domicile</span>
                        <span className="text-xs font-semibold text-text">{p.homeDelivery !== null ? `${Math.round(p.homeDelivery)} DA` : <span className="text-gray-300">-</span>}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Stop desk</span>
                        <span className="text-xs font-semibold text-text">{p.stopDesk !== null ? `${Math.round(p.stopDesk)} DA` : <span className="text-gray-300">-</span>}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Retour</span>
                        <span className="text-xs font-semibold text-text">{p.returnFee != null ? `${Math.round(p.returnFee)} DA` : <span className="text-gray-300">-</span>}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {viewItem.prices.length === 0 && (
                  <p className="px-3 py-4 text-center text-gray-400">Aucun tarif configuré</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function HiTruck({ size, className }: { size: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className}>
      <path d="M5 17a2 2 0 1 0 4 0 2 2 0 1 0 -4 0" />
      <path d="M15 17a2 2 0 1 0 4 0 2 2 0 1 0 -4 0" />
      <path d="M5 17h-2v-8l3 -3h8v5h5l3 3v3h-1" />
      <path d="M10 6v6h-7" />
      <path d="M16 6v6" />
    </svg>
  )
}
