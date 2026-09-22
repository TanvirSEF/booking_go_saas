'use server';

import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { ExchangeRate } from '@/models/ExchangeRate';
import {
  getAllCurrencies,
  getAllExchangeRates,
  setExchangeRate,
  convertCurrency,
  formatCurrency,
  getBusinessCurrencyConfig,
  clearExchangeRateCache,
} from '@/lib/currency-engine';
import type {
  CurrencyDefinition,
  ExchangeRateDTO,
  CurrencyFormatOptions,
  BusinessCurrencyConfig,
  ConvertCurrencyResult,
} from '@/types/currency';

async function resolveAuthUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized. Please log in.');
  }

  await connectToDatabase();
  const user = await User.findById(session.user.id).lean();
  if (!user) {
    throw new Error('User account not found.');
  }

  return user;
}

/**
 * Retrieves the full ISO 4217 currency list.
 */
export async function getCurrenciesAction(): Promise<{
  success: boolean;
  data?: CurrencyDefinition[];
  error?: string;
}> {
  try {
    const list = getAllCurrencies();
    return { success: true, data: list };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve currencies.';
    return { success: false, error: message };
  }
}

/**
 * Super Admin action to query all stored exchange rates.
 */
export async function getExchangeRatesAction(): Promise<{
  success: boolean;
  data?: ExchangeRateDTO[];
  error?: string;
}> {
  try {
    const user = await resolveAuthUser();
    if (user.role !== 'super admin') {
      return { success: false, error: 'Forbidden. Super Admin privileges required.' };
    }

    const rates = await getAllExchangeRates();
    return { success: true, data: rates };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve exchange rates.';
    return { success: false, error: message };
  }
}

/**
 * Super Admin action to create or update an exchange rate.
 */
export async function updateExchangeRateAction(input: {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
}): Promise<{
  success: boolean;
  data?: ExchangeRateDTO;
  error?: string;
}> {
  try {
    const user = await resolveAuthUser();
    if (user.role !== 'super admin') {
      return { success: false, error: 'Forbidden. Super Admin privileges required.' };
    }

    const doc = await setExchangeRate(
      input.baseCurrency,
      input.targetCurrency,
      input.rate,
      user._id
    );

    return {
      success: true,
      data: {
        id: String(doc._id),
        baseCurrency: doc.baseCurrency,
        targetCurrency: doc.targetCurrency,
        rate: doc.rate,
        isManual: doc.isManual,
        updatedAt: doc.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update exchange rate.';
    return { success: false, error: message };
  }
}

/**
 * Super Admin action to bulk update exchange rates.
 */
export async function bulkUpdateExchangeRatesAction(
  rates: Array<{ baseCurrency: string; targetCurrency: string; rate: number }>
): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const user = await resolveAuthUser();
    if (user.role !== 'super admin') {
      return { success: false, error: 'Forbidden. Super Admin privileges required.' };
    }

    if (!Array.isArray(rates) || rates.length === 0) {
      return { success: false, error: 'Rates array must not be empty.' };
    }

    let count = 0;
    for (const r of rates) {
      await setExchangeRate(r.baseCurrency, r.targetCurrency, r.rate, user._id);
      count++;
    }

    return { success: true, count };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to bulk update exchange rates.';
    return { success: false, error: message };
  }
}

/**
 * Super Admin action to delete an exchange rate.
 */
export async function deleteExchangeRateAction(rateId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await resolveAuthUser();
    if (user.role !== 'super admin') {
      return { success: false, error: 'Forbidden. Super Admin privileges required.' };
    }

    await connectToDatabase();
    await ExchangeRate.findByIdAndDelete(rateId);
    clearExchangeRateCache();

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete exchange rate.';
    return { success: false, error: message };
  }
}

/**
 * Public/authenticated utility to convert a currency amount.
 */
export async function convertCurrencyAction(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<{
  success: boolean;
  data?: ConvertCurrencyResult;
  error?: string;
}> {
  try {
    const result = await convertCurrency(amount, fromCurrency, toCurrency);
    const formattedOriginal = formatCurrency(amount, { currency: fromCurrency });
    const formattedConverted = formatCurrency(result.convertedAmount, { currency: toCurrency });

    return {
      success: true,
      data: {
        originalAmount: amount,
        fromCurrency,
        toCurrency,
        convertedAmount: result.convertedAmount,
        rate: result.rate,
        formattedOriginal,
        formattedConverted,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to convert currency.';
    return { success: false, error: message };
  }
}

/**
 * Formats a currency value with preview options.
 */
export async function formatCurrencyAction(
  amount: number,
  options?: CurrencyFormatOptions
): Promise<{
  success: boolean;
  data?: string;
  error?: string;
}> {
  try {
    const formatted = formatCurrency(amount, options);
    return { success: true, data: formatted };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to format currency.';
    return { success: false, error: message };
  }
}

/**
 * Retrieves currency settings for a specific tenant business.
 */
export async function getBusinessCurrencyConfigAction(
  businessId: string
): Promise<{
  success: boolean;
  data?: BusinessCurrencyConfig;
  error?: string;
}> {
  try {
    const config = await getBusinessCurrencyConfig(businessId);
    return { success: true, data: config };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve business currency configuration.';
    return { success: false, error: message };
  }
}

/**
 * Updates currency configuration for a tenant business.
 */
export async function updateBusinessCurrencyConfigAction(
  businessId: string,
  config: Partial<BusinessCurrencyConfig>
): Promise<{
  success: boolean;
  data?: BusinessCurrencyConfig;
  error?: string;
}> {
  try {
    const user = await resolveAuthUser();

    await connectToDatabase();
    const business = await Business.findById(businessId);
    if (!business) {
      return { success: false, error: 'Business not found.' };
    }

    // Tenant authorization check
    if (user.role !== 'super admin' && String(business.companyId) !== String(user._id)) {
      return { success: false, error: 'Forbidden. You do not own this business.' };
    }

    // Apply currency code and symbol
    if (config.currency) {
      business.currency = config.currency.toUpperCase().trim();
    }
    if (config.currencySymbol !== undefined) {
      business.currencySymbol = config.currencySymbol;
    }

    // Merge into business.settings
    business.settings = business.settings || {};
    if (config.symbolPosition) {
      business.settings.site_currency_symbol_position = config.symbolPosition;
    }
    if (config.symbolNameOrCode) {
      business.settings.site_currency_symbol_name = config.symbolNameOrCode;
    }
    if (config.withSpace !== undefined) {
      business.settings.currency_space = config.withSpace ? 'withspace' : 'withoutspace';
    }
    if (config.decimalDigits !== undefined) {
      business.settings.currency_format = String(config.decimalDigits);
    }
    if (config.decimalSeparator) {
      business.settings.decimal_separator = config.decimalSeparator;
    }
    if (config.thousandSeparator !== undefined) {
      business.settings.thousand_separator =
        config.thousandSeparator === '.'
          ? 'dot'
          : config.thousandSeparator === ' '
            ? 'space'
            : config.thousandSeparator === ''
              ? 'none'
              : ',';
    }

    business.markModified('settings');
    await business.save();

    const updatedConfig = await getBusinessCurrencyConfig(business._id);
    return { success: true, data: updatedConfig };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update business currency configuration.';
    return { success: false, error: message };
  }
}
