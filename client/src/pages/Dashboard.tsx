import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Edit2, BarChart3, ArrowLeft, Search } from "lucide-react";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { TableDataImporter } from "@/components/TableDataImporter";
import { formatYearWithROC, formatDateShortROC } from "@/lib/dateUtils";
import { DashboardChartCard } from "@/components/DashboardChartCard";

interface EditingCard {
  id: number;
  title: string;
  description: string;
  chartType: "line" | "bar" | "area" | "mixed";
  categoryId: number | null;
  infoUrl?: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Helper function to calculate if a card is overdue
  const isCardOverdue = useCallback((card: any): boolean => {
    if (!card?.updateFrequency || card.updateFrequency === 'none') {
      return false;
    }

    // Use updateStartDate if available, otherwise use lastUpdatedAt
    const baseDate = card?.updateStartDate ? new Date(card.updateStartDate) : (card?.lastUpdatedAt ? new Date(card.lastUpdatedAt) : null);
    
    if (!baseDate) {
      return false;
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
    return now > dueDate;
  }, []);
  
  // Extract search query from URL parameters
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const initialSearchQuery = urlParams.get('search') || '';
  
  // Watchlist mutations
  const utils = trpc.useUtils();
  const addToWatchlistMutation = trpc.watchlist.add.useMutation({
    onSuccess: () => {
      utils.watchlist.list.invalidate();
    }
  });
  
  const removeFromWatchlistMutation = trpc.watchlist.remove.useMutation({
    onSuccess: () => {
      utils.watchlist.list.invalidate();
    }
  });
  
  const { data: watchlist = [] } = trpc.watchlist.list.useQuery();
  const watchlistCardIds = new Set(watchlist.map((item: any) => item.cardId));
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<EditingCard | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDataOpen, setIsAddDataOpen] = useState(false);
  const [isTableImportOpen, setIsTableImportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  const [createFormData, setCreateFormData] = useState({
    title: "",
    description: "",
    chartType: "line" as const,
    categoryId: "",
  });

  const [dataFormData, setDataFormData] = useState<{
    itemName: string;
    period: string;
    value: string;
    notes: string;
  }>({
    itemName: "",
    period: "",
    value: "",
    notes: "",
  });

  // Queries
  const { data: cards = [], refetch: refetchCards, isLoading: cardsLoading } = trpc.cards.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: categories = [] } = trpc.categories.list.useQuery(undefined, {
    enabled: !!user,
  });

