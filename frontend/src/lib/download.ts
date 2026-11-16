import { issueLogFileName, issuesToCsv, issuesToJsonl } from './format'
import type { IssueLogEntry } from './schema'

/** Saves the issue log as CSV or JSONL: the sponsor's 16 columns (deliv s10), in order. */
export function downloadIssueLog(issues: IssueLogEntry[], runId: string, format: 'csv' | 'jsonl') {
  const blob =
    format === 'csv'
      ? new Blob([issuesToCsv(issues)], { type: 'text/csv;charset=utf-8' })
      : new Blob([issuesToJsonl(issues)], { type: 'application/x-ndjson;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = issueLogFileName(runId, format)
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
