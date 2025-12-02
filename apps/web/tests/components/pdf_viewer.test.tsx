import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import PDFViewer from '../../src/components/timeline/pdf_viewer'

// Mock react-pdf to avoid PDF.js worker issues in tests
jest.mock('react-pdf', () => ({
  Document: ({ onLoadSuccess, onLoadError, children }: any) => {
    // Simulate successful load after a short delay
    setTimeout(() => {
      if (onLoadSuccess) {
        onLoadSuccess({ numPages: 2 })
      }
    }, 100)
    return <div data-testid="pdf-document">{children}</div>
  },
  Page: ({ pageNumber }: any) => (
    <div data-testid={`pdf-page-${pageNumber}`}>PDF Page {pageNumber}</div>
  ),
  pdfjs: {
    GlobalWorkerOptions: {}
  }
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ZoomIn: () => <div data-testid="zoom-in-icon">+</div>,
  ZoomOut: () => <div data-testid="zoom-out-icon">-</div>,
  ChevronLeft: () => <div data-testid="prev-icon">←</div>,
  ChevronRight: () => <div data-testid="next-icon">→</div>,
  Download: () => <div data-testid="download-icon">↓</div>,
  Loader2: () => <div data-testid="loading-icon">⟲</div>
}))

describe('PDFViewer', () => {
  const mockFileUrl = 'https://example.com/test.pdf'
  const mockFileName = 'test-report.pdf'

  it('renders loading state initially', () => {
    render(<PDFViewer fileUrl={mockFileUrl} fileName={mockFileName} />)
    
    expect(screen.getByText('Loading PDF...')).toBeInTheDocument()
    expect(screen.getByTestId('loading-icon')).toBeInTheDocument()
  })

  it('renders PDF document after successful load', async () => {
    render(<PDFViewer fileUrl={mockFileUrl} fileName={mockFileName} />)
    
    await waitFor(() => {
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument()
    })

    expect(screen.getByTestId('pdf-page-1')).toBeInTheDocument()
  })

  it('shows zoom controls', async () => {
    render(<PDFViewer fileUrl={mockFileUrl} fileName={mockFileName} />)
    
    await waitFor(() => {
      expect(screen.getByTestId('zoom-out-icon')).toBeInTheDocument()
      expect(screen.getByTestId('zoom-in-icon')).toBeInTheDocument()
      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  it('shows page navigation for multi-page documents', async () => {
    render(<PDFViewer fileUrl={mockFileUrl} fileName={mockFileName} />)
    
    await waitFor(() => {
      expect(screen.getByTestId('prev-icon')).toBeInTheDocument()
      expect(screen.getByTestId('next-icon')).toBeInTheDocument()
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    })
  })

  it('shows download button with filename', async () => {
    render(<PDFViewer fileUrl={mockFileUrl} fileName={mockFileName} />)
    
    await waitFor(() => {
      expect(screen.getByTestId('download-icon')).toBeInTheDocument()
      expect(screen.getByText('Download test-report.pdf')).toBeInTheDocument()
    })
  })
})