import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Types
export interface ModelInfo {
  id: string
  name: string
  description: string
  category: string
  size: string
  format: string
  performance_tier: string
  download_size: number
  memory_requirement: number
  vram_requirement?: number
  status: string
  local_path?: string
  download_progress: number
  validation_status?: string
  performance_metrics?: Record<string, number>
  huggingface_repo?: string
  license?: string
  tags: string[]
}

export interface SystemCapabilities {
  cpu: {
    name: string
    cores: number
    threads: number
    frequency: number
    architecture: string
    vendor: string
    performance_score: number
  }
  memory: {
    total: number
    available: number
    usage_percent: number
  }
  storage: {
    total: number
    free: number
    type: string
  }
  gpus: Array<{
    name: string
    vendor: string
    memory_total: number
    memory_free: number
    compute_capability?: string
    driver_version?: string
    cuda_support: boolean
    opencl_support: boolean
  }>
  performance_tier: string
  recommended_models: string[]
  os_info: Record<string, string>
}

export interface SystemMetrics {
  timestamp: number
  cpu_percent: number
  memory_percent: number
  memory_used: number
  memory_total: number
  disk_percent: number
  disk_used: number
  disk_total: number
  network_sent: number
  network_recv: number
  gpu_utilization?: number
  gpu_memory_used?: number
  gpu_memory_total?: number
  temperature?: number
}

export interface SystemAlert {
  level: string
  component: string
  message: string
  timestamp: number
  value?: number
  threshold?: number
}

interface AppState {
  // Theme
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
  
  // System state
  systemCapabilities: SystemCapabilities | null
  currentMetrics: SystemMetrics | null
  activeAlerts: SystemAlert[]
  
  // Model state
  availableModels: ModelInfo[]
  loadedModels: string[]
  downloadingModels: Set<string>
  
  // UI state
  currentView: string
  sidebarCollapsed: boolean
  
  // Actions
  setSystemCapabilities: (capabilities: SystemCapabilities) => void
  setCurrentMetrics: (metrics: SystemMetrics) => void
  setActiveAlerts: (alerts: SystemAlert[]) => void
  setAvailableModels: (models: ModelInfo[]) => void
  setLoadedModels: (models: string[]) => void
  addDownloadingModel: (modelId: string) => void
  removeDownloadingModel: (modelId: string) => void
  setCurrentView: (view: string) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  updateModelStatus: (modelId: string, status: string, progress?: number) => void
}

export const useAppStore = create<AppState>()(persist(
  (set, get) => ({
    // Initial state
    theme: 'dark',
    systemCapabilities: null,
    currentMetrics: null,
    activeAlerts: [],
    availableModels: [],
    loadedModels: [],
    downloadingModels: new Set(),
    currentView: 'overview',
    sidebarCollapsed: false,
    
    // Actions
    setTheme: (theme) => set({ theme }),
    setSystemCapabilities: (capabilities) => set({ systemCapabilities: capabilities }),
    setCurrentMetrics: (metrics) => set({ currentMetrics: metrics }),
    setActiveAlerts: (alerts) => set({ activeAlerts: alerts }),
    setAvailableModels: (models) => set({ availableModels: models }),
    setLoadedModels: (models) => set({ loadedModels: models }),
    addDownloadingModel: (modelId) => {
      const downloading = new Set(get().downloadingModels)
      downloading.add(modelId)
      set({ downloadingModels: downloading })
    },
    removeDownloadingModel: (modelId) => {
      const downloading = new Set(get().downloadingModels)
      downloading.delete(modelId)
      set({ downloadingModels: downloading })
    },
    setCurrentView: (view) => set({ currentView: view }),
    setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    updateModelStatus: (modelId, status, progress) => {
      const models = get().availableModels.map(model => 
        model.id === modelId 
          ? { ...model, status, download_progress: progress ?? model.download_progress }
          : model
      )
      set({ availableModels: models })
    }
  }),
  {
    name: 'fav2-storage',
    partialize: (state) => ({ 
      theme: state.theme,
      currentView: state.currentView,
      sidebarCollapsed: state.sidebarCollapsed
    })
  }
))