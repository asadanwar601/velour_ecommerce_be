import { Injectable, Logger } from '@nestjs/common';
const PDFDocument = require('pdfkit');

@Injectable()
export class InvoiceGeneratorService {
  private readonly logger = new Logger(InvoiceGeneratorService.name);

  async generateInvoicePdf(order: any, brandSettings?: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        const brandName = brandSettings?.brandName || 'VELOUR';
        const brandTagline = brandSettings?.tagline || 'Quiet Luxury & Modern Atelier';
        const taxId = brandSettings?.taxId || 'US-VAT-84920194';
        const address = brandSettings?.addressLine || '482 Mercer Street, SoHo, NY 10013';

        // 1. Header & Brand Title
        doc.fontSize(24).font('Helvetica-Bold').text(brandName.toUpperCase(), 40, 40);
        doc.fontSize(8).font('Helvetica').fillColor('#8c7b6c').text(brandTagline.toUpperCase(), 40, 70);

        // Invoice Meta (Top Right)
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#16130f').text('COMMERCIAL INVOICE', 350, 40, { align: 'right' });
        doc.fontSize(9).font('Helvetica').fillColor('#57534e');
        doc.text(`Invoice No: INV-${order.orderNumber}`, 350, 62, { align: 'right' });
        doc.text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`, 350, 76, { align: 'right' });
        doc.text(`Status: ${order.status || 'PAID'}`, 350, 90, { align: 'right' });

        // Divider Line
        doc.strokeColor('#e5e0da').lineWidth(1).moveTo(40, 115).lineTo(555, 115).stroke();

        // 2. Billing & Shipping Details
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#16130f').text('BILLED / SHIPPED TO:', 40, 130);
        doc.fontSize(9).font('Helvetica').fillColor('#57534e');
        doc.text(order.contactName || 'Valued Patron', 40, 145);
        doc.text(order.contactEmail || 'care@velour.com', 40, 158);
        if (order.contactPhone) doc.text(order.contactPhone, 40, 171);

        const shipAddr = typeof order.shippingAddress === 'object' ? order.shippingAddress : null;
        if (shipAddr) {
          doc.text(`${shipAddr.line1 || ''} ${shipAddr.line2 || ''}`, 40, 184);
          doc.text(`${shipAddr.city || ''}, ${shipAddr.state || ''} ${shipAddr.zip || ''}`, 40, 197);
        }

        // Atelier Origin Info
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#16130f').text('ATELIER ORIGIN:', 350, 130, { align: 'right' });
        doc.fontSize(9).font('Helvetica').fillColor('#57534e');
        doc.text(brandName, 350, 145, { align: 'right' });
        doc.text(address, 350, 158, { align: 'right' });
        doc.text(`Tax / VAT ID: ${taxId}`, 350, 171, { align: 'right' });

        // Divider Line
        doc.strokeColor('#e5e0da').lineWidth(1).moveTo(40, 225).lineTo(555, 225).stroke();

        // 3. Line Items Table Header
        let yPos = 240;
        doc.rect(40, yPos - 5, 515, 20).fill('#f7f5f2');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#16130f');
        doc.text('ITEM DESCRIPTION', 48, yPos);
        doc.text('SIZE', 280, yPos);
        doc.text('QTY', 340, yPos);
        doc.text('UNIT PRICE', 400, yPos, { align: 'right', width: 60 });
        doc.text('AMOUNT', 480, yPos, { align: 'right', width: 65 });

        yPos += 25;
        doc.font('Helvetica').fontSize(9).fillColor('#1c1917');

        // Line Items Rows
        (order.items || []).forEach((item: any) => {
          const itemName = item.product?.name || 'Velour Atelier Garment';
          const itemSize = item.size || 'M';
          const itemQty = item.quantity || 1;
          const itemPrice = Number(item.price || 0);
          const itemTotal = itemPrice * itemQty;

          doc.text(itemName, 48, yPos, { width: 220, ellipsis: true });
          doc.text(itemSize, 280, yPos);
          doc.text(String(itemQty), 340, yPos);
          doc.text(`$${itemPrice.toFixed(2)}`, 400, yPos, { align: 'right', width: 60 });
          doc.text(`$${itemTotal.toFixed(2)}`, 480, yPos, { align: 'right', width: 65 });

          yPos += 20;
          doc.strokeColor('#f0ece6').lineWidth(0.5).moveTo(40, yPos - 5).lineTo(555, yPos - 5).stroke();
        });

        // 4. Totals Summary
        yPos = Math.max(yPos + 20, 480);
        doc.strokeColor('#e5e0da').lineWidth(1).moveTo(340, yPos).lineTo(555, yPos).stroke();
        yPos += 10;

        doc.fontSize(9).font('Helvetica').fillColor('#57534e');
        doc.text('Subtotal:', 350, yPos);
        doc.text(`$${Number(order.subtotal || 0).toFixed(2)}`, 480, yPos, { align: 'right', width: 65 });

        if (Number(order.discount || 0) > 0) {
          yPos += 16;
          doc.fillColor('#15803d').text('Privilege Discount:', 350, yPos);
          doc.text(`-$${Number(order.discount).toFixed(2)}`, 480, yPos, { align: 'right', width: 65 });
        }

        yPos += 16;
        doc.fillColor('#57534e').text('Shipping:', 350, yPos);
        doc.text(
          Number(order.shipping || 0) === 0 ? 'COMPLIMENTARY' : `$${Number(order.shipping).toFixed(2)}`,
          450,
          yPos,
          { align: 'right', width: 95 }
        );

        yPos += 18;
        doc.strokeColor('#16130f').lineWidth(1.5).moveTo(340, yPos).lineTo(555, yPos).stroke();
        yPos += 8;

        doc.fontSize(11).font('Helvetica-Bold').fillColor('#16130f');
        doc.text('Total Amount Paid:', 350, yPos);
        doc.text(`$${Number(order.total || 0).toFixed(2)}`, 480, yPos, { align: 'right', width: 65 });

        // 5. Legal & Footer Note
        doc.fontSize(8).font('Helvetica').fillColor('#a8a29e');
        doc.text(
          'Thank you for selecting VELOUR. All bespoke pieces undergo meticulous quality inspection.',
          40,
          740,
          { align: 'center', width: 515 }
        );
        doc.text(`support@velour.com · ${address} · ${taxId}`, 40, 754, { align: 'center', width: 515 });

        doc.end();
      } catch (err: any) {
        this.logger.error(`Error generating invoice PDF: ${err.message}`);
        reject(err);
      }
    });
  }
}
