---
notion_id: 350c2705-92bb-818f-a871-dcb8271972be
ref: ADR-007
title: "ADR-007 — JWT en cookies HttpOnly SameSite=Strict (vs localStorage)"
last_edited_time: "2026-04-28T02:06:00.000Z"
archived: false
properties:
  Conséquences négatives: ""
  Surface impactée: ["api","auth","frontend"]
  Statut: Acceptée
  Phase: ["350c2705-92bb-81a6-ad18-c9c76eaa3efe"]
  Liens externes: null
  Numéro ADR: 7
  Décision retenue: "HttpOnly + SameSite=Strict cookie ; access 15 min ; refresh 7 j rotated. CSRF mitigé par SameSite."
  Tâches déclenchées: ["350c2705-92bb-811c-a7a0-d84affbd111e"]
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
  Contexte: Stockage du token côté client.
  Titre: "ADR-007 — JWT en cookies HttpOnly SameSite=Strict (vs localStorage)"
---

