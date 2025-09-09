import React from 'react'
import { cn } from '@/lib/utils'

interface MainContentProps {
  children: React.ReactNode
  className?: string
}

const MainContent: React.FC<MainContentProps> = ({ children, className }) => {
  return (
    <main 
      className={cn(
        "flex-1 overflow-auto",
        "bg-gradient-to-br from-background to-muted/50",
        "p-6",
        className
      )}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {children}
      </div>
    </main>
  )
}

export default MainContent