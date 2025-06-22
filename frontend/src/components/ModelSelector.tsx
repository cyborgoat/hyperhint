'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, Circle, RefreshCw } from 'lucide-react'

interface ModelInfo {
  id: string
  name: string
  provider: string
  service: string
  available: boolean
  is_default: boolean
}

interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (model: string) => void
}

export default function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [defaultModel, setDefaultModel] = useState('llama3.2')

  const fetchModels = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/models')
      if (response.ok) {
        const data = await response.json()
        setModels(data.all_models || [])
        setDefaultModel(data.default_model || 'llama3.2')
        
        // If no model is selected or selected model is not available, use default
        if (!selectedModel || !data.all_models.find((m: ModelInfo) => m.id === selectedModel)) {
          onModelChange(data.default_model || 'llama3.2')
        }
      } else {
        console.error('Failed to fetch models')
        // Fallback to static models if API fails
        setModels([
          { id: 'llama3.2', name: 'Llama 3.2', provider: 'Ollama', service: 'ollama', available: false, is_default: true },
          { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', service: 'openai', available: false, is_default: false },
        ])
      }
    } catch (error) {
      console.error('Error fetching models:', error)
      // Fallback to static models
      setModels([
        { id: 'llama3.2', name: 'Llama 3.2', provider: 'Ollama', service: 'ollama', available: false, is_default: true },
        { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', service: 'openai', available: false, is_default: false },
      ])
    } finally {
      setLoading(false)
    }
  }

  const refreshModels = async () => {
    setRefreshing(true)
    try {
      const response = await fetch('http://localhost:8000/api/models/refresh', {
        method: 'POST'
      })
      if (response.ok) {
        await fetchModels()
      }
    } catch (error) {
      console.error('Error refreshing models:', error)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchModels()
  }, [])

  const currentModel = models.find(m => m.id === selectedModel) || models.find(m => m.is_default) || models[0]

  const getStatusColor = (available: boolean) => {
    return available ? 'text-green-500' : 'text-red-500'
  }

  const getStatusText = (available: boolean) => {
    return available ? 'Online' : 'Offline'
  }

  if (loading) {
    return (
      <Button variant="ghost" className="h-8 px-3 text-sm" disabled>
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Loading models...</span>
        </div>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 px-3 text-sm">
          <div className="flex items-center space-x-2">
            <Circle 
              className={`h-2 w-2 fill-current ${getStatusColor(currentModel?.available || false)}`} 
            />
            <span>{currentModel?.name || 'No Model'}</span>
            <Badge variant="secondary" className="text-xs">
              {currentModel?.provider || 'Unknown'}
            </Badge>
            <ChevronDown className="h-3 w-3" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        {/* Refresh button */}
        <DropdownMenuItem
          onClick={refreshModels}
          className="flex items-center justify-between cursor-pointer border-b mb-1"
          disabled={refreshing}
        >
          <span className="text-xs font-medium">Refresh Models</span>
          <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
        </DropdownMenuItem>

        {/* Model list */}
        {models.length === 0 ? (
          <DropdownMenuItem disabled>
            <span className="text-xs text-muted-foreground">No models available</span>
          </DropdownMenuItem>
        ) : (
          models.map((model) => (
            <DropdownMenuItem
              key={model.id}
              onClick={() => onModelChange(model.id)}
              className="flex items-center justify-between cursor-pointer py-3"
            >
              <div className="flex items-center space-x-3">
                <Circle 
                  className={`h-2 w-2 fill-current ${getStatusColor(model.available)}`} 
                />
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{model.name}</span>
                    {model.is_default && (
                      <Badge variant="outline" className="text-xs">
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <span>{model.provider}</span>
                    <span>•</span>
                    <span className={getStatusColor(model.available)}>
                      {getStatusText(model.available)}
                    </span>
                  </div>
                </div>
              </div>
              {selectedModel === model.id && (
                <div className="w-2 h-2 bg-primary rounded-full" />
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 