'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTablePaginationProps {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
}

export function DataTablePagination({
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'entrées',
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIdx = Math.min(totalItems, safePage * pageSize);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 mt-3 border-t border-stone-200/85 text-xs text-zinc-600">
      <div className="flex flex-wrap items-center gap-3">
        <span>
          Affichage de <strong className="text-zinc-900">{startIdx}</strong> à{' '}
          <strong className="text-zinc-900">{endIdx}</strong> sur{' '}
          <strong className="text-zinc-900">{totalItems}</strong> {itemLabel}
        </span>

        <div className="inline-flex items-center gap-1.5">
          <span className="text-zinc-500">Lignes :</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="rounded-lg bg-white border border-stone-300 px-2 py-1 text-xs font-mono text-zinc-800 focus:outline-none focus:border-[#568203]"
          >
            {[5, 10, 25, 50, 100].map((sz) => (
              <option key={sz} value={sz}>
                {sz} / page
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="inline-flex items-center gap-1 rounded-lg bg-white hover:bg-stone-100 disabled:opacity-40 disabled:pointer-events-none border border-stone-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>Précédent</span>
        </button>

        <span className="rounded-lg bg-[#FFF8B9]/75 border border-[#568203]/30 px-3 py-1.5 font-mono text-xs font-semibold text-zinc-900">
          Page {safePage} / {totalPages}
        </span>

        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="inline-flex items-center gap-1 rounded-lg bg-white hover:bg-stone-100 disabled:opacity-40 disabled:pointer-events-none border border-stone-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors"
        >
          <span>Suivant</span>
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

