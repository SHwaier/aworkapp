import { z } from "zod";
import { sanitizeMultiline, sanitizeText, sanitizeUrl } from "@/lib/security/sanitize";

/**
 * An update schema from a create schema's partial: keeps only the fields the request sent.
 * A plain .partial() still fills in the create defaults (status "Saved", salary 0, ...),
 * which would silently overwrite stored values on every partial update.
 */
function onlyProvided<S extends z.ZodObject>(schema: S) {
  return z.record(z.string(), z.unknown()).transform((input, ctx): Partial<z.output<S>> => {
    const result = schema.safeParse(input);
    if (!result.success) {
      for (const issue of result.error.issues)
        ctx.addIssue({ ...issue, input: undefined } as never);
      return z.NEVER;
    }
    return Object.fromEntries(
      Object.entries(result.data as Record<string, unknown>).filter(([key]) => key in input)
    ) as Partial<z.output<S>>;
  });
}

// ============================================
// Authentication Schemas
// ============================================

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address").max(255).toLowerCase().trim(),
  password: z.string().min(1, "Password is required").max(128, "Password is too long"),
});

export type LoginInput = z.infer<typeof loginSchema>;

const newPasswordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128, "Password is too long")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required").max(128),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must be different from your current password",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ============================================
// Admin: Member Management Schemas
// ============================================

export const createMemberSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long").trim(),
  email: z.string().email("Please enter a valid email address").max(255).toLowerCase().trim(),
  password: newPasswordSchema,
  role: z.enum(["user", "admin"]).optional().default("user"),
});

const aiDailyLimitSchema = z
  .number()
  .int("Must be a whole number")
  .min(0, "Must be 0 or more")
  .max(1000, "Must be 1000 or less");

export const updateMemberSchema = z
  .object({
    role: z.enum(["user", "admin"]).optional(),
    disabled: z.boolean().optional(),
    // null clears the override so the member uses the app-wide default
    aiDailyLimit: aiDailyLimitSchema.nullable().optional(),
  })
  .refine(
    (data) =>
      data.role !== undefined || data.disabled !== undefined || data.aiDailyLimit !== undefined,
    { message: "Nothing to update" }
  );

export const updateAiSettingsSchema = z
  .object({
    aiDailyLimit: aiDailyLimitSchema.optional(),
    aiExemptAdmins: z.boolean().optional(),
  })
  .refine((data) => data.aiDailyLimit !== undefined || data.aiExemptAdmins !== undefined, {
    message: "Nothing to update",
  });

export const updateSuggestionSchema = z.object({
  status: z.enum(["open", "done", "dismissed"]),
});

export const deleteMemberSchema = z.object({
  // Typed by the admin to confirm a permanent delete
  confirmEmail: z.string().max(255).toLowerCase().trim(),
});

