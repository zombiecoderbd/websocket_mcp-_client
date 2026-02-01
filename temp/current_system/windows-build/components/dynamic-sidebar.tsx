"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard,
  Server,
  Bot,
  Database,
  Scale,
  FileCode,
  Terminal,
  Mic,
  Smartphone,
  Settings,
  Code2,
  BookOpen,
  Cloud,
  MessageSquare,
  Lightbulb,
  CheckSquare,
  Music,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Eye,
  EyeOff
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { toast } from "@/hooks/use-toast"

// Icon mapping for dynamic menu items
const iconMap = {
  LayoutDashboard,
  Server,
  Bot,
  Database,
  Scale,
  FileCode,
  Terminal,
  Mic,
  Smartphone,
  Settings,
  Code2,
  BookOpen,
  Cloud,
  MessageSquare,
  Lightbulb,
  CheckSquare,
  Music,
  GripVertical,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight
}

interface MenuItem {
  id: number
  name: string
  display_name: string
  href: string
  icon_name: string
  category: string
  sort_order: number
  is_active: boolean
  is_visible: boolean
}

// Default navigation items (fallback)
const defaultNavigation: MenuItem[] = [
  { id: 1, name: "Dashboard", display_name: "Dashboard", href: "/", icon_name: "LayoutDashboard", category: "main", sort_order: 1, is_active: true, is_visible: true },
  { id: 2, name: "Models", display_name: "AI Models", href: "/models", icon_name: "Server", category: "main", sort_order: 2, is_active: true, is_visible: true },
  { id: 3, name: "Ollama Models", display_name: "Ollama Models", href: "/ollama-models", icon_name: "Server", category: "main", sort_order: 3, is_active: true, is_visible: true },
  { id: 4, name: "Agents", display_name: "AI Agents", href: "/agents", icon_name: "Bot", category: "main", sort_order: 4, is_active: true, is_visible: true },
  { id: 5, name: "Servers", display_name: "Server Management", href: "/servers", icon_name: "Server", category: "main", sort_order: 5, is_active: true, is_visible: true },
  { id: 6, name: "Memory", display_name: "Agent Memory", href: "/memory", icon_name: "Database", category: "main", sort_order: 6, is_active: true, is_visible: true },
  { id: 7, name: "Load Balancer", display_name: "Load Balancer", href: "/loadbalancer", icon_name: "Scale", category: "main", sort_order: 7, is_active: true, is_visible: true },
  { id: 8, name: "Prompt Templates", display_name: "Prompt Templates", href: "/prompt-templates", icon_name: "FileCode", category: "main", sort_order: 8, is_active: true, is_visible: true },
  { id: 9, name: "CLI Agent", display_name: "CLI Agent", href: "/cli-agent", icon_name: "Terminal", category: "tools", sort_order: 9, is_active: true, is_visible: true },
  { id: 10, name: "Editor Integration", display_name: "Editor Integration", href: "/editor-integration", icon_name: "Code2", category: "tools", sort_order: 10, is_active: true, is_visible: true },
  { id: 11, name: "Audio Test", display_name: "Audio Test", href: "/audio-test", icon_name: "Mic", category: "tools", sort_order: 11, is_active: true, is_visible: true },
  { id: 12, name: "Mobile Editor", display_name: "Mobile Editor", href: "/mobile-editor", icon_name: "Smartphone", category: "tools", sort_order: 12, is_active: true, is_visible: true },
  { id: 13, name: "Terminal Commands", display_name: "Terminal Commands", href: "/terminal-commands", icon_name: "BookOpen", category: "tools", sort_order: 13, is_active: true, is_visible: true },
  { id: 14, name: "Cloud Providers", display_name: "Cloud Providers", href: "/providers", icon_name: "Cloud", category: "infrastructure", sort_order: 14, is_active: true, is_visible: true },
  { id: 15, name: "AI Chat", display_name: "AI Chat", href: "/chat", icon_name: "MessageSquare", category: "communication", sort_order: 15, is_active: true, is_visible: true },
  { id: 16, name: "Project Ideas", display_name: "Project Ideas", href: "/project-ideas", icon_name: "Lightbulb", category: "planning", sort_order: 16, is_active: true, is_visible: true },
  { id: 17, name: "Settings", display_name: "System Settings", href: "/settings", icon_name: "Settings", category: "system", sort_order: 17, is_active: true, is_visible: true }
]

