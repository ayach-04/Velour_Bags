import { useState } from 'react'
import { HiXMark, HiDocumentArrowUp, HiCheck, HiCog6Tooth } from 'react-icons/hi2'
import type { Order } from '../../api/orders'

interface ExportOrder {
  order: Order
  fragile: boolean
  ouvrir: boolean
  echange: boolean
  pickup: boolean
  recouvrement: boolean
}

interface NoestExportDialogProps {
  open: boolean
  onClose: () => void
  orders: Order[]
}

const toggleFields = ['fragile', 'ouvrir', 'echange', 'pickup', 'recouvrement'] as const
type ToggleField = typeof toggleFields[number]

const toggleLabels: Record<ToggleField, string> = {
  fragile: 'FRAGILE',
  ouvrir: 'OUVRIR',
  echange: 'ÉCHANGE',
  pickup: 'PICKUP',
  recouvrement: 'RECOUVREMENT',
}

function parseWilaya(wilaya: string): { code: string; name: string } {
  const parts = wilaya.split(' - ')
  if (parts.length === 2) return { code: parts[0].trim(), name: parts[1].trim() }
  return { code: wilaya, name: wilaya }
}

export default function NoestExportDialog({ open, onClose, orders }: NoestExportDialogProps) {
  const [exportOrders, setExportOrders] = useState<ExportOrder[]>(() =>
    orders.map(o => ({
      order: o,
      fragile: false,
      ouvrir: false,
      echange: false,
      pickup: false,
      recouvrement: false,
    }))
  )

  const [bulkValues, setBulkValues] = useState<Record<ToggleField, boolean>>({
    fragile: false,
    ouvrir: false,
    echange: false,
    pickup: false,
    recouvrement: false,
  })

  const [exporting, setExporting] = useState(false)

  function toggleField(idx: number, field: ToggleField) {
    setExportOrders(prev => prev.map((eo, i) => i === idx ? { ...eo, [field]: !eo[field] } : eo))
  }

  function applyBulk() {
    setExportOrders(prev => prev.map(eo => ({
      ...eo,
      fragile: bulkValues.fragile,
      ouvrir: bulkValues.ouvrir,
      echange: bulkValues.echange,
      pickup: bulkValues.pickup,
      recouvrement: bulkValues.recouvrement,
    })))
  }

  function toggleBulkField(field: ToggleField) {
    setBulkValues(prev => ({ ...prev, [field]: !prev[field] }))
  }

  function selectAll() {
    const v = { fragile: true, ouvrir: true, echange: true, pickup: true, recouvrement: true }
    setBulkValues(v)
    setExportOrders(prev => prev.map(eo => ({ ...eo, ...v })))
  }

  function deselectAll() {
    const v = { fragile: false, ouvrir: false, echange: false, pickup: false, recouvrement: false }
    setBulkValues(v)
    setExportOrders(prev => prev.map(eo => ({ ...eo, ...v })))
  }

  async function handleExport() {
    setExporting(true)
    try {
      const XLSX = await import('xlsx-js-style')

      const note = '\n(si oui mettez OUI sinon laissez vide)'
      const headers = [
        'REFERENCE COMMANDE',
        'NOM ET PRENOM DU DESTINATAIRE *',
        'TELEPHONE *',
        'TELEPHONE 2',
        'CODE WILAYA *',
        'WILAYA DE LIVRAISON *',
        'COMMUNE DE LIVRAISON *',
        'ADDRESS DE LIVRAISON *',
        'PRODUCT',
        'POIDS(KG)',
        'MONTANT DE COLIS *',
        'REMARQUE',
        'FRAGILE' + note,
        'OUVRIR' + note,
        'ECHANGE' + note,
        'PICKUP' + note,
        'RECOUVREMENT' + note,
        'STOP DESK' + note,
      ]

      const rows = exportOrders.map(eo => {
        const o = eo.order
        const { code, name } = parseWilaya(o.wilaya)
        const fullName = o.lastName ? `${o.firstName} ${o.lastName}` : o.firstName
        const itemsTotal = o.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

        return [
          `#${o.orderNumber}`,
          fullName,
          o.phone,
          '',
          code,
          name,
          o.commune || '',
          o.address || '',
          o.items.map(item => `${item.name} x${item.quantity}`).join(', '),
          '',
          itemsTotal,
          o.orderNote || '',
          eo.fragile ? 'OUI' : '',
          eo.ouvrir ? 'OUI' : '',
          eo.echange ? 'OUI' : '',
          eo.pickup ? 'OUI' : '',
          eo.recouvrement ? 'OUI' : '',
          o.deliveryMethod === 'stopdesk' ? 'OUI' : '',
        ]
      })

      const wsData = [headers, ...rows]
      const ws = XLSX.utils.aoa_to_sheet(wsData)

      ws['!cols'] = [
        { wch: 30 }, { wch: 32 }, { wch: 16 }, { wch: 16 },
        { wch: 12 }, { wch: 22 }, { wch: 24 }, { wch: 38 },
        { wch: 22 }, { wch: 12 }, { wch: 18 }, { wch: 32 },
        { wch: 28 }, { wch: 28 }, { wch: 28 }, { wch: 28 },
        { wch: 30 }, { wch: 28 },
      ]

      ws['!freeze'] = { xSplit: 0, ySplit: 1 }

      const range = XLSX.utils.decode_range(ws['!ref']!)

      const thinBorder = {
        top: { style: 'thin', color: { rgb: 'FFDDDDDD' } },
        bottom: { style: 'thin', color: { rgb: 'FFDDDDDD' } },
        left: { style: 'thin', color: { rgb: 'FFDDDDDD' } },
        right: { style: 'thin', color: { rgb: 'FFDDDDDD' } },
      }

      const thickEdge = {
        top: { style: 'thin', color: { rgb: 'FFDDDDDD' } },
        bottom: { style: 'thin', color: { rgb: 'FFDDDDDD' } },
        left: { style: 'thin', color: { rgb: 'FFDDDDDD' } },
        right: { style: 'thin', color: { rgb: 'FFDDDDDD' } },
      }

      function getBorder(col: number) {
        const b = { ...thickEdge }
        if (col === 9 || col === 12 || col === 15) b.left = { style: 'medium', color: { rgb: 'FF333333' } }
        if (col === 9 || col === 13 || col === 16) b.right = { style: 'medium', color: { rgb: 'FF333333' } }
        return b
      }

      for (let C = range.s.c; C <= range.e.c; ++C) {
        const addr = XLSX.utils.encode_cell({ r: 0, c: C })
        if (!ws[addr]) ws[addr] = { t: 's', v: '' }

        const hdrBorder = getBorder(C)

        if (C <= 11) {
          ws[addr].s = {
            font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'FFFFFFFF' } },
            fill: { patternType: 'solid', fgColor: { rgb: 'FF1A1A2E' } },
            alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
            border: hdrBorder,
          }
        } else {
          ws[addr].s = {
            font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'FF000000' } },
            fill: { patternType: 'solid', fgColor: { rgb: 'FF6FAFC5' } },
            alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
            border: hdrBorder,
          }
        }
      }

      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const isEven = R % 2 === 0
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C })
          if (!ws[addr]) continue

          const cell = ws[addr]
          const baseFill = isEven ? {} : { fill: { patternType: 'solid', fgColor: { rgb: 'FFFAFAFB' } } }
          const cellBorder = getBorder(C)

          if (C === 0) {
            cell.s = {
              font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'FF6FAFC5' } },
              alignment: { vertical: 'center', horizontal: 'left' },
              border: cellBorder,
              ...baseFill,
            }
          } else if (C === 10) {
            cell.s = {
              font: { name: 'Calibri', sz: 10 },
              alignment: { vertical: 'center', horizontal: 'right' },
              border: cellBorder,
              numFmt: '#,##0',
              ...baseFill,
            }
          } else if (C >= 12 && C <= 17) {
            cell.s = {
              font: { name: 'Calibri', sz: 10, bold: cell.v === 'OUI', color: cell.v === 'OUI' ? { rgb: 'FF16A34A' } : undefined },
              alignment: { vertical: 'center', horizontal: 'center' },
              border: cellBorder,
              ...baseFill,
            }
            cell.dataValidation = { type: 'list', allowBlank: true, formula1: '"OUI"', showDropDown: false }
          } else if ([1, 5, 6, 7, 11].includes(C)) {
            cell.s = {
              font: { name: 'Calibri', sz: 10 },
              alignment: { vertical: 'center', horizontal: 'left', wrapText: true },
              border: cellBorder,
              ...baseFill,
            }
          } else {
            cell.s = {
              font: { name: 'Calibri', sz: 10 },
              alignment: { vertical: 'center', horizontal: 'left' },
              border: cellBorder,
              ...baseFill,
            }
          }
        }
      }

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Noest Export')
      XLSX.writeFile(wb, `noest_export_${new Date().toISOString().slice(0, 10)}.xlsx`)

      onClose()
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center lg:ml-64">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative bg-white w-full max-w-5xl max-h-[85vh] mx-4 flex flex-col shadow-xl rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary flex items-center justify-center">
              <HiDocumentArrowUp size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text">Export Noest</h2>
              <p className="text-xs text-gray-400">{orders.length} commande{orders.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-text hover:bg-gray-100 transition-all cursor-pointer rounded-md">
            <HiXMark size={18} />
          </button>
        </div>

        {/* Bulk controls */}
        <div className="px-6 py-4 bg-white border-b border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <HiCog6Tooth size={14} className="text-primary" />
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Appliquer à tous</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {toggleFields.map(field => (
              <label key={field} className="flex items-center gap-2 cursor-pointer">
                <button
                  type="button"
                  onClick={() => toggleBulkField(field)}
                  className={`w-4 h-4 flex items-center justify-center border transition-all cursor-pointer rounded-md ${bulkValues[field] ? 'bg-primary border-primary' : 'bg-white border-gray-300 hover:border-primary/40'}`}
                >
                  {bulkValues[field] && <HiCheck size={10} strokeWidth={3} className="text-white" />}
                </button>
                <span className="text-xs font-medium text-gray-600">{toggleLabels[field]}</span>
              </label>
            ))}
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={selectAll} className="h-7 px-3 text-[10px] font-semibold text-primary hover:bg-primary/10 transition-all cursor-pointer uppercase tracking-wider rounded-lg">
                Tout cocher
              </button>
              <button onClick={deselectAll} className="h-7 px-3 text-[10px] font-semibold text-gray-400 hover:bg-gray-100 transition-all cursor-pointer uppercase tracking-wider rounded-lg">
                Tout décocher
              </button>
              <button onClick={applyBulk} className="h-7 px-3 bg-primary text-white text-[10px] font-bold uppercase tracking-wider hover:scale-105 transition-transform cursor-pointer flex items-center gap-1 rounded-lg">
                <HiCheck size={10} className="text-white" />
                Appliquer
              </button>
            </div>
          </div>
        </div>

        {/* Orders table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="border-b border-gray-200">
                <th className="px-3 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">#</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Client</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Wilaya</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Commune</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Produits</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Fragile</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Ouvrir</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Échange</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Pickup</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Recouvrement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {exportOrders.map((eo, idx) => (
                <tr key={eo.order._id} className={`transition-colors ${idx % 2 === 0 ? 'bg-white hover:bg-gray-50/80' : 'bg-gray-50/50 hover:bg-gray-100/50'}`}>
                  <td className="px-3 py-2.5 font-semibold text-primary">#{eo.order.orderNumber}</td>
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-text">{eo.order.firstName} {eo.order.lastName}</span>
                    <p className="text-[10px] text-gray-400 mt-0.5">{eo.order.phone}</p>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">{parseWilaya(eo.order.wilaya).name}</td>
                  <td className="px-3 py-2.5 text-gray-600">{eo.order.commune || '-'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {eo.order.items.slice(0, 4).map((item, i) => (
                        <img key={i} src={item.image} alt={item.name} title={item.name} className="w-10 h-10 object-cover rounded-lg" />
                      ))}
                      {eo.order.items.length > 4 && (
                        <span className="text-[10px] text-gray-400 font-medium">+{eo.order.items.length - 4}</span>
                      )}
                    </div>
                  </td>
                  {toggleFields.map(field => (
                    <td key={field} className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => toggleField(idx, field)}
                        className={`w-5 h-5 flex items-center justify-center border transition-all cursor-pointer mx-auto rounded-md ${eo[field] ? 'bg-primary border-primary text-white shadow-sm' : 'bg-white border-gray-200 text-gray-300 hover:border-primary/40 hover:text-gray-400'}`}
                      >
                        {eo[field] && <HiCheck size={9} strokeWidth={3} />}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="h-9 px-4 text-sm text-gray-500 hover:text-text transition-colors cursor-pointer rounded-lg">
              Annuler
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="h-9 px-5 bg-[#1a1a2e] hover:scale-105 text-white text-xs font-bold uppercase tracking-wider transition-transform cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
            >
              {exporting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <HiDocumentArrowUp size={14} />
              )}
              Exporter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}