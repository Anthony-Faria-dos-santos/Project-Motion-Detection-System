import { z } from 'zod';

export const detectorConfigSchema = z.object({
  confidence: z.number().min(0.1).max(1.0).default(0.5),
  iou: z.number().min(0.1).max(1.0).default(0.45),
  classes: z.array(z.string()).default(['person', 'car']),
  inferenceSize: z.number().int().min(320).max(1280).default(640),
});

export const motionConfigSchema = z.object({
  sensitivity: z.number().min(0.0).max(1.0).default(0.5),
  minArea: z.number().int().min(100).max(10000).default(500),
  shadowDetection: z.boolean().default(true),
});

export const trackingConfigSchema = z.object({
  trackBuffer: z.number().int().min(1).max(120).default(30),
  matchThreshold: z.number().min(0.1).max(1.0).default(0.8),
  newTrackThreshold: z.number().min(0.1).max(1.0).default(0.6),
});

export const alertingConfigSchema = z.object({
  globalCooldownMs: z.number().int().min(0).max(300000).default(60000),
  minSeverity: z.enum(['info', 'low', 'medium', 'high', 'critical']).default('low'),
  suppressDuplicates: z.boolean().default(true),
});

export const runtimeConfigSchema = z.object({
  detector: detectorConfigSchema,
  motion: motionConfigSchema,
  tracking: trackingConfigSchema,
  alerting: alertingConfigSchema,
});

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;
