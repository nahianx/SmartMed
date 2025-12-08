'use client'

import React from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDangerous?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-sm w-full p-6 shadow-lg">
        <h2 className="text-lg font-bold text-slate-900 mb-2">{title}</h2>
        <p className="text-slate-600 mb-6">{message}</p>

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition ${
              isDangerous
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-900 rounded-lg hover:bg-slate-50 font-medium transition"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  )
}
