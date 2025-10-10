/**
 * Unit tests for ErrorDisplay component
 */

import { render, screen } from '@testing-library/react';
import { ErrorDisplay, InlineError } from '@/components/ui/error-display';
import { ErrorType, AppError } from '@/lib/errors';

describe('ErrorDisplay Component', () => {
  // ============================================================================
  // Basic Rendering
  // ============================================================================

  it('should render nothing when error is null', () => {
    const { container } = render(<ErrorDisplay error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render error message', () => {
    const error: AppError = {
      type: ErrorType.VALIDATION,
      message: 'Test error message',
    };

    render(<ErrorDisplay error={error} />);
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should render error title based on type', () => {
    const error: AppError = {
      type: ErrorType.VALIDATION,
      message: 'Test error',
    };

    render(<ErrorDisplay error={error} />);
    expect(screen.getByText('Проверьте введенные данные')).toBeInTheDocument();
  });

  // ============================================================================
  // Error Types Styling
  // ============================================================================

  it('should apply correct styling for VALIDATION error', () => {
    const error: AppError = {
      type: ErrorType.VALIDATION,
      message: 'Validation error',
    };

    const { container } = render(<ErrorDisplay error={error} />);
    const alertDiv = container.querySelector('[role="alert"]');

    expect(alertDiv).toHaveClass('bg-yellow-50');
    expect(alertDiv).toHaveClass('border-yellow-200');
  });

  it('should apply correct styling for AUTHENTICATION error', () => {
    const error: AppError = {
      type: ErrorType.AUTHENTICATION,
      message: 'Auth error',
    };

    const { container } = render(<ErrorDisplay error={error} />);
    const alertDiv = container.querySelector('[role="alert"]');

    expect(alertDiv).toHaveClass('bg-red-50');
    expect(alertDiv).toHaveClass('border-red-200');
  });

  it('should apply correct styling for NETWORK error', () => {
    const error: AppError = {
      type: ErrorType.NETWORK,
      message: 'Network error',
    };

    const { container } = render(<ErrorDisplay error={error} />);
    const alertDiv = container.querySelector('[role="alert"]');

    expect(alertDiv).toHaveClass('bg-orange-50');
    expect(alertDiv).toHaveClass('border-orange-200');
  });

  it('should apply correct styling for FILE_UPLOAD error', () => {
    const error: AppError = {
      type: ErrorType.FILE_UPLOAD,
      message: 'File error',
    };

    const { container } = render(<ErrorDisplay error={error} />);
    const alertDiv = container.querySelector('[role="alert"]');

    expect(alertDiv).toHaveClass('bg-yellow-50');
  });

  it('should apply correct styling for BUSINESS_LOGIC error', () => {
    const error: AppError = {
      type: ErrorType.BUSINESS_LOGIC,
      message: 'Business logic error',
    };

    const { container } = render(<ErrorDisplay error={error} />);
    const alertDiv = container.querySelector('[role="alert"]');

    expect(alertDiv).toHaveClass('bg-blue-50');
    expect(alertDiv).toHaveClass('border-blue-200');
  });

  // ============================================================================
  // Error Titles
  // ============================================================================

  it('should show correct title for DATABASE error', () => {
    const error: AppError = {
      type: ErrorType.DATABASE,
      message: 'Database error',
    };

    render(<ErrorDisplay error={error} />);
    expect(screen.getByText('Ошибка сохранения данных')).toBeInTheDocument();
  });

  it('should show correct title for RLS_POLICY error', () => {
    const error: AppError = {
      type: ErrorType.RLS_POLICY,
      message: 'RLS error',
    };

    render(<ErrorDisplay error={error} />);
    expect(screen.getByText('Ошибка доступа')).toBeInTheDocument();
  });

  it('should show correct title for NETWORK error', () => {
    const error: AppError = {
      type: ErrorType.NETWORK,
      message: 'Network error',
    };

    render(<ErrorDisplay error={error} />);
    expect(screen.getByText('Проблемы с подключением')).toBeInTheDocument();
  });

  it('should show correct title for FILE_UPLOAD error', () => {
    const error: AppError = {
      type: ErrorType.FILE_UPLOAD,
      message: 'Upload error',
    };

    render(<ErrorDisplay error={error} />);
    expect(screen.getByText('Ошибка загрузки файла')).toBeInTheDocument();
  });

  it('should show correct title for BUSINESS_LOGIC error', () => {
    const error: AppError = {
      type: ErrorType.BUSINESS_LOGIC,
      message: 'Logic error',
    };

    render(<ErrorDisplay error={error} />);
    expect(screen.getByText('Невозможно выполнить операцию')).toBeInTheDocument();
  });

  it('should show generic title for UNKNOWN error', () => {
    const error: AppError = {
      type: ErrorType.UNKNOWN,
      message: 'Unknown error',
    };

    render(<ErrorDisplay error={error} />);
    expect(screen.getByText('Произошла ошибка')).toBeInTheDocument();
  });

  // ============================================================================
  // Details Display
  // ============================================================================

  it('should hide details by default', () => {
    const error: AppError = {
      type: ErrorType.VALIDATION,
      message: 'Test error',
      details: 'Detailed error information',
    };

    render(<ErrorDisplay error={error} showDetails={false} />);
    expect(screen.queryByText('Detailed error information')).not.toBeInTheDocument();
  });

  it('should show details when showDetails is true', () => {
    const error: AppError = {
      type: ErrorType.VALIDATION,
      message: 'Test error',
      details: 'Detailed error information',
    };

    render(<ErrorDisplay error={error} showDetails={true} />);

    // Details are inside a <details> element
    const detailsElement = screen.getByText('Технические детали');
    expect(detailsElement).toBeInTheDocument();

    const detailText = screen.getByText('Detailed error information');
    expect(detailText).toBeInTheDocument();
  });

  it('should not show details section when no details provided', () => {
    const error: AppError = {
      type: ErrorType.VALIDATION,
      message: 'Test error',
    };

    render(<ErrorDisplay error={error} showDetails={true} />);
    expect(screen.queryByText('Технические детали')).not.toBeInTheDocument();
  });

  // ============================================================================
  // Custom ClassName
  // ============================================================================

  it('should apply custom className', () => {
    const error: AppError = {
      type: ErrorType.VALIDATION,
      message: 'Test error',
    };

    const { container } = render(
      <ErrorDisplay error={error} className="custom-class" />
    );

    const alertDiv = container.querySelector('[role="alert"]');
    expect(alertDiv).toHaveClass('custom-class');
  });

  // ============================================================================
  // Accessibility
  // ============================================================================

  it('should have proper ARIA role', () => {
    const error: AppError = {
      type: ErrorType.VALIDATION,
      message: 'Test error',
    };

    const { container } = render(<ErrorDisplay error={error} />);
    expect(container.querySelector('[role="alert"]')).toBeInTheDocument();
  });
});

// ============================================================================
// InlineError Component
// ============================================================================

describe('InlineError Component', () => {
  it('should render nothing when message is undefined', () => {
    const { container } = render(<InlineError />);
    expect(container.firstChild).toBeNull();
  });

  it('should render nothing when message is empty string', () => {
    const { container } = render(<InlineError message="" />);
    expect(container.firstChild).toBeNull();
  });

  it('should render error message', () => {
    render(<InlineError message="Field is required" />);
    expect(screen.getByText('Field is required')).toBeInTheDocument();
  });

  it('should have red text color', () => {
    const { container } = render(<InlineError message="Error" />);
    const errorElement = container.querySelector('.text-red-600');
    expect(errorElement).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <InlineError message="Error" className="custom-error" />
    );
    const errorElement = screen.getByText('Error').parentElement;
    expect(errorElement).toHaveClass('custom-error');
  });

  it('should display icon with error message', () => {
    const { container } = render(<InlineError message="Error" />);

    // Check that message is displayed
    expect(screen.getByText('Error')).toBeInTheDocument();

    // Check that container has flex items-center gap-1
    const errorElement = screen.getByText('Error').parentElement;
    expect(errorElement).toHaveClass('flex', 'items-center', 'gap-1');
  });
});

