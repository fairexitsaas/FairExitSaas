'use client'

import React from 'react'
import Link from 'next/link'
import { useAdmin } from '../AdminContext'

export default function OverviewPage() {
  const { regionFilter, setRegionFilter, users } = useAdmin()

  // Filter users based on region filter if needed
  const filteredUsers = users.slice(0, 4)

  return (
    <section>
      {/* Page Header */}
      <div className="flex items-end gap-4 flex-wrap mb-5">
        <div>
          <h1 className="font-serif font-semibold text-[30px] text-[#062c55] tracking-[-0.4px] leading-[1.1]">
            Overview
          </h1>
          <p className="text-[#5a6b78] text-[13.5px] mt-1 max-w-[70ch]">
            The numbers that matter this month. Lawyer work is done by hand in phase 1: the team sends each request and updates its status here.
          </p>
        </div>
        <div className="flex-1" />
        {/* Country Segment Filter */}
        <div className="inline-flex bg-white border border-[#e7e4dd] rounded-[9px] p-[3px]">
          <button
            type="button"
            onClick={() => setRegionFilter('both')}
            className={`border-0 py-1.5 px-3 rounded-[7px] font-bold text-[12.5px] transition-colors cursor-pointer ${
              regionFilter === 'both'
                ? 'bg-[#062c55] text-white'
                : 'bg-transparent text-[#5a6b78] hover:text-[#062c55]'
            }`}
          >
            Both
          </button>
          <button
            type="button"
            onClick={() => setRegionFilter('ca')}
            className={`border-0 py-1.5 px-3 rounded-[7px] font-bold text-[12.5px] transition-colors cursor-pointer ${
              regionFilter === 'ca'
                ? 'bg-[#062c55] text-white'
                : 'bg-transparent text-[#5a6b78] hover:text-[#062c55]'
            }`}
          >
            Canada
          </button>
          <button
            type="button"
            onClick={() => setRegionFilter('us')}
            className={`border-0 py-1.5 px-3 rounded-[7px] font-bold text-[12.5px] transition-colors cursor-pointer ${
              regionFilter === 'us'
                ? 'bg-[#062c55] text-white'
                : 'bg-transparent text-[#5a6b78] hover:text-[#062c55]'
            }`}
          >
            US
          </button>
        </div>
      </div>

      {/* 5 KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-[18px]">
        {/* KPI 1: Free checks */}
        <div className="bg-white border border-[#e7e4dd] rounded-[12px] p-[14px_16px]">
          <div className="text-[10.5px] font-extrabold tracking-[0.8px] uppercase text-[#5a6b78]">
            Free checks
          </div>
          <div className="text-[26px] font-extrabold text-[#062c55] mt-1 tabular-nums tracking-[-0.5px]">
            {regionFilter === 'ca' ? '218' : regionFilter === 'us' ? '194' : '412'}
          </div>
          <div className="text-[12px] text-[#0c8f72] font-bold mt-0.5">
            +18% vs last month
          </div>
        </div>

        {/* KPI 2: Reports bought · $59 */}
        <div className="bg-white border border-[#e7e4dd] rounded-[12px] p-[14px_16px]">
          <div className="text-[10.5px] font-extrabold tracking-[0.8px] uppercase text-[#5a6b78]">
            Reports bought · $59
          </div>
          <div className="text-[26px] font-extrabold text-[#062c55] mt-1 tabular-nums tracking-[-0.5px]">
            {regionFilter === 'ca' ? '20' : regionFilter === 'us' ? '17' : '37'}
          </div>
          <div className="text-[12px] text-[#5a6b78] mt-0.5">
            9% of free checks
          </div>
        </div>

        {/* KPI 3: Revenue */}
        <div className="bg-white border border-[#e7e4dd] rounded-[12px] p-[14px_16px]">
          <div className="text-[10.5px] font-extrabold tracking-[0.8px] uppercase text-[#5a6b78]">
            Revenue
          </div>
          <div className="text-[26px] font-extrabold text-[#062c55] mt-1 tabular-nums tracking-[-0.5px]">
            {regionFilter === 'ca' ? '$1,180' : regionFilter === 'us' ? '$1,003' : '$2,183'}
          </div>
          <div className="text-[12px] text-[#5a6b78] mt-0.5">
            1 refund
          </div>
        </div>

        {/* KPI 4: Lawyer requests */}
        <div className="bg-white border border-[#e7e4dd] rounded-[12px] p-[14px_16px]">
          <div className="text-[10.5px] font-extrabold tracking-[0.8px] uppercase text-[#5a6b78]">
            Lawyer requests
          </div>
          <div className="text-[26px] font-extrabold text-[#062c55] mt-1 tabular-nums tracking-[-0.5px]">
            {regionFilter === 'ca' ? '16' : regionFilter === 'us' ? '13' : '29'}
          </div>
          <div className="text-[12px] text-[#b07a00] font-bold mt-0.5">
            2 not sent yet
          </div>
        </div>

        {/* KPI 5: Sent to a lawyer */}
        <div className="bg-white border border-[#e7e4dd] rounded-[12px] p-[14px_16px] col-span-2 sm:col-span-1">
          <div className="text-[10.5px] font-extrabold tracking-[0.8px] uppercase text-[#5a6b78]">
            Sent to a lawyer
          </div>
          <div className="text-[26px] font-extrabold text-[#062c55] mt-1 tabular-nums tracking-[-0.5px]">
            {regionFilter === 'ca' ? '14' : regionFilter === 'us' ? '10' : '24'}
          </div>
          <div className="text-[12px] text-[#5a6b78] mt-0.5">
            Updated by the team
          </div>
        </div>
      </div>

      {/* Grid: 2 Equal Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Report status this month */}
        <div className="bg-white border border-[#e7e4dd] rounded-[12px] p-5 min-w-0">
          <h2 className="text-[15px] font-extrabold text-[#062c55] flex items-baseline gap-2.5 mb-3">
            Report status{' '}
            <span className="text-[12px] font-semibold text-[#5a6b78]">this month</span>
          </h2>

          <div className="grid gap-2.5">
            {/* Completed */}
            <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[13px]">
              <span>Completed</span>
              <b className="tabular-nums text-[#062c55]">33</b>
              <div className="col-span-2 h-2 bg-[#f0ede6] rounded-[5px] overflow-hidden">
                <span className="block h-full bg-[#0eb28d] rounded-[5px] w-[89%]" />
              </div>
            </div>

            {/* Processing */}
            <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[13px]">
              <span>Processing</span>
              <b className="tabular-nums text-[#062c55]">2</b>
              <div className="col-span-2 h-2 bg-[#f0ede6] rounded-[5px] overflow-hidden">
                <span className="block h-full bg-[#062c55] rounded-[5px] w-[5%]" />
              </div>
            </div>

            {/* Failed */}
            <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[13px]">
              <span>Failed (needs a look)</span>
              <b className="tabular-nums text-[#062c55]">1</b>
              <div className="col-span-2 h-2 bg-[#f0ede6] rounded-[5px] overflow-hidden">
                <span className="block h-full bg-[#e0b24a] rounded-[5px] w-[3%]" />
              </div>
            </div>

            {/* Pending payment */}
            <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[13px]">
              <span>Pending payment</span>
              <b className="tabular-nums text-[#062c55]">1</b>
              <div className="col-span-2 h-2 bg-[#f0ede6] rounded-[5px] overflow-hidden">
                <span className="block h-full bg-[#e0b24a] rounded-[5px] w-[3%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Needs attention */}
        <div className="bg-white border border-[#e7e4dd] rounded-[12px] p-5 min-w-0">
          <h2 className="text-[15px] font-extrabold text-[#062c55] flex items-baseline gap-2.5 mb-3">
            Needs attention
          </h2>
          <ul className="space-y-0 text-[13px]">
            <li className="flex gap-2.5 py-2.5 border-b border-[#f0ede6]">
              <span className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-[#d42e2b]" />
              <div>
                <b className="text-[#17242f]">REQ-0029 not sent yet · 2 business days old</b>
                <small className="block text-[#5a6b78] text-[12px]">
                  Promise is 3 business days.{' '}
                  <Link href="/admin/lawyer-requests" className="text-[#0c8f72] font-semibold hover:underline">
                    Open Lawyer requests.
                  </Link>
                </small>
              </div>
            </li>
            <li className="flex gap-2.5 py-2.5 border-b border-[#f0ede6]">
              <span className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-[#b07a00]" />
              <div>
                <b className="text-[#17242f]">1 report failed to build</b>
                <small className="block text-[#5a6b78] text-[12px]">
                  RPT-8K2L4Q · scan unreadable. Email the person.
                </small>
              </div>
            </li>
            <li className="flex gap-2.5 pt-2.5">
              <span className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-[#2c62b8]" />
              <div>
                <b className="text-[#17242f]">No lawyer listed for Alberta yet</b>
                <small className="block text-[#5a6b78] text-[12px]">
                  Requests from Alberta wait until you add one.
                </small>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Card: Recent users Table */}
      <div className="bg-white border border-[#e7e4dd] rounded-[12px] p-0 mt-[18px] overflow-hidden">
        <h2 className="text-[15px] font-extrabold text-[#062c55] p-[14px_16px_10px] mb-0">
          Recent users
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#faf9f6] border-y border-[#e7e4dd]">
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
              {filteredUsers.map((user, idx) => (
                <tr
                  key={user.id}
                  className={`hover:bg-[#f7fbf9] transition-colors ${
                    idx < filteredUsers.length - 1 ? 'border-b border-[#f0ede6]' : ''
                  }`}
                >
                  <td className="p-[10px_12px] tabular-nums font-bold text-[#062c55] whitespace-nowrap">
                    {user.id}
                  </td>
                  <td className="p-[10px_12px] text-[#17242f]">{user.region}</td>
                  <td className="p-[10px_12px] text-[#17242f]">{user.industry}</td>
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
