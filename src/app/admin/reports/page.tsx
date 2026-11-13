'use client'

import React from 'react'
import { useAdmin } from '../AdminContext'

export default function ReportsPage() {
  const { reports, overview, loading, error, handleExportCSV } = useAdmin()

  const onExportCSV = () => {
    handleExportCSV(
      'reports',
      ['Report ID', 'User', 'Region', 'Status', 'Paid via', 'Amount', 'Date'],
      reports.map((r) => [r.reportId, r.user, r.region || '—', r.status, r.paidVia, r.amount || '—', r.date || '—'])
    )
  }

  const getStatusChip = (status: string) => {
    if (status.includes('Completed')) {
      return (
        <span className="inline-flex items-center gap-1 text-[11.5px] font-bold py-0.5 px-2.5 rounded-full bg-[#eef8f3] text-[#0c8f72] whitespace-nowrap">
          Completed
        </span>
      )
    }
    if (status.includes('Processing')) {
      return (
        <span className="inline-flex items-center gap-1 text-[11.5px] font-bold py-0.5 px-2.5 rounded-full bg-[#fbf3df] text-[#b07a00] whitespace-nowrap">
          Processing
        </span>
      )
    }
    if (status.includes('Failed')) {
      return (
        <span className="inline-flex items-center gap-1 text-[11.5px] font-bold py-0.5 px-2.5 rounded-full bg-[#fbeceb] text-[#d42e2b] whitespace-nowrap">
          {status}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11.5px] font-bold py-0.5 px-2.5 rounded-full bg-[#eef0f2] text-[#44525e] whitespace-nowrap">
        {status}
      </span>
    )
  }

  const totalRevenueCents = overview?.kpis.revenueCents
    ? Object.values(overview.kpis.revenueCents).reduce((sum, val) => sum + val, 0)
    : 0
  const formattedRevenue = `$${Math.round(totalRevenueCents / 100).toLocaleString()}`

  return (
    <section>
      {/* Page Header */}
      <div className="flex items-end gap-4 flex-wrap mb-5">
        <div>
          <h1 className="font-serif font-semibold text-[30px] text-[#062c55] tracking-[-0.4px] leading-[1.1]">
            Reports
          </h1>
          <p className="text-[#5a6b78] text-[13.5px] mt-1 max-w-[70ch]">
            Severance Reports sold. The report is a PDF the person downloads. Its report ID is printed on the last page, so a lawyer can tie it back to us later.
          </p>
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onExportCSV}
          className="border border-[#e7e4dd] bg-white text-[#062c55] hover:bg-slate-50 rounded-[9px] py-2 px-3.5 font-bold text-[13px] shadow-xs cursor-pointer transition-colors"
        >
          Export CSV
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3.5 rounded-[10px] bg-red-50 border border-red-200 text-red-700 text-[13px] font-semibold">
          {error}
        </div>
      )}

      {/* 4 KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-[18px]">
        <div className="bg-white border border-[#e7e4dd] rounded-[12px] p-[14px_16px]">
          <div className="text-[10.5px] font-extrabold tracking-[0.8px] uppercase text-[#5a6b78]">
            Sold this month
          </div>
          <div className="text-[26px] font-extrabold text-[#062c55] mt-1 tabular-nums tracking-[-0.5px]">
            {loading ? '…' : (overview?.kpis.reportsBought ?? reports.length)}
          </div>
        </div>

        <div className="bg-white border border-[#e7e4dd] rounded-[12px] p-[14px_16px]">
          <div className="text-[10.5px] font-extrabold tracking-[0.8px] uppercase text-[#5a6b78]">
            Revenue
          </div>
          <div className="text-[26px] font-extrabold text-[#062c55] mt-1 tabular-nums tracking-[-0.5px]">
            {loading ? '…' : formattedRevenue}
          </div>
        </div>

        <div className="bg-white border border-[#e7e4dd] rounded-[12px] p-[14px_16px]">
          <div className="text-[10.5px] font-extrabold tracking-[0.8px] uppercase text-[#5a6b78]">
            Refunds
          </div>
          <div className="text-[26px] font-extrabold text-[#062c55] mt-1 tabular-nums tracking-[-0.5px]">
            {loading ? '…' : (overview?.kpis.refunds ?? 0)}
          </div>
        </div>

        <div className="bg-white border border-[#e7e4dd] rounded-[12px] p-[14px_16px]">
          <div className="text-[10.5px] font-extrabold tracking-[0.8px] uppercase text-[#5a6b78]">
            Failed builds
          </div>
          <div className="text-[26px] font-extrabold text-[#062c55] mt-1 tabular-nums tracking-[-0.5px]">
            {loading ? '…' : (overview?.reportStatus.failed ?? 0)}
          </div>
        </div>
      </div>

      {/* Reports Table Card */}
      <div className="bg-white border border-[#e7e4dd] rounded-[12px] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#faf9f6] border-b border-[#e7e4dd]">
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Report ID
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  User
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Region
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Status
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Paid via
                </th>
                <th className="text-right text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] tabular-nums whitespace-nowrap">
                  Amount
                </th>
                <th className="text-right text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] tabular-nums whitespace-nowrap">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#5a6b78]">
                    Loading reports…
                  </td>
                </tr>
              ) : reports.length > 0 ? (
                reports.map((report, idx) => (
                  <tr
                    key={report.reportId || idx}
                    className={`hover:bg-[#f7fbf9] transition-colors ${
                      idx < reports.length - 1 ? 'border-b border-[#f0ede6]' : ''
                    }`}
                  >
                    <td className="p-[10px_12px] tabular-nums font-bold text-[#062c55] whitespace-nowrap">
                      {report.reportId}
                    </td>
                    <td className="p-[10px_12px] text-[#17242f] font-mono">{report.user}</td>
                    <td className="p-[10px_12px] text-[#17242f]">{report.region || '—'}</td>
                    <td className="p-[10px_12px]">{getStatusChip(report.status)}</td>
                    <td className="p-[10px_12px] text-[#5a6b78]">{report.paidVia}</td>
                    <td className="p-[10px_12px] text-right tabular-nums text-[#17242f] font-medium">
                      {report.amount || '—'}
                    </td>
                    <td className="p-[10px_12px] text-right tabular-nums text-[#5a6b78]">
                      {report.date ? new Date(report.date).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#5a6b78]">
                    No severance reports purchased yet.
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
