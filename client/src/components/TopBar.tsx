const items = 'LIVRAISON GRATUITE DES 10000 DA  ·  NOUVELLE COLLECTION  ·  PAIEMENT A LA LIVRAISON  ·  RETOURS OFFERTS 30 JOURS  ·  MAROQUINERIE ARTISANALE  '

export default function TopBar() {
  const text = items.repeat(6)
  return (
    <div className="bg-accent text-background overflow-hidden py-3 select-none">
      <div
        className="whitespace-nowrap inline-flex font-sans text-[10px] tracking-[0.18em] uppercase"
        style={{ animation: 'velour-marquee 50s linear infinite' }}
      >
        <span>{text}</span>
        <span aria-hidden>{text}</span>
      </div>
    </div>
  )
}
