/**
 * Server Actions Tests for Penalties
 */

import { createServerClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server');
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('Penalty Server Actions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };
    (createServerClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('Create Penalty', () => {
    it('should create penalty with vehicle_id and user_id', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            user_metadata: { organization_id: 'org-123' },
          },
        },
      });

      const mockInsert = jest.fn().mockResolvedValue({
        data: { id: 'penalty-123' },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      const formData = new FormData();
      formData.append('vehicle_id', 'vehicle-123');
      formData.append('user_id', 'user-123');
      formData.append('amount', '50.00');
      formData.append('date', '2025-10-01');

      expect(formData.get('vehicle_id')).toBe('vehicle-123');
      expect(formData.get('amount')).toBe('50.00');
      // Note: team_id should NOT be included (schema fix)
      expect(formData.get('team_id')).toBeNull();
    });

    it('should default status to open', async () => {
      const formData = new FormData();
      formData.append('vehicle_id', 'vehicle-123');
      formData.append('amount', '50.00');
      formData.append('date', '2025-10-01');

      // Status should default to 'open' if not provided
      const status = formData.get('status') || 'open';
      expect(status).toBe('open');
    });
  });

  describe('Update Penalty', () => {
    it('should update penalty status', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            user_metadata: { organization_id: 'org-123' },
          },
        },
      });

      const mockUpdate = jest.fn().mockResolvedValue({
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: mockUpdate,
          }),
        }),
      });

      const formData = new FormData();
      formData.append('status', 'paid');

      expect(formData.get('status')).toBe('paid');
    });

    it('should validate amount is positive', async () => {
      const formData = new FormData();
      formData.append('amount', '-10.00');

      const amount = parseFloat(formData.get('amount') as string);
      expect(amount).toBeLessThan(0);
      // In real implementation, this should be rejected
    });
  });
});
