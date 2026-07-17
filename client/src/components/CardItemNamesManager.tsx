import { useState, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Trash2, Plus, Edit2, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CardItemNamesManagerProps {
  cardId: number;
}

interface ItemNameData {
  id: number;
  name: string;
  order?: number | null;
}

// 可排序的項目組件
const SortableItemName = ({
  item,
  onEdit,
  onDelete,
}: {
  item: ItemNameData;
  onEdit: (item: ItemNameData) => void;
  onDelete: (id: number) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(item.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 bg-gray-50 rounded border ${
        isDragging ? 'bg-blue-50 border-blue-300 shadow-lg' : ''
      }`}
    >
      <div className="flex items-center gap-3 flex-1">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing hover:text-blue-500 transition-colors touch-none"
          title="拖拽排序"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5 text-gray-400" />
        </button>
        <span className="text-sm flex-1">{item.name}</span>
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(item)}
          className="h-8 w-8 p-0"
          title="編輯"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(item.id)}
          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
          title="刪除"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export const CardItemNamesManager: React.FC<CardItemNamesManagerProps> = ({ cardId }) => {
  const { data: itemNames = [] } = trpc.cardItemNames.list.useQuery(cardId);
  const addMutation = trpc.cardItemNames.add.useMutation();
  const deleteMutation = trpc.cardItemNames.delete.useMutation();
  const updateMutation = trpc.cardItemNames.update.useMutation();
  const batchSaveOrderMutation = trpc.cardItemNames.batchSaveOrder.useMutation();
  const utils = trpc.useUtils();

  const [isOpen, setIsOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [editingItem, setEditingItem] = useState<ItemNameData | null>(null);
  const [editingName, setEditingName] = useState('');
  const [localItems, setLocalItems] = useState<ItemNameData[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // 使用 ref 追蹤是否正在拖曳，避免 useEffect 重置 localItems
  const isDraggingRef = useRef(false);
  // 追蹤是否有待保存的排序變更
  const pendingSaveRef = useRef(false);

  // 初始化及同步外部數據到本地狀態
  // 在拖曳過程中不同步，防止打斷用戶操作
  useEffect(() => {
    if (!isDraggingRef.current) {
      const sortedItems = [...itemNames].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setLocalItems(sortedItems);
    }
  }, [itemNames]);

  // 拖拽傳感器配置 - 增加 activationConstraint 避免誤觸
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 至少移動 5px 才觸發拖曳
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 拖曳開始：鎖定本地狀態，防止 useEffect 重置
  const handleDragStart = (_event: DragStartEvent) => {
    isDraggingRef.current = true;
  };

  // 拖曳結束：更新本地狀態，然後批量保存到資料庫
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    // 先解除鎖定標誌（但在 async 操作前）
    isDraggingRef.current = false;

    if (!over || active.id === over.id) {
      return;
    }

    const activeId = Number(active.id);
    const overId = Number(over.id);
    const oldIndex = localItems.findIndex((item) => item.id === activeId);
    const newIndex = localItems.findIndex((item) => item.id === overId);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const newItems = arrayMove(localItems, oldIndex, newIndex);

    // 立即更新本地 UI（樂觀更新）
    setLocalItems(newItems);

    // 批量保存到資料庫（包含臨時記錄的處理）
    setIsSaving(true);
    try {
      await batchSaveOrderMutation.mutateAsync({
        cardId,
        items: newItems.map((item, index) => ({
          id: item.id,
          name: item.name,
          order: index,
        })),
      });

      // 保存成功後，用新數據更新快取（不觸發 useEffect 重置）
      // 使用 setQueryData 直接更新快取，避免重新 fetch 導致亂跳
      utils.cardItemNames.list.setData(cardId, (old) => {
        if (!old) return old;
        // 根據新順序重新排列快取中的數據，保留所有原始欄位
        return newItems.map((item, index) => {
          const original = old.find((o) => o.id === item.id);
          return {
            ...(original ?? {
              cardId,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
            id: item.id,
            name: item.name,
            order: index,
          };
        });
      });

      // 延遲 invalidate，讓 UI 有時間穩定
      setTimeout(() => {
        utils.cardItemNames.list.invalidate(cardId);
      }, 1000);
    } catch (error) {
      console.error('[CardItemNamesManager] Error saving order:', error);
      // 保存失敗時回滾本地狀態
      const sortedItems = [...itemNames].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setLocalItems(sortedItems);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      alert('請輸入項目名稱');
      return;
    }

    try {
      await addMutation.mutateAsync({
        cardId,
        name: newItemName.trim(),
      });
      await utils.cardItemNames.list.invalidate(cardId);
      setNewItemName('');
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Error adding item:', error);
      alert('添加失敗，請重試');
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (id < 0) {
      alert('此項目是從數據中自動提取的。請先通過拖拽排序來確認此項目，然後才能刪除。');
      return;
    }

    if (confirm('確定要刪除此項目嗎？')) {
      try {
        await deleteMutation.mutateAsync(id);
        await utils.cardItemNames.list.invalidate(cardId);
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('刪除失敗，請重試');
      }
    }
  };

  const handleEditItem = (item: ItemNameData) => {
    setEditingItem(item);
    setEditingName(item.name);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingName.trim()) {
      alert('請輸入項目名稱');
      return;
    }

    if (!editingItem) return;

    try {
      if (editingItem.id < 0) {
        await addMutation.mutateAsync({
          cardId,
          name: editingName.trim(),
        });
      } else {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          name: editingName.trim(),
        });
      }
      await utils.cardItemNames.list.invalidate(cardId);
      setEditingItem(null);
      setEditingName('');
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating item:', error);
      alert('更新失敗，請重試');
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <Button
          onClick={() => setIsOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 w-full"
        >
          管理項目名稱
        </Button>
      </div>

      {/* 管理對話框 */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>管理項目名稱</DialogTitle>
            <DialogDescription>拖拽調整項目順序，或點擊編輯和刪除</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 新增項目按鈕 */}
            <Button
              onClick={() => {
                setIsOpen(false);
                setIsAddDialogOpen(true);
              }}
              className="w-full bg-blue-500 hover:bg-blue-600 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              新增項目
            </Button>

            {/* 保存狀態提示 */}
            {isSaving && (
              <p className="text-xs text-blue-500 text-center">正在保存排序...</p>
            )}

            {/* 項目名稱列表 - 支援拖拽 */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localItems.map((item) => String(item.id))}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {localItems.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">暫無項目名稱</p>
                  ) : (
                    localItems.map((item) => (
                      <SortableItemName
                        key={item.id}
                        item={item}
                        onEdit={handleEditItem}
                        onDelete={handleDeleteItem}
                      />
                    ))
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              關閉
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新增項目對話框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新增項目</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="輸入項目名稱"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddItem();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddItem}>新增</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編輯項目對話框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>編輯項目</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="輸入項目名稱"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
