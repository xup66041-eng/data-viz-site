/**
 * 動物匹配和數據提取工具函數
 */

export interface AnimalCategory {
  id: string;
  name: string;
  emoji: string;
  keywords: string[];
  color: string;
  cardId?: number;
  itemName?: string; // 指定要提取的項目名稱
  format?: (value: number) => string; // 自定義格式化函數
}

export const ANIMAL_CATEGORIES: AnimalCategory[] = [
  {
    id: 'dog',
    name: '狗',
    emoji: '🐕',
    keywords: ['狗', '犬'],
    color: 'from-amber-400 to-orange-400',
    cardId: 1290002,
    itemName: '犬',
  },
  {
    id: 'cat',
    name: '貓',
    emoji: '🐱',
    keywords: ['貓', '貓咪'],
    color: 'from-orange-400 to-red-400',
    cardId: 1290002,
    itemName: '貓',
  },
  {
    id: 'cattle',
    name: '牛',
    emoji: '🐄',
    keywords: ['牛', '家畜'],
    color: 'from-amber-300 to-yellow-400',
    cardId: 600002,
    itemName: '牛頭數',
    format: (value: number) => Math.round(value).toString(),
  },
  {
    id: 'poultry',
    name: '禽',
    emoji: '🐔',
    keywords: ['禽', '家禽', '雞'],
    color: 'from-yellow-400 to-orange-400',
    cardId: 720001,
    format: (value: number) => `${value}（萬）`,
  },
  {
    id: 'fish',
    name: '魚',
    emoji: '🐟',
    keywords: ['魚', '水產'],
    color: 'from-blue-400 to-cyan-400',
    cardId: 690001,
  },
  {
    id: 'pig',
    name: '豬',
    emoji: '🐷',
    keywords: ['豬', '豬隔'],
    color: 'from-pink-300 to-rose-400',
    cardId: 810001,
    itemName: '養豬頭數',
    format: (value: number) => Math.round(value).toString(),
  },
];

/**
 * 根據卡片名稱匹配動物類別
 * 優先級：直接匹配 > 部分匹配
 */
export function matchAnimalCategory(cardName: string | null | undefined): AnimalCategory | null {
  if (!cardName) return null;
  const lowerName = String(cardName).toLowerCase();
  
  // 第一輪：精確匹配主要關鍵字（狗、貓、牛、禽、魚、豬）
  const primaryKeywords = ['狗', '貓', '牛', '禽', '魚', '豬'];
  for (const category of ANIMAL_CATEGORIES) {
    for (const keyword of primaryKeywords) {
      if (lowerName.includes(keyword.toLowerCase()) && 
          category.keywords.some(k => k.toLowerCase() === keyword.toLowerCase())) {
        return category;
      }
    }
  }

  // 第二輪：部分匹配其他關鍵字
  for (const category of ANIMAL_CATEGORIES) {
    for (const keyword of category.keywords) {
      if (lowerName.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  return null;
}

/**
 * 格式化數值為可讀的字符串
 * 支持 K（千）、M（百萬）、B（十億）等單位
 */
export function formatValue(value: number): string {
  if (value === 0 || value === null || value === undefined) {
    return '0';
  }

  const absValue = Math.abs(value);

  if (absValue >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (absValue >= 1_000_000) {
    return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (absValue >= 1_000) {
    return (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }

  return Math.round(value).toString();
}

/**
 * 從卡片數據中提取最新期間的數值（用於首頁動物卡片顯示）
 * 優先查找「總數」項目，如果沒有則返回最後一個項目
 * 如果指定了 animalId，會按動物名稱策略選擇數值
 */
export function extractLatestSingleValue(cardData: any, animalId?: string, targetItemName?: string): {
  value: number | null;
  itemName: string | null;
  period: string | null;
} {
  if (!cardData || !cardData.dataPoints || cardData.dataPoints.length === 0) {
    return { value: null, itemName: null, period: null };
  }

  // 提取所有可用的期間
  const periodsSet = new Set<string>();
  cardData.dataPoints.forEach((dp: any) => {
    if (dp.period) {
      periodsSet.add(String(dp.period));
    }
  });

  if (periodsSet.size === 0) {
    return { value: null, itemName: null, period: null };
  }

  // 找到最新的期間（按數值排序，假設期間格式为 YYYY 或 YYYY-MM）
  const periods = Array.from(periodsSet).sort((a, b) => {
    const aNum = parseInt(String(a), 10);
    const bNum = parseInt(String(b), 10);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return bNum - aNum;
    }
    return String(b).localeCompare(String(a));
  });
  const latestPeriod = periods[0];

  // 獲取該期間的所有數據點
  const latestDataPoints = cardData.dataPoints.filter((dp: any) => String(dp.period) === latestPeriod);

  if (latestDataPoints.length === 0) {
    return { value: null, itemName: null, period: null };
  }

  // 如果指定了 targetItemName，優先查找該項目（搜索所有期間）
  if (targetItemName) {
    // 先在最新期間查找
    const targetItem = latestDataPoints.find((dp: any) => String(dp.itemName) === targetItemName);
    if (targetItem) {
      return {
        value: parseFloat(String(targetItem.value)) || 0,
        itemName: String(targetItem.itemName),
        period: latestPeriod,
      };
    }
    
    // 如果最新期間沒有找到，搜索所有期間中最新的該項目
    const allPeriodsWithTarget = cardData.dataPoints
      .filter((dp: any) => String(dp.itemName) === targetItemName)
      .sort((a: any, b: any) => {
        const aPeriod = parseInt(String(a.period), 10);
        const bPeriod = parseInt(String(b.period), 10);
        if (!isNaN(aPeriod) && !isNaN(bPeriod)) {
          return bPeriod - aPeriod;
        }
        return String(b.period).localeCompare(String(a.period));
      });
    
    if (allPeriodsWithTarget.length > 0) {
      const targetItem = allPeriodsWithTarget[0];
      return {
        value: parseFloat(String(targetItem.value)) || 0,
        itemName: String(targetItem.itemName),
        period: String(targetItem.period),
      };
    }
  }

  // 如果指定了 animalId，按動物名稱策略選擇
  if (animalId === 'dog') {
    // 查找犬相關的項目（優先查找「犬」、「狗」）
    const dogItem = latestDataPoints.find((dp: any) => {
      const name = String(dp.itemName).toLowerCase();
      return name.includes('犬') || name.includes('狗');
    });
    if (dogItem) {
      return {
        value: parseFloat(String(dogItem.value)) || 0,
        itemName: String(dogItem.itemName),
        period: latestPeriod,
      };
    }
  } else if (animalId === 'cat') {
    // 查找貓相關的項目（優先查找「貓」）
    const catItem = latestDataPoints.find((dp: any) => {
      const name = String(dp.itemName).toLowerCase();
      return name.includes('貓');
    });
    if (catItem) {
      return {
        value: parseFloat(String(catItem.value)) || 0,
        itemName: String(catItem.itemName),
        period: latestPeriod,
      };
    }
  }

  // 優先查找「總數」項目
  const totalItem = latestDataPoints.find((dp: any) => String(dp.itemName).includes('總數'));
  if (totalItem) {
    return {
      value: parseFloat(String(totalItem.value)) || 0,
      itemName: String(totalItem.itemName),
      period: latestPeriod,
    };
  }

  // 如果沒有「總數」，返回最後一個項目
  const lastItem = latestDataPoints[latestDataPoints.length - 1];
  return {
    value: parseFloat(String(lastItem.value)) || 0,
    itemName: String(lastItem.itemName),
    period: latestPeriod,
  };
}
