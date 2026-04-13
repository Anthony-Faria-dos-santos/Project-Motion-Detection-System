# MotionOps

MotionOps is a web platform for video analytics built around a simple idea: a video feed is only useful once it can be supervised, understood, tuned and audited. Detecting motion is not enough. What matters is the chain that runs from the raw pixel to a human decision that leaves a trace.

The system ingests one or more camera feeds, pushes them through a computer-vision engine, qualifies what happens in the scene, emits structured events, surfaces them live in a supervision interface, stores them for investigation, and exposes to administrators the levers needed to tune the engine without interrupting service.

## What the system does

Three components run in parallel and communicate through explicit contracts.

The vision worker ingests video sources, runs an OpenCV preprocessing pipeline, then applies YOLO detection coupled with ByteTrack tracking to follow objects across time. It does not stop at "something moved": it produces timestamped observations, object tracks, and events qualified by runtime rules (zones of interest, thresholds, scene filters, temporal grouping). Rules reload hot, without restarting the stream.

The API orchestrates the rest. Authentication and RBAC through Supabase Auth, persistence through Prisma on Postgres, a Socket.IO WebSocket hub to push events and live state to connected clients, an audit log covering every administrative action, and runtime configuration validated through Zod schemas shared with the frontend.

The frontend serves four distinct surfaces: real-time supervision with the live feed and its event context, an admin console to drive sources, rules, scene profiles and sensitive parameters with immediate feedback from the worker, post-incident investigation with timeline, replayable clips and annotations, and a health dashboard for pipeline latency, worker status and detection quality metrics.

## Why this project exists

Most motion detectors stop at the algorithm. They produce noise, do not explain their decisions, bury their settings in code, and leave nothing useful behind. The operator is left uncertain, the administrator tunes blind, the analyst has no material to reopen a case, and the system drifts without anyone knowing why.

MotionOps starts from the opposite assumption. An event must be justifiable. A setting must be reversible and traced. An alert must be tied to a named rule, a scene profile, a zone and a moment. An investigation must be able to replay the scene and find the algorithmic decision attached to it. An admin change must leave an audited footprint. That requirement for legibility drives the whole architecture.

## Who it is for

The product targets four distinct roles, each with its own dedicated surface.

The operator watches the live feed, qualifies incoming events quickly, and escalates the ones that deserve attention. Their interface is built for information density and keyboard-first reactivity.

The administrator adjusts sources, rules, thresholds, zones and scene profiles while the system runs. Every change is versioned, comparable, and reversible. Sensitive parameters require MFA and leave an audit entry.

The analyst reopens the history, reviews clips, cross-references events, annotates incidents and builds a usable narrative. The data model preserves forensic provenance on every event: rule triggered, engine version, configuration active at the moment of the fact.

The maintainer follows system health through a dedicated dashboard, watches engine drift, and feeds the continuous-improvement loop from the false positives flagged by operators.

## What is specific here

Hot rule reload without cutting the stream changes the iteration loop: an administrator can test a threshold, observe its effect on the live feed immediately, and revert it in one action, which a frozen pipeline cannot offer.

The forensic provenance attached to every event is not limited to a timestamp. An event carries the engine version, the rule identifier, the active scene profile and the effective parameters at the moment of emission. An event from 2026-02 stays interpretable after ten engine revisions.

The strict separation between perception (worker-cv), orchestration (api) and presentation (web) lets one swap a detector, add a camera or rebuild the UI without breaking the other two layers. Event and configuration contracts live in shared typed packages.

Audit and RBAC are treated as first-class product concerns, not patches. Every admin action, configuration change and MFA session leaves a structured trace that can be queried.

The learning loop is explicit. False positives flagged by operators become documented material, tied back to the configuration that produced them, reusable to improve rules and thresholds.

## Stack

Frontend on Next.js 15, React 19, Tailwind v4, shadcn/ui. API on Node.js with Express 5, Prisma, Socket.IO, Supabase Auth. Vision worker on Python 3.12 with OpenCV, YOLO, ByteTrack, FastAPI. Postgres database. Web deployed on Vercel, API and worker on a Hostinger KVM2 VPS.

## Status

The product is under active construction. The backend currently covers authentication, RBAC, runtime configuration, the event hub and audit. The frontend exposes the four main surfaces with empty, loading, error and insufficient-permission states handled explicitly. The vision worker and its event pipeline are the next structural step.
