import { useState, useRef } from 'react'
import { HiPhoto, HiXMark } from 'react-icons/hi2'

interface GalerieImagesProps {
  images: string[]
  onAddImages: (images: string[]) => void
  onRemoveImage: (index: number) => void
}

export default function GalerieImages({ images, onAddImages, onRemoveImage }: GalerieImagesProps) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload')
  const [url, setUrl] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return

    const readers: Promise<string>[] = []
    for (let i = 0; i < fileList.length; i++) {
      readers.push(new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(fileList[i])
      }))
    }

    Promise.all(readers).then((dataUrls) => {
      onAddImages(dataUrls)
    })

    if (fileRef.current) fileRef.current.value = ''
  }

  const addUrl = () => {
    if (url.trim()) {
      onAddImages([url.trim()])
      setUrl('')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-text uppercase tracking-wider">
          Images supplémentaires <span className="text-[10px] text-gray-400 font-normal normal-case">(peut choisir plusieurs)</span>
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => { setMode('upload'); setUrl('') }}
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

      <div className="flex flex-wrap gap-3">
        {images.map((img, i) => (
          <div key={i} className="relative w-32 h-32 bg-gray-50 border border-gray-200 overflow-hidden group rounded-xl">
            <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <button
              type="button"
              onClick={() => onRemoveImage(i)}
              className="absolute top-1 right-1 w-5 h-5 bg-white/80 hover:bg-white text-gray-500 hover:text-red-400 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 cursor-pointer rounded-full"
            >
              <HiXMark size={12} />
            </button>
          </div>
        ))}

        {mode === 'upload' && (
          <div
            onClick={() => fileRef.current?.click()}
            className="w-32 h-32 bg-gray-50 border border-gray-200 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-all rounded-xl overflow-hidden"
          >
            <HiPhoto size={20} className="text-gray-300" />
            <span className="text-[10px] text-gray-400 text-center px-1 leading-tight">
              {images.length > 0 ? "Ajouter d'autres" : 'Cliquez pour ajouter'}
            </span>
            <span className="text-[9px] text-gray-300">PNG / JPG</span>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
          </div>
        )}
      </div>

      {mode === 'url' && (
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="flex-1 h-11 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-text placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl() } }}
          />
          <button
            type="button"
            onClick={addUrl}
            disabled={!url.trim()}
            className="h-11 px-5 bg-primary hover:scale-105 disabled:hover:scale-100 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider transition-transform cursor-pointer rounded-lg"
          >
            Ajouter
          </button>
        </div>
      )}
    </div>
  )
}
