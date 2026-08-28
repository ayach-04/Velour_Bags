import { useState, useEffect } from 'react'
import { HiEnvelope, HiUser, HiLockClosed, HiCheck, HiShieldCheck, HiEye, HiEyeSlash } from 'react-icons/hi2'
import { fetchWorkerMe, updateWorkerProfile, changeWorkerPassword, type Worker } from '../../api/workers'

type Tab = 'profile' | 'password'

export default function WorkerSettings() {
  const [worker, setWorker] = useState<Worker | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('profile')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  useEffect(() => {
    fetchWorkerMe()
      .then(data => {
        setWorker(data.worker)
        setName(data.worker.name)
        setEmail(data.worker.email)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')
    if (!name.trim() || !email.trim()) {
      setProfileError('Nom et email requis')
      return
    }
    if (!/^[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)*$/.test(name.trim())) {
      setProfileError('Le nom ne doit contenir que des lettres')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setProfileError('Veuillez saisir une adresse email valide')
      return
    }
    setProfileSaving(true)
    try {
      const data = await updateWorkerProfile({ name: name.trim(), email: email.trim() })
      setWorker(data.worker)
      setProfileSuccess('Profil mis à jour')
    } catch (err: any) {
      setProfileError(err?.body?.message || err?.message || 'Erreur lors de la mise à jour')
    } finally {
      setProfileSaving(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')
    if (newPassword.length < 6) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 6 caractères')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas')
      return
    }
    setPasswordSaving(true)
    try {
      const data = await changeWorkerPassword({ currentPassword, newPassword })
      setPasswordSuccess(data.message || 'Mot de passe mis à jour')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPasswordError(err?.body?.message || err?.message || 'Erreur lors du changement de mot de passe')
    } finally {
      setPasswordSaving(false)
    }
  }

  const inputClass = 'w-full h-11 px-4 bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary rounded-lg transition-all'

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: 'Infos du profil', icon: <HiUser size={15} /> },
    { key: 'password', label: 'Mot de passe', icon: <HiLockClosed size={15} /> },
  ]

  return (
    <div>
      <div className="sticky top-0 z-30 -mx-4 md:-mx-6 lg:-mx-8 pl-16 pr-4 md:pl-16 md:pr-6 lg:px-8 bg-[#0f0f1a] md:bg-white/80 md:backdrop-blur-xl border-b border-white/10 md:border-gray-200/60 shadow-sm mb-6">
        <div className="flex items-center h-20">
          <div>
            <h1 className="text-xl font-bold text-white md:text-text tracking-tight">Paramètres</h1>
            <p className="text-[13px] text-gray-300 md:text-gray-400 mt-1">Paramètres de votre profil employé</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-100 mb-6 overflow-x-auto scrollbar-hide">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-b-2 -mb-px whitespace-nowrap ${
              tab === t.key
                ? 'text-primary border-primary'
                : 'text-gray-400 border-transparent hover:text-text hover:border-gray-300'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'profile' ? (
          <div className="bg-white border border-gray-100 shadow-sm rounded-xl">
            <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-gray-100">
              <HiUser size={15} className="text-primary" />
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Infos du profil</h3>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <form onSubmit={handleSaveProfile} className="p-5 space-y-5">
                {profileError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3">{profileError}</div>
                )}
                {profileSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 flex items-center gap-2"><HiCheck size={14} /> {profileSuccess}</div>
                )}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-text uppercase tracking-wider">
                    <HiUser size={12} className="text-gray-400" /> Nom
                  </label>
                  <input type="text" value={name} onChange={e => setName(e.target.value.replace(/[^A-Za-zÀ-ÿ\s]/g, ''))} placeholder="Votre nom" className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-text uppercase tracking-wider">
                    <HiEnvelope size={12} className="text-gray-400" /> Email
                  </label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="employe@exemple.com" className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-text uppercase tracking-wider">
                    <HiShieldCheck size={12} className="text-gray-400" /> Permission
                  </label>
                  <div className="h-11 px-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-2 text-sm text-text">
                    <HiShieldCheck size={15} className="text-primary shrink-0" />
                    <span className="font-medium">Confirmateur</span>
                    <span className="text-xs text-gray-400 ml-auto">Non modifiable</span>
                  </div>
                </div>
                <button type="submit" disabled={profileSaving} className="h-10 px-5 bg-[#1a1a2e] hover:scale-105 disabled:hover:scale-100 disabled:opacity-60 text-white text-xs font-bold uppercase tracking-wider transition-transform cursor-pointer disabled:cursor-not-allowed rounded-lg">
                  {profileSaving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="bg-white border border-gray-100 shadow-sm rounded-xl">
            <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-gray-100">
              <HiLockClosed size={15} className="text-primary" />
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mot de passe</h3>
            </div>
            <form onSubmit={handleChangePassword} className="p-5 space-y-4">
              {passwordError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3">{passwordError}</div>
              )}
              {passwordSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 flex items-center gap-2"><HiCheck size={14} /> {passwordSuccess}</div>
              )}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-text uppercase tracking-wider">Mot de passe actuel</label>
                <div className="relative">
                  <input type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" className={`${inputClass} pr-10`} />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-text transition-colors cursor-pointer">
                    {showCurrent ? <HiEyeSlash size={16} /> : <HiEye size={16} />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-text uppercase tracking-wider">Nouveau mot de passe</label>
                <div className="relative">
                  <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Au moins 6 caractères" className={`${inputClass} pr-10`} />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-text transition-colors cursor-pointer">
                    {showNew ? <HiEyeSlash size={16} /> : <HiEye size={16} />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-text uppercase tracking-wider">Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputClass} ${confirmPassword && confirmPassword !== newPassword ? 'border-red-400 focus:border-red-400 bg-red-50' : ''}`}
                />
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-xs text-red-500">Les mots de passe ne correspondent pas</p>
                )}
              </div>
              <button type="submit" disabled={passwordSaving} className="h-10 px-5 bg-[#1a1a2e] hover:scale-105 disabled:hover:scale-100 disabled:opacity-60 text-white text-xs font-bold uppercase tracking-wider transition-transform cursor-pointer disabled:cursor-not-allowed rounded-lg">
                {passwordSaving ? 'Enregistrement...' : 'Changer le mot de passe'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
