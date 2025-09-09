import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MessageCircle,
  Send,
  Copy,
  Trash2,
  Bot,
  User,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { apiService } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  modelId?: string
}

interface GenerationResult {
  generated_code: string[]
  model_id: string
  execution_time: number
  tokens_generated: number
}

const ChatPanel: React.FC = () => {
  const { loadedModels, availableModels } = useAppStore()
  
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedModel, setSelectedModel] = useState('')
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const loadedModelOptions = loadedModels.map(modelId => {
    const model = availableModels.find(m => m.id === modelId)
    return {
      id: modelId,
      name: model?.name || modelId,
      category: model?.category || 'unknown'
    }
  })

  // Auto-select first model when loaded models change
  useEffect(() => {
    if (loadedModelOptions.length > 0 && !selectedModel) {
      setSelectedModel(loadedModelOptions[0].id)
    }
  }, [loadedModelOptions, selectedModel])

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a message')
      return
    }

    if (loadedModels.length === 0) {
      toast.error('No models loaded. Please load a model first.')
      return
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: prompt.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setPrompt('')
    setIsGenerating(true)

    try {
      const result: GenerationResult = await apiService.generateText(prompt, selectedModel)
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: result.generated_code[0] || 'I apologize, but I could not generate a response.',
        timestamp: new Date(),
        modelId: result.model_id
      }

      setMessages(prev => [...prev, assistantMessage])
      toast.success('Response generated successfully')
    } catch (error) {
      console.error('Generation failed:', error)
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error while generating a response. Please try again.',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
      toast.error('Failed to generate response')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    toast.success('Message copied to clipboard')
  }

  const clearChat = () => {
    setMessages([])
    toast.success('Chat cleared')
  }

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5" />
            <span>AI Chat</span>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {loadedModelOptions.length > 0 && (
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select model" />
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
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
              disabled={messages.length === 0}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4 min-h-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
          <div className="space-y-4 pr-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Start a conversation with your AI assistant</p>
                  <p className="text-sm mt-1">
                    {loadedModels.length === 0 
                      ? 'Load a model first from the Models page'
                      : 'Type a message below to begin'
                    }
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex space-x-3",
                    message.type === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "flex space-x-3 max-w-[80%]",
                      message.type === 'user' ? "flex-row-reverse space-x-reverse" : "flex-row"
                    )}
                  >
                    <div className="flex-shrink-0">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          message.type === 'user'
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {message.type === 'user' ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div
                        className={cn(
                          "rounded-lg px-4 py-2 text-sm",
                          message.type === 'user'
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <pre className="whitespace-pre-wrap font-sans">
                          {message.content}
                        </pre>
                      </div>
                      
                      <div
                        className={cn(
                          "flex items-center space-x-2 text-xs text-muted-foreground",
                          message.type === 'user' ? "justify-end" : "justify-start"
                        )}
                      >
                        <span>{formatTime(message.timestamp)}</span>
                        {message.modelId && (
                          <Badge variant="outline" className="text-xs">
                            {availableModels.find(m => m.id === message.modelId)?.name || message.modelId}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1"
                          onClick={() => copyMessage(message.content)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {isGenerating && (
              <div className="flex space-x-3 justify-start">
                <div className="flex space-x-3 max-w-[80%]">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                      <Bot className="w-4 h-4" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="rounded-lg px-4 py-2 bg-muted flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Generating response...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="flex-shrink-0 space-y-2">
          {loadedModels.length === 0 && (
            <div className="flex items-center space-x-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-700 dark:text-amber-400">
                No models loaded. Please visit the Models page to load a model first.
              </span>
            </div>
          )}
          
          <div className="flex space-x-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={loadedModels.length > 0 ? "Type your message here..." : "Load a model to start chatting"}
              disabled={isGenerating || loadedModels.length === 0}
              className="min-h-[80px] resize-none"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isGenerating || !prompt.trim() || loadedModels.length === 0}
              size="sm"
              className="h-auto px-3"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ChatPanel