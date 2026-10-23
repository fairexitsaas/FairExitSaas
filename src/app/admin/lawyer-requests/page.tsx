'use client'

import React from 'react'
import { useAdmin, LawyerRequestRecord } from '../AdminContext'

export default function LawyerRequestsPage() {
  const {
    lawyerRequests,
    lawyers,
    handleStatusChange,
    handleLawyerChange,
    handleNoteChange,
    setSummaryModalReq,
    handleExportCSV,
    handleExportPDF,
  } = useAdmin()

  const onExportCSV = () => {
    handleExportCSV(
      'lawyer-requests',
      ['Request', 'Days Ago', 'Region', 'Name', 'Email', 'Phone', 'Status', 'Lawyer', 'Date sent', 'Notes'],
      lawyerRequests.map((r) => [
        r.id,
        r.daysAgo,
        r.region,
        r.name,
        r.email,
        r.phone,
        r.status,
        r.lawyer,
        r.dateSent,
        r.notes,
      ])
    )
  }

  return (
    <section>
      {/* Page Header */}
      <div className="flex items-end gap-4 flex-wrap mb-5">
        <div>
          <h1 className="font-serif font-semibold text-[30px] text-[#062c55] tracking-[-0.4px] leading-[1.1]">
            Lawyer requests
          </h1>
          <p className="text-[#5a6b78] text-[13.5px] mt-1 max-w-[70ch]">
            People who used &quot;Ask a lawyer to contact me&quot;. The team emails or calls a lawyer from the Lawyers list, then updates the status here by hand. Promise: a lawyer contacts them within 3 business days. Contact details are kept only to route the request and are deleted 12 months after it closes.
          </p>
        </div>
        <div className="flex-1" />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onExportCSV}
            className="border border-[#e7e4dd] bg-white text-[#062c55] hover:bg-slate-50 rounded-[9px] py-2 px-3.5 font-bold text-[13px] shadow-xs cursor-pointer transition-colors"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="border border-[#e7e4dd] bg-white text-[#062c55] hover:bg-slate-50 rounded-[9px] py-2 px-3.5 font-bold text-[13px] shadow-xs cursor-pointer transition-colors"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-[#e7e4dd] rounded-[12px] p-5 shadow-xs">
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#faf9f6] border-y border-[#e7e4dd]">
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Request
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Region
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Name
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Email · phone
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Status (set by team)
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Lawyer
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Date sent
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  How · by
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  What we sent
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {lawyerRequests.map((req, idx) => (
                <tr
                  key={req.id}
                  className={`hover:bg-[#f7fbf9] transition-colors ${
                    idx < lawyerRequests.length - 1 ? 'border-b border-[#f0ede6]' : ''
                  }`}
                >
                  {/* Request ID + Days Ago */}
                  <td className="p-[10px_12px] whitespace-nowrap">
                    <span className="tabular-nums font-bold text-[#062c55] block">
                      {req.id}
                    </span>
                    <span className="text-[#5a6b78] text-[12px]">{req.daysAgo}</span>
                  </td>

                  {/* Region */}
                  <td className="p-[10px_12px] text-[#17242f] whitespace-nowrap">
                    {req.region}
                  </td>

                  {/* Name */}
                  <td className="p-[10px_12px] text-[#17242f] whitespace-nowrap font-medium">
                    {req.name}
                  </td>

                  {/* Email · Phone */}
                  <td className="p-[10px_12px] text-[#5a6b78] whitespace-nowrap leading-tight">
                    <div>{req.email}</div>
                    <div className="text-[12px] text-[#5a6b78]">{req.phone}</div>
                  </td>

                  {/* Status Dropdown */}
                  <td className="p-[10px_12px] whitespace-nowrap">
                    <select
                      value={req.status}
                      aria-label={`Status ${req.id}`}
                      onChange={(e) =>
                        handleStatusChange(
                          req.id,
                          e.target.value as LawyerRequestRecord['status']
                        )
                      }
                      className="border border-[#d6dbe0] rounded-[7px] py-1 px-2 text-[13px] bg-white text-[#17242f] max-w-[200px] focus:outline-none focus:border-[#0eb28d]"
                    >
                      <option value="New">New</option>
                      <option value="Sent to lawyer">Sent to lawyer</option>
                      <option value="Call happened">Call happened</option>
                      <option value="Retained">Retained</option>
                      <option value="Closed · no response">Closed · no response</option>
                    </select>
                  </td>

                  {/* Lawyer Dropdown */}
                  <td className="p-[10px_12px] whitespace-nowrap">
                    <select
                      value={req.lawyer}
                      aria-label={`Lawyer ${req.id}`}
                      onChange={(e) => handleLawyerChange(req.id, e.target.value)}
                      className="border border-[#d6dbe0] rounded-[7px] py-1 px-2 text-[13px] bg-white text-[#17242f] max-w-[220px] focus:outline-none focus:border-[#0eb28d]"
                    >
                      <option value="Choose…">Choose…</option>
                      {lawyers.map((l) => (
                        <option key={l.id} value={`${l.name} · ${l.firm}`}>
                          {l.name} · {l.firm}
                        </option>
                      ))}
                      {!lawyers.some((l) => `${l.name} · ${l.firm}` === req.lawyer) &&
                        req.lawyer &&
                        req.lawyer !== 'Choose…' && (
                          <option value={req.lawyer}>{req.lawyer}</option>
                        )}
                    </select>
                  </td>

                  {/* Date sent */}
                  <td className="p-[10px_12px] text-[#5a6b78] whitespace-nowrap">
                    {req.dateSent}
                  </td>

                  {/* How · by */}
                  <td className="p-[10px_12px] text-[#17242f] whitespace-nowrap leading-tight">
                    {req.howBy ? (
                      <>
                        <div>{req.howBy.method}</div>
                        <span className="text-[#5a6b78] text-[12px]">{req.howBy.agent}</span>
                      </>
                    ) : (
                      <span className="text-[#5a6b78]">—</span>
                    )}
                  </td>

                  {/* What we sent */}
                  <td className="p-[10px_12px] whitespace-nowrap leading-tight">
                    {req.whatWeSent ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setSummaryModalReq(req)}
                          className="text-[#0c8f72] font-bold underline hover:no-underline cursor-pointer inline-block"
                        >
                          {req.whatWeSent.type}
                        </button>
                        <div className="text-[#5a6b78] text-[12px]">
                          {req.whatWeSent.details}
                        </div>
                      </>
                    ) : (
                      <span className="text-[#5a6b78]">—</span>
                    )}
                  </td>

                  {/* Notes input */}
                  <td className="p-[10px_12px] whitespace-nowrap">
                    <input
                      type="text"
                      aria-label={`Notes ${req.id}`}
                      placeholder="Add a note"
                      value={req.notes}
                      onChange={(e) => handleNoteChange(req.id, e.target.value)}
                      className="border border-[#d6dbe0] rounded-[7px] py-1 px-2 text-[13px] bg-white text-[#17242f] w-[180px] focus:outline-none focus:border-[#0eb28d]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Note below table */}
        <p className="text-[12.5px] text-[#5a6b78] mt-3.5">
          Statuses: New → Sent to lawyer → Call happened → Retained, or Closed · no response. Everything here is entered by the team; nothing is sent to lawyers automatically. Matching, booking and lawyer accounts are phase 2.
        </p>

        {/* What "Summary" means Callout Box */}
        <div id="sent" className="bg-[#faf9f6] border border-[#e7e4dd] rounded-[10px] p-3.5 text-[13px] mt-4">
          <b className="text-[#062c55] font-bold">
            What &quot;Summary&quot; means · the only things we share with a lawyer
          </b>
          <p className="text-[12.5px] text-[#5a6b78] mt-1.5 leading-relaxed">
            Name, email, phone, province or state. Then a short summary of their answers: role level, years with the employer, age range, how the job ended, amount offered, deadline to sign, and anything the free check flagged. Never the uploaded documents or the report. The person ticked a consent box before we sent anything. Lawyers pay a flat advertising fee, never per case.
          </p>
        </div>
      </div>
    </section>
  )
}
