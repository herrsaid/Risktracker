"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Map, Square, HardDrive, Settings, Layers, Menu, BarChart3 } from "lucide-react"
import { useState } from "react"

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Close sidebar on mobile when clicking a link
  const handleLinkClick = () => {
    if (window.innerWidth < 768) {
      setIsOpen(false)
    }
  }

  return (
    <>
      {/* Toggle button for mobile */}
      <button
        className="absolute left-4 top-4 z-50 rounded-lg bg-primary p-2 text-primary-foreground shadow-lg md:hidden"
        onClick={() => setIsOpen(!isOpen)}
        style={{ zIndex: 99999 }}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-64 flex-col border-r bg-gradient-to-b from-background to-muted/20 transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ zIndex: 9999 }}
      >
        {/* Header */}
        <div className="border-b px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary sm:h-9 sm:w-9">
              <Layers className="h-4 w-4 text-primary-foreground sm:h-5 sm:w-5" />
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-sm font-bold tracking-tight sm:text-base">SafetyZone</h2>
              <p className="text-xs text-muted-foreground">Monitoring Platform</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-auto px-3 py-4">
          <div className="space-y-1">
            <div className="px-3 pb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Navigation
              </p>
            </div>
            <SidebarItem href="/map" icon={Map} label="Map View" onClick={handleLinkClick} />
            <SidebarItem href="/zones" icon={Square} label="Zone Management" onClick={handleLinkClick} />
            <SidebarItem href="/devices" icon={HardDrive} label="Devices" onClick={handleLinkClick} />
            <SidebarItem href="/analytics" icon={BarChart3} label="Analytics" onClick={handleLinkClick} />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-3 py-3">
          <SidebarItem href="/settings" icon={Settings} label="Settings" onClick={handleLinkClick} />
        </div>
      </aside>
    </>
  )
}

type SidebarItemProps = {
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  onClick?: () => void
}

function SidebarItem({ href, icon: Icon, label, onClick }: SidebarItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`
        group relative flex items-center gap-3 rounded-lg px-3 py-2.5 
        text-sm font-medium transition-all duration-200 ease-in-out
        ${
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }
      `}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary-foreground" />
      )}
      
      <Icon className={`h-4 w-4 transition-transform duration-200 ${!isActive && "group-hover:scale-110"}`} />
      <span>{label}</span>
      
      {/* Hover effect */}
      {!isActive && (
        <div className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="absolute inset-0 rounded-lg bg-accent/50 blur-sm" />
        </div>
      )}
    </Link>
  )
}
