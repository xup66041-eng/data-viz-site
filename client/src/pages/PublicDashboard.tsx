import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart3, Search, ArrowLeft } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { DashboardChartCard } from "@/components/DashboardChartCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";

export default function PublicDashboard() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Watchlist mutations (for public users, this won't work without auth)
  const addToWatchlistMutation = trpc.watchlist.add.useMutation();
  const removeFromWatchlistMutation = trpc.watchlist.remove.useMutation();
  const { data: watchlist = [] } = trpc.watchlist.list.useQuery(undefined, { enabled: false });
  const watchlistCardIds = new Set(watchlist.map((item: any) => item.cardId));

  // Query cards without authentication requirement
  const { data: cards = [], isLoading: cardsLoading } = trpc.cards.listPublic.useQuery(undefined, {
    enabled: true, // Allow public access
  });

  // Filter cards based on search query
  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return cards;
    const query = searchQuery.toLowerCase();
    return cards.filter((card) => 
      card.title.toLowerCase().includes(query) || 
      (card.description && card.description.toLowerCase().includes(query))
    );
  }, [cards, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">數據呈現平台</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button asChild>
              <a href={getLoginUrl()}>登入</a>
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">儀表板</h1>
            <p className="text-muted-foreground">瀏覽數據卡片和圖表</p>
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

        {/* Cards Grid */}
        {cardsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-lg" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">暫無卡片</p>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">未找到符合「{searchQuery}」的卡片</p>
            <Button variant="outline" onClick={() => setSearchQuery("")}>清除搜索</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCards.map((card) => (
              <DashboardChartCard 
                key={card.id} 
                card={card}
                onEdit={() => {}}
                onDelete={() => {}}
                DEFAULT_COLORS={['#3b82f6', '#ef4444', '#10b981']}
                isPublic={true}
                isInWatchlist={watchlistCardIds.has(card.id)}
                onAddToWatchlist={() => addToWatchlistMutation.mutate({ cardId: card.id })}
                onRemoveFromWatchlist={() => removeFromWatchlistMutation.mutate(card.id)}
                watchlistLoading={addToWatchlistMutation.isPending || removeFromWatchlistMutation.isPending}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