export function DynamicSidebar() {
  const pathname = usePathname()
  const [menuItems, setMenuItems] = useState<MenuItem[]>(defaultNavigation)
  const [loading, setLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'main': true,
    'tools': true,
    'infrastructure': true,
    'communication': true,
    'planning': true,
    'system': true
  })
  const [editMode, setEditMode] = useState(false)

  // Fetch menu items from API
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const response = await fetch('/api/admin/menu-items')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            // Group items by category and sort
            const groupedItems = data.data
              .filter((item: MenuItem) => item.is_active && item.is_visible)
              .sort((a: MenuItem, b: MenuItem) => {
                if (a.category !== b.category) {
                  return a.category.localeCompare(b.category)
                }
                return a.sort_order - b.sort_order
              })
            
            setMenuItems(groupedItems)
          }
        }
      } catch (error) {
        console.warn('Failed to fetch menu items from API, using defaults:', error)
        // Use default navigation if API fails
        setMenuItems(defaultNavigation)
      } finally {
        setLoading(false)
      }
    }

    fetchMenuItems()
  }, [])

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  // Get unique categories
  const categories = Array.from(new Set(menuItems.map(item => item.category)))
    .sort()

  // Group items by category
  const groupedItems = categories.reduce((acc, category) => {
    acc[category] = menuItems.filter(item => item.category === category)
    return acc
  }, {} as Record<string, MenuItem[]>)

  // Handle drag and drop reordering
  const handleDragStart = (e: React.DragEvent, itemId: number) => {
    e.dataTransfer.setData('text/plain', itemId.toString())
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetItemId: number) => {
    e.preventDefault()
    const draggedItemId = parseInt(e.dataTransfer.getData('text/plain'))
    
    if (draggedItemId === targetItemId) return

    try {
      const response = await fetch('/api/admin/menu-items/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          draggedItemId,
          targetItemId
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Menu item reordered successfully",
        })
        // Refresh menu items
        window.location.reload()
      } else {
        throw new Error('Failed to reorder items')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reorder menu items",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <aside className="w-64 border-r border-border bg-background">
        <div className="p-4">
          <div className="h-6 bg-muted animate-pulse rounded"></div>
        </div>
        <nav className="flex flex-col gap-2 p-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded"></div>
          ))}
        </nav>
      </aside>
    )
  }

  return (
    <aside className="w-64 border-r border-border bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Navigation</h2>
          <button
            onClick={() => setEditMode(!editMode)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {editMode ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto p-2">
        {categories.map(category => (
          <div key={category} className="mb-2">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category)}
              className="flex items-center justify-between w-full px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide hover:bg-secondary/50 rounded"
            >
              <span>{category}</span>
              {expandedCategories[category] ? 
                <ChevronDown className="h-3 w-3" /> : 
                <ChevronRight className="h-3 w-3" />
              }
            </button>

            {/* Category Items */}
            {expandedCategories[category] && (
              <div className="ml-2 mt-1 space-y-1">
                {groupedItems[category]?.map((item) => {
                  const IconComponent = iconMap[item.icon_name as keyof typeof iconMap] || LayoutDashboard
                  const isActive = pathname === item.href
                  
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      draggable={editMode}
                      onDragStart={editMode ? (e) => handleDragStart(e, item.id) : undefined}
                      onDragOver={editMode ? handleDragOver : undefined}
                      onDrop={editMode ? (e) => handleDrop(e, item.id) : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors relative group",
                        isActive
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                        editMode && "cursor-move"
                      )}
                    >
                      {editMode && (
                        <GripVertical className="h-4 w-4 text-muted-foreground absolute left-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                      <IconComponent className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{item.display_name || item.name}</span>
                      {editMode && (
                        <div className="ml-auto flex gap-1">
                          {item.is_visible ? (
                            <Eye className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <EyeOff className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      {editMode && (
        <div className="p-3 border-t border-border bg-muted/50 text-xs text-muted-foreground">
          <p>Drag items to reorder • Click items to toggle visibility</p>
        </div>
      )}
    </aside>
  )
}