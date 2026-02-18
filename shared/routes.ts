import { z } from 'zod';
import { insertUserSchema, insertCategorySchema, insertVarietySchema, insertLotSchema, insertOrderSchema, insertSeedInwardSchema, users, categories, varieties, lots, orders, auditLogs, seedInward } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: z.object({ message: z.string() }),
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: { 200: z.void() },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user',
      responses: { 200: z.custom<typeof users.$inferSelect | null>() },
    },
  },
  categories: {
    list: {
      method: 'GET' as const,
      path: '/api/categories',
      responses: { 200: z.array(z.custom<typeof categories.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/categories',
      input: insertCategorySchema,
      responses: { 201: z.custom<typeof categories.$inferSelect>() },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/categories/:id',
      input: insertCategorySchema.partial(),
      responses: { 200: z.custom<typeof categories.$inferSelect>() },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/categories/:id',
      responses: { 200: z.void() },
    },
  },
  varieties: {
    list: {
      method: 'GET' as const,
      path: '/api/varieties',
      responses: { 200: z.array(z.custom<typeof varieties.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/varieties',
      input: insertVarietySchema,
      responses: { 201: z.custom<typeof varieties.$inferSelect>() },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/varieties/:id',
      input: insertVarietySchema.partial(),
      responses: { 200: z.custom<typeof varieties.$inferSelect>() },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/varieties/:id',
      responses: { 200: z.void() },
    },
  },
  lots: {
    list: {
      method: 'GET' as const,
      path: '/api/lots',
      responses: { 200: z.array(z.custom<typeof lots.$inferSelect & { category: typeof categories.$inferSelect, variety: typeof varieties.$inferSelect, available: number }>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/lots',
      input: insertLotSchema,
      responses: { 201: z.custom<typeof lots.$inferSelect>() },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/lots/:id',
      input: insertLotSchema.partial(),
      responses: { 200: z.custom<typeof lots.$inferSelect>() },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/lots/:id',
      responses: { 200: z.void() },
    },
  },
  orders: {
    list: {
      method: 'GET' as const,
      path: '/api/orders',
      responses: { 200: z.array(z.custom<typeof orders.$inferSelect & { lot: typeof lots.$inferSelect }>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/orders',
      input: insertOrderSchema,
      responses: { 201: z.custom<typeof orders.$inferSelect>() },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/orders/:id',
      input: insertOrderSchema.partial(),
      responses: { 200: z.custom<typeof orders.$inferSelect>() },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/orders/:id',
      responses: { 200: z.void() },
    },
  },
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users',
      responses: { 200: z.array(z.custom<typeof users.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/users',
      input: insertUserSchema,
      responses: { 201: z.custom<typeof users.$inferSelect>() },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/users/:id',
      responses: { 200: z.void() },
    },
  },
  auditLogs: {
    list: {
      method: 'GET' as const,
      path: '/api/audit-logs',
      responses: { 200: z.array(z.custom<typeof auditLogs.$inferSelect & { user: typeof users.$inferSelect }>()) },
    },
  },
  seedInward: {
    list: {
      method: 'GET' as const,
      path: '/api/seed-inward',
      responses: { 200: z.array(z.custom<typeof seedInward.$inferSelect & { category: typeof categories.$inferSelect, variety: typeof varieties.$inferSelect }>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/seed-inward',
      input: insertSeedInwardSchema,
      responses: { 201: z.custom<typeof seedInward.$inferSelect>() },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/seed-inward/:id',
      input: insertSeedInwardSchema.partial(),
      responses: { 200: z.custom<typeof seedInward.$inferSelect>() },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/seed-inward/:id',
      responses: { 200: z.void() },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
