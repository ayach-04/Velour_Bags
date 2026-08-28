import { useState, useRef, useEffect } from 'react'
import { HiPhoto, HiXMark } from 'react-icons/hi2'

interface ImageUploadProps {
  value: string
  onChange: (value: string) => void
  label: string
  required?: boolean
}

export default function ImageUpload({ value, onChange, label, required }: ImageUploadProps) {
  const [mode, setMode] = useState<'upload' | 'url'>(value && value.startsWith('http') ? 'url' : 'upload')
  const [preview, setPreview] = useState(value)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setPreview(value)
    if (value && value.startsWith('http')) setMode('url')
    else setMode('upload')
  }, [value])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setPreview(dataUrl)
      onChange(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleUrl = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setPreview(url)
    onChange(url)
  }

  const clear = () => {
    setPreview('')
    onChange('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-text uppercase tracking-wider">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`text-xs px-2 py-1 transition-colors cursor-pointer ${mode === 'upload' ? 'text-primary font-semibold' : 'text-gray-400 hover:text-text'}`}
          >
            Fichier
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`text-xs px-2 py-1 transition-colors cursor-pointer ${mode === 'url' ? 'text-primary font-semibold' : 'text-gray-400 hover:text-text'}`}
          >
            URL
          </button>
        </div>
      </div>

      {mode === 'url' ? (
        <div className="space-y-3">
          <input
            type="url"
            value={value}
            onChange={handleUrl}
            placeholder="https://..."
            className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all"
          />
          {value && (
            <div className="w-10 h-10 bg-gray-100 shrink-0 overflow-hidden rounded-xl flex items-center justify-center ring-1 ring-gray-200/50">
              <img src={value} alt="" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          className="relative w-32 h-32 bg-gray-50 border border-gray-200 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-all group overflow-hidden rounded-xl"
        >
          {preview ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <img src={preview} alt="" className="w-full h-full object-contain p-2" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); clear() }}
                className="absolute top-1 right-1 w-5 h-5 bg-white/80 hover:bg-white text-gray-500 hover:text-red-400 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer z-10 rounded-full"
              >
                <HiXMark size={12} />
              </button>
              <span className="absolute bottom-2 text-[10px] text-white font-semibold opacity-0 group-hover:opacity-100 transition-all z-10 bg-black/40 px-2 py-0.5">
                Changer l'image
              </span>
            </div>
          ) : (
            <>
              <HiPhoto size={20} className="text-gray-300" />
              <span className="text-[10px] text-gray-400 text-center leading-tight">Cliquez pour ajouter</span>
              <span className="text-[9px] text-gray-300">PNG / JPG</span>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </div>
      )}
    </div>
  )
}
