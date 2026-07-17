import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Edit2, Tag, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

const COLOR_OPTIONS = [
  { name: "紫色", value: "#6366f1" },
  { name: "藍色", value: "#3b82f6" },
  { name: "青色", value: "#06b6d4" },
  { name: "綠色", value: "#10b981" },
  { name: "黃色", value: "#f59e0b" },
  { name: "紅色", value: "#ef4444" },
  { name: "粉紅", value: "#ec4899" },
  { name: "灰色", value: "#6b7280" },
];

export default function Categories() {
  const [, setLocation] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#6366f1",
  });

  // Queries
  const { data: categories = [], isLoading, refetch } = trpc.categories.list.useQuery();

  // Mutations
  const createMutation = trpc.categories.create.useMutation({
    onSuccess: () => {
      toast.success("分類建立成功");
      setFormData({ name: "", description: "", color: "#6366f1" });
      setIsCreateOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "建立分類失敗");
    },
  });

  const deleteMutation = trpc.categories.delete.useMutation({
    onSuccess: () => {
      toast.success("分類已刪除");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "刪除分類失敗");
    },
  });

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error("請輸入分類名稱");
      return;
    }

    createMutation.mutate({
      name: formData.name,
      description: formData.description,
      color: formData.color,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("確定要刪除此分類嗎？")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">分類管理</h1>
            <p className="mt-2 text-muted-foreground">組織和管理您的數據分類</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setLocation('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              回首頁
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  新增分類
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>建立新分類</DialogTitle>
                  <DialogDescription>為您的數據卡片建立新的分類標籤</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">分類名稱 *</Label>
                    <Input
                      id="name"
                      placeholder="例如：銷売數據"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">描述</Label>
                    <Textarea
                      id="description"
                      placeholder="分類的詳細描述"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>顏色</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {COLOR_OPTIONS.map((color) => (
                        <button
                          key={color.value}
                          className={`h-10 rounded-lg border-2 transition-all ${
                            formData.color === color.value ? "border-ring" : "border-border"
                          }`}
                          style={{ backgroundColor: color.value }}
                          onClick={() => setFormData({ ...formData, color: color.value })}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
                    {createMutation.isPending ? "建立中..." : "建立分類"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Categories Grid */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="skeleton-elegant h-40" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Tag className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-center text-muted-foreground">還沒有分類，點擊「新增分類」開始吧</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid-cards">
            {categories.map((category) => (
              <Card key={category.id} className="card-elegant-hover">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: category.color || "#6366f1" }}
                        />
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                      </div>
                      {category.description && (
                        <CardDescription className="mt-2">{category.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
