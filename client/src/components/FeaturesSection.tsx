import { HiTruck, HiShieldCheck, HiCreditCard, HiPhone } from 'react-icons/hi2'

const features = [
  { icon: HiTruck, label: 'Livraison nationale', sub: '24-48h partout en Algerie' },
  { icon: HiShieldCheck, label: 'Retours offerts', sub: '30 jours pour changer d\'avis' },
  { icon: HiCreditCard, label: 'Paiement securise', sub: 'A la livraison, sans frais' },
  { icon: HiPhone, label: 'Support client', sub: '0655 18 96 19' },
]

export default function FeaturesSection() {
  return (
    <section className="py-10 bg-accent text-background">
      <div className="max-w-screen-xl mx-auto px-8 md:px-10 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
        {features.map(({ icon: Icon, label, sub }) => (
          <div key={label} className="flex flex-col items-center text-center gap-3 md:flex-row md:text-left md:items-center md:gap-4">
            <Icon size={20} strokeWidth={1.5} className="text-background flex-none" />
            <div>
              <p className="font-sans text-[10px] tracking-[0.12em] uppercase font-medium">{label}</p>
              <p className="font-sans text-[11px] text-background/60 mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
