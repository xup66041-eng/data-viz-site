import { describe, it, expect, beforeEach } from 'vitest';
import {
  matchAnimalCategory,
  getTodayAnimal,
  extractLatestYearData,
  formatValue,
  ANIMAL_CATEGORIES,
} from '../shared/animal-utils';

describe('Animal Utils', () => {
  describe('matchAnimalCategory', () => {
    it('should match dog category', () => {
      const result = matchAnimalCategory('狗隻登記統計');
      expect(result?.id).toBe('dog');
      expect(result?.name).toBe('狗');
    });

    it('should match cat category', () => {
      const result = matchAnimalCategory('貓咪健康數據');
      expect(result?.id).toBe('cat');
      expect(result?.name).toBe('貓');
    });

    it('should match cattle category', () => {
      const result = matchAnimalCategory('牛隻養殖統計');
      expect(result?.id).toBe('cattle');
    });

    it('should match poultry category', () => {
      const result = matchAnimalCategory('禽類飼養數據');
      expect(result?.id).toBe('poultry');
    });

    it('should match fish category', () => {
      const result = matchAnimalCategory('水產養殖統計');
      expect(result?.id).toBe('fish');
    });

    it('should match pig category', () => {
      const result = matchAnimalCategory('豬隻飼養管理');
      expect(result?.id).toBe('pig');
    });

    it('should return null for non-matching category', () => {
      const result = matchAnimalCategory('其他統計數據');
      expect(result).toBeNull();
    });

    it('should be case insensitive', () => {
      const result = matchAnimalCategory('狗隻登記統計');
      expect(result?.id).toBe('dog');
    });
  });

  describe('getTodayAnimal', () => {
    it('should return an animal from available list', () => {
      const animals = [ANIMAL_CATEGORIES[0], ANIMAL_CATEGORIES[1]];
      const result = getTodayAnimal(animals);
      expect(result).not.toBeNull();
      expect(animals).toContain(result);
    });

    it('should return same animal for same day', () => {
      const animals = ANIMAL_CATEGORIES;
      const result1 = getTodayAnimal(animals);
      const result2 = getTodayAnimal(animals);
      expect(result1?.id).toBe(result2?.id);
    });

    it('should return null for empty list', () => {
      const result = getTodayAnimal([]);
      expect(result).toBeNull();
    });

    it('should return single animal when only one available', () => {
      const animals = [ANIMAL_CATEGORIES[0]];
      const result = getTodayAnimal(animals);
      expect(result?.id).toBe(ANIMAL_CATEGORIES[0].id);
    });
  });

  describe('extractLatestYearData', () => {
    it('should extract data from latest year', () => {
      const cardData = {
        dataPoints: [
          { itemName: '項目A', period: '110-1', value: 100 },
          { itemName: '項目B', period: '110-2', value: 200 },
          { itemName: '項目A', period: '111-1', value: 150 },
        ],
      };

      const result = extractLatestYearData(cardData);
      expect(result.latestYear).toBe('111');
      expect(result.items.length).toBe(1);
      expect(result.items[0].name).toBe('項目A');
      expect(result.items[0].value).toBe(150);
    });

    it('should accumulate values for same item in latest year', () => {
      const cardData = {
        dataPoints: [
          { itemName: '項目A', period: '111-1', value: 100 },
          { itemName: '項目A', period: '111-2', value: 50 },
          { itemName: '項目B', period: '111-1', value: 200 },
        ],
      };

      const result = extractLatestYearData(cardData);
      expect(result.latestYear).toBe('111');
      expect(result.items.length).toBe(2);
      
      const itemA = result.items.find(i => i.name === '項目A');
      expect(itemA?.value).toBe(150);
    });

    it('should sort items by value descending', () => {
      const cardData = {
        dataPoints: [
          { itemName: '項目A', period: '111-1', value: 100 },
          { itemName: '項目B', period: '111-1', value: 300 },
          { itemName: '項目C', period: '111-1', value: 200 },
        ],
      };

      const result = extractLatestYearData(cardData);
      expect(result.items[0].name).toBe('項目B');
      expect(result.items[1].name).toBe('項目C');
      expect(result.items[2].name).toBe('項目A');
    });

    it('should return empty for no data', () => {
      const result = extractLatestYearData({});
      expect(result.latestYear).toBeNull();
      expect(result.items).toEqual([]);
    });

    it('should handle null dataPoints', () => {
      const result = extractLatestYearData({ dataPoints: null });
      expect(result.latestYear).toBeNull();
      expect(result.items).toEqual([]);
    });
  });

  describe('formatValue', () => {
    it('should format millions', () => {
      expect(formatValue(1500000)).toBe('1.5M');
      expect(formatValue(1000000)).toBe('1.0M');
    });

    it('should format thousands', () => {
      expect(formatValue(1500)).toBe('1.5K');
      expect(formatValue(1000)).toBe('1.0K');
    });

    it('should format small numbers', () => {
      expect(formatValue(100)).toBe('100');
      expect(formatValue(999)).toBe('999');
    });

    it('should round small numbers', () => {
      expect(formatValue(123.456)).toBe('123');
    });
  });
});
