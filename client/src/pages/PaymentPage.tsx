import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { HiShoppingBag, HiMinus, HiPlus, HiTrash, HiCheckCircle, HiTruck, HiShieldCheck, HiCreditCard } from 'react-icons/hi2'
import { useCart } from '../context/CartContext'
import { api } from '../api'
import { createOrder, type CreateOrderInput } from '../api/orders'
import Select from '../components/Select'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

interface PriceEntry {
  wilaya: { code: string; name: string }
  homeDelivery: number | null
  stopDesk: number | null
}

interface DeliveryCompany {
  _id: string
  name: string
  logo?: string
  location: string
  abbreviation?: string
  isActive: boolean
  prices: PriceEntry[]
}

interface Wilaya {
  code: string
  name: string
  communes: string[]
}

interface ShippingOption {
  companyId: string
  companyName: string
  abbreviation: string
  method: 'stopdesk' | 'home'
  label: string
  price: number
}

function fmtMoney(n: number) {
  return `${Math.round(n).toLocaleString('fr-FR')} DA`
}

export default function PaymentPage() {
  const navigate = useNavigate()
  const { items, total, removeItem, updateQuantity, clearCart } = useCart()
  const freeShipping = total >= 10000

  const [wilayas, setWilayas] = useState<Wilaya[]>([])
  const [communes, setCommunes] = useState<string[]>([])
  const [deliveryCompanies, setDeliveryCompanies] = useState<DeliveryCompany[]>([])

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    wilaya: '',
    commune: '',
    address: '',
    phone: '',
    orderNote: '',
  })
  const [selectedShipping, setSelectedShipping] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    api<Wilaya[]>('/api/wilayas').then(setWilayas).catch(console.error)
    api<DeliveryCompany[]>('/api/delivery').then(setDeliveryCompanies).catch(console.error)
  }, [])

  function getWilayaCode(wilayaValue: string): string | null {
    const parts = wilayaValue.split(' - ')
    return parts.length === 2 ? parts[0] : null
  }

  const code = form.wilaya ? getWilayaCode(form.wilaya) : null

  const shippingOptions: ShippingOption[] = []
  if (code) {
    for (const company of deliveryCompanies) {
      if (!company.isActive) continue
      const entry = company.prices.find(p => p.wilaya.code === code)
      if (!entry) continue
      const abbr = company.abbreviation || company.name
      if (entry.homeDelivery !== null) {
        shippingOptions.push({
          companyId: company._id,
          companyName: company.name,
          abbreviation: abbr,
          method: 'home',
          label: `Livraison a domicile ${abbr}`,
          price: entry.homeDelivery,
        })
      }
      if (entry.stopDesk !== null) {
        shippingOptions.push({
          companyId: company._id,
          companyName: company.name,
          abbreviation: abbr,
          method: 'stopdesk',
          label: `Livraison au bureau ${abbr}`,
          price: entry.stopDesk,
        })
      }
    }
  }

  function getShippingKey(opt: ShippingOption) {
    return `${opt.companyId}_${opt.method}`
  }

  const selectedOpt = shippingOptions.find(opt => getShippingKey(opt) === selectedShipping) || null

  const shipping = freeShipping ? 0 : (selectedOpt ? selectedOpt.price : 0)

  const grandTotal = total + shipping

  const canOrder = items.length > 0 && form.firstName.trim() && form.phone.trim() && !saving

  function validate() {
    const errs: Record<string, string> = {}
    if (!form.firstName.trim()) errs.firstName = 'Le prenom est obligatoire'
    if (!form.phone.trim()) errs.phone = 'Le telephone est obligatoire'
    else if (form.phone.replace(/\D/g, '').length < 10) errs.phone = 'Le numero doit contenir au moins 10 chiffres'
    if (!form.wilaya) errs.wilaya = 'Selectionnez votre wilaya'
    if (form.wilaya && !form.commune) errs.commune = 'La commune est obligatoire'
    if (!form.address.trim()) errs.address = "L'adresse est obligatoire"
    if (form.wilaya && !freeShipping && !selectedShipping) errs.shipping = 'Selectionnez un mode de livraison'
    setErrors(errs)
    const firstKey = Object.keys(errs)[0]
    if (firstKey) {
      setTimeout(() => {
        const el = document.querySelector<HTMLElement>(`[data-field="${firstKey}"]`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el?.focus()
      }, 50)
    }
    return Object.keys(errs).length === 0
  }

  async function handleOrder() {
    if (!validate() || saving) return
    setSaving(true)
    try {
      const wilayaCode = form.wilaya.split(' - ')[0]
      const orderData: CreateOrderInput = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        wilaya: `${wilayaCode} - ${wilayas.find(w => w.code === wilayaCode)?.name || wilayaCode}`,
        commune: form.commune,
        address: form.address.trim(),
        orderNote: form.orderNote.trim(),
        items: items.map(item => ({
          product: String((item.product as any)._id || item.product.id),
          name: item.product.name,
          price: item.color?.price ?? item.volume?.price ?? item.product.price,
          quantity: item.quantity,
          image: item.color?.image || item.product.image || '',
          volume: item.volume?.label || '',
          color: item.color?.name || '',
          colorImage: item.color?.image || '',
        })),
        subtotal: total,
        deliveryCompany: selectedOpt?.companyId,
        deliveryMethod: selectedOpt?.method || null,
        deliveryCost: shipping,
        total: grandTotal,
      }
      const order = await createOrder(orderData)
      setOrderPlaced(true)
      window.scrollTo({ top: 0 })
      clearCart()
    } catch (err: any) {
      const msg = err?.message || 'Erreur lors de la creation de la commande. Veuillez reessayer.'
      setErrors(prev => ({ ...prev, _general: msg }))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSaving(false)
    }
  }

  function updateField(field: string, value: string) {
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
    setForm(prev => {
      const updated = { ...prev, [field]: value }
      if (field === 'wilaya') {
        updated.commune = ''
        setSelectedShipping(null)
        const wilaya = wilayas.find(w => `${w.code} - ${w.name}` === value)
        setCommunes(wilaya ? [...wilaya.communes].sort((a, b) => a.localeCompare(b)) : [])
      }
      return updated
    })
  }

  const inputClass = (hasError?: boolean) => `w-full py-2.5 px-3.5 text-[13px] font-sans border transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20 ${hasError ? 'border-accent bg-accent/5 focus:border-accent' : 'border-gray-200 focus:border-foreground'}`

  const fieldLabel = 'block text-[11px] font-sans font-medium uppercase tracking-[0.12em] text-gray-500 mb-2'

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="flex-1 overflow-x-hidden bg-white">
        <div className="max-w-[1360px] mx-auto px-5 md:px-6 pt-6 pb-20">

          {/* Breadcrumb */}
          <nav className="flex lg:hidden items-center gap-2 text-[11px] uppercase tracking-wide text-gray-400 mb-4">
            <Link to="/" className="hover:text-foreground transition-colors">Accueil</Link>
            <span>/</span>
            <span className="text-foreground">Paiement</span>
          </nav>

          <nav className="hidden lg:flex items-center gap-2 text-[11px] uppercase tracking-wide text-gray-400 mb-6">
            <Link to="/" className="hover:text-foreground transition-colors">Accueil</Link>
            <span>/</span>
            <span className="text-foreground">Paiement</span>
          </nav>

          {orderPlaced ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <HiCheckCircle size={64} className="text-foreground mb-6" />
              <h2 className="font-display text-3xl md:text-4xl text-foreground mb-3">
                Commande confirmee !
              </h2>
              <p className="text-[13px] text-gray-500 mb-1">
                Merci {form.firstName}, votre commande a ete enregistree.
              </p>
              <p className="text-[13px] text-gray-400 mb-8 max-w-md">
                Nous vous contacterons au <strong className="text-foreground">{form.phone}</strong> pour confirmer la livraison.
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 text-[12px] font-sans uppercase tracking-normal text-white bg-foreground border border-foreground hover:bg-white hover:text-foreground transition-all duration-[450ms] ease-[cubic-bezier(.785,.135,.15,.86)] cursor-pointer"
              >
                Retour a l'accueil
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
              {/* LEFT - Facturation */}
              <div>
                {errors._general && (
                  <div className="bg-accent/5 border border-accent/30 text-accent text-[13px] px-4 py-3 mb-8">
                    {errors._general}
                  </div>
                )}

                <div className="mb-8">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.18em]">
                    Livraison
                  </span>
                  <h2 className="font-display text-2xl md:text-3xl text-foreground mt-1">
                    Coordonnees de facturation
                  </h2>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={fieldLabel}>
                        Prenom <span className="text-accent">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.firstName}
                        onChange={e => updateField('firstName', e.target.value)}
                        data-field="firstName"
                        className={inputClass(!!errors.firstName)}
                      />
                      {errors.firstName && <p className="text-xs text-accent mt-1.5">{errors.firstName}</p>}
                    </div>
                    <div>
                      <label className={fieldLabel}>Nom</label>
                      <input
                        type="text"
                        value={form.lastName}
                        onChange={e => updateField('lastName', e.target.value)}
                        className={inputClass()}
                      />
                    </div>
                  </div>

                  <div data-field="wilaya">
                    <label className={fieldLabel}>Wilaya <span className="text-accent">*</span></label>
                    <Select
                      value={form.wilaya}
                      onChange={v => updateField('wilaya', v)}
                      options={[...wilayas].sort((a, b) => Number(a.code) - Number(b.code)).map(w => `${w.code} - ${w.name}`)}
                      placeholder="Selectionnez votre wilaya"
                      sharp
                    />
                    {errors.wilaya && <p className="text-xs text-accent mt-1.5">{errors.wilaya}</p>}
                  </div>

                  <div data-field="commune">
                    <label className={fieldLabel}>Commune <span className="text-accent">*</span></label>
                    <Select
                      value={form.commune}
                      onChange={v => updateField('commune', v)}
                      options={communes}
                      placeholder="Selectionnez votre commune"
                      disabled={!form.wilaya}
                      disabledPlaceholder="Selectionnez d'abord votre wilaya"
                      sharp
                    />
                    {errors.commune && <p className="text-xs text-accent mt-1.5">{errors.commune}</p>}
                  </div>

                  <div data-field="address">
                    <label className={fieldLabel}>Adresse <span className="text-accent">*</span></label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={e => updateField('address', e.target.value)}
                      placeholder="Rue, numero, residence..."
                      className={inputClass(!!errors.address)}
                    />
                    {errors.address && <p className="text-xs text-accent mt-1.5">{errors.address}</p>}
                  </div>

                  <div>
                    <label className={fieldLabel}>
                      Telephone <span className="text-accent">*</span>
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => updateField('phone', e.target.value.replace(/\D/g, ''))}
                      data-field="phone"
                      className={inputClass(!!errors.phone)}
                    />
                    {errors.phone && <p className="text-xs text-accent mt-1.5">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className={fieldLabel}>Note de commande</label>
                    <textarea
                      value={form.orderNote}
                      onChange={e => updateField('orderNote', e.target.value)}
                      placeholder="Notes sur votre commande, e.g. instructions speciales pour la livraison"
                      rows={4}
                      className={`${inputClass()} resize-none`}
                    />
                  </div>
                </div>

                {/* Trust badges */}
                <div className="grid grid-cols-2 gap-1.5 mt-10 pt-6 border-t border-gray-200">
                  {[
                    { icon: HiTruck, text: 'Livraison 69 wilayas', underline: false },
                    { icon: HiShieldCheck, text: '100% Authentique', underline: true },
                    { icon: HiCreditCard, text: 'Paiement a la livraison', underline: true },
                  ].map((item, idx) => (
                    <div
                      key={item.text}
                      className={`flex items-center gap-2 text-gray-500 ${idx === 2 ? 'col-span-2 justify-start' : ''}`}
                    >
                      <item.icon size={16} strokeWidth={1} className="text-gray-400 shrink-0" />
                      <span className={`text-[12px] ${item.underline ? 'underline' : ''}`}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT - Order Summary */}
              <div className="lg:sticky lg:top-24">
                <div className="border border-gray-200">
                  <h2 className="text-[11px] font-sans font-medium uppercase tracking-[0.12em] text-foreground px-6 py-4 border-b border-gray-200">
                    Resume de la commande
                  </h2>

                  {/* Products */}
                  <div className="divide-y divide-gray-200/70">
                    {items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
                        <div className="w-14 h-14 flex items-center justify-center border border-gray-200 mb-4">
                          <HiShoppingBag size={24} className="text-gray-300" />
                        </div>
                        <p className="text-[13px] text-gray-500">Votre panier est vide.</p>
                        <button
                          onClick={() => navigate('/search')}
                          className="mt-4 text-[11px] font-sans font-semibold text-foreground uppercase tracking-wide hover:underline cursor-pointer"
                        >
                          Continuer vos achats
                        </button>
                      </div>
                    ) : (
                      items.map((item, index) => (
                        <div key={(item.product as any)._id || item.product.id || index} className="flex gap-4 p-5">
                          <div className="w-16 h-16 bg-gray-50 ring-1 ring-gray-200 shrink-0 overflow-hidden">
                            <img src={item.color?.image || item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[13px] font-medium text-foreground line-clamp-2 mb-1">{item.product.name}</h4>
                            <p className="text-xs text-gray-400 mb-2">{fmtMoney(item.color?.price ?? item.volume?.price ?? item.product.price)}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center border border-gray-200">
                                <button
                                  onClick={() => updateQuantity(item.key, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                  className="w-7 h-7 flex items-center justify-center text-foreground hover:bg-gray-50 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <HiMinus size={10} />
                                </button>
                                <span className="w-8 text-center text-xs font-medium text-foreground">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item.key, item.quantity + 1)}
                                  disabled={item.color?.stock !== undefined ? item.quantity >= item.color.stock : item.volume?.stock !== undefined ? item.quantity >= item.volume.stock : (item.product as any).stock !== undefined && item.quantity >= (item.product as any).stock}
                                  className="w-7 h-7 flex items-center justify-center text-foreground hover:bg-gray-50 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <HiPlus size={10} />
                                </button>
                              </div>
                              <button
                                onClick={() => removeItem(item.key)}
                                className="text-gray-300 hover:text-accent transition-colors cursor-pointer"
                              >
                                <HiTrash size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Totals */}
                  <div className="px-6 py-5 space-y-4 border-t border-gray-200">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-gray-500">Sous-total</span>
                      <span className="font-medium text-foreground">{fmtMoney(total)}</span>
                    </div>

                    {!form.wilaya ? (
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-gray-500">Expedition</span>
                        <span className="text-gray-400 text-xs">Selectionnez votre wilaya</span>
                      </div>
                    ) : freeShipping && shippingOptions.length === 0 ? (
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-gray-500">Expedition</span>
                        <span className="text-orange-500 text-xs font-medium">Livraison offerte mais aucun transporteur ne dessert votre wilaya</span>
                      </div>
                    ) : freeShipping ? (
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-gray-500">Expedition</span>
                        <span className="text-green-700 font-medium text-xs">Livraison offerte</span>
                      </div>
                    ) : shippingOptions.length === 0 ? (
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-gray-500">Expedition</span>
                        <span className="text-accent text-xs">Livraison non disponible pour cette wilaya</span>
                      </div>
                    ) : (
                      <div className="space-y-2 border-t border-gray-200 pt-4" data-field="shipping">
                        <p className="text-[11px] font-sans font-medium uppercase tracking-[0.12em] text-gray-500 mb-3">
                          Expedition <span className="text-accent">*</span>
                        </p>
                        {shippingOptions.map(opt => (
                          <label
                            key={getShippingKey(opt)}
                            className={`flex items-center gap-3 py-2.5 px-3 border cursor-pointer transition-colors ${selectedShipping === getShippingKey(opt) ? 'border-foreground' : 'border-gray-200 hover:border-foreground'}`}
                          >
                            <span className="relative flex items-center justify-center w-[18px] h-[18px] shrink-0">
                              <input
                                type="radio"
                                name="shipping"
                                checked={selectedShipping === getShippingKey(opt)}
                                onChange={() => { setSelectedShipping(getShippingKey(opt)); setErrors(prev => { const n = { ...prev }; delete n.shipping; return n }) }}
                                className="peer absolute inset-0 opacity-0 cursor-pointer"
                              />
                              <span className="w-full h-full rounded-full border border-gray-400 peer-checked:border-foreground transition-colors" />
                              <span
                                className={`absolute w-[8px] h-[8px] rounded-full transition-all ${selectedShipping === getShippingKey(opt) ? 'opacity-100 scale-100 bg-foreground' : 'opacity-0 scale-0'}`}
                              />
                            </span>
                            <span className="text-[13px] text-foreground flex-1">{opt.label}</span>
                            <span className="text-[13px] font-medium text-foreground">{fmtMoney(opt.price)}</span>
                          </label>
                        ))}
                        {errors.shipping && <p className="text-xs text-accent mt-1.5">{errors.shipping}</p>}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[13px] pt-3 border-t border-gray-200">
                      <span className="font-semibold text-foreground">Total</span>
                      <span className="font-semibold text-foreground text-lg transition-all">{fmtMoney(grandTotal)}</span>
                    </div>
                  </div>

                  {/* Payment info */}
                  <div className="px-6 py-5 border-t border-gray-200">
                    <div className="flex items-center gap-3 border border-gray-200 px-4 py-3.5 mb-4">
                      <span className="w-5 h-5 shrink-0 rounded-full border border-foreground flex items-center justify-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-foreground" />
                      </span>
                      <div>
                        <p className="text-[13px] font-medium text-foreground">Paiement a la livraison</p>
                        <p className="text-xs text-gray-400 mt-0.5">Payez en especes a la reception de votre commande.</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Vos donnees personnelles seront utilisees pour traiter votre commande, soutenir votre experience sur ce site Web et a d'autres fins decrites dans notre{' '}
                      <span className="text-foreground underline cursor-pointer">politique de confidentialite</span>.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleOrder}
                  disabled={!canOrder}
                  className="group w-full mt-6 py-3.5 px-6 text-[12px] font-sans uppercase tracking-normal flex items-center justify-center border transition-all duration-[450ms] ease-[cubic-bezier(.785,.135,.15,.86)] cursor-pointer bg-foreground text-white border-foreground hover:bg-white hover:text-foreground disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:hover:text-gray-400 disabled:hover:border-gray-200"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border border-white border-t-transparent animate-spin" />
                      En cours...
                    </span>
                  ) : 'Commander'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}