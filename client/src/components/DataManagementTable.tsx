import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Save, Upload } from "lucide-react";
import { BatchImportDialog } from "./BatchImportDialog";

interface DataPoint {
  id?: string;
  itemName: string;
  period: string;
  value: string;
  notes?: string;
}

interface DataManagementTableProps {
  dataPoints: DataPoint[];
  itemNames: string[];
  onSave: (dataPoints: DataPoint[]) => void;
  isReadOnly?: boolean; // If true, users can only view data, not edit or delete
}

export const DataManagementTable: React.FC<DataManagementTableProps> = ({
  dataPoints,
  itemNames,
  onSave,
  isReadOnly = false,
}) => {
  const [rows, setRows] = useState<DataPoint[]>(dataPoints);
  const [isSaving, setIsSaving] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [newRow, setNewRow] = useState<DataPoint>({
    id: `temp-${Date.now()}`,
    itemName: "",
    period: "",
    value: "",
    notes: "",
  });

  // Ensure each row has a unique ID
  useEffect(() => {
    const rowsWithIds = dataPoints.map((row, index) => ({
      ...row,
      id: row.id || `temp-${Date.now()}-${index}`,
    }));
    setRows(rowsWithIds);
  }, [dataPoints]);

  const handleRowChange = (index: number, field: keyof DataPoint, value: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const handleNewRowChange = (field: keyof DataPoint, value: string) => {
    setNewRow({ ...newRow, [field]: value });
  };

  const handleAddNewRow = () => {
    // Validate new row
    if (!newRow.itemName.trim() || !newRow.period.trim() || !newRow.value.trim()) {
      alert("請填寫項目名稱、年度和數值");
      return;
    }

    // Add new row to the beginning
    setRows([newRow, ...rows]);
    
    // Reset new row
    setNewRow({
      id: `temp-${Date.now()}`,
      itemName: "",
      period: "",
      value: "",
      notes: "",
    });
  };

  const handleDeleteRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // Validate rows
    const validRows = rows.filter(
      (row) => row.itemName.trim() && row.period.trim() && row.value.trim()
    );

    if (validRows.length === 0) {
      alert("請至少輸入一行完整的數據");
      return;
    }

    setIsSaving(true);
    try {
      onSave(validRows);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBatchImport = (importedData: DataPoint[]) => {
    // Replace all existing rows with imported data
    setRows(importedData);
  };

  return (
    <div className="w-full">
      {/* Header with Title and Save Button */}
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold">數據管理</h3>
        {!isReadOnly && (
          <div className="flex gap-2">
            <Button
              onClick={() => setShowImportDialog(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              批量導入
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-500 hover:bg-blue-600 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "保存中..." : "保存數據"}
            </Button>
          </div>
        )}
        {isReadOnly && (
          <div className="text-sm text-gray-500">只讀模式</div>
        )}
      </div>

      {/* Batch Import Dialog */}
      <BatchImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImport={handleBatchImport}
        itemNames={itemNames}
      />

      {/* Table Container with Zebra Striping */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-blue-500 text-white">
              <th className="px-4 py-3 text-left font-semibold">項目名稱</th>
              <th className="px-4 py-3 text-left font-semibold">年度</th>
              <th className="px-4 py-3 text-left font-semibold">數值</th>
              <th className="px-4 py-3 text-left font-semibold">備註</th>
              <th className="px-4 py-3 text-center font-semibold w-12">操作</th>
            </tr>
          </thead>
          <tbody>
            {/* New Row Input - Only show if not read-only */}
            {!isReadOnly && (
              <tr className="bg-blue-50 border-b-2 border-blue-200 hover:bg-blue-100 transition-colors">
                {/* Item Name - Select Dropdown */}
                <td className="px-4 py-3">
                  <Select value={newRow.itemName} onValueChange={(value) => handleNewRowChange("itemName", value)}>
                    <SelectTrigger className="w-full border-0 bg-transparent focus:ring-2 focus:ring-blue-500 font-semibold">
                      <SelectValue placeholder="選擇項目名稱" />
                    </SelectTrigger>
                    <SelectContent>
                      {itemNames.map((name, idx) => (
                        <SelectItem key={`${name}-${idx}`} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>

                {/* Period - Text Input */}
                <td className="px-4 py-3">
                  <Input
                    type="text"
                    placeholder="例如：113 或 113-02"
                    value={newRow.period}
                    onChange={(e) => handleNewRowChange("period", e.target.value)}
                    className="border-0 bg-transparent focus:ring-2 focus:ring-blue-500 focus:bg-white font-semibold"
                  />
                </td>

                {/* Value - Number Input */}
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    placeholder="輸入數值"
                    value={newRow.value}
                    onChange={(e) => handleNewRowChange("value", e.target.value)}
                    className="border-0 bg-transparent focus:ring-2 focus:ring-blue-500 focus:bg-white font-semibold"
                  />
                </td>

                {/* Notes - Text Input */}
                <td className="px-4 py-3">
                  <Input
                    type="text"
                    placeholder="備註（可選）"
                    value={newRow.notes || ""}
                    onChange={(e) => handleNewRowChange("notes", e.target.value)}
                    className="border-0 bg-transparent focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </td>

                {/* Add Button */}
                <td className="px-4 py-3 text-center">
                  <Button
                    onClick={handleAddNewRow}
                    variant="ghost"
                    size="sm"
                    className="hover:bg-blue-200 hover:text-blue-600 font-semibold"
                    title="新增這一行"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            )}

            {/* Existing Data Rows */}
            {rows.map((row, index) => (
              <tr
                key={row.id || `row-${index}`}
                className={`border-t hover:bg-blue-50 transition-colors ${
                  index % 2 === 0 ? "bg-white" : "bg-gray-50"
                }`}
              >
                {/* Item Name - Select Dropdown */}
                <td className="px-4 py-3">
                  {!isReadOnly ? (
                    <Select value={row.itemName} onValueChange={(value) => handleRowChange(index, "itemName", value)}>
                      <SelectTrigger className="w-full border-0 bg-transparent focus:ring-2 focus:ring-blue-500">
                        <SelectValue placeholder="選擇項目名稱" />
                      </SelectTrigger>
                      <SelectContent>
                        {itemNames.map((name, idx) => (
                          <SelectItem key={`${name}-${idx}`} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-gray-700">{row.itemName}</span>
                  )}
                </td>

                {/* Period - Text Input */}
                <td className="px-4 py-3">
                  {!isReadOnly ? (
                    <Input
                      type="text"
                      placeholder="例如：113 或 113-02"
                      value={row.period}
                      onChange={(e) => handleRowChange(index, "period", e.target.value)}
                      className="border-0 bg-transparent focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  ) : (
                    <span className="text-gray-700">{row.period}</span>
                  )}
                </td>

                {/* Value - Number Input */}
                <td className="px-4 py-3">
                  {!isReadOnly ? (
                    <Input
                      type="number"
                      placeholder="輸入數值"
                      value={row.value}
                      onChange={(e) => handleRowChange(index, "value", e.target.value)}
                      className="border-0 bg-transparent focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  ) : (
                    <span className="text-gray-700">{row.value}</span>
                  )}
                </td>

                {/* Notes - Text Input */}
                <td className="px-4 py-3">
                  {!isReadOnly ? (
                    <Input
                      type="text"
                      placeholder="備註（可選）"
                      value={row.notes || ""}
                      onChange={(e) => handleRowChange(index, "notes", e.target.value)}
                      className="border-0 bg-transparent focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  ) : (
                    <span className="text-gray-700">{row.notes || "-"}</span>
                  )}
                </td>

                {/* Delete Button - Only show if not read-only */}
                <td className="px-4 py-3 text-center">
                  {!isReadOnly ? (
                    <Button
                      onClick={() => handleDeleteRow(index)}
                      variant="ghost"
                      size="sm"
                      className="hover:bg-red-100 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  ) : (
                    <div className="text-gray-300">-</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="py-8 text-center text-gray-500">
          <p>沒有數據。在上方輸入新數據並點擊「+」按鈕開始。</p>
        </div>
      )}
    </div>
  );
};
