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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Filter,
  RefreshCw,
  Loader2,
  Calendar,
  User,
  Database,
  Activity
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

interface AuditLog {
  id: number
  user_id: string
  user_name: string
  action_type: string
  target_resource: string
  target_id: string
  old_values: string | null
  new_values: string | null
  ip_address: string
  user_agent: string
  success: boolean
  error_message: string | null
  created_at: string
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [userFilter, setUserFilter] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [resourceFilter, setResourceFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 20

  useEffect(() => {
    fetchAuditLogs()
  }, [currentPage, searchTerm, userFilter, actionFilter, resourceFilter])

  const fetchAuditLogs = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString()
      })

      if (searchTerm) params.append('search', searchTerm)
      if (userFilter) params.append('user_id', userFilter)
      if (actionFilter !== 'all') params.append('action_type', actionFilter)
      if (resourceFilter !== 'all') params.append('target_resource', resourceFilter)

      const response = await fetch(`/api/admin/audit?${params}`)
      const data = await response.json()

      if (data.success) {
        setLogs(data.data || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setTotalCount(data.pagination?.total || 0)
      } else {
        setLogs([])
        toast.error("Failed to fetch audit logs")
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error)
      toast.error("Failed to fetch audit logs")
      setLogs([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchAuditLogs()
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'CREATE': return '➕'
      case 'UPDATE': return '✏️'
      case 'DELETE': return '🗑️'
      case 'VIEW': return '👁️'
      case 'CONFIGURE': return '⚙️'
      case 'LOGIN': return '🔐'
      case 'LOGOUT': return '🔓'
      default: return '📝'
    }
  }

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'CREATE': return 'bg-green-100 text-green-800'
      case 'UPDATE': return 'bg-blue-100 text-blue-800'
      case 'DELETE': return 'bg-red-100 text-red-800'
      case 'CONFIGURE': return 'bg-purple-100 text-purple-800'
      case 'LOGIN': return 'bg-cyan-100 text-cyan-800'
      case 'LOGOUT': return 'bg-gray-100 text-gray-800'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getResourceIcon = (resource: string) => {
    switch (resource) {
      case 'agents': return '🤖'
      case 'models': return '🧠'
      case 'providers': return '☁️'
      case 'servers': return '🖥️'
      case 'admin_configs': return '⚙️'
      case 'dynamic_forms': return '📋'
      default: return '📦'
    }
  }

  const formatJsonDiff = (oldValues: string | null, newValues: string | null) => {
    if (!oldValues && !newValues) return null

    let oldObj: any = null
    let newObj: any = null

    try {
      oldObj = oldValues ? JSON.parse(oldValues) : {}
      newObj = newValues ? JSON.parse(newValues) : {}
    } catch {
      return (
        <div className="text-xs font-mono bg-muted p-2 rounded">
          {oldValues && <div className="text-red-500">- {oldValues}</div>}
          {newValues && <div className="text-green-500">+ {newValues}</div>}
        </div>
      )
    }

    const changes: Array<{key: string, oldValue: any, newValue: any, type: 'added' | 'removed' | 'changed'}> = []
    
    // Check for added/changed fields
    Object.keys(newObj).forEach(key => {
      if (!(key in oldObj)) {
        changes.push({ key, oldValue: undefined, newValue: newObj[key], type: 'added' })
      } else if (oldObj[key] !== newObj[key]) {
        changes.push({ key, oldValue: oldObj[key], newValue: newObj[key], type: 'changed' })
      }
    })

    // Check for removed fields
    Object.keys(oldObj).forEach(key => {
      if (!(key in newObj)) {
        changes.push({ key, oldValue: oldObj[key], newValue: undefined, type: 'removed' })
      }
    })

    if (changes.length === 0) return null

    return (
      <div className="text-xs font-mono bg-muted p-2 rounded max-h-32 overflow-y-auto">
        {changes.map((change, index) => (
          <div key={index} className="mb-1">
            {change.type === 'added' && (
              <div className="text-green-600">+ {change.key}: {JSON.stringify(change.newValue)}</div>
            )}
            {change.type === 'removed' && (
              <div className="text-red-600">- {change.key}: {JSON.stringify(change.oldValue)}</div>
            )}
            {change.type === 'changed' && (
              <>
                <div className="text-red-600">- {change.key}: {JSON.stringify(change.oldValue)}</div>
                <div className="text-green-600">+ {change.key}: {JSON.stringify(change.newValue)}</div>
              </>
            )}
          </div>
        ))}
      </div>
    )
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === "" || 
      log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.target_resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action_type.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading audit logs...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audit Logs</h2>
          <p className="text-sm text-muted-foreground">
            System activity and security audit trail
          </p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-8 w-64"
            />
          </div>
          
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground">User</label>
          <Input
            placeholder="Filter by user ID..."
            value={userFilter}
            onChange={(e) => {
              setUserFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="mt-1"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium text-muted-foreground">Action Type</label>
          <Select value={actionFilter} onValueChange={(value) => {
            setActionFilter(value)
            setCurrentPage(1)
          }}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="CREATE">Create</SelectItem>
              <SelectItem value="UPDATE">Update</SelectItem>
              <SelectItem value="DELETE">Delete</SelectItem>
              <SelectItem value="VIEW">View</SelectItem>
              <SelectItem value="CONFIGURE">Configure</SelectItem>
              <SelectItem value="LOGIN">Login</SelectItem>
              <SelectItem value="LOGOUT">Logout</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-sm font-medium text-muted-foreground">Resource</label>
          <Select value={resourceFilter} onValueChange={(value) => {
            setResourceFilter(value)
            setCurrentPage(1)
          }}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="All resources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              <SelectItem value="agents">Agents</SelectItem>
              <SelectItem value="models">Models</SelectItem>
              <SelectItem value="providers">Providers</SelectItem>
              <SelectItem value="servers">Servers</SelectItem>
              <SelectItem value="admin_configs">Configurations</SelectItem>
              <SelectItem value="dynamic_forms">Forms</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <span className="text-2xl">✅</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter(log => log.success).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <span className="text-2xl">❌</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {logs.filter(log => !log.success).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(logs.map(log => log.user_id)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            {filteredLogs.length} logs found (showing {Math.min(pageSize, filteredLogs.length)} per page)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map(log => (
                    <TableRow key={log.id} className={log.success ? "" : "bg-destructive/5"}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">
                              {format(new Date(log.created_at), 'MMM dd, yyyy')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), 'HH:mm:ss')}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">
                              {log.user_name || log.user_id || 'System'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {log.ip_address}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge className={`${getActionColor(log.action_type)} gap-1`}>
                          <span>{getActionIcon(log.action_type)}</span>
                          {log.action_type}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getResourceIcon(log.target_resource)}</span>
                          <span className="text-sm capitalize">{log.target_resource}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {log.target_id || 'N/A'}
                        </code>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant={log.success ? "default" : "destructive"}>
                          {log.success ? "Success" : "Failed"}
                        </Badge>
                        {!log.success && log.error_message && (
                          <div className="text-xs text-destructive mt-1">
                            {log.error_message}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Changes Preview */}
          {filteredLogs.some(log => log.old_values || log.new_values) && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Recent Changes</h3>
              <div className="space-y-3">
                {filteredLogs
                  .filter(log => log.old_values || log.new_values)
                  .slice(0, 3)
                  .map(log => (
                    <Card key={log.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">
                            {log.user_name || log.user_id} {log.action_type.toLowerCase()}d {log.target_resource}
                          </CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {format(new Date(log.created_at), 'MMM dd, HH:mm')}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {formatJsonDiff(log.old_values, log.new_values)}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}