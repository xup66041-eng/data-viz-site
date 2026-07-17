import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit2, ArrowLeft, CheckCircle2, ArrowUp, ArrowDown } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function Tasks() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isCreating, setIsCreating] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [showStepsDialog, setShowStepsDialog] = useState(false);
  const [selectedTaskForSteps, setSelectedTaskForSteps] = useState<any>(null);
  const [showDescriptionDialog, setShowDescriptionDialog] = useState(false);
  const [selectedTaskForDescription, setSelectedTaskForDescription] = useState<any>(null);
  
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskSteps, setNewTaskSteps] = useState<string[]>(["步驟1", "步驟2", "步驟3", "步驟4", "步驟5"]);
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAssignee, setEditAssignee] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editSteps, setEditSteps] = useState<string[]>([]);

  const { data: tasks = [], isLoading, refetch } = trpc.tasks.list.useQuery();
  const createTaskMutation = trpc.tasks.create.useMutation();
  const updateTaskMutation = trpc.tasks.update.useMutation();
  const deleteTaskMutation = trpc.tasks.delete.useMutation();

  // 分類任務：進行中和已完成
  const inProgressTasks = tasks.filter((task: any) => {
    const progress = ((task.currentStep ?? 1) / (task.totalSteps ?? 5)) * 100;
    return progress < 100;
  });

  const completedTasks = tasks.filter((task: any) => {
    const progress = ((task.currentStep ?? 1) / (task.totalSteps ?? 5)) * 100;
    return progress === 100;
  });

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      await createTaskMutation.mutateAsync({
        title: newTaskTitle,
        description: newTaskDescription,
        totalSteps: newTaskSteps.length,
        stepNames: newTaskSteps,
        assignee: newTaskAssignee,
        dueDate: newTaskDueDate,
        priority: "normal",
      });
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskSteps(["步驟1", "步驟2", "步驟3", "步驟4", "步驟5"]);
      setNewTaskAssignee("");
      setNewTaskDueDate("");
      setIsCreating(false);
      refetch();
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleMoveStepUp = (index: number) => {
    if (index === 0) return;
    const newSteps = [...editSteps];
    [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
    setEditSteps(newSteps);
  };

  const handleMoveStepDown = (index: number) => {
    if (index === editSteps.length - 1) return;
    const newSteps = [...editSteps];
    [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
    setEditSteps(newSteps);
  };

  const handleEditTask = (task: any) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditAssignee(task.assignee || "");
    setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "");
    setEditSteps(task.stepNames ? JSON.parse(task.stepNames) : []);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;

    try {
      await updateTaskMutation.mutateAsync({
        id: editingTaskId!,
        title: editTitle,
        description: editDescription,
        assignee: editAssignee,
        dueDate: editDueDate,
        stepNames: editSteps,
        totalSteps: editSteps.length,
      });
      setEditingTaskId(null);
      refetch();
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const getCurrentStepName = (task: any) => {
    const stepNames = task.stepNames ? JSON.parse(task.stepNames) : [];
    return stepNames[task.currentStep - 1] || `步驟 ${task.currentStep}`;
  };

  const openStepsDialog = (task: any) => {
    setSelectedTaskForSteps(task);
    setShowStepsDialog(true);
  };

  const handleUpdateStep = async (taskId: number, newStep: number) => {
    try {
      await updateTaskMutation.mutateAsync(
        {
          id: taskId,
          currentStep: newStep,
        },
        {
          onSuccess: () => {
            // 立即更新 selectedTaskForSteps 狀態
            if (selectedTaskForSteps?.id === taskId) {
              setSelectedTaskForSteps({
                ...selectedTaskForSteps,
                currentStep: newStep,
              });
            }
            // 重新獲取任務列表
            refetch();
          },
        }
      );
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (confirm("確定要刪除這個事項嗎？")) {
      try {
        await deleteTaskMutation.mutateAsync(taskId);
        refetch();
      } catch (error) {
        console.error("Failed to delete task:", error);
      }
    }
  };

  const getProgressPercentage = (task: any) => {
    return ((task.currentStep ?? 1) / (task.totalSteps ?? 5)) * 100;
  };

  const getDueDateStatus = (dueDate: any) => {
    if (!dueDate) return "normal";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    if (due.getTime() === today.getTime()) {
      return "due";
    } else if (due < today) {
      return "overdue";
    }
    return "normal";
  };

  const getDueDateClassName = (dueDate: any) => {
    const status = getDueDateStatus(dueDate);
    switch (status) {
      case "due":
        return "bg-blue-100 text-blue-900";
      case "overdue":
        return "bg-red-100 text-red-900";
      default:
        return "text-slate-600";
    }
  };

  const renderTaskTable = (taskList: any[], isCompleted: boolean = false) => {
    if (taskList.length === 0) {
      return (
        <Card>
          <CardContent className="pt-6 text-center text-slate-500">
            {isCompleted ? "還沒有完成的記事" : "還沒有進行中的記事"}
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200 bg-gray-50">
              <th className="text-left p-4 font-semibold text-slate-700 text-base">事項名稱</th>
              <th className="text-left p-4 font-semibold text-slate-700 text-base">負責人</th>
              <th className="text-left p-4 font-semibold text-slate-700 text-base">提醒日期</th>
              <th className="text-left p-4 font-semibold text-slate-700 text-base">進度</th>
              <th className="text-left p-4 font-semibold text-slate-700 text-base">當前步驟</th>
              <th className="text-left p-4 font-semibold text-slate-700 text-base">操作</th>
            </tr>
          </thead>
          <tbody>
            {taskList.map((task: any) => (
              <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-4 font-medium text-slate-900 text-base">
                  <button
                    onClick={() => {
                      setSelectedTaskForDescription(task);
                      setShowDescriptionDialog(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                  >
                    {task.title}
                  </button>
                </td>
                <td className="p-4 text-slate-600 text-base">{task.assignee || "-"}</td>
                <td className={`p-4 rounded-md font-medium text-base ${getDueDateClassName(task.dueDate)}`}>
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString("zh-TW") : "-"}
                </td>
                <td className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div 
                        className="flex-1 bg-slate-200 rounded-full h-8 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => openStepsDialog(task)}
                      >
                        <div
                          className="bg-gradient-to-r from-pink-400 to-blue-400 h-8 rounded-full transition-all shadow-md"
                          style={{ width: `${getProgressPercentage(task)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-slate-900 whitespace-nowrap min-w-16 text-center">
                      {Math.round(getProgressPercentage(task))}%
                    </span>
                  </div>
                  <div className="mt-4 text-base font-semibold text-slate-700">
                    {getCurrentStepName(task)}
                  </div>
                </td>
                <td className="p-4">
                  {user?.role === "admin" ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStep(task.id, Math.max(1, (task.currentStep ?? 1) - 1))}
                        disabled={(task.currentStep ?? 1) <= 1}
                      >
                        −
                      </Button>
                      <span className="w-14 text-center font-bold text-lg text-slate-900">
                        {task.currentStep ?? 1}/{task.totalSteps ?? 5}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStep(task.id, Math.min(task.totalSteps ?? 5, (task.currentStep ?? 1) + 1))}
                        disabled={(task.currentStep ?? 1) >= (task.totalSteps ?? 5)}
                      >
                        +
                      </Button>
                    </div>
                  ) : (
                    <span className="text-slate-900 font-bold text-lg">
                      {task.currentStep ?? 1}/{task.totalSteps ?? 5}
                    </span>
                  )}
                </td>
                <td className="p-4">
                  {user?.role === "admin" && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTask(task)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (!user) {
    return <div className="p-6">請先登入</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                回首頁
              </Button>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">重要記事追蹤</h1>
            <p className="text-slate-600">管理和追蹤重要事項的進度</p>
          </div>
          {user?.role === "admin" && (
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  新增記事
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>新增重要記事</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">事項名稱 *</label>
                  <Input
                    placeholder="輸入事項名稱"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">描述</label>
                  <Textarea
                    placeholder="輸入事項描述（可選）"
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">負責人</label>
                    <Input
                      placeholder="輸入負責人名稱"
                      value={newTaskAssignee}
                      onChange={(e) => setNewTaskAssignee(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">提醒日期</label>
                    <Input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">步驟設置</label>
                  <div className="space-y-2">
                    {newTaskSteps.map((step, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={step}
                          onChange={(e) => {
                            const newSteps = [...newTaskSteps];
                            newSteps[index] = e.target.value;
                            setNewTaskSteps(newSteps);
                          }}
                          placeholder={`步驟 ${index + 1}`}
                        />
                        {newTaskSteps.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setNewTaskSteps(newTaskSteps.filter((_, i) => i !== index))}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewTaskSteps([...newTaskSteps, `步驟${newTaskSteps.length + 1}`])}
                    className="mt-2"
                  >
                    + 添加步驟
                  </Button>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreateTask}>
                    建立記事
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12">載入中...</div>
        ) : (
          <div className="space-y-8">
            {/* 進行中區域 */}
            <div>
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  進行中
                  {inProgressTasks.length > 0 && (
                    <span className="text-sm font-normal text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                      {inProgressTasks.length} 項
                    </span>
                  )}
                </h2>
              </div>
              {renderTaskTable(inProgressTasks, false)}
            </div>

            {/* 已完成區域 */}
            {completedTasks.length > 0 && (
              <div>
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                    已完成
                    <span className="text-sm font-normal text-slate-600 bg-green-100 px-3 py-1 rounded-full">
                      {completedTasks.length} 項
                    </span>
                  </h2>
                </div>
                {renderTaskTable(completedTasks, true)}
              </div>
            )}
          </div>
        )}

        {/* 步驟對話框 */}
        <Dialog open={showStepsDialog} onOpenChange={setShowStepsDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>所有步驟 - {selectedTaskForSteps?.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {selectedTaskForSteps && (() => {
                const stepNames = selectedTaskForSteps.stepNames ? JSON.parse(selectedTaskForSteps.stepNames) : [];
                return stepNames.map((stepName: string, index: number) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedTaskForSteps.currentStep === index + 1
                        ? "border-blue-500 bg-blue-50"
                        : (selectedTaskForSteps.currentStep ?? 0) > index + 1
                        ? "border-green-500 bg-green-50"
                        : "border-slate-200 bg-slate-50"
                    }`}
                    onClick={() => {
                      handleUpdateStep(selectedTaskForSteps.id, index + 1);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">步驟 {index + 1}</span>
                      <span className="text-slate-600">{stepName}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </DialogContent>
        </Dialog>

        {/* 編輯任務對話框 */}
        <Dialog open={editingTaskId !== null} onOpenChange={(open) => !open && setEditingTaskId(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>編輯重要記事</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">事項名稱 *</label>
                <Input
                  placeholder="輸入事項名稱"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">描述</label>
                <Textarea
                  placeholder="輸入事項描述（可選）"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">負責人</label>
                  <Input
                    placeholder="輸入負責人名稱"
                    value={editAssignee}
                    onChange={(e) => setEditAssignee(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">提醒日期</label>
                  <Input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">步驟設置</label>
                <div className="space-y-2">
                  {editSteps.map((step, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMoveStepUp(index)}
                          disabled={index === 0}
                          title="上移"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMoveStepDown(index)}
                          disabled={index === editSteps.length - 1}
                          title="下移"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                      </div>
                      <Input
                        value={step}
                        onChange={(e) => {
                          const newSteps = [...editSteps];
                          newSteps[index] = e.target.value;
                          setEditSteps(newSteps);
                        }}
                        placeholder={`步驟 ${index + 1}`}
                      />
                      {editSteps.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditSteps(editSteps.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditSteps([...editSteps, `步驟${editSteps.length + 1}`])}
                  className="mt-2"
                >
                  + 添加步驟
                </Button>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditingTaskId(null)}>
                  取消
                </Button>
                <Button onClick={handleSaveEdit}>
                  保存變更
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 描述對話框 */}
        <Dialog open={showDescriptionDialog} onOpenChange={setShowDescriptionDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedTaskForDescription?.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">描述</label>
                <div className="p-4 bg-slate-50 rounded-md border border-slate-200 min-h-[120px] whitespace-pre-wrap text-slate-700">
                  {selectedTaskForDescription?.description || "無描述"}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
