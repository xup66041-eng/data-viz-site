import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, categories, InsertCategory, cards, InsertCard, dataPoints, InsertDataPoint, watchlist, InsertWatchlist, anomalies, InsertAnomaly, statistics, InsertStatistic, cardItemNames, InsertCardItemName, CardItemName, tasks, InsertTask, Task, cardTables, InsertCardTable, CardTable } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ CATEGORY QUERIES ============
export async function getUserCategories(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).where(eq(categories.userId, userId)).orderBy(categories.createdAt);
}

export async function createCategory(userId: number, data: Omit<InsertCategory, 'userId'>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(categories).values({ ...data, userId });
  return result;
}

export async function updateCategory(categoryId: number, data: Partial<InsertCategory>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.update(categories).set(data).where(eq(categories.id, categoryId));
}

export async function deleteCategory(categoryId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.delete(categories).where(eq(categories.id, categoryId));
}

// ============ CARD QUERIES ============
export async function getUserCards(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cards).where(eq(cards.userId, userId)).orderBy(cards.createdAt);
}

export async function getCardById(cardId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(cards).where(eq(cards.id, cardId)).limit(1);
  return result[0] || null;
}

export async function createCard(userId: number, data: Omit<InsertCard, 'userId'>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(cards).values({ ...data, userId });
  return result;
}

export async function updateCard(cardId: number, data: Partial<InsertCard> & { yAxisMin?: string; yAxisMax?: string; updateStartDate?: Date }) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Remove id from data to avoid trying to update the primary key
  const updateData: any = { ...data };
  delete updateData.id;
  
  // Convert lastUpdatedAt string to Date if provided
  if (updateData.lastUpdatedAt && typeof updateData.lastUpdatedAt === 'string') {
    updateData.lastUpdatedAt = new Date(updateData.lastUpdatedAt);
  }
  
  // Convert updateStartDate string to Date if provided
  if (updateData.updateStartDate && typeof updateData.updateStartDate === 'string') {
    updateData.updateStartDate = new Date(updateData.updateStartDate);
  }
  
  console.log('[db.updateCard] Updating card', cardId, 'with data:', updateData);
  
  const result = await db.update(cards).set(updateData).where(eq(cards.id, cardId));
  
  console.log('[db.updateCard] Update result:', result);
  
  return result;
}

export async function deleteCard(cardId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.delete(cards).where(eq(cards.id, cardId));
}

// ============ DATA POINT QUERIES ============
export async function getCardDataPoints(cardId: number, limit?: number) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(dataPoints).where(eq(dataPoints.cardId, cardId)).orderBy(dataPoints.createdAt);
  if (limit) {
    return query.limit(limit);
  }
  return query;
}

export async function addDataPoint(cardId: number, itemName: string, period: string, value: string, notes?: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.insert(dataPoints).values({ cardId, itemName, period, value, notes });
}

export async function deleteDataPoint(dataPointId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.delete(dataPoints).where(eq(dataPoints.id, dataPointId));
}

// ============ WATCHLIST QUERIES ============
export async function getUserWatchlist(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(watchlist).where(eq(watchlist.userId, userId)).orderBy(watchlist.order);
}

export async function addToWatchlist(userId: number, cardId: number, order: number = 0) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.insert(watchlist).values({ userId, cardId, order });
}

export async function removeFromWatchlist(userId: number, cardId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.delete(watchlist).where(and(eq(watchlist.userId, userId), eq(watchlist.cardId, cardId)));
}

export async function updateWatchlistOrder(watchlistId: number, order: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.update(watchlist).set({ order }).where(eq(watchlist.id, watchlistId));
}

// ============ STATISTICS QUERIES ============
export async function getCardStatistics(cardId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(statistics).where(eq(statistics.cardId, cardId)).limit(1);
  return result[0] || null;
}

export async function updateStatistics(cardId: number, data: Partial<InsertStatistic>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const existing = await getCardStatistics(cardId);
  if (existing) {
    return db.update(statistics).set(data).where(eq(statistics.cardId, cardId));
  } else {
    return db.insert(statistics).values({ cardId, ...data });
  }
}

// ============ ANOMALY QUERIES ============
export async function createAnomaly(data: InsertAnomaly) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.insert(anomalies).values(data);
}

export async function getCardAnomalies(cardId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(anomalies).where(eq(anomalies.cardId, cardId)).orderBy(anomalies.createdAt);
}

export async function markAnomalyAsNotified(anomalyId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.update(anomalies).set({ notified: true }).where(eq(anomalies.id, anomalyId));
}

