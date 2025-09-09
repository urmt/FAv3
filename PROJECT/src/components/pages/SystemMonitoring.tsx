import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'
import {
  Activity,
  Cpu,
  Memory,
  HardDrive,
  Zap,
  AlertTriangle,
  X,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Thermometer,
  Wifi
} from 'lucide-react'
import { useAppStore, SystemMetrics, SystemAlert } from '@/lib/store'
import { apiService } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ProcessInfo {
  pid: number
  name: string
  cpu_percent: number
  memory_percent: number
  memory_mb: number
  status: string
  create_time: string
  cmdline: string[]
}

const SystemMonitoring: React.FC = () => {
  const { currentMetrics, activeAlerts, setActiveAlerts } = useAppStore()
  const [metricsHistory, setMetricsHistory] = useState<SystemMetrics[]>([])
  const [processes, setProcesses] = useState<ProcessInfo[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [sortBy, setSortBy] = useState<'memory' | 'cpu'>('memory')

  useEffect(() => {
    loadProcesses()
    loadMetricsHistory()
  }, [])

  const loadProcesses = async () => {
    try {
      const processData = await apiService.getProcessList(sortBy, 15)
      setProcesses(processData)
    } catch (error) {
      console.error('Failed to load processes:', error)
    }
  }

  const loadMetricsHistory = async () => {
    try {
      const historyData = await apiService.getMetricsHistory(60) // Last 60 minutes
      setMetricsHistory(historyData.metrics_history || [])
    } catch (error) {
      console.error('Failed to load metrics history:', error)
    }
  }

  const dismissAlert = async (index: number) => {
    try {
      await apiService.dismissAlert(index)
      const updatedAlerts = activeAlerts.filter((_, i) => i !== index)
      setActiveAlerts(updatedAlerts)
      toast.success('Alert dismissed')
    } catch (error) {
      toast.error('Failed to dismiss alert')
      console.error('Failed to dismiss alert:', error)
    }
  }

  const refreshAll = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        loadProcesses(),
        loadMetricsHistory()
      ])
      toast.success('Data refreshed')
    } catch (error) {
      toast.error('Failed to refresh data')
    } finally {
      setIsRefreshing(false)
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getMetricColor = (value: number, type: 'cpu' | 'memory' | 'disk' = 'cpu') => {
    const thresholds = {
      cpu: { warning: 70, critical: 85 },
      memory: { warning: 80, critical: 90 },
      disk: { warning: 85, critical: 95 }
    }
    
    const threshold = thresholds[type]
    if (value >= threshold.critical) return 'text-red-500'
    if (value >= threshold.warning) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getProgressColor = (value: number, type: 'cpu' | 'memory' | 'disk' = 'cpu') => {
    const thresholds = {
      cpu: { warning: 70, critical: 85 },
      memory: { warning: 80, critical: 90 },
      disk: { warning: 85, critical: 95 }
    }
    
    const threshold = thresholds[type]
    if (value >= threshold.critical) return 'bg-red-500'
    if (value >= threshold.warning) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const criticalAlerts = activeAlerts.filter(alert => alert.level === 'critical')
  const warningAlerts = activeAlerts.filter(alert => alert.level === 'warning')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Monitoring</h1>
          <p className="text-muted-foreground mt-2">
            Real-time system performance metrics and resource monitoring
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={refreshAll}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              <span>Active Alerts ({activeAlerts.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeAlerts.map((alert, index) => (
                <div 
                  key={index}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    alert.level === 'critical' 
                      ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                      : "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <Badge 
                      variant={alert.level === 'critical' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {alert.level}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {alert.component} • {new Date(alert.timestamp * 1000).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dismissAlert(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", currentMetrics && getMetricColor(currentMetrics.cpu_percent, 'cpu'))}>
              {currentMetrics ? `${currentMetrics.cpu_percent.toFixed(1)}%` : 'N/A'}
            </div>
            {currentMetrics && (
              <Progress 
                value={currentMetrics.cpu_percent} 
                className="mt-2 h-2"
                indicatorClassName={getProgressColor(currentMetrics.cpu_percent, 'cpu')}
              />
            )}
          </CardContent>
        </Card>

        {/* Memory */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Memory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", currentMetrics && getMetricColor(currentMetrics.memory_percent, 'memory'))}>
              {currentMetrics ? `${currentMetrics.memory_percent.toFixed(1)}%` : 'N/A'}
            </div>
            {currentMetrics && (
              <>
                <Progress 
                  value={currentMetrics.memory_percent} 
                  className="mt-2 h-2"
                  indicatorClassName={getProgressColor(currentMetrics.memory_percent, 'memory')}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {(currentMetrics.memory_used / 1024).toFixed(1)}GB / 
                  {(currentMetrics.memory_total / 1024).toFixed(1)}GB
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Disk */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", currentMetrics && getMetricColor(currentMetrics.disk_percent, 'disk'))}>
              {currentMetrics ? `${currentMetrics.disk_percent.toFixed(1)}%` : 'N/A'}
            </div>
            {currentMetrics && (
              <>
                <Progress 
                  value={currentMetrics.disk_percent} 
                  className="mt-2 h-2"
                  indicatorClassName={getProgressColor(currentMetrics.disk_percent, 'disk')}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {currentMetrics.disk_used}GB / {currentMetrics.disk_total}GB
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* GPU/Temperature */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {currentMetrics?.gpu_utilization !== undefined ? 'GPU Usage' : 'Temperature'}
            </CardTitle>
            {currentMetrics?.gpu_utilization !== undefined ? (
              <Zap className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Thermometer className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMetrics?.gpu_utilization !== undefined
                ? `${currentMetrics.gpu_utilization.toFixed(1)}%`
                : currentMetrics?.temperature
                ? `${currentMetrics.temperature.toFixed(1)}°C`
                : 'N/A'
              }
            </div>
            {currentMetrics?.gpu_utilization !== undefined && (
              <Progress 
                value={currentMetrics.gpu_utilization} 
                className="mt-2 h-2"
                indicatorClassName={getProgressColor(currentMetrics.gpu_utilization, 'cpu')}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="metrics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="processes">Running Processes</TabsTrigger>
          <TabsTrigger value="network">Network Activity</TabsTrigger>
        </TabsList>

        {/* Performance Metrics Charts */}
        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>CPU & Memory Usage</CardTitle>
                <CardDescription>Historical performance over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metricsHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatTimestamp}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      labelFormatter={(value) => `Time: ${formatTimestamp(value as number)}`}
                      formatter={(value: number, name: string) => [
                        `${value.toFixed(1)}%`, 
                        name === 'cpu_percent' ? 'CPU' : 'Memory'
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cpu_percent" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="memory_percent" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Network Activity</CardTitle>
                <CardDescription>Data transfer over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metricsHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatTimestamp}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => `Time: ${formatTimestamp(value as number)}`}
                      formatter={(value: number, name: string) => [
                        `${value} MB`, 
                        name === 'network_sent' ? 'Sent' : 'Received'
                      ]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="network_sent" 
                      stackId="1"
                      stroke="#10b981" 
                      fill="#10b981"
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="network_recv" 
                      stackId="1"
                      stroke="#f59e0b" 
                      fill="#f59e0b"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Running Processes */}
        <TabsContent value="processes" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Running Processes</CardTitle>
                  <CardDescription>Top resource-consuming processes</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant={sortBy === 'memory' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {setSortBy('memory'); loadProcesses()}}
                  >
                    Sort by Memory
                  </Button>
                  <Button
                    variant={sortBy === 'cpu' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {setSortBy('cpu'); loadProcesses()}}
                  >
                    Sort by CPU
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {processes.map((process, index) => (
                  <div key={process.pid} className="flex items-center space-x-4 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 text-sm text-muted-foreground">
                      #{index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium truncate">{process.name}</p>
                        <Badge variant="outline" className="text-xs">
                          PID {process.pid}
                        </Badge>
                        <Badge 
                          variant={process.status === 'running' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {process.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {process.cmdline.slice(0, 3).join(' ')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="text-right">
                        <p className="font-medium">{process.cpu_percent.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">CPU</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{process.memory_mb.toFixed(0)} MB</p>
                        <p className="text-xs text-muted-foreground">
                          {process.memory_percent.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Network Activity */}
        <TabsContent value="network" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Wifi className="w-5 h-5" />
                <span>Network Activity</span>
              </CardTitle>
              <CardDescription>
                Current network statistics and activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentMetrics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Data Sent</span>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="font-medium">{currentMetrics.network_sent} MB</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Data Received</span>
                      <div className="flex items-center space-x-2">
                        <TrendingDown className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">{currentMetrics.network_recv} MB</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {(currentMetrics.network_sent + currentMetrics.network_recv).toFixed(1)} MB
                      </p>
                      <p className="text-sm text-muted-foreground">Total Transfer</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Wifi className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No network data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SystemMonitoring