'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import BlockingErrorModal, { BlockingErrorModalData } from '@/components/dialogs/BlockingErrorModal'
import { notifyError } from '@/lib/notifications'

interface ErrorModalContextType {
  showErrorModal: (options: BlockingErrorModalData, showToast?: boolean) => void
  closeErrorModal: () => void
  isErrorModalOpen: boolean
}

const ErrorModalContext = createContext<ErrorModalContextType | undefined>(undefined)

type GlobalErrorListener = (options: BlockingErrorModalData, showToast?: boolean) => void
let activeGlobalListener: GlobalErrorListener | null = null

/** Safe non-hook trigger for errors originating from non-React utility functions */
export function triggerGlobalError(options: BlockingErrorModalData, showToast = true) {
  if (activeGlobalListener) {
    activeGlobalListener(options, showToast)
  } else {
    if (showToast) {
      notifyError(options.message, {
        id: `global-err-${options.stage || options.title}`,
        description: options.stage ? `Failed during ${options.stage}` : undefined,
      })
    }
  }
}

export function ErrorModalProvider({ children }: { children: React.ReactNode }) {
  const [modalData, setModalData] = useState<BlockingErrorModalData | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const showErrorModal = useCallback((options: BlockingErrorModalData, showToast = true) => {
    setModalData(options)
    setIsOpen(true)
    if (showToast) {
      notifyError(options.message, {
        id: `err-modal-${options.stage || options.title}`,
        description: options.stage ? `Failed during ${options.stage}` : undefined,
      })
    }
  }, [])

  const closeErrorModal = useCallback(() => {
    setIsOpen(false)
  }, [])

  useEffect(() => {
    activeGlobalListener = (options, showToast) => {
      showErrorModal(options, showToast)
    }
    return () => {
      activeGlobalListener = null
    }
  }, [showErrorModal])

  return (
    <ErrorModalContext.Provider value={{ showErrorModal, closeErrorModal, isErrorModalOpen: isOpen }}>
      {children}
      <BlockingErrorModal isOpen={isOpen} onClose={closeErrorModal} data={modalData} />
    </ErrorModalContext.Provider>
  )
}

export function useErrorModal() {
  const ctx = useContext(ErrorModalContext)
  if (!ctx) {
    throw new Error('useErrorModal must be used within an ErrorModalProvider')
  }
  return ctx
}
