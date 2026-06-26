/** Format phone input as ###-###-#### while typing. */
export function formatPhoneInput(value: string | number | null | undefined): string {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 10);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Strip phone formatting, keeping digits only. */
export function phoneDigitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}
