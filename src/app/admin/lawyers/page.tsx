'use client'

import React from 'react'
import { useAdmin } from '../AdminContext'

export default function LawyersPage() {
  const { lawyers, setAddLawyerModalOpen } = useAdmin()

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1 text-[11.5px] font-bold py-0.5 px-2.5 rounded-full bg-[#eef8f3] text-[#0c8f72] whitespace-nowrap">
            Active
          </span>
        )
      case 'Paused · at monthly max':
        return (
          <span className="inline-flex items-center gap-1 text-[11.5px] font-bold py-0.5 px-2.5 rounded-full bg-[#fbf3df] text-[#b07a00] whitespace-nowrap">
            Paused · at monthly max
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11.5px] font-bold py-0.5 px-2.5 rounded-full bg-[#eef0f2] text-[#44525e] whitespace-nowrap">
            {status}
          </span>
        )
    }
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
              {lawyers.map((lawyer, idx) => (
                <tr
                  key={lawyer.id}
                  className={`hover:bg-[#f7fbf9] transition-colors ${
                    idx < lawyers.length - 1 ? 'border-b border-[#f0ede6]' : ''
                  }`}
                >
                  {/* Lawyer · Firm */}
                  <td className="p-[10px_12px] whitespace-nowrap leading-tight">
                    <b className="text-[#062c55] font-bold block">{lawyer.name}</b>
                    <span className="text-[#5a6b78] text-[12px]">{lawyer.firm}</span>
                  </td>

                  {/* Address */}
                  <td className="p-[10px_12px] text-[#5a6b78] whitespace-nowrap text-[12.5px] leading-tight">
                    {lawyer.addressLines.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </td>

                  {/* Province / State · Country */}
                  <td className="p-[10px_12px] text-[#17242f] whitespace-nowrap">
                    {lawyer.regionCountry}
                  </td>

                  {/* Email · Phone */}
                  <td className="p-[10px_12px] text-[#5a6b78] whitespace-nowrap leading-tight">
                    <div>{lawyer.email}</div>
                    <div className="text-[12px]">{lawyer.phone}</div>
                  </td>

                  {/* Status */}
                  <td className="p-[10px_12px] whitespace-nowrap">
                    {getStatusChip(lawyer.status)}
                  </td>

                  {/* Agreement */}
                  <td className="p-[10px_12px] whitespace-nowrap leading-tight">
                    <div className="text-[#17242f]">{lawyer.agreementDate}</div>
                    <span className="text-[#5a6b78] text-[12px]">{lawyer.agreementType}</span>
                  </td>

                  {/* Sent · Month */}
                  <td className="p-[10px_12px] text-right tabular-nums text-[#17242f] font-semibold whitespace-nowrap">
                    {lawyer.sentMonth}
                  </td>

                  {/* Notes */}
                  <td className="p-[10px_12px] text-[#5a6b78] text-[12.5px] whitespace-nowrap">
                    {lawyer.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Note below table */}
        <p className="text-[12.5px] text-[#5a6b78] mt-3.5">
          All names and addresses are fictional until real lawyers sign. &quot;Add a lawyer&quot; asks for: name, firm, address, province or state, country, email, phone, agreement date, status, notes. Lawyer sign-up, invites and profiles are phase 2.
        </p>
      </div>
    </section>
  )
}
