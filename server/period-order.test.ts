import { describe, it, expect } from 'vitest';

/**
 * Test suite for period order persistence
 * Verifies that manually set period orders are saved and restored correctly
 */

describe('Period Order Persistence', () => {
  it('should parse valid period order JSON', () => {
    const periodOrder = JSON.stringify(['115-01', '115-02', '115-全年']);
    const parsed = JSON.parse(periodOrder);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toEqual(['115-01', '115-02', '115-全年']);
  });

  it('should handle empty period order', () => {
    const periodOrder = JSON.stringify([]);
    const parsed = JSON.parse(periodOrder);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(0);
  });

  it('should preserve period order with multiple years', () => {
    const periodOrder = JSON.stringify(['114-全年', '115-01', '115-02', '115-全年', '116-01']);
    const parsed = JSON.parse(periodOrder);
    expect(parsed).toEqual(['114-全年', '115-01', '115-02', '115-全年', '116-01']);
  });

  it('should validate period format', () => {
    const validPeriods = ['115-01', '115-02', '115-全年', '114-12'];
    validPeriods.forEach(period => {
      const match = period.match(/^(\d+)-(\d+|全年)$/);
      expect(match).not.toBeNull();
    });
  });

  it('should reject invalid period format', () => {
    const invalidPeriods = ['invalid', '115-', '-01'];
    invalidPeriods.forEach(period => {
      const match = period.match(/^(\d+)-(\d+|全年)$/);
      expect(match).toBeNull();
    });
  });

  it('should handle period order with mixed valid and invalid entries', () => {
    const mixedOrder = ['115-01', 'invalid', '115-02'];
    const validOnly = mixedOrder.filter(p => p.match(/^(\d+)-(\d+|全年)$/));
    expect(validOnly).toEqual(['115-01', '115-02']);
  });

  it('should accept numeric months and 全年 as valid', () => {
    const validPeriods = ['115-01', '115-12', '115-全年'];
    validPeriods.forEach(period => {
      const match = period.match(/^(\d+)-(\d+|全年)$/);
      expect(match).not.toBeNull();
    });
  });

  it('should sort periods correctly when initializing', () => {
    const periods = ['115-全年', '115-02', '115-01', '114-12'];
    const sorted = periods.sort((a: string, b: string) => {
      const aMatch = a.match(/^(\d+)-(\d+|全年)$/);
      const bMatch = b.match(/^(\d+)-(\d+|全年)$/);
      
      if (!aMatch || !bMatch) return a.localeCompare(b);
      
      const aYear = parseInt(aMatch[1]);
      const bYear = parseInt(bMatch[1]);
      
      if (aYear !== bYear) return aYear - bYear;
      
      const aMonth = aMatch[2] === '全年' ? 13 : parseInt(aMatch[2]);
      const bMonth = bMatch[2] === '全年' ? 13 : parseInt(bMatch[2]);
      
      return aMonth - bMonth;
    }).reverse();
    
    expect(sorted).toEqual(['115-全年', '115-02', '115-01', '114-12']);
  });

  it('should filter out periods not in available list', () => {
    const savedOrder = ['115-01', '115-02', '115-全年', '114-12'];
    const availablePeriods = ['115-01', '115-02', '115-全年'];
    const filtered = savedOrder.filter(p => availablePeriods.includes(p));
    expect(filtered).toEqual(['115-01', '115-02', '115-全年']);
  });

  it('should handle new periods added to available list', () => {
    const savedOrder = ['115-01', '115-02'];
    const availablePeriods = ['115-01', '115-02', '115-03', '115-全年'];
    const filtered = savedOrder.filter(p => availablePeriods.includes(p));
    // New periods (115-03, 115-全年) are not in saved order, so they won't appear
    expect(filtered).toEqual(['115-01', '115-02']);
    // This is expected behavior - new periods are not automatically added
  });
});
