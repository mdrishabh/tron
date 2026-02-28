/**
 * Formatting and validation utilities.
 */

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffS = Math.floor(diffMs / 1000)
  if (diffS < 60) return `${diffS}s ago`
  const diffM = Math.floor(diffS / 60)
  if (diffM < 60) return `${diffM}m ago`
  const diffH = Math.floor(diffM / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  return `${diffD}d ago`
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4)
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    completed: 'badge-green',
    running: 'badge-green',
    in_progress: 'badge-green',
    ringing: 'badge-blue',
    queued: 'badge-blue',
    scheduled: 'badge-blue',
    paused: 'badge-yellow',
    failed: 'badge-red',
    no_answer: 'badge-red',
    busy: 'badge-red',
    cancelled: 'badge-gray',
    draft: 'badge-gray',
  }
  return map[status] || 'badge-gray'
}

export function capFirst(str: string): string {
  return str ? str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ') : ''
}
