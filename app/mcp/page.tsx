"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Play,
  Pause,
  RotateCcw,
  Download,
  Upload,
  Terminal,
  Server,
  Bot,
  Activity,
  Zap,
  Trash2,
  Settings,
  Network,
  Database
} from "lucide-react";

export default function MCPPage() {
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [messages, setMessages] = useState<string[]>([
    "[System] MCP Client initialized. Ready to connect to ZombieCoder system..."
  ]);
  const [command, setCommand] = useState("");
  const [agentList, setAgentList] = useState([
    { id: "sys-001", name: "System Agent", type: "Core", status: "active", lastSeen: new Date() },
    { id: "web-001", name: "Web Agent", type: "Web", status: "active", lastSeen: new Date() },
    { id: "db-001", name: "Database Agent", type: "Database", status: "active", lastSeen: new Date() }
  ]);
  const [serverList, setServerList] = useState([
    { id: "mcp-001", name: "MCP Server", port: 8080, status: "online", type: "MCP" },
    { id: "dap-001", name: "DAP Server", port: 8081, status: "online", type: "DAP" },
    { id: "lsp-001", name: "LSP Server", port: 8082, status: "online", type: "LSP" },
    { id: "proxy-001", name: "Proxy Server", port: 8083, status: "online", type: "Proxy" }
  ]);
  const [stats, setStats] = useState({
    messages: 0,
    connectedTime: 0,
    agents: 3,
    servers: 4
  });

  // Simulate connection
  const connect = () => {
    setConnectionStatus("connecting");
    setTimeout(() => {
      setConnectionStatus("connected");
      addMessage("Connected to MCP server successfully");
      startConnectionTimer();
    }, 1500);
  };

  const disconnect = () => {
    setConnectionStatus("disconnected");
    addMessage("Disconnected from MCP server");
  };

  const addMessage = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setMessages(prev => [...prev, `[${timestamp}] ${msg}`]);
  };

  const sendCommand = () => {
    if (!command.trim()) return;
    
    addMessage(`Sending command: ${command}`);
    setCommand("");
    
    // Simulate response
    setTimeout(() => {
      addMessage("Command executed successfully");
    }, 1000);
  };

  const clearHistory = () => {
    setMessages(["[System] Message history cleared"]);
    setStats(prev => ({ ...prev, messages: 0 }));
  };

  const startConnectionTimer = () => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      if (connectionStatus === "connected") {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setStats(prev => ({ ...prev, connectedTime: elapsed }));
      } else {
        clearInterval(timer);
      }
    }, 1000);
  };

  // Simulate auto-refreshing stats
  useEffect(() => {
    const interval = setInterval(() => {
      if (connectionStatus === "connected") {
        setStats(prev => ({ 
          ...prev, 
          messages: prev.messages + Math.floor(Math.random() * 2)
        }));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [connectionStatus]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Network className="h-8 w-8 text-blue-500" />
            ZombieCoder MCP Client
          </h1>
          <p className="text-muted-foreground mt-2">
            Real-time system monitoring and agent communication protocol
          </p>
        </div>
        
        <div className="flex gap-2">
          {connectionStatus === "disconnected" && (
            <Button onClick={connect} className="bg-green-600 hover:bg-green-700">
              <Play className="h-4 w-4 mr-2" />
              Connect
            </Button>
          )}
          
          {connectionStatus === "connecting" && (
            <Button disabled className="bg-yellow-600 hover:bg-yellow-700">
              <Zap className="h-4 w-4 mr-2 animate-pulse" />
              Connecting...
            </Button>
          )}
          
          {connectionStatus === "connected" && (
            <Button onClick={disconnect} variant="destructive">
              <Pause className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          )}
          
          <Button onClick={() => {
            setAgentList([
              { id: "sys-001", name: "System Agent", type: "Core", status: "active", lastSeen: new Date() },
              { id: "web-001", name: "Web Agent", type: "Web", status: "active", lastSeen: new Date() },
              { id: "db-001", name: "Database Agent", type: "Database", status: "active", lastSeen: new Date() },
              { id: "ai-001", name: "AI Agent", type: "AI", status: "active", lastSeen: new Date() }
            ]);
            setStats(prev => ({ ...prev, agents: 4 }));
          }}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Connection Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge 
                variant={connectionStatus === "connected" ? "default" : connectionStatus === "connecting" ? "secondary" : "destructive"}
              >
                {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Messages</span>
              <span className="font-medium">{stats.messages}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Connected Time</span>
              <span className="font-medium">{stats.connectedTime}s</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Active Agents</span>
              <span className="font-medium">{stats.agents}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Active Servers</span>
              <span className="font-medium">{stats.servers}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Message History
            </CardTitle>
            <CardDescription>
              Real-time communication logs with system agents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-80 overflow-y-auto">
              {messages.map((msg, index) => (
                <div key={index} className="py-1 border-b border-gray-800 last:border-0">
                  {msg}
                </div>
              ))}
            </div>
            
            <div className="flex gap-2 mt-4">
              <Input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Enter command for agents..."
                onKeyPress={(e) => e.key === 'Enter' && sendCommand()}
              />
              <Button onClick={sendCommand}>
                <Terminal className="h-4 w-4 mr-2" />
                Send
              </Button>
              <Button onClick={clearHistory} variant="outline">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import Config
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Database className="h-4 w-4 mr-2" />
              View Logs
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Bot className="h-4 w-4 mr-2" />
              Manage Agents
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Server className="h-4 w-4 mr-2" />
              Server Config
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              System Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {agentList.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">{agent.name}</div>
                    <div className="text-xs text-muted-foreground">{agent.id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{agent.type}</Badge>
                    <Badge 
                      variant={agent.status === "active" ? "default" : "destructive"}
                    >
                      {agent.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Server List
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {serverList.map((server) => (
                <div key={server.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">{server.name}</div>
                    <div className="text-xs text-muted-foreground">Port: {server.port}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{server.type}</Badge>
                    <Badge 
                      variant={server.status === "online" ? "default" : "destructive"}
                    >
                      {server.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}