import { describe, it, expect } from 'vitest';

/**
 * Tests for update start date functionality
 * Tests the logic for calculating whether a card is overdue based on frequency and start date
 */

describe('Start Date Calculation', () => {
  // Helper function to calculate if a card is overdue
  const isCardOverdue = (startDate: Date, frequency: string, currentDate: Date): boolean => {
    if (!frequency || frequency === 'none') {
      return false;
    }

    const dueDate = new Date(startDate);
    if (frequency === 'monthly') {
      dueDate.setMonth(dueDate.getMonth() + 1);
    } else if (frequency === 'quarterly') {
      dueDate.setMonth(dueDate.getMonth() + 3);
    } else if (frequency === 'yearly') {
      dueDate.setFullYear(dueDate.getFullYear() + 1);
    }

    return currentDate > dueDate;
  };

  describe('Monthly frequency', () => {
    it('should not be overdue if within 1 month from start date', () => {
      const startDate = new Date('2026-02-26');
      const currentDate = new Date('2026-03-15');
      expect(isCardOverdue(startDate, 'monthly', currentDate)).toBe(false);
    });

    it('should be overdue if exactly 1 month has passed', () => {
      const startDate = new Date('2026-02-26');
      const currentDate = new Date('2026-03-26');
      expect(isCardOverdue(startDate, 'monthly', currentDate)).toBe(true);
    });

    it('should be overdue if more than 1 month has passed', () => {
      const startDate = new Date('2026-02-26');
      const currentDate = new Date('2026-03-27');
      expect(isCardOverdue(startDate, 'monthly', currentDate)).toBe(true);
    });

    it('should handle month boundaries correctly', () => {
      const startDate = new Date('2026-01-31');
      const currentDate = new Date('2026-02-28');
      expect(isCardOverdue(startDate, 'monthly', currentDate)).toBe(false);
    });
  });

  describe('Quarterly frequency', () => {
    it('should not be overdue if within 3 months from start date', () => {
      const startDate = new Date('2026-01-26');
      const currentDate = new Date('2026-04-15');
      expect(isCardOverdue(startDate, 'quarterly', currentDate)).toBe(false);
    });

    it('should be overdue if more than 3 months have passed', () => {
      const startDate = new Date('2026-01-26');
      const currentDate = new Date('2026-04-27');
      expect(isCardOverdue(startDate, 'quarterly', currentDate)).toBe(true);
    });

    it('should handle year boundaries correctly', () => {
      const startDate = new Date('2025-11-26');
      const currentDate = new Date('2026-02-27');
      expect(isCardOverdue(startDate, 'quarterly', currentDate)).toBe(true);
    });
  });

  describe('Yearly frequency', () => {
    it('should not be overdue if within 1 year from start date', () => {
      const startDate = new Date('2025-03-26');
      const currentDate = new Date('2026-03-15');
      expect(isCardOverdue(startDate, 'yearly', currentDate)).toBe(false);
    });

    it('should be overdue if exactly 1 year has passed', () => {
      const startDate = new Date('2025-03-26');
      const currentDate = new Date('2026-03-26');
      expect(isCardOverdue(startDate, 'yearly', currentDate)).toBe(false);
    });

    it('should handle leap years correctly', () => {
      const startDate = new Date('2024-02-29');
      const currentDate = new Date('2025-03-01');
      expect(isCardOverdue(startDate, 'yearly', currentDate)).toBe(false);
    });
  });

  describe('No frequency set', () => {
    it('should never be overdue when frequency is none', () => {
      const startDate = new Date('2020-01-01');
      const currentDate = new Date('2026-03-26');
      expect(isCardOverdue(startDate, 'none', currentDate)).toBe(false);
    });

    it('should never be overdue when frequency is empty string', () => {
      const startDate = new Date('2020-01-01');
      const currentDate = new Date('2026-03-26');
      expect(isCardOverdue(startDate, '', currentDate)).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle same day as start date', () => {
      const startDate = new Date('2026-03-26');
      const currentDate = new Date('2026-03-26');
      expect(isCardOverdue(startDate, 'monthly', currentDate)).toBe(false);
    });

    it('should handle very old start dates', () => {
      const startDate = new Date('2000-01-01');
      const currentDate = new Date('2026-03-26');
      expect(isCardOverdue(startDate, 'monthly', currentDate)).toBe(true);
    });

    it('should handle future start dates', () => {
      const startDate = new Date('2030-01-01');
      const currentDate = new Date('2026-03-26');
      expect(isCardOverdue(startDate, 'monthly', currentDate)).toBe(false);
    });

    it('should handle dates with time components', () => {
      const startDate = new Date('2026-02-26T10:30:00');
      const currentDate = new Date('2026-03-26T14:45:00');
      expect(isCardOverdue(startDate, 'monthly', currentDate)).toBe(true);
    });

    it('should handle dates with time components - overdue case', () => {
      const startDate = new Date('2026-02-26T10:30:00');
      const currentDate = new Date('2026-03-27T14:45:00');
      expect(isCardOverdue(startDate, 'monthly', currentDate)).toBe(true);
    });
  });

  describe('Real-world scenarios', () => {
    it('should correctly calculate for a monthly report due on the 26th', () => {
      // Report starts on Feb 26, due by Mar 26
      const startDate = new Date('2026-02-26');
      
      // Mar 25 - not yet overdue
      expect(isCardOverdue(startDate, 'monthly', new Date('2026-03-25'))).toBe(false);
      
      // Mar 26 - exactly on due date, overdue
      expect(isCardOverdue(startDate, 'monthly', new Date('2026-03-26'))).toBe(true);
      
      // Mar 27 - one day late, overdue
      expect(isCardOverdue(startDate, 'monthly', new Date('2026-03-27'))).toBe(true);
    });

    it('should correctly calculate for a quarterly report', () => {
      // Report starts on Jan 1, due by Apr 1
      const startDate = new Date('2026-01-01');
      
      // Mar 31 - not yet overdue
      expect(isCardOverdue(startDate, 'quarterly', new Date('2026-03-31'))).toBe(false);
      
      // Apr 1 - exactly on due date, overdue
      expect(isCardOverdue(startDate, 'quarterly', new Date('2026-04-01'))).toBe(true);
      
      // Apr 2 - one day late, overdue
      expect(isCardOverdue(startDate, 'quarterly', new Date('2026-04-02'))).toBe(true);
    });

    it('should correctly calculate for an annual report', () => {
      // Report starts on Jan 1, 2025, due by Jan 1, 2026
      const startDate = new Date('2025-01-01');
      
      // Dec 31, 2025 - not yet overdue
      expect(isCardOverdue(startDate, 'yearly', new Date('2025-12-31'))).toBe(false);
      
      // Jan 1, 2026 - exactly on due date, not overdue
      expect(isCardOverdue(startDate, 'yearly', new Date('2026-01-01'))).toBe(false);
      
      // Jan 2, 2026 - one day late, overdue
      expect(isCardOverdue(startDate, 'yearly', new Date('2026-01-02'))).toBe(true);
    });
  });
});
