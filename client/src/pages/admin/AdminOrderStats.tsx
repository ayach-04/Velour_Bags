import { useState, useEffect } from 'react'
import { HiArrowPath, HiShoppingBag, HiCurrencyDollar, HiChartBar, HiTruck, HiCalendar, HiPaperAirplane, HiArrowUturnLeft, HiXCircle } from 'react-icons/hi2'
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend, Label } from 'recharts'
import { fetchOrderStats, type OrderStats } from '../../api/orders'

const PERIODS = [
  { label: "Aujourd'hui", value: 1 },
  { label: '7 jours', value: 7 },
  { label: '30 jours', value: 30 },
  { label: '3 mois', value: 90 },
  { label: '6 mois', value: 180 },
  { label: '1 an', value: 365 },
  { label: 'Tout', value: 0 },
]

const STATUS_COLORS: Record<string, string> = {
  not_confirmed: '#eab308',
  confirmed: '#3b82f6',
  shipped: '#a855f7',
  delivered: '#22c55e',
  cancelled: '#ef4444',
  archived: '#6b7280',
}

const STATUS_LABELS: Record<string, string> = {
  not_confirmed: 'Non confirmée',
  confirmed: 'Confirmée',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  archived: 'Archivée',
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', onChange)
    setMatches(mql.matches)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('fr-DZ').format(Math.round(n))
}

function formatAvg(n: number) {
  return new Intl.NumberFormat('fr-DZ').format(Math.ceil(n))
}

function formatDA(n: number) {
  return new Intl.NumberFormat('fr-DZ').format(Math.round(n)) + ' DA'
}

function StatCard({ icon: Icon, label, value, sub, color, className = '' }: { icon: typeof HiShoppingBag; label: string; value: string; sub?: string; color: string; className?: string }) {
  return (
    <div className={`bg-white border border-gray-100 shadow-sm p-3 sm:p-4 flex items-center gap-3 rounded-2xl ${className}`}>
      <div className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-2xl ${color}`}>
        <Icon size={17} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider truncate">{label}</p>
        <p className="text-base sm:text-lg font-bold text-text mt-0.5 leading-snug tabular-nums truncate">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  )
}

function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-100 shadow-sm p-4 sm:p-5 rounded-2xl ${className}`}>
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary/50 shrink-0" />
        {title}
      </h3>
      {children}
    </div>
  )
}

const tooltipStyle = { fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }

