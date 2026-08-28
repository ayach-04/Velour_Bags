const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '')

function getToken(): string {
  return localStorage.getItem('admin_token') || ''
}

export async function uploadToCloudinary(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith('data:')) return dataUrl
  const res = await fetch(`${API_BASE}/api/upload/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ image: dataUrl }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Upload failed')
  return json.url
}
