/**
 * Centralized Zod Schemas Export
 *
 * All validation schemas for the Vehicle Tracking System.
 * Schemas match database constraints from migration 007.
 */

// Vehicles
export {
  vehicleSchema,
  vehicleStatusSchema,
  createVehicleSchema,
  updateVehicleSchema,
  VEHICLE_STATUS_OPTIONS,
  type VehicleFormData,
} from './vehicles.schema';

// Penalties
export {
  penaltySchema,
  penaltyStatusSchema,
  createPenaltySchema,
  updatePenaltySchema,
  PENALTY_STATUS_OPTIONS,
  type PenaltyFormData,
} from './penalties.schema';

// Expenses
export {
  expenseSchema,
  expenseTypeSchema,
  createExpenseSchema,
  updateExpenseSchema,
  EXPENSE_TYPE_OPTIONS,
  type ExpenseFormData,
} from './expenses.schema';

// Teams
export {
  teamSchema,
  createTeamSchema,
  updateTeamSchema,
  type TeamFormData,
} from './teams.schema';

// Users
export {
  userSchema,
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  type UserFormData,
} from './users.schema';

// Car Expenses
export {
  carExpenseSchema,
  carExpenseCategorySchema,
  createCarExpenseSchema,
  updateCarExpenseSchema,
  CAR_EXPENSE_CATEGORY_OPTIONS,
  type CarExpenseFormData,
} from './car-expenses.schema';

// Maintenance
export {
  maintenanceSchema,
  maintenanceTypeSchema,
  createMaintenanceSchema,
  updateMaintenanceSchema,
  MAINTENANCE_TYPE_OPTIONS,
  type MaintenanceFormData,
} from './maintenance.schema';