// ============ STATISTICS CALCULATION ============
export async function calculateCardStatistics(cardId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const points = await db.select().from(dataPoints).where(eq(dataPoints.cardId, cardId));
  
  if (points.length === 0) {
    return null;
  }

  const values = points.map(p => parseFloat(p.value));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
  
  // Calculate trend
  let trend = 'stable';
  if (points.length >= 2) {
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg * 1.05) {
      trend = 'up';
    } else if (secondAvg < firstAvg * 0.95) {
      trend = 'down';
    }
  }

  return {
    minValue: minValue.toString(),
    maxValue: maxValue.toString(),
    avgValue: avgValue.toFixed(2),
    trend,
    dataCount: points.length,
  };
}


// ============ CARD ITEM NAMES QUERIES ============
export async function getCardItemNames(cardId: number): Promise<CardItemName[]> {
  const db = await getDb();
  if (!db) return [];
  
  // First, try to get item names from cardItemNames table
  const itemNamesFromDb = await db.select().from(cardItemNames).where(eq(cardItemNames.cardId, cardId)).orderBy(cardItemNames.order);
  
  // If we have explicit item names, return them
  if (itemNamesFromDb.length > 0) {
    return itemNamesFromDb;
  }
  
  // Otherwise, extract unique item names from dataPoints table
  // This handles legacy data that doesn't have cardItemNames records yet
  const distinctItemNames = await db.selectDistinct({ itemName: dataPoints.itemName })
    .from(dataPoints)
    .where(eq(dataPoints.cardId, cardId));
  
  // Convert dataPoints item names to CardItemName format
  // These are temporary records without database IDs
  const result: CardItemName[] = distinctItemNames.map((item, index) => ({
    id: -(index + 1), // Use negative IDs for temporary records
    cardId,
    name: item.itemName,
    order: index,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  
  return result;
}

export async function addCardItemName(cardId: number, name: string, order: number = 0) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.insert(cardItemNames).values({ cardId, name, order });
}

export async function updateCardItemName(itemNameId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.update(cardItemNames).set({ name }).where(eq(cardItemNames.id, itemNameId));
}

export async function updateCardItemNameOrder(itemNameId: number, order: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.update(cardItemNames).set({ order }).where(eq(cardItemNames.id, itemNameId));
}

export async function deleteCardItemName(itemNameId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.delete(cardItemNames).where(eq(cardItemNames.id, itemNameId));
}

// 批量保存項目名稱順序：支持臨時記錄（負數 ID）和真實記錄
// 如果項目是臨時記錄（負數 ID），則先將其插入資料庫再更新順序
export async function batchSaveCardItemNamesOrder(
  cardId: number,
  items: Array<{ id: number; name: string; order: number }>
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // 先刪除該卡片的所有現有記錄
  await db.delete(cardItemNames).where(eq(cardItemNames.cardId, cardId));

  // 按新順序重新插入所有項目（自動產生新 ID）
  if (items.length > 0) {
    await db.insert(cardItemNames).values(
      items.map((item) => ({
        cardId,
        name: item.name,
        order: item.order,
      }))
    );
  }

  // 回傳更新後的記錄
  return db.select().from(cardItemNames).where(eq(cardItemNames.cardId, cardId)).orderBy(cardItemNames.order);
}


// Template management
export async function getTemplates() {
  const db = await getDb();
  if (!db) return [];
  try {
    const { templates } = await import("../drizzle/schema");
    return db.select().from(templates).orderBy(templates.createdAt);
  } catch (error) {
    console.error("[Database] Error getting templates:", error);
    return [];
  }
}

export async function getTemplateById(id: number) {
  const db = await getDb();
  if (!db) return null;
  try {
    const { templates } = await import("../drizzle/schema");
    const result = await db.select().from(templates).where(eq(templates.id, id));
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Error getting template:", error);
    return null;
  }
}

export async function createTemplate(userId: number, input: {
  title: string;
  description?: string;
  fileUrl: string;
  fileKey: string;
  fileType: "word" | "image" | "excel";
  fileName: string;
  previewUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    const { templates } = await import("../drizzle/schema");
    const result = await db.insert(templates).values({
      userId,
      title: input.title,
      description: input.description,
      fileUrl: input.fileUrl,
      fileKey: input.fileKey,
      fileType: input.fileType,
      fileName: input.fileName,
      previewUrl: input.previewUrl,
    });
    return result;
  } catch (error) {
    console.error("[Database] Error creating template:", error);
    throw error;
  }
}

export async function updateTemplate(id: number, input: {
  title?: string;
  description?: string;
  previewUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    const { templates } = await import("../drizzle/schema");
    const updateData: Record<string, any> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.previewUrl !== undefined) updateData.previewUrl = input.previewUrl;
    
    return await db.update(templates).set(updateData).where(eq(templates.id, id));
  } catch (error) {
    console.error("[Database] Error updating template:", error);
    throw error;
  }
}

export async function deleteTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    const { templates } = await import("../drizzle/schema");
    return await db.delete(templates).where(eq(templates.id, id));
  } catch (error) {
    console.error("[Database] Error deleting template:", error);
    throw error;
  }
}

