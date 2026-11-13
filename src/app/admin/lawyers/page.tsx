'use client'

import React from 'react'
import { useAdmin } from '../AdminContext'

export default function LawyersPage() {
  const { lawyers, loading, error, setAddLawyerModalOpen } = useAdmin()

  const getStatusChip = (status: string) => {
    const s = (status || '').toLowerCase()
    if (s === 'active') {
      return (
        <span className="inline-flex items-center gap-1 text-[11.5px] font-bold py-0.5 px-2.5 rounded-full bg-[#eef8f3] text-[#0c8f72] whitespace-nowrap">
          Active
        </span>
      )
    }
    if (s.includes('paused')) {
      return (
        <span className="inline-flex items-center gap-1 text-[11.5px] font-bold py-0.5 px-2.5 rounded-full bg-[#fbf3df] text-[#b07a00] whitespace-nowrap">
          Paused · at monthly max
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11.5px] font-bold py-0.5 px-2.5 rounded-full bg-[#eef0f2] text-[#44525e] whitespace-nowrap">
        {status}
      </span>
    )
  }

  return (
    <section>
      {/* Page Header */}
      <div className="flex items-end gap-4 flex-wrap mb-5">
        <div>
          <h1 className="font-serif font-semibold text-[30px] text-[#062c55] tracking-[-0.4px] leading-[1.1]">
            Lawyers
          </h1>
          <p className="text-[#5a6b78] text-[13.5px] mt-1 max-w-[70ch]">
            The lawyers we work with, kept by hand: who has agreed to take requests, where they are, and whether they are taking requests right now. No lawyer logins or invites in phase 1. Fee terms live in each signed agreement.
          </p>
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setAddLawyerModalOpen(true)}
          className="border border-[#062c55] bg-[#062c55] text-white hover:bg-[#041d38] rounded-[9px] py-2 px-3.5 font-bold text-[13px] shadow-xs cursor-pointer transition-colors"
        >
          Add a lawyer
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3.5 rounded-[10px] bg-red-50 border border-red-200 text-red-700 text-[13px] font-semibold">
          {error}
        </div>
      )}

      {/* Lawyers Table Card */}
      <div className="bg-white border border-[#e7e4dd] rounded-[12px] p-5 shadow-xs">
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#faf9f6] border-y border-[#e7e4dd]">
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Lawyer · firm
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Address
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Province / State · country
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Email · phone
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Status
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Agreement
                </th>
                <th className="text-right text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] tabular-nums whitespace-nowrap">
                  Sent · month
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#5a6b78]">
                    Loading lawyers…
                  </td>
                </tr>
              ) : lawyers.length > 0 ? (
                lawyers.map((lawyer, idx) => {
                  const addrLines = (lawyer as any).addressLines || lawyer.address_lines || []
                  const regionCountry =
                    (lawyer as any).regionCountry ||
                    (lawyer.jurisdiction_code ? `${lawyer.jurisdiction_code} · ${lawyer.country}` : lawyer.country || '—')
                  const agreementDate = (lawyer as any).agreementDate || lawyer.agreement_date || '—'
                  const agreementType = (lawyer as any).agreementType || lawyer.agreement_type || 'flat ad fee'
                  const sentMonth = (lawyer as any).sentMonth ?? lawyer.sentThisMonth ?? 0

                  return (
                    <tr
                      key={lawyer.id || idx}
                      className={`hover:bg-[#f7fbf9] transition-colors ${
                        idx < lawyers.length - 1 ? 'border-b border-[#f0ede6]' : ''
                      }`}
                    >
                      {/* Lawyer · Firm */}
                      <td className="p-[10px_12px] whitespace-nowrap leading-tight">
                        <b className="text-[#062c55] font-bold block">{lawyer.name}</b>
                        <span className="text-[#5a6b78] text-[12px]">{lawyer.firm || 'Independent Counsel'}</span>
                      </td>

                      {/* Address */}
                      <td className="p-[10px_12px] text-[#5a6b78] text-[12px] whitespace-nowrap leading-tight">
                        {addrLines.length > 0 ? (
                          addrLines.map((line: string, lIdx: number) => <div key={lIdx}>{line}</div>)
                        ) : (
                          <span>—</span>
                        )}
                      </td>

                      {/* Province / State · country */}
                      <td className="p-[10px_12px] text-[#17242f] whitespace-nowrap">
                        {regionCountry}
                      </td>

                      {/* Email · Phone */}
                      <td className="p-[10px_12px] text-[#5a6b78] whitespace-nowrap leading-tight">
                        <div>{lawyer.email}</div>
                        <div className="text-[12px] text-[#5a6b78]">{lawyer.phone}</div>
                      </td>

                      {/* Status */}
                      <td className="p-[10px_12px] whitespace-nowrap">
                        {getStatusChip(lawyer.status)}
                      </td>

                      {/* Agreement */}
                      <td className="p-[10px_12px] text-[#5a6b78] text-[12px] whitespace-nowrap leading-tight">
                        <div>{agreementDate}</div>
                        <div>{agreementType}</div>
                      </td>

                      {/* Sent · month */}
                      <td className="p-[10px_12px] text-right tabular-nums text-[#062c55] font-bold whitespace-nowrap">
                        {sentMonth}
                      </td>

                      {/* Notes */}
                      <td className="p-[10px_12px] text-[#5a6b78] whitespace-nowrap">
                        {lawyer.notes || '—'}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#5a6b78]">
                    No lawyers in the roster yet. Click &quot;Add a lawyer&quot; to register a partner counsel.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
