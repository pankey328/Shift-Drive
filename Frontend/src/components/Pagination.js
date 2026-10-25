"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  limit = 10,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [10, 20, 50, 100],
  className = "",
}) {
  if (totalItems === 0 && totalPages <= 1) {
    return null;
  }

  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages || 1));
  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * limit + 1;
  const endItem = Math.min(safeCurrentPage * limit, totalItems);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 text-xs text-neutral-400 ${className}`}
    >
      {/* Range and Per Page Selector */}
      <div className="flex flex-wrap items-center gap-3">
        <span>
          Showing{" "}
          <strong className="text-white font-semibold">
            {startItem.toLocaleString()}
          </strong>{" "}
          to{" "}
          <strong className="text-white font-semibold">
            {endItem.toLocaleString()}
          </strong>{" "}
          of{" "}
          <strong className="text-white font-semibold">
            {totalItems.toLocaleString()}
          </strong>{" "}
          entries
        </span>

        {onLimitChange && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-neutral-800">
            <span>Show</span>
            <select
              value={limit}
              onChange={(e) => {
                const newLimit = parseInt(e.target.value, 10);
                onLimitChange(newLimit);
              }}
              className="bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:border-neutral-600 cursor-pointer"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>per page</span>
          </div>
        )}
      </div>

      {/* Navigation Buttons: Prev, Current/Total, Next */}
      <div className="flex items-center gap-2">
        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium text-xs cursor-pointer"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Prev</span>
        </button>

        {/* Current / Total Indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-semibold select-none">
          <span className="text-white font-bold">{safeCurrentPage}</span>
          <span className="text-neutral-500">/</span>
          <span className="text-neutral-400">{totalPages || 1}</span>
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= totalPages}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium text-xs cursor-pointer"
          title="Next Page"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
