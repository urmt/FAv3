import React from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import {
  Sun,
  Moon,
  Search,
  Bell,
  User,
  Settings,
  HelpCircle,
  LogOut,
  Wifi,
  WifiOff
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const Header: React.FC = () => {
  const { theme, setTheme } = useTheme()
  const { activeAlerts, currentMetrics } = useAppStore()
  const [isOnline, setIsOnline] = React.useState(navigator.onLine)

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const criticalAlerts = activeAlerts.filter(alert => alert.level === 'critical')
  const warningAlerts = activeAlerts.filter(alert => alert.level === 'warning')
  const totalAlerts = criticalAlerts.length + warningAlerts.length

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Search */}
        <div className="flex items-center space-x-4 flex-1">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search models, commands, or documentation..."
              className="pl-10 pr-4 bg-background"
            />
          </div>
        </div>

        {/* Right side - Status and controls */}
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-sm text-muted-foreground hidden sm:inline">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-500" />
                <span className="text-sm text-muted-foreground hidden sm:inline">Offline</span>
              </>
            )}
          </div>

          {/* System Performance Indicator */}
          {currentMetrics && (
            <div className="hidden md:flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  currentMetrics.cpu_percent > 80 ? "bg-red-500" :
                  currentMetrics.cpu_percent > 60 ? "bg-yellow-500" : "bg-green-500"
                )} />
                <span className="text-xs text-muted-foreground">
                  CPU {currentMetrics.cpu_percent.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  currentMetrics.memory_percent > 80 ? "bg-red-500" :
                  currentMetrics.memory_percent > 60 ? "bg-yellow-500" : "bg-green-500"
                )} />
                <span className="text-xs text-muted-foreground">
                  RAM {currentMetrics.memory_percent.toFixed(0)}%
                </span>
              </div>
            </div>
          )}

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative" title="Notifications">
                <Bell className="w-4 h-4" />
                {totalAlerts > 0 && (
                  <Badge 
                    variant={criticalAlerts.length > 0 ? "destructive" : "secondary"}
                    className="absolute -top-2 -right-2 px-1 min-w-[1.25rem] h-5 text-xs"
                  >
                    {totalAlerts}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-2">
                <h3 className="font-semibold mb-2">System Alerts</h3>
                {totalAlerts === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No active alerts
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {criticalAlerts.map((alert, index) => (
                      <div key={index} className="p-2 bg-red-50 dark:bg-red-950/20 rounded border-l-2 border-red-500">
                        <div className="flex items-center space-x-2">
                          <Badge variant="destructive" className="text-xs">Critical</Badge>
                          <span className="text-xs text-muted-foreground">
                            {alert.component}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{alert.message}</p>
                      </div>
                    ))}
                    {warningAlerts.map((alert, index) => (
                      <div key={index} className="p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded border-l-2 border-yellow-500">
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">Warning</Badge>
                          <span className="text-xs text-muted-foreground">
                            {alert.component}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{alert.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" title="User menu">
                <User className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <HelpCircle className="w-4 h-4 mr-2" />
                Help & Documentation
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Exit Application
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

export default Header