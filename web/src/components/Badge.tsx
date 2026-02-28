import { getStatusColor, capFirst } from '../lib/utils'
import { ReactNode } from 'react'

interface Props {
  status?: string
  variant?: string
  label?: string
  children?: ReactNode
}

export default function Badge({ status, variant, label, children }: Props) {
  const key = variant ?? status ?? 'neutral'
  const cls = getStatusColor(key)
  return (
    <span className={cls}>
      {children ?? label ?? capFirst(key)}
    </span>
  )
}
