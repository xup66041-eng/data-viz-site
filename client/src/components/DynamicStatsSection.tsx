import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import {
  ANIMAL_CATEGORIES,
  extractLatestSingleValue,
  formatValue,
  type AnimalCategory,
} from '../../../shared/animal-utils';

interface CardWithData {
  id: string;
  title: string;
  dataPoints?: any[];
  sourceCardTitle?: string;
}

export function DynamicStatsSection() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [selectedAnimals, setSelectedAnimals] = useState<
    Array<{ animal: AnimalCategory; cardData: CardWithData | null }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  // 獲取所有卡片
  const { data: cardsData, isLoading, error: queryError } = trpc.cards.list.useQuery(undefined, {
    enabled: true,
  });

  // 記錄錯誤
  useEffect(() => {
    if (queryError) {
      console.error('[DynamicStatsSection] Query error:', queryError);
      setError(queryError.message);
    }
  }, [queryError]);

  // 處理卡片數據並匹配動物
  useEffect(() => {
    try {
      if (!cardsData || cardsData.length === 0) {
        console.log('[DynamicStatsSection] No cards data');
        // 即使沒有卡片數據，也顯示所有動物（沒有數量）
        setSelectedAnimals(
          ANIMAL_CATEGORIES.map((animal) => ({
            animal,
            cardData: null,
          }))
        );
        return;
      }

      console.log('[DynamicStatsSection] Cards data:', cardsData);

      // 為每個動物類別找到對應的數據
      const animalToCard = new Map<string, CardWithData>();

      // 為每個動物類別建立卡片數據
      ANIMAL_CATEGORIES.forEach((animal) => {
        let cardData: CardWithData | null = null;

        // 如果動物有指定的 cardId，直接使用該卡片
        if (animal.cardId) {
          const targetCard = cardsData.find((card: any) => Number(card.id) === animal.cardId);
          if (targetCard) {
            cardData = {
              id: String(targetCard.id),
              title: targetCard.title,
              dataPoints: targetCard.dataPoints,
              sourceCardTitle: targetCard.title,
            };
          }
        }

        if (cardData) {
          animalToCard.set(animal.id, cardData);
        }
      });

      // 構建顯示列表 - 包括所有動物
      const displayList = ANIMAL_CATEGORIES.map((animal) => {
        const card = animalToCard.get(animal.id);
        return {
          animal,
          cardData: card || null,
        };
      });

      console.log('[DynamicStatsSection] Display list:', displayList);

      setSelectedAnimals(displayList);
    } catch (err) {
      console.error('[DynamicStatsSection] Error processing cards:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [cardsData]);

  if (error) {
    return (
      <section className="py-16 bg-white/50 backdrop-blur-sm border-y border-slate-200">
        <div className="container mx-auto px-4">
          <div className="text-center text-red-600">
            <p>載入數據時出錯: {error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="py-16 bg-white/50 backdrop-blur-sm border-y border-slate-200">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {Array(6)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className="text-center p-6 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 animate-pulse h-32"
                />
              ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white/50 backdrop-blur-sm border-y border-slate-200">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {selectedAnimals.map((item, index) => {
            if (!item.animal) {
              return (
                <div
                  key={index}
                  className="text-center p-6 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 h-32"
                />
              );
            }

            try {
              let displayValue = 0;
              let displayLabel = '';

              if (item.cardData && item.cardData.dataPoints && item.cardData.dataPoints.length > 0) {
                const { value, itemName } = extractLatestSingleValue(item.cardData, item.animal.id, item.animal.itemName);
                if (value !== null) {
                  displayValue = value;
                  displayLabel = itemName || item.animal.name;
                }
              }

              const handleCardClick = () => {
                if (isAuthenticated) {
                  navigate(`/dashboard?search=${encodeURIComponent(item.animal.name)}`);
                } else {
                  navigate(`/public?search=${encodeURIComponent(item.animal.name)}`);
                }
              };

              // 使用自定義格式化函數（如果有）
              const formattedValue = displayValue > 0 
                ? (item.animal.format ? item.animal.format(displayValue) : formatValue(displayValue))
                : '-';

              return (
                <div
                  key={index}
                  onClick={handleCardClick}
                  className="text-center p-6 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 hover:shadow-lg hover:cursor-pointer transition-all hover:scale-105"
                >
                  <div className="text-4xl mb-3">{item.animal.emoji}</div>
                  <div className="text-3xl font-bold text-slate-900 mb-2">
                    {formattedValue}
                  </div>
                  <div className="text-xs text-slate-600">{displayLabel || item.animal.name}</div>
                  {item.cardData?.sourceCardTitle && (
                    <div className="text-xs text-slate-400 mt-2 border-t border-slate-200 pt-2">{item.cardData.sourceCardTitle}</div>
                  )}
                </div>
              );
            } catch (err) {
              console.error('[DynamicStatsSection] Error rendering card:', item.animal.name, err);
              return (
                <div
                  key={index}
                  className="text-center p-6 rounded-lg bg-gradient-to-br from-red-50 to-red-100 h-32"
                />
              );
            }
          })}
        </div>
      </div>
    </section>
  );
}
