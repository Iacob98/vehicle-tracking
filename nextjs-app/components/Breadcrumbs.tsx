import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

/**
 * Breadcrumbs - navigation component for hierarchical page structure
 *
 * @example
 * <Breadcrumbs
 *   items={[
 *     { label: 'Dashboard', href: '/dashboard' },
 *     { label: 'Vehicles', href: '/dashboard/vehicles' },
 *     { label: 'Vehicle #123' }
 *   ]}
 * />
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-blue-600 hover:underline transition"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-gray-900 font-medium' : ''}>
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