export const resetMemberPasswordSchema = z.object({
  password: newPasswordSchema,
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type DeleteMemberInput = z.infer<typeof deleteMemberSchema>;
export type ResetMemberPasswordInput = z.infer<typeof resetMemberPasswordSchema>;

// ============================================
// Company Schemas
// ============================================

export const createCompanySchema = z.object({
  name: z
    .string()
    .min(1, "Company name is required")
    .max(200)
    .trim()
    .transform((val) => sanitizeText(val, 200)),
  website: z.preprocess(
    (val) => val || undefined,
    z
      .string()
      .url()
      .max(2000)
      .optional()
      .transform((val) => (val ? sanitizeUrl(val) || "" : ""))
  ),
  careersUrl: z.preprocess(
    (val) => val || undefined,
    z
      .string()
      .url()
      .max(2000)
      .optional()
      .transform((val) => (val ? sanitizeUrl(val) || "" : ""))
  ),
  linkedinUrl: z.preprocess(
    (val) => val || undefined,
    z
      .string()
      .url()
      .max(2000)
      .optional()
      .transform((val) => (val ? sanitizeUrl(val) || "" : ""))
  ),
  industry: z
    .string()
    .max(100)
    .optional()
    .default("")
    .transform((val) => sanitizeText(val, 100)),
  location: z
    .string()
    .max(200)
    .optional()
    .default("")
    .transform((val) => sanitizeText(val, 200)),
  notes: z
    .string()
    .max(5000)
    .optional()
    .default("")
    .transform((val) => sanitizeMultiline(val, 5000)),
  rating: z.number().min(0).max(5).optional().default(0),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  doNotApplyAgain: z.boolean().optional().default(false),
});

export const updateCompanySchema = onlyProvided(createCompanySchema.partial());

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

// ============================================
// Application Schemas
// ============================================

export const APPLICATION_STATUSES = [
  "Saved",
  "Interested",
  "Preparing documents",
  "Applied",
  "Waiting for response",
  "Follow-up needed",
  "Follow-up sent",
  "Recruiter contacted",
  "Screening scheduled",
  "Screening completed",
  "Interview scheduled",
  "Interview completed",
  "Technical assessment pending",
  "Technical assessment completed",
  "Final round",
  "Offer received",
  "Offer accepted",
  "Offer declined",
  "Rejected",
  "Ghosted",
  "Withdrawn",
  "Closed / posting removed",
] as const;

export const LIFECYCLE_STAGES = [
  "Saved",
  "Applied",
  "Screening received",
  "Screening completed",
  "Interview scheduled",
  "Interview completed",
  "Technical assessment completed",
  "Final round completed",
  "Offer received",
  "Rejected",
  "Withdrawn",
] as const;

export const WORK_MODES = ["remote", "hybrid", "onsite"] as const;

export const EMPLOYMENT_TYPES = [
  "full-time",
  "part-time",
  "contract",
  "internship",
  "co-op",
] as const;

export const JOB_SOURCES = [
  "LinkedIn",
  "Indeed",
  "Company site",
  "Referral",
  "Recruiter",
  "School board",
  "Glassdoor",
  "Other",
] as const;

/** Empty values become null so an update can clear a date */
const preprocessDate = (val: unknown) => {
  if (val === "" || val === null || val === "null") return null;
  if (val === undefined || val === "undefined") return undefined;
  const date = new Date(val as string | number | Date);
  return isNaN(date.getTime()) ? undefined : date;
};

const preprocessSalary = (val: unknown) => {
  if (val === "" || val === null || val === undefined || val === "null" || val === "undefined") {
    return 0;
  }
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

export const createApplicationSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  jobTitle: z
    .string()
    .min(1, "Job title is required")
    .max(300)
    .trim()
    .transform((val) => sanitizeText(val, 300)),
  jobDescription: z
    .string()
    .max(50000)
    .optional()
    .default("")
    .transform((val) => sanitizeMultiline(val, 50000)),
  jobUrl: z.preprocess(
    (val) => val || undefined,
    z
      .string()
      .url()
      .max(2000)
      .optional()
      .transform((val) => (val ? sanitizeUrl(val) || "" : ""))
  ),
  applicationUrl: z.preprocess(
    (val) => val || undefined,
    z
      .string()
      .url()
      .max(2000)
      .optional()
      .transform((val) => (val ? sanitizeUrl(val) || "" : ""))
  ),
  source: z.enum(JOB_SOURCES).optional().default("Other"),
  location: z
    .string()
    .max(200)
    .optional()
    .default("")
    .transform((val) => sanitizeText(val, 200)),
  workMode: z.enum(WORK_MODES).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  seniorityLevel: z
    .string()
    .max(100)
    .optional()
    .default("")
    .transform((val) => sanitizeText(val, 100)),
  salaryMin: z.preprocess(preprocessSalary, z.number().min(0).optional()).default(0),
  salaryMax: z.preprocess(preprocessSalary, z.number().min(0).optional()).default(0),
  currency: z.string().max(3).optional().default("USD"),
  datePosted: z.preprocess(preprocessDate, z.date().nullable().optional()),
  applicationDeadline: z.preprocess(preprocessDate, z.date().nullable().optional()),
  appliedAt: z.preprocess(preprocessDate, z.date().nullable().optional()),
  currentStatus: z.enum(APPLICATION_STATUSES).optional().default("Saved"),
  lifecycleStage: z.enum(LIFECYCLE_STAGES).optional().default("Saved"),
  nextAction: z
    .string()
    .max(500)
    .optional()
    .default("")
    .transform((val) => sanitizeText(val, 500)),
  nextActionDueAt: z.preprocess(preprocessDate, z.date().nullable().optional()),
  priority: z.number().min(0).max(5).optional().default(0),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
});

export const updateApplicationSchema = onlyProvided(createApplicationSchema.partial());

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;

// ============================================
// Timeline Event Schemas
// ============================================

export const TIMELINE_EVENT_TYPES = [
  "status_change",
  "note",
  "interview",
  "screening",
  "follow_up",
  "offer",
  "rejection",
  "application_submitted",
  "document_submitted",
  "reminder",
  "custom",
] as const;

export const createTimelineEventSchema = z.object({
  applicationId: z.string().min(1),
  type: z.enum(TIMELINE_EVENT_TYPES),
  title: z
    .string()
    .min(1, "Title is required")
    .max(300)
    .trim()
    .transform((val) => sanitizeText(val, 300)),
  description: z
    .string()
    .max(5000)
    .optional()
    .default("")
    .transform((val) => sanitizeMultiline(val, 5000)),
  statusAfterEvent: z.enum(APPLICATION_STATUSES).optional(),
  lifecycleStageAfterEvent: z.enum(LIFECYCLE_STAGES).optional(),
  eventDate: z.string().min(1, "Event date is required"),
  source: z
    .enum(["manual", "email-import", "calendar-import", "system", "ai"])
    .optional()
    .default("manual"),
});

export type CreateTimelineEventInput = z.infer<typeof createTimelineEventSchema>;

export const updateTimelineEventSchema = onlyProvided(
  createTimelineEventSchema.partial().omit({ applicationId: true })
);

export type UpdateTimelineEventInput = z.infer<typeof updateTimelineEventSchema>;

// ============================================
// Note Schemas
// ============================================

export const NOTE_TYPES = [
  "general",
  "prep",
  "recruiter",
  "interview",
  "rejection",
  "salary",
  "private",
  "red-flag",
] as const;

export const createNoteSchema = z.object({
  applicationId: z.string().min(1),
  type: z.enum(NOTE_TYPES).optional().default("general"),
  title: z
    .string()
    .max(300)
    .optional()
    .default("")
    .transform((val) => sanitizeText(val, 300)),
  body: z
    .string()
    .min(1, "Note body is required")
    .max(10000)
    .transform((val) => sanitizeMultiline(val, 10000)),
  pinned: z.boolean().optional().default(false),
});

export const updateNoteSchema = onlyProvided(
  createNoteSchema.partial().omit({ applicationId: true })
);

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

// ============================================
// Resume Version Schemas
// ============================================

const resumeText = (max: number) =>
  z
    .string()
    .max(max)
    .transform((val) => sanitizeText(val, max));

/** Editable details of a resume (its versions are uploaded files). */
export const updateResumeSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(200)
      .trim()
      .transform((val) => sanitizeText(val, 200)),
    targetRole: resumeText(200),
    targetIndustry: resumeText(200),
    skillsEmphasized: z.array(z.string().max(100)).max(30),
    notes: z
      .string()
      .max(5000)
      .transform((val) => sanitizeMultiline(val, 5000)),
    isActive: z.boolean(),
  })
  .partial();

