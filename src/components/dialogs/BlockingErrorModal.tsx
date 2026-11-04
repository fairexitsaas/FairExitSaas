'use client'

import React, { useEffect, useState, useRef } from 'react'

export interface BlockingErrorModalData {
  title: string
  message: string
  stage?: string
  statusCode?: number
  requestId?: string
  onRetry?: () => Promise<void> | void
  retryLabel?: string
}

export interface BlockingErrorModalProps {
  isOpen: boolean
  onClose: () => void
  data: BlockingErrorModalData | null
}

export default function BlockingErrorModal({
  isOpen,
  onClose,
  data,
}: BlockingErrorModalProps) {
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Focus trap / focus first button on open
  useEffect(() => {
    if (isOpen) {
      setRetryError(null)
      setRetrying(false)
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !retrying) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, retrying, onClose])

  if (!isOpen || !data) return null

  const handleRetry = async () => {
    if (!data.onRetry || retrying) return
    setRetrying(true)
    setRetryError(null)
    try {
      await data.onRetry()
      // If retry succeeded, close the modal
      onClose()
    } catch (err: unknown) {
      setRetryError(err instanceof Error ? err.message : 'Retry attempt failed. Please check your connection.')
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#062c55]/75 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="blocking-error-title"
      aria-describedby="blocking-error-desc"
    >
      <div
        className="bg-white rounded-[20px] max-w-[500px] w-full p-6 sm:p-7 shadow-2xl border border-[#e7e4dd] relative my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with warning icon and title */}
        <div className="flex items-start gap-3.5 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#fee2e2] text-[#d42e2b] flex items-center justify-center shrink-0 mt-0.5" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            {data.stage && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#fbeceb] text-[#a3231f] text-[11px] font-bold uppercase tracking-wider mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d42e2b]" />
                <span>{data.stage}</span>
              </div>
            )}
            <h2 id="blocking-error-title" className="font-serif text-[22px] sm:text-[24px] text-[#062c55] font-semibold leading-snug">
              {data.title}
            </h2>
          </div>
        </div>

        {/* Safe Error Message */}
        <p id="blocking-error-desc" className="text-[#17242f] text-[14.5px] leading-relaxed my-3 whitespace-pre-line">
          {data.message}
        </p>

        {/* Retry error feedback if retry failed */}
        {retryError && (
          <div className="p-3 mb-3 bg-[#fbeceb] rounded-xl border border-[#f5c2c0] text-[#a3231f] text-[13px]">
            <span className="font-semibold">Retry failed:</span> {retryError}
          </div>
        )}

        {/* Status code & Request ID correlation (when available) */}
        {(data.statusCode || data.requestId) && (
          <div className="bg-[#f6f4ef] rounded-xl p-3 text-[12px] text-[#5a6b78] border border-[#e7e4dd] space-y-1 mb-5 font-mono">
            {data.statusCode && (
              <div className="flex items-center justify-between">
                <span>HTTP Status</span>
                <span className="font-semibold text-[#062c55]">{data.statusCode}</span>
              </div>
            )}
            {data.requestId && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                <span>Request ID</span>
                <span className="font-semibold text-[#062c55] break-all">{data.requestId}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-[#e7e4dd]">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            disabled={retrying}
            className="w-full sm:w-auto min-h-[42px] px-5 rounded-xl border border-[#d5dde4] bg-white text-[#062c55] font-bold text-[14px] hover:border-[#0eb28d] transition disabled:opacity-50 cursor-pointer"
          >
            {data.onRetry ? 'Cancel' : 'Understood'}
          </button>

          {data.onRetry && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="w-full sm:w-auto min-h-[42px] px-5 rounded-xl bg-[#0eb28d] text-white font-bold text-[14px] hover:bg-[#0c8f72] transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              {retrying ? (
                <>
                  <span className="inline-block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  <span>Retrying…</span>
                </>
              ) : (
                <span>{data.retryLabel || 'Try Again'}</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