  // Filter and sort cards based on search query
  const filteredCards = useMemo(() => {
    let result = cards;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = cards.filter((card) => 
        card.title.toLowerCase().includes(query) || 
        (card.description && card.description.toLowerCase().includes(query))
      );
    }
    // Sort by: 1) overdue status (overdue first), 2) creation time (newest first)
    return result.sort((a, b) => {
      const aOverdue = isCardOverdue(a);
      const bOverdue = isCardOverdue(b);
      
      if (aOverdue !== bOverdue) {
        return aOverdue ? -1 : 1;
      }
      
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [cards, searchQuery, isCardOverdue]);

  // Update URL when search query changes
  React.useEffect(() => {
    if (searchQuery) {
      const newUrl = `/dashboard?search=${encodeURIComponent(searchQuery)}`;
      if (location !== newUrl) {
        setLocation(newUrl);
      }
    }
  }, [searchQuery]);

  const { data: dataPoints = [], refetch: refetchDataPoints } = trpc.dataPoints.list.useQuery(editingCard?.id as number || 0, {
    enabled: !!editingCard,
  });

  const { data: cardItemNames = [], refetch: refetchCardItemNames } = trpc.cardItemNames.list.useQuery(editingCard?.id as number || 0, {
    enabled: !!editingCard,
  });

  // Mutations
  const createCardMutation = trpc.cards.create.useMutation({
    onSuccess: () => {
      toast.success("卡片已建立");
      setCreateFormData({ title: "", description: "", chartType: "line", categoryId: "" });
      setIsCreateDialogOpen(false);
      refetchCards();
    },
    onError: (error) => {
      toast.error(error.message || "建立卡片失敗");
    },
  });

  const updateCardMutation = trpc.cards.update.useMutation({
    onSuccess: () => {
      toast.success("卡片已更新");
      setIsEditDialogOpen(false);
      refetchCards();
    },
    onError: (error) => {
      toast.error(error.message || "更新卡片失敗");
    },
  });

  const deleteCardMutation = trpc.cards.delete.useMutation({
    onSuccess: () => {
      toast.success("卡片已刪除");
      refetchCards();
    },
    onError: (error) => {
      toast.error(error.message || "刪除卡片失敗");
    },
  });

  const addDataPointMutation = trpc.dataPoints.add.useMutation({
    onSuccess: () => {
      toast.success("數據點已新增");
      setDataFormData({ itemName: "", period: "", value: "", notes: "" });
      setIsAddDataOpen(false);
      refetchDataPoints();
    },
    onError: (error) => {
      toast.error(error.message || "新增數據點失敗");
    },
  });

  const deleteCardItemNameMutation = trpc.cardItemNames.delete.useMutation({
    onSuccess: () => {
      refetchCardItemNames();
    },
  });

  const deleteDataPointMutation = trpc.dataPoints.delete.useMutation({
    onSuccess: () => {
      toast.success("數據點已刪除");
      refetchDataPoints();
    },
    onError: (error) => {
      toast.error(error.message || "刪除數據點失敗");
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">請先登錄</h1>
          <p className="text-muted-foreground">您需要登錄才能使用儀表板</p>
        </div>
      </div>
    );
  }

  // Transform data for chart
  // X 軸：項目名稱，柱狀顏色：年度
  const chartData = (() => {
    if (!dataPoints || dataPoints.length === 0) return [];

    // Get unique periods and item names
    const periodsSet = new Set<string>();
    const itemNamesSet = new Set<string>();

    dataPoints.forEach((dp: any) => {
      if (dp.period) periodsSet.add(String(dp.period));
      if (dp.itemName) itemNamesSet.add(String(dp.itemName));
    });

    const periods = Array.from(periodsSet).sort();
    const itemNamesList = Array.from(itemNamesSet).sort();

    // Build chart data: X 軸為項目名稱，每個項目有多個柱子代表不同年度
    return itemNamesList.map((itemName: string) => {
      const row: any = { name: itemName };
      periods.forEach((period: string) => {
        const dataPoint = dataPoints.find(
          (dp: any) => String(dp.itemName) === itemName && String(dp.period) === period
        );
        row[period] = dataPoint ? parseFloat(String(dataPoint.value)) : 0;
      });
      return row;
    });
  })();

  // Get unique periods for rendering bars
  const periods = (() => {
    if (!dataPoints || dataPoints.length === 0) return [];
    const periodsSet = new Set<string>();
    dataPoints.forEach((dp: any) => {
      if (dp.period) periodsSet.add(String(dp.period));
    });
    return Array.from(periodsSet).sort();
  })();

  const DEFAULT_COLORS = ['#3b82f6', '#ef4444', '#84cc16', '#f59e0b', '#8b5cf6'];

  const renderChart = () => {
    if (!editingCard || chartData.length === 0) return null;

    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 0, bottom: 100 },
    };

    const renderCustomLabel = (props: any) => {
      const { x, y, width, height, value } = props;
      if (value === 0 || value === undefined) return undefined;
      return (
        <text
          x={x + width / 2}
          y={y - 5}
          fill="#000"
          textAnchor="middle"
          fontSize={12}
          fontWeight="bold"
        >
          {value}
        </text>
      );
    };

    switch (editingCard.chartType) {
      case "line":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              {periods.map((period, index) => (
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
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              {periods.map((period, index) => (
                <Bar
                  key={`${period}-${index}`}
                  dataKey={period}
                  fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                  name={period}
                  label={renderCustomLabel as any}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      case "area":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              {periods.map((period, index) => (
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
      case "mixed":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              {periods.map((period, index) => {
                if (index % 2 === 0) {
                  return (
                    <Bar
                      key={`${period}-${index}`}
                      dataKey={period}
                      fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                      name={period}
                      label={renderCustomLabel as any}
                    />
                  );
                }
                return null;
              })}
            </BarChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">儀表板</h1>
            <p className="text-muted-foreground">管理您的數據卡片和圖表</p>
          </div>
          <Button
            variant="ghost"
            onClick={() => setLocation('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            回首頁
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-6 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索卡片標題或描述..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <span className="text-sm text-muted-foreground">
              找到 {filteredCards.length} 個結果
            </span>
          )}
        </div>

        {/* Create Card Dialog */}
        {user?.role === 'admin' && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mb-6 gap-2">
                <Plus className="h-4 w-4" />
                新增卡片
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>建立新卡片</DialogTitle>
              <DialogDescription>填寫卡片信息以建立新的數據追蹤卡片</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">卡片標題</Label>
                <Input
                  id="title"
                  placeholder="例如：月度銷售"
                  value={createFormData.title}
                  onChange={(e) => setCreateFormData({ ...createFormData, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  placeholder="卡片描述"
                  value={createFormData.description}
                  onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="chartType">圖表類型</Label>
                <Select value={createFormData.chartType} onValueChange={(value: any) => setCreateFormData({ ...createFormData, chartType: value })}>
                  <SelectTrigger id="chartType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">折線圖</SelectItem>
                    <SelectItem value="bar">柱狀圖</SelectItem>
                    <SelectItem value="area">面積圖</SelectItem>
                    <SelectItem value="mixed">混合圖</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category">分類（可選）</Label>
                <Select value={createFormData.categoryId} onValueChange={(value) => setCreateFormData({ ...createFormData, categoryId: value })}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="選擇分類" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() =>
                  createCardMutation.mutate({
                    title: createFormData.title,
                    description: createFormData.description,
                    chartType: createFormData.chartType,
                    categoryId: createFormData.categoryId ? parseInt(createFormData.categoryId) : undefined,
                  })
                }
                disabled={!createFormData.title || createCardMutation.isPending}
                className="w-full"
              >
                {createCardMutation.isPending ? "建立中..." : "建立卡片"}
              </Button>
            </div>
          </DialogContent>
          </Dialog>
        )}

        {/* Edit Card Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>編輯卡片</DialogTitle>
              <DialogDescription>編輯卡片信息和數據</DialogDescription>
            </DialogHeader>

            {editingCard && (
              <div className="space-y-6">
                {/* Card Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold">卡片信息</h3>
                  <div>
                    <Label htmlFor="edit-title">標題</Label>
                    <Input
                      id="edit-title"
                      value={editingCard.title}
                      onChange={(e) => setEditingCard({ ...editingCard, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-description">描述</Label>
                    <Textarea
                      id="edit-description"
                      value={editingCard.description}
                      onChange={(e) => setEditingCard({ ...editingCard, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-chartType">圖表類型</Label>
                    <Select value={editingCard.chartType} onValueChange={(value: any) => setEditingCard({ ...editingCard, chartType: value })}>
                      <SelectTrigger id="edit-chartType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="line">折線圖</SelectItem>
                        <SelectItem value="bar">柱狀圖</SelectItem>
                        <SelectItem value="area">面積圖</SelectItem>
                        <SelectItem value="mixed">混合圖</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-infoUrl">網站說明連結</Label>
                    <Input
                      id="edit-infoUrl"
                      placeholder="https://example.com"
                      value={editingCard.infoUrl || ""}
                      onChange={(e) => setEditingCard({ ...editingCard, infoUrl: e.target.value })}
                    />
                  </div>
                  <Button
                    onClick={() =>
                      updateCardMutation.mutate({
                        id: editingCard.id,
                        title: editingCard.title,
                        description: editingCard.description,
                        chartType: editingCard.chartType,
                        categoryId: editingCard.categoryId || undefined,
                        infoUrl: editingCard.infoUrl || undefined,
                      })
                    }
                    disabled={updateCardMutation.isPending}
                    className="w-full"
                  >
                    {updateCardMutation.isPending ? "保存中..." : "保存卡片信息"}
                  </Button>
                </div>

                {/* Statistics */}


                {/* Chart Preview */}
                {chartData.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">圖表預覽</h3>
                    {renderChart()}
                  </div>
                )}

                {/* Data Points */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">數據點</h3>
                    <div className="flex gap-2">
                      <Dialog open={isAddDataOpen} onOpenChange={setIsAddDataOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="gap-2">
                            <Plus className="h-3 w-3" />
                            新增數據
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>新增數據點</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="itemName">項目名稱</Label>
                              <Select value={dataFormData.itemName} onValueChange={(value) => setDataFormData({ ...dataFormData, itemName: value })}>
                                <SelectTrigger id="itemName">
                                  <SelectValue placeholder="選擇項目名稱" />
                                </SelectTrigger>
                                <SelectContent>
                                  {editingCard && editingCard.id && (() => {
                                    const card = cards.find((c: any) => c.id === editingCard.id);
                                    const itemNames = card?.itemNames ? JSON.parse(card.itemNames) : [];
                                    return itemNames.map((name: string, idx: number) => (
                                      <SelectItem key={`${name}-${idx}`} value={name}>
                                        {name}
                                      </SelectItem>
                                    ));
                                  })()}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="period">年度</Label>
                              <Input
                                id="period"
                                type="text"
                                placeholder="例如：113 或 113-02"
                                value={dataFormData.period}
                                onChange={(e) => setDataFormData({ ...dataFormData, period: e.target.value })}
                              />
                            </div>

                            <div>
                              <Label htmlFor="value">數值</Label>
                              <Input
                                id="value"
                                type="number"
                                placeholder="輸入數值"
                                value={dataFormData.value}
                                onChange={(e) => setDataFormData({ ...dataFormData, value: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="notes">備註</Label>
                              <Textarea
                                id="notes"
                                placeholder="備註（可選）"
                                value={dataFormData.notes}
                                onChange={(e) => setDataFormData({ ...dataFormData, notes: e.target.value })}
                              />
                            </div>
                            <Button
                              onClick={() =>
                                addDataPointMutation.mutate({
                                  itemName: dataFormData.itemName || "未命名",
                                  period: dataFormData.period || "未設定",
                                  cardId: editingCard.id,
                                  value: dataFormData.value,
                                  notes: dataFormData.notes,
                                })
                              }
                              disabled={!dataFormData.value || addDataPointMutation.isPending}
                              className="w-full"
                            >
                              {addDataPointMutation.isPending ? "新增中..." : "新增數據點"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={isTableImportOpen} onOpenChange={setIsTableImportOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="gap-2">
                            <BarChart3 className="h-3 w-3" />
                            表格導入
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>表格數據導入</DialogTitle>
                          </DialogHeader>
                          <TableDataImporter
                            onImport={async (data) => {
                              try {
                                // Always delete old data points (rows) first
                                if (dataPoints.length > 0) {
                                  for (const dp of dataPoints) {
                                    await deleteDataPointMutation.mutateAsync(dp.id);
                                  }
                                }
                                // Always delete old card item names (columns) first
                                if (cardItemNames.length > 0) {
                                  for (const cin of cardItemNames) {
                                    await deleteCardItemNameMutation.mutateAsync(cin.id);
                                  }
                                }
                                // Now add new data points
                                for (const dp of data) {
                                  await addDataPointMutation.mutateAsync({
                                    itemName: String(dp.itemName || "未命名"),
                                    period: String(dp.period || "未設定"),
                                    cardId: editingCard.id,
                                    value: String(dp.value),
                                    notes: "",
                                  });
                                }
                                setIsTableImportOpen(false);
                                await refetchDataPoints();
                                await refetchCardItemNames();
                                toast.success("數據導入成功");
                              } catch (error) {
                                toast.error("數據導入失敗: " + (error instanceof Error ? error.message : "未知錯誤"));
                              }
                            }}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  {/* Data Points List */}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {dataPoints.map((dp) => (
                      <div key={dp.id} className="flex justify-between items-center p-2 bg-muted rounded">
                        <div className="text-sm">
                          <div className="font-medium">{dp.itemName} ({dp.period})</div>
                          <div className="text-muted-foreground font-semibold">{dp.value}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteDataPointMutation.mutate(dp.id)}
                          disabled={deleteDataPointMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Close Button */}
                <Button onClick={() => setIsEditDialogOpen(false)} className="w-full" variant="outline">
                  關閉
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cardsLoading ? (
            <div className="col-span-full text-center text-muted-foreground">加載中...</div>
          ) : cards.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground">還沒有卡片，點擊「新增卡片」開始</div>
          ) : filteredCards.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground">
              <p className="mb-4">未找到符合「{searchQuery}」的卡片</p>
              <Button variant="outline" onClick={() => setSearchQuery("")}>清除搜索</Button>
            </div>
          ) : (
            filteredCards.map((card) => (
              <DashboardChartCard
                key={card.id}
                card={card}
                onEdit={() => {
                  setEditingCard({
                    id: card.id,
                    title: card.title || "",
                    description: card.description || "",
                    chartType: (card.chartType as "line" | "bar" | "area" | "mixed") || "line",
                    categoryId: card.categoryId || null,
                    infoUrl: (card as any).infoUrl || "",
                  });
                  setIsEditDialogOpen(true);
                }}
                onDelete={() => {
                  if (confirm("確定要刪除這個卡片嗎？")) {
                    deleteCardMutation.mutate(card.id);
                  }
                }}
                deleteLoading={deleteCardMutation.isPending}
                DEFAULT_COLORS={DEFAULT_COLORS}
                canEdit={user?.role === 'admin'}
                isInWatchlist={watchlistCardIds.has(card.id)}
                onAddToWatchlist={() => addToWatchlistMutation.mutate({ cardId: card.id })}
                onRemoveFromWatchlist={() => removeFromWatchlistMutation.mutate(card.id)}
                watchlistLoading={false}
                isOverdue={isCardOverdue(card)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
