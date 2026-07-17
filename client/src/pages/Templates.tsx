import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { Download, Trash2, Plus, Search, FileText, Image as ImageIcon, Upload } from "lucide-react";
import { toast } from "sonner";

export default function Templates() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Fetch templates
  const { data: templates = [], isLoading, refetch } = trpc.templates.list.useQuery();

  // Filter templates by search query
  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return templates;
    return templates.filter((t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [templates, searchQuery]);

  // Create template mutation
  const createTemplateMutation = trpc.templates.create.useMutation({
    onSuccess: () => {
      toast.success("範本上傳成功！");
      setShowUploadDialog(false);
      setUploadFile(null);
      setUploadTitle("");
      setUploadDescription("");
      refetch();
    },
    onError: (error) => {
      toast.error(`上傳失敗: ${error.message}`);
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = trpc.templates.delete.useMutation({
    onSuccess: () => {
      toast.success("範本已刪除");
      refetch();
    },
    onError: (error) => {
      toast.error(`刪除失敗: ${error.message}`);
    },
  });

  // Download mutation
  const downloadMutation = trpc.templates.incrementDownload.useMutation();

  const handleDownload = (template: any) => {
    downloadMutation.mutate(template.id);
    // Create a link to download the file
    const link = document.createElement("a");
    link.href = template.fileUrl;
    link.download = template.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (templateId: number) => {
    if (confirm("確定要刪除這個範本嗎？")) {
      deleteTemplateMutation.mutate(templateId);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle) {
      toast.error("請選擇檔案並輸入標題");
      return;
    }

    if (!user) {
      toast.error("請先登入");
      return;
    }

    setIsUploading(true);
    try {
      // Upload file to S3 via server
      const formData = new FormData();
      formData.append("file", uploadFile);

      const uploadRes = await fetch("/api/upload/template", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({ error: uploadRes.statusText }));
        throw new Error(err.error ?? "上傳失敗");
      }

      const { fileUrl, fileKey } = await uploadRes.json();

      let fileType: "word" | "image" | "excel" = "word";
      if (uploadFile.type.startsWith("image/")) {
        fileType = "image";
      } else if (uploadFile.name.endsWith(".xls") || uploadFile.name.endsWith(".xlsx")) {
        fileType = "excel";
      }

      // Create template record with real S3 URL
      createTemplateMutation.mutate({
        title: uploadTitle,
        description: uploadDescription,
        fileUrl: fileUrl,
        fileKey: fileKey,
        fileType: fileType,
        fileName: uploadFile.name,
        previewUrl: fileType === "image" ? fileUrl : undefined,
      });
    } catch (error: any) {
      toast.error(`上傳失敗：${error.message ?? "請重試"}`);
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">共同範本</h1>
              <p className="text-gray-600">下載和管理共同使用的文件範本</p>
            </div>
            <Button
              onClick={() => setLocation("/")}
              variant="outline"
              className="gap-2"
            >
              ← 回首頁
            </Button>
          </div>
        </div>

        {/* Search and Upload */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <Input
              placeholder="搜尋範本標題..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {isAdmin && (
            <Button
              onClick={() => setShowUploadDialog(true)}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              上傳範本
            </Button>
          )}
        </div>

        {/* Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>上傳新範本</DialogTitle>
              <DialogDescription>
                上傳 Word 檔或圖片作為共同範本供大家使用
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* File Upload */}
              <div>
                <Label htmlFor="file-input">選擇檔案</Label>
                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                  <input
                    id="file-input"
                    type="file"
                    accept=".doc,.docx,.pdf,.jpg,.jpeg,.png,.gif,.xls,.xlsx"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label htmlFor="file-input" className="cursor-pointer">
                    {uploadFile ? (
                      <div>
                        <FileText className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                        <p className="text-sm font-medium text-gray-900">
                          {uploadFile.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm font-medium text-gray-900">
                          點擊選擇檔案
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          支援 Word、PDF、Excel、圖片格式
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Title */}
              <div>
                <Label htmlFor="title">範本標題 *</Label>
                <Input
                  id="title"
                  placeholder="輸入範本標題"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">範本描述</Label>
                <Textarea
                  id="description"
                  placeholder="輸入範本描述（選填）"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="mt-1 resize-none"
                  rows={3}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowUploadDialog(false)}
                  className="flex-1"
                  disabled={isUploading}
                >
                  取消
                </Button>
                <Button
                  onClick={handleUpload}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={isUploading || !uploadFile || !uploadTitle}
                >
                  {isUploading ? "上傳中..." : "上傳"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">載入中...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchQuery ? "找不到符合的範本" : "暫無範本"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="overflow-hidden hover:shadow-lg transition-shadow border-l-4 border-l-blue-500"
              >
                <div className="p-6">
                  {/* Preview */}
                  <div className="mb-4 h-40 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                    {template.fileType === "image" && template.previewUrl ? (
                      <img
                        src={template.previewUrl}
                        alt={template.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        {template.fileType === "word" ? (
                          <FileText className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                        ) : template.fileType === "excel" ? (
                          <FileText className="w-12 h-12 text-green-600 mx-auto mb-2" />
                        ) : (
                          <ImageIcon className="w-12 h-12 text-green-400 mx-auto mb-2" />
                        )}
                        <p className="text-sm text-gray-500">
                          {template.fileType === "word" ? "Word 檔案" : template.fileType === "excel" ? "Excel 檔案" : "圖片"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Title and Description */}
                  <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
                    {template.title}
                  </h3>
                  {template.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  {/* Download Count */}
                  <p className="text-xs text-gray-500 mb-4">
                    下載次數: {template.downloadCount || 0}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDownload(template)}
                      className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <Download className="w-4 h-4" />
                      下載
                    </Button>
                    {isAdmin && (
                      <Button
                        onClick={() => handleDelete(template.id)}
                        variant="destructive"
                        size="sm"
                        className="gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
