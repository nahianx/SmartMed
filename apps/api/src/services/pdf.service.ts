/**
 * PDF Generation Service
 * 
 * Generates PDF files for prescriptions using Puppeteer (headless Chrome).
 * This provides high-fidelity PDF output that matches the print CSS styling.
 */

import puppeteer, { Browser, Page } from 'puppeteer'
import { prisma, AuditAction } from '@smartmed/database'
import { logAuditEvent } from '../utils/audit'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'

// PDF cache directory
const CACHE_DIR = path.join(process.cwd(), 'cache', 'pdfs')

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
}

interface PdfGenerationOptions {
  format?: 'A4' | 'Letter'
  orientation?: 'portrait' | 'landscape'
  includeQRCode?: boolean
  userId?: string
  clientIp?: string
}

interface PrescriptionPdfData {
  id: string
  createdAt: Date
  diagnosis: string
  notes: string | null
  patient: {
    firstName: string
    lastName: string
    dateOfBirth: Date | null
  }
  doctor: {
    firstName: string
    lastName: string
    specialization: string
    licenseNumber: string | null
  }
  prescriptionMedications: Array<{
    medicineName: string
    dosage: string
    frequency: string
    duration: string
    instructions: string | null
    drug?: {
      rxcui: string
      genericName: string | null
      dosageForm: string | null
    } | null
  }>
}

/**
 * PDF Generation Service class
 */
class PdfService {
  private browser: Browser | null = null
  private browserPromise: Promise<Browser> | null = null

