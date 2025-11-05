import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiCreated,
  apiBadRequest,
  apiForbidden,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOwnerOrOrganizationId,
} from '@/lib/api-response';
import { getUserQueryContext, getOrgIdForCreate } from '@/lib/query-helpers';
import { Permissions, type UserRole } from '@/lib/types/roles';
import { createVehicleTypeSchema } from '@/lib/schemas/vehicle-types.schema';

/**
 * GET /api/vehicle-types
 * Get all vehicle types for the organization
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check authentication
    const authError = checkAuthentication(user);
    if (authError) return authError;

    // Check organization_id with support for owner role
    const { orgId, isSuperAdmin, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    // Get user query context
    const userContext = getUserQueryContext(user);

    // Build query based on user role
    let query = supabase
      .from('vehicle_types')
      .select('*')
      .order('name', { ascending: true });

    // Apply organization filter
    if (userContext.isSuperAdmin) {
      // Super admin sees all types, but we still need to filter by org if specified in query params
      const url = new URL(request.url);
      const orgIdParam = url.searchParams.get('organization_id');
      if (orgIdParam) {
        query = query.eq('organization_id', orgIdParam);
      }
    } else {
      // Regular users see only their organization's types
      query = query.eq('organization_id', orgId!);
    }

    const { data: vehicleTypes, error } = await query;

    if (error) {
      return apiErrorFromUnknown(error, {
        context: 'fetching vehicle types',
        orgId,
      });
    }

    return apiSuccess({ vehicleTypes: vehicleTypes || [] });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'GET /api/vehicle-types' });
  }
}

/**
 * POST /api/vehicle-types
 * Create a new vehicle type
 * Only admin and manager can create vehicle types
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check authentication
    const authError = checkAuthentication(user);
    if (authError) return authError;

    // Check organization_id with support for owner role
    const { orgId, isSuperAdmin, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    // Check permissions (only admin and manager)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (!Permissions.canManageVehicles(userRole)) {
      return apiForbidden('У вас нет прав на создание типов автомобилей');
    }

    // Get JSON body
    const body = await request.json();

    // Get user query context and determine organization_id for creation
    const userContext = getUserQueryContext(user);
    const finalOrgId = getOrgIdForCreate(userContext, body.organization_id);

    // Owner must explicitly specify organization_id
    if (!finalOrgId) {
      return apiBadRequest('Organization ID обязателен для создания типа автомобиля');
    }

    // Validate input
    const validation = createVehicleTypeSchema.safeParse({
      ...body,
      organization_id: finalOrgId,
    });

    if (!validation.success) {
      return apiBadRequest(
        validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      );
    }

    const validatedData = validation.data;

    // Check for duplicate name in the same organization
    const { data: existing } = await supabase
      .from('vehicle_types')
      .select('id')
      .eq('organization_id', finalOrgId)
      .ilike('name', validatedData.name)
      .single();

    if (existing) {
      return apiBadRequest(`Тип автомобиля "${validatedData.name}" уже существует в этой организации`);
    }

    // Insert new vehicle type
    const { data: vehicleType, error } = await supabase
      .from('vehicle_types')
      .insert(validatedData)
      .select()
      .single();

    if (error) {
      return apiErrorFromUnknown(error, {
        context: 'creating vehicle type',
        orgId: finalOrgId,
        name: validatedData.name,
      });
    }

    return apiCreated(vehicleType);
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/vehicle-types' });
  }
}