// ============================================================================
// Database-Specific Error Types
// ============================================================================

describe('ErrorDisplay - Database Error Types', () => {
  it('should show correct styling for UNIQUE_VIOLATION', () => {
    const error: AppError = {
      type: ErrorType.UNIQUE_VIOLATION,
      message: 'Duplicate entry',
    };

    const { container } = render(<ErrorDisplay error={error} />);
    expect(screen.getByText('Ошибка сохранения данных')).toBeInTheDocument();

    const alertDiv = container.querySelector('[role="alert"]');
    expect(alertDiv).toHaveClass('bg-red-50');
  });

  it('should show correct styling for FOREIGN_KEY_VIOLATION', () => {
    const error: AppError = {
      type: ErrorType.FOREIGN_KEY_VIOLATION,
      message: 'Foreign key error',
    };

    render(<ErrorDisplay error={error} />);
    expect(screen.getByText('Ошибка сохранения данных')).toBeInTheDocument();
  });

  it('should show correct styling for CHECK_VIOLATION', () => {
    const error: AppError = {
      type: ErrorType.CHECK_VIOLATION,
      message: 'Check constraint failed',
    };

    render(<ErrorDisplay error={error} />);
    expect(screen.getByText('Ошибка сохранения данных')).toBeInTheDocument();
  });

  it('should show correct styling for NOT_NULL_VIOLATION', () => {
    const error: AppError = {
      type: ErrorType.NOT_NULL_VIOLATION,
      message: 'Required field missing',
    };

    render(<ErrorDisplay error={error} />);
    expect(screen.getByText('Ошибка сохранения данных')).toBeInTheDocument();
  });
});
