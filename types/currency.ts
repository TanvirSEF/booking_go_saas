export interface CurrencyDefinition {
  code: string;
  symbol: string;
  name: string;
  symbolPosition: 'pre' | 'post';
  decimalDigits: number;
  thousandsSeparator: string;
  decimalSeparator: string;
}

export interface CurrencyFormatOptions {
  currency?: string;
  symbol?: string;
  symbolPosition?: 'pre' | 'post';
  symbolNameOrCode?: 'symbol' | 'code';
  withSpace?: boolean;
  decimals?: number;
  decimalSeparator?: '.' | ',';
  thousandSeparator?: ',' | '.' | ' ' | '';
}

export interface BusinessCurrencyConfig {
  currency: string;
  currencySymbol: string;
  symbolPosition: 'pre' | 'post';
  symbolNameOrCode: 'symbol' | 'code';
  withSpace: boolean;
  decimalDigits: number;
  decimalSeparator: '.' | ',';
  thousandSeparator: ',' | '.' | ' ' | '';
}

export interface ExchangeRateDTO {
  id: string;
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  isManual: boolean;
  updatedAt: string;
}

export interface ConvertCurrencyResult {
  originalAmount: number;
  fromCurrency: string;
  toCurrency: string;
  convertedAmount: number;
  rate: number;
  formattedOriginal: string;
  formattedConverted: string;
}
