import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

export function initTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  if (!user || !pass) {
    console.warn('SMTP credentials not configured, email notifications disabled');
    return;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function buildOrderEmailHtml(orderData: {
  orderNumber: number
  firstName: string
  lastName: string
  phone: string
  wilaya: string
  commune?: string
  address?: string
  items: { name: string; quantity: number; price: number; volume?: string }[]
  subtotal: number
  deliveryCost: number
  total: number
  orderNote?: string
}): string {
  const itemsHtml = orderData.items.map((item, i) =>
    `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;">${i + 1}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;">${item.name}${item.volume ? `<br/><span style="font-size:11px;color:#888;">${item.volume}</span>` : ''}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">${Math.round(item.price * item.quantity)} DA</td>
    </tr>`
  ).join('')

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#fff;border:1px solid #e0e0e0;border-radius:8px;">
      <div style="text-align:center;margin-bottom:20px;padding-bottom:15px;border-bottom:2px solid #1a1a2e;">
        <h1 style="color:#1a1a2e;font-size:20px;margin:0;">Nouvelle commande</h1>
        <p style="color:#666;font-size:14px;margin:4px 0 0;">#${orderData.orderNumber}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <tr><td style="padding:4px 0;color:#888;font-size:12px;width:80px;">Client</td><td style="padding:4px 0;font-size:13px;font-weight:600;">${orderData.firstName} ${orderData.lastName}</td></tr>
        <tr><td style="padding:4px 0;color:#888;font-size:12px;">Téléphone</td><td style="padding:4px 0;font-size:13px;">${orderData.phone}</td></tr>
        <tr><td style="padding:4px 0;color:#888;font-size:12px;">Wilaya</td><td style="padding:4px 0;font-size:13px;">${orderData.wilaya}</td></tr>
        ${orderData.commune ? `<tr><td style="padding:4px 0;color:#888;font-size:12px;">Commune</td><td style="padding:4px 0;font-size:13px;">${orderData.commune}</td></tr>` : ''}
        ${orderData.address ? `<tr><td style="padding:4px 0;color:#888;font-size:12px;">Adresse</td><td style="padding:4px 0;font-size:13px;">${orderData.address}</td></tr>` : ''}
      </table>

      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <thead>
          <tr style="background:#1a1a2e;color:#fff;">
            <th style="padding:8px;text-align:left;font-size:11px;">#</th>
            <th style="padding:8px;text-align:left;font-size:11px;">Article</th>
            <th style="padding:8px;text-align:center;font-size:11px;">Qté</th>
            <th style="padding:8px;text-align:right;font-size:11px;">Prix</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:4px 0;color:#888;">Sous-total</td><td style="padding:4px 0;text-align:right;">${Math.round(orderData.subtotal)} DA</td></tr>
        ${orderData.deliveryCost > 0 ? `<tr><td style="padding:4px 0;color:#888;">Livraison</td><td style="padding:4px 0;text-align:right;">${Math.round(orderData.deliveryCost)} DA</td></tr>` : ''}
        <tr><td style="padding:6px 0;border-top:2px solid #1a1a2e;font-weight:700;color:#1a1a2e;">Total</td><td style="padding:6px 0;border-top:2px solid #1a1a2e;text-align:right;font-weight:700;color:#1a1a2e;">${Math.round(orderData.total)} DA</td></tr>
      </table>

      ${orderData.orderNote ? `<div style="margin-top:12px;padding:10px;background:#fff8e1;border-radius:4px;font-size:12px;color:#666;"><strong style="color:#333;">Note :</strong> ${orderData.orderNote}</div>` : ''}

      <div style="margin-top:20px;padding-top:12px;border-top:1px solid #eee;text-align:center;font-size:11px;color:#aaa;">
        Velour — Notification automatique de commande
      </div>
    </div>
  `
}

export async function sendOrderNotification(orderData: {
  orderNumber: number
  firstName: string
  lastName: string
  phone: string
  wilaya: string
  commune?: string
  address?: string
  items: { name: string; quantity: number; price: number; volume?: string }[]
  subtotal: number
  deliveryCost: number
  total: number
  orderNote?: string
}): Promise<boolean> {
  if (!transporter) {
    console.warn('SMTP transporter not initialized, skipping email notification')
    return false
  }

  const to = process.env.NOTIFICATION_EMAIL
  if (!to) {
    console.warn('NOTIFICATION_EMAIL not configured, skipping email notification')
    return false
  }

  try {
    await transporter.sendMail({
      from: `"Velour" <${process.env.SMTP_USER}>`,
      to,
      subject: `Nouvelle commande #${orderData.orderNumber}`,
      html: buildOrderEmailHtml(orderData),
    })
    return true
  } catch (err) {
    console.error('Email notification error:', err)
    return false
  }
}
