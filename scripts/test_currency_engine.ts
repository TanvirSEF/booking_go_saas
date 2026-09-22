import { Types } from 'mongoose';
import { connectToDatabase } from '../lib/db';
import { User } from '../models/User';
import { Business } from '../models/Business';
import { ExchangeRate } from '../models/ExchangeRate';
import {
  ISO_CURRENCIES,
  getCurrencyDefinition,
  getAllCurrencies,
  formatCurrency,
  getBusinessCurrencyConfig,
  formatBusinessPrice,
  formatPlatformPrice,
  getExchangeRate,
  convertCurrency,
  setExchangeRate,
  getAllExchangeRates,
  clearExchangeRateCache,
} from '../lib/currency-engine';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  \x1b[32m✔\x1b[0m ${message}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✖\x1b[0m ${message}`);
    failed++;
  }
}

async function runCurrencySuite() {
  console.log('\n===============================================================');
  console.log(' Priority 28 [BGO-246]: Multi-Currency & Formatter Engine Test');
  console.log('===============================================================\n');

  await connectToDatabase();

  const testSuffix = Date.now().toString().slice(-6);

  // Fixture IDs
  const adminUserId = new Types.ObjectId();
  const companyUserId = new Types.ObjectId();
  const businessIdA = new Types.ObjectId();

  try {
    // -------------------------------------------------------------
    // TEST SECTION 1: ISO 4217 Currency Registry
    // -------------------------------------------------------------
    console.log('--- Test Section 1: ISO 4217 Currency Registry ---');

    const all = getAllCurrencies();
    assert(all.length >= 35, `Currency registry contains ${all.length} ISO currencies (>= 35)`);
    assert(Object.keys(ISO_CURRENCIES).length >= 35, 'ISO_CURRENCIES dictionary contains standard definitions');

    const usd = getCurrencyDefinition('USD');
    assert(usd.code === 'USD', 'USD code is USD');
    assert(usd.symbol === '$', 'USD symbol is $');
    assert(usd.decimalDigits === 2, 'USD has 2 decimal digits');
    assert(usd.symbolPosition === 'pre', 'USD standard position is pre');

    const eur = getCurrencyDefinition('EUR');
    assert(eur.code === 'EUR', 'EUR code is EUR');
    assert(eur.symbol === '€', 'EUR symbol is €');
    assert(eur.symbolPosition === 'post', 'EUR standard position is post');

    const jpy = getCurrencyDefinition('JPY');
    assert(jpy.code === 'JPY', 'JPY code is JPY');
    assert(jpy.symbol === '¥', 'JPY symbol is ¥');
    assert(jpy.decimalDigits === 0, 'JPY has 0 decimal digits');

    const bdt = getCurrencyDefinition('BDT');
    assert(bdt.code === 'BDT', 'BDT code is BDT');
    assert(bdt.symbol === '৳', 'BDT symbol is ৳');

    const inr = getCurrencyDefinition('INR');
    assert(inr.code === 'INR', 'INR code is INR');
    assert(inr.symbol === '₹', 'INR symbol is ₹');

    const kwd = getCurrencyDefinition('KWD');
    assert(kwd.decimalDigits === 3, 'KWD has 3 decimal digits');

    const fallback = getCurrencyDefinition('XYZ');
    assert(fallback.code === 'XYZ', 'Unknown currency fallback code is XYZ');
    assert(fallback.symbol === 'XYZ', 'Unknown currency fallback symbol is XYZ');

    // -------------------------------------------------------------
    // TEST SECTION 2: Formatting Mathematics & Options
    // -------------------------------------------------------------
    console.log('\n--- Test Section 2: Dynamic Currency Formatter Mathematics ---');

    // 1. Standard USD pre-symbol formatting
    const formattedUsd = formatCurrency(1234.56, { currency: 'USD' });
    assert(formattedUsd === '$1,234.56', `Standard USD formats as $1,234.56 (got: ${formattedUsd})`);

    // 2. Standard EUR post-symbol formatting with space
    const formattedEur = formatCurrency(1234.56, { currency: 'EUR' });
    assert(formattedEur === '1.234,56 €', `Standard EUR formats as 1.234,56 € (got: ${formattedEur})`);

    // 3. JPY zero-decimal formatting
    const formattedJpy = formatCurrency(1500, { currency: 'JPY' });
    assert(formattedJpy === '¥1,500', `JPY formats with zero decimals as ¥1,500 (got: ${formattedJpy})`);

    // 4. Position override: Force post on USD
    const usdPost = formatCurrency(50, { currency: 'USD', symbolPosition: 'post', withSpace: true });
    assert(usdPost === '50.00 $', `USD with forced post position formats as 50.00 $ (got: ${usdPost})`);

    // 5. Code vs Symbol: Display USD instead of $
    const usdCode = formatCurrency(99.9, { currency: 'USD', symbolNameOrCode: 'code' });
    assert(usdCode === 'USD 99.90', `USD with code display formats as USD 99.90 (got: ${usdCode})`);

    // 6. Custom decimal separator (comma) and thousand separator (dot)
    const customSep = formatCurrency(1000000.5, {
      symbol: '€',
      symbolPosition: 'post',
      thousandSeparator: '.',
      decimalSeparator: ',',
      decimals: 2,
    });
    assert(customSep === '1.000.000,50 €', `Custom separators format as 1.000.000,50 € (got: ${customSep})`);

    // 7. Space thousand separator (e.g. French/Swedish: 1 000,00 kr)
    const spaceSep = formatCurrency(250000, {
      currency: 'SEK',
      thousandSeparator: ' ',
      decimalSeparator: ',',
      decimals: 0,
    });
    assert(spaceSep === '250 000 kr', `Space thousand separator formats as 250 000 kr (got: ${spaceSep})`);

    // 8. Negative amounts
    const negUsd = formatCurrency(-42.5, { currency: 'USD' });
    assert(negUsd === '-$42.50', `Negative USD formats as -$42.50 (got: ${negUsd})`);

    const negEur = formatCurrency(-42.5, { currency: 'EUR' });
    assert(negEur === '-42,50 €', `Negative EUR formats as -42,50 € (got: ${negEur})`);

    // 9. Zero amounts
    const zeroUsd = formatCurrency(0, { currency: 'USD' });
    assert(zeroUsd === '$0.00', `Zero USD formats as $0.00 (got: ${zeroUsd})`);

    // 10. NaN / invalid amount fallback
    const nanAmount = formatCurrency(NaN, { currency: 'USD' });
    assert(nanAmount === '$0.00', `NaN amount safely formats as $0.00 (got: ${nanAmount})`);

    // -------------------------------------------------------------
    // TEST SECTION 3: Tenant Business Currency Configuration
    // -------------------------------------------------------------
    console.log('\n--- Test Section 3: Tenant Business Currency Resolution ---');

    // Create Tenant Company User & Business with custom currency settings in Atlas
    await User.create({
      _id: companyUserId,
      name: `Tenant Owner ${testSuffix}`,
      email: `tenant_${testSuffix}@example.com`,
      role: 'company',
      lang: 'en',
    });

    await Business.create({
      _id: businessIdA,
      companyId: companyUserId,
      name: `Berlin Aesthetics ${testSuffix}`,
      slug: `berlin-aesthetics-${testSuffix}`,
      currency: 'EUR',
      currencySymbol: '€',
      settings: {
        site_currency_symbol_position: 'post',
        site_currency_symbol_name: 'symbol',
        currency_space: 'withspace',
        currency_format: '2',
        decimal_separator: ',',
        thousand_separator: 'dot',
      },
    });

    const businessConfig = await getBusinessCurrencyConfig(businessIdA);
    assert(businessConfig.currency === 'EUR', 'Business currency resolved as EUR');
    assert(businessConfig.currencySymbol === '€', 'Business currencySymbol resolved as €');
    assert(businessConfig.symbolPosition === 'post', 'symbolPosition resolved as post');
    assert(businessConfig.withSpace === true, 'withSpace resolved as true');
    assert(businessConfig.decimalDigits === 2, 'decimalDigits resolved as 2');
    assert(businessConfig.decimalSeparator === ',', 'decimalSeparator resolved as comma');
    assert(businessConfig.thousandSeparator === '.', 'thousandSeparator resolved as dot');

    const businessPriceFormatted = await formatBusinessPrice(1450.75, businessIdA);
    assert(
      businessPriceFormatted === '1.450,75 €',
      `Business price formats according to tenant settings as 1.450,75 € (got: ${businessPriceFormatted})`
    );

    // -------------------------------------------------------------
    // TEST SECTION 4: Super Admin Platform Currency Fallback
    // -------------------------------------------------------------
    console.log('\n--- Test Section 4: Super Admin Platform Price Formatting ---');

    const platformFormatted = await formatPlatformPrice(29.99);
    assert(platformFormatted.includes('29.99'), `Platform price formats with correct decimals (got: ${platformFormatted})`);
    assert(platformFormatted.startsWith('$'), `Platform price uses default $ currency symbol (got: ${platformFormatted})`);

    // -------------------------------------------------------------
    // TEST SECTION 5: Exchange Rate Persistence & Triangulation
    // -------------------------------------------------------------
    console.log('\n--- Test Section 5: Exchange Rates & Multi-Currency Conversion ---');

    // Create Super Admin fixture
    await User.create({
      _id: adminUserId,
      name: `Super Admin ${testSuffix}`,
      email: `admin_${testSuffix}@example.com`,
      role: 'super admin',
      lang: 'en',
    });

    clearExchangeRateCache();

    // 1. Insert direct rates: USD -> EUR, USD -> GBP, USD -> JPY
    const rateUsdEur = await setExchangeRate('USD', 'EUR', 0.92, adminUserId);
    assert(rateUsdEur.rate === 0.92, 'USD -> EUR exchange rate saved in Atlas (0.92)');

    const rateUsdGbp = await setExchangeRate('USD', 'GBP', 0.78, adminUserId);
    assert(rateUsdGbp.rate === 0.78, 'USD -> GBP exchange rate saved in Atlas (0.78)');

    const rateUsdJpy = await setExchangeRate('USD', 'JPY', 155.0, adminUserId);
    assert(rateUsdJpy.rate === 155.0, 'USD -> JPY exchange rate saved in Atlas (155.0)');

    // 2. Query all rates
    const allRates = await getAllExchangeRates();
    assert(allRates.length >= 3, `Found ${allRates.length} exchange rates in Atlas`);

    // 3. Identity conversion (same currency)
    const identityResult = await convertCurrency(100, 'USD', 'USD');
    assert(identityResult.convertedAmount === 100, 'Identity conversion preserves amount ($100 -> $100)');
    assert(identityResult.rate === 1, 'Identity rate is 1.0');

    // 4. Direct conversion: USD -> EUR ($100 -> €92.00)
    const directResult = await convertCurrency(100, 'USD', 'EUR');
    assert(directResult.convertedAmount === 92, `Direct USD -> EUR converts $100 to €92.00 (got: ${directResult.convertedAmount})`);
    assert(directResult.rate === 0.92, 'Direct rate is 0.92');

    // 5. Inverted direct conversion: EUR -> USD (€92 -> $100.00)
    const inverseResult = await convertCurrency(92, 'EUR', 'USD');
    assert(
      Math.abs(inverseResult.convertedAmount - 100) < 0.01,
      `Inverse EUR -> USD converts €92 back to ~$100.00 (got: ${inverseResult.convertedAmount})`
    );

    // 6. Triangulated cross-rate conversion: EUR -> GBP
    // Rate = rate(USD -> GBP) / rate(USD -> EUR) = 0.78 / 0.92 ~= 0.847826
    const crossRate = await getExchangeRate('EUR', 'GBP');
    assert(crossRate !== null, 'Triangulated cross rate EUR -> GBP resolved');
    const expectedCross = 0.78 / 0.92;
    assert(
      Math.abs((crossRate || 0) - expectedCross) < 0.0001,
      `Triangulated cross rate calculated accurately (${crossRate} vs ${expectedCross.toFixed(6)})`
    );

    const eurToGbp = await convertCurrency(100, 'EUR', 'GBP');
    const expectedGbp = Math.round(100 * expectedCross * 100) / 100;
    assert(
      eurToGbp.convertedAmount === expectedGbp,
      `EUR 100 converts to GBP ${expectedGbp} via triangulation (got: ${eurToGbp.convertedAmount})`
    );

    // 7. Triangulation to zero-decimal currency: USD -> JPY ($10 -> ¥1,550)
    const usdToJpy = await convertCurrency(10, 'USD', 'JPY');
    assert(usdToJpy.convertedAmount === 1550, `USD 10 converts to JPY 1550 with integer rounding (got: ${usdToJpy.convertedAmount})`);

    // 8. Re-inserting / updating rate updates in-place (compound unique index test)
    await setExchangeRate('USD', 'EUR', 0.95, adminUserId);
    const updatedRate = await getExchangeRate('USD', 'EUR');
    assert(updatedRate === 0.95, 'Updated exchange rate immediately takes effect (0.95)');

    const countUsdEur = await ExchangeRate.countDocuments({ baseCurrency: 'USD', targetCurrency: 'EUR' });
    assert(countUsdEur === 1, 'Strictly 1 ExchangeRate document exists due to compound unique index');

    // 9. Error handling: unconfigured currency conversion throws clean error
    let unconfiguredErrorCaught = false;
    try {
      await convertCurrency(100, 'USD', 'UNKNOWN');
    } catch (e) {
      unconfiguredErrorCaught = true;
      assert(
        (e as Error).message.includes('Exchange rate not configured'),
        'Informative error thrown when rate is missing'
      );
    }
    assert(unconfiguredErrorCaught === true, 'Caught error for unconfigured currency');
  } finally {
    // -------------------------------------------------------------
    // CLEANUP FIXTURES
    // -------------------------------------------------------------
    console.log('\n--- Cleaning up Test Fixtures from Atlas ---');

    await Promise.all([
      User.deleteMany({ _id: { $in: [adminUserId, companyUserId] } }),
      Business.deleteMany({ _id: businessIdA }),
      ExchangeRate.deleteMany({
        $or: [
          { baseCurrency: 'USD', targetCurrency: { $in: ['EUR', 'GBP', 'JPY'] } },
          { baseCurrency: 'EUR', targetCurrency: { $in: ['USD', 'GBP'] } },
        ],
      }),
    ]);

    clearExchangeRateCache();
    console.log('Atlas cleanup finished.');
  }

  console.log('\n===============================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

void runCurrencySuite().then(() => {
  process.exit(0);
});
