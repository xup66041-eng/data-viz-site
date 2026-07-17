import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { Plus, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { DashboardChartCard } from "@/components/DashboardChartCard";

export default function Watchlist() {
  const [, setLocation] = useLocation();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set());

  // Queries
  const { data: watchlist = [], refetch: refetchWatchlist } = trpc.watchlist.list.useQuery();
  const { data: allCards = [] } = trpc.cards.list.useQuery();
  
  // Mutations
  const addToWatchlistMutation = trpc.watchlist.add.useMutation({
    onSuccess: () => {
      toast.success("已新增到關注清單");
      setSelectedCards(new Set());
      setIsAddOpen(false);
      refetchWatchlist();
    },
    onError: (error) => {
      toast.error(error.message || "新增失敗");
    },
  });

  const removeFromWatchlistMutation = trpc.watchlist.remove.useMutation({
    onSuccess: () => {
      toast.success("已從關注清單移除");
      refetchWatchlist();
    },
    onError: (error) => {
      toast.error(error.message || "移除失敗");
    },
  });

  // Get watched cards with data
  const watchedCardsWithData = useMemo(() => {
    return watchlist
      .map((w) => {
        const card = allCards.find((c) => c.id === w.cardId);
        return { ...w, card };
      })
      .filter((w) => w.card);
  }, [watchlist, allCards]);

  // Get available cards for adding
  const availableCards = useMemo(() => {
    return allCards.filter((c) => !watchlist.some((w) => w.cardId === c.id));
  }, [allCards, watchlist]);



  const handleViewDetails = (cardId: number) => {
    setLocation(`/card/${cardId}?from=watchlist`);
  };

  const handleToggleCard = (cardId: number) => {
    const newSelected = new Set(selectedCards);
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId);
    } else {
      newSelected.add(cardId);
    }
    setSelectedCards(newSelected);
  };

  const handleAddSelected = () => {
    if (selectedCards.size === 0) {
      toast.error("請選擇至少一個卡片");
      return;
    }

    selectedCards.forEach((cardId) => {
      addToWatchlistMutation.mutate({ cardId });
    });
  };

  const handleRemove = (cardId: number) => {
    removeFromWatchlistMutation.mutate(cardId);
  };

  const DEFAULT_COLORS = ['#3b82f6', '#ef4444', '#84cc16', '#f59e0b', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">我的關注</h1>
            <p className="mt-2 text-muted-foreground">自定義您的個人化儀表板</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setLocation('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              回首業
            </Button>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  新增卡片
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新增卡片到關注</DialogTitle>
                  <DialogDescription>
                    選擇要新增到關注清單的卡片
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {availableCards.length > 0 ? (
                    availableCards.map((card) => (
                      <div key={card.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`card-${card.id}`}
                          checked={selectedCards.has(card.id)}
                          onCheckedChange={() => handleToggleCard(card.id)}
                        />
                        <label htmlFor={`card-${card.id}`} className="cursor-pointer">
                          {card.title}
                        </label>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">所有卡片都已在關注清單中</p>
                  )}
                  <Button
                    onClick={handleAddSelected}
                    disabled={selectedCards.size === 0 || addToWatchlistMutation.isPending}
                    className="w-full"
                  >
                    新增選中的卡片
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Watchlist Cards */}
        {watchedCardsWithData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {watchedCardsWithData.map((item) => (
              item.card && (
                <DashboardChartCard
                  key={item.id}
                  card={item.card}
                  onEdit={() => {
                    // Edit is not available in watchlist view
                  }}
                  onDelete={() => handleRemove(item.cardId)}
                  deleteLoading={removeFromWatchlistMutation.isPending}
                  DEFAULT_COLORS={DEFAULT_COLORS}
                  canEdit={false}
                  isInWatchlist={true}
                  onRemoveFromWatchlist={() => handleRemove(item.cardId)}
                  watchlistLoading={removeFromWatchlistMutation.isPending}
                />
              )
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 py-12">
            <p className="text-muted-foreground">還沒有關注任何卡片</p>
            <Button onClick={() => setIsAddOpen(true)} className="mt-4">
              新增第一個卡片
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
