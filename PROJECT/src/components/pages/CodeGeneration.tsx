import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Slider } from '@/components/ui/slider'
import {
  Code,
  Play,
  Copy,
  Download,
  Wand2,
  Brain,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { apiService } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface GenerationResult {
  generated_code: string[]
  model_id: string
  execution_time: number
  tokens_generated: number
}

interface AnalysisResult {
  analysis_results: Record<string, any>
  model_id: string
  execution_time: number
  suggestions: string[]
}

const CodeGeneration: React.FC = () => {
  const { loadedModels, availableModels } = useAppStore()
  
  const [selectedModel, setSelectedModel] = useState('')
  const [prompt, setPrompt] = useState('')
  const [generatedCode, setGeneratedCode] = useState<GenerationResult | null>(null)
  const [analysisCode, setAnalysisCode] = useState('')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  // Generation parameters
  const [maxLength, setMaxLength] = useState([200])
  const [temperature, setTemperature] = useState([0.7])
  const [topP, setTopP] = useState([0.9])
  const [numSequences, setNumSequences] = useState([1])

  const loadedModelOptions = loadedModels.map(modelId => {
    const model = availableModels.find(m => m.id === modelId)
    return {
      id: modelId,
      name: model?.name || modelId,
      category: model?.category || 'unknown'
    }
  })

  const handleGenerateCode = async () => {
    if (!selectedModel || !prompt.trim()) {
      toast.error('Please select a model and enter a prompt')
      return
    }

    setIsGenerating(true)
    try {
      const result = await apiService.generateCode(selectedModel, prompt, {
        max_length: maxLength[0],
        temperature: temperature[0],
        top_p: topP[0],
        num_return_sequences: numSequences[0]
      })
      
      setGeneratedCode(result)
      toast.success('Code generated successfully')
    } catch (error) {
      toast.error('Failed to generate code')
      console.error('Generation failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAnalyzeCode = async () => {
    if (!selectedModel || !analysisCode.trim()) {
      toast.error('Please select a model and enter code to analyze')
      return
    }

    setIsAnalyzing(true)
    try {
      const result = await apiService.analyzeCode(selectedModel, analysisCode, 'quality')
      setAnalysisResult(result)
      toast.success('Code analysis completed')
    } catch (error) {
      toast.error('Failed to analyze code')
      console.error('Analysis failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const downloadCode = (code: string, filename: string) => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Code downloaded')
  }

  const examplePrompts = [
    "def fibonacci(n):",
    "function sortArray(arr) {",
    "class BinaryTree:",
    "#!/bin/bash\n# Script to backup files",
    "import requests\n# API client class",
    "CREATE TABLE users ("
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Code Generation</h1>
        <p className="text-muted-foreground mt-2">
          Generate and analyze code using your loaded AI models
        </p>
      </div>

      {/* Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="w-5 h-5" />
            <span>Model Selection</span>
          </CardTitle>
          <CardDescription>
            Choose from your loaded models for code generation and analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadedModelOptions.length > 0 ? (
            <div className="flex items-center space-x-4">
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {loadedModelOptions.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center space-x-2">
                        <span>{model.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {model.category}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedModel && (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Model ready</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No models loaded</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please go to Model Management to download and load a model first
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="generation" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generation" className="flex items-center space-x-2">
            <Wand2 className="w-4 h-4" />
            <span>Code Generation</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center space-x-2">
            <Code className="w-4 h-4" />
            <span>Code Analysis</span>
          </TabsTrigger>
        </TabsList>

        {/* Code Generation Tab */}
        <TabsContent value="generation" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Section */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Code Prompt</CardTitle>
                  <CardDescription>
                    Enter a code prompt or beginning of your function/class
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Enter your code prompt here...\nExample: def calculate_factorial(n):"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[120px] font-mono"
                  />
                  
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground">Quick examples:</span>
                    {examplePrompts.map((example, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setPrompt(example)}
                        className="text-xs font-mono"
                      >
                        {example.split('\n')[0].substring(0, 20)}...
                      </Button>
                    ))}
                  </div>
                  
                  <Button 
                    onClick={handleGenerateCode}
                    disabled={!selectedModel || !prompt.trim() || isGenerating}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Generate Code
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Parameters Section */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Generation Parameters</CardTitle>
                  <CardDescription>
                    Fine-tune the AI generation behavior
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Max Length: {maxLength[0]}
                    </label>
                    <Slider
                      value={maxLength}
                      onValueChange={setMaxLength}
                      max={1000}
                      min={50}
                      step={50}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Temperature: {temperature[0]}
                    </label>
                    <Slider
                      value={temperature}
                      onValueChange={setTemperature}
                      max={2}
                      min={0.1}
                      step={0.1}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Top P: {topP[0]}
                    </label>
                    <Slider
                      value={topP}
                      onValueChange={setTopP}
                      max={1}
                      min={0.1}
                      step={0.1}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Sequences: {numSequences[0]}
                    </label>
                    <Slider
                      value={numSequences}
                      onValueChange={setNumSequences}
                      max={5}
                      min={1}
                      step={1}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Generated Code Results */}
          {generatedCode && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Generated Code</span>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{generatedCode.execution_time.toFixed(2)}s</span>
                    <span>•</span>
                    <span>{generatedCode.tokens_generated} tokens</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {generatedCode.generated_code.map((code, index) => (
                  <div key={index} className="space-y-2">
                    {generatedCode.generated_code.length > 1 && (
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">Sequence {index + 1}</Badge>
                      </div>
                    )}
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto font-mono text-sm">
                        <code>{prompt + code}</code>
                      </pre>
                      <div className="absolute top-2 right-2 flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(prompt + code)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadCode(prompt + code, `generated_code_${index + 1}.py`)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Code Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Code */}
            <Card>
              <CardHeader>
                <CardTitle>Code to Analyze</CardTitle>
                <CardDescription>
                  Paste your code here for AI-powered analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Paste your code here for analysis..."
                  value={analysisCode}
                  onChange={(e) => setAnalysisCode(e.target.value)}
                  className="min-h-[300px] font-mono"
                />
                
                <Button 
                  onClick={handleAnalyzeCode}
                  disabled={!selectedModel || !analysisCode.trim() || isAnalyzing}
                  className="w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Code className="w-4 h-4 mr-2" />
                      Analyze Code
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Analysis Results */}
            <Card>
              <CardHeader>
                <CardTitle>Analysis Results</CardTitle>
                <CardDescription>
                  AI-powered code quality and suggestions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysisResult ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-muted-foreground">Lines of Code</span>
                        <p className="font-medium">{analysisResult.analysis_results.line_count}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Code Length</span>
                        <p className="font-medium">{analysisResult.analysis_results.code_length} chars</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Complexity Score</span>
                        <p className="font-medium">{analysisResult.analysis_results.complexity_score.toFixed(1)}/10</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Analysis Time</span>
                        <p className="font-medium">{analysisResult.execution_time.toFixed(2)}s</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="font-medium mb-2">Suggestions</h4>
                      <div className="space-y-2">
                        {analysisResult.suggestions.map((suggestion, index) => (
                          <div key={index} className="flex items-start space-x-2 p-2 bg-muted/50 rounded">
                            <AlertCircle className="w-4 h-4 mt-0.5 text-blue-500" />
                            <span className="text-sm">{suggestion}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Code className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">No analysis results yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Enter code and click analyze to get started
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CodeGeneration