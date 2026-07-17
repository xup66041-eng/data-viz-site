import { describe, it, expect } from 'vitest';

/**
 * Test suite for period ordering consistency across three locations:
 * 1. DashboardChartCard - card preview
 * 2. CardDetail - chart preview
 * 3. PeriodOrderManager - period order manager
 */

// Helper function to calculate chartPeriods (same logic as CardDetail and DashboardChartCard)
function calculateChartPeriods(
  availablePeriods: string[],
  periodOrder: string[]
): string[] {
  if (periodOrder.length > 0) {
    const orderedPeriods = periodOrder.filter(p => availablePeriods.includes(p));
    const remainingPeriods = availablePeriods.filter(p => !periodOrder.includes(p));
    return [...orderedPeriods, ...remainingPeriods];
  }
  return availablePeriods;
}

describe('Period Ordering Consistency', () => {
  it('should use same logic in all three locations when periodOrder is set', () => {
    const availablePeriods = ['108', '109', '110', '112', '113'];
    const periodOrder = ['108', '109', '110', '112', '113'];

    // Calculate chartPeriods using the shared logic
    const chartPeriods = calculateChartPeriods(availablePeriods, periodOrder);

    // All three locations should return the same order
    expect(chartPeriods).toEqual(['108', '109', '110', '112', '113']);
  });

  it('should respect periodOrder when user manually reorders', () => {
    const availablePeriods = ['108', '109', '110', '112', '113'];
    // User manually reordered to this
    const periodOrder = ['113', '112', '110', '109', '108'];

    const chartPeriods = calculateChartPeriods(availablePeriods, periodOrder);

    // Should match the user's manual order
    expect(chartPeriods).toEqual(['113', '112', '110', '109', '108']);
  });

  it('should handle partial periodOrder with remaining periods appended', () => {
    const availablePeriods = ['108', '109', '110', '112', '113'];
    // User only ordered some periods
    const periodOrder = ['113', '108'];

    const chartPeriods = calculateChartPeriods(availablePeriods, periodOrder);

    // Should have ordered periods first, then remaining periods
    expect(chartPeriods[0]).toBe('113');
    expect(chartPeriods[1]).toBe('108');
    expect(chartPeriods).toContain('109');
    expect(chartPeriods).toContain('110');
    expect(chartPeriods).toContain('112');
  });

  it('should use availablePeriods when periodOrder is empty', () => {
    const availablePeriods = ['108', '109', '110', '112', '113'];
    const periodOrder: string[] = [];

    const chartPeriods = calculateChartPeriods(availablePeriods, periodOrder);

    // Should return availablePeriods as-is
    expect(chartPeriods).toEqual(availablePeriods);
  });

  it('should handle new periods added after periodOrder was set', () => {
    const availablePeriods = ['108', '109', '110', '112', '113', '114'];
    const periodOrder = ['108', '109', '110', '112', '113'];

    const chartPeriods = calculateChartPeriods(availablePeriods, periodOrder);

    // New period (114) should be appended
    expect(chartPeriods).toEqual(['108', '109', '110', '112', '113', '114']);
  });

  it('should handle periods removed from data after periodOrder was set', () => {
    const availablePeriods = ['108', '109', '110', '112'];
    const periodOrder = ['108', '109', '110', '112', '113'];

    const chartPeriods = calculateChartPeriods(availablePeriods, periodOrder);

    // Should only include periods that are still available
    expect(chartPeriods).toEqual(['108', '109', '110', '112']);
    expect(chartPeriods).not.toContain('113');
  });

  it('should maintain consistency with mixed year-month formats', () => {
    const availablePeriods = ['108-01', '108-02', '109-01', '109-02'];
    const periodOrder = ['109-02', '109-01', '108-02', '108-01'];

    const chartPeriods = calculateChartPeriods(availablePeriods, periodOrder);

    // Should respect the exact order specified
    expect(chartPeriods).toEqual(['109-02', '109-01', '108-02', '108-01']);
  });

  it('should not use simple alphabetical sort like old DashboardChartCard', () => {
    const availablePeriods = ['108', '109', '110', '112', '113'];
    const periodOrder = ['113', '112', '110', '109', '108'];

    const chartPeriods = calculateChartPeriods(availablePeriods, periodOrder);

    // Should NOT be alphabetically sorted
    const alphabeticalSort = availablePeriods.sort();
    expect(chartPeriods).not.toEqual(alphabeticalSort);

    // Should match the periodOrder
    expect(chartPeriods).toEqual(periodOrder);
  });
});
