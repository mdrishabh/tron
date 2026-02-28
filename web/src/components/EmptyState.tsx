import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 bg-[#1C1C26] rounded-xl flex items-center justify-center mb-4">
        <Icon size={24} className="text-[#555568]" />
      </div>
      <h3 className="text-sm font-medium text-[#F0F0F8] mb-1">{title}</h3>
      <p className="text-xs text-[#555568] max-w-sm mb-4">{description}</p>
      {action}
    </div>
  )
}
