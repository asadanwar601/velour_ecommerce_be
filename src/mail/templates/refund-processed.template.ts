export function generateRefundProcessedHtml(
  order: any,
  refundDetails: { amount: number; reason?: string; returnId?: string },
  brandName = 'VELOUR'
): string {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #fcfbf9; color: #1c1917;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 32px; font-weight: 400; letter-spacing: 3px; text-transform: uppercase; margin: 0;">${brandName}</h1>
        <p style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #15803d; margin-top: 4px;">Refund Dispatched</p>
      </div>

      <div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 4px; padding: 28px; margin-bottom: 24px;">
        <h2 style="font-size: 18px; font-weight: 600; margin-top: 0; margin-bottom: 8px;">Refund Successfully Processed</h2>
        <p style="font-size: 13px; color: #57534e; line-height: 1.6; margin-bottom: 20px;">
          Your returned items have been inspected at our intake center. We have processed a refund for order <strong>${order.orderNumber}</strong>.
        </p>

        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px 16px; border-radius: 4px; margin-bottom: 20px; font-size: 13px; color: #166534;">
          <div><strong>Order Reference:</strong> ${order.orderNumber}</div>
          <div style="margin-top: 4px; font-size: 16px; font-weight: 700;"><strong>Refund Amount:</strong> $${Number(refundDetails.amount || 0).toFixed(2)}</div>
          ${refundDetails.reason ? `<div style="margin-top: 4px; font-size: 12px;"><strong>Reason:</strong> ${refundDetails.reason}</div>` : ''}
        </div>

        <p style="font-size: 13px; color: #57534e; line-height: 1.6;">
          Funds will appear in your card statement within 3 to 5 financial business days depending on your banking provider.
        </p>
      </div>

      <p style="font-size: 11px; color: #a8a29e; text-align: center; line-height: 1.5;">
        ${brandName} Atelier · Bespoke Tailoring & Client Care
      </p>
    </div>
  `;
}
