import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Activity,
  Cpu,
  HardDrive,
  Memory,
  Zap,
  AlertTriangle,
  CheckCircle,
  Brain,
  TrendingUp,
  Server,
  Wifi,
  RefreshCw
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const Overview: React.FC = () => {
  const {
    systemCapabilities,
    currentMetrics,
    activeAlerts,
    availableModels,
    loadedModels,
    downloadingModels
  } = useAppStore()

  const criticalAlerts = activeAlerts.filter(alert => alert.level === 'critical')
  const warningAlerts = activeAlerts.filter(alert => alert.level === 'warning')

  const downloadedModels = availableModels.filter(model => model.status === 'downloaded')
  const loadedModelCount = loadedModels.length

  const getSystemHealthStatus = () => {
    if (criticalAlerts.length > 0) return { status: 'critical', color: 'text-red-500', bgColor: 'bg-red-500' }
    if (warningAlerts.length > 0) return { status: 'warning', color: 'text-yellow-500', bgColor: 'bg-yellow-500' }
    return { status: 'healthy', color: 'text-green-500', bgColor: 'bg-green-500' }
  }

  const systemHealth = getSystemHealthStatus()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
          <p className="text-muted-foreground mt-2">
            Enhanced FAv2 Local AI Assistant - Real-time system status and AI model management
          </p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* System Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <div className={cn("w-3 h-3 rounded-full", systemHealth.bgColor)} />
            <span>System Health</span>
            <Badge variant={systemHealth.status === 'critical' ? 'destructive' : 
                           systemHealth.status === 'warning' ? 'secondary' : 'default'}>
              {systemHealth.status.charAt(0).toUpperCase() + systemHealth.status.slice(1)}
            </Badge>
          </CardTitle>
          <CardDescription>
            Overall system performance and alert status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Alerts</span>
                <span className="font-medium">{activeAlerts.length}</span>
              </div>
              <div className="flex space-x-2">
                {criticalAlerts.length > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {criticalAlerts.length} Critical
                  </Badge>
                )}
                {warningAlerts.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {warningAlerts.length} Warning
                  </Badge>
                )}
                {activeAlerts.length === 0 && (
                  <Badge variant="default" className="text-xs">
                    All Clear
                  </Badge>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Loaded Models</span>
                <span className="font-medium">{loadedModelCount}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Brain className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">
                  {downloadedModels.length} downloaded, {downloadingModels.size} downloading
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Connection</span>
                <div className="flex items-center space-x-1">
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-sm">Online</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">AI Service operational</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMetrics ? `${currentMetrics.cpu_percent.toFixed(1)}%` : 'N/A'}
            </div>
            {currentMetrics && (
              <>
                <Progress 
                  value={currentMetrics.cpu_percent} 
                  className="mt-2"
                  indicatorClassName={cn(
                    currentMetrics.cpu_percent > 80 ? "bg-red-500" :
                    currentMetrics.cpu_percent > 60 ? "bg-yellow-500" : "bg-green-500"
                  )}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {systemCapabilities?.cpu.cores} cores, {systemCapabilities?.cpu.threads} threads
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Memory Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Memory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMetrics ? `${currentMetrics.memory_percent.toFixed(1)}%` : 'N/A'}
            </div>
            {currentMetrics && (
              <>
                <Progress 
                  value={currentMetrics.memory_percent} 
                  className="mt-2"
                  indicatorClassName={cn(
                    currentMetrics.memory_percent > 80 ? "bg-red-500" :
                    currentMetrics.memory_percent > 60 ? "bg-yellow-500" : "bg-green-500"
                  )}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {(currentMetrics.memory_used / 1024).toFixed(1)}GB / 
                  {(currentMetrics.memory_total / 1024).toFixed(1)}GB
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Disk Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMetrics ? `${currentMetrics.disk_percent.toFixed(1)}%` : 'N/A'}
            </div>
            {currentMetrics && (
              <>
                <Progress 
                  value={currentMetrics.disk_percent} 
                  className="mt-2"
                  indicatorClassName={cn(
                    currentMetrics.disk_percent > 90 ? "bg-red-500" :
                    currentMetrics.disk_percent > 80 ? "bg-yellow-500" : "bg-green-500"
                  )}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {currentMetrics.disk_used}GB / {currentMetrics.disk_total}GB
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* GPU Usage (if available) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GPU Usage</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMetrics?.gpu_utilization ? `${currentMetrics.gpu_utilization.toFixed(1)}%` : 'N/A'}
            </div>
            {currentMetrics?.gpu_utilization !== undefined && (
              <>
                <Progress 
                  value={currentMetrics.gpu_utilization} 
                  className="mt-2"
                  indicatorClassName={cn(
                    currentMetrics.gpu_utilization > 80 ? "bg-red-500" :
                    currentMetrics.gpu_utilization > 60 ? "bg-yellow-500" : "bg-green-500"
                  )}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {systemCapabilities?.gpus[0]?.name || 'GPU detected'}
                </p>
              </>
            )}
            {!systemCapabilities?.gpus?.length && (
              <p className="text-xs text-muted-foreground mt-1">No GPU detected</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Information & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="w-5 h-5" />
              <span>System Information</span>
            </CardTitle>
            <CardDescription>
              Hardware capabilities and system details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {systemCapabilities ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm">Performance Tier</h4>
                    <Badge variant="outline" className="mt-1">
                      {systemCapabilities.performance_tier.charAt(0).toUpperCase() + 
                       systemCapabilities.performance_tier.slice(1)}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Operating System</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {systemCapabilities.os_info.system} {systemCapabilities.os_info.release}
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium text-sm mb-2">CPU</h4>
                  <p className="text-sm text-muted-foreground">
                    {systemCapabilities.cpu.name}
                  </p>
                  <div className="flex space-x-4 mt-1 text-xs text-muted-foreground">
                    <span>{systemCapabilities.cpu.cores} cores</span>
                    <span>{systemCapabilities.cpu.threads} threads</span>
                    <span>{(systemCapabilities.cpu.frequency / 1000).toFixed(1)} GHz</span>
                  </div>
                </div>
                
                {systemCapabilities.gpus.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">GPU</h4>
                    <p className="text-sm text-muted-foreground">
                      {systemCapabilities.gpus[0].name}
                    </p>
                    <div className="flex space-x-4 mt-1 text-xs text-muted-foreground">
                      <span>{(systemCapabilities.gpus[0].memory_total / 1024).toFixed(1)}GB VRAM</span>
                      <span>{systemCapabilities.gpus[0].vendor}</span>
                      {systemCapabilities.gpus[0].cuda_support && <span>CUDA</span>}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Loading system information...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity & Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Quick Actions</span>
            </CardTitle>
            <CardDescription>
              Common tasks and model management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <Button variant="outline" className="justify-start">
                <Brain className="w-4 h-4 mr-2" />
                Browse AI Models
              </Button>
              <Button variant="outline" className="justify-start">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Performance Metrics
              </Button>
              <Button variant="outline" className="justify-start">
                <CheckCircle className="w-4 h-4 mr-2" />
                Run System Diagnostics
              </Button>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-medium text-sm mb-2">Model Recommendations</h4>
              <div className="space-y-2">
                {systemCapabilities?.recommended_models.slice(0, 3).map((model, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {model.split('/').pop()}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      Recommended
                    </Badge>
                  </div>
                )) || (
                  <p className="text-sm text-muted-foreground">Loading recommendations...</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Overview