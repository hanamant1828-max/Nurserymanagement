import { z } from 'zod';
import { insertUserSchema, insertCategorySchema, insertVarietySchema, insertLotSchema, insertOrderSchema, users, categories, varieties, lots, orders } from './schema';

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
