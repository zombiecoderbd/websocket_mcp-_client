"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { 
  Plus,
  Edit,
  Trash2,
  Save,
  RefreshCw,
  Settings,
  Database,
  Palette,
  Shield,
  Server,
  Activity
} from "lucide-react"

interface AdminSetting {
  id: number
  setting_key: string
  setting_value: string
  display_name: string
  description: string
  setting_type: 'string' | 'integer' | 'boolean' | 'json' | 'array'
  category: string
  is_editable: boolean
  ui_config: any
  created_at: string
  updated_at: string
}

interface ServiceStatus {
  service_name: string
  service_type: string
  status: 'online' | 'offline' | 'degraded' | 'maintenance'
  last_check_timestamp: string
  response_time_ms: number
  error_message: string | null
}

export function AdminConfiguration() {
  const [settings, setSettings] = useState<AdminSetting[]>([])
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("general")
  const [editingSetting, setEditingSetting] = useState<number | null>(null)
  const [editValue, setEditValue] = useState("")

  // Fetch settings and service status
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch settings
        const settingsResponse = await fetch('/api/admin/settings')
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json()
          if (settingsData.success) {
            setSettings(settingsData.data)
          }
        }

        // Fetch service status
        const serviceResponse = await fetch('/api/admin/services/status')
        if (serviceResponse.ok) {
          const serviceData = await serviceResponse.json()
          if (serviceData.success) {
            setServiceStatus(serviceData.data)
          }
        }
      } catch (error) {
        console.error('Error fetching admin data:', error)
        toast({
          title: "Error",
          description: "Failed to load admin configuration",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Handle setting update
  const updateSetting = async (settingId: number, newValue: string) => {
    try {
      const response = await fetch(`/api/admin/settings/${settingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ setting_value: newValue })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Setting updated successfully",
        })
        setEditingSetting(null)
        setEditValue("")
        // Refresh settings
        const refreshResponse = await fetch('/api/admin/settings')
        if (refreshResponse.ok) {
          const data = await refreshResponse.json()
          if (data.success) {
            setSettings(data.data)
          }
        }
      } else {
        throw new Error('Failed to update setting')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update setting",
        variant: "destructive",
      })
    }
  }

  // Handle service restart
  const restartService = async (serviceName: string) => {
    try {
      const response = await fetch('/api/admin/services/restart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ service_name: serviceName })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Service ${serviceName} restart initiated`,
        })
        // Refresh service status
        setTimeout(async () => {
          const refreshResponse = await fetch('/api/admin/services/status')
          if (refreshResponse.ok) {
            const data = await refreshResponse.json()
            if (data.success) {
              setServiceStatus(data.data)
            }
          }
        }, 2000)
      } else {
        throw new Error('Failed to restart service')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to restart service",
        variant: "destructive",
      })
    }
  }

  // Get unique categories
  const categories = Array.from(new Set(settings.map(s => s.category))).sort()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Configuration</h1>
        <p className="text-muted-foreground">Manage system settings and monitor services</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Services
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure basic system settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {categories
                  .filter(cat => ['general', 'display', 'performance'].includes(cat))
                  .map(category => (
                    <div key={category} className="space-y-4">
                      <h3 className="text-lg font-medium capitalize">{category} Settings</h3>
                      <div className="grid gap-4">
                        {settings
                          .filter(s => s.category === category)
                          .map(setting => (
                            <div key={setting.id} className="flex items-start gap-4">
                              <div className="flex-1 space-y-1">
                                <Label htmlFor={`setting-${setting.id}`}>
                                  {setting.display_name}
                                  {!setting.is_editable && (
                                    <Badge variant="secondary" className="ml-2">Read-only</Badge>
                                  )}
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  {setting.description}
                                </p>
                                {editingSetting === setting.id ? (
                                  <div className="flex gap-2 mt-2">
                                    {setting.setting_type === 'boolean' ? (
                                      <Switch
                                        checked={editValue === 'true'}
                                        onCheckedChange={(checked) => 
                                          setEditValue(checked ? 'true' : 'false')
                                        }
                                      />
                                    ) : setting.setting_type === 'integer' ? (
                                      <Input
                                        type="number"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="max-w-32"
                                      />
                                    ) : (
                                      <Input
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                      />
                                    )}
                                    <Button
                                      size="sm"
                                      onClick={() => updateSetting(setting.id, editValue)}
                                    >
                                      <Save className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingSetting(null)
                                        setEditValue("")
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                      {setting.setting_value}
                                    </span>
                                    {setting.is_editable && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingSetting(setting.id)
                                          setEditValue(setting.setting_value)
                                        }}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>Customize the look and feel of the admin panel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {settings
                  .filter(s => s.category === 'appearance')
                  .map(setting => (
                    <div key={setting.id} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>{setting.display_name}</Label>
                        <p className="text-sm text-muted-foreground">
                          {setting.description}
                        </p>
                      </div>
                      {setting.setting_type === 'boolean' ? (
                        <Switch
                          checked={setting.setting_value === 'true'}
                          onCheckedChange={(checked) => 
                            updateSetting(setting.id, checked ? 'true' : 'false')
                          }
                          disabled={!setting.is_editable}
                        />
                      ) : (
                        <Select
                          value={setting.setting_value}
                          onValueChange={(value) => updateSetting(setting.id, value)}
                          disabled={!setting.is_editable}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {setting.ui_config?.options?.map((option: string) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure security and access controls</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {settings
                  .filter(s => s.category === 'security')
                  .map(setting => (
                    <div key={setting.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>{setting.display_name}</Label>
                          <p className="text-sm text-muted-foreground">
                            {setting.description}
                          </p>
                        </div>
                        {setting.setting_type === 'boolean' ? (
                          <Switch
                            checked={setting.setting_value === 'true'}
                            onCheckedChange={(checked) => 
                              updateSetting(setting.id, checked ? 'true' : 'false')
                            }
                            disabled={!setting.is_editable}
                          />
                        ) : (
                          <div className="flex gap-2">
                            <Textarea
                              value={setting.setting_value}
                              onChange={(e) => updateSetting(setting.id, e.target.value)}
                              className="w-64"
                              disabled={!setting.is_editable}
                            />
                            <Button
                              size="sm"
                              onClick={() => updateSetting(setting.id, setting.setting_value)}
                              disabled={!setting.is_editable}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Monitoring */}
        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Monitoring</CardTitle>
              <CardDescription>Monitor and manage system services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Service Status</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const response = await fetch('/api/admin/services/status')
                      if (response.ok) {
                        const data = await response.json()
                        if (data.success) {
                          setServiceStatus(data.data)
                        }
                      }
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Response Time</TableHead>
                      <TableHead>Last Check</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceStatus.map((service) => (
                      <TableRow key={service.service_name}>
                        <TableCell className="font-medium">{service.service_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{service.service_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              service.status === 'online' ? 'default' : 
                              service.status === 'degraded' ? 'destructive' : 'secondary'
                            }
                          >
                            {service.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {service.response_time_ms ? `${service.response_time_ms}ms` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {service.last_check_timestamp 
                            ? new Date(service.last_check_timestamp).toLocaleString() 
                            : 'Never'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => restartService(service.service_name)}
                            disabled={service.status === 'online'}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}