import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { authenticate, authorize, type AuthenticatedRequest } from '../middleware/auth';

const createPresetSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  config: z.record(z.unknown()).default({}),
  scope: z.string().max(50).default('global'),
});

export const configRouter: ReturnType<typeof Router> = Router();

// GET /api/config/presets
configRouter.get('/presets', authenticate, async (_req, res) => {
  try {
    const presets = await prisma.preset.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({
      data: presets.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        isBuiltIn: p.isBuiltIn,
        scope: p.scope,
        createdBy: p.createdBy,
        createdAt: p.createdAt.toISOString(),
      })),
      pagination: { page: 1, limit: presets.length, total: presets.length, totalPages: 1 },
    });
  } catch (err) {
    logger.error({ err }, 'Failed to list presets');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to list presets', retryable: true } });
  }
});

// GET /api/config/runtime (returns current config view)
configRouter.get('/runtime', authenticate, async (_req, res) => {
  // For now, return default config. In production, this would read from a config table or active preset.
  res.json({
    presetId: null,
    presetName: null,
    version: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: null,
    permissions: { canEdit: true, canApplyPreset: true, canRollback: true },
    sections: [
      {
        key: 'detector',
        label: 'Detection',
        editable: true,
        fields: [
          { key: 'confidence', label: 'Confidence', type: 'float', value: 0.5, defaultValue: 0.5, min: 0.1, max: 1.0, step: 0.05, description: 'Minimum detection confidence' },
          { key: 'iou', label: 'IoU Threshold', type: 'float', value: 0.45, defaultValue: 0.45, min: 0.1, max: 1.0, step: 0.05, description: 'NMS IoU threshold' },
        ],
      },
      {
        key: 'motion',
        label: 'Motion',
        editable: true,
        fields: [
          { key: 'sensitivity', label: 'Sensitivity', type: 'float', value: 0.5, defaultValue: 0.5, min: 0.0, max: 1.0, step: 0.05, description: 'Motion sensitivity' },
        ],
      },
    ],
  });
});

// POST /api/config/presets
configRouter.post('/presets', authenticate, authorize('preset:create'), async (req: AuthenticatedRequest, res) => {
  try {
    const data = createPresetSchema.parse(req.body);
    const preset = await prisma.preset.create({
      data: {
        name: data.name,
        description: data.description,
        config: data.config as any,
        scope: data.scope,
        createdBy: req.user!.id,
      },
    });
    res.status(201).json(preset);
  } catch (err) {
    logger.error({ err }, 'Failed to create preset');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to create preset', retryable: true } });
  }
});
