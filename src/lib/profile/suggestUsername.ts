/** A valid username guess from a name or email ("Āsha Rao" → "asha_rao"), or '' if too short. */
export function suggestUsername(source: string): string {
  const name = source
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20)
    .replace(/_+$/, '');
  return name.length >= 3 ? name : '';
}
