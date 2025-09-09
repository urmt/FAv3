import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { useAppStore } from './lib/store'
import { apiService } from './lib/api'

// Layout Components
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import MainContent from './components/layout/MainContent'

// Page Components
import Overview from './components/pages/Overview'
import HardwareDetection from './components/pages/HardwareDetection'
import ModelManagement from './components/pages/ModelManagement'
import CodeGeneration from './components/pages/CodeGeneration'
import SystemMonitoring from './components/pages/SystemMonitoring'
import SystemAdmin from './components/pages/SystemAdmin'
import Settings from './components/pages/Settings'
import ChatPanel from './components/ChatPanel'

function App() {
  const {
    setSystemCapabilities,
    setCurrentMetrics,
    setActiveAlerts,
    setAvailableModels,
    setLoadedModels,
  } = useAppStore()

  useEffect(() => {
    // Initialize app data
    const initializeApp = async () => {
      try {
        // Get system capabilities
        const capabilities = await apiService.getSystemCapabilities()
        setSystemCapabilities(capabilities)

        // Get available models
        const models = await apiService.getModels()
        setAvailableModels(models)

        // Get loaded models
        const loadedModels = await apiService.getLoadedModels()
        setLoadedModels(loadedModels.loaded_models || [])

        // Get current metrics
        const metrics = await apiService.getCurrentMetrics()
        setCurrentMetrics(metrics)

        // Get active alerts
        const alerts = await apiService.getActiveAlerts()
        setActiveAlerts(alerts)
      } catch (error) {
        console.error('Failed to initialize app:', error)
      }
    }

    initializeApp()

    // Set up periodic updates
    const metricsInterval = setInterval(async () => {
      try {
        const metrics = await apiService.getCurrentMetrics()
        setCurrentMetrics(metrics)
        
        const alerts = await apiService.getActiveAlerts()
        setActiveAlerts(alerts)
      } catch (error) {
        console.error('Failed to update metrics:', error)
      }
    }, 30000) // Update every 30 seconds

    return () => {
      clearInterval(metricsInterval)
    }
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <Router>
        <div className="min-h-screen bg-background text-foreground">
          <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header />
              <MainContent>
                <Routes>
                  <Route path="/" element={<Overview />} />
                  <Route path="/hardware" element={<HardwareDetection />} />
                  <Route path="/models" element={<ModelManagement />} />
                  <Route path="/chat" element={<ChatPanel />} />
                  <Route path="/generate" element={<CodeGeneration />} />
                  <Route path="/monitoring" element={<SystemMonitoring />} />
                  <Route path="/admin" element={<SystemAdmin />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </MainContent>
            </div>
          </div>
          <Toaster position="top-right" richColors />
        </div>
      </Router>
    </ThemeProvider>
  )
}

export default App