"use client"

import { useState, useEffect } from "react"
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Search,
  Plus,
  Edit,
  Save,
  X,
  RefreshCw,
  Loader2
} from "lucide-react"
import { toast } from "sonner"

interface ConfigItem {
  id: number
  config_key: string
  config_value: any
  config_type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  category: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export function ConfigManager() {
  const [configs, setConfigs] = useState<ConfigItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<ConfigItem | null>(null)
  const [formData, setFormData] = useState<{
    config_key: string;
    config_value: string;
    config_type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    category: string;
  }>({
    config_key: "",
    config_value: "",
    config_type: "string",
    description: "",
    category: "general"
  })

  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/config")
      const data = await response.json()
      
      if (data.success) {
        setConfigs(data.data.map((item: any) => ({
          ...item,
          config_value: typeof item.config_value === 'string' 
            ? item.config_value 
            : JSON.stringify(item.config_value)
        })))
      }
    } catch (error) {
      console.error("Failed to fetch configs:", error)
      toast.error("Failed to load configurations")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchConfigs()
  }

  const handleAddConfig = () => {
    setEditingConfig(null)
    setFormData({
      config_key: "",
      config_value: "",
      config_type: "string",
      description: "",
      category: "general"
    })
    setIsDialogOpen(true)
  }

  const handleEditConfig = (config: ConfigItem) => {
    setEditingConfig(config)
    setFormData({
      config_key: config.config_key,
      config_value: config.config_value,
      config_type: config.config_type,
      description: config.description,
      category: config.category
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    try {
      let valueToSubmit: any = formData.config_value
      
      // Parse value based on type
      switch (formData.config_type) {
        case "number":
          valueToSubmit = Number(formData.config_value)
          break
        case "boolean":
          valueToSubmit = formData.config_value === "true"
          break
        case "array":
        case "object":
          try {
            valueToSubmit = JSON.parse(formData.config_value)
          } catch (e) {
            toast.error("Invalid JSON format")
            return
          }
          break
        default:
          valueToSubmit = formData.config_value
      }

      const method = editingConfig ? "PUT" : "POST"
      const body: any = {
        config_key: formData.config_key,
        config_value: valueToSubmit,
        config_type: formData.config_type,
        description: formData.description,
        category: formData.category
      }

      if (editingConfig) {
        body.id = editingConfig.id
      }

      const response = await fetch("/api/admin/config", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })

      const result = await response.json()

      if (result.success) {
        toast.success(editingConfig ? "Configuration updated" : "Configuration added")
        setIsDialogOpen(false)
        fetchConfigs()
      } else {
        toast.error(result.error || "Failed to save configuration")
      }
    } catch (error) {
      console.error("Error saving config:", error)
      toast.error("Failed to save configuration")
    }
  }

  const getUniqueCategories = () => {
    return Array.from(new Set(configs.map(config => config.category)))
  }

  const filteredConfigs = configs.filter(config => {
    const matchesSearch = config.config_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         config.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || config.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const renderValue = (config: ConfigItem) => {
    if (config.config_type === "boolean") {
      return (
        <Badge variant={config.config_value === "true" ? "default" : "secondary"}>
          {config.config_value === "true" ? "True" : "False"}
        </Badge>
      )
    }
    
    if (config.config_type === "number") {
      return <span className="font-mono">{config.config_value}</span>
    }
    
    if (config.config_type === "array" || config.config_type === "object") {
      try {
        const parsed = JSON.parse(config.config_value)
        return (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">View JSON</summary>
            <pre className="mt-1 bg-muted p-2 rounded text-[10px] overflow-x-auto">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          </details>
        )
      } catch {
        return <span className="text-muted-foreground italic">Invalid JSON</span>
      }
    }
    
    return (
      <span 
        className="truncate max-w-xs block" 
        title={config.config_value}
      >
        {config.config_value}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading configurations...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Manage system-wide configuration settings
          </p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search configurations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {getUniqueCategories().map(category => (
                <SelectItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          
          <Button onClick={handleAddConfig}>
            <Plus className="h-4 w-4 mr-2" />
            Add Config
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration Items</CardTitle>
          <CardDescription>
            {filteredConfigs.length} configuration items found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConfigs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No configurations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConfigs.map(config => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{config.config_key}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {config.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{renderValue(config)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{config.config_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{config.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.is_active ? "default" : "destructive"}>
                          {config.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditConfig(config)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? "Edit Configuration" : "Add Configuration"}
            </DialogTitle>
            <DialogDescription>
              {editingConfig 
                ? "Modify the configuration settings below"
                : "Create a new configuration item"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="config_key" className="text-sm font-medium">
                Configuration Key
              </label>
              <Input
                id="config_key"
                value={formData.config_key}
                onChange={(e) => setFormData({...formData, config_key: e.target.value})}
                placeholder="e.g., admin.theme"
                disabled={!!editingConfig}
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="config_type" className="text-sm font-medium">
                Value Type
              </label>
              <Select 
                value={formData.config_type} 
                onValueChange={(value: any) => setFormData({...formData, config_type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="array">Array (JSON)</SelectItem>
                  <SelectItem value="object">Object (JSON)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="config_value" className="text-sm font-medium">
                Value
              </label>
              {formData.config_type === "boolean" ? (
                <Select 
                  value={formData.config_value} 
                  onValueChange={(value) => setFormData({...formData, config_value: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">True</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Textarea
                  id="config_value"
                  value={formData.config_value}
                  onChange={(e) => setFormData({...formData, config_value: e.target.value})}
                  placeholder={formData.config_type === "array" || formData.config_type === "object" 
                    ? '[{"key": "value"}]' 
                    : "Enter value"
                  }
                  rows={3}
                />
              )}
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="category" className="text-sm font-medium">
                Category
              </label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                placeholder="e.g., appearance, security, performance"
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe what this configuration does"
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              <Save className="h-4 w-4 mr-2" />
              {editingConfig ? "Update" : "Save"} Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}