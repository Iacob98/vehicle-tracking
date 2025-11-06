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
 * Get all vehicle types (universal, not organization-specific)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check authentication
    const authError = checkAuthentication(user);
    if (authError) return authError;

    // Get all vehicle types (they are universal)
    const { data: vehicleTypes, error } = await supabase
      .from('vehicle_types')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return apiErrorFromUnknown(error, {
        context: 'fetching vehicle types',
      });
    }

    return apiSuccess({ vehicleTypes: vehicleTypes || [] });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'GET /api/vehicle-types' });
  }
}

/**
 * POST /api/vehicle-types
 * Create a new vehicle type (universal, not organization-specific)
 * Only admin and manager can create vehicle types
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check authentication
    const authError = checkAuthentication(user);
    if (authError) return authError;

    // Check permissions (only admin and manager)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (!Permissions.canManageVehicles(userRole)) {
      return apiForbidden('У вас нет прав на создание типов автомобилей');
    }

    // Get JSON body
    const body = await request.json();

    // Validate input
    const validation = createVehicleTypeSchema.safeParse(body);

    if (!validation.success) {
      return apiBadRequest(
        validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      );
    }

    const validatedData = validation.data;

    // Check for duplicate name (universal check)
    const { data: existing } = await supabase
      .from('vehicle_types')
      .select('id')
      .ilike('name', validatedData.name)
      .single();

    if (existing) {
      return apiBadRequest(`Тип автомобиля "${validatedData.name}" уже существует`);
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
        name: validatedData.name,
      });
    }

    return apiCreated(vehicleType);
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/vehicle-types' });
  }
}
