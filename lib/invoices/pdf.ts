import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { formatInvoiceMoney } from "@/lib/invoices/totals";
import { invoiceStatusLabels } from "@/components/invoices/labels";
import type { InvoiceDetail } from "@/lib/services/invoices";
import { formatDate } from "@/lib/utils/dates";

type Issuer = {
  name: string;
  email?: string | null;
  phone?: string | null;
};

function wrap(text: string, max: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max) {
      if (current) {
        lines.push(current);
      }
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [""];
}

export async function buildInvoicePdf(
  detail: InvoiceDetail,
  issuer: Issuer,
  currency: string,
  timeZone: string,
) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.1, 0.1, 0.1);
  const muted = rgb(0.4, 0.4, 0.4);
  const rule = rgb(0.85, 0.85, 0.85);
  const { width, height } = page.getSize();
  let y = height - 56;

  const drawAt = (text: string, x: number, posY: number, size: number, face = font, color = ink) => {
    page.drawText(text, { x, y: posY, size, font: face, color });
  };

  const draw = (text: string, x: number, size: number, face = font, color = ink) => {
    drawAt(text, x, y, size, face, color);
  };

  const drawRight = (text: string, rightX: number, posY: number, size: number, face = font, color = ink) => {
    drawAt(text, rightX - face.widthOfTextAtSize(text, size), posY, size, face, color);
  };

  draw(issuer.name, 48, 20, bold);
  y -= 16;
  if (issuer.email) {
    draw(issuer.email, 48, 9, font, muted);
    y -= 12;
  }
  if (issuer.phone) {
    draw(issuer.phone, 48, 9, font, muted);
    y -= 12;
  }

  y = height - 56;
  draw("INVOICE", width - 48 - bold.widthOfTextAtSize("INVOICE", 22), y, bold);
  y -= 18;
  const numberLabel = detail.invoiceNumber;
  draw(numberLabel, width - 48 - font.widthOfTextAtSize(numberLabel, 11), y, font, muted);
  y -= 14;
  const statusLabel = invoiceStatusLabels[detail.status];
  draw(statusLabel, width - 48 - font.widthOfTextAtSize(statusLabel, 10), y, font, muted);

  y = height - 130;
  page.drawLine({ start: { x: 48, y }, end: { x: width - 48, y }, thickness: 1, color: rule });
  y -= 24;

  draw("Bill to", 48, 9, font, muted);
  y -= 14;
  draw(detail.client.name, 48, 12, bold);
  y -= 14;
  const clientLines = [
    detail.client.company,
    detail.client.address,
    detail.client.country,
    detail.client.email,
    detail.client.phone,
  ].filter((value): value is string => Boolean(value));

  for (const line of clientLines) {
    draw(line, 48, 10, font, muted);
    y -= 13;
  }

  const rightX = width - 48;
  let metaY = height - 154;
  const rows: [string, string][] = [
    ["Issue date", formatDate(detail.issueDate, timeZone)],
    ["Due date", detail.dueDate ? formatDate(detail.dueDate, timeZone) : "—"],
    ["Project", detail.projectName ?? "—"],
  ];

  for (const [label, value] of rows) {
    drawRight(label, rightX - 108, metaY, 9, font, muted);
    drawRight(value, rightX, metaY, 10, font);
    metaY -= 16;
    y = Math.min(y, metaY);
  }

  y -= 20;
  const colDesc = 48;
  const colQtyRight = 372;
  const colPriceRight = 468;
  const colAmountRight = rightX;

  page.drawRectangle({ x: 48, y: y - 6, width: width - 96, height: 22, color: rgb(0.96, 0.96, 0.96) });
  draw("Description", colDesc, 9, bold, muted);
  drawRight("Qty", colQtyRight, y, 9, bold, muted);
  drawRight("Price", colPriceRight, y, 9, bold, muted);
  drawRight("Amount", colAmountRight, y, 9, bold, muted);
  y -= 28;

  for (const item of detail.items) {
    const lines = wrap(item.description, 38);
        const qty = Number.isInteger(item.quantity) ? String(item.quantity) : item.quantity.toFixed(2);
    for (const [index, line] of lines.entries()) {
      draw(line, colDesc, 10);
      if (index === 0) {
        drawRight(qty, colQtyRight, y, 10);
        drawRight(formatInvoiceMoney(item.unitPrice, currency), colPriceRight, y, 10);
        drawRight(formatInvoiceMoney(item.total, currency), colAmountRight, y, 10);
      }
      y -= 14;
    }
    y -= 6;
  }

  y -= 8;
  page.drawLine({ start: { x: 48, y }, end: { x: width - 48, y }, thickness: 1, color: rule });
  y -= 22;

  const summary: [string, string, boolean][] = [["Subtotal", formatInvoiceMoney(detail.subtotal, currency), false]];

  if (detail.discount > 0) {
    summary.push(["Discount", `-${formatInvoiceMoney(detail.discount, currency)}`, false]);
  }

  if (detail.tax > 0) {
    summary.push(["Tax", formatInvoiceMoney(detail.tax, currency), false]);
  }

  summary.push(
    ["Total", formatInvoiceMoney(detail.total, currency), true],
    ["Amount paid", formatInvoiceMoney(detail.amountPaid, currency), false],
    ["Remaining", formatInvoiceMoney(detail.remaining, currency), true],
  );

  for (const [label, value, strong] of summary) {
    const face = strong ? bold : font;
    drawRight(label, colPriceRight, y, 10, face, strong ? ink : muted);
    drawRight(value, colAmountRight, y, 10, face);
    y -= 16;
  }

  if (detail.notes) {
    y -= 16;
    draw("Notes", 48, 9, bold, muted);
    y -= 14;
    for (const line of wrap(detail.notes, 90)) {
      draw(line, 48, 10, font, muted);
      y -= 13;
    }
  }

  y = 42;
  draw("Thank you for your business.", 48, 9, font, muted);

  return pdf.save();
}
