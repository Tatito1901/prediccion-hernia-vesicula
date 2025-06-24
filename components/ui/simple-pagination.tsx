// components/ui/simple-pagination.tsx

import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SimplePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading: boolean;
}

export function SimplePagination({ currentPage, totalPages, onPageChange, loading }: SimplePaginationProps) {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots: (number | string)[] = [];

    // Lógica para determinar qué números de página mostrar
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1 && totalPages !== range[range.length-1] && totalPages !== 1) {
       rangeWithDots.push(totalPages);
    }

    // Asegurar que no haya duplicados si el rango toca los bordes
    return [...new Set(rangeWithDots)];
  };

  const pages = getVisiblePages();

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || loading}
        className="h-8 w-8 sm:w-auto sm:px-3"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline ml-1">Anterior</span>
      </Button>

      <div className="flex items-center gap-1">
        {pages.map((page, idx) =>
          page === '...' ? (
            <span key={`dots-${idx}`} className="px-2 text-slate-400">...</span>
          ) : (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page as number)}
              disabled={loading}
              className={cn(
                "h-8 w-8",
                page === currentPage && "bg-blue-600 hover:bg-blue-700 text-white"
              )}
            >
              {page}
            </Button>
          )
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || loading}
        className="h-8 w-8 sm:w-auto sm:px-3"
      >
        <span className="hidden sm:inline mr-1">Siguiente</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
