import type { Order } from '../api/orders'

function parseWilaya(wilaya: string): { code: string; name: string } {
  const parts = wilaya.split(' - ')
  if (parts.length === 2) return { code: parts[0].trim(), name: parts[1].trim() }
  return { code: wilaya, name: wilaya }
}

function wilayaSortKey(wilaya: string): number {
  const { code } = parseWilaya(wilaya)
  return Number(code) || 999
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function generateOrderReport(orders: Order[], tabLabel: string, showTransport = true) {
  const grouped = new Map<string, Map<string, Order[]>>()

  for (const o of orders) {
    const wilaya = o.wilaya || 'Inconnu'
    const commune = o.commune || 'Inconnu'
    if (!grouped.has(wilaya)) grouped.set(wilaya, new Map())
    const communes = grouped.get(wilaya)!
    if (!communes.has(commune)) communes.set(commune, [])
    communes.get(commune)!.push(o)
  }

  const sortedWilayas = [...grouped.entries()].sort((a, b) => wilayaSortKey(a[0]) - wilayaSortKey(b[0]))

  const now = new Date()
  const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  let rowsHtml = ''

  for (const [wilaya, communes] of sortedWilayas) {
    const { code, name } = parseWilaya(wilaya)
    const allOrders = [...communes.values()].flat()

    rowsHtml += `<div class="wilaya-section">`
    rowsHtml += `<h2 class="wilaya-header">Wilaya ${code} - ${escapeHtml(name)}</h2>`
    rowsHtml += `<table>`
    rowsHtml += `<thead><tr>`
    rowsHtml += `<th>Réf</th><th>Client</th><th>Tél</th>`
    if (showTransport) rowsHtml += `<th>Transport</th>`
    rowsHtml += `<th>Nb</th><th>Total</th><th>Produits</th>`
    rowsHtml += `</tr></thead>`
    rowsHtml += `<tbody>`

    for (const o of allOrders) {
      const fullName = o.lastName ? `${escapeHtml(o.firstName)} ${escapeHtml(o.lastName)}` : escapeHtml(o.firstName)
      const companyName = o.deliveryCompany?.name || '-'
      const itemCount = o.items.reduce((sum, item) => sum + item.quantity, 0)
      const totalFormatted = o.total.toLocaleString('fr-FR')

      const productLines = o.items.map(item => {
        const lineTotal = (item.price * item.quantity).toLocaleString('fr-FR')
        return `<div class="product-line">
          <img src="${escapeHtml(item.image)}" alt="" onerror="this.style.display='none'" />
          <span class="product-name">${escapeHtml(item.name)}</span>
          <span class="product-qty">x${item.quantity}</span>
          <span class="product-price">${lineTotal} DA</span>
        </div>`
      }).join('')

      rowsHtml += `<tr>`
      rowsHtml += `<td class="ref">#${o.orderNumber}</td>`
      rowsHtml += `<td>${fullName}</td>`
      rowsHtml += `<td>${escapeHtml(o.phone)}</td>`
      if (showTransport) rowsHtml += `<td>${escapeHtml(companyName)}</td>`
      rowsHtml += `<td class="center">${itemCount}</td>`
      rowsHtml += `<td class="right bold">${totalFormatted} DA</td>`
      rowsHtml += `<td class="products-cell">${productLines}</td>`
      rowsHtml += `</tr>`
    }

    rowsHtml += `</tbody></table>`
    rowsHtml += `</div>`
  }

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>Bon de préparation — ${escapeHtml(tabLabel)} — ${dateStr}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a2e; padding: 24px; }

  .header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #1a1a2e; }
  .header h1 { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #1a1a2e; margin-bottom: 4px; }
  .header .sub { font-size: 11px; color: #666; }

  .wilaya-section { margin-bottom: 28px; }
  .wilaya-header { font-size: 13px; font-weight: 700; color: #fff; background: #1a1a2e; padding: 6px 12px; margin-bottom: 12px; letter-spacing: 1px; }
  .commune-header { font-size: 11px; font-weight: 600; color: #6FAFC5; padding: 4px 0; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  thead th { background: #f3f4f6; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; padding: 6px 8px; border: 1px solid #e5e7eb; text-align: left; }
  tbody td { padding: 6px 8px; border: 1px solid #e5e7eb; vertical-align: top; font-size: 11px; }
  tbody tr:nth-child(even) { background: #fafafa; }
  tbody tr:hover { background: #f0f9ff; }

  .ref { font-weight: 700; color: #6FAFC5; white-space: nowrap; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: 700; }

  .products-cell { min-width: 220px; }
  .product-line { display: flex; align-items: center; gap: 6px; padding: 2px 0; }
  .product-line img { width: 42px; height: 42px; object-fit: cover; flex-shrink: 0; }
  .product-name { flex: 1; font-size: 10px; }
  .product-qty { font-size: 10px; color: #6b7280; font-weight: 600; }
  .product-price { font-size: 10px; font-weight: 600; white-space: nowrap; }

  @page {
    margin: 0 10mm 15mm 10mm;
  }
  @media print {
    body { padding: 15mm 0 0 0; font-size: 10px; }
    .wilaya-section { page-break-inside: avoid; }
    table { page-break-inside: avoid; }
    tbody tr:hover { background: transparent; }
  }
</style>
</head>
<body>
  <div class="header">
    <h1>Bon de préparation — ${escapeHtml(tabLabel)} — ${dateStr}</h1>
    <p class="sub">${orders.length} commande${orders.length !== 1 ? 's' : ''}</p>
  </div>
  ${rowsHtml}
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 400)
  }
}
