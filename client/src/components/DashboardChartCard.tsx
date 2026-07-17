import { useMemo, useCallback, memo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Settings, ExternalLink, Heart } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface DashboardChartCardProps {
  card: {
    id: number;
    title: string;
    description: string | null;
    chartType: "line" | "bar" | "area" | "mixed" | null;
    infoUrl?: string | null;
    yAxisMin?: number | string | null;
    yAxisMax?: number | string | null;
    barWidth?: number | string | null;
    visibleItems?: string | null;
    periodOrder?: string | null;
    updateFrequency?: string | null;
    updateStartDate?: Date | null;
    lastUpdatedAt?: Date | null;
  };
  onEdit: () => void;
  onDelete: () => void;
  deleteLoading?: boolean;
  DEFAULT_COLORS: string[];
  isPublic?: boolean;
  canEdit?: boolean;
  isInWatchlist?: boolean;
  onAddToWatchlist?: () => void;
  onRemoveFromWatchlist?: () => void;
  watchlistLoading?: boolean;
  isOverdue?: boolean;
}

export function DashboardChartCard({
  card,
  onEdit,
  onDelete,
  deleteLoading = false,
  DEFAULT_COLORS,
  isPublic = false,
  canEdit = true,
  isInWatchlist = false,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  watchlistLoading = false,
  isOverdue = false,
}: DashboardChartCardProps) {
  // Ensure card has infoUrl property
  const cardWithInfo = {
    ...card,
    infoUrl: (card as any).infoUrl || null,
  };
  
  // Parse Y axis values
  const yAxisMin = card.yAxisMin !== null && card.yAxisMin !== undefined ? parseFloat(String(card.yAxisMin)) : null;
  const yAxisMax = card.yAxisMax !== null && card.yAxisMax !== undefined ? parseFloat(String(card.yAxisMax)) : null;
  
  // Parse bar width value
  const barWidth = card.barWidth !== null && card.barWidth !== undefined ? parseFloat(String(card.barWidth)) : 0.8;
  
  // Parse visible items
  const visibleItems = card.visibleItems ? JSON.parse(card.visibleItems) : null;
  const [, setLocation] = useLocation();
  
  // Optimize watchlist button click handlers with useCallback
  const handleWatchlistClick = useCallback(() => {
    if (isInWatchlist) {
      onRemoveFromWatchlist?.();
    } else {
      onAddToWatchlist?.();
    }
  }, [isInWatchlist, onAddToWatchlist, onRemoveFromWatchlist]);
  
  // Query data points for this specific card
  const { data: cardDataPoints = [] } = isPublic 
    ? trpc.dataPoints.listPublic.useQuery(card.id)
    : trpc.dataPoints.list.useQuery(card.id);

  // Query item names for sort order
  const { data: cardItemNames = [] } = isPublic
    ? trpc.cardItemNames.listPublic.useQuery(card.id)
    : trpc.cardItemNames.list.useQuery(card.id);

  // Build sorted item names list based on cardItemNames order
  const sortedItemNamesList = useMemo(() => {
    const orderedNames = [...cardItemNames]
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
      .map((item: any) => typeof item === 'string' ? item : item.name);

    const dataPointNames = new Set(cardDataPoints.map((dp: any) => String(dp.itemName)));
    const orderedSet = new Set(orderedNames);
    const extraNames = Array.from(dataPointNames).filter(name => !orderedSet.has(name));

    return [...orderedNames, ...extraNames];
  }, [cardItemNames, cardDataPoints]);

  // Calculate available periods from data
  const availablePeriods = useMemo(() => {
    if (!cardDataPoints || cardDataPoints.length === 0) return [];
    const periodsSet = new Set<string>();
    cardDataPoints.forEach((dp: any) => {
      if (dp.period) periodsSet.add(String(dp.period));
    });
    return Array.from(periodsSet);
  }, [cardDataPoints]);

  // Parse periodOrder from card
  const periodOrder = useMemo(() => {
    if (!(card as any).periodOrder) return [];
    try {
      const parsed = JSON.parse((card as any).periodOrder);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }, [(card as any).periodOrder]);

  // Calculate chartPeriods respecting periodOrder (same logic as CardDetail)
  const chartPeriods = useMemo(() => {
    if (periodOrder.length > 0) {
      const orderedPeriods = periodOrder.filter(p => availablePeriods.includes(p));
      const remainingPeriods = availablePeriods.filter(p => !periodOrder.includes(p));
      return [...orderedPeriods, ...remainingPeriods];
    }
    return availablePeriods;
  }, [periodOrder, availablePeriods]);

  // Transform data for chart using sorted order
  const chartData = useMemo(() => {
    if (!cardDataPoints || cardDataPoints.length === 0) return [];

    const periods = chartPeriods;

    const itemNamesInData = new Set(cardDataPoints.map((dp: any) => String(dp.itemName)));
    let orderedItemNames = sortedItemNamesList.filter(name => itemNamesInData.has(name));
    
    // Filter by visible items if set
    if (visibleItems && visibleItems.length > 0) {
      orderedItemNames = orderedItemNames.filter((name: string) => visibleItems.includes(name));
    }

    return orderedItemNames.map((itemName: string) => {
      const row: any = { name: itemName };
      periods.forEach((period: string) => {
        const dataPoint = cardDataPoints.find(
          (dp: any) => String(dp.itemName) === itemName && String(dp.period) === period
        );
        row[period] = dataPoint ? parseFloat(String(dataPoint.value)) : 0;
      });
      return row;
    });
  }, [cardDataPoints, sortedItemNamesList, visibleItems, chartPeriods]);

  // DEBUG: Log chartPeriods changes
  useEffect(() => {
    console.log('[DashboardChartCard] chartPeriods:', chartPeriods, 'periodOrder:', periodOrder);
  }, [chartPeriods, periodOrder]);

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          暫無數據
        </div>
      );
    }

    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 0, bottom: 100 },
    };

    switch (card.chartType) {
      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 20, fontWeight: 700 }} />
              <YAxis
                domain={[
                  yAxisMin !== null ? yAxisMin : 0,
                  yAxisMax !== null ? yAxisMax : 'dataMax + 10%'
                ]}
              />
              <Tooltip />
              <Legend />
              {chartPeriods.map((period, index) => (
                <Line
                  key={`${period}-${index}`}
                  type="monotone"
                  dataKey={period}
                  stroke={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                  name={period}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      case "mixed":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 20, fontWeight: 700 }} />
              <YAxis
                domain={[
                  yAxisMin !== null ? yAxisMin : 0,
                  yAxisMax !== null ? yAxisMax : 'dataMax + 10%'
                ]}
              />
              <Tooltip />
              <Legend />
              {chartPeriods.map((period, index) => (
                <Bar
                  key={`${period}-${index}`}
                  dataKey={period}
                  fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                  name={period}
                  barSize={barWidth * 100}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      case "area":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 20, fontWeight: 700 }} />
              <YAxis
                domain={[
                  yAxisMin !== null ? yAxisMin : 0,
                  yAxisMax !== null ? yAxisMax : 'dataMax + 10%'
                ]}
              />
              <Tooltip />
              <Legend />
              {chartPeriods.map((period, index) => (
                <Area
                  key={`${period}-${index}`}
                  type="monotone"
                  dataKey={period}
                  fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                  stroke={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                  name={period}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 20, fontWeight: 700 }} />
              <YAxis
                domain={[
                  yAxisMin !== null ? yAxisMin : 0,
                  yAxisMax !== null ? yAxisMax : 'dataMax + 10%'
                ]}
              />
              <Tooltip />
              <Legend />
              {chartPeriods.map((period, index) => (
                <Bar
                  key={`${period}-${index}`}
                  dataKey={period}
                  fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                  name={period}
                  barSize={barWidth * 100}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Card className={`hover:shadow-xl transition-all duration-300 border-l-4 ${
      isOverdue 
        ? 'border-l-red-500 bg-gradient-to-br from-red-50 via-card to-red-50/30 hover:border-l-red-600 hover:shadow-lg hover:shadow-red-200/50' 
        : 'border-l-primary bg-gradient-to-br from-card via-card to-accent/5 hover:border-l-accent'
    }`}>
      <CardHeader className={`pb-3 ${
        isOverdue 
          ? 'bg-gradient-to-r from-red-100/50 via-transparent to-red-50/30' 
          : 'bg-gradient-to-r from-primary/5 via-transparent to-accent/5'
      }`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className={`text-lg ${
              isOverdue
                ? 'text-red-700 font-semibold'
                : 'bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent'
            }`}>
              {isOverdue && <span className="mr-2">⚠️</span>}
              {cardWithInfo.title}
            </CardTitle>
            <CardDescription className="line-clamp-1 text-xs text-muted-foreground/80">{cardWithInfo.description}</CardDescription>
          </div>
          <div className="flex gap-1">
            {/* Add to Watchlist button */}
            {(onAddToWatchlist || onRemoveFromWatchlist) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleWatchlistClick}
                disabled={watchlistLoading}
                title={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                className={isInWatchlist ? 'text-red-500 hover:text-red-600 hover:bg-red-50' : 'hover:text-primary hover:bg-primary/10'}
              >
                <Heart className={`h-4 w-4 transition-all ${isInWatchlist ? 'fill-red-500' : ''}`} />
              </Button>
            )}
            {/* Website info link button */}
            {cardWithInfo.infoUrl && (
              <Button size="sm" variant="ghost" asChild title="Website Info">
                <a href={cardWithInfo.infoUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
            {/* Manage Data button - always visible for authenticated users */}
            <Button size="sm" variant="ghost" onClick={() => setLocation(`/card/${cardWithInfo.id}`)} title="Manage Data" className="hover:text-accent hover:bg-accent/10">
              <Settings className="h-4 w-4" />
            </Button>
            {/* Edit and Delete buttons - only for admins */}
            {canEdit && (
              <>
                <Button size="sm" variant="ghost" onClick={onEdit} title="Edit Card" className="hover:text-secondary hover:bg-secondary/10">
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={onDelete} disabled={deleteLoading} title="Delete Card" className="hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 pb-4 bg-gradient-to-b from-transparent to-accent/3">{renderChart()}</CardContent>
    </Card>
  );
}
