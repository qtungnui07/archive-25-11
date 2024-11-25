'use client'

import { useState, useEffect } from 'react'
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

import { Plus, Undo2, Redo2, Settings2, ChevronDown, X, FileText, ChevronRight} from 'lucide-react'
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface MathEquation {
  id: number
  equation: string
  type: 'linear' | 'quadratic'
}

interface Page {
  id: number
  name: string
}

interface CustomSidebarProps {
  equations: MathEquation[]
  selectedId: number
  setSelectedId: (id: number) => void
  handleRemove: (id: number) => void
  pages: Page[]
  activePage: number | null
  onPageChange: (pageId: number) => void
  onAddPage: () => void
  onRemovePage: (pageId: number) => void
}

export default function CustomSidebar({ 
  equations, 
  selectedId, 
  setSelectedId, 
  pages,
  activePage,
  onPageChange,
  onAddPage,
  onRemovePage
}: CustomSidebarProps) {
  const [localEquations, setLocalEquations] = useState(equations)

  useEffect(() => {
    setLocalEquations(equations);
  }, [equations]);

  const updateEquation = (id: number, newEquation: string) => {
    setLocalEquations(localEquations.map(eq => 
      eq.id === id ? { ...eq, equation: newEquation } : eq
    ))
  }


  const addEquation = () => {
    const newId = Math.max(0, ...localEquations.map(eq => eq.id)) + 1
    setLocalEquations([...localEquations, { id: newId, equation: '', type: 'linear' }])
    setSelectedId(newId)
  }

  const handleRemove = (id: number) => {
    setLocalEquations(prevEquations => prevEquations.filter(eq => eq.id !== id));
    if (selectedId === id) {
      const remainingEquations = localEquations.filter(eq => eq.id !== id);
      setSelectedId(remainingEquations[0]?.id || 0);
    }
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-2 py-2">
        <div className="flex items-center gap-1 px-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={addEquation}>
            <Plus className="h-4 w-4" />
            <span className="sr-only">Add equation</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Undo2 className="h-4 w-4" />
            <span className="sr-only">Undo</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Redo2 className="h-4 w-4" />
            <span className="sr-only">Redo</span>
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings2 className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronDown className="h-4 w-4" />
            <span className="sr-only">Collapse sidebar</span>
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              Pages
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="space-y-2 p-2">
                  {pages.map((page) => (
                    <div key={page.id} className="flex items-center justify-between">
                      <Button
                        variant={activePage === page.id ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => onPageChange(page.id)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        {page.name}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onRemovePage(page.id)}
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remove page</span>
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={onAddPage}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add new page
                  </Button>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </CollapsibleContent>
        </Collapsible>
        
        <div className="flex-1 overflow-auto">
          {localEquations.map((eq, index) => (
            <div
              key={eq.id}
              className={cn(
                "group relative flex h-14 cursor-pointer items-center px-4 hover:bg-accent",
                selectedId === eq.id && "bg-white"
              )}
              onClick={() => setSelectedId(eq.id)}
            >
              <div className="flex items-center gap-3 flex-1">
              <span className="text-sm text-muted-foreground">{index + 1}</span>
              <div className="flex items-center gap-2 flex-1">
                <div 
                  className={cn(
                    "h-6 w-6 rounded-full transition-colors duration-200",
                    "group-focus-within:bg-blue-600 bg-blue-500"
                  )} 
                />
                <div className="relative flex-1">
                  <Input
                    value={eq.equation}
                    onChange={(e) => updateEquation(eq.id, e.target.value)}
                    className="flex-1 font-mono border-none bg-transparent outline-none ring-0 focus:ring-0 focus-visible:ring-0 relative z-10"
                    placeholder="Enter equation..."
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-muted-foreground/40" />
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-blue-600 scale-x-0 transition-transform duration-200 origin-left group-focus-within:scale-x-100" />
                </div>
              </div>
            </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(eq.id);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SidebarContent>
    </Sidebar>
  )
}