import { useState, useEffect } from 'react';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface PeriodOrderManagerProps {
  periods: string[];
  onOrderChange: (newOrder: string[]) => void;
  onVisibilityChange?: (visiblePeriods: string[]) => void;
  visiblePeriods?: string[];
  onUserSetOrder?: () => void;
}

export const PeriodOrderManager: React.FC<PeriodOrderManagerProps> = ({ 
  periods, 
  onOrderChange, 
  onVisibilityChange,
  visiblePeriods = [],
  onUserSetOrder 
}) => {
  const [order, setOrder] = useState<string[]>(periods);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [checkedPeriods, setCheckedPeriods] = useState<Set<string>>(
    visiblePeriods.length > 0 ? new Set(visiblePeriods) : new Set(periods)
  );

  useEffect(() => {
    setOrder(periods);
    // Initialize checked periods to all if not provided
    if (visiblePeriods.length === 0) {
      setCheckedPeriods(new Set(periods));
    }
  }, [periods, visiblePeriods]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newOrder = [...order];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    onOrderChange(order);
    onUserSetOrder?.();
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...order];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    onUserSetOrder?.();
    setOrder(newOrder);
    onOrderChange(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === order.length - 1) return;
    const newOrder = [...order];
    onUserSetOrder?.();
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setOrder(newOrder);
    onOrderChange(newOrder);
  };

  const handleCheckChange = (period: string, checked: boolean) => {
    const newChecked = new Set(checkedPeriods);
    if (checked) {
      newChecked.add(period);
    } else {
      newChecked.delete(period);
    }
    setCheckedPeriods(newChecked);
    onVisibilityChange?.(Array.from(newChecked));
  };

  const handleCheckAll = (checked: boolean) => {
    if (checked) {
      setCheckedPeriods(new Set(order));
      onVisibilityChange?.(order);
    } else {
      setCheckedPeriods(new Set());
      onVisibilityChange?.([]);
    }
  };

  if (periods.length === 0) {
    return <p className="text-xs text-gray-500">沒有可用年度</p>;
  }

  return (
    <div className="space-y-2">
      {/* Check All / Uncheck All */}
      <div className="flex items-center gap-2 p-2 bg-gray-50 border rounded">
        <Checkbox
          checked={checkedPeriods.size === order.length && order.length > 0}
          onCheckedChange={(checked) => handleCheckAll(checked as boolean)}
          id="check-all"
        />
        <label htmlFor="check-all" className="text-sm font-medium cursor-pointer">
          全選 / 取消全選
        </label>
      </div>

      {/* Period List */}
      <div className="max-h-64 overflow-y-auto border rounded p-3 bg-gray-50 space-y-2">
        {order.map((period, index) => (
          <div
            key={`${period}-${index}`}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-2 p-2 bg-white border rounded cursor-move hover:bg-gray-100 transition ${
              draggedIndex === index ? 'opacity-50' : ''
            }`}
          >
            <Checkbox
              checked={checkedPeriods.has(period)}
              onCheckedChange={(checked) => handleCheckChange(period, checked as boolean)}
              id={`period-${period}`}
            />
            <GripVertical className="w-4 h-4 text-gray-400" />
            <label htmlFor={`period-${period}`} className="text-sm flex-1 cursor-pointer">
              {period}
            </label>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => moveUp(index)}
                disabled={index === 0}
                className="h-6 w-6 p-0"
              >
                <ChevronUp className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => moveDown(index)}
                disabled={index === order.length - 1}
                className="h-6 w-6 p-0"
              >
                <ChevronDown className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
