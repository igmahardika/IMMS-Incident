import { z } from 'zod';

const optionalIntFromForm = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
}, z.number().int().positive().optional());

const optionalNumberFromForm = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
}, z.number().optional());

export const gisCoordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const incidentCreateSchema = z.object({
  case_no: z.string().min(1, "Nomor Case wajib diisi!"),
  customer_id: optionalIntFromForm,
  ncal: z.enum(['BLUE', 'YELLOW', 'ORANGE', 'RED', 'BLACK']).default('YELLOW'),
  odp_bts: z.string().optional(),
  level_support: z.string().optional(),
  initial_problem: z.string().optional(),
  status: z.enum(['open', 'progress', 'pending', 'done']).default('open'),
  technician_id: optionalIntFromForm,
  classification_id: optionalIntFromForm,
  start_time: z.string().optional(), // Assuming ISO string for date/time
  customer_terdampak: z.string().optional(),
  koordinat: z.string().optional(), // Can also be refined further if needed
  sla: z.string().optional(),
  indikasi: z.string().optional(),
  pic: z.string().optional(),
  kabel: z.string().optional(),
  panjang_kabel: z.string().optional()
});

export const incidentUpdateSchema = incidentCreateSchema.partial().extend({
  root_cause: z.string().optional(),
  last_action: z.string().optional(),
  power_before: z.string().optional(),
  power_after: z.string().optional(),
  end_time: z.string().optional(),
  duration_gross_seconds: optionalNumberFromForm,
  duration_nett_seconds: optionalNumberFromForm,
});

// Middleware to integrate Zod mapping with Express
export const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      // Validate incoming request body against the defined Zod schema
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: error.issues.map((e) => ({ path: e.path.join('.'), message: e.message }))
        });
      }
      next(error);
    }
  };
};
