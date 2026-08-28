import { useState, useEffect } from 'react'
import { HiCheckCircle, HiShoppingBag, HiTruck, HiArrowUturnLeft, HiXMark, HiChartBar, HiBanknotes } from 'react-icons/hi2'
import { fetchWorkerPerformance, fetchWorkerMe, type Worker, type WorkerPerformance } from '../../api/workers'

function fmtMoney(n: number) {
  return n.toLocaleString('fr-FR') + ' DA'
}

export default function WorkerPerformance() {
  const [worker, setWorker] = useState<Worker | null>(null)
  const [perf, setPerf] = useState<WorkerPerformance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([fetchWorkerMe(), fetchWorkerPerformance()])
      .then(([me, data]) => {
        setWorker(me.worker)
        setPerf(data.performance)
      })
      .catch(() => setError('Impossible de charger vos performances'))
      .finally(() => setLoading(false))
  }, [])

  const cards = perf ? [
    { label: 'Commandes confirmées', value: String(perf.totalConfirmed), sub: `${perf.todayConfirmed} aujourd\'hui`, icon: HiCheckCircle, color: 'bg-primary/10 text-primary' },
    { label: 'Ventes confirmées', value: fmtMoney(perf.totalRevenue), sub: 'Montant total confirmé', icon: HiBanknotes, color: 'bg-blue-50 text-blue-600' },
    { label: 'Commandes livrées', value: String(perf.deliveredCount), sub: fmtMoney(perf.deliveredTotal), icon: HiTruck, color: 'bg-green-50 text-green-600' },
    { label: 'Retours', value: String(perf.returnedCount), sub: 'Retournées', icon: HiArrowUturnLeft, color: 'bg-orange-50 text-orange-600' },
    { label: 'Annulées', value: String(perf.cancelledCount), sub: 'Après confirmation', icon: HiXMark, color: 'bg-red-50 text-red-500' },
    { label: 'Annulées par vous', value: String(perf.cancelledByWorker), sub: 'Avant confirmation', icon: HiXMark, color: 'bg-rose-50 text-rose-500' },
  ] : []

  return (
    <div>
      <div className="sticky top-0 z-30 -mx-4 md:-mx-6 lg:-mx-8 pl-16 pr-4 md:pl-16 md:pr-6 lg:px-8 bg-[#0f0f1a] md:bg-white/80 md:backdrop-blur-xl border-b border-white/10 md:border-gray-200/60 shadow-sm mb-6">
        <div className="flex items-center h-20">
          <div>
            <h1 className="text-xl font-bold text-white md:text-text tracking-tight">Mon travail</h1>
            <p className="text-[13px] text-gray-300 md:text-gray-400 mt-1">{worker ? worker.name : 'Vos performances'}</p>
          </div>
          <HiChartBar size={24} className="ml-auto text-white md:text-primary bg-white/10 md:bg-transparent p-1.5 md:p-0 box-content border border-white/15 md:border-transparent rounded-full md:rounded-none" />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
          {cards.map((card, i) => (
            <div key={i} className="bg-white border border-gray-100 shadow-sm p-3 sm:p-4 flex items-center gap-3 rounded-2xl">
              <div className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-xl ${card.color}`}>
                <card.icon size={17} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider truncate">{card.label}</p>
                <p className="text-base sm:text-lg font-bold text-text mt-0.5 leading-snug tabular-nums truncate">{card.value}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 truncate">{card.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {perf && (
        <div className="bg-white border border-gray-100 shadow-sm p-4 sm:p-5 rounded-2xl flex items-center gap-3">
          <HiShoppingBag size={16} className="text-primary shrink-0" />
          <p className="text-sm text-gray-600">
            Vous avez confirmé <strong className="text-text">{perf.totalConfirmed}</strong> commande{perf.totalConfirmed > 1 ? 's' : ''}, représentant <strong className="text-text">{fmtMoney(perf.totalRevenue)}</strong> de ventes.
          </p>
        </div>
      )}
    </div>
  )
}
