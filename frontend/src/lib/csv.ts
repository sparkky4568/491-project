type Cell = string | number | boolean | null

/** RFC 4180 CSV. Text cells that a spreadsheet would run as a formula get a leading apostrophe. */
export function toCsv(headers: string[], rows: Cell[][]): string {
  const escape = (cell: Cell) => {
    if (cell === null) return ''
    let text = String(cell)
    if (typeof cell === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n')
}

export function downloadCsv(fileName: string, csv: string): void {
  // The BOM makes Excel read the file as UTF-8 (curly quotes, ≥ signs).
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
