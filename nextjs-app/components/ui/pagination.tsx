'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}

export function Pagination({ currentPage, totalPages, baseUrl }: PaginationProps) {
  const searchParams = useSearchParams();

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    return `${baseUrl}?${params.toString()}`;
  };

  if (totalPages <= 1) {
    return null;
  }

  const pages = [];
  const showEllipsis = totalPages > 7;

  if (showEllipsis) {
    // Always show first page
    pages.push(1);

    // Show ellipsis or pages around current
    if (currentPage > 3) {
      pages.push(-1); // Ellipsis marker
    }

    // Show 2 pages before and after current
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }

    // Show ellipsis before last page if needed
    if (currentPage < totalPages - 2) {
      pages.push(-2); // Ellipsis marker
    }

    // Always show last page
    pages.push(totalPages);
  } else {
    // Show all pages if there are 7 or fewer
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      {/* Previous button */}
      {currentPage > 1 ? (
        <Link
          href={createPageUrl(currentPage - 1)}
          className="px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          ← Назад
        </Link>
      ) : (
        <span className="px-3 py-2 rounded-md border border-gray-200 text-gray-400 cursor-not-allowed">
          ← Назад
        </span>
      )}

      {/* Page numbers */}
      {pages.map((page, index) => {
        if (page === -1 || page === -2) {
          return (
            <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
              ...
            </span>
          );
        }

        const isActive = page === currentPage;

        return (
          <Link
            key={page}
            href={createPageUrl(page)}
            className={`px-4 py-2 rounded-md border transition-colors ${
              isActive
                ? 'bg-blue-600 text-white border-blue-600 font-medium'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            {page}
          </Link>
        );
      })}

      {/* Next button */}
      {currentPage < totalPages ? (
        <Link
          href={createPageUrl(currentPage + 1)}
          className="px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Вперёд →
        </Link>
      ) : (
        <span className="px-3 py-2 rounded-md border border-gray-200 text-gray-400 cursor-not-allowed">
          Вперёд →
        </span>
      )}
    </div>
  );
}

interface PaginationInfoProps {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

export function PaginationInfo({ currentPage, itemsPerPage, totalItems }: PaginationInfoProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="text-sm text-gray-600 text-center mt-4">
      Показано {startItem}–{endItem} из {totalItems}
    </div>
  );
}
