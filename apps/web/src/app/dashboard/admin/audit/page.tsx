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
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50">
        <div className="text-gray-600">Loading...</div>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
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
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="h-5 w-5 text-slate-600" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <input
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="Filter by action (activate, demote, etc)"
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <Button variant="outline" onClick={() => setActionFilter('')}>
              Clear
            </Button>
            <Button onClick={loadAudit}>Refresh</Button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-600" />
              <h3 className="text-lg font-semibold text-slate-900">Recent Actions</h3>
            </div>
            <span className="text-sm text-slate-600">Total: {filtered.length}</span>
          </div>

          {isLoading ? (
            <div className="h-80 flex items-center justify-center text-slate-600">Loading audit log...</div>
          ) : filtered.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-slate-500">No audit entries found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Action</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Resource</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Actor</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Reason</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-6 py-3 text-sm text-slate-900">{entry.action}</td>
                      <td className="px-6 py-3 text-sm text-slate-700">{entry.resource}</td>
                      <td className="px-6 py-3 text-sm text-slate-700">{entry.actorEmail}</td>
                      <td className="px-6 py-3 text-sm text-slate-600">{entry.reason || '—'}</td>
                      <td className="px-6 py-3 text-sm text-slate-600 flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-slate-400" />
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
