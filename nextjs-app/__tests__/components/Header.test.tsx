import { render, screen } from '@testing-library/react';
import Header from '@/components/Header';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

describe('Header Component', () => {
  const mockUser = {
    first_name: 'Иван',
    role: 'admin',
  };

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('renders welcome message with user name', () => {
    render(<Header user={mockUser} />);
    expect(screen.getByText(/Добро пожаловать, Иван!/i)).toBeInTheDocument();
  });

  it('renders user role as admin', () => {
    render(<Header user={mockUser} />);
    expect(screen.getByText('Администратор')).toBeInTheDocument();
  });

  it('renders sign out button', () => {
    render(<Header user={mockUser} />);
    expect(screen.getByText('Выйти')).toBeInTheDocument();
  });

  it('renders manager role correctly', () => {
    const managerUser = { ...mockUser, role: 'manager' };
    render(<Header user={managerUser} />);
    expect(screen.getByText('Менеджер')).toBeInTheDocument();
  });

  it('renders default role for unknown roles', () => {
    const workerUser = { ...mockUser, role: 'worker' };
    render(<Header user={workerUser} />);
    expect(screen.getByText('Работник')).toBeInTheDocument();
  });
});
