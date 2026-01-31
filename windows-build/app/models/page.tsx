"use client"

import { useEffect, useState } from "react"
import { Server, Loader2, Play, Square, RefreshCw, MessageCircle, Zap, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"

interface Model {
  id: string
  name: string
  version: string
  status: "running" | "stopped" | "error" | "pending" | "loading"
  cpu?: number
  memory?: number
  port?: number
  provider_name?: string
  provider_type?: string
  requests_handled?: number
  last_response_time?: number
  total_tokens_used?: number
  created_at?: string
  updated_at?: string
  size?: number
  modified?: string
  digest?: string
  details?: {
    format: string
    family: string
    parameterSize: string
    quantizationLevel: string
  }
  is_running?: boolean
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [testResults, setTestResults] = useState<Record<string, any>>({})
  const [performanceMetrics, setPerformanceMetrics] = useState<Record<string, any>>({})
  const [messageDialog, setMessageDialog] = useState<{open: boolean, model: Model | null, message: string}>({open: false, model: null, message: ''})
  const [providers, setProviders] = useState<any[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>('ollama')

  const fetchProviders = async () => {
    try {
      const response = await fetch("/api/proxy/providers")
      if (response.ok) {
        const data = await response.json()
        if (data.success && Array.isArray(data.providers)) {
          setProviders(data.providers)
        }
      }
    } catch (error) {
      console.log("[v0] Failed to fetch providers:", error)
    }
  }

  const fetchModels = async () => {
    try {
      const response = await fetch("/api/proxy/models")
      if (response.ok) {
        const data = await response.json()
        // Handle both database and Ollama API responses
        if (data.success && Array.isArray(data.data)) {
          setModels(data.data.map((model: any) => ({
            id: model.id || model.name,
            name: model.model_name || model.name || model.model,
            version: model.model_version || model.details?.parameterSize || 'N/A',
            status: model.status || 'stopped',
            cpu: model.cpu_usage || model.system_resources?.cpu_usage || undefined,
            memory: model.memory_usage || model.system_resources?.memory_usage || undefined,
            requests_handled: model.requests_handled || undefined,
            last_response_time: model.last_response_time || undefined,
            total_tokens_used: model.total_tokens_used || undefined,
            provider_name: model.provider_name,
            provider_type: model.provider_type,
            created_at: model.created_at,
            updated_at: model.updated_at,
            size: model.size,
            modified: model.modified,
            details: model.details,
            is_running: model.is_running || false
          })))
        } else if (Array.isArray(data)) {
          // Handle legacy array response
          setModels(data.map((model: any) => ({
            id: model.id || model.name,
            name: model.model_name || model.name || model.model,
            version: model.model_version || model.details?.parameterSize || 'N/A',
            status: model.status || 'stopped',
            cpu: model.cpu_usage || model.system_resources?.cpu_usage || undefined,
            memory: model.memory_usage || model.system_resources?.memory_usage || undefined,
            requests_handled: model.requests_handled || undefined,
            last_response_time: model.last_response_time || undefined,
            total_tokens_used: model.total_tokens_used || undefined,
            provider_name: model.provider_name,
            provider_type: model.provider_type,
            created_at: model.created_at,
            updated_at: model.updated_at,
            size: model.size,
            modified: model.modified,
            details: model.details,
            is_running: model.is_running || false
          })))
        } else {
          setModels([])
        }
      } else {
        setModels([])
      }
    } catch (error) {
      console.log("[v0] Failed to fetch models:", error)
      setModels([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchProviders()
    fetchModels()
    const interval = setInterval(() => {
      fetchModels()
      fetchProviders()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchModels()
  }

  const handleStartModel = async (modelName: string) => {
    try {
      const response = await fetch(`/api/proxy/models/${encodeURIComponent(modelName)}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`Model ${modelName} started successfully`, result);
        // Refresh models to show updated status
        fetchModels();
      } else {
        console.error(`Failed to start model ${modelName}:`, response.statusText);
      }
    } catch (error) {
      console.error(`Error starting model ${modelName}:`, error);
    }
  };

  const handleStopModel = async (modelName: string) => {
    try {
      const response = await fetch(`/api/proxy/models/${encodeURIComponent(modelName)}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`Model ${modelName} stopped successfully`, result);
        // Refresh models to show updated status
        fetchModels();
      } else {
        console.error(`Failed to stop model ${modelName}:`, response.statusText);
      }
    } catch (error) {
      console.error(`Error stopping model ${modelName}:`, error);
    }
  };

  const handleTestModel = async (modelName: string) => {
    try {
      const response = await fetch(`/api/proxy/models/${encodeURIComponent(modelName)}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: "Hello, are you available?",
          timeout: 5000
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`Model ${modelName} test result:`, result);
        setTestResults(prev => ({...prev, [modelName]: result}));
        // Refresh models to show updated status
        fetchModels();
      } else {
        console.error(`Failed to test model ${modelName}:`, response.statusText);
      }
    } catch (error) {
      console.error(`Error testing model ${modelName}:`, error);
    }
  };

  const handleTestModelWithProvider = async (modelName: string, provider: string) => {
    try {
      const response = await fetch(`/api/proxy/providers/models/${encodeURIComponent(modelName)}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: provider,
          testPrompt: "Hello, are you available?"
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`Model ${modelName} test result:`, result);
        setTestResults(prev => ({...prev, [modelName]: result}));
      } else {
        console.error(`Failed to test model ${modelName}:`, response.statusText);
      }
    } catch (error) {
      console.error(`Error testing model ${modelName}:`, error);
    }
  };

  const handleSendMessage = async (modelName: string, message: string, provider: string = 'ollama') => {
    try {
      const response = await fetch(`/api/proxy/providers/models/${encodeURIComponent(modelName)}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: provider,
          prompt: message
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`Model ${modelName} message response:`, result);
        setTestResults(prev => ({...prev, [modelName]: result}));
        return result;
      } else {
        console.error(`Failed to send message to model ${modelName}:`, response.statusText);
        return null;
      }
    } catch (error) {
      console.error(`Error sending message to model ${modelName}:`, error);
      return null;
    }
  };

  const handleGetPerformance = async (modelName: string) => {
    try {
      const response = await fetch(`/api/proxy/providers/models/${encodeURIComponent(modelName)}/performance`);
      if (response.ok) {
        const result = await response.json();
        setPerformanceMetrics(prev => ({...prev, [modelName]: result.metrics}));
        return result.metrics;
      }
    } catch (error) {
      console.error(`Error getting performance for ${modelName}:`, error);
    }
    return null;
  };

  const openMessageDialog = (model: Model) => {
    setMessageDialog({
      open: true,
      model: model,
      message: 'Hello, can you help me with something?'
    });
  };

  const sendMessageAndClose = async () => {
    if (messageDialog.model && messageDialog.message) {
      const provider = messageDialog.model.provider_type || selectedProvider;
      await handleSendMessage(messageDialog.model.name, messageDialog.message, provider);
      setMessageDialog({open: false, model: null, message: ''})
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "text-success"
      case "stopped":
        return "text-muted-foreground"
      case "error":
        return "text-destructive"
      default:
        return "text-muted-foreground"
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
    switch (status) {
      case "running":
        return `${baseClasses} bg-success/10 text-success`
      case "stopped":
        return `${baseClasses} bg-muted text-muted-foreground`
      case "error":
        return `${baseClasses} bg-destructive/10 text-destructive`
      default:
        return `${baseClasses} bg-muted text-muted-foreground`
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Models</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage and monitor your local model instances</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-lg border border-border bg-card p-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading models...</span>
          </div>
        </div>
      ) : models.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Server className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No models found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Make sure your UAS backend is running and models are configured
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {models.map((model) => (
            <div key={model.id} className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-primary/10 p-2">
                    <Server className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{model.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {model.provider_name ? `${model.provider_name} (${model.provider_type})` : model.version}
                    </p>
                  </div>
                </div>
                <span className={getStatusBadge(model.status)}>{model.status}</span>
              </div>

              {(model.status === "running" || model.cpu !== undefined) && (
                <div className="mt-4 space-y-2">
                  {model.cpu !== undefined && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">CPU</span>
                      <span className="font-medium">{model.cpu.toFixed(1)}%</span>
                    </div>
                  )}
                  {model.memory !== undefined && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Memory</span>
                      <span className="font-medium">{model.memory.toFixed(1)}%</span>
                    </div>
                  )}
                  {model.requests_handled !== undefined && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Requests</span>
                      <span className="font-medium">{model.requests_handled}</span>
                    </div>
                  )}
                  {model.total_tokens_used !== undefined && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tokens</span>
                      <span className="font-mono text-xs">{model.total_tokens_used}</span>
                    </div>
                  )}
                  {model.size !== undefined && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Size</span>
                      <span className="font-mono text-xs">{(model.size / (1024*1024*1024)).toFixed(1)} GB</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                {model.is_running ? (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 bg-transparent"
                      onClick={() => handleStopModel(model.name)}
                    >
                      <Square className="mr-2 h-3 w-3" />
                      Stop
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleTestModel(model.name)}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openMessageDialog(model)}
                    >
                      <MessageCircle className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleGetPerformance(model.name)}
                    >
                      <BarChart3 className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 bg-transparent"
                      onClick={() => handleStartModel(model.name)}
                    >
                      <Play className="mr-2 h-3 w-3" />
                      Start
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleTestModel(model.name)}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openMessageDialog(model)}
                    >
                      <MessageCircle className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleGetPerformance(model.name)}
                    >
                      <BarChart3 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Message Dialog */}
      <Dialog open={messageDialog.open} onOpenChange={(open) => setMessageDialog(prev => ({...prev, open}))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Message to Model</DialogTitle>
            <DialogDescription>
              Send a message to {messageDialog.model?.name} ({messageDialog.model?.provider_name || selectedProvider})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={messageDialog.message}
                onChange={(e) => setMessageDialog(prev => ({...prev, message: e.target.value}))}
                placeholder="Enter your message here..."
                rows={4}
                className="mt-1"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={sendMessageAndClose}
                className="flex-1"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Send Message
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setMessageDialog({open: false, model: null, message: ''})}
              >
                Cancel
              </Button>
            </div>
            
            {/* Test Results Display */}
            {testResults[messageDialog.model?.name || ''] && (
              <div className="rounded-lg border bg-muted p-4">
                <h4 className="font-medium mb-2">Response:</h4>
                <div className="text-sm">
                  <p className="font-mono whitespace-pre-wrap">
                    {testResults[messageDialog.model?.name || '']?.response?.content || 
                     testResults[messageDialog.model?.name || '']?.testResult?.response || 
                     'No response received'}
                  </p>
                  {testResults[messageDialog.model?.name || '']?.performance && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Response Time: {testResults[messageDialog.model?.name || '']?.performance?.responseTime}ms | 
                      Tokens: {testResults[messageDialog.model?.name || '']?.performance?.tokensUsed}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Performance Metrics Display */}
      {Object.keys(performanceMetrics).length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(performanceMetrics).map(([modelName, metrics]) => (
              <Card key={modelName}>
                <CardHeader>
                  <CardTitle className="text-sm">{modelName}</CardTitle>
                  <CardDescription>Performance Metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Response Time:</span>
                    <span className="font-mono">{metrics.responseTime?.toFixed(0) || 0}ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Success Rate:</span>
                    <span className="font-mono">{metrics.successRate?.toFixed(1) || 0}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tokens/Sec:</span>
                    <span className="font-mono">{metrics.tokensPerSecond || 0}</span>
                  </div>
                  <Progress value={metrics.successRate || 0} className="h-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
