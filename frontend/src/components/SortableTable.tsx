import { useState } from 'react'
import { Icon } from './Icon'

export type SortDir = 'asc' | 'desc'
export interface SortState<K extends string> {
  key: K
  dir: SortDir
}

export function useSort<K extends string>(initial: K, dir: SortDir = 'asc') {
  const [sort, setSort] = useState<SortState<K>>({ key: initial, dir })
  const toggle = (key: K) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  return { sort, toggle }
}

type Sortable = string | number | boolean | null | undefined

/** Compares two cell values. Empty values always sort last. */
export function compareValues(a: Sortable, b: Sortable, dir: SortDir): number {
  const aEmpty = a === null || a === undefined || a === ''
  const bEmpty = b === null || b === undefined || b === ''
  if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1
  const result =
    typeof a === 'number' && typeof b === 'number'
      ? a - b
      : String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
  return dir === 'asc' ? result : -result
}

export function SortHeader<K extends string>({
  label,
  column,
  sort,
  onSort,
  align = 'left',
  className = '',
}: {
  label: string
  column: K
  sort: SortState<K>
  onSort: (key: K) => void
  align?: 'left' | 'right'
  className?: string
}) {
  const active = sort.key === column
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-3 py-2 font-medium whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1 rounded hover:text-slate-950 dark:hover:text-white ${align === 'right' ? 'flex-row-reverse' : ''}`}
      >
        {label}
        <Icon
          name={active ? (sort.dir === 'asc' ? 'arrowUp' : 'arrowDown') : 'sort'}
          className={`h-3.5 w-3.5 ${active ? '' : 'opacity-40'}`}
        />
      </button>
    </th>
  )
}

export const tableClass = 'min-w-full border-collapse text-sm'
export const theadClass =
  'border-b border-slate-200 bg-slate-50 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
export const rowClass =
  'border-b border-slate-100 align-top last:border-b-0 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/40'
export const cellClass = 'px-3 py-2.5'
