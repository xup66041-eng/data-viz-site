import { describe, it, expect } from 'vitest';

// Test data parsing logic
describe('BatchImportDialog - Data Parsing', () => {
  // Helper function to parse CSV/TSV data (extracted from component logic)
  const parseImportData = (data: string) => {
    const lines = data.trim().split('\n');
    const parsed: any[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      const parts = line.split(/\t|,/).map(p => p.trim());

      if (parts.length < 3) {
        throw new Error(`行格式錯誤: "${line.substring(0, 50)}..."`);
      }

      const [itemName, period, value, ...notesParts] = parts;

      if (!itemName || !period || !value) {
        throw new Error(`缺少必要欄位: "${line.substring(0, 50)}..."`);
      }

      if (!/^\d+$/.test(period)) {
        throw new Error(`年度格式錯誤: "${period}" (應為數字)`);
      }

      if (!/^-?\d+(\.\d+)?$/.test(value)) {
        throw new Error(`數值格式錯誤: "${value}" (應為數字)`);
      }

      parsed.push({
        itemName,
        period,
        value,
        notes: notesParts.join(',').trim() || undefined,
      });
    }

    if (parsed.length === 0) {
      throw new Error('未找到有效的數據行');
    }

    return parsed;
  };

  it('應該解析 Tab 分隔的數據', () => {
    const data = '後送醫療隻數\t115\t64\n所內醫療隻數\t115\t69';
    const result = parseImportData(data);
    
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      itemName: '後送醫療隻數',
      period: '115',
      value: '64',
      notes: undefined,
    });
    expect(result[1]).toEqual({
      itemName: '所內醫療隻數',
      period: '115',
      value: '69',
      notes: undefined,
    });
  });

  it('應該解析逗號分隔的數據', () => {
    const data = '項目A,113,100\n項目B,114,200';
    const result = parseImportData(data);
    
    expect(result).toHaveLength(2);
    expect(result[0].itemName).toBe('項目A');
    expect(result[0].period).toBe('113');
    expect(result[0].value).toBe('100');
  });

  it('應該解析帶有備註的數據', () => {
    const data = '項目A\t113\t100\t備註1\n項目B\t114\t200\t備註2';
    const result = parseImportData(data);
    
    expect(result).toHaveLength(2);
    expect(result[0].notes).toBe('備註1');
    expect(result[1].notes).toBe('備註2');
  });

  it('應該跳過空行', () => {
    const data = '項目A\t113\t100\n\n項目B\t114\t200\n';
    const result = parseImportData(data);
    
    expect(result).toHaveLength(2);
  });

  it('應該支持小數點數值', () => {
    const data = '項目A\t113\t100.5\n項目B\t114\t-50.25';
    const result = parseImportData(data);
    
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe('100.5');
    expect(result[1].value).toBe('-50.25');
  });

  it('應該拒絕非數字年度', () => {
    const data = '項目A\t113a\t100';
    expect(() => parseImportData(data)).toThrow('年度格式錯誤');
  });

  it('應該拒絕非數字數值', () => {
    const data = '項目A\t113\tabc';
    expect(() => parseImportData(data)).toThrow('數值格式錯誤');
  });

  it('應該拒絕缺少欄位的行', () => {
    const data = '項目A\t113';
    expect(() => parseImportData(data)).toThrow('行格式錯誤');
  });

  it('應該拒絕空數據', () => {
    const data = '';
    expect(() => parseImportData(data)).toThrow('未找到有效的數據行');
  });

  it('應該拒絕只有空行的數據', () => {
    const data = '\n\n\n';
    expect(() => parseImportData(data)).toThrow('未找到有效的數據行');
  });

  it('應該處理混合 Tab 和逗號分隔', () => {
    const data = '項目A,113\t100';
    const result = parseImportData(data);
    
    expect(result).toHaveLength(1);
    expect(result[0].itemName).toBe('項目A');
    expect(result[0].period).toBe('113');
    expect(result[0].value).toBe('100');
  });

  it('應該處理多個備註欄位', () => {
    const data = '項目A\t113\t100\t備註1\t備註2\t備註3';
    const result = parseImportData(data);
    
    expect(result).toHaveLength(1);
    expect(result[0].notes).toBe('備註1,備註2,備註3');
  });

  it('應該處理項目名稱中的空格', () => {
    const data = '後送醫療隻數\t115\t64';
    const result = parseImportData(data);
    
    expect(result[0].itemName).toBe('後送醫療隻數');
  });

  it('應該驗證完整的實際數據', () => {
    const data = `後送醫療隻數\t115\t64
所內醫療隻數\t115\t69
後送醫療隻數\t114\t58
所內醫療隻數\t114\t72`;
    
    const result = parseImportData(data);
    
    expect(result).toHaveLength(4);
    expect(result[0].period).toBe('115');
    expect(result[2].period).toBe('114');
  });
});
