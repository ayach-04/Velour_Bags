import { useState } from 'react'
import { HiEye, HiEyeSlash } from 'react-icons/hi2'
import { useNavigate } from 'react-router-dom'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const body = JSON.stringify({ email, password, rememberMe })

    try {
      // Try admin first, then worker (same login page for both)
      let res = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      let data = await res.json()

      if (res.ok) {
        localStorage.setItem('admin_token', data.token)
        if (!rememberMe) {
          localStorage.setItem('admin_token_exp', String(Date.now() + 8 * 60 * 60 * 1000))
        } else {
          localStorage.removeItem('admin_token_exp')
        }
        navigate('/admin/dashboard')
        return
      }

      res = await fetch(`${API_BASE}/api/workers/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      data = await res.json()

      if (res.ok) {
        localStorage.setItem('worker_token', data.token)
        if (!rememberMe) {
          localStorage.setItem('worker_token_exp', String(Date.now() + 8 * 60 * 60 * 1000))
        } else {
          localStorage.removeItem('worker_token_exp')
        }
        navigate('/employe/orders')
        return
      }

      setError(data.message || 'Erreur de connexion')
    } catch {
      setError('Impossible de contacter le serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen overflow-hidden flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-display text-black">
            Administration
          </h1>
          <p className="text-sm text-text-secondary mt-1.5">
            Connectez-vous pour accéder au tableau de bord
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-100 p-8 md:p-10 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 text-center">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-semibold text-text uppercase tracking-wider">
              Email ou nom d'utilisateur
            </label>
            <input
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@exemple.com"
              autoComplete="username"
              className="w-full h-11 px-4 bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-semibold text-text uppercase tracking-wider">
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full h-11 px-4 pr-10 bg-gray-50 border border-gray-200 text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-text transition-colors"
              >
                {showPassword ? <HiEyeSlash size={16} /> : <HiEye size={16} />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="sr-only"
            />
            <span className={`w-4 h-4 flex items-center justify-center border-2 transition-colors ${
              rememberMe ? 'bg-primary border-primary' : 'bg-white border-gray-300 group-hover:border-gray-400'
            }`}>
              {rememberMe && (
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 fill-white">
                  <path d="M2 6l2.5 2.5L10 3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className="text-sm text-text-secondary">Se souvenir de moi</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary hover:scale-105 disabled:hover:scale-100 disabled:opacity-60 text-white text-sm font-bold uppercase tracking-wider transition-transform duration-200 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          <div className="text-center pt-1 space-y-2">
            <a href="/" className="block text-xs text-text-secondary hover:text-primary transition-colors">
              &larr; Retour à la boutique
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
