import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import {
  Settings as SettingsIcon,
  Monitor,
  Palette,
  Bell,
  Shield,
  HardDrive,
  Brain,
  Zap,
  Download,
  Save,
  RotateCcw,
  Import,
  FileDown
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { useTheme } from 'next-themes'
import { apiService } from '@/lib/api'
import { toast } from 'sonner'

const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme()
  const { sidebarCollapsed, setSidebarCollapsed } = useAppStore()
  
  // Performance settings
  const [cpuThreshold, setCpuThreshold] = useState([75])
  const [memoryThreshold, setMemoryThreshold] = useState([80])
  const [diskThreshold, setDiskThreshold] = useState([85])
  const [gpuThreshold, setGpuThreshold] = useState([85])
  
  // Notification settings
  const [enableNotifications, setEnableNotifications] = useState(true)
  const [criticalAlertsOnly, setCriticalAlertsOnly] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  
  // Model settings
  const [autoDownload, setAutoDownload] = useState(false)
  const [maxConcurrentDownloads, setMaxConcurrentDownloads] = useState([2])
  const [cacheSize, setCacheSize] = useState([3])
  const [autoCleanup, setAutoCleanup] = useState(true)
  
  // Storage settings
  const [modelStoragePath, setModelStoragePath] = useState('./models')
  const [cacheStoragePath, setCacheStoragePath] = useState('./cache')
  const [maxStorageSize, setMaxStorageSize] = useState([50])
  
  // Advanced settings
  const [updateInterval, setUpdateInterval] = useState([30])
  const [logLevel, setLogLevel] = useState('INFO')
  const [enableDebugMode, setEnableDebugMode] = useState(false)
  const [enableTelemetry, setEnableTelemetry] = useState(false)

  const saveSettings = async () => {
    try {
      // Update alert thresholds
      await apiService.updateAlertThresholds({
        cpu_warning: cpuThreshold[0],
        memory_warning: memoryThreshold[0],
        disk_warning: diskThreshold[0],
        gpu_warning: gpuThreshold[0],
        cpu_critical: cpuThreshold[0] + 15,
        memory_critical: memoryThreshold[0] + 10,
        disk_critical: diskThreshold[0] + 10,
        gpu_critical: gpuThreshold[0] + 10
      })
      
      toast.success('Settings saved successfully')
    } catch (error) {
      toast.error('Failed to save settings')
      console.error('Failed to save settings:', error)
    }
  }

  const resetSettings = () => {
    setCpuThreshold([75])
    setMemoryThreshold([80])
    setDiskThreshold([85])
    setGpuThreshold([85])
    setEnableNotifications(true)
    setCriticalAlertsOnly(false)
    setSoundEnabled(false)
    setAutoDownload(false)
    setMaxConcurrentDownloads([2])
    setCacheSize([3])
    setAutoCleanup(true)
    setModelStoragePath('./models')
    setCacheStoragePath('./cache')
    setMaxStorageSize([50])
    setUpdateInterval([30])
    setLogLevel('INFO')
    setEnableDebugMode(false)
    setEnableTelemetry(false)
    
    toast.success('Settings reset to defaults')
  }

  const exportSettings = () => {
    const settings = {
      theme,
      sidebarCollapsed,
      performance: {
        cpuThreshold: cpuThreshold[0],
        memoryThreshold: memoryThreshold[0],
        diskThreshold: diskThreshold[0],
        gpuThreshold: gpuThreshold[0]
      },
      notifications: {
        enableNotifications,
        criticalAlertsOnly,
        soundEnabled
      },
      models: {
        autoDownload,
        maxConcurrentDownloads: maxConcurrentDownloads[0],
        cacheSize: cacheSize[0],
        autoCleanup
      },
      storage: {
        modelStoragePath,
        cacheStoragePath,
        maxStorageSize: maxStorageSize[0]
      },
      advanced: {
        updateInterval: updateInterval[0],
        logLevel,
        enableDebugMode,
        enableTelemetry
      }
    }
    
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'fav2-settings.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Settings exported successfully')
  }

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target?.result as string)
        
        // Apply imported settings
        if (settings.theme) setTheme(settings.theme)
        if (settings.sidebarCollapsed !== undefined) setSidebarCollapsed(settings.sidebarCollapsed)
        
        if (settings.performance) {
          setCpuThreshold([settings.performance.cpuThreshold || 75])
          setMemoryThreshold([settings.performance.memoryThreshold || 80])
          setDiskThreshold([settings.performance.diskThreshold || 85])
          setGpuThreshold([settings.performance.gpuThreshold || 85])
        }
        
        if (settings.notifications) {
          setEnableNotifications(settings.notifications.enableNotifications ?? true)
          setCriticalAlertsOnly(settings.notifications.criticalAlertsOnly ?? false)
          setSoundEnabled(settings.notifications.soundEnabled ?? false)
        }
        
        if (settings.models) {
          setAutoDownload(settings.models.autoDownload ?? false)
          setMaxConcurrentDownloads([settings.models.maxConcurrentDownloads || 2])
          setCacheSize([settings.models.cacheSize || 3])
          setAutoCleanup(settings.models.autoCleanup ?? true)
        }
        
        if (settings.storage) {
          setModelStoragePath(settings.storage.modelStoragePath || './models')
          setCacheStoragePath(settings.storage.cacheStoragePath || './cache')
          setMaxStorageSize([settings.storage.maxStorageSize || 50])
        }
        
        if (settings.advanced) {
          setUpdateInterval([settings.advanced.updateInterval || 30])
          setLogLevel(settings.advanced.logLevel || 'INFO')
          setEnableDebugMode(settings.advanced.enableDebugMode ?? false)
          setEnableTelemetry(settings.advanced.enableTelemetry ?? false)
        }
        
        toast.success('Settings imported successfully')
      } catch (error) {
        toast.error('Failed to import settings: Invalid file format')
        console.error('Import failed:', error)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure your Enhanced FAv2 Local AI Assistant preferences
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={resetSettings}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={saveSettings}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="models">AI Models</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="w-5 h-5" />
                <span>Appearance & Display</span>
              </CardTitle>
              <CardDescription>
                Customize the visual appearance of the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="theme-select">Theme</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="sidebar-collapsed"
                    checked={sidebarCollapsed}
                    onCheckedChange={setSidebarCollapsed}
                  />
                  <Label htmlFor="sidebar-collapsed">Collapse sidebar by default</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Monitor className="w-5 h-5" />
                <span>Performance Monitoring</span>
              </CardTitle>
              <CardDescription>
                Configure alert thresholds for system resource monitoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div>
                  <Label>CPU Usage Warning Threshold: {cpuThreshold[0]}%</Label>
                  <Slider
                    value={cpuThreshold}
                    onValueChange={setCpuThreshold}
                    max={100}
                    min={10}
                    step={5}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label>Memory Usage Warning Threshold: {memoryThreshold[0]}%</Label>
                  <Slider
                    value={memoryThreshold}
                    onValueChange={setMemoryThreshold}
                    max={100}
                    min={10}
                    step={5}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label>Disk Usage Warning Threshold: {diskThreshold[0]}%</Label>
                  <Slider
                    value={diskThreshold}
                    onValueChange={setDiskThreshold}
                    max={100}
                    min={10}
                    step={5}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label>GPU Usage Warning Threshold: {gpuThreshold[0]}%</Label>
                  <Slider
                    value={gpuThreshold}
                    onValueChange={setGpuThreshold}
                    max={100}
                    min={10}
                    step={5}
                    className="mt-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>Notifications & Alerts</span>
              </CardTitle>
              <CardDescription>
                Configure how you receive system alerts and notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enable-notifications"
                    checked={enableNotifications}
                    onCheckedChange={setEnableNotifications}
                  />
                  <Label htmlFor="enable-notifications">Enable notifications</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="critical-alerts-only"
                    checked={criticalAlertsOnly}
                    onCheckedChange={setCriticalAlertsOnly}
                    disabled={!enableNotifications}
                  />
                  <Label htmlFor="critical-alerts-only">Show critical alerts only</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="sound-enabled"
                    checked={soundEnabled}
                    onCheckedChange={setSoundEnabled}
                    disabled={!enableNotifications}
                  />
                  <Label htmlFor="sound-enabled">Enable notification sounds</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Models Tab */}
        <TabsContent value="models" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-5 h-5" />
                <span>AI Model Management</span>
              </CardTitle>
              <CardDescription>
                Configure AI model download and management behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-download"
                    checked={autoDownload}
                    onCheckedChange={setAutoDownload}
                  />
                  <Label htmlFor="auto-download">Auto-download recommended models</Label>
                </div>
                
                <div>
                  <Label>Maximum Concurrent Downloads: {maxConcurrentDownloads[0]}</Label>
                  <Slider
                    value={maxConcurrentDownloads}
                    onValueChange={setMaxConcurrentDownloads}
                    max={5}
                    min={1}
                    step={1}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label>Model Cache Size: {cacheSize[0]} models</Label>
                  <Slider
                    value={cacheSize}
                    onValueChange={setCacheSize}
                    max={10}
                    min={1}
                    step={1}
                    className="mt-2"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-cleanup"
                    checked={autoCleanup}
                    onCheckedChange={setAutoCleanup}
                  />
                  <Label htmlFor="auto-cleanup">Automatically cleanup unused models</Label>
                </div>
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
                <span>Storage Management</span>
              </CardTitle>
              <CardDescription>
                Configure storage paths and limits for models and cache
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="model-storage-path">Model Storage Path</Label>
                  <Input
                    id="model-storage-path"
                    value={modelStoragePath}
                    onChange={(e) => setModelStoragePath(e.target.value)}
                    placeholder="./models"
                  />
                </div>
                
                <div>
                  <Label htmlFor="cache-storage-path">Cache Storage Path</Label>
                  <Input
                    id="cache-storage-path"
                    value={cacheStoragePath}
                    onChange={(e) => setCacheStoragePath(e.target.value)}
                    placeholder="./cache"
                  />
                </div>
                
                <div>
                  <Label>Maximum Storage Size: {maxStorageSize[0]} GB</Label>
                  <Slider
                    value={maxStorageSize}
                    onValueChange={setMaxStorageSize}
                    max={500}
                    min={10}
                    step={10}
                    className="mt-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="w-5 h-5" />
                <span>Advanced Settings</span>
              </CardTitle>
              <CardDescription>
                Advanced configuration options for power users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div>
                  <Label>Update Interval: {updateInterval[0]} seconds</Label>
                  <Slider
                    value={updateInterval}
                    onValueChange={setUpdateInterval}
                    max={300}
                    min={5}
                    step={5}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="log-level">Log Level</Label>
                  <Select value={logLevel} onValueChange={setLogLevel}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEBUG">Debug</SelectItem>
                      <SelectItem value="INFO">Info</SelectItem>
                      <SelectItem value="WARNING">Warning</SelectItem>
                      <SelectItem value="ERROR">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enable-debug-mode"
                    checked={enableDebugMode}
                    onCheckedChange={setEnableDebugMode}
                  />
                  <Label htmlFor="enable-debug-mode">Enable debug mode</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enable-telemetry"
                    checked={enableTelemetry}
                    onCheckedChange={setEnableTelemetry}
                  />
                  <Label htmlFor="enable-telemetry">Enable anonymous telemetry</Label>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="w-5 h-5" />
                <span>Import & Export</span>
              </CardTitle>
              <CardDescription>
                Backup and restore your settings configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4">
                <Button onClick={exportSettings} variant="outline">
                  <FileDown className="w-4 h-4 mr-2" />
                  Export Settings
                </Button>
                
                <div>
                  <input
                    type="file"
                    accept=".json"
                    onChange={importSettings}
                    style={{ display: 'none' }}
                    id="import-settings"
                  />
                  <Button 
                    onClick={() => document.getElementById('import-settings')?.click()}
                    variant="outline"
                  >
                    <Import className="w-4 h-4 mr-2" />
                    Import Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Settings