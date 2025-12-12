"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Map, Square, HardDrive, Settings, Layers } from "lucide-react"

export function Sidebar() {
  return (
    <aside className="flex h-full w-64 flex-col border-r bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="border-b px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Layers className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight">SafetyZone</h2>
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
          
          <SidebarItem href="/map" icon={Map} label="Map View" />
          <SidebarItem href="/zones" icon={Square} label="Zone Management" />
          <SidebarItem href="/devices" icon={HardDrive} label="Devices" />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-muted/30 px-3 py-3">
        <SidebarItem href="/settings" icon={Settings} label="Settings" />
      </div>
    </aside>
  )
}

type SidebarItemProps = {
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
}

function SidebarItem({ href, icon: Icon, label }: SidebarItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
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
