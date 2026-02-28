import { Info } from 'lucide-react'

interface Props {
  children: React.ReactNode
  className?: string
}

export default function InstructionBanner({ children, className = '' }: Props) {
  return (
    <div className={`instruction-banner ${className}`}>
      <Info size={15} className="text-blue-400 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  )
}
