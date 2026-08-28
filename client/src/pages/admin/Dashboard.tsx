import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  HiArrowPath, HiShoppingBag, HiCurrencyDollar, HiClock, HiCube, HiTruck,
  HiArrowUturnLeft, HiXCircle, HiUsers, HiChevronRight, HiCheckCircle, HiCheckBadge, HiTag,
  HiArrowTrendingUp, HiArrowTrendingDown,
} from 'react-icons/hi2'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { fetchDashboard, fetchOrderStats, fetchMonthlyStats, type DashboardData, type OrderStats, type MonthlyStats } from '../../api/orders'

const STATUS_BADGES: Record<string, string> = {
  not_confirmed: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-blue-50 text-blue-700',
  shipped: 'bg-purple-50 text-purple-700',
  delivered: 'bg-green-50 text-green-700',
  returned: 'bg-orange-50 text-orange-700',
  cancelled: 'bg-red-50 text-red-700',
  archived: 'bg-gray-50 text-gray-600',
}

const STATUS_LABELS: Record<string, string> = {
  not_confirmed: 'Non confirmée',
  confirmed: 'Confirmée',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  returned: 'Retournée',
  cancelled: 'Annulée',
  archived: 'Archivée',
}

function formatDA(n: number) {
  return new Intl.NumberFormat('fr-DZ').format(Math.round(n)) + ' DA'
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('fr-DZ').format(Math.round(n))
}

function deltaPct(curr: number, prev: number): number | null {
  if (prev > 0) return Math.round(((curr - prev) / prev) * 100)
  return curr > 0 ? null : 0
}

function ageMinutes(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 60000
}

function ageLabel(iso: string) {
  const mins = ageMinutes(iso)
  if (mins < 60) return `${Math.max(1, Math.floor(mins))}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}j`
}

