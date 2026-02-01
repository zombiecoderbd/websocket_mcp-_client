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
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { 
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Filter,
  Search,
  RefreshCw,
  Settings
} from "lucide-react"

interface DynamicPageConfig {
  id: number
  page_key: string
  title: string
  description: string
  route_path: string
  component_type: 'list' | 'form' | 'dashboard' | 'custom'
  config_json: any
  is_active: boolean
  sort_order: number
  icon_name: string
  category: string
  permissions_required: string[]
}

interface DynamicFormData {
  id: number
  form_key: string
  title: string
  description: string
  target_table: string
  form_config: any
  validation_rules: any
  ui_config: any
  is_active: boolean
}

interface TableData {
  columns: any[]
  data: any[]
  total: number
  page: number
  pageSize: number
}

export function DynamicPage({ pageKey }: { pageKey: string }) {
  const [pageConfig, setPageConfig] = useState<DynamicPageConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [tableData, setTableData] = useState<TableData | null>(null)
  const [formData, setFormData] = useState<DynamicFormData | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentRecord, setCurrentRecord] = useState<any>(null)

  // Fetch page configuration
  useEffect(() => {
    const fetchPageConfig = async () => {
      try {
        const response = await fetch(`/api/admin/pages/${pageKey}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setPageConfig(data.data)
            
            // Fetch additional data based on component type
            if (data.data.component_type === 'list') {
              await fetchTableData(data.data.config_json?.target_table || pageKey)
            } else if (data.data.component_type === 'form') {
              await fetchFormData(data.data.config_json?.form_key || pageKey)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching page config:', error)
        toast({
          title: "Error",
          description: "Failed to load page configuration",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPageConfig()
  }, [pageKey])

  // Fetch table data for list components
  const fetchTableData = async (tableName: string) => {
    try {
      const params = new URLSearchParams({
        table: tableName,
        page: '1',
        pageSize: '20',
        search: searchTerm,
        ...filters
      })
      
      const response = await fetch(`/api/admin/data?${params}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setTableData(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching table data:', error)
    }
  }

  // Fetch form configuration
  const fetchFormData = async (formKey: string) => {
    try {
      const response = await fetch(`/api/admin/forms/${formKey}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setFormData(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching form data:', error)
    }
  }

  // Handle form submission
  const handleSubmit = async (formData: Record<string, any>) => {
    try {
      const response = await fetch('/api/admin/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table: pageConfig?.config_json?.target_table || pageKey,
          data: formData
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Data saved successfully",
        })
        setIsDialogOpen(false)
        setCurrentRecord(null)
        fetchTableData(pageConfig?.config_json?.target_table || pageKey)
      } else {
        throw new Error('Failed to save data')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save data",
        variant: "destructive",
      })
    }
  }

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this record?')) return

    try {
      const response = await fetch(`/api/admin/data/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table: pageConfig?.config_json?.target_table || pageKey
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Record deleted successfully",
        })
        fetchTableData(pageConfig?.config_json?.target_table || pageKey)
      } else {
        throw new Error('Failed to delete record')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete record",
        variant: "destructive",
      })
    }
  }

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Render error state
  if (!pageConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Page Not Found</h2>
          <p className="text-muted-foreground">The requested page configuration could not be found.</p>
        </div>
      </div>
    )
  }

  // Render based on component type
  switch (pageConfig.component_type) {
    case 'list':
      return <DynamicListPage 
        config={pageConfig} 
        data={tableData} 
        onRefresh={() => fetchTableData(pageConfig.config_json?.target_table || pageKey)}
        onEdit={(record) => {
          setCurrentRecord(record)
          setIsDialogOpen(true)
        }}
        onDelete={handleDelete}
        onSearch={setSearchTerm}
        onFilter={setFilters}
      />
    
    case 'form':
      return <DynamicFormPage 
        config={pageConfig} 
        formData={formData}
        onSubmit={handleSubmit}
      />
    
    case 'dashboard':
      return <DynamicDashboardPage config={pageConfig} />
    
    default:
      return (
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>{pageConfig.title}</CardTitle>
              <CardDescription>{pageConfig.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Custom component type not yet implemented.</p>
            </CardContent>
          </Card>
        </div>
      )
  }
}

