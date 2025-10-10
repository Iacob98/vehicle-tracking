/**
 * Integration tests for Team Members API
 *
 * Tests API routes:
 * - POST /api/team-members - Create new team member
 * - DELETE /api/team-members/[id] - Delete team member
 */

import { POST } from '@/app/api/team-members/route';
import { DELETE } from '@/app/api/team-members/[id]/route';
import { createServerClient } from '@/lib/supabase/server';

// Mock Next.js server
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: any) => ({
      json: async () => data,
      status: init?.status || 200,
    }),
  },
}));

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(),
}));

const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>;

describe('Team Members API', () => {
  let mockSupabase: any;
  let mockAuthGetUser: jest.Mock;
  let mockInsert: jest.Mock;
  let mockSelect: jest.Mock;
  let mockSingle: jest.Mock;
  let mockDelete: jest.Mock;
  let mockEq: jest.Mock;
  let mockFrom: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock functions
    mockAuthGetUser = jest.fn();
    mockInsert = jest.fn();
    mockSelect = jest.fn();
    mockSingle = jest.fn();
    mockDelete = jest.fn();
    mockEq = jest.fn();
    mockFrom = jest.fn();

    // Setup mock Supabase client with proper chaining
    mockSupabase = {
      auth: {
        getUser: mockAuthGetUser,
      },
      from: mockFrom,
    };

    // Setup default chaining
    mockFrom.mockReturnValue({
      insert: mockInsert,
      delete: mockDelete,
    });

    mockInsert.mockReturnValue({
      select: mockSelect,
    });

    mockSelect.mockReturnValue({
      single: mockSingle,
    });

    mockDelete.mockReturnValue({
      eq: mockEq,
    });

    mockCreateServerClient.mockResolvedValue(mockSupabase);
  });

  // ============================================================================
  // POST /api/team-members - Create Team Member
  // ============================================================================

  describe('POST /api/team-members', () => {
    const validMemberData = {
      team_id: 'team-123',
      organization_id: 'org-123',
      first_name: 'John',
      last_name: 'Doe',
      phone: '+1234567890',
      category: 'driver',
    };

    it('should create team member with valid data', async () => {
      // Mock successful auth
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@test.com' } },
        error: null,
      });

      // Mock successful insert
      const mockMember = { id: 'member-123', ...validMemberData };
      mockSingle.mockResolvedValue({
        data: mockMember,
        error: null,
      });

      const request = new Request('http://localhost/api/team-members', {
        method: 'POST',
        body: JSON.stringify(validMemberData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.member).toEqual(mockMember);
      expect(mockFrom).toHaveBeenCalledWith('team_members');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          team_id: validMemberData.team_id,
          organization_id: validMemberData.organization_id,
          first_name: validMemberData.first_name,
          last_name: validMemberData.last_name,
          phone: validMemberData.phone,
          category: validMemberData.category,
        })
      );
    });

    it('should create team member without optional fields', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const minimalData = {
        team_id: 'team-123',
        organization_id: 'org-123',
        first_name: 'Jane',
        last_name: 'Smith',
      };

      const mockMember = { id: 'member-456', ...minimalData, phone: null, category: null };
      mockSingle.mockResolvedValue({
        data: mockMember,
        error: null,
      });

      const request = new Request('http://localhost/api/team-members', {
        method: 'POST',
        body: JSON.stringify(minimalData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.member).toEqual(mockMember);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: null,
          category: null,
        })
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new Request('http://localhost/api/team-members', {
        method: 'POST',
        body: JSON.stringify(validMemberData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Требуется авторизация');
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should return 400 when first_name is missing', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const invalidData = {
        team_id: 'team-123',
        organization_id: 'org-123',
        last_name: 'Doe',
      };

      const request = new Request('http://localhost/api/team-members', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('First name and last name are required');
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('should return 400 when last_name is missing', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const invalidData = {
        team_id: 'team-123',
        organization_id: 'org-123',
        first_name: 'John',
      };

      const request = new Request('http://localhost/api/team-members', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('First name and last name are required');
    });

    it('should return 500 when database insert fails', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const request = new Request('http://localhost/api/team-members', {
        method: 'POST',
        body: JSON.stringify(validMemberData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Произошла неизвестная ошибка');
    });

    it('should handle JSON parse errors', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const request = new Request('http://localhost/api/team-members', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should include created_at timestamp', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockMember = { id: 'member-123', ...validMemberData };
      mockSingle.mockResolvedValue({
        data: mockMember,
        error: null,
      });

      const request = new Request('http://localhost/api/team-members', {
        method: 'POST',
        body: JSON.stringify(validMemberData),
      });

      await POST(request);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          created_at: expect.any(String),
        })
      );
    });
  });

  // ============================================================================
  // DELETE /api/team-members/[id] - Delete Team Member
  // ============================================================================

  describe('DELETE /api/team-members/[id]', () => {
    it('should delete team member successfully', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockEq.mockResolvedValue({
        data: null,
        error: null,
      });

      const request = new Request('http://localhost/api/team-members/member-123', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ id: 'member-123' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('team_members');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'member-123');
    });

    it('should return 401 when user is not authenticated', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new Request('http://localhost/api/team-members/member-123', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ id: 'member-123' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Требуется авторизация');
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should return 500 when database delete fails', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockEq.mockResolvedValue({
        data: null,
        error: { message: 'Foreign key constraint violation' },
      });

      const request = new Request('http://localhost/api/team-members/member-123', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ id: 'member-123' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Произошла неизвестная ошибка');
    });

    it('should handle non-existent member gracefully', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Supabase doesn't return error for non-existent records
      mockEq.mockResolvedValue({
        data: null,
        error: null,
      });

      const request = new Request('http://localhost/api/team-members/nonexistent-id', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ id: 'nonexistent-id' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty strings in required fields', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const invalidData = {
        team_id: 'team-123',
        organization_id: 'org-123',
        first_name: '',
        last_name: '',
      };

      const request = new Request('http://localhost/api/team-members', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('First name and last name are required');
    });

    it('should handle very long names', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const longName = 'A'.repeat(300);
      const dataWithLongNames = {
        team_id: 'team-123',
        organization_id: 'org-123',
        first_name: longName,
        last_name: longName,
      };

      const mockMember = { id: 'member-789', ...dataWithLongNames };
      mockSingle.mockResolvedValue({
        data: mockMember,
        error: null,
      });

      const request = new Request('http://localhost/api/team-members', {
        method: 'POST',
        body: JSON.stringify(dataWithLongNames),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: longName,
          last_name: longName,
        })
      );
    });

    it('should handle special characters in names', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const specialData = {
        team_id: 'team-123',
        organization_id: 'org-123',
        first_name: "O'Connor",
        last_name: 'Müller-Schmidt',
      };

      const mockMember = { id: 'member-special', ...specialData };
      mockSingle.mockResolvedValue({
        data: mockMember,
        error: null,
      });

      const request = new Request('http://localhost/api/team-members', {
        method: 'POST',
        body: JSON.stringify(specialData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.member.first_name).toBe("O'Connor");
      expect(data.member.last_name).toBe('Müller-Schmidt');
    });
  });
});
