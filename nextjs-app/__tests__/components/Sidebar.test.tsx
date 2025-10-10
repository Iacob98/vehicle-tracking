import { render, screen } from '@testing-library/react';
import Sidebar from '@/components/Sidebar';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

describe('Sidebar Component', () => {
  const mockUser = {
    organizations: {
      name: 'Test Organization',
    },
  };

  it('renders the app title', () => {
    render(<Sidebar user={mockUser} />);
    expect(screen.getByText('🚗 Fleet Manager')).toBeInTheDocument();
  });

  it('renders organization name', () => {
    render(<Sidebar user={mockUser} />);
    expect(screen.getByText('Test Organization')).toBeInTheDocument();
  });

  it('renders all menu items', () => {
    render(<Sidebar user={mockUser} />);

    const menuItems = [
      'Dashboard',
      'Автомобили',
      'Все документы',
      'Истекающие документы',
      'Бригады',
      'Участники бригад',
      'Пользователи',
      'Штрафы',
      'Обслуживание',
      'Расходы на авто',
      'Расходы',
      'Аналитика',
      'Управление аккаунтом',
      'Баг репорт',
    ];

    menuItems.forEach(item => {
      expect(screen.getByText(item)).toBeInTheDocument();
    });
  });

  it('highlights active menu item', () => {
    render(<Sidebar user={mockUser} />);
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveClass('bg-blue-50', 'text-blue-700');
  });
});
