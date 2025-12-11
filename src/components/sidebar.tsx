"use client"

import Link from "next/link"
import { MapPin, Map, Square, HardDrive, Settings } from "lucide-react"

export function Sidebar() {
  return (
    <aside className="flex h-full w-64 flex-col border-r bg-muted/40">
      <div className="px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
        Platform
      </div>

      <nav className="flex-1 space-y-1 px-2">
        <SidebarItem href="/map" icon={Map} label="Map" />
        <SidebarItem href="/zones" icon={Square} label="Zones" />
        <SidebarItem href="/devices" icon={HardDrive} label="Devices" />
      </nav>

      <div className="border-t px-2 py-3">
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
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  )
}
