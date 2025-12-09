import { Calendar, MapPin, FileText, AlertTriangle, ExternalLink, Download } from 'lucide-react'
import type { TimelineActivity } from '@/types/timeline'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Badge,
  Button,
} from '@smartmed/ui'
import { format } from 'date-fns'
import { PDFViewer } from './pdf_viewer'

interface DetailsDrawerProps {
  activity: TimelineActivity | null
  open: boolean
  onClose: () => void
}

export function DetailsDrawer({ activity, open, onClose }: DetailsDrawerProps) {
  if (!activity) return null

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left pr-8">
            {activity.title}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {format(activity.date, 'EEEE, MMMM dd, yyyy at h:mm a')}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {activity.status && (
            <div>
              <Badge
                variant={
                  activity.status === 'completed'
                    ? 'default'
                    : activity.status === 'cancelled'
                    ? 'secondary'
                    : 'destructive'
                }
              >
                {activity.status === 'no-show'
                  ? 'No-show'
                  : activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
              </Badge>
            </div>
          )}

          {activity.type === 'appointment' && (
            <>
              <div>
                <h3 className="mb-2">Visit Information</h3>
                <div className="space-y-2 rounded-lg bg-gray-50 p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-gray-600 min-w-[100px]">Doctor:</span>
                    <span className="text-sm">{activity.doctorName}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-gray-600 min-w-[100px]">Specialty:</span>
                    <span className="text-sm">{activity.specialty}</span>
                  </div>
                  {activity.clinic && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-600 mt-0.5" />
                      <span className="text-sm">{activity.clinic}</span>
                    </div>
                  )}
                </div>
              </div>

              {activity.vitals && (
                <div>
                  <h3 className="mb-2">Vitals</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {activity.vitals.bloodPressure && (
                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-gray-600">Blood Pressure</div>
                        <div className="mt-1">{activity.vitals.bloodPressure}</div>
                      </div>
                    )}
                    {activity.vitals.heartRate && (
                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-gray-600">Heart Rate</div>
                        <div className="mt-1">{activity.vitals.heartRate}</div>
                      </div>
                    )}
                    {activity.vitals.temperature && (
                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-gray-600">Temperature</div>
                        <div className="mt-1">{activity.vitals.temperature}</div>
                      </div>
                    )}
                    {activity.vitals.weight && (
                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-gray-600">Weight</div>
                        <div className="mt-1">{activity.vitals.weight}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activity.notes && (
                <div>
                  <h3 className="mb-2">Visit Notes</h3>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-700">{activity.notes}</p>
                  </div>
                </div>
              )}

              {(activity.linkedPrescriptions || activity.linkedReports) && (
                <div>
                  <h3 className="mb-2">Linked Records</h3>
                  <div className="space-y-2">
                    {activity.linkedPrescriptions?.map((rx) => (
                      <div
                        key={rx}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{rx}</span>
                        </div>
                        <Button size="sm" variant="ghost">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {activity.linkedReports?.map((report) => (
                      <div
                        key={report}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-purple-600" />
                          <span className="text-sm">{report}</span>
                        </div>
                        <Button size="sm" variant="ghost">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activity.type === 'prescription' && (
            <>
              <div>
                <h3 className="mb-2">Prescribed by</h3>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm">{activity.doctorName}</p>
                </div>
              </div>

              {activity.medications && activity.medications.length > 0 && (
                <div>
                  <h3 className="mb-2">Medications</h3>
                  <div className="space-y-3">
                    {activity.medications.map((med, index) => (
                      <div key={index} className="rounded-lg border p-4">
                        <div className="font-medium">{med.name}</div>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <div className="flex gap-2">
                            <span className="min-w-[80px]">Dose:</span>
                            <span>{med.dose}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="min-w-[80px]">Frequency:</span>
                            <span>{med.frequency}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="min-w-[80px]">Duration:</span>
                            <span>{med.duration}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activity.warnings && activity.warnings.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Important Warnings
                  </h3>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <ul className="space-y-1 text-sm">
                      {activity.warnings.map((warning, index) => (
                        <li key={index} className="flex gap-2">
                          <span>-</span>
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button className="flex-1">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Full Prescription
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {activity.type === 'report' && (
            <>
              <div>
                <h3 className="mb-2">File Information</h3>
                <div className="space-y-2 rounded-lg bg-gray-50 p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-gray-600 min-w-[80px]">File name:</span>
                    <span className="text-sm">{activity.fileName}</span>
                  </div>
                  {activity.fileSize && (
                    <div className="flex items-start gap-2">
                      <span className="text-sm text-gray-600 min-w-[80px]">File size:</span>
                      <span className="text-sm">{activity.fileSize}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-2">Preview</h3>
                {activity.reportId ? (
                  <PDFViewer 
                    reportId={activity.reportId} 
                    fileName={activity.fileName}
                  />
                ) : (
                  <div className="aspect-[8.5/11] rounded-lg border bg-gray-100 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-sm">PDF Preview Unavailable</p>
                      <p className="text-xs mt-1">Report ID not found</p>
                    </div>
                  </div>
                )}
              </div>

              {activity.notes && (
                <div>
                  <h3 className="mb-2">Notes</h3>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-700">{activity.notes}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button className="flex-1">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Full Report
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
