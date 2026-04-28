import { Decimal } from 'decimal.js';

export const MONEY_SCALE = 4;
export const MAX_AMOUNT = new Decimal('1000000');

Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

export const toMoney = (value: string | number | Decimal): Decimal => {
  return new Decimal(value).toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_UP);
};

export const formatMoney = (value: string | number | Decimal): string => {
  return toMoney(value).toFixed(MONEY_SCALE);
};

export const isPositive = (value: Decimal): boolean => value.greaterThan(0);
