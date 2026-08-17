import { foldAccents } from './text'

/**
 * Exports de fichiers — CSV et déclenchement de téléchargement.
 *
 * Ces données appartiennent au commerçant : il doit pouvoir les sortir de
 * CLYDE pour sa comptabilité, sans nous demander la permission ni passer par
 * un tableur en ligne.
 */

/**
 * Échappement CSV.
 *
 * Un nom de plat contient volontiers une virgule (« Poulet DG, plantains ») et
 * une note contient des guillemets ou un retour à la ligne. Sans échappement,
 * ces trois caractères décalent toutes les colonnes suivantes et le fichier
 * s'ouvre en bouillie.
 */
function cell(value: string | number | null | undefined): string {
  if (value == null) return ''
  const raw = String(value)
  if (/[",;\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`
  return raw
}

/**
 * Assemble un CSV à partir d'en-têtes et de lignes.
 *
 * Séparateur point-virgule et BOM UTF-8 : c'est ce qu'attend Excel dans les
 * régions à virgule décimale. Avec une virgule comme séparateur, Excel colle
 * toute la ligne dans une seule cellule ; sans le BOM, il affiche « Poulet
 * DG » avec des caractères accentués cassés.
 */
export function buildCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
): string {
  const lines = [headers.map(cell).join(';')]
  for (const row of rows) lines.push(row.map(cell).join(';'))
  /* CRLF : le format que tous les tableurs acceptent sans discuter. */
  return `\uFEFF${lines.join('\r\n')}`
}

/** Nom de fichier sûr : sans accent, sans espace, sans caractère interdit. */
export function safeFilename(...parts: string[]): string {
  return parts
    .map((p) => foldAccents(p).toLowerCase().replace(/[^a-z0-9]+/g, '-'))
    .filter(Boolean)
    .join('-')
    .replace(/^-+|-+$/g, '')
}

/** Date du jour en `AAAA-MM-JJ`, pour horodater un nom de fichier. */
export function todayStamp(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const j = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${j}`
}

/**
 * Déclenche le téléchargement d'un blob.
 *
 * L'URL est révoquée après le clic, sinon chaque export laisse un objet en
 * mémoire jusqu'au rechargement de l'onglet.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  /* Un délai laisse au navigateur le temps d'amorcer le téléchargement :
     révoquer immédiatement l'annule sur certains navigateurs mobiles. */
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Télécharge un CSV déjà assemblé. */
export function downloadCsv(content: string, filename: string): void {
  downloadBlob(
    new Blob([content], { type: 'text/csv;charset=utf-8;' }),
    filename,
  )
}
