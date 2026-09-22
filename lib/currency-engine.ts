import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { Business } from '@/models/Business';
import { ExchangeRate, type IExchangeRateDocument } from '@/models/ExchangeRate';
import { getSystemSetting } from '@/lib/system-settings';
import type {
  CurrencyDefinition,
  CurrencyFormatOptions,
  BusinessCurrencyConfig,
  ExchangeRateDTO,
} from '@/types/currency';

// ---------------------------------------------------------------------------
// 1. ISO 4217 Currency Registry
// ---------------------------------------------------------------------------
export const ISO_CURRENCIES: Record<string, CurrencyDefinition> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', symbolPosition: 'pre', decimalDigits: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', symbolPosition: 'post', decimalDigits: 2, thousandsSeparator: '.', decimalSeparator: ',' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', symbolPosition: 'pre', decimalDigits: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', symbolPosition: 'pre', decimalDigits: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', symbolPosition: 'pre', decimalDigits: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', symbolPosition: 'pre', decimalDigits: 0, thousandsSeparator: ',', decimalSeparator: '.' },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', symbolPosition: 'pre', decimalDigits: 2, thousandsSeparator: '\'', decimalSeparator: '.' },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', symbolPosition: 'pre', decimalDigits: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', symbolPosition: 'pre', decimalDigits: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  BDT: { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', symbolPosition: 'pre', decimalDigits: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', symbolPosition: 'pre', decimalDigits: 2, thousandsSeparator: '.', decimalSeparator: ',' },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', symbolPosition: 'pre', decimalDigits: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  NZD: { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', symbolPosition: 'pre', decimalDigits: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  MXN: { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso', symbolPosition: 'pre', decimalDigits: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  HKD: { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', symbolPosition: 'pre', decimalDigits: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  SEK: { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', symbolPosition: 'post', decimalDigits: 2, thousandsSeparator: ' ', decimalSeparator: ',' },
  NOK: { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', symbolPosition: 'post', decimalDigits: 2, thousandsSeparator: ' ', decimalSeparator: ',' },
  DKK: { code: 'DKK', symbol: 'kr', name: 'Danish Krone', symbolPosition: 'post', decimalDigits: 2, thousandsSeparator: '.', decimalSeparator: ',' },
  PLN: { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', symbolPosition: 'post', decimalDigits: 2, thousandsSeparator: ' ', decimalSeparator: ',' },
  TRY: { code: 'TRY', symbol: '₺', name: 'Turkish Lira', symbolPosition: 'pre', decimalDigits: 2, thousandsSeparator: '.', decimalSeparator: ',' },
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand', symbolPosition: 'pre', decimalDigits: 2, thousandsSeparator: ' ', decimalSeparator: '.' },
  AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham', symbolPosition: 'pre', decimalDigits: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  SAR: { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', symbolPosition: 'pre', decimalDigits: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  KRW: { code: 'KRW', symbol: '₩', name: 'South Korean Won', symbolPosition: 'pre', decimalDigits: 0, thousandsSeparator: ',', decimalSeparator: '.' },
  THB: { code: 'THB', symbol: '฿', name: 'Thai Baht', symbolPosition: 'pre', decimalDigits: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  MYR: { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', symbolPosition: 'pre', decimalDigits: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  IDR: { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', symbolPosition: 'pre', decimalDigits: 0, thousandsSeparator: '.', decimalSeparator: ',' },
  PHP: { code: 'PHP', symbol: '₱', name: 'Philippine Peso', symbolPosition: 'pre', decimalDigits: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  PKR: { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee', symbolPosition: 'pre', decimalDigits: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  EGP: { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', symbolPosition: 'pre', decimalDigits: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  KWD: { code: 'KWD', symbol: 'KD', name: 'Kuwaiti Dinar', symbolPosition: 'pre', decimalDigits: 3, thousandsSeparator: ',', decimalSeparator: '.' },
  QAR: { code: 'QAR', symbol: 'QR', name: 'Qatari Riyal', symbolPosition: 'pre', decimalDigits: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', symbolPosition: 'pre', decimalDigits: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  VND: { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', symbolPosition: 'post', decimalDigits: 0, thousandsSeparator: '.', decimalSeparator: ',' },
  CLP: { code: 'CLP', symbol: 'CLP$', name: 'Chilean Peso', symbolPosition: 'pre', decimalDigits: 0, thousandsSeparator: '.', decimalSeparator: ',' },
  COP: { code: 'COP', symbol: 'COL$', name: 'Colombian Peso', symbolPosition: 'pre', decimalDigits: 0, thousandsSeparator: '.', decimalSeparator: ',' },
  CZK: { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', symbolPosition: 'post', decimalDigits: 2, thousandsSeparator: ' ', decimalSeparator: ',' },
  HUF: { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', symbolPosition: 'post', decimalDigits: 0, thousandsSeparator: ' ', decimalSeparator: ',' },
  ILS: { code: 'ILS', symbol: '₪', name: 'Israeli New Shekel', symbolPosition: 'pre', decimalDigits: 2, thousandsSeparator: ',', decimalSeparator: '.' },
  RON: { code: 'RON', symbol: 'lei', name: 'Romanian Leu', symbolPosition: 'post', decimalDigits: 2, thousandsSeparator: '.', decimalSeparator: ',' },
};

/**
 * Returns currency definition from ISO dictionary or constructs fallback.
 */
export function getCurrencyDefinition(code: string): CurrencyDefinition {
  const upper = (code || 'USD').toUpperCase().trim();
  if (ISO_CURRENCIES[upper]) {
    return ISO_CURRENCIES[upper];
  }
  return {
    code: upper,
    symbol: upper,
    name: upper,
    symbolPosition: 'pre',
    decimalDigits: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
  };
}

/**
 * Returns full list of supported currencies.
 */
export function getAllCurrencies(): CurrencyDefinition[] {
  return Object.values(ISO_CURRENCIES);
}

// ---------------------------------------------------------------------------
// 2. Dynamic Currency Formatter Engine
// ---------------------------------------------------------------------------
/**
 * Formats a numeric price into a localized currency string.
 * Supports granular configuration:
 * - Symbol vs Code (e.g. '$' vs 'USD')
 * - Prefix vs Postfix position (e.g. '$10.00' vs '10.00 €')
 * - Spacing ('$ 10.00' vs '$10.00')
 * - Custom decimal separator ('.' or ',')
 * - Custom thousand separator (',', '.', ' ', '')
 * - Decimal precision (0 to 4)
 * - Negative value handling ('-$10.00' or '-10.00 €')
 */
export function formatCurrency(
  amount: number,
  options: CurrencyFormatOptions = {}
): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    amount = 0;
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const currencyCode = (options.currency || 'USD').toUpperCase().trim();
  const def = getCurrencyDefinition(currencyCode);

  const symbol = options.symbol !== undefined ? options.symbol : def.symbol;
  const useCode = options.symbolNameOrCode === 'code';
  const displayIdentifier = useCode ? currencyCode : symbol;

  const symbolPosition = options.symbolPosition || def.symbolPosition;
  const withSpace = options.withSpace !== undefined ? options.withSpace : (symbolPosition === 'post' || useCode);

  const decimals = options.decimals !== undefined ? Math.max(0, options.decimals) : def.decimalDigits;
  const decimalSep = options.decimalSeparator !== undefined ? options.decimalSeparator : def.decimalSeparator;
  const thousandSep = options.thousandSeparator !== undefined ? options.thousandSeparator : def.thousandsSeparator;

  // Format number with precision
  const fixed = absAmount.toFixed(decimals);
  const parts = fixed.split('.');
  let integerPart = parts[0];
  const fractionalPart = parts[1] || '';

  // Apply thousand separators
  if (thousandSep) {
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);
  }

  // Combine number
  let formattedNumber = integerPart;
  if (decimals > 0) {
    formattedNumber = `${integerPart}${decimalSep}${fractionalPart}`;
  }

  // Assemble with symbol
  const space = withSpace ? ' ' : '';
  let result = '';

  if (symbolPosition === 'pre') {
    result = `${displayIdentifier}${space}${formattedNumber}`;
  } else {
    result = `${formattedNumber}${space}${displayIdentifier}`;
  }

  if (isNegative) {
    result = `-${result}`;
  }

  return result;
}

// ---------------------------------------------------------------------------
// 3. Business Context Formatter
// ---------------------------------------------------------------------------
/**
 * Resolves full currency formatting configuration for a specific tenant business.
 */
export async function getBusinessCurrencyConfig(
  businessId: string | Types.ObjectId
): Promise<BusinessCurrencyConfig> {
  await connectToDatabase();

  const business = await Business.findById(businessId).lean();
  if (!business) {
    return {
      currency: 'USD',
      currencySymbol: '$',
      symbolPosition: 'pre',
      symbolNameOrCode: 'symbol',
      withSpace: false,
      decimalDigits: 2,
      decimalSeparator: '.',
      thousandSeparator: ',',
    };
  }

  const settings = business.settings || {};
  const currencyCode = (business.currency || 'USD').toUpperCase().trim();
  const def = getCurrencyDefinition(currencyCode);

  const rawPosition = settings.site_currency_symbol_position || settings.currency_symbol_position;
  const symbolPosition: 'pre' | 'post' =
    rawPosition === 'post' ? 'post' : rawPosition === 'pre' ? 'pre' : def.symbolPosition;

  const rawNameType = settings.site_currency_symbol_name || settings.currency_symbol_name;
  const symbolNameOrCode: 'symbol' | 'code' =
    rawNameType === 'code' || rawNameType === 'currency' ? 'code' : 'symbol';

  const rawSpace = settings.currency_space;
  const withSpace =
    rawSpace === 'withspace'
      ? true
      : rawSpace === 'withoutspace'
        ? false
        : (symbolPosition === 'post' || symbolNameOrCode === 'code');

  const rawDigits = settings.currency_format || settings.decimal_digits;
  const decimalDigits = rawDigits !== undefined && rawDigits !== '' ? parseInt(rawDigits, 10) : def.decimalDigits;

  const rawDecSep = settings.decimal_separator || settings.float_number;
  const decimalSeparator: '.' | ',' = rawDecSep === 'comma' || rawDecSep === ',' ? ',' : '.';

  const rawThousandSep = settings.thousand_separator;
  const thousandSeparator: ',' | '.' | ' ' | '' =
    rawThousandSep === 'dot' || rawThousandSep === '.'
      ? '.'
      : rawThousandSep === 'space' || rawThousandSep === ' '
        ? ' '
        : rawThousandSep === 'none'
          ? ''
          : ',';

  return {
    currency: currencyCode,
    currencySymbol: business.currencySymbol || def.symbol,
    symbolPosition,
    symbolNameOrCode,
    withSpace,
    decimalDigits: isNaN(decimalDigits) ? 2 : Math.max(0, decimalDigits),
    decimalSeparator,
    thousandSeparator,
  };
}

/**
 * Formats a price using tenant business currency and formatting preferences.
 */
export async function formatBusinessPrice(
  amount: number,
  businessId: string | Types.ObjectId
): Promise<string> {
  const config = await getBusinessCurrencyConfig(businessId);
  return formatCurrency(amount, {
    currency: config.currency,
    symbol: config.currencySymbol,
    symbolPosition: config.symbolPosition,
    symbolNameOrCode: config.symbolNameOrCode,
    withSpace: config.withSpace,
    decimals: config.decimalDigits,
    decimalSeparator: config.decimalSeparator,
    thousandSeparator: config.thousandSeparator,
  });
}

// ---------------------------------------------------------------------------
// 4. Platform (Super Admin) Context Formatter
// ---------------------------------------------------------------------------
/**
 * Formats a price using platform-level Super Admin settings (e.g., for SaaS plans, invoices).
 */
export async function formatPlatformPrice(amount: number): Promise<string> {
  await connectToDatabase();

  const [rawCurrency, rawSymbol, rawPosition, rawDigits] = await Promise.all([
    getSystemSetting('default_currency', 'USD'),
    getSystemSetting('default_currency_symbol', '$'),
    getSystemSetting('currency_symbol_position', 'pre'),
    getSystemSetting('currency_format', '2'),
  ]);

  const currency = (rawCurrency || 'USD').toUpperCase().trim();
  const def = getCurrencyDefinition(currency);

  const symbol = rawSymbol || def.symbol;
  const symbolPosition: 'pre' | 'post' =
    rawPosition === 'post' ? 'post' : rawPosition === 'pre' ? 'pre' : def.symbolPosition;

  const decimals = rawDigits !== undefined && rawDigits !== '' ? parseInt(rawDigits, 10) : def.decimalDigits;

  return formatCurrency(amount, {
    currency,
    symbol,
    symbolPosition,
    decimals: isNaN(decimals) ? 2 : Math.max(0, decimals),
  });
}

// ---------------------------------------------------------------------------
// 5. Exchange Rate & Multi-Currency Conversion Engine
// ---------------------------------------------------------------------------
// In-memory rate cache: key: `FROM_TO` -> { rate, expiresAt }
const RATE_CACHE = new Map<string, { rate: number; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function clearExchangeRateCache(): void {
  RATE_CACHE.clear();
}

/**
 * Resolves direct exchange rate from MongoDB Atlas or memory cache.
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  const from = fromCurrency.toUpperCase().trim();
  const to = toCurrency.toUpperCase().trim();

  if (from === to) {
    return 1;
  }

  const cacheKey = `${from}_${to}`;
  const cached = RATE_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.rate;
  }

  await connectToDatabase();

  // 1. Direct rate
  const direct = await ExchangeRate.findOne({
    baseCurrency: from,
    targetCurrency: to,
  }).lean();

  if (direct && typeof direct.rate === 'number') {
    RATE_CACHE.set(cacheKey, { rate: direct.rate, expiresAt: Date.now() + CACHE_TTL_MS });
    return direct.rate;
  }

  // 2. Inverse direct rate
  const inverse = await ExchangeRate.findOne({
    baseCurrency: to,
    targetCurrency: from,
  }).lean();

  if (inverse && typeof inverse.rate === 'number' && inverse.rate > 0) {
    const rate = 1 / inverse.rate;
    RATE_CACHE.set(cacheKey, { rate, expiresAt: Date.now() + CACHE_TTL_MS });
    return rate;
  }

  // 3. Triangulation via base currency 'USD'
  if (from !== 'USD' && to !== 'USD') {
    const [rateFromUSD, rateToUSD] = await Promise.all([
      ExchangeRate.findOne({ baseCurrency: 'USD', targetCurrency: from }).lean(),
      ExchangeRate.findOne({ baseCurrency: 'USD', targetCurrency: to }).lean(),
    ]);

    if (rateFromUSD && rateToUSD && rateFromUSD.rate > 0) {
      const triangulated = rateToUSD.rate / rateFromUSD.rate;
      RATE_CACHE.set(cacheKey, { rate: triangulated, expiresAt: Date.now() + CACHE_TTL_MS });
      return triangulated;
    }
  }

  return null;
}

/**
 * Converts a monetary amount from one currency to another using exchange rates.
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<{ convertedAmount: number; rate: number }> {
  if (typeof amount !== 'number' || isNaN(amount)) {
    amount = 0;
  }

  const from = fromCurrency.toUpperCase().trim();
  const to = toCurrency.toUpperCase().trim();

  if (from === to) {
    return { convertedAmount: amount, rate: 1 };
  }

  const rate = await getExchangeRate(from, to);
  if (rate === null) {
    throw new Error(`Exchange rate not configured between ${from} and ${to}.`);
  }

  const toDef = getCurrencyDefinition(to);
  const factor = Math.pow(10, toDef.decimalDigits);
  const convertedAmount = Math.round(amount * rate * factor) / factor;

  return { convertedAmount, rate };
}

/**
 * Inserts or updates an exchange rate record in MongoDB Atlas.
 */
export async function setExchangeRate(
  baseCurrency: string,
  targetCurrency: string,
  rate: number,
  userId?: Types.ObjectId | string
): Promise<IExchangeRateDocument> {
  const base = baseCurrency.toUpperCase().trim();
  const target = targetCurrency.toUpperCase().trim();

  if (base === target) {
    throw new Error('Base currency and target currency cannot be identical.');
  }

  if (typeof rate !== 'number' || rate <= 0 || isNaN(rate)) {
    throw new Error('Exchange rate must be a positive number.');
  }

  await connectToDatabase();

  const doc = await ExchangeRate.findOneAndUpdate(
    { baseCurrency: base, targetCurrency: target },
    {
      $set: {
        rate,
        isManual: true,
        updatedBy: userId ? new Types.ObjectId(userId) : null,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Invalidate cache
  clearExchangeRateCache();

  return doc;
}

/**
 * Retrieves all stored exchange rates mapped to DTO.
 */
export async function getAllExchangeRates(): Promise<ExchangeRateDTO[]> {
  await connectToDatabase();

  const rates = await ExchangeRate.find()
    .sort({ baseCurrency: 1, targetCurrency: 1 })
    .lean();

  return rates.map((r) => ({
    id: String(r._id),
    baseCurrency: r.baseCurrency,
    targetCurrency: r.targetCurrency,
    rate: r.rate,
    isManual: r.isManual,
    updatedAt: r.updatedAt ? r.updatedAt.toISOString() : new Date().toISOString(),
  }));
}
