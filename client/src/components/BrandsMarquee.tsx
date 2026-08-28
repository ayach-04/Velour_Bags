import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchBrands } from '../api/brands'
import BrandLogo from './BrandLogo'

interface BrandItem {
  _id?: string
  name: string
  logo?: string
}

export default function BrandsMarquee() {
  const [displayed, setDisplayed] = useState<BrandItem[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    fetchBrands().then(all => {
      const withLogo = all.filter(b => b.logo).slice(0, 15)
      setDisplayed(withLogo.length > 0 ? withLogo : all.slice(0, 15))
    }).catch(() => setDisplayed([]))
  }, [])

  if (displayed.length === 0) return null

  return (
    <section className="max-w-[1400px] w-full mx-auto px-4 py-10 md:py-14">
      <div className="flex items-center justify-center gap-2 mb-8 md:mb-10">
        <span className="text-[11px] font-semibold text-primary uppercase tracking-widest">
          Nos Marques
        </span>
        <button onClick={() => navigate('/marques')} className="text-primary hover:scale-105 transition-transform cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      <div className="overflow-hidden">
        <div className="flex gap-8 md:gap-12 items-center w-max animate-scroll">
          {[...displayed, ...displayed].map((brand, i) => (
            <div
              key={`${brand._id}-${i}`}
              className="flex-shrink-0 w-[90px] md:w-[110px] lg:w-[130px] h-9 md:h-10 lg:h-11 overflow-hidden p-1 cursor-pointer hover:opacity-70 transition-opacity"
              onClick={() => navigate(`/search?brand=${encodeURIComponent(brand.name)}`)}
            >
              <BrandLogo src={brand.logo} name={brand.name} className="w-full h-full object-cover object-center" />
            </div>
          ))}
        </div>
      </div>

    </section>
  )
}
