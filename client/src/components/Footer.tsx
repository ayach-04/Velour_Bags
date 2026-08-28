import { FaInstagram, FaTiktok } from 'react-icons/fa'

interface FooterProps {
  onNavigate?: (path: string) => void
}

const footerCols = [
  {
    title: 'Boutique',
    links: ['Nouveautes', 'Meilleures ventes', 'Sacs', 'Accessoires', 'Promotions'],
  },
  {
    title: 'Aide',
    links: ['FAQ', 'Livraison', 'Retours', 'Contactez-nous'],
  },
  {
    title: 'Maison',
    links: ['Notre histoire', 'Savoir-faire', 'Mentions legales', 'CGV', 'Confidentialite'],
  },
]

export default function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="bg-foreground text-background">
      <div className="max-w-screen-xl mx-auto px-8 md:px-10 pt-16 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="font-display text-3xl mb-5 tracking-wide block">
              Velour
            </a>
            <p className="font-sans text-xs text-background/40 leading-relaxed font-light max-w-[14rem]">
              Maroquinerie artisanale. Chaque piece, une intention durable.
            </p>
            <div className="flex items-center gap-4 mt-8">
              <a href="#" className="font-sans text-[9px] tracking-[0.2em] text-background/30 hover:text-background/70 transition-colors flex items-center gap-1.5">
                <FaInstagram size={12} /> IG
              </a>
              <a href="#" className="font-sans text-[9px] tracking-[0.2em] text-background/30 hover:text-background/70 transition-colors flex items-center gap-1.5">
                <FaTiktok size={12} /> TK
              </a>
            </div>
          </div>
          {footerCols.map(col => (
            <div key={col.title}>
              <p className="font-sans text-[9px] tracking-[0.22em] uppercase text-background/30 mb-6">{col.title}</p>
              <ul className="flex flex-col gap-3.5">
                {col.links.map(l => (
                  <li key={l}>
                    <a href="#" className="font-sans text-xs text-background/60 hover:text-background transition-colors tracking-wide">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-background/[0.08] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-sans text-[10px] text-background/25 tracking-wide">&copy; 2026 Velour. Tous droits reserves.</p>
          <div className="flex gap-6">
            {['Mentions legales', 'CGV', 'Confidentialite'].map(l => (
              <a key={l} href="#" className="font-sans text-[10px] text-background/25 hover:text-background/50 tracking-wide transition-colors">
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
