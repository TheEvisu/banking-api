import { Decimal } from 'decimal.js';

import { formatMoney, isPositive, toMoney } from './money';

describe('money helpers', () => {
  it('rounds half-up to 4 decimal places', () => {
    expect(formatMoney('1.00005')).toBe('1.0001');
    expect(formatMoney('1.00004')).toBe('1.0000');
  });

  it('preserves precision across additions', () => {
    const sum = toMoney('100.5').plus(toMoney('0.0001'));
    expect(formatMoney(sum)).toBe('100.5001');
  });

  it('detects positive amounts', () => {
    expect(isPositive(new Decimal(0))).toBe(false);
    expect(isPositive(new Decimal('0.0001'))).toBe(true);
    expect(isPositive(new Decimal('-1'))).toBe(false);
  });
});
