export default function AboutSection() {
  return (
    <section className="py-20 md:py-28 px-4">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold text-primary tracking-[0.3em] uppercase mb-4">
            A propos
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-text leading-[1.15] mb-6">
            Le savoir-faire Velour
          </h2>
          <div className="w-10 h-[1px] bg-primary mb-6" />
          <p className="text-sm md:text-base text-text-secondary leading-relaxed mb-4">
            Nee de la passion pour l'artisanat francais et le cuir de qualite superieure,
            Velour propose des sacs alliant design intemporel et fonctionnalite.
          </p>
          <p className="text-sm md:text-base text-text-secondary leading-relaxed mb-8">
            Chaque piece est concue pour accompagner votre quotidien avec elegance,
            reflet d'un engagement envers la qualite et l'authenticite.
          </p>
          <div>
            <a
              href="/search"
              className="inline-block px-8 py-3.5 bg-primary text-white text-[11px] font-semibold tracking-[0.2em] uppercase hover:bg-primary-light transition-colors"
            >
              Voir la collection
            </a>
          </div>
        </div>
        <div className="relative aspect-[4/5] bg-cream-dark overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-[120px] md:text-[180px] text-primary/5 leading-none select-none">
              V
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
