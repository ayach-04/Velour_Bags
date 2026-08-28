import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  HiChartBarSquare,
  HiSquaresPlus,
  HiShoppingBag,
  HiTag,
  HiRectangleGroup,
  HiUsers,
  HiArrowRightOnRectangle,
  HiXMark,
  HiChevronDown,
  HiClipboardDocumentList,
  HiPercentBadge,
  HiTruck,
  HiChartBar,
  HiArchiveBox,
  HiCube,
  HiCheckBadge,
  HiArrowUturnLeft,
  HiCheckCircle,
  HiUserCircle,
  HiCog6Tooth,
  HiBriefcase,
} from 'react-icons/hi2'
import logoSrc from '../../assets/logo 2.png'

interface LinkItem {
  to: string
  label: string
  icon: typeof HiChartBarSquare
}

const topLinks: LinkItem[] = [
  { to: '/admin/dashboard', label: 'Tableau de bord', icon: HiChartBarSquare },
  { to: '/admin/stats', label: 'Statistiques', icon: HiChartBar },
]

const orderLinks: LinkItem[] = [
  { to: '/admin/orders', label: 'Gestion des commandes', icon: HiShoppingBag },
  { to: '/admin/orders/confirmed', label: 'Commandes confirmées', icon: HiCheckBadge },
  { to: '/admin/orders/shipped', label: 'Expédiées', icon: HiTruck },
  { to: '/admin/orders/delivered', label: 'Livrées', icon: HiCheckCircle },
  { to: '/admin/orders/returned', label: 'Retours', icon: HiArrowUturnLeft },
  { to: '/admin/orders/archive', label: 'Archives', icon: HiArchiveBox },
]

const productLinks: LinkItem[] = [
  { to: '/admin/products', label: 'Tous les produits', icon: HiClipboardDocumentList },
  { to: '/admin/products/add', label: 'Ajouter un produit', icon: HiSquaresPlus },
  { to: '/admin/promos', label: 'Promos', icon: HiPercentBadge },
  { to: '/admin/stock', label: 'Stock', icon: HiCube },
]

const adminLinks: LinkItem[] = [
  { to: '/admin/admins/profile', label: 'Profil', icon: HiUserCircle },
  { to: '/admin/admins/settings', label: 'Paramètres', icon: HiCog6Tooth },
]

const bottomLinks: LinkItem[] = [
  { to: '/admin/categories', label: 'Catégories', icon: HiRectangleGroup },
  { to: '/admin/livraison', label: 'Livraison', icon: HiTruck },
]

function ExpandableSection({ title, icon: Icon, links, defaultOpen, onNavigate }: { title: string; icon: typeof HiShoppingBag; links: LinkItem[]; defaultOpen?: boolean; onNavigate?: () => void }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  const location = useLocation()
  const isActive = links.some(l => location.pathname === l.to || (l.to !== '/admin/orders' && location.pathname.startsWith(l.to + '/')))
  const effectiveOpen = open || isActive

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between w-full px-3 py-3 lg:py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
          isActive && effectiveOpen
            ? 'bg-accent text-white'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon size={18} />
          {title}
        </div>
        <HiChevronDown
          size={14}
          className={`transition-transform duration-200 ${effectiveOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <div className={`overflow-hidden transition-all duration-200 ${effectiveOpen ? 'max-h-60' : 'max-h-0'}`}>
        <div className="pl-3 space-y-0.5 pt-0.5">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end
              onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-accent text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
              }
            >
              <link.icon size={15} />
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_token_exp')
    navigate('/admin')
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-center px-6 h-20 border-b border-white/10">
        <img src={logoSrc} alt="Logo" className="h-10 w-auto brightness-0 invert" />
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto sidebar-scroll">
        {topLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-accent text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <link.icon size={18} />
            {link.label}
          </NavLink>
        ))}

        <ExpandableSection title="Commandes" icon={HiShoppingBag} links={orderLinks} onNavigate={() => setSidebarOpen(false)} />
        <ExpandableSection title="Produits" icon={HiSquaresPlus} links={productLinks} onNavigate={() => setSidebarOpen(false)} />

        {bottomLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-accent text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <link.icon size={18} />
            {link.label}
          </NavLink>
        ))}

        <NavLink
          key="/admin/workers"
          to="/admin/workers"
          onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-accent text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
          <HiBriefcase size={18} />
          Employés
        </NavLink>

        <ExpandableSection title="Administrateur" icon={HiUsers} links={adminLinks} onNavigate={() => setSidebarOpen(false)} />
      </nav>

      <div className="px-3 pb-4 border-t border-white/10 pt-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all w-full cursor-pointer"
        >
          <HiArrowRightOnRectangle size={18} />
          Déconnexion
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh lg:flex bg-gray-50">
      <aside className="hidden lg:flex lg:flex-col w-64 bg-black flex-shrink-0 lg:self-start lg:sticky lg:top-0 lg:h-dvh">
        {sidebar}
      </aside>

      <button
        onClick={() => setSidebarOpen(true)}
        aria-label="Ouvrir le menu de navigation"
        className="lg:hidden fixed top-[18px] left-3 z-40 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-background shadow-lg transition-all duration-300 hover:bg-accent/90 active:scale-95 cursor-pointer"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <line x1="2" y1="4.5" x2="16" y2="4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <line x1="2" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <line x1="2" y1="13.5" x2="11.5" y2="13.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </button>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 h-full bg-black">
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Fermer le menu"
              className="absolute top-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-background shadow-lg transition-all duration-300 hover:bg-accent/90 active:scale-95 cursor-pointer"
            >
              <HiXMark size={20} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <main className="px-4 md:px-6 lg:px-8 pb-4 md:pb-6 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  )
}
