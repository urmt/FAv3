import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
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
  Brain,
  Download,
  Play,
  Square,
  Search,
  Filter,
  Star,
  CheckCircle,
  AlertCircle,
  Clock,
  HardDrive,
  Zap,
  Info,
  RefreshCw,
  TrendingUp
} from 'lucide-react'
import { useAppStore, ModelInfo } from '@/lib/store'
import { apiService } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type ModelCategory = 'all' | 'programming' | 'code_analysis' | 'system_admin' | 'general' | 'conversational'
type ModelTier = 'all' | 'lightweight' | 'medium' | 'powerful'
type ModelSize = 'all' | 'tiny' | 'small' | 'medium' | 'large' | 'xlarge'

const ModelManagement: React.FC = () => {
  const {
    availableModels,
    loadedModels,
    downloadingModels,
    systemCapabilities,
    setAvailableModels,
    setLoadedModels,
    addDownloadingModel,
    removeDownloadingModel,
    updateModelStatus
  } = useAppStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ModelCategory>('all')
  const [selectedTier, setSelectedTier] = useState<ModelTier>('all')
  const [selectedSize, setSelectedSize] = useState<ModelSize>('all')
  const [showRecommendedOnly, setShowRecommendedOnly] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null)
  
  // Enhanced download progress tracking
  const [downloadProgress, setDownloadProgress] = useState<Record<string, any>>({})

  useEffect(() => {
    refreshModels()
  }, [])

  const refreshModels = async () => {
    setIsRefreshing(true)
    try {
      const models = await apiService.getModels()
      setAvailableModels(models)
      
      const loadedModelsData = await apiService.getLoadedModels()
      setLoadedModels(loadedModelsData.loaded_models || [])
      
      toast.success('Models refreshed')
    } catch (error) {
      toast.error('Failed to refresh models')
      console.error('Failed to refresh models:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const filteredModels = availableModels.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         model.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         model.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || model.category === selectedCategory
    const matchesTier = selectedTier === 'all' || model.performance_tier === selectedTier
    const matchesSize = selectedSize === 'all' || model.size === selectedSize
    
    const isRecommended = !showRecommendedOnly || 
      (systemCapabilities?.recommended_models.some(rec => 
        rec.includes(model.huggingface_repo || '') || rec.includes(model.id)
      ))
    
    return matchesSearch && matchesCategory && matchesTier && matchesSize && isRecommended
  })

  const handleDownloadModel = async (modelId: string) => {
    try {
      addDownloadingModel(modelId)
      updateModelStatus(modelId, 'downloading', 0)
      
      await apiService.downloadModel(modelId)
      
      // Start polling for download progress with enhanced details
      const pollProgress = setInterval(async () => {
        try {
          const progressData = await apiService.getDownloadProgress(modelId)
          
          if (progressData && progressData.progress !== undefined) {
            updateModelStatus(modelId, 'downloading', progressData.progress)
            
            // Store enhanced progress data
            setDownloadProgress(prev => ({
              ...prev,
              [modelId]: {
                progress: progressData.progress,
                speed: progressData.speed || 0,
                eta: progressData.eta || 0,
                status: progressData.status || 'Downloading...',
                downloadedSize: progressData.downloaded_size || 0,
                totalSize: progressData.total_size || 0
              }
            }))
            
            // Check if download is complete
            if (progressData.progress >= 100) {
              clearInterval(pollProgress)
              updateModelStatus(modelId, 'downloaded', 100)
              removeDownloadingModel(modelId)
              // Remove from progress tracking
              setDownloadProgress(prev => {
                const newProgress = { ...prev }
                delete newProgress[modelId]
                return newProgress
              })
              toast.success(`Model ${modelId} downloaded successfully`)
            }
          } else {
            // If no progress data, the download might be complete or failed
            // Check the model status from the models list
            const models = await apiService.getModels()
            const updatedModel = models.find(m => m.id === modelId)
            
            if (updatedModel) {
              if (updatedModel.status === 'downloaded') {
                clearInterval(pollProgress)
                updateModelStatus(modelId, 'downloaded', 100)
                removeDownloadingModel(modelId)
                setDownloadProgress(prev => {
                  const newProgress = { ...prev }
                  delete newProgress[modelId]
                  return newProgress
                })
                toast.success(`Model ${modelId} downloaded successfully`)
              } else if (updatedModel.status === 'error') {
                clearInterval(pollProgress)
                updateModelStatus(modelId, 'error')
                removeDownloadingModel(modelId)
                setDownloadProgress(prev => {
                  const newProgress = { ...prev }
                  delete newProgress[modelId]
                  return newProgress
                })
                toast.error(`Download failed for ${modelId}`)
              }
            }
          }
        } catch (error) {
          // Only clear on actual errors, not 404s which might be normal
          console.log('Progress polling error:', error)
          // Keep polling for a bit longer in case it's a temporary issue
        }
      }, 1000) // Poll every second for more responsive updates
      
      // Set a timeout to stop polling after 10 minutes
      setTimeout(() => {
        if (downloadingModels.has(modelId)) {
          clearInterval(pollProgress)
          updateModelStatus(modelId, 'error')
          removeDownloadingModel(modelId)
          setDownloadProgress(prev => {
            const newProgress = { ...prev }
            delete newProgress[modelId]
            return newProgress
          })
          toast.error(`Download timeout for ${modelId}`)
        }
      }, 600000) // 10 minutes timeout
      
    } catch (error) {
      updateModelStatus(modelId, 'error')
      removeDownloadingModel(modelId)
      toast.error(`Failed to start download for ${modelId}`)
      console.error('Download failed:', error)
    }
  }

  const handleLoadModel = async (modelId: string) => {
    try {
      updateModelStatus(modelId, 'loading')
      await apiService.loadModel(modelId)
      updateModelStatus(modelId, 'loaded')
      
      const loadedModelsData = await apiService.getLoadedModels()
      setLoadedModels(loadedModelsData.loaded_models || [])
      
      toast.success(`Model ${modelId} loaded successfully`)
    } catch (error) {
      updateModelStatus(modelId, 'downloaded')
      toast.error(`Failed to load model ${modelId}`)
      console.error('Load failed:', error)
    }
  }

  const handleUnloadModel = async (modelId: string) => {
    try {
      await apiService.unloadModel(modelId)
      updateModelStatus(modelId, 'downloaded')
      
      const loadedModelsData = await apiService.getLoadedModels()
      setLoadedModels(loadedModelsData.loaded_models || [])
      
      toast.success(`Model ${modelId} unloaded successfully`)
    } catch (error) {
      toast.error(`Failed to unload model ${modelId}`)
      console.error('Unload failed:', error)
    }
  }

  const getModelStatusIcon = (model: ModelInfo) => {
    if (downloadingModels.has(model.id) || model.status === 'downloading') {
      return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />
    }
    
    switch (model.status) {
      case 'loaded':
        return <Play className="w-4 h-4 text-green-500" />
      case 'downloaded':
        return <CheckCircle className="w-4 h-4 text-blue-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <Download className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getModelStatusText = (model: ModelInfo) => {
    if (downloadingModels.has(model.id) || model.status === 'downloading') {
      const progress = downloadProgress[model.id]
      if (progress) {
        const speedText = progress.speed > 0 ? ` (${progress.speed.toFixed(1)} MB/s)` : ''
        const etaText = progress.eta > 0 ? ` • ETA: ${Math.round(progress.eta)}s` : ''
        return `${progress.status}${speedText}${etaText}`
      }
      return `Downloading... ${model.download_progress.toFixed(0)}%`
    }
    
    switch (model.status) {
      case 'loaded':
        return 'Loaded in memory'
      case 'downloaded':
        return 'Downloaded'
      case 'error':
        return 'Error'
      default:
        return 'Available for download'
    }
  }

  const getPerformanceTierColor = (tier: string) => {
    switch (tier) {
      case 'powerful':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'medium':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'lightweight':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getSizeColor = (size: string) => {
    switch (size) {
      case 'tiny':
      case 'small':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'large':
      case 'xlarge':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const isModelRecommended = (model: ModelInfo) => {
    return systemCapabilities?.recommended_models.some(rec => 
      rec.includes(model.huggingface_repo || '') || rec.includes(model.id)
    )
  }

  const ModelCard: React.FC<{ model: ModelInfo }> = ({ model }) => {
    const isRecommended = isModelRecommended(model)
    const canDownload = model.status === 'available'
    const canLoad = model.status === 'downloaded'
    const canUnload = model.status === 'loaded' || loadedModels.includes(model.id)
    const isDownloading = downloadingModels.has(model.id) || model.status === 'downloading'

    return (
      <Card className={cn(
        "transition-all duration-200 hover:shadow-md",
        isRecommended && "ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/10"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-lg flex items-center space-x-2">
                <span>{model.name}</span>
                {isRecommended && (
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                )}
              </CardTitle>
              <CardDescription className="text-sm line-clamp-2">
                {model.description}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-1 ml-4">
              {getModelStatusIcon(model)}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge className={getPerformanceTierColor(model.performance_tier)}>
              {model.performance_tier}
            </Badge>
            <Badge className={getSizeColor(model.size)}>
              {model.size}
            </Badge>
            <Badge variant="outline">
              {model.category.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Download Size:</span>
              <p className="font-medium">{(model.download_size / 1024).toFixed(1)} GB</p>
            </div>
            <div>
              <span className="text-muted-foreground">Memory Requirement:</span>
              <p className="font-medium">{(model.memory_requirement / 1024).toFixed(1)} GB</p>
            </div>
            {model.vram_requirement && (
              <div>
                <span className="text-muted-foreground">VRAM Requirement:</span>
                <p className="font-medium">{(model.vram_requirement / 1024).toFixed(1)} GB</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">License:</span>
              <p className="font-medium">{model.license || 'Unknown'}</p>
            </div>
          </div>
          
          {isDownloading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Download Progress</span>
                <span>{model.download_progress.toFixed(0)}%</span>
              </div>
              <Progress value={model.download_progress} className="h-2" />
              
              {/* Enhanced progress details */}
              {downloadProgress[model.id] && (
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {downloadProgress[model.id].speed > 0 && (
                    <div>
                      <span>Speed: </span>
                      <span className="font-medium">{downloadProgress[model.id].speed.toFixed(1)} MB/s</span>
                    </div>
                  )}
                  {downloadProgress[model.id].eta > 0 && (
                    <div>
                      <span>ETA: </span>
                      <span className="font-medium">{Math.round(downloadProgress[model.id].eta)}s</span>
                    </div>
                  )}
                  {downloadProgress[model.id].totalSize > 0 && (
                    <div className="col-span-2">
                      <span>Size: </span>
                      <span className="font-medium">
                        {(downloadProgress[model.id].downloadedSize / (1024 * 1024)).toFixed(1)} MB / 
                        {(downloadProgress[model.id].totalSize / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {getModelStatusText(model)}
            </div>
            
            <div className="flex space-x-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setSelectedModel(model)}>
                    <Info className="w-4 h-4 mr-1" />
                    Details
                  </Button>
                </DialogTrigger>
              </Dialog>
              
              {canDownload && (
                <Button size="sm" onClick={() => handleDownloadModel(model.id)}>
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              )}
              
              {canLoad && (
                <Button size="sm" onClick={() => handleLoadModel(model.id)}>
                  <Play className="w-4 h-4 mr-1" />
                  Load
                </Button>
              )}
              
              {canUnload && (
                <Button variant="outline" size="sm" onClick={() => handleUnloadModel(model.id)}>
                  <Square className="w-4 h-4 mr-1" />
                  Unload
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Model Management</h1>
          <p className="text-muted-foreground mt-2">
            Download, manage, and optimize AI models based on your hardware capabilities
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={refreshModels}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Available Models</p>
                <p className="text-2xl font-bold">{availableModels.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Download className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Downloaded</p>
                <p className="text-2xl font-bold">
                  {availableModels.filter(m => m.status === 'downloaded' || m.status === 'loaded').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Play className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Loaded</p>
                <p className="text-2xl font-bold">{loadedModels.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Downloading</p>
                <p className="text-2xl font-bold">{downloadingModels.size}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search models by name, description, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Select value={selectedCategory} onValueChange={(value: ModelCategory) => setSelectedCategory(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="programming">Programming</SelectItem>
                  <SelectItem value="code_analysis">Code Analysis</SelectItem>
                  <SelectItem value="system_admin">System Admin</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="conversational">Conversational</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedTier} onValueChange={(value: ModelTier) => setSelectedTier(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="lightweight">Lightweight</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="powerful">Powerful</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedSize} onValueChange={(value: ModelSize) => setSelectedSize(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sizes</SelectItem>
                  <SelectItem value="tiny">Tiny</SelectItem>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                  <SelectItem value="xlarge">X-Large</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant={showRecommendedOnly ? "default" : "outline"}
                onClick={() => setShowRecommendedOnly(!showRecommendedOnly)}
                className="flex items-center space-x-1"
              >
                <Star className="w-4 h-4" />
                <span>Recommended</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Models Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredModels.map((model) => (
          <ModelCard key={model.id} model={model} />
        ))}
      </div>

      {filteredModels.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No models found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search criteria or filters
            </p>
          </CardContent>
        </Card>
      )}

      {/* Model Details Dialog */}
      {selectedModel && (
        <Dialog open={!!selectedModel} onOpenChange={() => setSelectedModel(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <span>{selectedModel.name}</span>
                {isModelRecommended(selectedModel) && (
                  <Star className="w-5 h-5 text-yellow-500 fill-current" />
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedModel.description}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Performance Tier</h4>
                  <Badge className={getPerformanceTierColor(selectedModel.performance_tier)}>
                    {selectedModel.performance_tier}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Model Size</h4>
                  <Badge className={getSizeColor(selectedModel.size)}>
                    {selectedModel.size}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Category</h4>
                  <Badge variant="outline">
                    {selectedModel.category.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Format</h4>
                  <Badge variant="outline">
                    {selectedModel.format}
                  </Badge>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <HardDrive className="w-4 h-4" />
                    <span className="text-sm font-medium">Download Size</span>
                  </div>
                  <p className="text-lg font-bold">{(selectedModel.download_size / 1024).toFixed(1)} GB</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Brain className="w-4 h-4" />
                    <span className="text-sm font-medium">Memory Required</span>
                  </div>
                  <p className="text-lg font-bold">{(selectedModel.memory_requirement / 1024).toFixed(1)} GB</p>
                </div>
                {selectedModel.vram_requirement && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4" />
                      <span className="text-sm font-medium">VRAM Required</span>
                    </div>
                    <p className="text-lg font-bold">{(selectedModel.vram_requirement / 1024).toFixed(1)} GB</p>
                  </div>
                )}
              </div>
              
              {selectedModel.tags.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedModel.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedModel.huggingface_repo && (
                <div>
                  <h4 className="font-medium mb-2">Repository</h4>
                  <p className="text-sm text-muted-foreground font-mono">
                    {selectedModel.huggingface_repo}
                  </p>
                </div>
              )}
              
              {selectedModel.license && (
                <div>
                  <h4 className="font-medium mb-2">License</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedModel.license}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default ModelManagement