import React, { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { FileText, Loader, AlertTriangle, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@smartmed/ui'

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

interface PDFViewerProps {
  reportId: string
  fileName?: string
}

export function PDFViewer({ reportId, fileName }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const pdfUrl = `/api/reports/${reportId}/download?disposition=inline`

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setLoading(false)
    setError(null)
  }

  function onDocumentLoadError(error: Error) {
    console.error('PDF loading error:', error)
    setError('Failed to load PDF document')
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="aspect-[8.5/11] rounded-lg border bg-gray-100 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Loader className="h-8 w-8 mx-auto mb-2 animate-spin" />
          <p className="text-sm">Loading PDF...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="aspect-[8.5/11] rounded-lg border bg-gray-100 flex items-center justify-center">
        <div className="text-center text-red-500">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => {
              setLoading(true)
              setError(null)
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* PDF Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale(scale * 0.9)}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600">{Math.round(scale * 100)}%</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale(scale * 1.1)}
            disabled={scale >= 2.0}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
        {numPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
              disabled={pageNumber <= 1}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              {pageNumber} of {numPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
              disabled={pageNumber >= numPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* PDF Document */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="flex justify-center p-4 bg-gray-50">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center p-8">
                <Loader className="h-6 w-6 animate-spin" />
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        </div>
      </div>
    </div>
  )
}