/** Parse mobile numeric keypad input for integer IDs (Game ID, Card ID, etc.). */
export function parsePositiveIntInput(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const n = Math.trunc(value);
    return n > 0 ? n : null;
  }

  const digits = String(value).replace(/\D/g, '');
  if (!digits) {
    return null;
  }

  const parsed = Number(digits);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
