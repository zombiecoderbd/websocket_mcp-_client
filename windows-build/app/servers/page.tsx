"use client";

import { useEffect, useState } from "react";
import { 
  Server, 
  Loader2, 
  RefreshCw, 
  Plus, 
  Search, 
  Filter,
  Activity,
  HardDrive,
  Clock,
  MapPin,
  Wifi,
  WifiOff,
  AlertTriangle,
  Wrench,
  MoreHorizontal,
  Cloud,
  Link,
  TestTube,
  CheckCircle,
  XCircle,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Server {
  id: number;
  name: string;
  hostname: string;
  ip_address: string;
  location: string;
  status: "online" | "offline" | "maintenance" | "degraded";
  cpu_load: number;
  memory_usage: number;
  disk_usage: number;
  uptime_seconds: number;
  last_heartbeat: string;
  provider_id: number | null;
  provider_name: string | null;
  provider_type: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface CloudProvider {
  id: number;
  name: string;
  type: string;
  api_endpoint: string;
  is_active: boolean;
  status: 'connected' | 'disconnected' | 'error';
  last_tested: string;
  response_time: number;
}

interface CloudTunnelStatus {
  tunnel_id: string;
  tunnel_name: string;
  status: 'active' | 'inactive' | 'error';
  connections: number;
  last_updated: string;
  public_url: string;
}

interface IntegrationStatus {
  providers_connected: number;
  total_providers: number;
  tunnel_status: 'active' | 'inactive' | 'error';
  proxy_status: 'active' | 'inactive' | 'error';
  overall_health: 'healthy' | 'degraded' | 'unhealthy';
}

interface ServerStats {
  total_servers: number;
  online_servers: number;
  offline_servers: number;
  maintenance_servers: number;
  degraded_servers: number;
  avg_cpu_load: number;
  avg_memory_usage: number;
  avg_disk_usage: number;
}

export default function ServersPage() {
  const [servers, setServers] = useState<Server[]>([]);
  const [cloudProviders, setCloudProviders] = useState<CloudProvider[]>([]);
  const [cloudTunnelStatus, setCloudTunnelStatus] = useState<CloudTunnelStatus | null>(null);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [testingProvider, setTestingProvider] = useState<number | null>(null);
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchServers = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "12"
      });
      
      if (searchTerm) {
        params.append("hostname", searchTerm);
      }
      
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const response = await fetch(`/api/proxy/servers?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setServers(data.data || []);
          setTotalPages(data.pagination?.totalPages || 1);
        } else {
          setServers([]);
        }
      } else {
        setServers([]);
      }
    } catch (error) {
      console.log("[v0] Failed to fetch servers:", error);
      setServers([]);
    }
  };

  const fetchCloudProviders = async () => {
    try {
      const response = await fetch('/api/proxy/servers/providers');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCloudProviders(data.data || []);
        }
      }
    } catch (error) {
      console.log("[v0] Failed to fetch cloud providers:", error);
    }
  };

  const fetchTunnelStatus = async () => {
    try {
      const response = await fetch('/api/proxy/servers/tunnel-status');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCloudTunnelStatus(data.data);
        }
      }
    } catch (error) {
      console.log("[v0] Failed to fetch tunnel status:", error);
    }
  };

  const fetchIntegrationStatus = async () => {
    try {
      const response = await fetch('/api/proxy/servers/integration-status');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setIntegrationStatus(data.data);
        }
      }
    } catch (error) {
      console.log("[v0] Failed to fetch integration status:", error);
    }
  };

  const testProviderConnection = async (providerId: number) => {
    setTestingProvider(providerId);
    try {
      const response = await fetch(`/api/proxy/servers/providers/${providerId}/test`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Refresh provider list to show updated status
          fetchCloudProviders();
        }
      }
    } catch (error) {
      console.log("[v0] Failed to test provider connection:", error);
    } finally {
      setTestingProvider(null);
    }
  };

  const refreshTunnelStatus = async () => {
    try {
      const response = await fetch('/api/proxy/servers/tunnel/refresh', {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCloudTunnelStatus(data.data);
        }
      }
    } catch (error) {
      console.log("[v0] Failed to refresh tunnel status:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/proxy/servers/stats/summary");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.data.overall);
        }
      }
    } catch (error) {
      console.log("[v0] Failed to fetch server stats:", error);
    }
  };

  useEffect(() => {
    fetchServers();
    fetchStats();
    fetchCloudProviders();
    fetchTunnelStatus();
    fetchIntegrationStatus();
    
    const interval = setInterval(() => {
      fetchServers();
      fetchStats();
      fetchCloudProviders();
      fetchTunnelStatus();
      fetchIntegrationStatus();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [currentPage, searchTerm, statusFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchServers();
    fetchStats();
    fetchCloudProviders();
    fetchTunnelStatus();
    fetchIntegrationStatus();
    setLoading(false);
    setRefreshing(false);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return <Wifi className="h-4 w-4 text-green-500" />;
      case "offline":
        return <WifiOff className="h-4 w-4 text-red-500" />;
      case "maintenance":
        return <Wrench className="h-4 w-4 text-yellow-500" />;
      case "degraded":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium";
    switch (status) {
      case "online":
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
      case "offline":
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
      case "maintenance":
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`;
      case "degraded":
        return `${baseClasses} bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200`;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const filteredServers = servers.filter(server => {
    const matchesSearch = server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         server.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         server.ip_address?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || server.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Server Management</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Monitor and manage all your infrastructure servers
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Server
          </Button>
        </div>
      </div>

      {/* Integration Status Cards */}
      {integrationStatus && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Providers Connected</CardTitle>
              <Cloud className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {integrationStatus.providers_connected}/{integrationStatus.total_providers}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tunnel Status</CardTitle>
              {integrationStatus.tunnel_status === 'active' ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${integrationStatus.tunnel_status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                {integrationStatus.tunnel_status.charAt(0).toUpperCase() + integrationStatus.tunnel_status.slice(1)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Proxy Status</CardTitle>
              {integrationStatus.proxy_status === 'active' ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${integrationStatus.proxy_status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                {integrationStatus.proxy_status.charAt(0).toUpperCase() + integrationStatus.proxy_status.slice(1)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              {integrationStatus.overall_health === 'healthy' ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : integrationStatus.overall_health === 'degraded' ? (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                integrationStatus.overall_health === 'healthy' ? 'text-green-600' :
                integrationStatus.overall_health === 'degraded' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {integrationStatus.overall_health.charAt(0).toUpperCase() + integrationStatus.overall_health.slice(1)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cloud Tunnel Status Card */}
      {cloudTunnelStatus && (
        <div className="mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  Cloudflare Tunnel Status
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={refreshTunnelStatus}
                    disabled={refreshing}
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className={`text-lg font-semibold ${
                    cloudTunnelStatus.status === 'active' ? 'text-green-600' :
                    cloudTunnelStatus.status === 'inactive' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {cloudTunnelStatus.status.charAt(0).toUpperCase() + cloudTunnelStatus.status.slice(1)}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground">Connections</div>
                  <div className="text-lg font-semibold">{cloudTunnelStatus.connections}</div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground">Public URL</div>
                  <div className="text-lg font-semibold truncate max-w-[200px]">
                    {cloudTunnelStatus.public_url || 'Not available'}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground">Last Updated</div>
                  <div className="text-lg font-semibold">
                    {new Date(cloudTunnelStatus.last_updated).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              
              {cloudTunnelStatus.public_url && (
                <div className="mt-4 pt-4 border-t">
                  <a
                    href={cloudTunnelStatus.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Visit Public URL
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cloud Providers Section */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Cloud Providers</h2>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Provider
          </Button>
        </div>
        
        {cloudProviders.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cloudProviders.map((provider) => (
              <Card key={provider.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-primary/10 p-2">
                        <Cloud className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold">{provider.name}</CardTitle>
                        <CardDescription className="text-sm capitalize">
                          {provider.type} Provider
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testProviderConnection(provider.id)}
                      disabled={testingProvider === provider.id}
                    >
                      {testingProvider === provider.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  <div className="mt-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      provider.status === 'connected' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      provider.status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {provider.status === 'connected' ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {provider.status.charAt(0).toUpperCase() + provider.status.slice(1)}
                    </span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">API Endpoint</span>
                    <span className="font-mono text-xs truncate max-w-[150px]">
                      {provider.api_endpoint}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Response Time</span>
                    <span className="font-medium">{provider.response_time}ms</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Tested</span>
                    <span className="text-xs">
                      {new Date(provider.last_tested).toLocaleTimeString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <Cloud className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No Cloud Providers Configured</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Add your first cloud provider to get started
            </p>
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Provider
            </Button>
          </Card>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_servers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Online</CardTitle>
              <Wifi className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.online_servers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Offline</CardTitle>
              <WifiOff className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.offline_servers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg CPU Load</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avg_cpu_load?.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search servers by name, hostname, or IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="degraded">Degraded</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Server Grid */}
      {loading ? (
        <div className="flex items-center justify-center rounded-lg border border-border bg-card p-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading servers...</span>
          </div>
        </div>
      ) : filteredServers.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Server className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No servers found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchTerm || statusFilter !== "all" 
              ? "Try adjusting your search or filter criteria" 
              : "Add your first server to get started"}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredServers.map((server) => (
            <Card key={server.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-primary/10 p-2">
                      <Server className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">{server.name}</CardTitle>
                      <CardDescription className="text-sm font-mono">
                        {server.hostname}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Edit Server</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        Delete Server
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={getStatusBadge(server.status)}>
                    {getStatusIcon(server.status)}
                    {server.status.charAt(0).toUpperCase() + server.status.slice(1)}
                  </span>
                  {server.location && (
                    <Badge variant="secondary" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {server.location}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {server.ip_address && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">IP Address</span>
                    <span className="font-mono text-xs">{server.ip_address}</span>
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">CPU Load</span>
                    <span className="text-sm font-medium">{server.cpu_load.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div 
                      className={`h-2 rounded-full ${
                        server.cpu_load > 80 ? 'bg-red-500' : 
                        server.cpu_load > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(server.cpu_load, 100)}%` }}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Memory</span>
                    <span className="text-sm font-medium">{server.memory_usage.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div 
                      className={`h-2 rounded-full ${
                        server.memory_usage > 80 ? 'bg-red-500' : 
                        server.memory_usage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(server.memory_usage, 100)}%` }}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Disk</span>
                    <span className="text-sm font-medium">{server.disk_usage.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div 
                      className={`h-2 rounded-full ${
                        server.disk_usage > 90 ? 'bg-red-500' : 
                        server.disk_usage > 75 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(server.disk_usage, 100)}%` }}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Uptime</span>
                  </div>
                  <span className="font-medium">{formatUptime(server.uptime_seconds)}</span>
                </div>
                
                {server.provider_name && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Provider</span>
                    <Badge variant="outline">{server.provider_name}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}