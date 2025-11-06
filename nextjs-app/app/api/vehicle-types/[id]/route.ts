import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiBadRequest,
  apiForbidden,
  apiNotFound,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOwnerOrOrganizationId,
} from '@/lib/api-response';
import { Permissions, type UserRole } from '@/lib/types/roles';
import { updateVehicleTypeSchema } from '@/lib/schemas/vehicle-types.schema';

/**
 * GET /api/vehicle-types/:id
 * Get a single vehicle type by ID
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check authentication
    const authError = checkAuthentication(user);
    if (authError) return authError;

    const { id } = params;

    // Fetch vehicle type
    const { data: vehicleType, error } = await supabase
      .from('vehicle_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !vehicleType) {
      return apiNotFound('Тип автомобиля не найден');
    }

    return apiSuccess(vehicleType);
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'GET /api/vehicle-types/:id' });
  }
}

/**
 * PUT /api/vehicle-types/:id
 * Update a vehicle type
 * Only admin and manager can update
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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
      return apiForbidden('У вас нет прав на изменение типов автомобилей');
    }

    const { id } = params;

    // Get existing vehicle type
    const { data: existing, error: fetchError } = await supabase
      .from('vehicle_types')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return apiNotFound('Тип автомобиля не найден');
    }

    // Get JSON body
    const body = await request.json();

    // Validate input
    const validation = updateVehicleTypeSchema.safeParse(body);

    if (!validation.success) {
      return apiBadRequest(
        validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      );
    }

    const validatedData = validation.data;

    // If name is being changed, check for duplicates (universal check)
    if (validatedData.name && validatedData.name !== existing.name) {
      const { data: duplicate } = await supabase
        .from('vehicle_types')
        .select('id')
        .ilike('name', validatedData.name)
        .neq('id', id)
        .single();

      if (duplicate) {
        return apiBadRequest(`Тип автомобиля "${validatedData.name}" уже существует`);
      }
    }

    // Update vehicle type
    const { data: vehicleType, error } = await supabase
      .from('vehicle_types')
      .update(validatedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return apiErrorFromUnknown(error, {
        context: 'updating vehicle type',
        vehicleTypeId: id,
      });
    }

    return apiSuccess(vehicleType);
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'PUT /api/vehicle-types/:id' });
  }
}

/**
 * DELETE /api/vehicle-types/:id
 * Delete a vehicle type
 * Only admin can delete
 * Cannot delete if vehicles are using this type
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check authentication
    const authError = checkAuthentication(user);
    if (authError) return authError;

    // Check organization_id with support for owner role
    const { orgId, isSuperAdmin, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    // Check permissions (only admin)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (!['admin', 'owner'].includes(userRole)) {
      return apiForbidden('У вас нет прав на удаление типов автомобилей');
    }

    const { id } = params;

    // Проверяем сколько автомобилей используют этот тип (для информации)
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id')
      .eq('vehicle_type_id', id);

    if (vehiclesError) {
      return apiErrorFromUnknown(vehiclesError, {
        context: 'checking vehicles using this type',
      });
    }

    const vehiclesCount = vehicles?.length || 0;

    // Delete vehicle type
    // Note: ON DELETE SET NULL constraint will automatically set vehicle_type_id to NULL
    // for all vehicles that were using this type
    const { error } = await supabase
      .from('vehicle_types')
      .delete()
      .eq('id', id);

    if (error) {
      return apiErrorFromUnknown(error, {
        context: 'deleting vehicle type',
        vehicleTypeId: id,
      });
    }

    const message = vehiclesCount > 0
      ? `Тип автомобиля успешно удален. У ${vehiclesCount} автомобилей тип был сброшен.`
      : 'Тип автомобиля успешно удален';

    return apiSuccess({ message, affectedVehicles: vehiclesCount });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'DELETE /api/vehicle-types/:id' });
  }
}
