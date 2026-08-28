import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useLayoutEffect, lazy, Suspense } from 'react'

const Home = lazy(() => import('./pages/Home'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const PaymentPage = lazy(() => import('./pages/PaymentPage'))
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'))
const AdminProductAdd = lazy(() => import('./pages/admin/AdminProductAdd'))
const AdminPromos = lazy(() => import('./pages/admin/AdminPromos'))
const AdminBrands = lazy(() => import('./pages/admin/AdminBrands'))
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'))
const AdminLivraison = lazy(() => import('./pages/admin/AdminLivraison'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'))
const AdminOrderStats = lazy(() => import('./pages/admin/AdminOrderStats'))
const AdminOrderArchive = lazy(() => import('./pages/admin/AdminOrderArchive'))
const AdminOrdersConfirmed = lazy(() => import('./pages/admin/AdminOrdersConfirmed'))
const AdminOrdersReturned = lazy(() => import('./pages/admin/AdminOrdersReturned'))
const AdminOrdersShipped = lazy(() => import('./pages/admin/AdminOrdersShipped'))
const AdminOrdersDelivered = lazy(() => import('./pages/admin/AdminOrdersDelivered'))
const AdminStock = lazy(() => import('./pages/admin/AdminStock'))
const AdminProfile = lazy(() => import('./pages/admin/AdminProfile'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))
const AdminWorkers = lazy(() => import('./pages/admin/AdminWorkers'))
const WorkerOrders = lazy(() => import('./pages/worker/WorkerOrders'))
const WorkerPerformance = lazy(() => import('./pages/worker/WorkerPerformance'))
const WorkerProfile = lazy(() => import('./pages/worker/WorkerProfile'))
const WorkerSettings = lazy(() => import('./pages/worker/WorkerSettings'))
const AdminLayout = lazy(() => import('./admin/layouts/AdminLayout'))
const WorkerLayout = lazy(() => import('./admin/layouts/WorkerLayout'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useLayoutEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('admin_token')
  if (!token) return <Navigate to="/admin" replace />
  const exp = localStorage.getItem('admin_token_exp')
  if (exp && Date.now() > Number(exp)) {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_token_exp')
    return <Navigate to="/admin" replace />
  }
  return <AdminLayout>{children}</AdminLayout>
}

function PrivateWorkerRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('worker_token')
  if (!token) return <Navigate to="/admin" replace />
  const exp = localStorage.getItem('worker_token_exp')
  if (exp && Date.now() > Number(exp)) {
    localStorage.removeItem('worker_token')
    localStorage.removeItem('worker_token_exp')
    return <Navigate to="/admin" replace />
  }
  return <WorkerLayout>{children}</WorkerLayout>
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={null}>
      <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/paiement" element={<PaymentPage />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route
        path="/admin/dashboard"
        element={
          <PrivateRoute>
            <AdminDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <PrivateRoute>
            <AdminProducts />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/products/add"
        element={
          <PrivateRoute>
            <AdminProductAdd />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/products/edit/:id"
        element={
          <PrivateRoute>
            <AdminProductAdd />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/promos"
        element={
          <PrivateRoute>
            <AdminPromos />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/brands"
        element={
          <PrivateRoute>
            <AdminBrands />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/categories"
        element={
          <PrivateRoute>
            <AdminCategories />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/livraison"
        element={
          <PrivateRoute>
            <AdminLivraison />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <PrivateRoute>
            <AdminOrders />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/stats"
        element={
          <PrivateRoute>
            <AdminOrderStats />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/orders/archive"
        element={
          <PrivateRoute>
            <AdminOrderArchive />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/orders/confirmed"
        element={
          <PrivateRoute>
            <AdminOrdersConfirmed />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/orders/returned"
        element={
          <PrivateRoute>
            <AdminOrdersReturned />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/orders/shipped"
        element={
          <PrivateRoute>
            <AdminOrdersShipped />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/orders/delivered"
        element={
          <PrivateRoute>
            <AdminOrdersDelivered />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/stock"
        element={
          <PrivateRoute>
            <AdminStock />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/admins/profile"
        element={
          <PrivateRoute>
            <AdminProfile />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/admins/settings"
        element={
          <PrivateRoute>
            <AdminSettings />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/workers"
        element={
          <PrivateRoute>
            <AdminWorkers />
          </PrivateRoute>
        }
      />
      <Route
        path="/employe/orders"
        element={
          <PrivateWorkerRoute>
            <WorkerOrders />
          </PrivateWorkerRoute>
        }
      />
      <Route
        path="/employe/performance"
        element={
          <PrivateWorkerRoute>
            <WorkerPerformance />
          </PrivateWorkerRoute>
        }
      />
      <Route
        path="/employe/profile"
        element={
          <PrivateWorkerRoute>
            <WorkerProfile />
          </PrivateWorkerRoute>
        }
      />
      <Route
        path="/employe/settings"
        element={
          <PrivateWorkerRoute>
            <WorkerSettings />
          </PrivateWorkerRoute>
        }
      />
      </Routes>
      </Suspense>
    </>
  )
}
