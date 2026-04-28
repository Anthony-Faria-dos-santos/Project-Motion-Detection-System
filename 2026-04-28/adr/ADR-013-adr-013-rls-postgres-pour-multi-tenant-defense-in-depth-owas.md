---
notion_id: 350c2705-92bb-81c1-97a9-fc8695a23a85
ref: ADR-013
title: ADR-013 — RLS Postgres pour multi-tenant (defense-in-depth OWASP A01)
last_edited_time: "2026-04-28T02:06:00.000Z"
archived: false
properties:
  Conséquences négatives: ""
  Surface impactée: ["api","schema","security"]
  Statut: Acceptée
  Phase: ["350c2705-92bb-81c5-8667-d68619f955ba"]
  Liens externes: null
  Numéro ADR: 13
  Décision retenue: FORCE RLS + GUCs current_tenant_id + is_super_admin sur 14 tables tenant-scoped (cf docs/04-operations/rls-tenant-isolation.md).
  Tâches déclenchées: ["350c2705-92bb-814b-9114-ed17a2db77e8","350c2705-92bb-8124-9152-fc75e261b8ab"]
  Options évaluées: ""
  Sprint: []
  Conséquences positives: ""
  Remplacée par: []
  Releases d'application: []
  Recherches source: ["350c2705-92bb-813c-addd-d7f7e2f83303"]
  Stack de référence: []
  Remplace: []
  Date décision: null
  Fichier repo: null
  Contexte: Isolation cross-tenant.
  Titre: ADR-013 — RLS Postgres pour multi-tenant (defense-in-depth OWASP A01)
---

