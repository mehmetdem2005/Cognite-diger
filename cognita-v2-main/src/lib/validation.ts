import { z } from 'zod'
import {
  MAX_MESSAGE_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_BOOK_CONTENT_LENGTH,
  MAX_TEXT_INPUT_LENGTH,
} from './constants'

// ── AI Chat ──
export const chatSchema = z.object({
  message: z.string().min(1).max(MAX_MESSAGE_LENGTH),
  book_content: z.string().max(MAX_BOOK_CONTENT_LENGTH).optional().default(''),
  book_title: z.string().max(MAX_TITLE_LENGTH).optional().default(''),
  groq_model: z.string().max(50).optional(),
})

// ── AI Analyze ──
export const analyzeSchema = z.object({
  text: z.string().min(1).max(MAX_TEXT_INPUT_LENGTH),
  book_title: z.string().max(MAX_TITLE_LENGTH).optional().default(''),
})

// ── Flashcards ──
export const flashcardsSchema = z.object({
  text: z.string().min(1).max(MAX_TEXT_INPUT_LENGTH),
  bookTitle: z.string().max(MAX_TITLE_LENGTH).optional().default(''),
})

// ── AI Classify ──
export const classifySchema = z.object({
  title: z.string().min(1).max(MAX_TITLE_LENGTH),
  author: z.string().max(MAX_TITLE_LENGTH).optional().default(''),
  description: z.string().max(MAX_TEXT_INPUT_LENGTH).optional().default(''),
  content: z.string().max(MAX_BOOK_CONTENT_LENGTH).optional().default(''),
})

// ── AI Book Info ──
export const bookInfoSchema = z.object({
  content: z.string().max(MAX_BOOK_CONTENT_LENGTH).optional().default(''),
  filename: z.string().max(500).optional().default(''),
})

// ── AI Stream ──
export const streamSchema = z.object({
  message: z.string().min(1).max(MAX_MESSAGE_LENGTH),
  book_content: z.string().max(MAX_BOOK_CONTENT_LENGTH).optional().default(''),
  book_title: z.string().max(MAX_TITLE_LENGTH).optional().default(''),
  model: z.string().max(50).optional().default('fast'),
  stream: z.boolean().optional().default(true),
})

// ── Vocabulary ──
export const vocabularyPostSchema = z.object({
  word: z.string().min(1).max(200),
  meaning: z.string().min(1).max(1000),
  example: z.string().max(2000).optional().nullable(),
  level: z.string().max(20).optional().nullable(),
  book_id: z.string().uuid().optional().nullable(),
})

export const vocabularyPatchSchema = z.object({
  id: z.string().uuid(),
  is_learned: z.boolean(),
})

// ── Books ──
export const bookCreateSchema = z.object({
  title: z.string().min(1).max(MAX_TITLE_LENGTH),
  author: z.string().max(MAX_TITLE_LENGTH).optional().nullable(),
  cover_url: z.string().url().max(2000).optional().nullable(),
  file_type: z.string().max(20).optional().default('text'),
  total_pages: z.number().int().positive().max(100000).optional().default(1),
  is_public: z.boolean().optional().default(false),
  tags: z.array(z.string().max(100)).max(20).optional().default([]),
  description: z.string().max(MAX_TEXT_INPUT_LENGTH).optional(),
  content: z.string().max(MAX_BOOK_CONTENT_LENGTH).optional(),
})

// ── Collections ──
export const collectionCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  cover_url: z.string().url().max(2000).optional().nullable(),
  is_public: z.boolean().optional().default(false),
})

export const collectionPatchSchema = z.object({
  action: z.enum(['add_book', 'remove_book']),
  collection_id: z.string().uuid(),
  book_id: z.string().uuid(),
})

// ── Reading Groups ──
export const groupCreateSchema = z.object({
  action: z.literal('create').optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  is_public: z.boolean().optional().default(true),
  book_id: z.string().uuid().optional().nullable(),
})

export const groupMessageSchema = z.object({
  action: z.literal('message'),
  group_id: z.string().uuid(),
  message: z.string().min(1).max(MAX_MESSAGE_LENGTH),
  section_key: z.string().max(200).optional().nullable(),
})

// ── Guides ──
export const guidePutSchema = z.object({
  book_id: z.string().uuid(),
  section_key: z.string().min(1).max(200),
  prediction: z.string().max(MAX_TEXT_INPUT_LENGTH).optional().nullable(),
  character_notes: z.string().max(MAX_TEXT_INPUT_LENGTH).optional().nullable(),
  main_idea: z.string().max(MAX_TEXT_INPUT_LENGTH).optional().nullable(),
})

// ── Admin Settings ──
export const adminSettingsPatchSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().max(10000),
  description: z.string().max(1000).optional(),
})

// ── Export ──
export const exportSchema = z.object({
  format: z.enum(['json', 'txt', 'markdown']).optional().default('markdown'),
})

// ── Gutenberg ──
export const gutenbergTextSchema = z.object({
  formats: z.record(z.string()),
  bookId: z.number().int().positive().optional(),
})
