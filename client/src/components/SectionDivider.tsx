export default function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-5 px-8 md:px-10 py-8 max-w-screen-xl mx-auto">
      <div className="flex-1 h-px bg-current" />
      <p className="font-sans text-[10px] tracking-[0.25em] uppercase whitespace-nowrap">
        ↓ {label} ↓
      </p>
      <div className="flex-1 h-px bg-current" />
    </div>
  )
}
