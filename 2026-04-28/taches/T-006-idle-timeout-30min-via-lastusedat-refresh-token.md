---
notion_id: 350c2705-92bb-811c-a7a0-d84affbd111e
ref: T-006
title: Idle timeout 30min via lastUsedAt refresh token
last_edited_time: "2026-04-28T02:05:00.000Z"
archived: false
properties:
  Documentation à toucher: []
  Auteur: (created_by)
  Lien plan Superpowers: null
  Branche Git: ""
  ADR référencées: ["350c2705-92bb-818f-a871-dcb8271972be"]
  Solutions appliquées: ""
  Estimation (h): 3
  Problèmes rencontrés: ""
  Notes: ""
  Tier(s) liés: []
  Items sécurité: []
  Composants: []
  Type: Security
  Critères d'acceptation: "Schema lastUsedAt RefreshToken ; check at /auth/refresh ; force logout > 30min ; audit log SESSION_IDLE."
  Tests faits: []
  Phase: (rollup)
  Commits: ""
  Release(s): []
  Sprint: []
  Tests requis: []
  Dépendances bloquantes: []
  Agent en charge: backend
  Recherche source: []
  Date création: "2026-04-28T02:02:00.000Z"
  Statut: Backlog
  Agent assigné (relation): []
  Temps réel (h): null
  Date démarrage: null
  PR: null
  Décision de conception: ""
  Risques activés: ["350c2705-92bb-814c-afec-d3a37ce533ec"]
  Bugs ouverts: []
  Date clôture: null
  Surface: ["api","auth"]
  Priorité: P1-Critique
  Issue GitHub: null
  ID: (unique_id)
  Modèle IA utilisé: null
  Titre: Idle timeout 30min via lastUsedAt refresh token
---