/** Text fields sent alongside an uploaded resume file (multipart form). */
export const resumeUploadFieldsSchema = z.object({
  name: z.string().max(200).trim().optional(),
  targetRole: z.string().max(200).trim().optional(),
  note: z.string().max(300).trim().optional(),
});

export const applicationResumeUploadSchema = resumeUploadFieldsSchema.extend({
  mode: z.enum(["version", "new"]),
});

export const assignResumeSchema = z.object({
  resumeId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format"),
  versionNumber: z.number().int().min(1).optional(),
});

export const versionNumberSchema = z.coerce.number().int().min(1);

export type UpdateResumeInput = z.infer<typeof updateResumeSchema>;

// ============================================
// File Upload Schemas
// ============================================

export const FILE_CATEGORIES = [
  "resume",
  "cover-letter",
  "transcript",
  "portfolio",
  "certificate",
  "reference",
  "other",
] as const;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const fileMetadataSchema = z.object({
  displayName: z.string().min(1).max(200).trim(),
  category: z.enum(FILE_CATEGORIES).optional().default("other"),
});

export type FileMetadataInput = z.infer<typeof fileMetadataSchema>;

// ============================================
// Pagination Schema
// ============================================

const preprocessEmpty = (val: unknown) => (val === null || val === "" ? undefined : val);

export const paginationSchema = z.object({
  page: z.preprocess(preprocessEmpty, z.coerce.number().min(1).default(1)),
  limit: z.preprocess(preprocessEmpty, z.coerce.number().min(1).max(100).default(20)),
  sortBy: z.preprocess(preprocessEmpty, z.string().optional().default("createdAt")),
  sortOrder: z.preprocess(preprocessEmpty, z.enum(["asc", "desc"]).optional().default("desc")),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ============================================
// Common ID validation
// ============================================

export const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");
