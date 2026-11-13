"use client";

import React, { useState, useMemo } from "react";
import { useAdmin, LawyerRequestRecord } from "../AdminContext";

export default function LawyerRequestsPage() {
  const {
    lawyerRequests,
    lawyers,
    loading,
    error,
    handleStatusChange,
    handleLawyerChange,
    handleNoteChange,
    setSummaryModalReq,
    handleExportCSV,
    handleExportPDF,
  } = useAdmin();

  // Search & Filters state
  const [searchEmail, setSearchEmail] = useState("");
  const [countryFilter, setCountryFilter] = useState<"all" | "CA" | "US">("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [enquiryTypeFilter, setEnquiryTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Extract unique regions for dropdown
  const availableRegions = useMemo(() => {
    const set = new Set<string>();
    lawyerRequests.forEach((r) => {
      if (r.region) set.add(r.region);
    });
    return Array.from(set).sort();
  }, [lawyerRequests]);

  // Filtered and sorted dataset
  const filteredRequests = useMemo(() => {
    return lawyerRequests
      .filter((req) => {
        // Search by email (or name / id)
        if (searchEmail.trim()) {
          const q = searchEmail.trim().toLowerCase();
          const matchEmail = req.email && req.email.toLowerCase().includes(q);
          const matchName = req.name && req.name.toLowerCase().includes(q);
          const matchId = req.request && req.request.toLowerCase().includes(q);
          if (!matchEmail && !matchName && !matchId) return false;
        }

        // Filter by Country
        if (countryFilter !== "all" && req.country !== countryFilter) {
          return false;
        }

        // Filter by Region (Province / State)
        if (regionFilter !== "all" && req.region !== regionFilter) {
          return false;
        }

        // Filter by Enquiry Type
        if (enquiryTypeFilter !== "all") {
          const type = req.enquiryType || "ask_lawyer";
          if (type !== enquiryTypeFilter) return false;
        }

        // Filter by Status
        if (statusFilter !== "all") {
          if (req.status !== statusFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
      });
  }, [
    lawyerRequests,
    searchEmail,
    countryFilter,
    regionFilter,
    enquiryTypeFilter,
    statusFilter,
    sortOrder,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  const onExportCSV = () => {
    handleExportCSV(
      "lawyer-enquiries",
      [
        "Request ID",
        "Submission Date",
        "Email",
        "Name",
        "Phone",
        "Country",
        "Province/State",
        "Enquiry Type",
        "Source Page",
        "Associated Case ID",
        "Consent Status",
        "Status",
        "Assigned Lawyer",
        "Notes",
      ],
      filteredRequests.map((r) => [
        r.request,
        r.createdAt,
        r.email,
        r.name || "—",
        r.phone || "—",
        r.country === "US" ? "United States" : "Canada",
        r.region,
        r.enquiryType === "3_point_checklist" ? "3-Point Checklist" : "Ask a Lawyer",
        r.sourcePage || "—",
        r.caseId || "—",
        r.consent ? "Consented" : "No",
        r.status,
        r.lawyer || "—",
        r.notes || "",
      ]),
    );
  };

  const getEnquiryBadge = (type?: string) => {
    if (type === "3_point_checklist") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#e8f5e9] text-[#2e7d32] border border-[#c8e6c9]">
          3-Point Checklist
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#e3f2fd] text-[#1565c0] border border-[#bbdefb]">
        Ask a Lawyer
      </span>
    );
  };

  return (
    <section>
      {/* Page Header */}
      <div className="flex items-end gap-4 flex-wrap mb-5">
        <div>
          <h1 className="font-serif font-semibold text-[30px] text-[#062c55] tracking-[-0.4px] leading-[1.1]">
            Lawyer Enquiries
          </h1>
          <p className="text-[#5a6b78] text-[13.5px] mt-1 max-w-[75ch]">
            People who clicked &quot;Ask a lawyer to contact me&quot; or requested a lawyer-related resource. The team
            reviews the details, routes to an appropriate lawyer, and updates the status below.
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

      {error && (
        <div className="mb-4 p-3.5 rounded-[10px] bg-red-50 border border-red-200 text-red-700 text-[13px] font-semibold">
          {error}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white border border-[#e7e4dd] rounded-[12px] p-4 mb-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search by Email */}
          <div className="col-span-1 sm:col-span-2">
            <label className="block text-[10.5px] font-extrabold uppercase text-[#5a6b78] mb-1">
              Search Email / Name
            </label>
            <input
              type="text"
              value={searchEmail}
              onChange={(e) => {
                setSearchEmail(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by email..."
              className="w-full h-[38px] border border-[#d6dbe0] rounded-[8px] px-3 text-[13px] text-[#17242f] placeholder-[#8a98a4] focus:outline-none focus:border-[#0eb28d]"
            />
          </div>

          {/* Filter by Country */}
          <div>
            <label className="block text-[10.5px] font-extrabold uppercase text-[#5a6b78] mb-1">
              Country
            </label>
            <select
              value={countryFilter}
              onChange={(e) => {
                setCountryFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full h-[38px] border border-[#d6dbe0] rounded-[8px] px-2 text-[13px] bg-white text-[#17242f] focus:outline-none focus:border-[#0eb28d]"
            >
              <option value="all">All Countries</option>
              <option value="CA">Canada</option>
              <option value="US">United States</option>
            </select>
          </div>

          {/* Filter by Province / State */}
          <div>
            <label className="block text-[10.5px] font-extrabold uppercase text-[#5a6b78] mb-1">
              Province / State
            </label>
            <select
              value={regionFilter}
              onChange={(e) => {
                setRegionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-[38px] border border-[#d6dbe0] rounded-[8px] px-2 text-[13px] bg-white text-[#17242f] focus:outline-none focus:border-[#0eb28d]"
            >
              <option value="all">All Regions</option>
              {availableRegions.map((reg) => (
                <option key={reg} value={reg}>
                  {reg}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Enquiry Type */}
          <div>
            <label className="block text-[10.5px] font-extrabold uppercase text-[#5a6b78] mb-1">
              Enquiry Type
            </label>
            <select
              value={enquiryTypeFilter}
              onChange={(e) => {
                setEnquiryTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-[38px] border border-[#d6dbe0] rounded-[8px] px-2 text-[13px] bg-white text-[#17242f] focus:outline-none focus:border-[#0eb28d]"
            >
              <option value="all">All Types</option>
              <option value="ask_lawyer">Ask a Lawyer</option>
              <option value="3_point_checklist">3-Point Checklist</option>
            </select>
          </div>

          {/* Sort Date */}
          <div>
            <label className="block text-[10.5px] font-extrabold uppercase text-[#5a6b78] mb-1">
              Sort Date
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-full h-[38px] border border-[#d6dbe0] rounded-[8px] px-2 text-[13px] bg-white text-[#17242f] focus:outline-none focus:border-[#0eb28d]"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-[#e7e4dd] rounded-[12px] p-5 shadow-xs">
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#faf9f6] border-y border-[#e7e4dd]">
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Request / Date
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Email / Contact
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Country / Region
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Enquiry Type
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Source / Case
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Consent
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Status
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Lawyer
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Details
                </th>
                <th className="text-left text-[10.5px] font-extrabold tracking-[0.7px] uppercase text-[#5a6b78] p-[9px_12px] whitespace-nowrap">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-[#5a6b78]">
                    Loading enquiries…
                  </td>
                </tr>
              ) : paginatedRequests.length > 0 ? (
                paginatedRequests.map((req, idx) => (
                  <tr
                    key={req.id}
                    className={`hover:bg-[#f7fbf9] transition-colors ${
                      idx < paginatedRequests.length - 1 ? "border-b border-[#f0ede6]" : ""
                    }`}
                  >
                    {/* Request ID + Date */}
                    <td className="p-[10px_12px] whitespace-nowrap">
                      <span className="tabular-nums font-bold text-[#062c55] block">
                        {req.request}
                      </span>
                      <span className="text-[#5a6b78] text-[11.5px] block">
                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : req.daysAgo}
                      </span>
                      <span className="text-[#8a98a4] text-[10.5px]">
                        {req.daysAgo}
                      </span>
                    </td>

                    {/* Email / Contact */}
                    <td className="p-[10px_12px] whitespace-nowrap leading-tight">
                      <div className="font-semibold text-[#062c55]">{req.email}</div>
                      {req.name && <div className="text-[12px] text-[#17242f]">{req.name}</div>}
                      {req.phone && (
                        <div className="text-[11.5px] text-[#5a6b78]">{req.phone}</div>
                      )}
                    </td>

                    {/* Country / Region */}
                    <td className="p-[10px_12px] whitespace-nowrap">
                      <div className="text-[#17242f] font-medium">{req.region || "—"}</div>
                      <span className="text-[11px] text-[#5a6b78] font-bold uppercase tracking-[0.5px]">
                        {req.country === "US" ? "United States" : "Canada"}
                      </span>
                    </td>

                    {/* Enquiry Type */}
                    <td className="p-[10px_12px] whitespace-nowrap">
                      {getEnquiryBadge(req.enquiryType)}
                    </td>

                    {/* Source Page / Associated Case */}
                    <td className="p-[10px_12px] whitespace-nowrap leading-tight">
                      <div className="text-[12px] font-mono text-[#5a6b78]">
                        {req.sourcePage || "—"}
                      </div>
                      {req.caseId ? (
                        <div className="text-[11px] font-mono text-[#0eb28d] font-bold mt-0.5">
                          Case: {req.caseId.slice(0, 8)}…
                        </div>
                      ) : (
                        <div className="text-[11px] text-[#8a98a4]">No case ID</div>
                      )}
                    </td>

                    {/* Consent */}
                    <td className="p-[10px_12px] whitespace-nowrap">
                      {req.consent ? (
                        <span className="text-[#0c8f72] font-bold text-[12px] flex items-center gap-1">
                          ✓ Consented
                        </span>
                      ) : (
                        <span className="text-[#8a98a4] text-[12px]">None</span>
                      )}
                    </td>

                    {/* Status Dropdown */}
                    <td className="p-[10px_12px] whitespace-nowrap">
                      <select
                        value={req.status}
                        aria-label={`Status ${req.id}`}
                        onChange={(e) => handleStatusChange(req.id, e.target.value)}
                        className="border border-[#d6dbe0] rounded-[7px] py-1 px-2 text-[12.5px] bg-white text-[#17242f] max-w-[170px] focus:outline-none focus:border-[#0eb28d]"
                      >
                        <option value="new">New</option>
                        <option value="sent">Sent to lawyer</option>
                        <option value="call_happened">Call happened</option>
                        <option value="retained">Retained</option>
                        <option value="closed_no_response">Closed · no response</option>
                      </select>
                    </td>

                    {/* Lawyer Dropdown */}
                    <td className="p-[10px_12px] whitespace-nowrap">
                      <select
                        value={req.lawyer || "Choose…"}
                        aria-label={`Lawyer ${req.id}`}
                        onChange={(e) => handleLawyerChange(req.id, e.target.value)}
                        className="border border-[#d6dbe0] rounded-[7px] py-1 px-2 text-[12.5px] bg-white text-[#17242f] max-w-[190px] focus:outline-none focus:border-[#0eb28d]"
                      >
                        <option value="Choose…">Choose…</option>
                        {lawyers.map((l) => (
                          <option key={l.id} value={`${l.name} · ${l.firm}`}>
                            {l.name} · {l.firm}
                          </option>
                        ))}
                        {!lawyers.some((l) => `${l.name} · ${l.firm}` === req.lawyer) &&
                          req.lawyer &&
                          req.lawyer !== "Choose…" && (
                            <option value={req.lawyer}>{req.lawyer}</option>
                          )}
                      </select>
                    </td>

                    {/* Summary Button */}
                    <td className="p-[10px_12px] whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSummaryModalReq(req)}
                        className="text-[#0c8f72] font-bold text-[12px] underline hover:no-underline cursor-pointer"
                      >
                        View Summary
                      </button>
                    </td>

                    {/* Notes Input */}
                    <td className="p-[10px_12px] whitespace-nowrap">
                      <input
                        type="text"
                        aria-label={`Notes ${req.id}`}
                        placeholder="Add a note"
                        value={req.notes || ""}
                        onChange={(e) => handleNoteChange(req.id, e.target.value)}
                        className="border border-[#d6dbe0] rounded-[7px] py-1 px-2 text-[12.5px] bg-white text-[#17242f] w-[160px] focus:outline-none focus:border-[#0eb28d]"
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-[#5a6b78]">
                    <div className="text-[15px] font-semibold text-[#062c55] mb-1">
                      No lawyer enquiries found
                    </div>
                    <p className="text-[13px] text-[#5a6b78] max-w-[400px] mx-auto">
                      {searchEmail || countryFilter !== "all" || regionFilter !== "all" || enquiryTypeFilter !== "all"
                        ? "Try adjusting your search query or filters."
                        : "When visitors request a lawyer consultation or free checklist, their enquiries will appear here."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#f0ede6] text-[13px]">
            <span className="text-[#5a6b78]">
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filteredRequests.length)} of {filteredRequests.length} enquiries
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-[7px] border border-[#d6dbe0] bg-white text-[#17242f] disabled:opacity-40 cursor-pointer font-medium"
              >
                Previous
              </button>
              <span className="font-semibold text-[#062c55]">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-[7px] border border-[#d6dbe0] bg-white text-[#17242f] disabled:opacity-40 cursor-pointer font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Informational Callout */}
        <div className="bg-[#faf9f6] border border-[#e7e4dd] rounded-[10px] p-3.5 text-[13px] mt-4">
          <b className="text-[#062c55] font-bold">
            Lawyer Enquiry Routing & Confidentiality Policy
          </b>
          <p className="text-[12.5px] text-[#5a6b78] mt-1.5 leading-relaxed">
            Customer inquiries are strictly preserved in the database. When routed, only the verified summary and client contact details are shared with the designated attorney/lawyer. No uploaded contracts or reports are ever transmitted. Contact details are retained solely to manage and service the enquiry.
          </p>
        </div>
      </div>
    </section>
  );
}
