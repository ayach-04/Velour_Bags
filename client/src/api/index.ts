const BASE = import.meta.env.VITE_API_URL || ''

export async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    const e = new Error(err.error || err.message || 'Request failed') as any
    e.body = err
    throw e
  }
  return res.json()
}

export async function authApi<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers, Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_token_exp')
    window.location.href = '/admin'
    throw new Error('Session expirée')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    const e = new Error(err.error || err.message || 'Request failed') as any
    e.body = err
    throw e
  }
  return res.json()
}

export async function workerApi<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = localStorage.getItem('worker_token')
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers, Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) {
    localStorage.removeItem('worker_token')
    localStorage.removeItem('worker_token_exp')
    window.location.href = '/admin'
    throw new Error('Session expirée')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    const e = new Error(err.error || err.message || 'Request failed') as any
    e.body = err
    throw e
  }
  return res.json()
}
