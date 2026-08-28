import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiUser, HiEnvelope, HiCalendar, HiCog6Tooth, HiArrowPath, HiShieldCheck } from 'react-icons/hi2'
import { fetchWorkerMe, type Worker } from '../../api/workers'

function fmtDate(d?: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function WorkerProfile() {
  const [worker, setWorker] = useState<Worker | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await fetchWorkerMe()
      setWorker(data.worker)
    } catch {
      setError('Impossible de charger le profil')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const initials = worker
    ? worker.name.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
    : '—'

  return (
    <div>
      <div className="sticky top-0 z-30 -mx-4 md:-mx-6 lg:-mx-8 pl-16 pr-4 md:pl-16 md:pr-6 lg:px-8 bg-[#0f0f1a] md:bg-white/80 md:backdrop-blur-xl border-b border-white/10 md:border-gray-200/60 shadow-sm mb-6">
        <div className="flex items-center h-20">
          <div>
            <h1 className="text-xl font-bold text-white md:text-text tracking-tight">Profil</h1>
            <p className="text-[13px] text-gray-300 md:text-gray-400 mt-1">{worker ? worker.name : 'Votre profil employé'}</p>
          </div>
          <button onClick={load} className="ml-auto p-2 rounded-full text-white md:text-gray-400 bg-white/10 md:bg-transparent border border-white/15 md:border-transparent backdrop-blur-md md:backdrop-blur-none hover:text-primary hover:bg-primary/10 transition-all duration-300 cursor-pointer" title="Actualiser">
            <HiArrowPath size={18} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 mb-4">{error}</div>
      )}

      <div>
        <div className="bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden">
          <div className="bg-primary px-6 py-8 flex items-center gap-5">
            <div className="w-16 h-16 bg-white/10 ring-1 ring-white/20 rounded-full flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-white">{initials}</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-white truncate">{worker?.name || '—'}</h2>
              <p className="text-sm text-white/60 truncate">{worker?.email || '—'}</p>
              <span className="md:hidden mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 ring-1 ring-white/30 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                <HiShieldCheck size={13} /> Confirmateur
              </span>
            </div>
            <span className="hidden md:inline-flex ml-auto items-center gap-1.5 px-3 py-1.5 bg-white/15 ring-1 ring-white/30 text-white text-[11px] font-bold uppercase tracking-wider rounded-full">
              <HiShieldCheck size={13} /> Confirmateur
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : worker ? (
            <div className="divide-y divide-gray-100/80">
              <div className="flex items-center gap-4 px-6 py-4">
                <HiUser size={16} className="text-gray-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Nom</span>
                  <span className="text-sm font-medium text-text">{worker.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 px-6 py-4">
                <HiEnvelope size={16} className="text-gray-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Email</span>
                  <span className="text-sm font-medium text-text">{worker.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 px-6 py-4">
                <HiCalendar size={16} className="text-gray-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Membre depuis</span>
                  <span className="text-sm font-medium text-text">{fmtDate(worker.createdAt)}</span>
                </div>
              </div>
              <div className="px-6 py-4">
                <button onClick={() => navigate('/employe/settings')} className="h-10 px-4 bg-[#1a1a2e] hover:scale-105 text-white text-xs font-bold uppercase tracking-wider transition-transform cursor-pointer flex items-center gap-1.5 rounded-lg">
                  <HiCog6Tooth size={14} /> Modifier le profil
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
