import { useState, useEffect, useMemo, useRef } from 'react'
import { HiMagnifyingGlass, HiUserPlus, HiChevronRight, HiAdjustmentsHorizontal, HiUser, HiEnvelope, HiLockClosed, HiEye, HiEyeSlash, HiPhone, HiIdentification, HiChartBar, HiCheck, HiPencil, HiShoppingBag, HiCheckCircle, HiXCircle } from 'react-icons/hi2'
import { listWorkers, createWorker, updateWorker, runDispatch, type Worker } from '../../api/workers'
import Modal from '../../components/Modal'

function fmtDate(d?: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function slugifyName(n: string): string {
  return n
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 30)
}

const inputClass = 'w-full h-10 px-3 bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-white transition-all rounded-lg'

const cardHeaderClass = 'flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100'
const cardTitleClass = 'text-[11px] font-bold text-gray-500 uppercase tracking-wider'

export default function AdminWorkers() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [active, setActive] = useState(true)
  const [formError, setFormError] = useState('')
  const [formSaving, setFormSaving] = useState(false)
  const autoSuggested = useRef<string | null>(null)
  const usernameManual = useRef(false)

  const [infoWorker, setInfoWorker] = useState<Worker | null>(null)

  const [showDispatch, setShowDispatch] = useState(false)
  const [dispatchWorkers, setDispatchWorkers] = useState<Worker[]>([])
  const [dispatchSavingId, setDispatchSavingId] = useState<string | null>(null)
  const [dispatchSavedId, setDispatchSavedId] = useState<string | null>(null)
  const [dispatchRunning, setDispatchRunning] = useState(false)
  const [dispatchError, setDispatchError] = useState('')
  const [dispatchResult, setDispatchResult] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await listWorkers()
      setWorkers(data.workers)
    } catch {
      setError('Impossible de charger les employés')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return workers
    return workers.filter(w =>
      w.name.toLowerCase().includes(q) ||
      w.email.toLowerCase().includes(q) ||
      (w.username || '').toLowerCase().includes(q) ||
      (w.phone || '').toLowerCase().includes(q)
    )
  }, [workers, search])

  function openAdd() {
    setEditId(null)
    setName('')
    setEmail('')
    setPhone('')
    setUsername('')
    setPassword('')
    setConfirmPassword('')
    setFormError('')
    setShowPassword(false)
    setShowConfirm(false)
    setActive(true)
    autoSuggested.current = null
    usernameManual.current = false
    setShowForm(true)
  }

  function openEdit(worker: Worker) {
    setEditId(worker._id)
    setName(worker.name)
    setEmail(worker.email)
    setPhone(worker.phone || '')
    setUsername(worker.username || '')
    setPassword('')
    setConfirmPassword('')
    setFormError('')
    setShowPassword(false)
    setShowConfirm(false)
    setActive(worker.active)
    autoSuggested.current = null
    usernameManual.current = true
    setShowForm(true)
  }

  function onNameChange(v: string) {
    setName(v)
    if (usernameManual.current) return
    const slug = slugifyName(v)
    if (slug) {
      const next = slug.replace(/\.+$/, '')
      autoSuggested.current = next
      setUsername(next)
    } else if (autoSuggested.current !== null) {
      autoSuggested.current = null
      setUsername('')
    }
  }

  function onUsernameChange(v: string) {
    usernameManual.current = true
    setUsername(v)
  }

  function openDispatch() {
    setDispatchError('')
    setDispatchResult('')
    setDispatchWorkers(workers)
    setShowDispatch(true)
  }

  async function saveDispatchWorker(id: string, patch: { active?: boolean; frequency?: number }) {
    setDispatchSavingId(id)
    setDispatchSavedId(null)
    try {
      const { worker } = await updateWorker(id, patch)
      setWorkers(prev => prev.map(w => (w._id === id ? { ...w, ...worker } : w)))
      setDispatchWorkers(prev => prev.map(w => (w._id === id ? { ...w, ...worker } : w)))
      setDispatchSavedId(id)
    } catch (err: any) {
      setDispatchError(err?.body?.message || err?.message || 'Erreur lors de l\'enregistrement')
    } finally {
      setDispatchSavingId(null)
    }
  }

  async function handleRunDispatch() {
    setDispatchRunning(true)
    setDispatchError('')
    setDispatchResult('')
    try {
      const { assigned } = await runDispatch()
      setDispatchResult(`${assigned} commande${assigned > 1 ? 's' : ''} répartie${assigned > 1 ? 's' : ''} entre les employés actifs.`)
    } catch (err: any) {
      setDispatchError(err?.body?.message || err?.message || 'Erreur lors de la répartition')
    } finally {
      setDispatchRunning(false)
    }
  }

  async function saveForm(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!name.trim() || !email.trim()) {
      setFormError('Nom et email requis')
      return
    }
    if (!/^[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)*$/.test(name.trim())) {
      setFormError('Le nom ne doit contenir que des lettres')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Adresse email invalide')
      return
    }
    const u = username.trim().toLowerCase()
    if (u && !/^[a-z0-9._-]{2,30}$/.test(u)) {
      setFormError("Nom d'utilisateur invalide (2-30 caractères : lettres, chiffres, . _ -)")
      return
    }
    if (editId === null) {
      if (password.length < 6) {
        setFormError('Le mot de passe doit contenir au moins 6 caractères')
        return
      }
      if (password !== confirmPassword) {
        setFormError('Les mots de passe ne correspondent pas')
        return
      }
    } else if (password && password.length < 6) {
      setFormError('Le mot de passe doit contenir au moins 6 caractères')
      return
    } else if (password && password !== confirmPassword) {
      setFormError('Les mots de passe ne correspondent pas')
      return
    }

    setFormSaving(true)
    try {
      if (editId === null) {
        const data = await createWorker({ name: name.trim(), email: email.trim(), password, phone: phone.trim(), username: u })
        setWorkers(prev => [data.worker, ...prev])
      } else {
        const data = await updateWorker(editId, {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          username: u,
          active,
          ...(password ? { password } : {}),
        })
        setWorkers(prev => prev.map(w => (w._id === editId ? { ...w, ...data.worker } : w)))
      }
      setShowForm(false)
    } catch (err: any) {
      setFormError(err?.body?.message || err?.message || 'Erreur lors de l\'enregistrement')
    } finally {
      setFormSaving(false)
    }
  }

  const initials = (w: Worker) => w.name.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

  const activeCount = workers.filter(w => w.active).length

  return (
    <div>
      <div className="sticky top-0 z-30 -mx-4 md:-mx-6 lg:-mx-8 pl-16 pr-4 md:pl-16 md:pr-6 lg:px-8 bg-foreground md:bg-white/90 md:backdrop-blur-xl border-b border-border md:border-gray-200 shadow-sm mb-6">
        <div className="flex items-center h-20">
          <div>
            <h1 className="text-xl font-bold text-white md:text-text tracking-tight">Employés</h1>
            <p className="text-[13px] text-gray-300 md:text-gray-400 mt-1">{workers.length} employé{workers.length > 1 ? 's' : ''} · {activeCount} actif{activeCount > 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 mb-4 rounded-lg">{error}</div>
      )}

      <div className="-mx-2 md:-mx-4 lg:-mx-6 px-2 md:px-4 lg:px-6 mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <HiMagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom, email, téléphone..."
              className="w-full h-10 pl-9 pr-4 bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-white transition-all rounded-lg"
            />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openDispatch} className="flex items-center gap-1.5 md:gap-2 h-10 px-3 md:px-4 bg-white border border-gray-200 hover:border-primary hover:text-primary text-gray-600 text-[11px] md:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 rounded-lg">
              <HiAdjustmentsHorizontal size={16} /> Répartir les commandes
            </button>
            <button onClick={openAdd} className="flex items-center gap-1.5 md:gap-2 h-10 px-3 md:px-5 bg-primary hover:scale-105 text-white text-[11px] md:text-xs font-bold uppercase tracking-wider transition-transform shadow-sm shadow-primary/20 cursor-pointer shrink-0 rounded-lg">
              <HiUserPlus size={16} /> <span className="md:hidden">Ajouter</span><span className="hidden md:inline">Ajouter un employé</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="divide-y divide-gray-100/80">
            {filtered.map(worker => {
              const stats = worker.stats || { totalOrders: 0, confirmedOrders: 0, canceledOrders: 0, rate: 0 }
              return (
                <div
                  key={worker._id}
                  className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer md:gap-4"
                  onClick={() => setInfoWorker(worker)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {worker.image ? (
                      <img src={worker.image} alt="" className="w-10 h-10 rounded-full object-cover ring-1 ring-gray-200 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 rounded-full">{initials(worker)}</div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text truncate">{worker.name}</span>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${worker.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                      </div>
                      <p className="text-xs text-gray-400 truncate hidden md:block">
                        {worker.email}
                        {worker.username ? ` · @${worker.username}` : ''}
                        {worker.phone ? ` · ${worker.phone}` : ''}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 max-w-[180px]">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, stats.rate)}%` }} />
                        </div>
                        <span className="text-[10px] font-semibold text-gray-500 shrink-0 tabular-nums">{stats.rate}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center shrink-0 ml-2 divide-x divide-gray-100">
                    <div className="px-2 text-center md:px-4">
                      <HiShoppingBag size={14} className="mx-auto text-gray-400 md:hidden" />
                      <p className="text-sm font-bold text-text tabular-nums mt-0.5">{stats.totalOrders}</p>
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mt-0.5 hidden md:block">Commandes</p>
                    </div>
                    <div className="px-2 text-center md:px-4">
                      <HiCheckCircle size={14} className="mx-auto text-blue-500 md:hidden" />
                      <p className="text-sm font-bold text-blue-600 md:text-green-600 tabular-nums mt-0.5">{stats.confirmedOrders}</p>
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mt-0.5 hidden md:block">Confirmées</p>
                    </div>
                    <div className="px-2 text-center md:px-4">
                      <HiXCircle size={14} className="mx-auto text-red-400 md:hidden" />
                      <p className="text-sm font-bold text-red-500 tabular-nums mt-0.5">{stats.canceledOrders}</p>
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mt-0.5 hidden md:block">Annulées</p>
                    </div>
                  </div>
                  <HiChevronRight size={18} className="text-gray-300 shrink-0" />
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm font-medium text-gray-500 mb-1">{search ? 'Aucun employé trouvé' : 'Aucun employé pour le moment'}</p>
                {!search && <p className="text-xs text-gray-400">Cliquez sur « Ajouter un employé » pour créer un compte</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- Add / Edit --- */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Modifier l\'employé' : 'Nouvel employé'} className="lg:ml-64">
        <form onSubmit={saveForm} className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
              <HiUser size={14} className="text-primary" />
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Informations générales</h3>
            </div>
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 mb-3 rounded-lg">{formError}</div>
            )}
            <div className="space-y-3">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  <HiUser size={12} className="text-gray-400" /> Nom complet *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => onNameChange(e.target.value.replace(/[^A-Za-zÀ-ÿ\s]/g, ''))}
                  placeholder="Ex : Yasmine Benali"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  <HiEnvelope size={12} className="text-gray-400" /> Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="employe@exemple.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  <HiPhone size={12} className="text-gray-400" /> Téléphone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/[^\d\s+]/g, ''))}
                  placeholder="05 55 55 55 55"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  <HiIdentification size={12} className="text-gray-400" /> Nom d'utilisateur
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => onUsernameChange(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''))}
                  placeholder="suggestion auto depuis le nom"
                  className={inputClass}
                />
                {username && !usernameManual.current && (
                  <p className="text-[11px] text-gray-400 mt-1">Proposé automatiquement d'après le nom — modifiable.</p>
                )}
              </div>
              {editId !== null && (
                <div className="flex items-center gap-3 pt-1">
                  <div
                    className={`w-10 h-6 rounded-full transition-all duration-300 relative shadow-inner cursor-pointer ${active ? 'bg-primary shadow-primary/25' : 'bg-gray-200'}`}
                    onClick={() => setActive(!active)}
                  >
                    <div className={`w-[18px] h-[18px] rounded-full bg-white absolute top-[3px] transition-all duration-300 shadow-md ${active ? 'left-[19px]' : 'left-[3px]'}`} />
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider transition-colors duration-300 ${active ? 'text-primary' : 'text-gray-400'}`}>
                    {active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
              <HiLockClosed size={14} className="text-primary" />
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {editId ? 'Nouveau mot de passe' : 'Mot de passe'}
              </h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  {editId ? (<span>Mot de passe <span className="font-normal normal-case text-gray-400">(optionnel)</span></span>) : 'Mot de passe *'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Au moins 6 caractères"
                    className={`${inputClass} pr-10`}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-text transition-colors cursor-pointer">
                    {showPassword ? <HiEyeSlash size={16} /> : <HiEye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Confirmer le mot de passe</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${inputClass} pr-10 ${confirmPassword && confirmPassword !== password ? 'border-red-400 focus:border-red-400 bg-red-50' : ''}`}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-text transition-colors cursor-pointer">
                    {showConfirm ? <HiEyeSlash size={16} /> : <HiEye size={16} />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-1 border-t border-gray-100">
            <button
              type="submit"
              disabled={formSaving}
              className="h-9 px-6 bg-foreground hover:scale-105 text-white text-xs font-bold uppercase tracking-wider transition-transform cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed rounded-lg"
            >
              {formSaving ? 'Enregistrement...' : editId ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- Info --- */}
      <Modal
        open={infoWorker !== null}
        onClose={() => setInfoWorker(null)}
        title={
          <div className="flex items-center gap-3">
            <span>Informations de l'employé</span>
            {infoWorker && (
              <button onClick={() => { setInfoWorker(null); openEdit(infoWorker) }} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer rounded-md" title="Modifier">
                <HiPencil size={14} />
              </button>
            )}
          </div>
        }
        className="lg:ml-64"
        maxWidth="max-w-xl"
      >
        {infoWorker && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
              {infoWorker.image ? (
                <img src={infoWorker.image} alt="" className="w-11 h-11 rounded-full object-cover ring-1 ring-gray-200 shrink-0" />
              ) : (
                <div className="w-11 h-11 bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 rounded-full">{initials(infoWorker)}</div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-text truncate">{infoWorker.name}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0 ${infoWorker.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {infoWorker.active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{infoWorker.email}</p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className={cardHeaderClass}>
                <HiUser size={14} className="text-primary" />
                <h3 className={cardTitleClass}>Informations</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2">
                <div className="px-4 py-3 sm:border-r border-gray-100">
                  <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Email</span>
                  <span className="text-sm font-medium text-text break-all">{infoWorker.email}</span>
                </div>
                <div className="px-4 py-3">
                  <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Téléphone</span>
                  <span className="text-sm font-medium text-text">{infoWorker.phone || '—'}</span>
                </div>
                <div className="px-4 py-3 sm:col-span-2 sm:border-t border-gray-100">
                  <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Nom d'utilisateur</span>
                  <span className="text-sm font-medium text-text">{infoWorker.username ? `@${infoWorker.username}` : '—'}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className={cardHeaderClass}>
                <HiAdjustmentsHorizontal size={14} className="text-primary" />
                <h3 className={cardTitleClass}>Répartition des commandes</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2">
                <div className="px-4 py-3 sm:border-r border-gray-100">
                  <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Statut</span>
                  <span className={`text-sm font-medium ${infoWorker.active ? 'text-green-600' : 'text-gray-500'}`}>
                    {infoWorker.active ? 'Reçoit des commandes' : 'Ne reçoit pas de commandes'}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Fréquence</span>
                  <span className="text-sm font-medium text-text">{infoWorker.frequency || 1} commande{infoWorker.frequency !== 1 ? 's' : ''} par tour</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className={cardHeaderClass}>
                <HiChartBar size={14} className="text-primary" />
                <h3 className={cardTitleClass}>Performance</h3>
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-100">
                <div className="px-4 py-3 text-center">
                  <p className="text-lg font-bold text-text">{infoWorker.stats?.totalOrders || 0}</p>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mt-0.5">Commandes</p>
                </div>
                <div className="px-4 py-3 text-center">
                  <p className="text-lg font-bold text-green-600">{infoWorker.stats?.confirmedOrders || 0}</p>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mt-0.5">Confirmées</p>
                </div>
                <div className="px-4 py-3 text-center">
                  <p className="text-lg font-bold text-red-500">{infoWorker.stats?.canceledOrders || 0}</p>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mt-0.5">Annulées</p>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Taux de confirmation</span>
                  <span className="text-xs font-semibold text-text">{infoWorker.stats?.rate || 0}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, infoWorker.stats?.rate || 0)}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* --- Dispatch --- */}
      <Modal open={showDispatch} onClose={() => setShowDispatch(false)} title="Répartir les commandes" className="lg:ml-64" maxWidth="max-w-xl">
        <div className="space-y-5">
          <p className="text-sm text-gray-500 leading-relaxed">
            Réglez combien de commandes chaque employé doit recevoir à chaque tour.
            La répartition passe ensuite à l'employé suivant.
          </p>

          {dispatchError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">{dispatchError}</div>
          )}

          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className={cardHeaderClass}>
              <HiUser size={14} className="text-primary" />
              <h3 className={cardTitleClass}>Employés ({dispatchWorkers.length})</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {dispatchWorkers.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-gray-400">Aucun employé. Ajoutez d'abord un employé.</p>
              )}
              {dispatchWorkers.map(w => (
                <div key={w._id} className="flex items-center gap-3 px-4 py-3">
                  {w.image ? (
                    <img src={w.image} alt="" className="w-9 h-9 rounded-full object-cover ring-1 ring-gray-200 shrink-0" />
                  ) : (
                    <div className="w-9 h-9 bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 rounded-full">{initials(w)}</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text truncate">{w.name}</p>
                    <p className={`text-[11px] ${w.active ? 'text-green-600' : 'text-gray-400'}`}>
                      {w.active ? 'Actif' : 'Désactivé'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={w.frequency || 1}
                      onChange={e => {
                        const f = Math.max(1, Math.min(99, Math.floor(Number(e.target.value) || 1)))
                        setDispatchWorkers(prev => prev.map(x => (x._id === w._id ? { ...x, frequency: f } : x)))
                      }}
                      onWheel={e => e.currentTarget.blur()}
                      onBlur={() => saveDispatchWorker(w._id, { frequency: w.frequency })}
                      className="w-16 h-9 text-center bg-gray-50 border border-gray-200 text-sm font-semibold text-text focus:outline-none focus:border-primary rounded-lg"
                    />
                    <span className="text-[11px] text-gray-400 whitespace-nowrap">cde(s)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !w.active
                      setDispatchWorkers(prev => prev.map(x => (x._id === w._id ? { ...x, active: next } : x)))
                      saveDispatchWorker(w._id, { active: next })
                    }}
                    className={`w-9 h-5 rounded-full transition-all relative shrink-0 ${w.active ? 'bg-primary' : 'bg-gray-300'}`}
                    title={w.active ? 'Désactiver' : 'Activer'}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${w.active ? 'left-[18px]' : 'left-[2px]'}`} />
                  </button>
                  <div className="w-5 shrink-0">
                    {dispatchSavingId === w._id
                      ? <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      : dispatchSavedId === w._id
                        ? <HiCheck size={15} className="text-green-500" />
                        : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className={cardHeaderClass}>
              <HiAdjustmentsHorizontal size={14} className="text-primary" />
              <h3 className={cardTitleClass}>Appliquer maintenant</h3>
            </div>
            <div className="px-4 py-3 space-y-3">
              <p className="text-xs text-gray-500 leading-relaxed">
                Répartit les commandes non confirmées selon les réglages ci-dessus.
              </p>
              {dispatchResult && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-2.5">{dispatchResult}</div>
              )}
              <button
                onClick={handleRunDispatch}
                disabled={dispatchRunning || activeCount === 0}
                className="w-full h-10 bg-foreground hover:scale-[1.01] text-white text-xs font-bold uppercase tracking-wider transition-transform cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded-lg"
              >
                <HiAdjustmentsHorizontal size={15} /> {dispatchRunning ? 'Répartition en cours...' : 'Répartir les commandes'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