export default function AdminOrderStats() {
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(30)

  const isDesktop = useMediaQuery('(min-width: 1024px)')

  useEffect(() => {
    load()
  }, [period])

  async function load() {
    setLoading(true)
    try {
      const data = await fetchOrderStats(period || undefined)
      setStats(data)
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

  if (!stats) return null

  const { summary, statusBreakdown, ordersOverTime, revenueOverTime, topWilayas, deliverySplit, topProducts } = stats
  const deliveryRate = summary.totalOrders > 0 ? Math.round((summary.deliveredCount / summary.totalOrders) * 100) : 0

  const chartData = ordersOverTime.map(d => ({
    date: d._id.slice(5),
    commandes: d.count,
    revenus: d.revenue,
  }))

  function periodLabel() {
    if (period === 0) return 'toute la période'
    if (period === 1) return "aujourd'hui"
    if (period === 365) return '1 an'
    if (period === 90) return '3 mois'
    if (period === 180) return '6 mois'
    return `${period} derniers jours`
  }

  function bucketLabel(id: string) {
    if (period === 0 || period >= 150) {
      const [y, m] = id.split('-')
      return `${m}/${y}`
    }
    if (period > 60) return 'S' + id.slice(-2)
    return `${id.slice(8)}/${id.slice(5, 7)}`
  }

  const revenueData = revenueOverTime.map(d => ({
    label: bucketLabel(d._id),
    net: d.net,
    fees: d.fees,
    general: d.net + d.fees,
  }))
  const netTotal = revenueData.reduce((s, d) => s + d.net, 0)
  const feesTotal = revenueData.reduce((s, d) => s + d.fees, 0)

  const mobileRevenueData = revenueData.length <= 7
    ? revenueData
    : (() => {
        const size = Math.ceil(revenueData.length / 7)
        const buckets: { label: string; general: number; net: number; fees: number }[] = []
        for (let i = 0; i < revenueData.length; i += size) {
          const slice = revenueData.slice(i, i + size)
          buckets.push({
            label: slice.length > 1 ? `${slice[0].label}-${slice[slice.length - 1].label}` : slice[0].label,
            general: slice.reduce((s, d) => s + d.general, 0),
            net: slice.reduce((s, d) => s + d.net, 0),
            fees: slice.reduce((s, d) => s + d.fees, 0),
          })
        }
        return buckets
      })()

  const statusData = statusBreakdown.map(d => ({
    name: STATUS_LABELS[d._id] || d._id,
    value: d.count,
    color: STATUS_COLORS[d._id] || '#6b7280',
  }))
  const totalStatus = statusData.reduce((s, d) => s + d.value, 0)

  const deliveredData = [...topWilayas]
    .sort((a, b) => b.delivered - a.delivered)
    .slice(0, 10)
    .map(d => ({ wilaya: d._id, value: d.delivered }))

  const returnedData = [...topWilayas]
    .sort((a, b) => b.returned - a.returned)
    .slice(0, 10)
    .map(d => ({ wilaya: d._id, value: d.returned }))

  const maxDelivered = deliveredData.length ? deliveredData[0].value : 0
  const maxReturned = returnedData.length ? returnedData[0].value : 0

  const deliveryData = deliverySplit.map(d => ({
    name: d._id === 'home' ? 'À domicile' : d._id === 'stopdesk' ? 'Stop desk' : 'Non défini',
    value: d.count,
    revenus: d.revenue,
  }))

  const PIE_COLORS = ['#6FAFC5', '#3b82f6', '#a855f7', '#22c55e']

  return (
    <div>
      <div className="sticky top-0 z-30 -mx-4 md:-mx-6 lg:-mx-8 pl-16 pr-4 md:pl-16 md:pr-6 lg:px-8 bg-foreground md:bg-white/90 md:backdrop-blur-xl border-b border-border md:border-gray-200 shadow-sm mb-6">
        <div className="flex items-center h-20">
          <div>
            <h1 className="text-xl font-bold text-white md:text-text tracking-tight">Statistiques</h1>
            <p className="text-[13px] text-gray-300 md:text-gray-400 mt-1">Vue d'ensemble des commandes</p>
          </div>
          <button onClick={load} className="ml-auto p-2 rounded-full text-white md:text-gray-400 bg-white/10 md:bg-transparent border border-white/15 md:border-transparent backdrop-blur-md md:backdrop-blur-none hover:text-primary hover:bg-primary/10 transition-all duration-300 cursor-pointer" title="Actualiser">
            <HiArrowPath size={18} />
          </button>
        </div>
      </div>

      {/* Period chips */}
      <div className="-mx-2 md:-mx-4 lg:-mx-6 px-2 md:px-4 lg:px-6 mb-5">
        <div className="flex flex-wrap gap-2">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 h-9 text-xs font-semibold rounded-full border transition-all duration-200 cursor-pointer whitespace-nowrap ${
                period === p.value
                  ? 'bg-foreground text-background border-foreground shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:text-text hover:border-gray-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile hero summary */}
      <div className="lg:hidden mb-4 relative overflow-hidden rounded-2xl bg-foreground p-5">
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50">Chiffre d'affaires · {periodLabel()}</p>
          <p className="text-[28px] leading-tight font-bold text-white mt-1.5 tabular-nums">{formatDA(summary.totalRevenue)}</p>
          <div className="flex items-center gap-3 mt-4 text-[12px] text-white/70">
            <span className="inline-flex items-center gap-1.5"><HiShoppingBag size={13} className="text-primary-light" /> {formatNumber(summary.totalOrders)} commandes</span>
            <span className="w-1 h-1 rounded-full bg-white/25" />
            <span className="inline-flex items-center gap-1.5"><HiTruck size={13} className="text-primary-light" /> {formatNumber(summary.deliveredCount)} livrées</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <StatCard icon={HiShoppingBag} label="Total commandes" value={formatNumber(summary.totalOrders)} color="bg-primary/10 text-primary" className="hidden lg:flex" />
        <StatCard icon={HiCurrencyDollar} label="Chiffre d'affaires" value={formatDA(summary.totalRevenue)} color="bg-green-50 text-green-600" className="hidden lg:flex" />
        <StatCard icon={HiChartBar} label="Panier moyen" value={formatDA(summary.avgOrderValue)} color="bg-blue-50 text-blue-600" />
        <StatCard icon={HiTruck} label="Taux de livraison" value={`${deliveryRate}%`} sub={`${summary.deliveredCount} livrée(s)`} color="bg-purple-50 text-purple-600" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={HiCalendar} label="Moyenne commandes / jour" value={formatAvg(summary.avgOrdersPerDay)} color="bg-cyan-50 text-cyan-600" />
        <StatCard icon={HiPaperAirplane} label="Taux d'expédition" value={`${summary.shippingRate}%`} sub={`${summary.shippedCount} expédiée(s)`} color="bg-indigo-50 text-indigo-600" />
        <StatCard icon={HiArrowUturnLeft} label="Taux de retour" value={`${summary.returnRate}%`} sub={`${summary.returnedCount} retour(s)`} color="bg-orange-50 text-orange-600" />
        <StatCard icon={HiXCircle} label="Taux d'annulation" value={`${summary.cancellationRate}%`} sub={`${summary.cancelledCount} annulée(s)`} color="bg-red-50 text-red-600" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <ChartCard title={`Commandes (${periodLabel()})`} className="lg:col-span-2">
          {!isDesktop && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6FAFC5" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6FAFC5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval={Math.max(1, Math.ceil(chartData.length / 5))} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [value, name === 'commandes' ? 'Commandes' : 'Revenus']} />
                <Area type="monotone" dataKey="commandes" stroke="#6FAFC5" strokeWidth={2} fill="url(#fillOrders)" />
              </AreaChart>
            </ResponsiveContainer>
            </div>
          )}
          {isDesktop && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} interval={Math.max(1, Math.ceil(chartData.length / 6))} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [value, name === 'commandes' ? 'Commandes' : 'Revenus']} />
                  <Line type="monotone" dataKey="commandes" stroke="#6FAFC5" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Répartition par statut">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                  <Label
                    position="center"
                    content={({ viewBox }) => {
                      const { cx, cy } = viewBox as { cx: number; cy: number }
                      return (
                        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                          <tspan x={cx} dy="-8" fontSize={22} fontWeight={700} fill="#2C3E50">{formatNumber(totalStatus)}</tspan>
                          <tspan x={cx} dy={16} fontSize={10} fill="#9ca3af" fontWeight={500}>commandes</tspan>
                        </text>
                      )
                    }}
                  />
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  iconType="square"
                  iconSize={8}
                  formatter={(value) => <span className="text-[11px] text-gray-500">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <ChartCard title={`Revenus (${periodLabel()})`} className="lg:col-span-2">
          {!isDesktop && (
          <div>
            <div className="mb-4 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 text-gray-500"><span className="w-2 h-2 rounded-full bg-primary" /> Marge brute</span>
                <span className="font-semibold text-text tabular-nums">{formatDA(netTotal + feesTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 text-gray-500"><span className="w-2 h-2 rounded-full bg-green-500" /> Revenu net</span>
                <span className="font-semibold text-text tabular-nums">{formatDA(netTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 text-gray-500"><span className="w-2 h-2 rounded-full bg-red-400" /> Frais de retour</span>
                <span className="font-semibold text-text tabular-nums">{formatDA(feesTotal)}</span>
              </div>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mobileRevenueData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="24%">
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval={Math.max(0, Math.ceil(mobileRevenueData.length / 4) - 1)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [formatDA(value), name]} />
                  <Bar dataKey="general" name="Marge brute" fill="#6FAFC5" radius={[2, 2, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="net" name="Revenu net" fill="#22c55e" radius={[2, 2, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="fees" name="Frais de retour" fill="#f87171" radius={[2, 2, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          )}
          {isDesktop && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [formatDA(value), name]} />
                <Legend iconType="square" iconSize={8} formatter={(value) => <span className="text-[11px] text-gray-500">{value}</span>} />
                <Bar dataKey="general" name="Marge brute" fill="#6FAFC5" radius={[2, 2, 0, 0]} />
                <Bar dataKey="net" name="Revenu net" fill="#22c55e" radius={[2, 2, 0, 0]} />
                <Bar dataKey="fees" name="Frais de retour" fill="#f87171" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          )}
        </ChartCard>

        <ChartCard title="Méthode de livraison">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deliveryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {deliveryData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  iconType="square"
                  iconSize={8}
                  formatter={(value) => <span className="text-[11px] text-gray-500">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Top 10 wilayas - Livraisons">
          {!isDesktop && (
          <div>
            {deliveredData.length === 0 && <p className="py-8 text-center text-gray-400 text-xs">Aucune donnée</p>}
            <div className="space-y-3">
              {deliveredData.map((d, i) => (
                <div key={d.wilaya} className="flex items-center gap-3">
                  <span className="w-5 text-[11px] font-bold text-gray-300 tabular-nums shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-medium text-text truncate">{d.wilaya}</span>
                      <span className="text-xs font-semibold text-text tabular-nums shrink-0">{d.value}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${maxDelivered ? (d.value / maxDelivered) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
          {isDesktop && (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deliveredData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                <YAxis type="category" dataKey="wilaya" tick={{ fontSize: 11, fill: '#9ca3af' }} width={80} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [value, name]} />
                <Bar dataKey="value" name="Livrées" fill="#6FAFC5" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          )}
        </ChartCard>

        <ChartCard title="Top 10 wilayas - Retours">
          {!isDesktop && (
          <div>
            {returnedData.length === 0 && <p className="py-8 text-center text-gray-400 text-xs">Aucune donnée</p>}
            <div className="space-y-3">
              {returnedData.map((d, i) => (
                <div key={d.wilaya} className="flex items-center gap-3">
                  <span className="w-5 text-[11px] font-bold text-gray-300 tabular-nums shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-medium text-text truncate">{d.wilaya}</span>
                      <span className="text-xs font-semibold text-text tabular-nums shrink-0">{d.value}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#f87171]" style={{ width: `${maxReturned ? (d.value / maxReturned) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
          {isDesktop && (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={returnedData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                <YAxis type="category" dataKey="wilaya" tick={{ fontSize: 11, fill: '#9ca3af' }} width={80} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [value, name]} />
                <Bar dataKey="value" name="Retours" fill="#f87171" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Top produits vendus" className="lg:col-span-2">
          <div className="divide-y divide-gray-50 lg:hidden">
            {topProducts.map((p, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                {p.image ? (
                  <img src={p.image} alt={p._id} className="w-10 h-10 rounded-2xl object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-gray-100 shrink-0 flex items-center justify-center text-[9px] text-gray-300 uppercase">—</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{p._id}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{p.orders} commande(s) · {p.totalQty} qté</p>
                </div>
                <p className="text-sm font-semibold text-text tabular-nums shrink-0">{formatDA(p.revenue)}</p>
              </div>
            ))}
            {topProducts.length === 0 && <p className="py-8 text-center text-gray-400 text-xs">Aucune donnée</p>}
          </div>
          <div className="hidden lg:block overflow-y-auto max-h-72">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Produit</th>
                  <th className="text-right py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Commandes</th>
                  <th className="text-right py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Qté</th>
                  <th className="text-right py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Revenus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topProducts.map((p, i) => (
                  <tr key={i}>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        {p.image ? (
                          <img src={p.image} alt={p._id} className="w-8 h-8 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-gray-100 shrink-0 flex items-center justify-center text-[8px] text-gray-300 uppercase">—</div>
                        )}
                        <span className="text-text font-medium">{p._id}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right text-gray-500 tabular-nums">{p.orders}</td>
                    <td className="py-2.5 text-right text-gray-500 tabular-nums">{p.totalQty}</td>
                    <td className="py-2.5 text-right text-gray-500 tabular-nums">{formatDA(p.revenue)}</td>
                  </tr>
                ))}
                {topProducts.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-gray-400 text-xs">Aucune donnée</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
