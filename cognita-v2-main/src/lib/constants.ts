/** Shared constants used across the application */

// AI context limits (characters)
export const AI_CONTEXT_SHORT = 2000
export const AI_CONTEXT_MEDIUM = 3000
export const AI_CONTEXT_LONG = 5000
export const AI_CONTEXT_XLARGE = 7000
export const AI_CONTEXT_MAX = 10000

// Rate limiting
export const RATE_LIMIT_AI_MAX = 10          // requests per window
export const RATE_LIMIT_AI_WINDOW_MS = 60_000 // 1 minute
export const RATE_LIMIT_UPLOAD_MAX = 5
export const RATE_LIMIT_UPLOAD_WINDOW_MS = 60_000

// File upload
export const MAX_PDF_SIZE_BYTES = 50 * 1024 * 1024    // 50MB
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024   // 10MB
export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024   // 5MB
export const MAX_GUTENBERG_TEXT_BYTES = 600_000         // 600KB

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
export const ALLOWED_PDF_TYPES = ['application/pdf'] as const

// Safe file extensions (must match ALLOWED_IMAGE_TYPES)
export const SAFE_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

// Pagination
export const DEFAULT_PAGE_LIMIT = 50
export const MAX_PAGE_LIMIT = 100

// Reader
export const WORDS_PER_PAGE = 300

// Input limits
export const MAX_MESSAGE_LENGTH = 5000
export const MAX_TITLE_LENGTH = 500
export const MAX_BOOK_CONTENT_LENGTH = 100_000
export const MAX_TEXT_INPUT_LENGTH = 50_000
