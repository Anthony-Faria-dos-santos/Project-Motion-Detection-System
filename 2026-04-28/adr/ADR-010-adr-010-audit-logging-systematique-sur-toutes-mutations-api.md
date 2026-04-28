---
notion_id: 350c2705-92bb-818f-819f-eef00d506ed2
ref: ADR-010
title: ADR-010 — Audit logging systématique sur toutes mutations API
last_edited_time: "2026-04-28T02:06:00.000Z"
archived: false
properties:
  Conséquences négatives: ""
  Surface impactée: ["api","security"]
  Statut: Acceptée
  Phase: ["350c2705-92bb-81a6-ad18-c9c76eaa3efe"]
  Liens externes: null
  Numéro ADR: 10
  Décision retenue: AuditLog Prisma + helper audit() émis sur tout POST/PATCH/DELETE ; jamais log de secret (redactSensitive).
  Tâches déclenchées: []
  Options évaluées: ""
  Sprint: []
  Conséquences positives: ""
  Remplacée par: []
  Releases d'application: []
  Recherches source: []
  Stack de référence: []
  Remplace: []
  Date décision: null
  Fichier repo: null
  Contexte: Traçabilité des actions sensibles.
  Titre: ADR-010 — Audit logging systématique sur toutes mutations API
---

