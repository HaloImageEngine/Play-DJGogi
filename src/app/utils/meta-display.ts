/** Formats optional numeric meta values for page headers. */
export function metaDisplay(value: number | null | undefined): string {
  return value == null ? '—' : String(value);
}
