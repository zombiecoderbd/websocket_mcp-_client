'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Settings, 
  User, 
  Activity, 
  BarChart3,
  MessageSquare,
  Key,
  Globe
} from 'lucide-react';

// Define the JSX element type
import type { ReactElement } from 'react';

interface AgentDetail {
  id: number;
  name: string;
  type: string;
  persona_name: string;
  description: string;
  status: string;
  config: any;
  ui_config: any;
  greeting_prefix: string;
  signature_prefix: string;
  transparency_mode: string;
  error_handling_strategy: string;
  request_count: number;
  active_sessions: number;
  last_active: string;
  response_templates: Array<{
    template_type: string;
    template_content: string;
    language: string;
  }>;
  statistics: Array<{
    date: string;
    request_count: number;
    successful_responses: number;
    error_count: number;
    avg_response_time: number;
  }>;
}

export default function AgentDetail() {
  const { id } = useParams();
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchAgentDetails(Number(id));
    }
  }, [id]);

  const fetchAgentDetails = async (agentId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/management/agents/${agentId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch agent: ${response.status}`);
      }
      
      const data = await response.json();
      setAgent(data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching agent details:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-destructive" />
              Error Loading Agent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => fetchAgentDetails(Number(id))}>
              <Settings className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-4" />
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
            
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Agent Not Found</h3>
        <p className="text-muted-foreground">
          The requested agent does not exist or has been removed.
        </p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { variant: 'default' },
      inactive: { variant: 'secondary' },
      error: { variant: 'destructive' },
      busy: { variant: 'outline' }
    };

    const variant = statusMap[status]?.variant || 'secondary';
    
    return (
      <Badge variant={variant}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{agent.name}</h1>
          <p className="text-muted-foreground">{agent.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
          <Button>
            <Activity className="h-4 w-4 mr-2" />
            Activate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Info Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Agent Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(agent.status)}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="mt-1">{agent.type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Persona</p>
                <p className="mt-1">{agent.persona_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transparency Mode</p>
                <p className="mt-1">{agent.transparency_mode}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Greeting Prefix</p>
              <p className="font-mono bg-muted p-2 rounded">{agent.greeting_prefix}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Signature Prefix</p>
              <p className="font-mono bg-muted p-2 rounded">{agent.signature_prefix}</p>
            </div>
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Total Requests</span>
              <span className="font-medium">{agent.request_count}</span>
            </div>
            <div className="flex justify-between">
              <span>Active Sessions</span>
              <span className="font-medium">{agent.active_sessions}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Active</span>
              <span className="font-medium">
                {agent.last_active ? new Date(agent.last_active).toLocaleString() : 'Never'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Error Strategy</span>
              <span className="font-medium">{agent.error_handling_strategy}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Response Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Response Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agent.response_templates.map((template, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <Badge variant="outline">{template.template_type}</Badge>
                  <Badge variant="secondary">{template.language}</Badge>
                </div>
                <p className="whitespace-pre-line text-sm font-mono bg-muted p-2 rounded">
                  {template.template_content}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Agent Config</h4>
              <pre className="bg-muted p-3 rounded text-sm overflow-x-auto max-h-60">
                {JSON.stringify(agent.config, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="font-medium mb-2">UI Config</h4>
              <pre className="bg-muted p-3 rounded text-sm overflow-x-auto max-h-60">
                {JSON.stringify(agent.ui_config, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}