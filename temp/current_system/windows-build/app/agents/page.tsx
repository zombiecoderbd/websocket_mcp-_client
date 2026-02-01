"use client"

import { useEffect, useState } from "react"
import { Bot, Loader2, Terminal, RefreshCw, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Agent {
  id: string
  name: string
  status: "active" | "inactive" | "error" | "busy"
  host?: string
  port?: number
  type?: string
  config?: any
  requestCount?: number
  activeSessions?: number
  capabilities?: string[]
  endpoint?: string
  priority?: number
  metrics?: {
    requestCount: number
    avgResponseTime: number
    errorRate: number
  }
  createdAt?: string
  updatedAt?: string
  // Runtime status fields
  runtimeStatus?: {
    status: 'idle' | 'busy' | 'error' | 'initializing' | 'stopped';
    active_tasks?: number;
    completed_tasks?: number;
    failed_tasks?: number;
    memory_usage_mb?: number;
    cpu_usage_percent?: number;
    current_session_id?: string | null;
    last_heartbeat?: string;
  };
  is_enabled?: boolean;
  last_active?: string;
  auto_restart?: boolean;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [command, setCommand] = useState("")
  const [sending, setSending] = useState(false)

  const fetchAgents = async () => {
    try {
      // First, fetch basic agent information
      const response = await fetch("/api/proxy/agents")
      if (response.ok) {
        const data = await response.json()
        // Handle both database and fallback API responses
        if (data.success && Array.isArray(data.agents)) {
          const basicAgents = data.agents.map((agent: any) => ({
            id: agent.id,
            name: agent.name,
            status: agent.status,
            type: agent.type,
            host: agent.endpoint || agent.host,
            config: agent.config || agent.configuration,
            requestCount: agent.requestCount || agent.request_count,
            activeSessions: agent.activeSessions || agent.active_sessions,
            capabilities: agent.capabilities,
            endpoint: agent.endpoint,
            priority: agent.priority,
            metrics: agent.metrics,
            createdAt: agent.createdAt || agent.created_at,
            updatedAt: agent.updatedAt || agent.updated_at,
            is_enabled: agent.is_enabled,
            last_active: agent.last_active,
            auto_restart: agent.auto_restart
          }))

          // Now fetch runtime status for each agent
          const agentsWithRuntime = await Promise.all(basicAgents.map(async (agent: Agent) => {
            try {
              const runtimeResponse = await fetch(`/api/proxy/agents/${agent.id}/runtime`)
              if (runtimeResponse.ok) {
                const runtimeData = await runtimeResponse.json()
                return {
                  ...agent,
                  runtimeStatus: runtimeData.agent || {}
                }
              }
              return agent
            } catch (runtimeError) {
              console.log(`[v0] Failed to fetch runtime status for agent ${agent.id}:`, runtimeError)
              return agent
            }
          }))

          setAgents(agentsWithRuntime)
        } else if (Array.isArray(data)) {
          // Handle legacy array response
          const basicAgents = data.map((agent: any) => ({
            id: agent.id,
            name: agent.name,
            status: agent.status,
            type: agent.type,
            host: agent.endpoint || agent.host,
            config: agent.config || agent.configuration,
            requestCount: agent.requestCount || agent.request_count,
            activeSessions: agent.activeSessions || agent.active_sessions,
            capabilities: agent.capabilities,
            endpoint: agent.endpoint,
            priority: agent.priority,
            metrics: agent.metrics,
            createdAt: agent.createdAt || agent.created_at,
            updatedAt: agent.updatedAt || agent.updated_at,
            is_enabled: agent.is_enabled,
            last_active: agent.last_active,
            auto_restart: agent.auto_restart
          }))

          // Now fetch runtime status for each agent
          const agentsWithRuntime = await Promise.all(basicAgents.map(async (agent: Agent) => {
            try {
              const runtimeResponse = await fetch(`/api/proxy/agents/${agent.id}/runtime`)
              if (runtimeResponse.ok) {
                const runtimeData = await runtimeResponse.json()
                return {
                  ...agent,
                  runtimeStatus: runtimeData.agent || {}
                }
              }
              return agent
            } catch (runtimeError) {
              console.log(`[v0] Failed to fetch runtime status for agent ${agent.id}:`, runtimeError)
              return agent
            }
          }))

          setAgents(agentsWithRuntime)
        } else {
          setAgents([])
        }
      } else {
        setAgents([])
      }
    } catch (error) {
      console.log("[v0] Failed to fetch agents:", error)
      setAgents([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAgents()
    const interval = setInterval(fetchAgents, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchAgents()
  }

  const handleSendCommand = async () => {
    if (!selectedAgent || !command.trim()) return

    setSending(true)
    try {
      const response = await fetch(`/api/proxy/agents/${selectedAgent}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd: command }),
      })

      if (response.ok) {
        setCommand("")
      }
    } catch (error) {
      console.log("[v0] Failed to send command:", error)
    } finally {
      setSending(false)
    }
  }

  const handleToggleAgent = async (agentId: string, enable: boolean) => {
    try {
      const response = await fetch(`/api/proxy/agents/${agentId}/${enable ? 'enable' : 'disable'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`Agent ${agentId} ${enable ? 'enabled' : 'disabled'} successfully`, result);
        // Refresh agents to show updated status
        fetchAgents();
      } else {
        console.error(`Failed to ${enable ? 'enable' : 'disable'} agent ${agentId}:`, response.statusText);
      }
    } catch (error) {
      console.error(`Error ${enable ? 'enabling' : 'disabling'} agent ${agentId}:`, error);
    }
  };

  const handleTestAgent = async (agentId: string) => {
    try {
      const response = await fetch(`/api/proxy/agents/${agentId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ping: true,
          timeout: 5000
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`Agent ${agentId} test result:`, result);
        // Refresh agents to show updated status
        fetchAgents();
      } else {
        console.error(`Failed to test agent ${agentId}:`, response.statusText);
      }
    } catch (error) {
      console.error(`Error testing agent ${agentId}:`, error);
    }
  };


  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
    switch (status) {
      case "active":
        return `${baseClasses} bg-success/10 text-success`
      case "inactive":
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
          <h1 className="text-3xl font-semibold">Agents</h1>
          <p className="mt-2 text-sm text-muted-foreground">View and control your agent instances</p>
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
            <span>Loading agents...</span>
          </div>
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Bot className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No agents found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Make sure your UAS backend is running and agents are configured
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="grid gap-4 md:grid-cols-2">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className={`cursor-pointer rounded-lg border bg-card p-6 transition-colors ${
                    selectedAgent === agent.id ? "border-primary" : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedAgent(agent.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-primary/10 p-2">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{agent.name}</h3>
                        {agent.type && <p className="text-sm text-muted-foreground">{agent.type}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={getStatusBadge(agent.status)}>{agent.status}</span>
                      <div className="flex gap-1 mt-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleAgent(agent.id, !(agent.is_enabled ?? true));
                          }}
                          className="h-6 px-2 text-xs"
                        >
                          {(agent.is_enabled ?? true) ? 'Disable' : 'Enable'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestAgent(agent.id);
                          }}
                          className="h-6 px-2 text-xs"
                        >
                          Test
                        </Button>
                      </div>
                    </div>
                  </div>
            
                  <div className="mt-4 space-y-1">
                    {agent.runtimeStatus && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Runtime Status</span>
                        <span className="font-medium">{agent.runtimeStatus.status}</span>
                      </div>
                    )}
                    {agent.endpoint && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Endpoint</span>
                        <span className="font-mono text-xs truncate max-w-[120px]" title={agent.endpoint}>{agent.endpoint}</span>
                      </div>
                    )}
                    {agent.requestCount !== undefined && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Requests</span>
                        <span className="font-medium">{agent.requestCount}</span>
                      </div>
                    )}
                    {agent.activeSessions !== undefined && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Active Sessions</span>
                        <span className="font-medium">{agent.activeSessions}</span>
                      </div>
                    )}
                    {agent.priority !== undefined && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Priority</span>
                        <span className="font-medium">{agent.priority}</span>
                      </div>
                    )}
                    {agent.runtimeStatus?.cpu_usage_percent !== undefined && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">CPU</span>
                        <span className="font-medium">{agent.runtimeStatus.cpu_usage_percent}%</span>
                      </div>
                    )}
                    {agent.runtimeStatus?.memory_usage_mb !== undefined && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Memory</span>
                        <span className="font-medium">{agent.runtimeStatus.memory_usage_mb} MB</span>
                      </div>
                    )}
                    {agent.runtimeStatus?.active_tasks !== undefined && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Active Tasks</span>
                        <span className="font-medium">{agent.runtimeStatus.active_tasks}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              <h3 className="font-medium">Send Command</h3>
            </div>

            {selectedAgent ? (
              <div className="space-y-4">
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm text-muted-foreground">Selected Agent</p>
                  <p className="mt-1 font-medium">{agents.find((a) => a.id === selectedAgent)?.name}</p>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Enter command..."
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !sending) {
                        handleSendCommand()
                      }
                    }}
                    disabled={sending}
                  />
                  <Button onClick={handleSendCommand} disabled={!command.trim() || sending} size="icon">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Commands will be sent to the selected agent for execution
                </p>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">Select an agent to send commands</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
