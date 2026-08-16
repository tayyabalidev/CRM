export function nextInvoiceNumber(existing: string[]) {
  let max = 0;

  for (const value of existing) {
    const match = value.trim().match(/(\d+)\s*$/);
    if (match) {
      max = Math.max(max, Number.parseInt(match[1], 10));
    }
  }

  return `INV-${String(max + 1).padStart(4, "0")}`;
}
