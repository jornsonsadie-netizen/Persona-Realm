# LoreWeave — AI Roleplay Platform

## Overview

LoreWeave is a full-stack AI roleplay platform where users create characters, build personas, and have deep immersive roleplay conversations with AI-powered character bots. Features include 1-on-1 chats, group chats, DMs between personas, and a premium pink glassmorphism cybercore UI.

pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Clerk (Google sign-in)
- **AI**: NVIDIA AI Gateway with fallback chain (deepseek-ai/deepseek-v3.1 → moonshotai/kimi-k2.5 → openai/gpt-oss-120b → ...)
- **Frontend**: React + Vite + Wouter routing + Tailwind CSS
- **API codegen**: Orval (from OpenAPI spec in lib/api-spec/openapi.yaml)
- **Build**: esbuild (for API server)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Packages

- `artifacts/api-server` — Express API server (port 8080)
- `artifacts/roleplay` — React/Vite frontend (main web app at `/`)
- `lib/api-spec` — OpenAPI spec + Orval codegen config
- `lib/api-client-react` — Generated React Query hooks + schemas
- `lib/db` — Drizzle ORM schema + database client

## DB Schema Tables

- `admin_settings` — AI provider config (endpoint, API key, context limits)
- `ai_models` — Registered AI models (modelId, displayName, enabled, isDefault)
- `tags` — Character/persona tags
- `characters` — AI character bots (name, age 18+, personality, lore, etc.)
- `personas` — User personas (one per user can be "main")
- `chats` — 1-on-1 chat sessions between a persona and a character
- `messages` — Individual messages in a chat
- `group_chats` — Group chat rooms
- `group_members` — Members of a group (personas + characters)
- `group_messages` — Messages in group chats
- `group_invites` — Invites from one persona to another to join a group
- `dm_messages` — Direct messages between personas

## API Routes

- `GET /api/healthz` — Health check
- `GET/PATCH /api/admin/settings` — AI provider configuration
- `GET/POST/PATCH/DELETE /api/admin/models` — Model management
- `GET /api/admin/stats` — Platform statistics
- `GET/POST /api/characters` — List/create characters
- `GET /api/characters/featured` — Featured characters
- `GET/PATCH/DELETE /api/characters/:id` — Character CRUD
- `GET/POST /api/personas` — List/create personas
- `GET /api/personas/search` — Search all user personas
- `GET/PATCH/DELETE /api/personas/:id` — Persona CRUD
- `POST /api/personas/:id/main` — Set main persona
- `GET/POST /api/tags` — List/create tags
- `GET/POST /api/chats` — List/create chats
- `GET/PATCH/DELETE /api/chats/:id` — Chat CRUD
- `POST /api/chats/:id/messages` — Send message (with CSAM filter + AI response)
- `DELETE /api/chats/:id/messages/:msgId` — Delete message
- `GET/POST /api/groups` — List/create group chats
- `GET/DELETE /api/groups/:id` — Group CRUD
- `POST /api/groups/:id/members` — Add group member
- `DELETE /api/groups/:id/members/:memberId` — Remove group member
- `POST /api/groups/:id/messages` — Send group message (AI bots respond)
- `POST /api/groups/:id/invite` — Send group invite
- `GET /api/groups/invites` — List pending invites
- `POST /api/groups/invites/:id/respond` — Accept/decline invite
- `POST /api/uploads/image` — Upload image (multer, stored in uploads/)
- `GET /api/uploads/files/:filename` — Serve uploaded files
- `GET /api/dm` — List DM conversations
- `GET /api/dm/:personaId` — Get DM messages
- `POST /api/dm` — Send DM

## Frontend Pages

- `/` — Landing page (public) → redirects to /discover if signed in
- `/discover` — Browse characters (search + tag filter)
- `/characters/new` — Create character form
- `/characters/:id` — Character detail + start chat
- `/characters/:id/edit` — Edit character
- `/chats` — My chats list
- `/chats/:id` — Chat room (system prompt, model selector, typing indicator)
- `/groups` — Group chats + pending invites
- `/groups/:id` — Group chat room
- `/personas` — My personas (create, edit, set main)
- `/people` — Discover other personas
- `/messages` — DM conversations list
- `/messages/:personaId` — DM conversation room
- `/admin` — Admin dashboard (provider config, model management, stats)
- `/sign-in`, `/sign-up` — Clerk auth pages

## AI System

- **Primary model**: `deepseek-ai/deepseek-v3.1` (cheap/fast)
- **Fallback chain**: `moonshotai/kimi-k2.5` → `openai/gpt-oss-120b` → `moonshotai/kimi-k2-instruct-0905` → `moonshotai/kimi-k2-instruct`
- **CSAM filter**: Runs on every user message before reaching main model; blocks underage content with a long rejection message
- **Context summarization**: At 20k tokens, cheapest model summarizes history (system prompt is NEVER summarized)
- **Admin-configured models**: Users can add/enable/disable custom models via admin dashboard
- **NVIDIA API endpoint**: `https://integrate.api.nvidia.com/v1`

## Design

- Dark background: `#0a0012` (deep purple/black)
- Primary accent: hot pink/magenta (`#ff00aa`, `hsl(320 100% 50%)`)
- Glass panels: `backdrop-filter: blur(16px)`, low-opacity pink/purple fills
- Neon borders: `rgba(255, 0, 170, 0.2–0.5)`
- Typography: Space Grotesk (body), Rajdhani (headings)
- Grid background pattern on key pages
