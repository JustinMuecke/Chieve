# Chieve — Claude Instructions

## Project Overview

Chieve is an achievement-hunter platform that aggregates gaming achievements from Steam (and eventually other platforms). Users authenticate via **GitHub OAuth 2.0**, link their **Steam account** (OpenID 2.0), and the platform syncs their achievements in the background.

**Monorepo layout:**
```
Chieve/
├── backend/
│   ├── docker-compose.yml        # Full local stack
│   ├── .env                      # Shared infra secrets (Postgres, MinIO, JWT_SECRET)
│   ├── docs/design.md            # Full technical design doc — read before making architectural decisions
│   ├── User_Service/             # FastAPI, port 8000
│   └── Achievement_Service/      # FastAPI, port 8001
└── frontend/                     # Vite + React 19 + TypeScript, port 5173
```

---

## Backend Services

Both services are **FastAPI** apps sharing the same **Postgres** instance and follow identical patterns. Read `design.md` before changing anything architectural.

### Common Patterns (apply to ALL services)

**Dependency injection via `app.state`:**
- `ServiceManager` is instantiated once in the `lifespan` context manager and stored on `app.state.services`
- Routes access it via `Depends(get_services)` — never import services directly in routes
- `get_current_user_id` dependency reads the `auth_token` cookie and delegates to `services.auth.decode_token()`

**Error handling split:**
- Services raise custom exceptions from `src/models/errors.py` — never `HTTPException`
- Route handlers catch those exceptions and raise `HTTPException` with the appropriate status code
- This keeps the service layer decoupled from HTTP

**SQLAlchemy 2.0 async:**
- Always use `DateTime(timezone=True)` — produces `TIMESTAMP WITH TIME ZONE` in Postgres
- Engine and session factory live in `PostgresService`, initialized in `ServiceManager.__init__`

**Auth (JWT):**
- User JWTs: `httponly` cookie named `auth_token`, `{ sub: user_id, username }`, 7-day expiry
- Service-to-service JWTs: `Authorization: Bearer <token>` header, `{ sub: "achievement_service", type: "service", service: "achievement_service" }`, 60s expiry — signed with the same `JWT_SECRET`
- Never put JWT in URLs or response bodies
- `secure=True` only when `ENV=production`
- `JWT_SECRET` is shared between both services via `backend/.env`

**Alembic:**
- Each service runs `alembic upgrade head` on container start (in Dockerfile `CMD`)
- Both services share the same Postgres DB but use separate version tables:
  - User Service: default `alembic_version`
  - Achievement Service: `achievement_alembic_version` (set in `alembic/env.py`)
- Run migrations locally: `cd <service>/ && alembic upgrade head`
- Generate a new migration: `alembic revision --autogenerate -m "description"`

**S3 / MinIO (User Service only):**
- `S3_URL` is the internal Docker network URL (used for API calls)
- `S3_PUBLIC_URL` is the browser-accessible URL (substituted into presigned PUT URLs)
- Avatar copy-on-login is best-effort — wrapped in `try/except: pass`, never blocks auth

**Platform sync abstraction (Achievement Service):**
- `src/services/platforms/base.py` — `BasePlatformService` ABC
- `src/services/platforms/steam.py` — `SteamPlatformService` (uses `SteamApiService` internally)
- `src/services/platforms/dispatcher.py` — registry dict `{"steam": SteamPlatformService()}`, `get_platform_service(name)`
- Adding a new platform = implement `BasePlatformService`, register in dispatcher
- Celery task `platform_sync_task(user_id)` calls User Service internal API for linked platforms, then dispatches per platform

---

## Running the Stack

```bash
cd backend/
docker compose up --build
```

Services:
- User Service API: http://localhost:8000/docs
- Achievement Service API: http://localhost:8001/docs
- MinIO Console: http://localhost:9001 (minioadmin / minioadmin)
- Postgres: localhost:5432
- Redis: localhost:6379

Run a service locally (outside Docker):
```bash
cd backend/User_Service
POSTGRES_HOST=localhost uvicorn src.main:app --reload --port 8000
```

---

## User Service (`backend/User_Service/`)

**Responsibility:** Authentication, user accounts, platform linking, avatar management, social graph (follows).

**Key routes** (`/api/user/`):
- `GET /login` → redirects to GitHub OAuth
- `GET /callback` → exchanges code, creates user, sets JWT cookie
- `GET /steam/link` → redirects to Steam OpenID (requires auth)
- `GET /steam/callback` → validates Steam assertion, saves SteamID (requires auth)
- `GET /me` → returns user profile with avatar options
- `PUT /me/avatar` → sets active avatar source (`github`, `steam`, `custom`)
- `POST /me/avatar/upload` → returns presigned PUT URL for custom upload
- `POST /social/follow/{target_id}` → follow a user
- `DELETE /social/follow/{target_id}` → unfollow a user
- `GET /social/following` → list of users I follow
- `GET /social/followers` → list of users following me

**Internal routes** (service-to-service only, require `Authorization: Bearer <service_jwt>`):
- `GET /internal/following/{user_id}` → `[{id, username, avatar_url}]`
- `GET /internal/linked-platforms/{user_id}` → `[{platform, platform_user_id}]`
- `GET /internal/users?ids=1,2,3` → bulk user lookup `[{id, username, avatar_url}]`

