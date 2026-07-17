import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { notifyOwner } from "./_core/notification";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { cards as cardsTable, dataPoints as dataPointsTable } from "../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Category management
  categories: router({
    list: protectedProcedure.query(({ ctx }) => db.getUserCategories(ctx.user.id)),
    create: protectedProcedure
      .input(z.object({ name: z.string(), color: z.string().optional(), description: z.string().optional() }))
      .mutation(({ ctx, input }) => db.createCategory(ctx.user.id, input)),
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), color: z.string().optional(), description: z.string().optional() }))
      .mutation(({ input }) => db.updateCategory(input.id, input)),
    delete: protectedProcedure.input(z.number()).mutation(({ input }) => db.deleteCategory(input)),
  }),

  // Card management
  cards: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Admin can see all cards, non-admin can see all cards too (but can't edit)
      const database = await db.getDb();
      if (!database) return [];
      const cards = await database.select().from(cardsTable).orderBy(cardsTable.createdAt);
      
      // 為每個卡片添加 dataPoints
      const cardsWithData = await Promise.all(
        cards.map(async (card: any) => {
          const dataPoints = await database
            .select()
            .from(dataPointsTable)
            .where(eq(dataPointsTable.cardId, card.id));
          return {
            ...card,
            dataPoints: dataPoints || [],
          };
        })
      );
      
      return cardsWithData;
    }),
    listPublic: publicProcedure.query(async () => {
      // Return all cards for public viewing (no user filter)
      const database = await db.getDb();
      if (!database) return [];
      const cards = await database.select().from(cardsTable).orderBy(cardsTable.createdAt);
      
      // 為每個卡片添加 dataPoints
      const cardsWithData = await Promise.all(
        cards.map(async (card: any) => {
          const dataPoints = await database
            .select()
            .from(dataPointsTable)
            .where(eq(dataPointsTable.cardId, card.id));
          return {
            ...card,
            dataPoints: dataPoints || [],
          };
        })
      );
      
      return cardsWithData;
    }),
    get: protectedProcedure.input(z.number()).query(({ input }) => db.getCardById(input)),
    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        categoryId: z.number().optional(),
        chartType: z.enum(["line", "bar", "area", "mixed"]).optional(),
        unit: z.string().optional(),
        threshold: z.string().optional(),
        thresholdType: z.enum(["max", "min", "none"]).optional(),
        infoUrl: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => db.createCard(ctx.user.id, input)),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        categoryId: z.number().optional(),
        chartType: z.enum(["line", "bar", "area", "mixed"]).optional(),
        unit: z.string().optional(),
        threshold: z.string().optional(),
        thresholdType: z.enum(["max", "min", "none"]).optional(),
        infoUrl: z.string().optional(),
        yAxisMin: z.string().optional(),
        yAxisMax: z.string().optional(),
        barWidth: z.string().optional(),
        visibleItems: z.string().optional(),
        periodOrder: z.string().optional(),
        updateFrequency: z.enum(["monthly", "quarterly", "yearly", "none"]).optional(),
        updateStartDate: z.date().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(({ input }) => db.updateCard(input.id, input)),
    delete: protectedProcedure.input(z.number()).mutation(({ input }) => db.deleteCard(input)),

  }),

  // Data points management
  dataPoints: router({
    list: protectedProcedure.input(z.number()).query(({ input }) => db.getCardDataPoints(input)),
    listPublic: publicProcedure.input(z.number()).query(async ({ input }) => {
      // Return data points for public viewing (no authentication required)
      return db.getCardDataPoints(input);
    }),

    add: protectedProcedure
      .input(z.object({
        cardId: z.number(),
        itemName: z.string(),
        period: z.string(),
        value: z.string(),
        notes: z.string().optional(),
      }))
      .mutation(({ input }) => db.addDataPoint(input.cardId, input.itemName, input.period, input.value, input.notes)),
    delete: protectedProcedure.input(z.number()).mutation(({ input }) => db.deleteDataPoint(input)),

  }),

  // Card Item Names management
  cardItemNames: router({
    list: protectedProcedure.input(z.number()).query(({ input }) => db.getCardItemNames(input)),
    listPublic: publicProcedure.input(z.number()).query(async ({ input }) => {
      // Return item names for public viewing (no authentication required)
      return db.getCardItemNames(input);
    }),
    add: protectedProcedure
      .input(z.object({
        cardId: z.number(),
        name: z.string(),
        order: z.number().optional(),
      }))
      .mutation(({ input }) => db.addCardItemName(input.cardId, input.name, input.order ?? 0)),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string(),
      }))
      .mutation(({ input }) => db.updateCardItemName(input.id, input.name)),
    updateOrder: protectedProcedure
      .input(z.object({
        id: z.number(),
        order: z.number(),
      }))
      .mutation(({ input }) => db.updateCardItemNameOrder(input.id, input.order)),
    // 批量保存順序：支持臨時記錄（負數 ID）和真實記錄
    batchSaveOrder: protectedProcedure
      .input(z.object({
        cardId: z.number(),
        items: z.array(z.object({
          id: z.number(),
          name: z.string(),
          order: z.number(),
        })),
      }))
      .mutation(({ input }) => db.batchSaveCardItemNamesOrder(input.cardId, input.items)),
    delete: protectedProcedure.input(z.number()).mutation(({ input }) => db.deleteCardItemName(input)),
  }),

  // Watchlist management
  watchlist: router({
    list: protectedProcedure.query(({ ctx }) => db.getUserWatchlist(ctx.user.id)),
    add: protectedProcedure
      .input(z.object({ cardId: z.number() }))
      .mutation(({ ctx, input }) => db.addToWatchlist(ctx.user.id, input.cardId)),
    remove: protectedProcedure
      .input(z.number())
      .mutation(({ ctx, input }) => db.removeFromWatchlist(ctx.user.id, input)),
  }),

  // Task management
  tasks: router({
    list: protectedProcedure.query(({ ctx }) => db.getTasksByUserId(ctx.user.id)),
    get: protectedProcedure
      .input(z.number())
      .query(({ input }) => db.getTaskById(input)),
    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        totalSteps: z.number().optional(),
        stepNames: z.array(z.string()).optional(),
        assignee: z.string().optional(),
        dueDate: z.string().optional(),
        priority: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can create tasks" });
        }
        return db.createTask(ctx.user.id, input);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        currentStep: z.number().optional(),
        totalSteps: z.number().optional(),
        stepNames: z.array(z.string()).optional(),
        isCompleted: z.boolean().optional(),
        assignee: z.string().optional(),
        dueDate: z.string().optional(),
        priority: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can update tasks" });
        }
        return db.updateTask(input.id, input);
      }),
    delete: protectedProcedure
      .input(z.number())
      .mutation(({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can delete tasks" });
        }
        return db.deleteTask(input);
      }),
  }),

  // Template management
  templates: router({
    list: publicProcedure.query(() => db.getTemplates()),
    get: publicProcedure.input(z.number()).query(({ input }) => db.getTemplateById(input)),
    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        fileUrl: z.string(),
        fileKey: z.string(),
        fileType: z.enum(["word", "image", "excel"]),
        fileName: z.string(),
        previewUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can upload templates" });
        }
        return db.createTemplate(ctx.user.id, input);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        previewUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can update templates" });
        }
        return db.updateTemplate(input.id, input);
      }),
    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can delete templates" });
        }
        return db.deleteTemplate(input);
      }),
     incrementDownload: publicProcedure
      .input(z.number())
      .mutation(({ input }) => db.incrementTemplateDownloadCount(input)),
  }),

  // Card table descriptions
  cardTables: router({
    // Public: anyone can read table descriptions
    list: publicProcedure
      .input(z.number())
      .query(({ input }) => db.getCardTables(input)),

    create: protectedProcedure
      .input(z.object({
        cardId: z.number(),
        title: z.string().optional().default(""),
        columns: z.string(), // JSON string
        rows: z.string(),    // JSON string
        order: z.number().optional().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can create table descriptions" });
        }
        return db.createCardTable(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        columns: z.string().optional(),
        rows: z.string().optional(),
        order: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can update table descriptions" });
        }
        const { id, ...data } = input;
        return db.updateCardTable(id, data);
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can delete table descriptions" });
        }
        return db.deleteCardTable(input);
      }),
  }),
});
export type AppRouter = typeof appRouter;
