/**
 * Unit tests for Pagination component
 */

import { render, screen } from '@testing-library/react';
import { Pagination, PaginationInfo } from '@/components/ui/pagination';
import { ReadonlyURLSearchParams } from 'next/navigation';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

const { useSearchParams } = require('next/navigation');

describe('Pagination Component', () => {
  beforeEach(() => {
    // Reset mock before each test
    useSearchParams.mockReturnValue(new URLSearchParams());
  });

  // ============================================================================
  // Basic Rendering
  // ============================================================================

  it('should render pagination with correct number of pages', () => {
    render(<Pagination currentPage={1} totalPages={5} baseUrl="/test" />);

    // Should have Previous, 1, 2, 3, 4, 5, Next
    expect(screen.getByText('← Назад')).toBeInTheDocument();
    expect(screen.getByText('Вперёд →')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should not render when totalPages is 1', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} baseUrl="/test" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should not render when totalPages is 0', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={0} baseUrl="/test" />
    );
    expect(container.firstChild).toBeNull();
  });

  // ============================================================================
  // Current Page Styling
  // ============================================================================

  it('should highlight current page', () => {
    render(<Pagination currentPage={3} totalPages={5} baseUrl="/test" />);

    const currentPageLink = screen.getByText('3').closest('a');
    expect(currentPageLink).toHaveClass('bg-blue-600');
    expect(currentPageLink).toHaveClass('text-white');
  });

  it('should not highlight non-current pages', () => {
    render(<Pagination currentPage={3} totalPages={5} baseUrl="/test" />);

    const page1Link = screen.getByText('1').closest('a');
    expect(page1Link).not.toHaveClass('bg-blue-600');
    expect(page1Link).toHaveClass('bg-white');
  });

  // ============================================================================
  // Previous/Next Buttons
  // ============================================================================

  it('should disable Previous button on first page', () => {
    render(<Pagination currentPage={1} totalPages={5} baseUrl="/test" />);

    const prevButton = screen.getByText('← Назад').closest('span');
    expect(prevButton).toHaveClass('cursor-not-allowed');
    expect(prevButton).toHaveClass('text-gray-400');
  });

  it('should enable Previous button on non-first page', () => {
    render(<Pagination currentPage={2} totalPages={5} baseUrl="/test" />);

    const prevButton = screen.getByText('← Назад').closest('a');
    expect(prevButton).not.toHaveClass('cursor-not-allowed');
    expect(prevButton).toHaveClass('hover:bg-gray-50');
  });

  it('should disable Next button on last page', () => {
    render(<Pagination currentPage={5} totalPages={5} baseUrl="/test" />);

    const nextButton = screen.getByText('Вперёд →').closest('span');
    expect(nextButton).toHaveClass('cursor-not-allowed');
    expect(nextButton).toHaveClass('text-gray-400');
  });

  it('should enable Next button on non-last page', () => {
    render(<Pagination currentPage={1} totalPages={5} baseUrl="/test" />);

    const nextButton = screen.getByText('Вперёд →').closest('a');
    expect(nextButton).not.toHaveClass('cursor-not-allowed');
    expect(nextButton).toHaveClass('hover:bg-gray-50');
  });

  // ============================================================================
  // URL Generation
  // ============================================================================

  it('should generate correct URLs for page links', () => {
    render(<Pagination currentPage={1} totalPages={3} baseUrl="/vehicles" />);

    const page2Link = screen.getByText('2').closest('a');
    expect(page2Link).toHaveAttribute('href', '/vehicles?page=2');
  });

  it('should preserve existing search params', () => {
    const searchParams = new URLSearchParams('status=active&sort=name');
    useSearchParams.mockReturnValue(searchParams);

    render(<Pagination currentPage={1} totalPages={3} baseUrl="/vehicles" />);

    const page2Link = screen.getByText('2').closest('a');
    const href = page2Link?.getAttribute('href');

    expect(href).toContain('page=2');
    expect(href).toContain('status=active');
    expect(href).toContain('sort=name');
  });

  it('should generate correct Previous page URL', () => {
    render(<Pagination currentPage={3} totalPages={5} baseUrl="/test" />);

    const prevLink = screen.getByText('← Назад').closest('a');
    expect(prevLink).toHaveAttribute('href', '/test?page=2');
  });

  it('should generate correct Next page URL', () => {
    render(<Pagination currentPage={3} totalPages={5} baseUrl="/test" />);

    const nextLink = screen.getByText('Вперёд →').closest('a');
    expect(nextLink).toHaveAttribute('href', '/test?page=4');
  });

  // ============================================================================
  // Ellipsis for Many Pages
  // ============================================================================

  it('should show ellipsis when totalPages > 7', () => {
    render(<Pagination currentPage={1} totalPages={10} baseUrl="/test" />);

    // Should show: Prev | 1 2 3 4 5 ... 10 | Next
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('should show ellipsis in correct position for middle pages', () => {
    render(<Pagination currentPage={5} totalPages={10} baseUrl="/test" />);

    // Should show: Prev | 1 ... 4 5 6 ... 10 | Next
    const ellipses = screen.getAllByText('...');
    expect(ellipses).toHaveLength(2); // Two ellipses
  });

  it('should not show ellipsis when totalPages <= 7', () => {
    render(<Pagination currentPage={3} totalPages={7} baseUrl="/test" />);

    expect(screen.queryByText('...')).not.toBeInTheDocument();
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  it('should handle currentPage = 1 and totalPages = 2', () => {
    render(<Pagination currentPage={1} totalPages={2} baseUrl="/test" />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('← Назад').closest('span')).toHaveClass('cursor-not-allowed');
    expect(screen.getByText('Вперёд →').closest('a')).not.toHaveClass('cursor-not-allowed');
  });

  it('should handle last page correctly', () => {
    render(<Pagination currentPage={10} totalPages={10} baseUrl="/test" />);

    const currentPageLink = screen.getByText('10').closest('a');
    expect(currentPageLink).toHaveClass('bg-blue-600');
    expect(screen.getByText('Вперёд →').closest('span')).toHaveClass('cursor-not-allowed');
  });
});

// ============================================================================
// PaginationInfo Component
// ============================================================================

describe('PaginationInfo Component', () => {
  it('should display correct info for first page', () => {
    render(<PaginationInfo currentPage={1} itemsPerPage={20} totalItems={100} />);

    expect(screen.getByText('Показано 1–20 из 100')).toBeInTheDocument();
  });

  it('should display correct info for middle page', () => {
    render(<PaginationInfo currentPage={3} itemsPerPage={20} totalItems={100} />);

    expect(screen.getByText('Показано 41–60 из 100')).toBeInTheDocument();
  });

  it('should display correct info for last page', () => {
    render(<PaginationInfo currentPage={5} itemsPerPage={20} totalItems={85} />);

    // Should show 81-85 (not 81-100)
    expect(screen.getByText('Показано 81–85 из 85')).toBeInTheDocument();
  });

  it('should handle single item correctly', () => {
    render(<PaginationInfo currentPage={1} itemsPerPage={20} totalItems={1} />);

    expect(screen.getByText('Показано 1–1 из 1')).toBeInTheDocument();
  });

  it('should handle zero items', () => {
    render(<PaginationInfo currentPage={1} itemsPerPage={20} totalItems={0} />);

    expect(screen.getByText('Показано 1–0 из 0')).toBeInTheDocument();
  });

  it('should calculate correct range for different itemsPerPage', () => {
    render(<PaginationInfo currentPage={2} itemsPerPage={15} totalItems={50} />);

    // Page 2 with 15 per page: 16-30
    expect(screen.getByText('Показано 16–30 из 50')).toBeInTheDocument();
  });

  it('should handle partial last page', () => {
    render(<PaginationInfo currentPage={4} itemsPerPage={10} totalItems={35} />);

    // Page 4 with 10 per page: 31-35 (not 31-40)
    expect(screen.getByText('Показано 31–35 из 35')).toBeInTheDocument();
  });

  it('should apply correct text styling', () => {
    const { container } = render(
      <PaginationInfo currentPage={1} itemsPerPage={20} totalItems={100} />
    );

    const infoElement = container.querySelector('.text-sm.text-gray-700');
    expect(infoElement).toBeInTheDocument();
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Pagination - Integration', () => {
  it('should work with both Pagination and PaginationInfo together', () => {
    const { container } = render(
      <>
        <Pagination currentPage={2} totalPages={5} baseUrl="/test" />
        <PaginationInfo currentPage={2} itemsPerPage={20} totalItems={85} />
      </>
    );

    // Check pagination controls
    expect(screen.getByText('← Назад')).toBeInTheDocument();
    expect(screen.getByText('2').closest('a')).toHaveClass('bg-blue-600');

    // Check info
    expect(screen.getByText('Показано 21–40 из 85')).toBeInTheDocument();
  });

  it('should maintain consistency between components', () => {
    const currentPage = 3;
    const itemsPerPage = 15;
    const totalItems = 50;
    const totalPages = Math.ceil(totalItems / itemsPerPage); // 4

    render(
      <>
        <Pagination currentPage={currentPage} totalPages={totalPages} baseUrl="/test" />
        <PaginationInfo currentPage={currentPage} itemsPerPage={itemsPerPage} totalItems={totalItems} />
      </>
    );

    // Page 3 should be highlighted
    expect(screen.getByText('3').closest('a')).toHaveClass('bg-blue-600');

    // Info should show correct range: (3-1)*15+1 to min(3*15, 50) = 31 to 45
    expect(screen.getByText('Показано 31–45 из 50')).toBeInTheDocument();
  });
});
