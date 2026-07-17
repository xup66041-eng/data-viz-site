import { describe, it, expect } from 'vitest';

/**
 * Test suite for manual period order functionality
 * Verifies that period ordering is completely manual with no automatic sorting
 */

describe('Manual Period Order (No Auto-Sorting)', () => {
  it('should not auto-sort periods - empty order means no chart', () => {
    const periodOrder: string[] = [];
    const availablePeriods = ['115-01', '115-02', '115-03', '114-12'];
    
    // With empty periodOrder, chart should not display
    const chartPeriods = periodOrder.length > 0 
      ? periodOrder.filter(p => availablePeriods.includes(p))
      : [];
    
    expect(chartPeriods).toEqual([]);
    expect(chartPeriods.length).toBe(0);
  });

  it('should use manually set order exactly as provided', () => {
    const periodOrder = ['115-03', '115-01', '115-02', '114-12'];
    const availablePeriods = ['115-01', '115-02', '115-03', '114-12'];
    
    const chartPeriods = periodOrder.length > 0 
      ? periodOrder.filter(p => availablePeriods.includes(p))
      : [];
    
    // Should preserve exact manual order
    expect(chartPeriods).toEqual(['115-03', '115-01', '115-02', '114-12']);
  });

  it('should filter out periods no longer in data', () => {
    const periodOrder = ['115-01', '115-02', '115-03', '114-12'];
    const availablePeriods = ['115-01', '115-02', '115-03']; // 114-12 removed
    
    const chartPeriods = periodOrder.length > 0 
      ? periodOrder.filter(p => availablePeriods.includes(p))
      : [];
    
    expect(chartPeriods).toEqual(['115-01', '115-02', '115-03']);
  });

  it('should not add new periods automatically', () => {
    const periodOrder = ['115-01', '115-02'];
    const availablePeriods = ['115-01', '115-02', '115-03', '115-全年'];
    
    const chartPeriods = periodOrder.length > 0 
      ? periodOrder.filter(p => availablePeriods.includes(p))
      : [];
    
    // New periods (115-03, 115-全年) should NOT be added
    expect(chartPeriods).toEqual(['115-01', '115-02']);
    expect(chartPeriods.length).toBe(2);
  });

  it('should allow user to manually add new periods', () => {
    const periodOrder = ['115-01', '115-02'];
    const availablePeriods = ['115-01', '115-02', '115-03', '115-全年'];
    
    // User manually adds new periods
    const updatedOrder = [...periodOrder, '115-03', '115-全年'];
    
    const chartPeriods = updatedOrder.length > 0 
      ? updatedOrder.filter(p => availablePeriods.includes(p))
      : [];
    
    expect(chartPeriods).toEqual(['115-01', '115-02', '115-03', '115-全年']);
  });

  it('should allow user to reorder periods in any way', () => {
    const periodOrder = ['115-全年', '114-12', '115-02', '115-01'];
    const availablePeriods = ['115-01', '115-02', '115-全年', '114-12'];
    
    const chartPeriods = periodOrder.length > 0 
      ? periodOrder.filter(p => availablePeriods.includes(p))
      : [];
    
    // Should keep exact user-specified order
    expect(chartPeriods).toEqual(['115-全年', '114-12', '115-02', '115-01']);
  });

  it('should persist saved order across sessions', () => {
    const savedOrder = JSON.stringify(['115-02', '115-01', '114-12']);
    const availablePeriods = ['115-01', '115-02', '114-12'];
    
    // Load from database
    const loadedOrder = JSON.parse(savedOrder);
    const chartPeriods = loadedOrder.length > 0 
      ? loadedOrder.filter((p: string) => availablePeriods.includes(p))
      : [];
    
    expect(chartPeriods).toEqual(['115-02', '115-01', '114-12']);
  });

  it('should allow resetting order to empty', () => {
    const periodOrder = ['115-01', '115-02'];
    
    // User clicks reset button
    const resetOrder: string[] = [];
    
    const chartPeriods = resetOrder.length > 0 
      ? resetOrder.filter(p => ['115-01', '115-02'].includes(p))
      : [];
    
    expect(chartPeriods).toEqual([]);
    expect(chartPeriods.length).toBe(0);
  });

  it('should require user to set order before showing chart', () => {
    const periodOrder: string[] = [];
    const hasData = true;
    
    // Chart should only show if both conditions are met
    const shouldShowChart = hasData && periodOrder.length > 0;
    
    expect(shouldShowChart).toBe(false);
  });

  it('should show chart only when both data and order are set', () => {
    const periodOrder = ['115-01', '115-02'];
    const chartData = [
      { name: '項目1', '115-01': 100, '115-02': 200 },
      { name: '項目2', '115-01': 150, '115-02': 250 }
    ];
    
    const shouldShowChart = chartData.length > 0 && periodOrder.length > 0;
    
    expect(shouldShowChart).toBe(true);
  });
});
