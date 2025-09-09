import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Terminal,
  Play,
  Square,
  Package,
  HardDrive,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  RefreshCw,
  FileText,
  Settings,
  Loader2
} from 'lucide-react'
import { apiService } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface TaskResult {
  success: boolean
  message: string
  output?: string
  error?: string
  exit_code?: number
}

interface SystemService {
  name: string
  status: string
  enabled: boolean
  description: string
}

interface MountPoint {
  device: string
  mountpoint: string
  fstype: string
  opts: string
  size: string
  used: string
  available: string
  use_percent: string
}

const SystemAdmin: React.FC = () => {
  const [command, setCommand] = useState('')
  const [commandOutput, setCommandOutput] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [requireSudo, setRequireSudo] = useState(false)
  
  const [services, setServices] = useState<SystemService[]>([])
  const [mountPoints, setMountPoints] = useState<MountPoint[]>([])
  const [systemLogs, setSystemLogs] = useState('')
  const [diagnostics, setDiagnostics] = useState<any>(null)
  
  const [selectedService, setSelectedService] = useState('')
  const [serviceAction, setServiceAction] = useState('')
  const [packageName, setPackageName] = useState('')
  const [packageAction, setPackageAction] = useState('')
  
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadSystemData()
  }, [])

  const loadSystemData = async () => {
    setIsLoading(true)
    try {
      const [servicesData, mountsData] = await Promise.all([
        apiService.getServicesStatus(),
        apiService.getMountPoints()
      ])
      
      setServices(servicesData || [])
      setMountPoints(mountsData || [])
    } catch (error) {
      console.error('Failed to load system data:', error)
      toast.error('Failed to load system data')
    } finally {
      setIsLoading(false)
    }
  }

  const executeCommand = async () => {
    if (!command.trim()) {
      toast.error('Please enter a command')
      return
    }

    setIsExecuting(true)
    setCommandOutput('')
    
    try {
      const result = await apiService.executeCommand(command, 30, requireSudo)
      
      let output = ''
      if (result.success) {
        output = `✓ Command executed successfully\n`
        if (result.output) {
          output += `Output:\n${result.output}\n`
        }
      } else {
        output = `✗ Command failed (exit code: ${result.exit_code})\n`
        if (result.error) {
          output += `Error:\n${result.error}\n`
        }
        if (result.output) {
          output += `Output:\n${result.output}\n`
        }
      }
      
      setCommandOutput(output)
      
      if (result.success) {
        toast.success('Command executed successfully')
      } else {
        toast.error('Command execution failed')
      }
    } catch (error) {
      const errorOutput = `✗ Failed to execute command\nError: ${error}\n`
      setCommandOutput(errorOutput)
      toast.error('Failed to execute command')
    } finally {
      setIsExecuting(false)
    }
  }

  const manageService = async () => {
    if (!selectedService || !serviceAction) {
      toast.error('Please select a service and action')
      return
    }

    try {
      const result = await apiService.manageService(serviceAction, selectedService)
      
      if (result.success) {
        toast.success(`Service ${serviceAction} completed successfully`)
        await loadSystemData() // Refresh services list
      } else {
        toast.error(`Service ${serviceAction} failed: ${result.message}`)
      }
    } catch (error) {
      toast.error(`Failed to ${serviceAction} service`)
      console.error('Service management failed:', error)
    }
  }

  const managePackage = async () => {
    if (!packageName || !packageAction) {
      toast.error('Please enter a package name and select an action')
      return
    }

    try {
      const result = await apiService.managePackage(packageAction, packageName)
      
      if (result.success) {
        toast.success(`Package ${packageAction} completed successfully`)
      } else {
        toast.error(`Package ${packageAction} failed: ${result.message}`)
      }
    } catch (error) {
      toast.error(`Failed to ${packageAction} package`)
      console.error('Package management failed:', error)
    }
  }

  const cleanSystem = async () => {
    try {
      const result = await apiService.cleanSystem()
      
      if (result.success) {
        toast.success('System cleanup completed')
        setCommandOutput(`System Cleanup Results:\n${result.output || result.message}\n`)
      } else {
        toast.error('System cleanup failed')
        setCommandOutput(`Cleanup failed: ${result.message}\n`)
      }
    } catch (error) {
      toast.error('Failed to clean system')
      console.error('System cleanup failed:', error)
    }
  }

  const loadSystemLogs = async (service?: string) => {
    try {
      const result = await apiService.getSystemLogs(service, 50)
      
      if (result.success) {
        setSystemLogs(result.logs || 'No logs available')
        toast.success('Logs loaded successfully')
      } else {
        setSystemLogs('Failed to load logs')
        toast.error('Failed to load logs')
      }
    } catch (error) {
      setSystemLogs('Error loading logs')
      toast.error('Failed to load logs')
      console.error('Failed to load logs:', error)
    }
  }

  const runDiagnostics = async () => {
    try {
      const result = await apiService.diagnoseSystem()
      setDiagnostics(result)
      toast.success('System diagnostics completed')
    } catch (error) {
      toast.error('Failed to run diagnostics')
      console.error('Diagnostics failed:', error)
    }
  }

  const getServiceStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'running':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'inactive':
      case 'stopped':
        return <Square className="w-4 h-4 text-gray-500" />
      case 'failed':
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />
    }
  }

  const quickCommands = [
    'ls -la',
    'df -h',
    'free -h',
    'ps aux | head -10',
    'systemctl status',
    'uname -a',
    'whoami',
    'uptime'
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Administration</h1>
          <p className="text-muted-foreground mt-2">
            Execute system commands, manage services, and perform administrative tasks
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={loadSystemData}
          disabled={isLoading}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="terminal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="terminal">Terminal</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        </TabsList>

        {/* Terminal Tab */}
        <TabsContent value="terminal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Terminal className="w-5 h-5" />
                <span>Command Terminal</span>
              </CardTitle>
              <CardDescription>
                Execute system commands with optional sudo privileges
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter command..."
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isExecuting && executeCommand()}
                    className="font-mono"
                    disabled={isExecuting}
                  />
                  <Button 
                    onClick={executeCommand}
                    disabled={isExecuting || !command.trim()}
                  >
                    {isExecuting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="require-sudo"
                    checked={requireSudo}
                    onChange={(e) => setRequireSudo(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="require-sudo" className="text-sm">
                    Require sudo privileges
                  </label>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground">Quick commands:</span>
                  {quickCommands.map((cmd, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => setCommand(cmd)}
                      className="font-mono text-xs"
                      disabled={isExecuting}
                    >
                      {cmd}
                    </Button>
                  ))}
                </div>
              </div>
              
              {commandOutput && (
                <div className="space-y-2">
                  <Separator />
                  <div>
                    <h4 className="font-medium text-sm mb-2">Output:</h4>
                    <pre className="bg-muted p-4 rounded-lg text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                      {commandOutput}
                    </pre>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-2">
                <Button variant="outline" onClick={cleanSystem}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clean System
                </Button>
                <Button variant="outline" onClick={() => loadSystemLogs()}>
                  <FileText className="w-4 h-4 mr-2" />
                  View System Logs
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Service Management</CardTitle>
                <CardDescription>
                  Start, stop, restart, or manage system services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.name} value={service.name}>
                          <div className="flex items-center space-x-2">
                            {getServiceStatusIcon(service.status)}
                            <span>{service.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={serviceAction} onValueChange={setServiceAction}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="start">Start</SelectItem>
                      <SelectItem value="stop">Stop</SelectItem>
                      <SelectItem value="restart">Restart</SelectItem>
                      <SelectItem value="enable">Enable</SelectItem>
                      <SelectItem value="disable">Disable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={manageService}
                  disabled={!selectedService || !serviceAction}
                  className="w-full"
                >
                  Execute Service Action
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>System Services</CardTitle>
                <CardDescription>
                  Current status of system services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {services.map((service, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <div className="flex items-center space-x-3">
                        {getServiceStatusIcon(service.status)}
                        <div>
                          <p className="font-medium text-sm">{service.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {service.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Badge 
                          variant={service.status === 'active' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {service.status}
                        </Badge>
                        {service.enabled && (
                          <Badge variant="outline" className="text-xs">
                            Enabled
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Packages Tab */}
        <TabsContent value="packages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="w-5 h-5" />
                <span>Package Management</span>
              </CardTitle>
              <CardDescription>
                Install, remove, or update system packages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="Package name"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                />
                
                <Select value={packageAction} onValueChange={setPackageAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="install">Install</SelectItem>
                    <SelectItem value="remove">Remove</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="search">Search</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  onClick={managePackage}
                  disabled={!packageName || !packageAction}
                >
                  Execute
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>Examples: git, curl, htop, vim, nodejs, python3-pip</p>
                <p className="text-xs mt-1">
                  Package management requires appropriate privileges and may take time to complete
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Storage Tab */}
        <TabsContent value="storage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <HardDrive className="w-5 h-5" />
                <span>Storage & Mount Points</span>
              </CardTitle>
              <CardDescription>
                View and manage filesystem mount points
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mountPoints.map((mount, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{mount.mountpoint}</p>
                        <p className="text-sm text-muted-foreground">{mount.device}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{mount.fstype}</Badge>
                        <Badge 
                          variant={parseInt(mount.use_percent) > 90 ? 'destructive' : 'secondary'}
                        >
                          {mount.use_percent} used
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Size:</span>
                        <p className="font-medium">{mount.size}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Used:</span>
                        <p className="font-medium">{mount.used}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Available:</span>
                        <p className="font-medium">{mount.available}</p>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Options: {mount.opts}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Diagnostics Tab */}
        <TabsContent value="diagnostics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>System Diagnostics</span>
              </CardTitle>
              <CardDescription>
                Run comprehensive system health checks and diagnostics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={runDiagnostics} className="w-full">
                <Activity className="w-4 h-4 mr-2" />
                Run Full System Diagnostics
              </Button>
              
              {diagnostics && (
                <div className="space-y-4">
                  <Separator />
                  
                  {diagnostics.issues_found.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-red-600">Issues Found:</h4>
                      <div className="space-y-2">
                        {diagnostics.issues_found.map((issue: string, index: number) => (
                          <div key={index} className="flex items-center space-x-2 p-2 bg-red-50 dark:bg-red-950/20 rounded">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <span className="text-sm">{issue}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Memory Information</h4>
                      <div className="space-y-1 text-sm">
                        <p>Total: {diagnostics.memory_info.total_gb} GB</p>
                        <p>Available: {diagnostics.memory_info.available_gb} GB</p>
                        <p>Usage: {diagnostics.memory_info.usage_percent}%</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm mb-2">Network Status</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center space-x-2">
                          {diagnostics.network_status.internet_connectivity ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          )}
                          <span>Internet Connectivity</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {diagnostics.network_status.dns_resolution ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          )}
                          <span>DNS Resolution</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm mb-2">Disk Usage</h4>
                    <div className="space-y-2">
                      {diagnostics.disk_usage.map((disk: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <span className="text-sm">{disk.mountpoint}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">{disk.usage_percent}% used</span>
                            <span className="text-xs text-muted-foreground">
                              {disk.available} available
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* System Logs Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <div /> {/* Hidden trigger */}
        </DialogTrigger>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>System Logs</DialogTitle>
            <DialogDescription>
              Recent system log entries
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <pre className="bg-muted p-4 rounded-lg text-xs font-mono whitespace-pre-wrap overflow-auto max-h-96">
              {systemLogs || 'No logs loaded'}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SystemAdmin