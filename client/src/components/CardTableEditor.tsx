import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Save,
  PlusSquare,
  MinusSquare,
  Edit3,
  X,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Upload,
} from "lucide-react";
import { TableDataImporter } from "./TableDataImporter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Column {
  id: string;
  header: string;
}

type Row = string[]; // each element corresponds to a column

interface CardTableData {
  id: number;
  cardId: number;
  title: string | null;
  columns: string; // JSON
  rows: string;    // JSON
  order: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ParsedTable {
  id: number;
  title: string;
  columns: Column[];
  rows: Row[];
  order: number;
}

function parseTable(t: CardTableData): ParsedTable {
  let columns: Column[] = [];
  let rows: Row[] = [];
  try { columns = JSON.parse(t.columns); } catch { columns = []; }
  try { rows = JSON.parse(t.rows); } catch { rows = []; }
  return {
    id: t.id,
    title: t.title ?? "",
    columns,
    rows,
    order: t.order ?? 0,
  };
}

// ─── Single table editor ──────────────────────────────────────────────────────

interface TableEditorProps {
  table: ParsedTable;
  isAdmin: boolean;
  onSave: (id: number, title: string, columns: Column[], rows: Row[]) => Promise<void>;
  onDelete: (id: number) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function TableEditor({
  table,
  isAdmin,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: TableEditorProps) {
  const [title, setTitle] = useState(table.title);
  const [columns, setColumns] = useState<Column[]>(table.columns);
  const [rows, setRows] = useState<Row[]>(table.rows);
  const [saving, setSaving] = useState(false);
  const [editingHeader, setEditingHeader] = useState<string | null>(null);

  const genId = () => Math.random().toString(36).slice(2, 9);

  // Ensure rows always have the right number of cells
  const normalizeRows = (cols: Column[], rs: Row[]): Row[] =>
    rs.map((r) => {
      const padded = [...r];
      while (padded.length < cols.length) padded.push("");
      return padded.slice(0, cols.length);
    });

  // ── Column operations ──
  const addColumn = () => {
    const newCol: Column = { id: genId(), header: `欄位 ${columns.length + 1}` };
    const newCols = [...columns, newCol];
    const newRows = rows.map((r) => [...r, ""]);
    setColumns(newCols);
    setRows(newRows);
  };

  const removeColumn = (idx: number) => {
    if (columns.length <= 1) return;
    const newCols = columns.filter((_, i) => i !== idx);
    const newRows = rows.map((r) => r.filter((_, i) => i !== idx));
    setColumns(newCols);
    setRows(newRows);
  };

  const updateColumnHeader = (idx: number, value: string) => {
    setColumns((prev) => prev.map((c, i) => (i === idx ? { ...c, header: value } : c)));
  };

  // ── Row operations ──
  const addRow = () => {
    setRows((prev) => [...prev, Array(columns.length).fill("")]);
  };

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateCell = (rowIdx: number, colIdx: number, value: string) => {
    setRows((prev) =>
      prev.map((r, ri) =>
        ri === rowIdx ? r.map((c, ci) => (ci === colIdx ? value : c)) : r
      )
    );
  };

  // ── Save ──
  const handleSave = async () => {
    setSaving(true);
    try {
      const normalized = normalizeRows(columns, rows);
      await onSave(table.id, title, columns, normalized);
      toast.success("已儲存表格說明");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
      {/* Table header bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border">
        {isAdmin ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="表格標題（選填）"
            className="flex-1 h-8 text-sm font-semibold bg-transparent border-0 border-b border-dashed border-muted-foreground/40 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
          />
        ) : (
          <span className="flex-1 text-sm font-semibold text-foreground">{title}</span>
        )}

        {isAdmin && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onMoveUp}
              disabled={isFirst}
              title="上移"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onMoveDown}
              disabled={isLast}
              title="下移"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(table.id)}
              title="刪除此表格"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* The actual table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-primary/10">
              {columns.map((col, ci) => (
                <th
                  key={col.id}
                  className="border border-border px-3 py-2 text-left font-semibold text-foreground min-w-[100px] relative group"
                >
                  {isAdmin ? (
                    <div className="flex items-center gap-1">
                      {editingHeader === col.id ? (
                        <Input
                          autoFocus
                          value={col.header}
                          onChange={(e) => updateColumnHeader(ci, e.target.value)}
                          onBlur={() => setEditingHeader(null)}
                          onKeyDown={(e) => e.key === "Enter" && setEditingHeader(null)}
                          className="h-6 text-xs px-1 py-0 border-0 border-b border-primary rounded-none focus-visible:ring-0 bg-transparent"
                        />
                      ) : (
                        <>
                          <span
                            className="cursor-pointer hover:text-primary"
                            onClick={() => setEditingHeader(col.id)}
                          >
                            {col.header}
                          </span>
                          <button
                            className="opacity-0 group-hover:opacity-100 ml-1 text-muted-foreground hover:text-primary"
                            onClick={() => setEditingHeader(col.id)}
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          {columns.length > 1 && (
                            <button
                              className="opacity-0 group-hover:opacity-100 ml-1 text-muted-foreground hover:text-destructive"
                              onClick={() => removeColumn(ci)}
                              title="刪除此欄"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <span>{col.header}</span>
                  )}
                </th>
              ))}
              {isAdmin && (
                <th className="border border-border px-2 py-2 w-8 bg-muted/30">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-primary"
                    onClick={addColumn}
                    title="新增欄"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (isAdmin ? 1 : 0)}
                  className="border border-border px-3 py-6 text-center text-muted-foreground text-xs"
                >
                  尚無資料列，點擊下方「新增列」按鈕開始輸入
                </td>
              </tr>
            )}
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className={ri % 2 === 0 ? "bg-background" : "bg-muted/20"}
              >
                {columns.map((col, ci) => (
                  <td
                    key={col.id}
                    className="border border-border px-2 py-1 align-top"
                  >
                    {isAdmin ? (
                      <textarea
                        value={row[ci] ?? ""}
                        onChange={(e) => updateCell(ri, ci, e.target.value)}
                        rows={1}
                        className="w-full min-w-[80px] resize-y bg-transparent text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 rounded px-1 py-0.5 leading-relaxed"
                        style={{ minHeight: "1.8rem" }}
                      />
                    ) : (
                      <span className="whitespace-pre-wrap text-sm leading-relaxed">
                        {row[ci] ?? ""}
                      </span>
                    )}
                  </td>
                ))}
                {isAdmin && (
                  <td className="border border-border px-1 py-1 w-8 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeRow(ri)}
                      title="刪除此列"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer actions */}
      {isAdmin && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={addRow}
            className="h-7 text-xs gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            新增列
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-7 text-xs gap-1"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "儲存中…" : "儲存"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CardTableEditorProps {
  cardId: number;
  isAdmin: boolean;
}

export function CardTableEditor({ cardId, isAdmin }: CardTableEditorProps) {
  const utils = trpc.useUtils();
  const [showImporter, setShowImporter] = useState(false);
  const [selectedTableIdx, setSelectedTableIdx] = useState<number | null>(null);

  const { data: rawTables = [], isLoading } = trpc.cardTables.list.useQuery(cardId);

  const createMutation = trpc.cardTables.create.useMutation({
    onSuccess: () => utils.cardTables.list.invalidate(cardId),
  });
  const updateMutation = trpc.cardTables.update.useMutation({
    onSuccess: () => utils.cardTables.list.invalidate(cardId),
  });
  const deleteMutation = trpc.cardTables.delete.useMutation({
    onSuccess: () => utils.cardTables.list.invalidate(cardId),
  });

  const tables: ParsedTable[] = rawTables.map(parseTable);

  const handleAddTable = async () => {
    const defaultCols: Column[] = [
      { id: "c1", header: "編號" },
      { id: "c2", header: "項目" },
      { id: "c3", header: "說明" },
    ];
    const defaultRows: Row[] = [["1", "", ""]];
    await createMutation.mutateAsync({
      cardId,
      title: "",
      columns: JSON.stringify(defaultCols),
      rows: JSON.stringify(defaultRows),
      order: tables.length,
    });
    toast.success("已新增表格，請填入內容後儲存");
  };

  const handleSave = async (
    id: number,
    title: string,
    columns: Column[],
    rows: Row[]
  ) => {
    await updateMutation.mutateAsync({
      id,
      title,
      columns: JSON.stringify(columns),
      rows: JSON.stringify(rows),
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("確定要刪除此表格說明嗎？")) return;
    deleteMutation.mutate(id);
  };

  const handleMoveUp = async (idx: number) => {
    if (idx === 0) return;
    const a = tables[idx - 1];
    const b = tables[idx];
    await Promise.all([
      updateMutation.mutateAsync({ id: a.id, order: b.order }),
      updateMutation.mutateAsync({ id: b.id, order: a.order }),
    ]);
  };

  const handleMoveDown = async (idx: number) => {
    if (idx === tables.length - 1) return;
    const a = tables[idx];
    const b = tables[idx + 1];
    await Promise.all([
      updateMutation.mutateAsync({ id: a.id, order: b.order }),
      updateMutation.mutateAsync({ id: b.id, order: a.order }),
    ]);
  };

  const handleImportData = async (
    data: any[]
  ) => {
    if (selectedTableIdx === null) return;
    const table = tables[selectedTableIdx];
    const parsedRows = data.map((item) => [
      item.name || "",
      item.value?.toString() || "",
      item.remark || "",
    ]);
    // Always replace old rows with new rows
    const newRows = parsedRows;
    await updateMutation.mutateAsync({
      id: table.id,
      title: table.title,
      columns: JSON.stringify(table.columns),
      rows: JSON.stringify(newRows),
    });
    setShowImporter(false);
    setSelectedTableIdx(null);
    toast.success("已刪除舊數據並導入新數據");
  };

  if (isLoading) {
    return (
      <div className="py-6 text-center text-muted-foreground text-sm">
        載入表格說明中…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tables.length === 0 && !isAdmin && (
        <div className="py-8 text-center text-muted-foreground text-sm">
          此卡片尚無表格說明
        </div>
      )}

      {tables.map((table, idx) => (
        <TableEditor
          key={table.id}
          table={table}
          isAdmin={isAdmin}
          onSave={handleSave}
          onDelete={handleDelete}
          onMoveUp={() => handleMoveUp(idx)}
          onMoveDown={() => handleMoveDown(idx)}
          isFirst={idx === 0}
          isLast={idx === tables.length - 1}
        />
      ))}

      {isAdmin && (
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full gap-2 border-dashed"
            onClick={handleAddTable}
            disabled={createMutation.isPending}
          >
            <PlusSquare className="h-4 w-4" />
            新增表格說明
          </Button>
          {tables.length > 0 && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                setSelectedTableIdx(0);
                setShowImporter(true);
              }}
            >
              <Upload className="h-4 w-4" />
              表格數據導入
            </Button>
          )}
        </div>
      )}

      {showImporter && selectedTableIdx !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>表格數據導入</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowImporter(false);
                  setSelectedTableIdx(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <TableDataImporter
                onImport={(data) => {
                  handleImportData(data);
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
