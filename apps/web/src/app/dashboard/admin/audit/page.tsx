'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock3, Filter, FileText } from 'lucide-react'
import { Badge, Button } from '@smartmed/ui'
import { useAuthContext } from '../../../../context/AuthContext'
import { adminService, AuditLogEntry } from '../../../../services/adminService'

export default function AdminAuditLogPage() {
  const { user, loading } = useAuthContext()
  const router = useRouter()
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState<string>('')

  useEffect(() => {
    if (!loading) {
      if (!user) router.replace('/auth/login')
      else if (user.role !== 'ADMIN') router.replace('/')
      else loadAudit()
    }
  }, [user, loading, router])

  const loadAudit = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await adminService.getAuditLog()
      setEntries(data)
    } catch (err) {
      setError('Failed to load audit log')
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = entries.filter((e) =>
    actionFilter ? e.action.toLowerCase().includes(actionFilter.toLowerCase()) : true
  )

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-background to-orange-50 dark:from-red-950/20 dark:via-background dark:to-orange-950/20">
        <div className="text-muted-foreground">Loading...</div>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">Audit Log</h1>
              <Badge variant="outline" className="text-xs">
                Administrator
              </Badge>
            </div>
            <Button variant="outline" onClick={() => router.push('/dashboard/admin')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="bg-card rounded-xl shadow-md border border-border p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <input
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="Filter by action (activate, demote, etc)"
              className="px-4 py-2 border border-border bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <Button variant="outline" onClick={() => setActionFilter('')}>
              Clear
            </Button>
            <Button onClick={loadAudit}>Refresh</Button>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-md border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">Recent Actions</h3>
            </div>
            <span className="text-sm text-muted-foreground">Total: {filtered.length}</span>
          </div>

          {isLoading ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">Loading audit log...</div>
          ) : filtered.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">No audit entries found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Action</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Resource</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Actor</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Reason</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr key={entry.id} className="border-b border-border hover:bg-muted/50">
                      <td className="px-6 py-3 text-sm text-foreground">{entry.action}</td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">{entry.resource}</td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">{entry.actorEmail}</td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">{entry.reason || '—'}</td>
                      <td className="px-6 py-3 text-sm text-muted-foreground flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-muted-foreground" />
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
