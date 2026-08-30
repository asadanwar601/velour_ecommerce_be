export function generateOrderCancellationHtml(
  order: any,
  reason?: string,
  brandName = 'VELOUR'
): string {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #fcfbf9; color: #1c1917;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 32px; font-weight: 400; letter-spacing: 3px; text-transform: uppercase; margin: 0;">${brandName}</h1>
        <p style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #b91c1c; margin-top: 4px;">Order Cancellation Notice</p>
      </div>

      <div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 4px; padding: 28px; margin-bottom: 24px;">
        <h2 style="font-size: 18px; font-weight: 600; margin-top: 0; margin-bottom: 8px;">Order Cancelled</h2>
        <p style="font-size: 13px; color: #57534e; line-height: 1.6; margin-bottom: 20px;">
          This notification confirms that order <strong>${order.orderNumber}</strong> has been cancelled and removed from dispatch processing.
        </p>

        <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 14px 16px; border-radius: 4px; margin-bottom: 20px; font-size: 13px; color: #991b1b;">
          <div><strong>Order Reference:</strong> ${order.orderNumber}</div>
          <div style="margin-top: 4px;"><strong>Cancellation Reason:</strong> ${reason || order.cancelReason || 'Client self-service request'}</div>
          <div style="margin-top: 4px;"><strong>Total Amount:</strong> $${Number(order.total || 0).toFixed(2)}</div>
        </div>

        <p style="font-size: 13px; color: #57534e; line-height: 1.6;">
          If payment was already settled, a full refund authorization will be initiated back to your original payment method within 2-3 business days.
        </p>
      </div>

      <p style="font-size: 11px; color: #a8a29e; text-align: center; line-height: 1.5;">
        ${brandName} Concierge Desk · Have questions? Reach out to care@velour.com
      </p>
    </div>
  `;
}
