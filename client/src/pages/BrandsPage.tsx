import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchBrands } from '../api/brands'
import BrandLogo from '../components/BrandLogo'
import TopBar from '../components/TopBar'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function BrandsPage() {
  const [brands, setBrands] = useState<any[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    fetchBrands().then(setBrands).catch(() => setBrands([]))
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Navbar />

      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-[1400px] w-full mx-auto px-4 pt-6 pb-16">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <Link to="/" className="hover:text-primary transition-colors">Accueil</Link>
            <span>/</span>
            <span className="text-text">Nos Marques</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {brands.map(brand => (
              <div
                key={brand._id}
                className="cursor-pointer flex items-center justify-center h-24 md:h-28 lg:h-32 p-4 md:p-6 border border-gray-100 hover:border-primary/30 hover:shadow-sm transition-all"
                onClick={() => navigate(`/search?brand=${encodeURIComponent(brand.name)}`)}
              >
                <BrandLogo src={brand.logo || ''} name={brand.name} className="max-h-full max-w-full object-contain" textClassName="text-base font-bold" />
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
