import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Build a compact page list with ellipses, e.g. 1 … 4 5 6 … 12
 */
function buildPageItems(current: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);

  if (start > 2) items.push('ellipsis');
  for (let p = start; p <= end; p++) items.push(p);
  if (end < totalPages - 1) items.push('ellipsis');

  items.push(totalPages);
  return items;
}

export default function Pagination({ page, pageSize, total, onPageChange, className = '' }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className={`flex flex-col items-center gap-3 sm:flex-row sm:justify-between ${className}`}>
      <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
        Showing <span className="font-medium text-text-primary dark:text-text-primary-dark">{from}</span>
        {'–'}
        <span className="font-medium text-text-primary dark:text-text-primary-dark">{to}</span> of{' '}
        <span className="font-medium text-text-primary dark:text-text-primary-dark">{total}</span> listings
      </p>

      {totalPages > 1 && (
        <nav className="flex items-center gap-1" aria-label="Listings pagination">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className="btn btn-ghost btn-sm flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {buildPageItems(page, totalPages).map((item, idx) =>
            item === 'ellipsis' ? (
              <span key={`e-${idx}`} className="px-2 text-text-tertiary dark:text-text-tertiary-dark select-none">
                &hellip;
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-label={`Page ${item}`}
                aria-current={item === page ? 'page' : undefined}
                className={`min-w-9 h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                  item === page
                    ? 'bg-primary-600 text-white'
                    : 'text-text-secondary dark:text-text-secondary-dark hover:bg-grey-100 dark:hover:bg-grey-800'
                }`}
              >
                {item}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
            className="btn btn-ghost btn-sm flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </nav>
      )}
    </div>
  );
}
