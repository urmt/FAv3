import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Home,
  Cpu,
  Brain,
  Code,
  Activity,
  Settings,
  Terminal,
  ChevronLeft,
  ChevronRight,
  Zap,
  AlertTriangle,
  MessageCircle
} from 'lucide-react'

const Sidebar: React.FC = () => {
  const location = useLocation()
  const { sidebarCollapsed, setSidebarCollapsed, activeAlerts, currentMetrics } = useAppStore()

  const navigationItems = [
    {
      title: 'Overview',
      href: '/',
      icon: Home,
      description: 'System overview and status'
    },
    {
      title: 'Hardware',
      href: '/hardware',
      icon: Cpu,
      description: 'Hardware detection and capabilities'
    },
    {
      title: 'AI Models',
      href: '/models',
      icon: Brain,
      description: 'Model management and recommendations'
    },
    {
      title: 'AI Chat',
      href: '/chat',
      icon: MessageCircle,
      description: 'Chat with loaded AI models'
    },
    {
      title: 'Code Generation',
      href: '/generate',
      icon: Code,
      description: 'AI-powered code generation'
    },
    {
      title: 'Monitoring',
      href: '/monitoring',
      icon: Activity,
      description: 'Performance monitoring and alerts'
    },
    {
      title: 'System Admin',
      href: '/admin',
      icon: Terminal,
      description: 'System administration tools'
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
      description: 'Application settings'
    }
  ]

  const criticalAlerts = activeAlerts.filter(alert => alert.level === 'critical')
  const warningAlerts = activeAlerts.filter(alert => alert.level === 'warning')

  return (
    <div 
      className={cn(
        "bg-card border-r border-border transition-all duration-300 ease-in-out",
        "flex flex-col h-full",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-lg">FAv2</h1>
                <p className="text-xs text-muted-foreground">Enhanced AI Assistant</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* System Status Indicators */}
      {!sidebarCollapsed && (
        <div className="p-4 space-y-2">
          <div className="text-xs font-medium text-muted-foreground mb-2">System Status</div>
          
          {/* CPU Usage */}
          {currentMetrics && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>CPU</span>
                <span className={cn(
                  currentMetrics.cpu_percent > 80 ? "text-red-500" :
                  currentMetrics.cpu_percent > 60 ? "text-yellow-500" : "text-green-500"
                )}>
                  {currentMetrics.cpu_percent.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1">
                <div 
                  className={cn(
                    "h-1 rounded-full transition-all",
                    currentMetrics.cpu_percent > 80 ? "bg-red-500" :
                    currentMetrics.cpu_percent > 60 ? "bg-yellow-500" : "bg-green-500"
                  )}
                  style={{ width: `${currentMetrics.cpu_percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Memory Usage */}
          {currentMetrics && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Memory</span>
                <span className={cn(
                  currentMetrics.memory_percent > 80 ? "text-red-500" :
                  currentMetrics.memory_percent > 60 ? "text-yellow-500" : "text-green-500"
                )}>
                  {currentMetrics.memory_percent.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1">
                <div 
                  className={cn(
                    "h-1 rounded-full transition-all",
                    currentMetrics.memory_percent > 80 ? "bg-red-500" :
                    currentMetrics.memory_percent > 60 ? "bg-yellow-500" : "bg-green-500"
                  )}
                  style={{ width: `${currentMetrics.memory_percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Alerts */}
          {(criticalAlerts.length > 0 || warningAlerts.length > 0) && (
            <div className="pt-2">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className="text-xs">
                  {criticalAlerts.length > 0 && (
                    <span className="text-red-500">{criticalAlerts.length} critical</span>
                  )}
                  {criticalAlerts.length > 0 && warningAlerts.length > 0 && <span>, </span>}
                  {warningAlerts.length > 0 && (
                    <span className="text-yellow-500">{warningAlerts.length} warning</span>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.href
            const Icon = item.icon

            return (
              <Link key={item.href} to={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    sidebarCollapsed ? "px-2" : "px-3",
                    isActive && "bg-secondary"
                  )}
                  title={sidebarCollapsed ? item.title : undefined}
                >
                  <Icon className="w-4 h-4" />
                  {!sidebarCollapsed && (
                    <span className="ml-3">{item.title}</span>
                  )}
                </Button>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      {!sidebarCollapsed && (
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground text-center">
            Enhanced FAv2 v2.0.0
          </div>
        </div>
      )}
    </div>
  )
}

export default Sidebar