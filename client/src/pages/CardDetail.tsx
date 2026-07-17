import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { GroupedBarChart } from '@/components/GroupedBarChart';
import { CardItemNamesManager } from '@/components/CardItemNamesManager';
import { PeriodOrderManager } from '@/components/PeriodOrderManager';
import { DataManagementTable } from '@/components/DataManagementTable';
import { CardTableEditor } from '@/components/CardTableEditor';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { ArrowLeft, Download } from 'lucide-react';
import { useLocation } from 'wouter';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
// Removed react-hot-toast import


interface CardDetailProps {
  cardId: string;
}

const CardDetail: React.FC<CardDetailProps> = ({ cardId }) => {
  const id = parseInt(cardId || '0');
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const chartRef = useRef<HTMLDivElement>(null);
  const [showNotification, setShowNotification] = useState(false);

  
  // Get the source page from query parameter
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const source = searchParams.get('from') || 'dashboard';
  
  const handleGoBack = () => {
    if (source === 'watchlist') {
      setLocation('/watchlist');
    } else {
      setLocation('/dashboard');
    }
  };
  
  // Permission checks
  const isAdmin = user?.role === 'admin';
  const canEdit = isAdmin; // Only admins can edit card metadata
  const canManageItems = true; // All authenticated users can manage item order (modify X-axis sorting)
  const canManageData = true; // All authenticated users can manage data points

  // Query data
  const { data: card, isLoading: cardLoading } = trpc.cards.get.useQuery(
    id,
    { enabled: id > 0 }
  );

  const { data: dataPoints = [] } = trpc.dataPoints.list.useQuery(
    id,
    { enabled: id > 0 }
  );

  const { data: itemNames = [] } = trpc.cardItemNames.list.useQuery(
    id,
    { enabled: id > 0 }
  );

  // Mutations
  const utils = trpc.useUtils();
  const updateCardMutation = trpc.cards.update.useMutation();
  const addDataPointMutation = trpc.dataPoints.add.useMutation();
  const deleteDataPointMutation = trpc.dataPoints.delete.useMutation();
  const addCardItemNameMutation = trpc.cardItemNames.add.useMutation();

  // State
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [cardTitle, setCardTitle] = useState(card?.title || '');
  const [cardDescription, setCardDescription] = useState(card?.description || '');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area' | 'mixed'>(
    (card?.chartType as any) || 'bar'
  );
  const [yAxisMin, setYAxisMin] = useState<number | null>(null);
  const [yAxisMax, setYAxisMax] = useState<number | null>(null);
  const [barWidth, setBarWidth] = useState<number>(0.8);
  const [visibleItems, setVisibleItems] = useState<string[]>([]);
  const [visiblePeriods, setVisiblePeriods] = useState<string[]>([]);
  const [showPrediction, setShowPrediction] = useState(false);
  const [hideLabels, setHideLabels] = useState(false);
  const [showTotal, setShowTotal] = useState(false);
  const [periodOrder, setPeriodOrder] = useState<string[]>([]);
  const [hasUserSetOrder, setHasUserSetOrder] = useState(false);
  const [periodOrderInitialized, setPeriodOrderInitialized] = useState(false);
  const [updateFrequency, setUpdateFrequency] = useState<string>(card?.updateFrequency || 'none');
  const [updateStartDate, setUpdateStartDate] = useState<string>(
    card?.updateStartDate ? new Date(card.updateStartDate).toISOString().split('T')[0] : ''
  );
  const [isOverdue, setIsOverdue] = useState(false);

  // Calculate predicted data - generate a yearly summary for 115
  const predictedDataPoints = useMemo(() => {
    if (!dataPoints || dataPoints.length === 0) return [];

    // Extract all periods and find the latest year
    const periods = Array.from(new Set(dataPoints.map((dp: any) => String(dp.period))));
    const yearMatches = periods.map(p => {
      const match = String(p).match(/^(\d+)-(\d+)$/);
      return match ? { year: parseInt(match[1]), month: parseInt(match[2]), period: p } : null;
    }).filter(Boolean);

    if (yearMatches.length === 0) return [];

    // Find the latest year
    const latestYear = Math.max(...yearMatches.map((m: any) => m.year));
    const targetYear = latestYear; // Generate for latest year (e.g., 115)

    // Get all unique item names
    const itemNames = new Set(dataPoints.map((dp: any) => String(dp.itemName)));

    // Calculate yearly summary using formula: (latest_month_data / month_number) * 12
    const itemSummaries: { [key: string]: number } = {};

    dataPoints.forEach((dp: any) => {
      const dpMatch = String(dp.period).match(/^(\d+)-(\d+)$/);
      if (dpMatch && parseInt(dpMatch[1]) === latestYear) {
        const itemName = String(dp.itemName);
        const month = parseInt(dpMatch[2]);
        const value = parseFloat(String(dp.value)) || 0;
        // Use the latest month data and extrapolate to full year
        // Formula: (month_data / month_number) * 12
        itemSummaries[itemName] = (value / month) * 12;
      }
    });

    // Create yearly summary data point for each item
    const predictedPoints: any[] = [];
    itemNames.forEach(itemName => {
      const yearlyValue = itemSummaries[itemName] || 0;
      predictedPoints.push({
        itemName,
        period: `${targetYear}-全年`,
        value: yearlyValue.toString(),
        isPredicted: true,
      });
    });

    return predictedPoints;
  }, [dataPoints]);

  // Combine actual and predicted data
  const displayDataPoints = useMemo(() => {
    if (showPrediction) {
      return [...dataPoints, ...predictedDataPoints];
    }
    return dataPoints;
  }, [dataPoints, predictedDataPoints, showPrediction]);

  // Update card title when data loads
  React.useEffect(() => {
    if (card?.title) {
      setCardTitle(card.title);
    }
    if (card?.description) {
      setCardDescription(card.description);
    }
    if (card?.chartType) {
      setChartType(card.chartType as any);
    }
    if (card?.yAxisMin !== null && card?.yAxisMin !== undefined) {
      setYAxisMin(parseFloat(String(card.yAxisMin)));
    }
    if (card?.yAxisMax !== null && card?.yAxisMax !== undefined) {
      setYAxisMax(parseFloat(String(card.yAxisMax)));
    }
    if (card?.barWidth !== null && card?.barWidth !== undefined) {
      setBarWidth(parseFloat(String(card.barWidth)));
    }
    if (card?.visibleItems) {
      try {
        setVisibleItems(JSON.parse(card.visibleItems));
      } catch (e) {
        setVisibleItems([]);
      }
    }
    // CRITICAL: Load saved period order from database
    if (!card) return;

    if (card.periodOrder && card.periodOrder.trim() !== '') {
      try {
        const savedOrder = JSON.parse(card.periodOrder);

        if (Array.isArray(savedOrder) && savedOrder.length > 0) {

          setPeriodOrder(savedOrder);
          setHasUserSetOrder(true);
        } else {

          setPeriodOrder([]);
          setHasUserSetOrder(false);
        }
      } catch (e) {
        console.error('[CardDetail] Failed to parse period order:', e);
        setPeriodOrder([]);
        setHasUserSetOrder(false);
      }
    } else {

      setPeriodOrder([]);
      setHasUserSetOrder(false);
    }
    setPeriodOrderInitialized(true);
  }, [card]);

  // Build sorted item names list based on cardItemNames order
  const sortedItemNamesList = useMemo(() => {
    // Get ordered names from cardItemNames
    const orderedNames = [...itemNames]
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
      .map((item: any) => typeof item === 'string' ? item : item.name);

    // Also include any item names from dataPoints that aren't in cardItemNames
    const dataPointNames = new Set(dataPoints.map((dp: any) => String(dp.itemName)));
    const orderedSet = new Set(orderedNames);
    const extraNames = Array.from(dataPointNames).filter(name => !orderedSet.has(name));

    return [...orderedNames, ...extraNames];
  }, [itemNames, dataPoints]);

  // Calculate available periods first
  const availablePeriods = useMemo(() => {
    const dataToUse = showPrediction ? displayDataPoints : dataPoints;
    if (!dataToUse || dataToUse.length === 0) return [];
    return Array.from(new Set(dataToUse.map((dp: any) => String(dp.period))));
  }, [dataPoints, displayDataPoints, showPrediction]);
  
  // DEBUG: Log availablePeriods changes
  useEffect(() => {

  }, [availablePeriods, showPrediction]);

  // Calculate chartPeriods based on periodOrder and visiblePeriods
  const chartPeriods = useMemo(() => {
    let periods = availablePeriods;
    
    if (periodOrder.length > 0) {
      const orderedPeriods = periodOrder.filter(p => availablePeriods.includes(p));
      const remainingPeriods = availablePeriods.filter(p => !periodOrder.includes(p));
      
      if (showPrediction) {
        const statisticsPeriods = remainingPeriods.filter(p => p.includes('全年'));
        const otherPeriods = remainingPeriods.filter(p => !p.includes('全年'));
        periods = [...orderedPeriods, ...otherPeriods, ...statisticsPeriods];
      } else {
        periods = [...orderedPeriods, ...remainingPeriods];
      }
    }
    
    // Apply visible periods filter if set
    if (visiblePeriods && visiblePeriods.length > 0) {
      periods = periods.filter(p => visiblePeriods.includes(p));
    }
    
    return periods;
  }, [periodOrder, availablePeriods, showPrediction, visiblePeriods]);

  // DEBUG: Log chartPeriods changes
  useEffect(() => {

  }, [chartPeriods]);

  // Build chart data using sorted item names order and chartPeriods
  const chartData = useMemo(() => {

    const dataToUse = showPrediction ? displayDataPoints : dataPoints;
    if (!dataToUse || dataToUse.length === 0) return [];

    // Use sortedItemNamesList to maintain order
    const itemNamesInData = new Set(dataToUse.map((dp: any) => String(dp.itemName)));
    let orderedItemNames = sortedItemNamesList.filter(name => itemNamesInData.has(name));
    
    // Apply visible items filter if set
    if (visibleItems && visibleItems.length > 0) {
      orderedItemNames = orderedItemNames.filter(name => visibleItems.includes(name));
    }

    const data = orderedItemNames.map((itemName: string) => {
      const row: any = { name: itemName };
      chartPeriods.forEach((period: string) => {
        const dataPoint = dataToUse.find(
          (dp: any) => String(dp.itemName) === itemName && String(dp.period) === period
        );
        row[period] = dataPoint ? parseFloat(String(dataPoint.value)) : 0;
      });
      return row;
    });

    // Add total row if showTotal is true (always show, not filtered by visibleItems)
    if (showTotal) {
      const totalRow: any = { name: '合計' };
      chartPeriods.forEach((period: string) => {
        totalRow[period] = data.reduce((sum: number, row: any) => sum + (row[period] || 0), 0);
      });
      data.push(totalRow);

    }


    return data;
  }, [dataPoints, displayDataPoints, showPrediction, sortedItemNamesList, visibleItems, chartPeriods, visiblePeriods, showTotal]);


  const handleUpdateCard = async () => {
    if (!isAdmin) {
      alert('您沒有權限編輯卡片');
      return;
    }
    
    try {
      await updateCardMutation.mutateAsync({
        id,
        title: cardTitle,
        description: cardDescription || undefined,
        chartType,
        yAxisMin: yAxisMin !== null ? yAxisMin.toString() : undefined,
        yAxisMax: yAxisMax !== null ? yAxisMax.toString() : undefined,
        barWidth: barWidth.toString(),
        visibleItems: visibleItems.length > 0 ? JSON.stringify(visibleItems) : undefined,
        updateFrequency: updateFrequency !== 'none' ? (updateFrequency as 'monthly' | 'quarterly' | 'yearly') : undefined,
        updateStartDate: updateStartDate ? new Date(updateStartDate) : undefined,
      });
      setIsEditingCard(false);
      alert('卡片已更新');
    } catch (error) {
      alert('更新卡片失敗');
      console.error(error);
    }
  };





  const handleResetPeriodOrderToEmpty = async () => {
    try {

      await updateCardMutation.mutateAsync({
        id,
        periodOrder: '',
      });

      // CRITICAL: Do NOT invalidate cache
      // The local state is already updated
    } catch (error) {
      console.error('[CardDetail] Failed to save reset:', error);
    }
  };

  useEffect(() => {


  }, [periodOrder, hasUserSetOrder]);

  useEffect(() => {


  }, [chartPeriods, availablePeriods]);
  useEffect(() => {
    if (!card?.updateFrequency || card.updateFrequency === 'none') {
      setIsOverdue(false);
      return;
    }

    // Use updateStartDate if available, otherwise use lastUpdatedAt
    const baseDate = card?.updateStartDate ? new Date(card.updateStartDate) : (card?.lastUpdatedAt ? new Date(card.lastUpdatedAt) : null);
    
    if (!baseDate) {
      setIsOverdue(false);
      return;
    }

    const now = new Date();
    let dueDate = new Date(baseDate);
    if (card.updateFrequency === 'monthly') {
      dueDate.setMonth(dueDate.getMonth() + 1);
    } else if (card.updateFrequency === 'quarterly') {
      dueDate.setMonth(dueDate.getMonth() + 3);
    } else if (card.updateFrequency === 'yearly') {
      dueDate.setFullYear(dueDate.getFullYear() + 1);
    }
    setIsOverdue(now > dueDate);
  }, [card?.lastUpdatedAt, card?.updateFrequency, card?.updateStartDate]);

  const handleExportChart = async (format: 'png' | 'pdf') => {
    if (!chartRef.current) {
      alert('圖表未加載，請稍後重試');
      return;
    }
    
    try {
      // Clone the chart element to avoid OKLCH color compatibility issues
      const clonedElement = chartRef.current.cloneNode(true) as HTMLElement;
      
      // Remove all Tailwind classes to avoid OKLCH color parsing
      const removeOklchClasses = (element: HTMLElement) => {
        // Get all elements including the root
        const allElements = [element, ...Array.from(element.querySelectorAll('*'))] as HTMLElement[];
        allElements.forEach(el => {
          // Remove all classes that might contain OKLCH colors
          el.className = '';
          // Keep only essential inline styles for layout
          const style = el.getAttribute('style') || '';
          // Preserve essential styles but remove color-related ones
          const essentialStyles = style
            .split(';')
            .filter(s => {
              const prop = s.split(':')[0]?.trim().toLowerCase() || '';
              // Keep layout-related styles, remove color-related ones
              return prop && !['color', 'background', 'border', 'fill', 'stroke'].some(c => prop.includes(c));
            })
            .join(';');
          if (essentialStyles) {
            el.setAttribute('style', essentialStyles);
          } else {
            el.removeAttribute('style');
          }
        });
      };
      removeOklchClasses(clonedElement);
      
      // Create a temporary container with inline styles to avoid OKLCH colors
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.width = chartRef.current.offsetWidth + 'px';
      tempContainer.style.height = chartRef.current.offsetHeight + 'px';
      tempContainer.style.backgroundColor = '#ffffff';
      tempContainer.style.padding = '20px';
      tempContainer.appendChild(clonedElement);
      document.body.appendChild(tempContainer);
      
      // Wait a bit to ensure chart is fully rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(tempContainer, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        foreignObjectRendering: false,
        ignoreElements: (element: Element) => {
          // Ignore script and style tags
          return element.tagName === 'SCRIPT' || element.tagName === 'STYLE';
        },
      });
      
      // Clean up temporary container
      try {
        if (tempContainer.parentNode) {
          document.body.removeChild(tempContainer);
        }
      } catch (e) {
        // Container might already be removed
      }
      
      if (!canvas) {
        alert('無法生成圖表，請重試');
        return;
      }
      
      const fileName = `${card?.title || 'chart'}_${new Date().toISOString().split('T')[0]}`;
      
      if (format === 'png') {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `${fileName}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (format === 'pdf') {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'mm',
          format: 'a4',
        });
        
        const imgWidth = pdf.internal.pageSize.getWidth() - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
        pdf.save(`${fileName}.pdf`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('導出失敗，請重試');
    }
  };

  const handleSaveDataPoints = async (updatedPoints: any[]) => {
    // All authenticated users can manage data
    // Only admins can edit card metadata (title, chart type)
    
    try {
      // Delete all existing data points
      for (const point of dataPoints) {
        if (point.id) {
          await deleteDataPointMutation.mutateAsync(point.id);
        }
      }

      // Add new data points
      for (const point of updatedPoints) {
        await addDataPointMutation.mutateAsync({
          cardId: id,
          itemName: point.itemName.trim(),
          period: point.period.trim(),
          value: parseFloat(point.value).toString(),
          notes: point.notes?.trim() || undefined,
        });
      }

      // Auto-create cardItemNames for new item names that don't exist yet
      const newItemNames = new Set(updatedPoints.map((p: any) => p.itemName.trim()));
      const existingItemNames = new Set(itemNames.map((item: any) => typeof item === 'string' ? item : item.name));
      


      
      for (const itemName of Array.from(newItemNames)) {
        if (!existingItemNames.has(itemName)) {
          try {

            await addCardItemNameMutation.mutateAsync({
              cardId: id,
              name: itemName,
            });

          } catch (error) {
            console.error(`Error creating item name for ${itemName}:`, error);
          }
        }
      }

      // Refetch itemNames after creating new ones
      await utils.cardItemNames.list.invalidate(id);
      await utils.dataPoints.list.invalidate(id);

      alert('數據已保存');
    } catch (error) {
      console.error('Error saving data points:', error);
      alert('保存失敗，請重試');
    }
  };

  if (cardLoading) {
    return <div className="p-6">加載中...</div>;
  }

  if (!card) {
    return <div className="p-6">卡片不存在</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Notification Banner */}
      {showNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-8 py-4 rounded-lg shadow-2xl z-50 font-semibold text-lg animate-pulse">
          ✓ 排序已更新
        </div>
      )}
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={handleGoBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {source === 'watchlist' ? '返回我的關注' : '返回儀表板'}
      </Button>

      {/* Card Title Section */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">{cardTitle}</h1>
          {canEdit && (
            <Button onClick={() => setIsEditingCard(!isEditingCard)}>
              {isEditingCard ? '取消' : '編輯卡片'}
            </Button>
          )}
        </div>

        {isEditingCard && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium mb-2">卡片標題</label>
              <Input
                type="text"
                value={cardTitle}
                onChange={(e) => setCardTitle(e.target.value)}
                placeholder="輸入卡片標題"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">卡片說明</label>
              <Textarea
                value={cardDescription}
                onChange={(e) => setCardDescription(e.target.value)}
                placeholder="輸入卡片說明（可選，會顯示在圖表下方）"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">圖表類型</label>
              <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">柱狀圖</SelectItem>
                  <SelectItem value="line">折線圖</SelectItem>
                  <SelectItem value="area">面積圖</SelectItem>
                  <SelectItem value="mixed">混合圖</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Y 軸範圍（可選）</label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">最小值</label>
                  <Input
                    type="number"
                    value={yAxisMin ?? ''}
                    onChange={(e) => setYAxisMin(e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="自動計算"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">最大值</label>
                  <Input
                    type="number"
                    value={yAxisMax ?? ''}
                    onChange={(e) => setYAxisMax(e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="自動計算"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">留空則自動根據數據計算</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">柱體寶度</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={barWidth}
                  onChange={(e) => setBarWidth(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-medium w-12 text-right">{(barWidth * 100).toFixed(0)}%</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">調整柱體寶度，便於將圖表放入報告</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">更新頻率</label>
              <select 
                value={updateFrequency} 
                onChange={(e) => setUpdateFrequency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="none">不設置</option>
                <option value="monthly">一月</option>
                <option value="quarterly">一季</option>
                <option value="yearly">一年</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">設置更新頻率，超過期限時卡片背景會變成粉紅色</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">起算日期</label>
              <input
                type="date"
                value={updateStartDate}
                onChange={(e) => setUpdateStartDate(e.target.value)}
                disabled={updateFrequency === 'none'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-2">設置更新週期的起算日期，系統將根據此日期和更新頻率計算是否超期</p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleUpdateCard} className="bg-blue-500 hover:bg-blue-600">
                保存
              </Button>
              <Button onClick={() => setIsEditingCard(false)} variant="outline">
                取消
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Chart Preview */}
      <div className={`rounded-lg border p-6 ${
        isOverdue ? 'bg-pink-50 border-pink-300' : 'bg-white'
      }`}>
        {isOverdue && (
          <div className="mb-4 p-3 bg-pink-100 border border-pink-300 rounded text-pink-800 text-sm">
            ⚠️ 此卡片已超過更新期限，請及時更新數據
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">圖表預覽</h2>
            <p className="text-sm text-gray-500 mt-1">
              在下方「項目名稱管理」中拖曳項目可改變圖表排序
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExportChart('png')}
              className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
            >
              <Download size={16} />
              導出 PNG
            </button>
            <button
              onClick={() => handleExportChart('pdf')}
              className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
            >
              <Download size={16} />
              導出 PDF
            </button>
          </div>
        </div>
        <div ref={chartRef}>
          {chartData.length > 0 && chartPeriods.length > 0 ? (
            <GroupedBarChart
              data={chartData}
              periods={chartPeriods}
              yAxisMin={yAxisMin}
              yAxisMax={yAxisMax}
              barWidth={barWidth}
              visibleItems={visibleItems.length > 0 ? visibleItems : null}
              highlightPeriods={showPrediction ? [`${Math.max(...Array.from(new Set(dataPoints.map((dp: any) => String(dp.period)))).map(p => parseInt(String(p).split('-')[0])))}-全年`] : []}
              hideLabels={hideLabels}
            />
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
              <p className="text-gray-500">{chartPeriods.length === 0 ? '請先在下方設置年度排序' : '沒有數據，請在下方添加數據點'}</p>
            </div>
          )}
        </div>
        
        {/* Prediction checkbox - only show if we have data and periods set */}
        {chartData.length > 0 && chartPeriods.length > 0 && (
          <div className="mt-4 flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer px-3 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm">
              <input
                type="checkbox"
                checked={showPrediction}
                onChange={(e) => {

                  setShowPrediction(e.target.checked);
                  // Don't clear period order - keep user's manual sorting even when showing statistics
                }}
                className="w-4 h-4"
              />
              <span>顯示年度統計</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm">
              <input
                type="checkbox"
                checked={hideLabels}
                onChange={(e) => setHideLabels(e.target.checked)}
                className="w-4 h-4"
              />
              <span>隱藏數字標簽</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer px-3 py-2 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 text-sm">
              <input
                type="checkbox"
                checked={showTotal}
                onChange={(e) => setShowTotal(e.target.checked)}
                className="w-4 h-4"
              />
              <span>合計</span>
            </label>
          </div>
        )}
        
        {/* Card Description Display */}
        {cardDescription && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">卡片說明</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{cardDescription}</p>
          </div>
        )}
      </div>

      {/* Item Names Manager */}
      {canManageItems && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">項目名稱管理</h2>
          <p className="text-sm text-gray-500 mb-2">拖曳項目可改變圖表上的排序</p>
          <CardItemNamesManager cardId={id} />
          
          <div className="mt-6 pt-6 border-t">
            <label className="block text-sm font-medium mb-2">顯示的項目</label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-3 bg-gray-50">
              {sortedItemNamesList.length > 0 ? (
                sortedItemNamesList.map((itemName: string, index: number) => (
                  <label key={`${itemName}-${index}`} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleItems.includes(itemName)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setVisibleItems([...visibleItems, itemName]);
                        } else {
                          setVisibleItems(visibleItems.filter(item => item !== itemName));
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{itemName}</span>
                  </label>
                ))
              ) : (
                <p className="text-xs text-gray-500">沒有可用項目</p>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">不勾選任何項目時，將顯示所有項目</p>
          </div>
          
          <div className="mt-6 pt-6 border-t">
            <label className="block text-sm font-medium mb-2">年度排序</label>
            <p className="text-xs text-gray-500 mb-2">拖曳或使用上下按鈕調整年度顯示順序</p>
            <div className="space-y-2">
              {/* Quick Sort Buttons */}

              <PeriodOrderManager 
                periods={periodOrder.length > 0 ? periodOrder : availablePeriods}
                visiblePeriods={visiblePeriods}
                key={periodOrderInitialized ? 'initialized' : 'loading'} 
                onOrderChange={(newOrder) => {

                  setPeriodOrder(newOrder);
                  setHasUserSetOrder(true);
                  // Auto-save to database when order changes
                  if (isAdmin) {
                    const orderJson = JSON.stringify(newOrder);

                    updateCardMutation.mutateAsync({
                      id,
                      periodOrder: orderJson,
                    }).then(() => {

                      // Show notification
                      setShowNotification(true);
                      setTimeout(() => setShowNotification(false), 3000);
                      // Scroll to chart area
                      setTimeout(() => {
                        chartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 300);
                    }).catch((error) => {
                      console.error('[CardDetail] Failed to auto-save:', error);
                      alert('排序保存失敗，請重試');
                    });
                  }
                }}
                onUserSetOrder={() => {

                  setHasUserSetOrder(true);
                }}
                onVisibilityChange={(visiblePeriods) => {

                  setVisiblePeriods(visiblePeriods);
                }}
              />
              {canEdit && (
                <p className="text-xs text-green-600 text-center">調整排序後自動保存</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table Descriptions */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">表格說明</h2>
            <p className="text-sm text-gray-500 mt-1">
              {isAdmin ? '可新增、編輯表格說明，支援自由增減列欄' : '此卡片的表格說明'}
            </p>
          </div>
        </div>
        <CardTableEditor cardId={id} isAdmin={isAdmin} />
      </div>

      {/* Data Management Table - Main Data Entry Interface */}
      {canManageData && (
        <div className="bg-white rounded-lg border p-6">
          <DataManagementTable
            dataPoints={dataPoints.map(dp => ({
              id: dp.id?.toString(),
              itemName: dp.itemName,
              period: dp.period,
              value: dp.value,
              notes: dp.notes || undefined,
            }))}
            itemNames={itemNames.map((item: any) => typeof item === 'string' ? item : item.name)}
            onSave={handleSaveDataPoints}
            isReadOnly={!canEdit} // Only admins can edit data, others are read-only
          />
        </div>
      )}
    </div>
  );
};

export default CardDetail;
