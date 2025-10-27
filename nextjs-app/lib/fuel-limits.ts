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
 * Получить лимиты для организации или заправочной карты
 * @param organizationId - ID организации
 * @param fuelCardId - Номер заправочной карты (опционально)
 */
export async function getFuelLimits(
  organizationId: string,
  fuelCardId?: string | null
): Promise<FuelLimits | null> {
  const supabase = await createServerClient();

  // Если указана карта, ищем лимит для неё
  if (fuelCardId) {
    const { data: cardLimit } = await supabase
      .from('fuel_limits')
      .select('daily_limit, weekly_limit, monthly_limit')
      .eq('organization_id', organizationId)
      .eq('fuel_card_id', fuelCardId)
      .single();

    if (cardLimit) {
      return {
        daily_limit: Number(cardLimit.daily_limit),
        weekly_limit: Number(cardLimit.weekly_limit),
        monthly_limit: Number(cardLimit.monthly_limit),
      };
    }
  }

  // Если лимит для карты не найден, ищем общий лимит организации
  const { data, error } = await supabase
    .from('fuel_limits')
    .select('daily_limit, weekly_limit, monthly_limit')
    .eq('organization_id', organizationId)
    .is('fuel_card_id', null)
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
 * @param organizationId - ID организации
 * @param fuelCardId - Номер заправочной карты (опционально, для фильтрации по карте)
 */
export async function calculateFuelUsage(
  organizationId: string,
  fuelCardId?: string | null
): Promise<FuelUsage> {
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

  // Базовый запрос
  const buildQuery = (startDate: Date) => {
    let query = supabase
      .from('car_expenses')
      .select('amount, fuel_card_id')
      .eq('organization_id', organizationId)
      .eq('category', 'fuel')
      .gte('date', startDate.toISOString())
      .lte('date', now.toISOString());

    // Если указана карта, фильтруем по ней
    if (fuelCardId) {
      query = query.eq('fuel_card_id', fuelCardId);
    }

    return query;
  };

  // Запрос расходов за день
  const { data: dailyExpenses } = await buildQuery(startOfDay);

  // Запрос расходов за неделю
  const { data: weeklyExpenses } = await buildQuery(startOfWeek);

  // Запрос расходов за месяц
  const { data: monthlyExpenses } = await buildQuery(startOfMonth);

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
 * @param organizationId - ID организации
 * @param newAmount - Новая сумма расхода
 * @param fuelCardId - Номер заправочной карты (опционально)
 */
export async function checkFuelLimits(
  organizationId: string,
  newAmount: number,
  fuelCardId?: string | null
): Promise<LimitCheckResult> {
  const limits = await getFuelLimits(organizationId, fuelCardId);
  const usage = await calculateFuelUsage(organizationId, fuelCardId);

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

  const cardInfo = fuelCardId ? ` (карта ${fuelCardId})` : '';

  // Проверка дневного лимита
  const newDailyTotal = usage.daily + newAmount;
  if (newDailyTotal > limits.daily_limit) {
    exceeded = true;
    warnings.push(
      `⚠️ Превышен дневной лимит${cardInfo}! Текущий расход: ${newDailyTotal.toFixed(2)}, лимит: ${limits.daily_limit}`
    );
  }

  // Проверка недельного лимита
  const newWeeklyTotal = usage.weekly + newAmount;
  if (newWeeklyTotal > limits.weekly_limit) {
    exceeded = true;
    warnings.push(
      `⚠️ Превышен недельный лимит${cardInfo}! Текущий расход: ${newWeeklyTotal.toFixed(2)}, лимит: ${limits.weekly_limit}`
    );
  }

  // Проверка месячного лимита
  const newMonthlyTotal = usage.monthly + newAmount;
  if (newMonthlyTotal > limits.monthly_limit) {
    exceeded = true;
    warnings.push(
      `⚠️ Превышен месячный лимит${cardInfo}! Текущий расход: ${newMonthlyTotal.toFixed(2)}, лимит: ${limits.monthly_limit}`
    );
  }

  return {
    exceeded,
    warnings,
    usage,
    limits,
  };
}
