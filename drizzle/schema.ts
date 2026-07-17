import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["guest", "staff", "admin"]).default("guest").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 分類標籤表 - 用於組織和分類卡片
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 20 }).default("#6366f1"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * 數據卡片表 - 每個卡片代表一個數據追蹤項目
 */
export const cards = mysqlTable("cards", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  categoryId: int("categoryId"),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  chartType: mysqlEnum("chartType", ["line", "bar", "area", "mixed"]).default("line"),
  unit: varchar("unit", { length: 50 }),
  threshold: decimal("threshold", { precision: 10, scale: 2 }),
  thresholdType: mysqlEnum("thresholdType", ["max", "min", "none"]).default("none"),
  infoUrl: varchar("infoUrl", { length: 500 }), // 網站說明連結
  yAxisMin: decimal("yAxisMin", { precision: 15, scale: 4 }), // Y 軸最小值
  yAxisMax: decimal("yAxisMax", { precision: 15, scale: 4 }), // Y 軸最大值
  barWidth: decimal("barWidth", { precision: 3, scale: 2 }).default("0.8"), // 柱體寬度比例 (0.1-1.0)
  visibleItems: text("visibleItems"), // JSON 字串，存儲可見項目名稱數組
  periodOrder: text("periodOrder"), // JSON 字串，存儲用戶自訂的年度/期間排序
  updateFrequency: mysqlEnum("updateFrequency", ["monthly", "quarterly", "yearly", "none"]).default("none"), // 更新頻率
  updateStartDate: timestamp("updateStartDate"), // 更新起算日期
  lastUpdatedAt: timestamp("lastUpdatedAt"), // 最後更新時間
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Card = typeof cards.$inferSelect;
export type InsertCard = typeof cards.$inferInsert;

/**
 * 數據點表 - 存儲多項目、多年度的數據
 * 結構：(itemName, period, value) - 不再包含日期
 */
export const dataPoints = mysqlTable("dataPoints", {
  id: int("id").autoincrement().primaryKey(),
  cardId: int("cardId").notNull(),
  itemName: varchar("itemName", { length: 200 }).notNull(), // 項目名稱，例如「詳詢業務」、「動物保護案件」
  period: varchar("period", { length: 50 }).notNull(), // 年度或時間時段，例如「112-02」、「113」、「2026/02」
  value: decimal("value", { precision: 15, scale: 4 }).notNull(), // 數值
  notes: text("notes"), // 備註
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DataPoint = typeof dataPoints.$inferSelect;
export type InsertDataPoint = typeof dataPoints.$inferInsert;

/**
 * 關注設定表 - 用戶自定義的關注頁面配置
 */
export const watchlist = mysqlTable("watchlist", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  cardId: int("cardId").notNull(),
  order: int("order").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Watchlist = typeof watchlist.$inferSelect;
export type InsertWatchlist = typeof watchlist.$inferInsert;

/**
 * 異常事件表 - 記錄數據異常和觸發的通知
 */
export const anomalies = mysqlTable("anomalies", {
  id: int("id").autoincrement().primaryKey(),
  cardId: int("cardId").notNull(),
  userId: int("userId").notNull(),
  dataPointId: int("dataPointId"),
  anomalyType: mysqlEnum("anomalyType", ["threshold_exceeded", "threshold_below", "spike", "drop"]).notNull(),
  value: decimal("value", { precision: 15, scale: 4 }),
  message: text("message"),
  notified: boolean("notified").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Anomaly = typeof anomalies.$inferSelect;
export type InsertAnomaly = typeof anomalies.$inferInsert;

/**
 * 卡片項目名稱表 - 存儲每個卡片的項目名稱清單
 */
export const cardItemNames = mysqlTable("cardItemNames", {
  id: int("id").autoincrement().primaryKey(),
  cardId: int("cardId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  order: int("order").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CardItemName = typeof cardItemNames.$inferSelect;
export type InsertCardItemName = typeof cardItemNames.$inferInsert;

/**
 * 統計快取表 - 緩存計算結果以提高性能
 */
export const statistics = mysqlTable("statistics", {
  id: int("id").autoincrement().primaryKey(),
  cardId: int("cardId").notNull(),
  minValue: decimal("minValue", { precision: 15, scale: 4 }),
  maxValue: decimal("maxValue", { precision: 15, scale: 4 }),
  avgValue: decimal("avgValue", { precision: 15, scale: 4 }),
  trend: varchar("trend", { length: 20 }),
  dataCount: int("dataCount").default(0),
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
});

export type Statistic = typeof statistics.$inferSelect;
export type InsertStatistic = typeof statistics.$inferInsert;

// Relations


export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, { fields: [categories.userId], references: [users.id] }),
  cards: many(cards),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  user: one(users, { fields: [cards.userId], references: [users.id] }),
  category: one(categories, { fields: [cards.categoryId], references: [categories.id] }),
  dataPoints: many(dataPoints),
  watchlistEntries: many(watchlist),
  anomalies: many(anomalies),
  statistics: one(statistics, { fields: [cards.id], references: [statistics.cardId] }),
  itemNames: many(cardItemNames),
}));

export const dataPointsRelations = relations(dataPoints, ({ one }) => ({
  card: one(cards, { fields: [dataPoints.cardId], references: [cards.id] }),
}));

export const watchlistRelations = relations(watchlist, ({ one }) => ({
  user: one(users, { fields: [watchlist.userId], references: [users.id] }),
  card: one(cards, { fields: [watchlist.cardId], references: [cards.id] }),
}));

export const anomaliesRelations = relations(anomalies, ({ one }) => ({
  card: one(cards, { fields: [anomalies.cardId], references: [cards.id] }),
  user: one(users, { fields: [anomalies.userId], references: [users.id] }),
}));

export const statisticsRelations = relations(statistics, ({ one }) => ({
  card: one(cards, { fields: [statistics.cardId], references: [cards.id] }),
}));

export const cardItemNamesRelations = relations(cardItemNames, ({ one }) => ({
  card: one(cards, { fields: [cardItemNames.cardId], references: [cards.id] }),
}));

/**
 * 共同範本表 - 存儲管理員上傳的範本檔案
 */
export const templates = mysqlTable("templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // 上傳者（管理員）
  title: varchar("title", { length: 200 }).notNull(), // 範本標題
  description: text("description"), // 範本描述
  fileUrl: varchar("fileUrl", { length: 500 }).notNull(), // S3 檔案 URL
  fileKey: varchar("fileKey", { length: 500 }).notNull(), // S3 檔案 key
  fileType: mysqlEnum("fileType", ["word", "image", "excel"]).notNull(), // 檔案類型
  fileName: varchar("fileName", { length: 200 }).notNull(), // 原始檔案名稱
  previewUrl: varchar("previewUrl", { length: 500 }), // 預覽圖 URL（圖片或 Word 縮圖）
  downloadCount: int("downloadCount").default(0), // 下載次數
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;

export const templatesRelations = relations(templates, ({ one }) => ({
  user: one(users, { fields: [templates.userId], references: [users.id] }),
}));

/**
 * 重要記事表 - 追蹤重要事項的進度
 */
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  totalSteps: int("totalSteps").default(5),
  currentStep: int("currentStep").default(1),
  stepNames: text("stepNames"),
  assignee: varchar("assignee", { length: 100 }),
  dueDate: timestamp("dueDate"),
  priority: varchar("priority", { length: 20 }).default("normal"),
  lastUpdatedAt: timestamp("lastUpdatedAt").defaultNow().onUpdateNow(),
  isCompleted: boolean("isCompleted").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
}));

/**
 * 卡片表格說明表 - 存儲每個卡片的表格說明內容
 */
export const cardTables = mysqlTable("cardTables", {
  id: int("id").autoincrement().primaryKey(),
  cardId: int("cardId").notNull(),
  title: varchar("title", { length: 200 }).default(""), // 表格標題
  columns: text("columns").notNull(), // JSON: [{ id, header }]
  rows: text("rows").notNull(), // JSON: [[cell, cell, ...], ...]
  order: int("order").default(0), // 排序
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CardTable = typeof cardTables.$inferSelect;
export type InsertCardTable = typeof cardTables.$inferInsert;

export const cardTablesRelations = relations(cardTables, ({ one }) => ({
  card: one(cards, { fields: [cardTables.cardId], references: [cards.id] }),
}));

export const usersRelationsUpdated = relations(users, ({ many }) => ({
  categories: many(categories),
  cards: many(cards),
  watchlist: many(watchlist),
  anomalies: many(anomalies),
  templates: many(templates),
  tasks: many(tasks),
}));