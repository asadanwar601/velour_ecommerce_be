export function generateOrderConfirmationHtml(order: any, brandName = 'VELOUR'): string {
  const itemsHtml = (order.items || [])
    .map(
      (item: any) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e7e5e4;">
          <div style="font-weight: 600; color: #1c1917;">${item.product?.name || 'Atelier Piece'}</div>
          <div style="font-size: 12px; color: #78716c;">Size: ${item.size} · Qty: ${item.quantity}</div>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e7e5e4; text-align: right; font-weight: 600; color: #1c1917;">
          $${Number(item.price || 0).toFixed(2)}
        </td>
      </tr>
    `
    )
    .join('');

  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #fcfbf9; color: #1c1917;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 32px; font-weight: 400; letter-spacing: 3px; text-transform: uppercase; margin: 0;">${brandName}</h1>
        <p style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #967444; margin-top: 4px;">Atelier Privé · Order Confirmation</p>
      </div>

      <div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 4px; padding: 28px; margin-bottom: 24px;">
        <h2 style="font-size: 18px; font-weight: 600; margin-top: 0; margin-bottom: 8px;">Thank you for your acquisition, ${order.contactName || 'Valued Patron'}</h2>
        <p style="font-size: 13px; color: #57534e; line-height: 1.6; margin-bottom: 20px;">
          Your order has been confirmed and reserved in our atelier inventory. Hand inspection and gift wrapping will commence immediately.
        </p>

        <div style="background-color: #faf8f5; border: 1px solid #e8e4df; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px; font-size: 13px;">
          <strong>Order Reference:</strong> ${order.orderNumber}
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          ${itemsHtml}
        </table>

        <div style="margin-top: 20px; border-top: 2px solid #1c1917; padding-top: 12px;">
          <div style="display: flex; justify-content: space-between; font-size: 13px; color: #57534e; margin-bottom: 4px;">
            <span>Subtotal:</span>
            <span>$${Number(order.subtotal || 0).toFixed(2)}</span>
          </div>
          ${
            Number(order.discount || 0) > 0
              ? `<div style="display: flex; justify-content: space-between; font-size: 13px; color: #15803d; margin-bottom: 4px;">
                  <span>Privilege Discount:</span>
                  <span>-$${Number(order.discount).toFixed(2)}</span>
                </div>`
              : ''
          }
          <div style="display: flex; justify-content: space-between; font-size: 13px; color: #57534e; margin-bottom: 8px;">
            <span>White-Glove Shipping:</span>
            <span>${Number(order.shipping || 0) === 0 ? 'Complimentary' : '$' + Number(order.shipping).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; color: #1c1917; border-top: 1px solid #e7e5e4; padding-top: 8px;">
            <span>Total Settlement:</span>
            <span>$${Number(order.total || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <p style="font-size: 11px; color: #a8a29e; text-align: center; line-height: 1.5;">
        ${brandName} Atelier · Bespoke Tailoring & Rare Natural Fibers
      </p>
    </div>
  `;
}
