'use client'

import React from 'react'
import { useAdmin } from '../AdminContext'

export default function UsersPage() {
  const { users, handleExportCSV } = useAdmin()

  const onExport = () => {
    handleExportCSV(
      'users',
      ['User ID', 'Region', 'Industry', 'Free check', 'Report', 'Lawyer request', 'Date'],
      users.map((u) => [u.id, u.region, u.industry, u.freeCheck, u.report, u.lawyerRequest, u.date])
    )
  }

  return (
    <section>
      {/* Page Header */}
      <div className="flex items-end gap-4 flex-wrap mb-5">
        <div>
          <h1 className="font-serif font-semibold text-[30px] text-[#062c55] tracking-[-0.4px] leading-[1.1]">
            Users
          </h1>
          <p className="text-[#5a6b78] text-[13.5px] mt-1 max-w-[70ch]">
            Everyone who ran a free check. No names, emails, phones, employers or documents here: a user is an ID, a region and an industry.
          </p>
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onExport}
          className="border border-[#e7e4dd] bg-white text-[#062c55] hover:bg-slate-50 rounded-[9px] py-2 px-3.5 font-bold text-[13px] shadow-xs cursor-pointer transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Users Table Card */}
      <div className="bg-white border border-[#e7e4dd] rounded-[12px] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#faf9f6] border-b border-[#e7e4dd]">
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  User ID
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Region
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Industry
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Free check
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Report
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Lawyer request
                </th>
                <th className="text-right text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] tabular-nums whitespace-nowrap">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => (
                <tr
                  key={user.id}
                  className={`hover:bg-[#f7fbf9] transition-colors ${
                    idx < users.length - 1 ? 'border-b border-[#f0ede6]' : ''
                  }`}
                >
                  <td className="p-[10px_12px] tabular-nums font-bold text-[#062c55] whitespace-nowrap">
                    {user.id}
                  </td>
                  <td className="p-[10px_12px] text-[#17242f]">{user.region}</td>
                  <td className="p-[10px_12px] text-[#17242f]">{user.industry}</td>
                  <td className="p-[10px_12px] text-[#17242f]">{user.freeCheck}</td>
                  <td className="p-[10px_12px] text-[#17242f]">{user.report}</td>
                  <td className="p-[10px_12px] text-[#17242f]">{user.lawyerRequest}</td>
                  <td className="p-[10px_12px] text-right tabular-nums text-[#5a6b78]">
                    {user.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
