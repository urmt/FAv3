const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

class ApiService {
  private baseURL: string

  constructor() {
    this.baseURL = API_BASE_URL
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error)
      throw error
    }
  }

  // Health and Status
  async getHealth() {
    return this.request('/health')
  }

  async getSystemStatus() {
    return this.request('/status')
  }

  // Hardware Detection
  async getSystemCapabilities() {
    return this.request('/hardware/capabilities')
  }

  async getOptimizationRecommendations() {
    return this.request('/hardware/recommendations')
  }

  // Model Management
  async getModels(category?: string, tier?: string) {
    const params = new URLSearchParams()
    if (category) params.append('category', category)
    if (tier) params.append('tier', tier)
    
    const query = params.toString() ? `?${params.toString()}` : ''
    return this.request(`/models${query}`)
  }

  async getModelRecommendations() {
    return this.request('/models/recommendations')
  }

  async getModelInfo(modelId: string) {
    return this.request(`/models/${modelId}`)
  }

  async downloadModel(modelId: string) {
    return this.request('/models/download', {
      method: 'POST',
      body: JSON.stringify({ model_id: modelId })
    })
  }

  async getDownloadProgress(modelId: string) {
    return this.request(`/models/${modelId}/download-progress`)
  }

  async loadModel(modelId: string) {
    return this.request('/models/load', {
      method: 'POST',
      body: JSON.stringify({ model_id: modelId })
    })
  }

  async unloadModel(modelId: string) {
    return this.request('/models/unload', {
      method: 'POST',
      body: JSON.stringify({ model_id: modelId })
    })
  }

  async validateModel(modelId: string) {
    return this.request('/models/validate', {
      method: 'POST',
      body: JSON.stringify({ model_id: modelId })
    })
  }

  async benchmarkModel(modelId: string) {
    return this.request(`/models/${modelId}/performance`)
  }

  async getLoadedModels() {
    return this.request('/models/loaded')
  }

  // AI Generation
  async generateCode(modelId: string, prompt: string, options = {}) {
    return this.request('/generate', {
      method: 'POST',
      body: JSON.stringify({
        model_id: modelId,
        prompt,
        max_length: 200,
        temperature: 0.7,
        top_p: 0.9,
        num_return_sequences: 1,
        ...options
      })
    })
  }

  async analyzeCode(modelId: string, code: string, analysisType = 'quality') {
    return this.request('/analyze', {
      method: 'POST',
      body: JSON.stringify({
        model_id: modelId,
        code,
        analysis_type: analysisType
      })
    })
  }

  // Performance Monitoring
  async getCurrentMetrics() {
    return this.request('/performance/metrics')
  }

  async getMetricsHistory(durationMinutes = 60) {
    return this.request(`/performance/history?duration_minutes=${durationMinutes}`)
  }

  async getProcessList(sortBy = 'memory', limit = 10) {
    return this.request(`/performance/processes?sort_by=${sortBy}&limit=${limit}`)
  }

  async getActiveAlerts(level?: string) {
    const query = level ? `?level=${level}` : ''
    return this.request(`/performance/alerts${query}`)
  }

  async dismissAlert(alertIndex: number) {
    return this.request('/performance/alerts/dismiss', {
      method: 'POST',
      body: JSON.stringify({ alert_index: alertIndex })
    })
  }

  async updateAlertThresholds(thresholds: Record<string, number>) {
    return this.request('/performance/thresholds', {
      method: 'PUT',
      body: JSON.stringify({ thresholds })
    })
  }

  async getPerformanceSummary() {
    return this.request('/performance/summary')
  }

  // System Administration
  async getSystemInfo() {
    return this.request('/system/info')
  }

  async executeCommand(command: string, timeout = 30, requireSudo = false) {
    return this.request('/system/command', {
      method: 'POST',
      body: JSON.stringify({
        command,
        timeout,
        require_sudo: requireSudo
      })
    })
  }

  async manageService(action: string, serviceName: string) {
    return this.request('/system/services', {
      method: 'POST',
      body: JSON.stringify({
        action,
        service_name: serviceName
      })
    })
  }

  async getServicesStatus() {
    return this.request('/system/services')
  }

  async managePackage(action: string, packageName: string) {
    return this.request('/system/packages', {
      method: 'POST',
      body: JSON.stringify({
        action,
        package_name: packageName
      })
    })
  }

  async getMountPoints() {
    return this.request('/system/mounts')
  }

  async mountDevice(device: string, mountpoint: string, fstype = 'auto', options = 'defaults') {
    return this.request('/system/mount', {
      method: 'POST',
      body: JSON.stringify({
        device,
        mountpoint,
        fstype,
        options
      })
    })
  }

  async unmountDevice(mountpoint: string, force = false) {
    return this.request('/system/unmount', {
      method: 'POST',
      body: JSON.stringify({
        mountpoint,
        force
      })
    })
  }

  async cleanSystem() {
    return this.request('/system/clean', {
      method: 'POST'
    })
  }

  async getSystemLogs(service?: string, lines = 100) {
    const params = new URLSearchParams()
    if (service) params.append('service', service)
    params.append('lines', lines.toString())
    
    return this.request(`/system/logs?${params.toString()}`)
  }

  async diagnoseSystem() {
    return this.request('/system/diagnose')
  }

  // Simple text generation for chat interface
  async generateText(prompt: string, modelId?: string, options = {}) {
    // Use the first loaded model if no model specified
    const effectiveModelId = modelId || await this.getFirstLoadedModel()
    
    if (!effectiveModelId) {
      throw new Error('No model available for text generation')
    }

    return this.generateCode(effectiveModelId, prompt, {
      max_length: 150,
      temperature: 0.7,
      top_p: 0.9,
      num_return_sequences: 1,
      ...options
    })
  }

  private async getFirstLoadedModel(): Promise<string | null> {
    try {
      const response = await this.getLoadedModels()
      const loadedModels = response.loaded_models || []
      return loadedModels.length > 0 ? loadedModels[0] : null
    } catch (error) {
      console.error('Failed to get loaded models:', error)
      return null
    }
  }
}

export const apiService = new ApiService()
export default apiService