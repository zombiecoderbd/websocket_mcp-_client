'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  RefreshCw, 
  Settings, 
  Activity, 
  User, 
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

// Define the JSX element type
import type { ReactElement } from 'react';

interface Agent {
  id: number;
  name: string;
  type: string;
  persona_name: string;
  description: string;
  status: string;
  request_count: number;
  active_sessions: number;
  last_active: string;
  greeting_prefix: string;
  signature_prefix: string;
  transparency_mode: string;
  error_handling_strategy: string;
  stats_request_count?: number;
  successful_responses?: number;
  error_count?: number;
  avg_response_time?: number;
}

export default function AgentList() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/management/agents');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch agents: ${response.status}`);
      }
      
      const data = await response.json();
      setAgents(data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching agents:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: ReactElement }> = {
      active: { variant: 'default', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      inactive: { variant: 'secondary', icon: <Clock className="h-3 w-3 mr-1" /> },
      error: { variant: 'destructive', icon: <XCircle className="h-3 w-3 mr-1" /> },
      busy: { variant: 'outline', icon: <Activity className="h-3 w-3 mr-1" /> }
    };

    const statusInfo = statusMap[status] || { variant: 'secondary', icon: <User className="h-3 w-3 mr-1" /> };
    
    return (
      <Badge variant={statusInfo.variant}>
        {statusInfo.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    const typeIcons: Record<string, ReactElement> = {
      editor: <Settings className="h-4 w-4" />,
      master: <User className="h-4 w-4" />,
      chatbot: <Activity className="h-4 w-4" />
    };

    return typeIcons[type] || <User className="h-4 w-4" />;
  };

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-destructive" />
              Error Loading Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchAgents}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Agent Management</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Agent
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <div className="flex justify-between">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Card key={agent.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{agent.name}</CardTitle>
                  {getTypeIcon(agent.type)}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {getStatusBadge(agent.status)}
                  <Badge variant="outline">{agent.type}</Badge>
                  <Badge variant="secondary">{agent.persona_name}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4 line-clamp-2">{agent.description}</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Requests:</span>
                    <span className="font-medium">{agent.request_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Sessions:</span>
                    <span className="font-medium">{agent.active_sessions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Active:</span>
                    <span className="font-medium">
                      {agent.last_active ? new Date(agent.last_active).toLocaleString() : 'Never'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t flex justify-between">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  <Button size="sm">
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {agents.length === 0 && !loading && (
        <div className="text-center py-12">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Agents Found</h3>
          <p className="text-muted-foreground mb-4">
            Get started by adding your first agent to the system.
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Agent
          </Button>
        </div>
      )}
    </div>
  );
}