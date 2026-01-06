'use client'

import React, { useEffect, useRef, useState } from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDangerous?: boolean
  requireReason?: boolean
  reasonLabel?: string
  placeholder?: string
  onConfirm: (reason?: string) => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  requireReason = false,
  reasonLabel,
  placeholder,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('')
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const lastFocused = useRef<HTMLElement | null>(null)
  const disableConfirm = requireReason && reason.trim().length === 0

  useEffect(() => {
    if (isOpen) {
      lastFocused.current = document.activeElement as HTMLElement
      const first = dialogRef.current?.querySelector<HTMLElement>('input, textarea, button')
      first?.focus()
    } else {
      setReason('')
      lastFocused.current?.focus()
    }
  }, [isOpen])

  const focusableSelector =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector)
    if (!focusable || focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        onKeyDown={handleKeyDown}
        className="bg-card rounded-lg max-w-sm w-full p-6 shadow-lg"
      >
        <h2 className="text-lg font-bold text-foreground mb-2">{title}</h2>
        <p className="text-muted-foreground mb-4">{message}</p>

        {requireReason && (
          <div className="space-y-2 mb-4">
            <label className="text-sm font-medium text-foreground">
              {reasonLabel || 'Add a reason (required)'}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={placeholder || 'Provide context for this action'}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => onConfirm(reason.trim() || undefined)}
            disabled={disableConfirm}
            className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition disabled:opacity-60 ${
              isDangerous
                ? 'bg-destructive hover:bg-destructive/90'
                : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {confirmText}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted font-medium transition"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  )
}