export async function incrementTemplateDownloadCount(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    const { templates } = await import("../drizzle/schema");
    const template = await getTemplateById(id);
    if (!template) throw new Error("Template not found");
    
    return await db.update(templates)
      .set({ downloadCount: (template.downloadCount || 0) + 1 })
      .where(eq(templates.id, id));
  } catch (error) {
    console.error("[Database] Error incrementing download count:", error);
    throw error;
  }
}


// Task operations
export async function createTask(userId: number, input: {
  title: string;
  description?: string;
  totalSteps?: number;
  stepNames?: string[];
  assignee?: string;
  dueDate?: string;
  priority?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    const stepNamesJson = input.stepNames ? JSON.stringify(input.stepNames) : null;
    const result = await db.insert(tasks).values({
      userId,
      title: input.title,
      description: input.description,
      totalSteps: input.totalSteps || 5,
      currentStep: 1,
      stepNames: stepNamesJson,
      assignee: input.assignee,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      priority: input.priority || "normal",
      isCompleted: false,
    });
    return result;
  } catch (error) {
    console.error("[Database] Error creating task:", error);
    throw error;
  }
}

export async function getTasksByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(tasks).where(eq(tasks.userId, userId));
  } catch (error) {
    console.error("[Database] Error fetching tasks:", error);
    return [];
  }
}

export async function getTaskById(id: number) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(tasks).where(eq(tasks.id, id));
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Error fetching task:", error);
    return null;
  }
}

export async function updateTask(id: number, input: {
  title?: string;
  description?: string;
  currentStep?: number;
  totalSteps?: number;
  stepNames?: string[];
  isCompleted?: boolean;
  assignee?: string;
  dueDate?: string;
  priority?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    const updateData: Record<string, any> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.currentStep !== undefined) updateData.currentStep = input.currentStep;
    if (input.totalSteps !== undefined) updateData.totalSteps = input.totalSteps;
    if (input.stepNames !== undefined) updateData.stepNames = JSON.stringify(input.stepNames);
    if (input.isCompleted !== undefined) updateData.isCompleted = input.isCompleted;
    if (input.assignee !== undefined) updateData.assignee = input.assignee;
    if (input.dueDate !== undefined) updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    if (input.priority !== undefined) updateData.priority = input.priority;
    updateData.lastUpdatedAt = new Date();
    
    return await db.update(tasks).set(updateData).where(eq(tasks.id, id));
  } catch (error) {
    console.error("[Database] Error updating task:", error);
    throw error;
  }
}

export async function deleteTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    return await db.delete(tasks).where(eq(tasks.id, id));
  } catch (error) {
    console.error("[Database] Error deleting task:", error);
    throw error;
  }
}

// ============ cardTables helpers ============

export async function getCardTables(cardId: number): Promise<CardTable[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    return await db
      .select()
      .from(cardTables)
      .where(eq(cardTables.cardId, cardId))
      .orderBy(cardTables.order);
  } catch (error) {
    console.error("[Database] Error getting card tables:", error);
    throw error;
  }
}

export async function createCardTable(data: InsertCardTable): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    const result = await db.insert(cardTables).values(data);
    return { id: Number((result as any)[0]?.insertId ?? 0) };
  } catch (error) {
    console.error("[Database] Error creating card table:", error);
    throw error;
  }
}

export async function updateCardTable(
  id: number,
  data: Partial<Pick<InsertCardTable, "title" | "columns" | "rows" | "order">>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.update(cardTables).set(data).where(eq(cardTables.id, id));
  } catch (error) {
    console.error("[Database] Error updating card table:", error);
    throw error;
  }
}

export async function deleteCardTable(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.delete(cardTables).where(eq(cardTables.id, id));
  } catch (error) {
    console.error("[Database] Error deleting card table:", error);
    throw error;
  }
}