**DB tables:**
```
users (id, username, email, github_id, avatar_url, github_avatar_url, created_at)
linked_accounts (id, user_id → users, platform, platform_user_id, avatar_url, connected_at)
follows (follower_id → users, following_id → users, created_at)  [PK: follower_id + following_id]
```

**Migrations:**
- `3e57f3f694be` — create users and linked_accounts
- `7e96a3e0fa46` — add avatar columns
- `a1b2c3d4e5f6` — add follows table

**Environment:**
```
GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
JWT_SECRET
ENV                  # "production" enables secure cookies
S3_URL               # internal: http://minio:9000
S3_PUBLIC_URL        # browser: http://localhost:9000
S3_ACCESS_KEY, S3_SECRET_KEY
STEAM_API_KEY
```

---

## Achievement Service (`backend/Achievement_Service/`)

**Responsibility:** Games schema, achievement records, user achievement logs, leaderboard, feed, search, milestones. Calls User Service internal API for user data.

**Key routes** (`/api/achievements/`):
- `POST /sync` → enqueue Celery task (rate-limited 1/15 min via Redis), returns `202 { task_id }`
- `GET /sync/{task_id}` → poll Celery task status + progress %
- `GET /games` → user's synced games with completion %
- `GET /games/{app_id}` → game detail + full achievement list (locked/unlocked state)
- `GET /profile` → own stats (total achievements, global points, community points)
- `GET /profile/{user_id}` → another user's public stats
- `GET /leaderboard?scope=global|friends&sort_by=global_points|community_points&page=N`
- `GET /feed?days=14&limit_per_user=N` → recent unlocks by followed users, grouped by user→game→achievements
- `GET /search?q=&game_id=&max_rarity=` → achievement search
- `GET /milestones` → own milestones
- `GET /milestones/{user_id}` → another user's public milestones

**DB tables:**
```
games (id, external_app_id [unique], name, header_image_url, global_stats_updated_at)
achievements (id, game_id → games, api_name, display_name, description, icon_url, global_unlock_percent, global_points)
user_achievements (user_id, achievement_id → achievements, unlocked_at)  [PK: user_id + achievement_id]
user_profile_stats (user_id [PK], total_achievements, total_global_points, total_community_points, updated_at)
user_milestones (id, user_id, milestone_type, game_id → games, achievement_id → achievements, achieved_at)
mv_community_points  [MATERIALIZED VIEW — refreshed daily by Celery]
```

**Milestone types:** `first_unlock`, `game_complete`, `sub1pct_unlock`

**Points system:**
- Global points: `max(10, round(100 - global_unlock_percent))` — stored in `achievements.global_points`
- Community points: materialized view on local unlock %, refreshed daily; aggregates cached in `user_profile_stats`

**Celery:**
- Broker + result backend: Redis (`REDIS_URL`)
- Tasks: `platform_sync` (user sync), `refresh_community_points` (daily cron)
- Worker runs as separate Docker container: `celery -A src.worker.celery_app worker`
- `platform_sync_task(user_id)` fetches linked platforms from User Service, dispatches to platform services
- Always calls `upsert_profile_stats` at the end, even when no platforms are linked (ensures profile row exists)

**Steam sync behaviour:**
- Global achievement stats (`GetSchemaForGame` + `GetGlobalAchievementPercentagesForApp`) are fetched on first sync and re-fetched after 7 days, controlled by `games.global_stats_updated_at`
- Per-game player achievements (`GetPlayerAchievements`) are fetched every sync
- `SteamAPIError` and `httpx.TransportError` on a per-game call skip that game and continue; a failure on `GetOwnedGames` aborts the platform sync with `steam_unavailable`

**Profile endpoints:**
- `GET /profile` and `GET /profile/{user_id}` both return 0 stats (not 404) when no `user_profile_stats` row exists

**Migrations:**
- `b1c2d3e4f5a6` — full initial schema (all tables + materialized view)
- `c2d3e4f5a6b7` — add `global_stats_updated_at` to `games`

**Environment:**
```
POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
JWT_SECRET   # must match User Service
ENV
REDIS_URL    # redis://redis:6379/0
USER_SERVICE_URL  # http://user_service:8000
STEAM_API_KEY
```

---

## Frontend (`frontend/`)

Vite + React 19 + TypeScript. Dev server: `npm run dev` (port 5173). Not yet implemented beyond scaffold.

---

## What NOT to do

- Do not raise `HTTPException` inside service classes — only in route handlers
- Do not put JWT in URLs or response bodies — cookie only
- Do not hardcode `secure=True` on cookies — use `os.getenv("ENV") == "production"`
- Do not share Alembic version tables between services — each needs its own `version_table`
- Do not add `$$VAR` escaping in docker-compose `environment:` blocks — only needed in `entrypoint:` shell strings
- Do not import `ServiceManager` directly in routes — always go through `Depends(get_services)`
- Do not add new platforms by editing steam.py — implement `BasePlatformService` and register in `dispatcher.py`
- Do not call User Service from route handlers directly — use `services.user_client` (injected via ServiceManager)
