import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Cpu,
  Memory,
  HardDrive,
  Zap,
  Monitor,
  Thermometer,
  Info,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Settings
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { apiService } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const HardwareDetection: React.FC = () => {
  const { systemCapabilities, setSystemCapabilities } = useAppStore()
  const [optimizationRecommendations, setOptimizationRecommendations] = useState<Record<string, string>>({})
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    loadOptimizationRecommendations()
  }, [systemCapabilities])

  const loadOptimizationRecommendations = async () => {
    try {
      const response = await apiService.getOptimizationRecommendations()
      setOptimizationRecommendations(response.recommendations || {})
    } catch (error) {
      console.error('Failed to load optimization recommendations:', error)
    }
  }

  const refreshSystemInfo = async () => {
    setIsRefreshing(true)
    try {
      const capabilities = await apiService.getSystemCapabilities()
      setSystemCapabilities(capabilities)
      await loadOptimizationRecommendations()
      toast.success('System information refreshed')
    } catch (error) {
      toast.error('Failed to refresh system information')
      console.error('Failed to refresh:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const getPerformanceTierInfo = (tier: string) => {
    switch (tier) {
      case 'powerful':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-100 dark:bg-green-900/20',
          description: 'Excellent for large AI models and intensive tasks'
        }
      case 'medium':
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-100 dark:bg-blue-900/20',
          description: 'Good for most AI models and development tasks'
        }
      case 'lightweight':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
          description: 'Suitable for lightweight models and basic tasks'
        }
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-100 dark:bg-gray-900/20',
          description: 'Performance tier not determined'
        }
    }
  }

  if (!systemCapabilities) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Hardware Detection</h1>
            <p className="text-muted-foreground mt-2">
              Detecting system capabilities and hardware information...
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Analyzing hardware configuration...</p>
          </div>
        </div>
      </div>
    )
  }

  const tierInfo = getPerformanceTierInfo(systemCapabilities.performance_tier)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hardware Detection</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive analysis of your system's hardware capabilities and performance potential
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={refreshSystemInfo}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Performance Tier Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <div className={cn("w-4 h-4 rounded-full", tierInfo.bgColor)} />
            <span>Performance Tier: {systemCapabilities.performance_tier.charAt(0).toUpperCase() + systemCapabilities.performance_tier.slice(1)}</span>
          </CardTitle>
          <CardDescription className={tierInfo.color}>
            {tierInfo.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Recommended Models</h4>
              <div className="space-y-1">
                {systemCapabilities.recommended_models.slice(0, 3).map((model, index) => (
                  <div key={index} className="text-sm text-muted-foreground">
                    {model.split('/').pop()}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">System Type</h4>
              <p className="text-sm text-muted-foreground">
                {systemCapabilities.os_info.system} {systemCapabilities.os_info.release}
              </p>
              <p className="text-sm text-muted-foreground">
                {systemCapabilities.os_info.machine} architecture
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Optimization Score</h4>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">
                  {systemCapabilities.cpu.performance_score}/10
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Based on CPU, memory, and GPU capabilities
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hardware Components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Cpu className="w-5 h-5" />
              <span>CPU Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">Processor</h4>
              <p className="text-sm">{systemCapabilities.cpu.name}</p>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <span className="text-xs text-muted-foreground">Cores</span>
                  <p className="font-medium">{systemCapabilities.cpu.cores}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Threads</span>
                  <p className="font-medium">{systemCapabilities.cpu.threads}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Base Frequency</span>
                  <p className="font-medium">{(systemCapabilities.cpu.frequency / 1000).toFixed(1)} GHz</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Architecture</span>
                  <p className="font-medium">{systemCapabilities.cpu.architecture}</p>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Performance Score</span>
                <Badge variant="outline">
                  {systemCapabilities.cpu.performance_score}/10
                </Badge>
              </div>
              <Progress 
                value={(systemCapabilities.cpu.performance_score / 10) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Memory Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Memory className="w-5 h-5" />
              <span>Memory Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground">Total Memory</span>
                <p className="font-medium text-lg">
                  {(systemCapabilities.memory.total / 1024).toFixed(1)} GB
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Available</span>
                <p className="font-medium text-lg">
                  {(systemCapabilities.memory.available / 1024).toFixed(1)} GB
                </p>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Current Usage</span>
                <span className="text-sm">{systemCapabilities.memory.usage_percent.toFixed(1)}%</span>
              </div>
              <Progress 
                value={systemCapabilities.memory.usage_percent} 
                className="h-2"
                indicatorClassName={cn(
                  systemCapabilities.memory.usage_percent > 80 ? "bg-red-500" :
                  systemCapabilities.memory.usage_percent > 60 ? "bg-yellow-500" : "bg-green-500"
                )}
              />
            </div>
            
            <div className="text-xs text-muted-foreground">
              <p>Memory type: DDR4 (estimated)</p>
              <p>Suitable for models up to {(systemCapabilities.memory.total / 1024 * 0.7).toFixed(0)}GB</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GPU and Storage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GPU Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5" />
              <span>GPU Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {systemCapabilities.gpus.length > 0 ? (
              systemCapabilities.gpus.map((gpu, index) => (
                <div key={index} className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm mb-1">{gpu.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {gpu.vendor.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground">VRAM Total</span>
                      <p className="font-medium">{(gpu.memory_total / 1024).toFixed(1)} GB</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">VRAM Free</span>
                      <p className="font-medium">{(gpu.memory_free / 1024).toFixed(1)} GB</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      {gpu.cuda_support && (
                        <Badge variant="default" className="text-xs">
                          CUDA
                        </Badge>
                      )}
                      {gpu.opencl_support && (
                        <Badge variant="secondary" className="text-xs">
                          OpenCL
                        </Badge>
                      )}
                    </div>
                    
                    {gpu.compute_capability && (
                      <p className="text-xs text-muted-foreground">
                        Compute Capability: {gpu.compute_capability}
                      </p>
                    )}
                    {gpu.driver_version && (
                      <p className="text-xs text-muted-foreground">
                        Driver Version: {gpu.driver_version}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <Monitor className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No dedicated GPU detected</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Using CPU for AI model processing
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Storage Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <HardDrive className="w-5 h-5" />
              <span>Storage Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground">Total Storage</span>
                <p className="font-medium text-lg">{systemCapabilities.storage.total} GB</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Free Space</span>
                <p className="font-medium text-lg">{systemCapabilities.storage.free} GB</p>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Usage</span>
                <span className="text-sm">
                  {((systemCapabilities.storage.total - systemCapabilities.storage.free) / systemCapabilities.storage.total * 100).toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={(systemCapabilities.storage.total - systemCapabilities.storage.free) / systemCapabilities.storage.total * 100}
                className="h-2"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {systemCapabilities.storage.type.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended: 50GB+ free space for model downloads
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Optimization Recommendations */}
      {Object.keys(optimizationRecommendations).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Optimization Recommendations</span>
            </CardTitle>
            <CardDescription>
              Suggestions to improve your system's AI performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(optimizationRecommendations).map(([category, recommendation]) => (
                <Alert key={category}>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong className="capitalize">{category}:</strong> {recommendation}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default HardwareDetection