/**
 * Fuel Limits Utilities
 * Функции для проверки превышения лимитов расхода топлива
 */

import { createServerClient } from '@/lib/supabase/server';

export interface FuelLimits {
  daily_limit: number;
  weekly_limit: number;
  monthly_limit: number;
}

export interface FuelUsage {
  daily: number;
  weekly: number;
  monthly: number;
}

export interface LimitCheckResult {
  exceeded: boolean;
  warnings: string[];
  usage: FuelUsage;
  limits: FuelLimits;
}

/**
 * Получить лимиты для организации
 */
export async function getFuelLimits(organizationId: string): Promise<FuelLimits | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('fuel_limits')
    .select('daily_limit, weekly_limit, monthly_limit')
    .eq('organization_id', organizationId)
    .single();

  if (error || !data) {
    // Возвращаем дефолтные лимиты если нет в базе
    return {
      daily_limit: 400,
      weekly_limit: 800,
      monthly_limit: 1800,
    };
  }

  return {
    daily_limit: Number(data.daily_limit),
    weekly_limit: Number(data.weekly_limit),
    monthly_limit: Number(data.monthly_limit),
  };
}

/**
 * Рассчитать текущий расход топлива за период
 */
export async function calculateFuelUsage(organizationId: string): Promise<FuelUsage> {
  const supabase = await createServerClient();

  const now = new Date();

  // Начало текущего дня (00:00:00)
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Начало текущей недели (понедельник 00:00:00)
  const startOfWeek = new Date(now);
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Воскресенье = 0, нужно вернуться к понедельнику
  startOfWeek.setDate(now.getDate() - daysToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  // Начало текущего месяца (1-е число 00:00:00)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Запрос расходов за день
  const { data: dailyExpenses } = await supabase
    .from('car_expenses')
    .select('amount')
    .eq('organization_id', organizationId)
    .eq('category', 'fuel')
    .gte('date', startOfDay.toISOString())
    .lte('date', now.toISOString());

  // Запрос расходов за неделю
  const { data: weeklyExpenses } = await supabase
    .from('car_expenses')
    .select('amount')
    .eq('organization_id', organizationId)
    .eq('category', 'fuel')
    .gte('date', startOfWeek.toISOString())
    .lte('date', now.toISOString());

  // Запрос расходов за месяц
  const { data: monthlyExpenses } = await supabase
    .from('car_expenses')
    .select('amount')
    .eq('organization_id', organizationId)
    .eq('category', 'fuel')
    .gte('date', startOfMonth.toISOString())
    .lte('date', now.toISOString());

  const sumExpenses = (expenses: { amount: number }[] | null) =>
    expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

  return {
    daily: sumExpenses(dailyExpenses),
    weekly: sumExpenses(weeklyExpenses),
    monthly: sumExpenses(monthlyExpenses),
  };
}

/**
 * Проверить превышение лимитов с учетом новой суммы
 */
export async function checkFuelLimits(
  organizationId: string,
  newAmount: number
): Promise<LimitCheckResult> {
  const limits = await getFuelLimits(organizationId);
  const usage = await calculateFuelUsage(organizationId);

  if (!limits) {
    return {
      exceeded: false,
      warnings: [],
      usage,
      limits: { daily_limit: 400, weekly_limit: 800, monthly_limit: 1800 },
    };
  }

  const warnings: string[] = [];
  let exceeded = false;

  // Проверка дневного лимита
  const newDailyTotal = usage.daily + newAmount;
  if (newDailyTotal > limits.daily_limit) {
    exceeded = true;
    warnings.push(
      `⚠️ Превышен дневной лимит! Текущий расход: ${newDailyTotal.toFixed(2)}, лимит: ${limits.daily_limit}`
    );
  }

  // Проверка недельного лимита
  const newWeeklyTotal = usage.weekly + newAmount;
  if (newWeeklyTotal > limits.weekly_limit) {
    exceeded = true;
    warnings.push(
      `⚠️ Превышен недельный лимит! Текущий расход: ${newWeeklyTotal.toFixed(2)}, лимит: ${limits.weekly_limit}`
    );
  }

  // Проверка месячного лимита
  const newMonthlyTotal = usage.monthly + newAmount;
  if (newMonthlyTotal > limits.monthly_limit) {
    exceeded = true;
    warnings.push(
      `⚠️ Превышен месячный лимит! Текущий расход: ${newMonthlyTotal.toFixed(2)}, лимит: ${limits.monthly_limit}`
    );
  }

  return {
    exceeded,
    warnings,
    usage,
    limits,
  };
}
