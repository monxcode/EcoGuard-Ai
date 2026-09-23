import { z } from "zod";
import { isValidLocationId } from "../../shared/locations";

/** Known seed ids and self-contained searched-city ids (see shared/locations.ts). */
const locationIdField = z
  .string()
  .optional()
  .refine((id) => isValidLocationId(id), "unknown locationId");

export const locationQuerySchema = z.object({
  locationId: locationIdField,
});

export const locationSearchSchema = z.object({
  q: z.string().trim().min(2, "query too short").max(100, "query too long"),
});

export const assistantAskSchema = z.object({
  message: z.string().trim().min(1, "message required").max(1000, "message too long"),
  locationId: locationIdField,
});

export const wasteClassifySchema = z
  .object({
    sampleId: z.string().max(100).optional(),
    fileName: z.string().max(255).optional(),
    dataUrl: z.string().max(6_000_000).optional(),
  })
  .refine((v) => Boolean(v.sampleId || v.fileName || v.dataUrl), {
    message: "provide sampleId, fileName, or dataUrl",
  });

export const routeCompareSchema = z.object({
  locationId: locationIdField,
  routeIds: z.array(z.string().max(50)).min(2).max(5).optional(),
});

export const reportCreateSchema = z.object({
  locationId: locationIdField,
  title: z.string().trim().max(200).optional(),
  include: z.array(z.string().max(50)).max(20).optional(),
});

export const demoToggleSchema = z.object({
  enabled: z.boolean(),
});

export const IMAGE_DATA_URL = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