// List Page Component
function DynamicListPage({ 
  config, 
  data, 
  onRefresh, 
  onEdit, 
  onDelete, 
  onSearch, 
  onFilter 
}: { 
  config: DynamicPageConfig
  data: TableData | null
  onRefresh: () => void
  onEdit: (record: any) => void
  onDelete: (id: number) => void
  onSearch: (term: string) => void
  onFilter: (filters: Record<string, any>) => void
}) {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{config.title}</h1>
          <p className="text-muted-foreground">{config.description}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add New
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Record</DialogTitle>
                <DialogDescription>
                  Create a new record for {config.title}
                </DialogDescription>
              </DialogHeader>
              <DynamicForm config={config} onSubmit={(data) => {
                // Handle form submission
                console.log('Form data:', data)
              }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search records..."
            className="pl-10"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {data?.data && data.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {data.columns.map((column: any) => (
                    <TableHead key={column.key}>{column.title}</TableHead>
                  ))}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((row: any) => (
                  <TableRow key={row.id}>
                    {data.columns.map((column: any) => (
                      <TableCell key={column.key}>
                        {column.key === 'status' ? (
                          <Badge variant={row[column.key] === 'active' ? 'default' : 'secondary'}>
                            {row[column.key]}
                          </Badge>
                        ) : (
                          String(row[column.key] || '')
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(row)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(row.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No records found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((data.page - 1) * data.pageSize) + 1} to {Math.min(data.page * data.pageSize, data.total)} of {data.total} records
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={data.page === 1}
              onClick={() => {
                // Handle previous page
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={data.page * data.pageSize >= data.total}
              onClick={() => {
                // Handle next page
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Form Page Component
function DynamicFormPage({ 
  config, 
  formData,
  onSubmit 
}: { 
  config: DynamicPageConfig
  formData: DynamicFormData | null
  onSubmit: (data: Record<string, any>) => void
}) {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>{config.title}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <DynamicForm config={config} formData={formData} onSubmit={onSubmit} />
        </CardContent>
      </Card>
    </div>
  )
}

// Dashboard Page Component
function DynamicDashboardPage({ config }: { config: DynamicPageConfig }) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{config.title}</h1>
        <p className="text-muted-foreground">{config.description}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Dashboard widgets would be rendered here based on config */}
        <Card>
          <CardHeader>
            <CardTitle>Sample Widget</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Dashboard content would be rendered here</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Dynamic Form Component
function DynamicForm({ 
  config, 
  formData,
  onSubmit 
}: { 
  config: DynamicPageConfig
  formData?: DynamicFormData | null
  onSubmit: (data: Record<string, any>) => void
}) {
  const [formValues, setFormValues] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form with default values
  useEffect(() => {
    if (formData?.form_config?.fields) {
      const initialValues: Record<string, any> = {}
      formData.form_config.fields.forEach((field: any) => {
        initialValues[field.name] = field.defaultValue || ''
      })
      setFormValues(initialValues)
    }
  }, [formData])

  const handleChange = (name: string, value: any) => {
    setFormValues(prev => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (formData?.validation_rules) {
      Object.keys(formData.validation_rules).forEach(field => {
        const rules = formData.validation_rules[field]
        const value = formValues[field]
        
        if (rules.required && (!value || value.toString().trim() === '')) {
          newErrors[field] = 'This field is required'
        }
        
        if (rules.minLength && value && value.toString().length < rules.minLength) {
          newErrors[field] = `Minimum length is ${rules.minLength} characters`
        }
        
        if (rules.maxLength && value && value.toString().length > rules.maxLength) {
          newErrors[field] = `Maximum length is ${rules.maxLength} characters`
        }
      })
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSubmit(formValues)
    }
  }

  if (!formData?.form_config?.fields) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Form configuration not available
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formData.form_config.fields.map((field: any) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>
            {field.label} {field.required && <span className="text-destructive">*</span>}
          </Label>
          
          {field.type === 'text' && (
            <Input
              id={field.name}
              value={formValues[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className={errors[field.name] ? 'border-destructive' : ''}
            />
          )}
          
          {field.type === 'textarea' && (
            <Textarea
              id={field.name}
              value={formValues[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className={errors[field.name] ? 'border-destructive' : ''}
            />
          )}
          
          {field.type === 'select' && (
            <Select
              value={formValues[field.name] || ''}
              onValueChange={(value) => handleChange(field.name, value)}
            >
              <SelectTrigger className={errors[field.name] ? 'border-destructive' : ''}>
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option: any) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {field.type === 'boolean' && (
            <div className="flex items-center space-x-2">
              <Switch
                id={field.name}
                checked={formValues[field.name] || false}
                onCheckedChange={(checked) => handleChange(field.name, checked)}
              />
              <Label htmlFor={field.name}>{field.placeholder}</Label>
            </div>
          )}
          
          {errors[field.name] && (
            <p className="text-sm text-destructive">{errors[field.name]}</p>
          )}
        </div>
      ))}
      
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={() => setFormValues({})}>
          Reset
        </Button>
        <Button type="submit">
          {formData.form_config.submitText || 'Submit'}
        </Button>
      </div>
    </form>
  )
}