  /**
   * Get or create a shared browser instance
   */
  private async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      return this.browser
    }

    // Avoid race conditions
    if (this.browserPromise) {
      return this.browserPromise
    }

    this.browserPromise = puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    })

    this.browser = await this.browserPromise
    this.browserPromise = null

    return this.browser
  }

  /**
   * Close the shared browser instance
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  /**
   * Generate a cache key for a prescription
   */
  private getCacheKey(prescriptionId: string, updatedAt: Date): string {
    const hash = crypto
      .createHash('md5')
      .update(`${prescriptionId}-${updatedAt.toISOString()}`)
      .digest('hex')
    return `prescription-${prescriptionId}-${hash}.pdf`
  }

  /**
   * Check if a cached PDF exists and is valid
   */
  private getCachedPdf(cacheKey: string): Buffer | null {
    const cachePath = path.join(CACHE_DIR, cacheKey)
    
    if (fs.existsSync(cachePath)) {
      // Check if cache is less than 24 hours old
      const stats = fs.statSync(cachePath)
      const ageInHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60)
      
      if (ageInHours < 24) {
        return fs.readFileSync(cachePath)
      } else {
        // Remove stale cache
        fs.unlinkSync(cachePath)
      }
    }
    
    return null
  }

  /**
   * Save PDF to cache
   */
  private savePdfToCache(cacheKey: string, pdfBuffer: Buffer): void {
    const cachePath = path.join(CACHE_DIR, cacheKey)
    fs.writeFileSync(cachePath, pdfBuffer)
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date | null): string {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  /**
   * Generate HTML for the prescription
   */
  private generatePrescriptionHtml(prescription: PrescriptionPdfData, options: PdfGenerationOptions): string {
    const patientName = `${prescription.patient.firstName} ${prescription.patient.lastName}`
    const doctorName = `Dr. ${prescription.doctor.firstName} ${prescription.doctor.lastName}`
    const prescriptionDate = this.formatDate(prescription.createdAt)
    const patientDob = this.formatDate(prescription.patient.dateOfBirth)

    // Generate QR code placeholder URL (in production, use a QR code library)
    const qrCodeUrl = options.includeQRCode
      ? `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
          `https://smartmed.app/prescriptions/verify/${prescription.id}`
        )}`
      : ''

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prescription - ${prescription.id}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Arial', 'Helvetica Neue', sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #1a1a1a;
      background: white;
      padding: 20mm;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0066cc;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }

    .header-left h1 {
      color: #0066cc;
      font-size: 18pt;
      margin-bottom: 5px;
    }

    .header-left p {
      color: #666;
      font-size: 9pt;
    }

    .header-right {
      text-align: right;
    }

    .prescription-id {
      font-size: 10pt;
      color: #666;
    }

    .rx-symbol {
      font-size: 28pt;
      font-weight: bold;
      color: #0066cc;
    }

    .patient-section, .prescriber-section {
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 10pt;
      color: #0066cc;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 3px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .info-item {
      display: flex;
    }

    .info-label {
      font-weight: bold;
      width: 120px;
      color: #333;
    }

    .info-value {
      color: #1a1a1a;
    }

    .diagnosis-section {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 20px;
    }

    .diagnosis-section h3 {
      font-size: 10pt;
      color: #0066cc;
      margin-bottom: 5px;
    }

    .medications-section {
      margin-bottom: 20px;
    }

    .medications-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
    }

    .medications-table th {
      background: #0066cc;
      color: white;
      padding: 8px 10px;
      text-align: left;
      font-weight: 600;
    }

    .medications-table td {
      padding: 10px;
      border-bottom: 1px solid #eee;
      vertical-align: top;
    }

    .medications-table tr:nth-child(even) td {
      background: #f8f9fa;
    }

    .med-name {
      font-weight: bold;
      color: #1a1a1a;
    }

    .med-generic {
      font-size: 9pt;
      color: #666;
      font-style: italic;
    }

    .notes-section {
      background: #fff8e1;
      border-left: 4px solid #ffb300;
      padding: 12px;
      margin-bottom: 20px;
    }

    .notes-section h3 {
      font-size: 10pt;
      color: #f57c00;
      margin-bottom: 5px;
    }

    .signature-section {
      margin-top: 40px;
      display: flex;
      justify-content: flex-end;
    }

    .signature-box {
      text-align: center;
      width: 250px;
    }

    .signature-line {
      border-top: 1px solid #333;
      margin-top: 50px;
      padding-top: 5px;
    }

    .signature-name {
      font-weight: bold;
    }

    .footer {
      margin-top: 40px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .footer-disclaimer {
      font-size: 8pt;
      color: #666;
      max-width: 400px;
    }

    .footer-qr {
      text-align: right;
    }

    .footer-qr img {
      width: 80px;
      height: 80px;
    }

    .footer-qr p {
      font-size: 7pt;
      color: #999;
    }

    .validity-notice {
      margin-top: 20px;
      padding: 10px;
      background: #e3f2fd;
      border-radius: 4px;
      font-size: 9pt;
      text-align: center;
    }

    .timestamp {
      font-size: 7pt;
      color: #999;
      text-align: right;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>SmartMed Healthcare</h1>
      <p>Medical Prescription</p>
    </div>
    <div class="header-right">
      <div class="rx-symbol">℞</div>
      <div class="prescription-id">ID: ${prescription.id.slice(0, 8).toUpperCase()}</div>
    </div>
  </div>

  <div class="patient-section">
    <div class="section-title">Patient Information</div>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Patient Name:</span>
        <span class="info-value">${patientName}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Date of Birth:</span>
        <span class="info-value">${patientDob}</span>
      </div>
    </div>
  </div>

  <div class="prescriber-section">
    <div class="section-title">Prescriber Information</div>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Prescriber:</span>
        <span class="info-value">${doctorName}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Specialization:</span>
        <span class="info-value">${prescription.doctor.specialization}</span>
      </div>
      <div class="info-item">
        <span class="info-label">License No:</span>
        <span class="info-value">${prescription.doctor.licenseNumber || 'N/A'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Date:</span>
        <span class="info-value">${prescriptionDate}</span>
      </div>
    </div>
  </div>

  <div class="diagnosis-section">
    <h3>Diagnosis</h3>
    <p>${prescription.diagnosis}</p>
  </div>

  <div class="medications-section">
    <div class="section-title">Prescribed Medications</div>
    <table class="medications-table">
      <thead>
        <tr>
          <th style="width: 5%">#</th>
          <th style="width: 25%">Medication</th>
          <th style="width: 15%">Dosage</th>
          <th style="width: 15%">Frequency</th>
          <th style="width: 15%">Duration</th>
          <th style="width: 25%">Instructions</th>
        </tr>
      </thead>
      <tbody>
        ${prescription.prescriptionMedications.map((med, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>
              <div class="med-name">${med.medicineName}</div>
              ${med.drug?.genericName ? `<div class="med-generic">${med.drug.genericName}</div>` : ''}
            </td>
            <td>${med.dosage}</td>
            <td>${med.frequency}</td>
            <td>${med.duration}</td>
            <td>${med.instructions || 'As directed'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  ${prescription.notes ? `
  <div class="notes-section">
    <h3>Additional Notes</h3>
    <p>${prescription.notes}</p>
  </div>
  ` : ''}

  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-line">
        <div class="signature-name">${doctorName}</div>
        <div>${prescription.doctor.specialization}</div>
        <div style="font-size: 9pt">License: ${prescription.doctor.licenseNumber || 'N/A'}</div>
      </div>
    </div>
  </div>

  <div class="validity-notice">
    This prescription is valid for 30 days from the date of issue unless otherwise specified.
  </div>

  <div class="footer">
    <div class="footer-disclaimer">
      <p><strong>Important:</strong> This is a computer-generated prescription. 
      Please verify authenticity with the prescribing physician before dispensing.
      Keep medications out of reach of children.</p>
    </div>
    ${qrCodeUrl ? `
    <div class="footer-qr">
      <img src="${qrCodeUrl}" alt="Verification QR Code" />
      <p>Scan to verify</p>
    </div>
    ` : ''}
  </div>

  <div class="timestamp">
    Generated: ${new Date().toISOString()}
  </div>
</body>
</html>
    `
  }

  /**
   * Generate PDF for a prescription
   */
  async generatePrescriptionPdf(
    prescriptionId: string,
    options: PdfGenerationOptions = {}
  ): Promise<{ buffer: Buffer; filename: string }> {
    const {
      format = 'A4',
      orientation = 'portrait',
      includeQRCode = true,
      userId,
      clientIp,
    } = options

    // Get prescription data
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            dateOfBirth: true,
          },
        },
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            specialization: true,
            licenseNumber: true,
          },
        },
        prescriptionMedications: {
          include: {
            drug: {
              select: {
                rxcui: true,
                genericName: true,
                dosageForm: true,
              },
            },
          },
        },
      },
    })

    if (!prescription) {
      throw new Error('Prescription not found')
    }

    // Check cache
    const cacheKey = this.getCacheKey(prescriptionId, prescription.updatedAt)
    const cachedPdf = this.getCachedPdf(cacheKey)
    
    if (cachedPdf) {
      // Log cache hit
      if (userId) {
        await logAuditEvent({
          userId,
          action: AuditAction.DATA_EXPORT,
          resourceType: 'Prescription',
          resourceId: prescriptionId,
          metadata: {
            action: 'PDF_DOWNLOAD',
            cached: true,
            format,
            clientIp,
          },
        })
      }

      return {
        buffer: cachedPdf,
        filename: `prescription-${prescriptionId.slice(0, 8)}.pdf`,
      }
    }

    // Generate HTML
    const html = this.generatePrescriptionHtml(prescription, { includeQRCode })

    // Launch browser and generate PDF
    const browser = await this.getBrowser()
    let page: Page | null = null

    try {
      page = await browser.newPage()
      
      await page.setContent(html, {
        waitUntil: 'networkidle0',
      })

      const pdfBuffer = await page.pdf({
        format,
        landscape: orientation === 'landscape',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
        displayHeaderFooter: false,
      })

      // Save to cache
      this.savePdfToCache(cacheKey, Buffer.from(pdfBuffer))

      // Log PDF generation
      if (userId) {
        await logAuditEvent({
          userId,
          action: AuditAction.DATA_EXPORT,
          resourceType: 'Prescription',
          resourceId: prescriptionId,
          metadata: {
            action: 'PDF_GENERATE',
            format,
            orientation,
            includeQRCode,
            clientIp,
          },
        })
      }

      return {
        buffer: Buffer.from(pdfBuffer),
        filename: `prescription-${prescriptionId.slice(0, 8)}.pdf`,
      }
    } finally {
      if (page) {
        await page.close()
      }
    }
  }

  /**
   * Generate PDF for a public prescription (via token)
   */
  async generatePrescriptionPdfByToken(
    token: string,
    options: PdfGenerationOptions = {}
  ): Promise<{ buffer: Buffer; filename: string } | null> {
    // Get the token record to find the prescription
    const tokenRecord = await prisma.prescriptionAccessToken.findUnique({
      where: { token },
      include: {
        prescription: true,
      },
    })

    if (!tokenRecord || !tokenRecord.prescription) {
      return null
    }

    // Check if token is valid (not expired, not exceeded max uses)
    const now = new Date()
    if (tokenRecord.expiresAt && tokenRecord.expiresAt < now) {
      return null
    }
    if (tokenRecord.maxUses && tokenRecord.useCount >= tokenRecord.maxUses) {
      return null
    }

    // Generate the PDF
    return this.generatePrescriptionPdf(tokenRecord.prescription.id, options)
  }

  /**
   * Clean up old cached PDFs
   */
  async cleanupCache(maxAgeHours: number = 24): Promise<number> {
    let deletedCount = 0
    const files = fs.readdirSync(CACHE_DIR)

    for (const file of files) {
      if (file.endsWith('.pdf')) {
        const filePath = path.join(CACHE_DIR, file)
        const stats = fs.statSync(filePath)
        const ageInHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60)

        if (ageInHours > maxAgeHours) {
          fs.unlinkSync(filePath)
          deletedCount++
        }
      }
    }

    return deletedCount
  }
}

// Export singleton instance
export const pdfService = new PdfService()

// Cleanup on process exit
process.on('beforeExit', async () => {
  await pdfService.closeBrowser()
})
