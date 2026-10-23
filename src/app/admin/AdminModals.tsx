'use client'

import React, { useState } from 'react'
import { useAdmin } from './AdminContext'

export default function AdminModals() {
  const {
    toastMessage,
    summaryModalReq,
    setSummaryModalReq,
    addLawyerModalOpen,
    setAddLawyerModalOpen,
    handleAddLawyer,
  } = useAdmin()

  // Add Lawyer form state
  const [formData, setFormData] = useState({
    name: '',
    firm: '',
    addressStreet: '',
    addressSuite: '',
    addressCityStateZip: '',
    regionCountry: 'Ontario · Canada',
    country: 'CA' as 'CA' | 'US',
    email: '',
    phone: '',
    status: 'Active' as 'Active' | 'Paused · at monthly max',
    agreementDate: 'Signed Oct 2026',
    agreementType: 'flat ad fee',
    notes: '',
  })

  const handleSubmitLawyer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    handleAddLawyer({
      name: formData.name.trim(),
      firm: formData.firm.trim() || 'Independent Counsel',
      addressLines: [
        formData.addressStreet.trim(),
        formData.addressSuite.trim(),
        formData.addressCityStateZip.trim(),
      ].filter(Boolean),
      regionCountry: formData.regionCountry,
      email: formData.email.trim() || 'intake@…',
      phone: formData.phone.trim() || '—',
      status: formData.status,
      agreementDate: formData.agreementDate.trim() || 'Signed Current Month',
      agreementType: formData.agreementType.trim() || 'flat ad fee',
      notes: formData.notes.trim() || '—',
      country: formData.country,
    })

    setFormData({
      name: '',
      firm: '',
      addressStreet: '',
      addressSuite: '',
      addressCityStateZip: '',
      regionCountry: 'Ontario · Canada',
      country: 'CA',
      email: '',
      phone: '',
      status: 'Active',
      agreementDate: 'Signed Oct 2026',
      agreementType: 'flat ad fee',
      notes: '',
    })
  }

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed left-1/2 bottom-[22px] -translate-x-1/2 w-[calc(100vw-32px)] max-w-max text-center bg-[#062c55] text-white py-2.5 px-4 rounded-[10px] text-[13px] font-semibold z-50 shadow-lg animate-in fade-in duration-200"
        >
          {toastMessage}
        </div>
      )}

      {/* Summary Sent to Lawyer Modal */}
      {summaryModalReq && (
        <div
          className="fixed inset-0 bg-[#062c55]/45 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setSummaryModalReq(null)}
        >
          <div
            className="bg-white rounded-[14px] w-full max-w-[480px] p-4 sm:p-[22px_22px_18px] shadow-[0_30px_60px_-20px_rgba(6,44,85,0.5)] border border-[#e7e4dd]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-[20px] sm:text-[22px] text-[#062c55] font-semibold mb-2">
              Summary sent to lawyer · {summaryModalReq.id}
            </h3>
            <p className="text-[13.5px] text-[#5a6b78] mb-3">
              Only structured, anonymized facts from their check are sent. Never the original severance document or report PDF.
            </p>

            <ul className="list-disc ml-[18px] mb-3.5 text-[13px] space-y-1 text-[#17242f]">
              <li><b>Client:</b> {summaryModalReq.name} ({summaryModalReq.email})</li>
              <li><b>Region:</b> {summaryModalReq.region}</li>
              <li><b>Assigned:</b> {summaryModalReq.lawyer || 'Unassigned'}</li>
              <li><b>Tenure:</b> 4 years, 8 months</li>
              <li><b>Severance offered:</b> 8 weeks</li>
              <li><b>Issue flagged:</b> Below statutory / common law estimate</li>
            </ul>

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setSummaryModalReq(null)}
                className="w-full sm:w-auto border border-[#e7e4dd] bg-[#062c55] text-white rounded-[9px] py-2 px-3.5 font-bold text-[13px] hover:bg-[#041d38] transition-colors cursor-pointer text-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add a Lawyer Modal */}
      {addLawyerModalOpen && (
        <div
          className="fixed inset-0 bg-[#062c55]/45 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setAddLawyerModalOpen(false)}
        >
          <div
            className="bg-white rounded-[14px] w-full max-w-[500px] p-4 sm:p-[22px_22px_18px] shadow-[0_30px_60px_-20px_rgba(6,44,85,0.5)] border border-[#e7e4dd] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-[20px] sm:text-[22px] text-[#062c55] font-semibold mb-1">
              Add a lawyer
            </h3>
            <p className="text-[13px] text-[#5a6b78] mb-4">
              Phase 1: Hand-kept list. Lawyer sign-up, invites and profiles are phase 2.
            </p>

            <form onSubmit={handleSubmitLawyer} className="space-y-3 text-[13px]">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-[0.6px] text-[#5a6b78] mb-1">
                  Lawyer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Ellis"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-[#e7e4dd] rounded-[9px] p-[8px_11px] text-[13.5px] text-[#17242f] focus:outline-none focus:border-[#0eb28d]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-[0.6px] text-[#5a6b78] mb-1">
                  Firm Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ellis Employment Law"
                  value={formData.firm}
                  onChange={(e) => setFormData({ ...formData, firm: e.target.value })}
                  className="w-full border border-[#e7e4dd] rounded-[9px] p-[8px_11px] text-[13.5px] text-[#17242f] focus:outline-none focus:border-[#0eb28d]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-[0.6px] text-[#5a6b78] mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    placeholder="120 Adelaide St W"
                    value={formData.addressStreet}
                    onChange={(e) => setFormData({ ...formData, addressStreet: e.target.value })}
                    className="w-full border border-[#e7e4dd] rounded-[9px] p-[8px_11px] text-[13.5px] text-[#17242f] focus:outline-none focus:border-[#0eb28d]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-[0.6px] text-[#5a6b78] mb-1">
                    Suite / Unit
                  </label>
                  <input
                    type="text"
                    placeholder="Suite 2200"
                    value={formData.addressSuite}
                    onChange={(e) => setFormData({ ...formData, addressSuite: e.target.value })}
                    className="w-full border border-[#e7e4dd] rounded-[9px] p-[8px_11px] text-[13.5px] text-[#17242f] focus:outline-none focus:border-[#0eb28d]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-[0.6px] text-[#5a6b78] mb-1">
                    City, Province/State, Postal
                  </label>
                  <input
                    type="text"
                    placeholder="Toronto ON M5H 1T1"
                    value={formData.addressCityStateZip}
                    onChange={(e) => setFormData({ ...formData, addressCityStateZip: e.target.value })}
                    className="w-full border border-[#e7e4dd] rounded-[9px] p-[8px_11px] text-[13.5px] text-[#17242f] focus:outline-none focus:border-[#0eb28d]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-[0.6px] text-[#5a6b78] mb-1">
                    Province / State · Country
                  </label>
                  <input
                    type="text"
                    placeholder="Ontario · Canada"
                    value={formData.regionCountry}
                    onChange={(e) => setFormData({ ...formData, regionCountry: e.target.value })}
                    className="w-full border border-[#e7e4dd] rounded-[9px] p-[8px_11px] text-[13.5px] text-[#17242f] focus:outline-none focus:border-[#0eb28d]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-[0.6px] text-[#5a6b78] mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="intake@lawfirm.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-[#e7e4dd] rounded-[9px] p-[8px_11px] text-[13.5px] text-[#17242f] focus:outline-none focus:border-[#0eb28d]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-[0.6px] text-[#5a6b78] mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    placeholder="(416) 555-0100"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border border-[#e7e4dd] rounded-[9px] p-[8px_11px] text-[13.5px] text-[#17242f] focus:outline-none focus:border-[#0eb28d]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-[0.6px] text-[#5a6b78] mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Paused · at monthly max' })}
                    className="w-full border border-[#e7e4dd] rounded-[9px] p-[8px_11px] text-[13.5px] text-[#17242f] bg-white focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Paused · at monthly max">Paused · at monthly max</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-[0.6px] text-[#5a6b78] mb-1">
                    Agreement
                  </label>
                  <input
                    type="text"
                    placeholder="Signed Oct 2026"
                    value={formData.agreementDate}
                    onChange={(e) => setFormData({ ...formData, agreementDate: e.target.value })}
                    className="w-full border border-[#e7e4dd] rounded-[9px] p-[8px_11px] text-[13.5px] text-[#17242f] focus:outline-none focus:border-[#0eb28d]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-[0.6px] text-[#5a6b78] mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Prefers email intros"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border border-[#e7e4dd] rounded-[9px] p-[8px_11px] text-[13.5px] text-[#17242f] focus:outline-none focus:border-[#0eb28d]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddLawyerModalOpen(false)}
                  className="border border-[#e7e4dd] bg-white text-[#062c55] rounded-[9px] py-2 px-3.5 font-bold text-[13px] hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#062c55] text-white rounded-[9px] py-2 px-4 font-bold text-[13px] hover:bg-[#041d38] cursor-pointer"
                >
                  Save lawyer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