function DeltaBadge({ curr, prev }: { curr: number; prev: number }) {
  const d = deltaPct(curr, prev)
  if (d === null) return <span className="text-green-600 font-semibold">+ nouveau</span>
  if (d === 0) return <span className="text-gray-400">vs hier</span>
  const up = d > 0
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold ${up ? 'text-green-600' : 'text-red-500'}`}>
      {up ? <HiArrowTrendingUp size={12} /> : <HiArrowTrendingDown size={12} />}
      {up ? '+' : ''}{d}% <span className="text-gray-400 font-normal">vs hier</span>
    </span>
  )
}

function StatCard({ icon: Icon, label, value, sub, color, to }: { icon: typeof HiShoppingBag; label: string; value: string; sub?: React.ReactNode; color: string; to?: string }) {
  const inner = (
    <>
      <div className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-lg ${color}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider truncate">{label}</p>
        <p className="text-lg font-bold text-text mt-0.5 truncate">{value}</p>
        {sub && <div className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</div>}
      </div>
    </>
  )
  const cls = 'bg-white border border-gray-100 shadow-sm p-3 flex items-center gap-3 rounded-2xl transition-all'
  if (to) {
    return (
      <Link to={to} className={`${cls} hover:border-primary/25 hover:shadow-md hover:-translate-y-0.5 cursor-pointer`}>
        {inner}
      </Link>
    )
  }
  return <div className={cls}>{inner}</div>
}

function ReceiptRow({ icon: Icon, label, value, valueClass }: { icon: typeof HiShoppingBag; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span className="text-gray-300 shrink-0"><Icon size={14} /></span>
      <span className="text-[12px] text-gray-500 whitespace-nowrap">{label}</span>
      <span className="flex-1 border-b border-dotted border-gray-200 translate-y-[-4px]" />
      <span className={`text-sm font-medium tabular-nums ${valueClass || 'text-text'}`}>{value}</span>
    </div>
  )
}

function ChartCard({ title, action, children, className = '' }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-100 shadow-sm p-5 rounded-2xl ${className}`}>
      <div className="flex items-center mb-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</h3>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </div>
  )
}

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [monthly, setMonthly] = useState<MonthlyStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const [d, s, m] = await Promise.all([fetchDashboard(), fetchOrderStats(30), fetchMonthlyStats()])
      setDashboard(d)
      setStats(s)
      setMonthly(m)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!dashboard || !stats || !monthly) return null

  const { summary } = stats
  const { today, yesterday, statusCounts, stock, workerStats, hourlyActivity } = dashboard
  const totalStockAlerts = stock.outOfStock + stock.lowStock

  const deliveryRate = summary.totalOrders > 0 ? Math.round((summary.deliveredCount / summary.totalOrders) * 100) : 0

  const monthLabel = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const peakHours = new Set(
    [...hourlyActivity].sort((a, b) => b.count - a.count).slice(0, 3).map(h => h.hour)
  )
  const peakHour = [...hourlyActivity].sort((a, b) => b.count - a.count)[0]

  const recentOrders = [...dashboard.recentOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)

  function rateColor(rate: number) {
    if (rate >= 80) return '#22c55e'
    if (rate >= 50) return '#6FAFC5'
    return '#ef4444'
  }

  return (
    <div>
      <div className="sticky top-0 z-30 -mx-4 md:-mx-6 lg:-mx-8 pl-16 pr-4 md:pl-16 md:pr-6 lg:px-8 bg-foreground md:bg-white/90 md:backdrop-blur-xl border-b border-border md:border-gray-200 shadow-sm mb-6">
        <div className="flex items-center h-20">
          <div>
            <h1 className="text-xl font-bold text-white md:text-text tracking-tight">Tableau de bord</h1>
            <p className="text-[13px] text-gray-300 md:text-gray-400 mt-1">Vue d'ensemble de la boutique</p>
          </div>
          <button onClick={load} className="ml-auto p-2 rounded-full text-white md:text-gray-400 bg-white/10 md:bg-transparent border border-white/15 md:border-transparent backdrop-blur-md md:backdrop-blur-none hover:text-primary hover:bg-primary/10 transition-all duration-300 cursor-pointer" title="Actualiser">
            <HiArrowPath size={18} />
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={HiShoppingBag} label="Commandes aujourd'hui" value={formatNumber(today.orders)} sub={<DeltaBadge curr={today.orders} prev={yesterday.orders} />} color="bg-primary/10 text-primary" to="/admin/orders" />
        <StatCard icon={HiCurrencyDollar} label="CA du jour" value={formatDA(today.revenue)} sub={<DeltaBadge curr={today.revenue} prev={yesterday.revenue} />} color="bg-green-50 text-green-600" to="/admin/stats" />
        <StatCard icon={HiClock} label="À confirmer" value={formatNumber(statusCounts.not_confirmed)} sub="en attente de validation" color="bg-amber-50 text-amber-600" to="/admin/orders?status=not_confirmed" />
        <StatCard icon={HiCube} label="Stock à surveiller" value={formatNumber(totalStockAlerts)} sub={`${stock.outOfStock} rupture(s) · ${stock.lowStock} bas`} color="bg-red-50 text-red-600" to="/admin/stock" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={HiTruck} label="Taux de livraison" value={`${deliveryRate}%`} sub={`${summary.deliveredCount} livrée(s)`} color="bg-purple-50 text-purple-600" to="/admin/orders/delivered" />
        <StatCard icon={HiArrowUturnLeft} label="Taux de retour" value={`${summary.returnRate}%`} sub={`${summary.returnedCount} retour(s)`} color="bg-orange-50 text-orange-600" to="/admin/orders/returned" />
        <StatCard icon={HiXCircle} label="Taux d'annulation" value={`${summary.cancellationRate}%`} sub={`${summary.cancelledCount} annulée(s)`} color="bg-rose-50 text-rose-600" to="/admin/orders" />
        <StatCard icon={HiUsers} label="Employés actifs" value={`${dashboard.workers.active}/${dashboard.workers.total}`} sub="actifs sur le total" color="bg-cyan-50 text-cyan-600" to="/admin/workers" />
      </div>

      {/* Monthly brief + Recent orders */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[7fr_9fr] gap-4 mb-4">
        <ChartCard
          title="Résumé du mois"
          action={
            <span className="px-2.5 py-1 bg-primary/10 text-primary text-[11px] font-bold rounded-full capitalize">{monthLabel}</span>
          }
        >
          <div className="max-w-sm mx-auto">
            <ReceiptRow icon={HiCube} label="Produits listés" value={formatNumber(monthly.productsListed)} />
            <ReceiptRow icon={HiShoppingBag} label="Produits vendus" value={formatNumber(monthly.soldQuantity)} />
            <ReceiptRow icon={HiTag} label="Commandes passées" value={formatNumber(monthly.orders)} />
            <ReceiptRow icon={HiCheckBadge} label="Confirmées" value={formatNumber(monthly.confirmedCount)} />
            <ReceiptRow icon={HiXCircle} label="Annulées" value={formatNumber(monthly.cancelledCount)} />
            <ReceiptRow icon={HiCheckCircle} label="Livrées" value={formatNumber(monthly.deliveredCount)} />
            <ReceiptRow icon={HiArrowUturnLeft} label="Retournées" value={formatNumber(monthly.returnedCount)} />
            <ReceiptRow icon={HiCurrencyDollar} label="Montant des ventes" value={formatDA(monthly.revenue)} />
            <ReceiptRow icon={HiArrowTrendingDown} label="Pertes retours" value={formatDA(monthly.returnLosses)} />
            <ReceiptRow icon={HiArrowTrendingUp} label="Profit net" value={formatDA(monthly.netProfit)} />
          </div>
        </ChartCard>

        <ChartCard
          title="Dernières commandes"
          action={
            <Link to="/admin/orders" className="flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:underline">
              Voir tout <HiChevronRight size={12} />
            </Link>
          }
        >
          <div className="divide-y divide-gray-50">
            {recentOrders.map(o => (
              <div key={o._id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-primary">
                    #{o.orderNumber}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text truncate">{o.firstName} {o.lastName}</p>
                    <p className="text-[11px] text-gray-400 truncate">{o.wilaya} · {ageLabel(o.createdAt)}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[13px] font-medium text-text tabular-nums">{formatDA(o.total)}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap rounded-full ${STATUS_BADGES[o.status] || 'bg-gray-50 text-gray-600'}`}>
                    {STATUS_LABELS[o.status] || o.status}
                  </span>
                </div>
              </div>
            ))}
            {recentOrders.length === 0 && (
              <p className="py-8 text-center text-gray-400 text-xs">Aucune commande récente</p>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Hourly */}
      <div className="mb-4">
        <ChartCard title="Activité par heure">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyActivity} margin={{ left: -22 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickFormatter={(h: number) => (h % 2 === 0 ? `${h}h` : '')}
                />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 0 }}
                  formatter={(value: number) => [value, 'commandes']}
                  labelFormatter={(h: number) => `${h}h`}
                />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {hourlyActivity.map(entry => (
                    <Cell key={entry.hour} fill={peakHours.has(entry.hour) ? '#6FAFC5' : '#d7e5ea'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-[11px] text-gray-400 text-center">
            {peakHour && peakHour.count > 0
              ? `Pic d'activité à ${peakHour.hour}h — ${peakHour.count} commande(s) sur 30 jours`
              : 'Aucune activité'}
          </p>
        </ChartCard>
      </div>

      {/* Stock + Workers */}
      <div className="grid grid-cols-1 lg:grid-cols-[9fr_7fr] gap-4 mb-4">
        <ChartCard
          title="Produits populaires du mois"
          action={
            <span className="px-2.5 py-1 bg-primary/10 text-primary text-[11px] font-bold rounded-full capitalize">{monthLabel}</span>
          }
        >
          <div className="divide-y divide-gray-50">
            {dashboard.monthlyTopProducts.map(p => (
              <div key={p._id} className="flex items-center gap-3 py-2.5">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-8 h-8 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded bg-gray-100 shrink-0 flex items-center justify-center text-[8px] text-gray-300 uppercase">—</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text truncate">{p.name}</p>
                  {p.category && <p className="text-[11px] text-gray-400 truncate">{p.category}</p>}
                </div>
                <div className="flex items-center shrink-0 divide-x divide-gray-100">
                  <div className="px-3 text-center">
                    <HiShoppingBag size={14} title="Commandes" className="mx-auto text-gray-400" />
                    <p className="text-sm font-bold text-text tabular-nums mt-0.5">{p.orders ?? 0}</p>
                  </div>
                  <div className="px-3 text-center">
                    <HiCheckBadge size={14} title="Confirmées" className="mx-auto text-blue-500" />
                    <p className="text-sm font-bold text-blue-600 tabular-nums mt-0.5">{p.confirmed ?? 0}</p>
                  </div>
                  <div className="px-3 text-center">
                    <HiCheckCircle size={14} title="Ventes" className="mx-auto text-green-500" />
                    <p className="text-sm font-bold text-green-600 tabular-nums mt-0.5">{p.soldQty ?? 0}</p>
                  </div>
                </div>
              </div>
            ))}
            {dashboard.monthlyTopProducts.length === 0 && (
              <p className="py-8 text-center text-gray-400 text-xs">Aucune vente ce mois-ci</p>
            )}
          </div>
        </ChartCard>

        <ChartCard
          title="Performance des confirmateurs"
          action={
            <Link to="/admin/workers" className="flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:underline">
              Voir tout <HiChevronRight size={12} />
            </Link>
          }
        >
          <div className="divide-y divide-gray-50">
            {workerStats.map(w => (
              <div key={w._id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    {w.image ? (
                      <img src={w.image} alt="" className="w-9 h-9 rounded-full object-cover ring-1 ring-gray-200 shrink-0" />
                    ) : (
                      <div className="w-9 h-9 shrink-0 bg-primary/10 text-primary flex items-center justify-center rounded-full text-xs font-bold">
                        {w.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text truncate">{w.name}</span>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${w.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 max-w-[180px]">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${w.rate}%`, background: rateColor(w.rate) }} />
                        </div>
                        <span className="text-[10px] font-semibold text-gray-500 tabular-nums shrink-0">{w.rate}%</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center shrink-0 ml-2 divide-x divide-gray-100">
                  <div className="px-3 text-center">
                    <HiShoppingBag size={14} title="Commandes" className="mx-auto text-gray-400" />
                    <p className="text-sm font-bold text-text tabular-nums mt-0.5">{w.assigned}</p>
                  </div>
                  <div className="px-3 text-center">
                    <HiCheckCircle size={14} title="Confirmées" className="mx-auto text-blue-500" />
                    <p className="text-sm font-bold text-blue-600 tabular-nums mt-0.5">{w.confirmed ?? 0}</p>
                  </div>
                  <div className="px-3 text-center">
                    <HiXCircle size={14} title="Annulées" className="mx-auto text-red-400" />
                    <p className="text-sm font-bold text-red-500 tabular-nums mt-0.5">{w.cancelled ?? 0}</p>
                  </div>
                </div>
              </div>
            ))}
            {workerStats.length === 0 && (
              <p className="py-8 text-center text-gray-400 text-xs">Aucun employé</p>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
