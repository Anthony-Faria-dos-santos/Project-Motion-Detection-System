---
notion_id: 350c2705-92bb-813c-addd-d7f7e2f83303
ref: RES-001
title: RLS tenant isolation Supabase — design + GUCs + 14 tables
last_edited_time: "2026-04-28T02:06:00.000Z"
archived: false
properties:
  Conclusion: Implémentation possible mais nécessite wrapper request-scoped (AsyncLocalStorage) et vérification preservation GUC pgbouncer transaction-mode.
  Date de création: "2026-04-28T02:02:00.000Z"
  Tâches issues: []
  Résultats: ""
  Liens / sources: null
  Sprint: []
  Statut: Conclu
  Type: Spike
  Question initiale: "Comment isoler strictement chaque tenant au niveau DB ?"
  Méthode: Étude FORCE RLS + GUCs Postgres + middleware Express tenantContext + transaction wrapper.
  ADR déclenchée: ["350c2705-92bb-81c1-97a9-fc8695a23a85"]
  Titre: RLS tenant isolation Supabase — design + GUCs + 14 tables
---

