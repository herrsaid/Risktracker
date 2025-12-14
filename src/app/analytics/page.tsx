"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getAnalyticsSummary, getZoneViolations } from "@/app/actions/analytics"
import { Calendar, AlertTriangle, TrendingUp, Users, Battery } from "lucide-react"

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)
  const [violations, setViolations] = useState<any[]>([])
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    end: new Date(),
  })

  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

  const loadAnalytics = async () => {
    setLoading(true)

    const [summaryResult, violationsResult] = await Promise.all([
      getAnalyticsSummary(dateRange.start, dateRange.end),
      getZoneViolations(dateRange.start, dateRange.end),
    ])

    if (summaryResult.data) {
      setSummary(summaryResult.data)
    }

    if (violationsResult.data) {
      setViolations(violationsResult.data)
    }

    setLoading(false)
  }

  const setQuickRange = (days: number) => {
    setDateRange({
      start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      end: new Date(),
    })
  }

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-lg font-semibold">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col gap-6 p-4 md:p-6 overflow-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Analytics & Reports</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Safety insights and compliance tracking
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setQuickRange(1)} variant="outline" size="sm">
            Today
          </Button>
          <Button onClick={() => setQuickRange(7)} variant="outline" size="sm">
            Last 7 Days
          </Button>
          <Button onClick={() => setQuickRange(30)} variant="outline" size="sm">
            Last 30 Days
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Violations</p>
              <p className="text-3xl font-bold">{summary?.totalViolations || 0}</p>
            </div>
            <AlertTriangle className="h-10 w-10 text-orange-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Danger Zones</p>
              <p className="text-3xl font-bold text-red-600">
                {summary?.dangerViolations || 0}
              </p>
            </div>
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Alert Zones</p>
              <p className="text-3xl font-bold text-orange-500">
                {summary?.alertViolations || 0}
              </p>
            </div>
            <TrendingUp className="h-10 w-10 text-orange-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Devices Tracked</p>
              <p className="text-3xl font-bold">{summary?.totalDevicesTracked || 0}</p>
            </div>
            <Users className="h-10 w-10 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Violations Table */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Zone Violations</h2>
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Entered At</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {violations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No violations in this period
                  </TableCell>
                </TableRow>
              ) : (
                violations.map((violation) => (
                  <TableRow key={violation.id}>
                    <TableCell className="font-medium">
                      {violation.device_name || violation.device_id}
                    </TableCell>
                    <TableCell>{violation.zone_name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={violation.zone_type === "danger" ? "destructive" : "default"}
                        className={
                          violation.zone_type === "alert"
                            ? "bg-orange-500 hover:bg-orange-500"
                            : ""
                        }
                      >
                        {violation.zone_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(violation.entered_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {violation.duration_seconds
                        ? `${Math.floor(violation.duration_seconds / 60)}m ${
                            violation.duration_seconds % 60
                          }s`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {violation.exited_at ? (
                        <Badge variant="secondary">Exited</Badge>
                      ) : (
                        <Badge className="bg-red-600 hover:bg-red-600">Active</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
