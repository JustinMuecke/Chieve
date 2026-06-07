# Chieve

An achievement-hunter platform that aggregates gaming achievements across platforms. Users sign in with GitHub, link their Steam account, and the platform syncs their achievements in the background — tracking progress, calculating rarity scores, surfacing community guides, and recommending new games.

---

## Features

- **GitHub OAuth 2.0** login — no passwords
- **Steam account linking** via OpenID 2.0
- **Asynchronous achievement sync** — rate-limited background job with live progress polling
- **Dual points system** — global rarity (Steam-wide) and community rarity (platform-local)
- **Leaderboard** — global and friends-only, sortable by either point type
- **Activity feed** — recent unlocks and guide publications by followed users
- **Achievement search** — filter by game, query string, or rarity cap
- **Milestones** — first unlock, game completion, sub-1% rarity achievements
- **Guides** — per-game markdown guides with header images, descriptions, and favorites
- **Game recommendations** — vector similarity search powered by pgvector and sentence-transformers
- **Wishlist** — save recommended games
- **Social graph** — follow/unfollow users, see followers and following lists
- **Avatar options** — GitHub avatar, Steam avatar, or custom upload via presigned URL

---

## Architecture

```
                        [ React Frontend (nginx) ]
                                   │  :80
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                     ▼
     /api/user/*          /api/achievements/*    /api/recommendations/*
              │                    │                     │
   [ User Service ]   [ Achievement Service ]  [ Recommendation Service ]
      FastAPI :8000       FastAPI :8001            FastAPI :8002
              │                    │                     │
              └──────────┬─────────┘                     │
                         ▼                               │
                    [ Postgres ]  ◄─────────────────────-┘
                  (pgvector:pg16)
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
           [ Redis ]            [ MinIO ]
       (Celery broker)      (avatars, guides)
              │
   ┌──────────┴──────────┐
   ▼                     ▼
[ Achievement        [ Recommendation
  Celery Worker ]      Celery Worker ]
```

All four backend containers (two services + two workers) share a single Postgres instance and Redis. The nginx container inside the frontend image proxies all `/api/*` traffic to the appropriate service over the internal Docker network — the backend ports are never exposed publicly in production.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite, React 19, TypeScript, CSS Modules (SCSS), React Query, React Router |
| Backend | FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic |
| Auth | GitHub OAuth 2.0, Steam OpenID 2.0, JWT (httponly cookies) |
| Database | PostgreSQL 16 with pgvector |
| Object Storage | MinIO (S3-compatible) |
| Background Jobs | Celery + Redis |
| Recommendations | sentence-transformers (`all-MiniLM-L6-v2`), pgvector cosine similarity |
| Containerisation | Docker, Docker Compose |

---

## Repository Layout

```
Chieve/
├── docker-compose.yml              # Local development stack
├── frontend/
│   ├── src/
│   │   ├── pages/                  # Route-level page components
│   │   ├── components/             # Feature components (guides, feed, games, …)
│   │   └── api/                    # React Query hooks and API helpers
│   ├── nginx.conf                  # Production nginx config (proxy + SPA fallback)
│   └── Dockerfile
└── backend/
    ├── docs/design.md              # Full technical design document
    ├── User_Service/               # Auth, accounts, social graph (port 8000)
    ├── Achievement_Service/        # Games, achievements, guides, feed (port 8001)
    └── Recommendation_Service/     # Vector recommendations, wishlist (port 8002)
```

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2
- A [GitHub OAuth App](https://github.com/settings/developers) with callback URL set to `http://localhost:5173/api/user/auth/callback` for local dev (or your production domain for deployment)
- A [Steam Web API key](https://steamcommunity.com/dev/apikey)

---

## Local Development

### 1. Clone the repo

```bash
git clone https://github.com/JustinMuecke/Chieve.git
cd Chieve
```

### 2. Create the root `.env`

```env
# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Steam
STEAM_API_KEY=your_steam_api_key

# Postgres
POSTGRES_USER=chieve
POSTGRES_PASSWORD=your_db_password
POSTGRES_DB=chieve

# JWT — must be the same value across all services
JWT_SECRET=your_jwt_secret

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=your_minio_password
```

### 3. Create the User Service `.env`

```env
# backend/User_Service/.env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=your_minio_password
```

### 4. Start the stack

```bash
docker compose up --build
```

### 5. Access the services

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| User Service API docs | http://localhost:8000/docs |
| Achievement Service API docs | http://localhost:8001/docs |
| Recommendation Service API docs | http://localhost:8002/docs |
| MinIO Console | http://localhost:9001 |
| Postgres | localhost:5432 |
| Redis | localhost:6379 |

MinIO credentials: `minioadmin` / `minioadmin` (or whatever you set in `.env`).

### Running a service outside Docker

```bash
cd backend/User_Service
POSTGRES_HOST=localhost uvicorn src.main:app --reload --port 8000
```

---

## Services

### User Service (`/api/user/`)

Handles authentication, user accounts, platform linking, avatar management, and the social follow graph.

| Method | Route | Description |
|---|---|---|
| `GET` | `/login` | Redirect to GitHub OAuth |
| `GET` | `/auth/callback` | OAuth callback — creates user, sets JWT cookie |
| `GET` | `/steam/link` | Redirect to Steam OpenID (requires auth) |
| `GET` | `/steam/callback` | Validate Steam assertion, save SteamID |
| `GET` | `/me` | Current user profile |
| `PUT` | `/me/avatar` | Set active avatar source (`github`, `steam`, `custom`) |
| `POST` | `/me/avatar/upload` | Get presigned PUT URL for custom avatar upload |
| `POST` | `/social/follow/{id}` | Follow a user |
| `DELETE` | `/social/follow/{id}` | Unfollow a user |
| `GET` | `/social/following` | Users I follow |
| `GET` | `/social/followers` | Users following me |

### Achievement Service (`/api/achievements/`)

Manages games, achievement records, the leaderboard, activity feed, search, milestones, and guides.

| Method | Route | Description |
|---|---|---|
| `POST` | `/sync` | Enqueue a Steam sync (rate-limited to 1 per 15 min) |
| `GET` | `/sync/{task_id}` | Poll sync progress |
| `GET` | `/games` | User's synced games with completion % |
| `GET` | `/games/{app_id}` | Game detail + full achievement list |
| `GET` | `/profile` | Own stats (achievements, global points, community points) |
| `GET` | `/profile/{user_id}` | Another user's public stats |
| `GET` | `/leaderboard` | Global or friends leaderboard |
| `GET` | `/feed` | Recent activity from followed users |
| `GET` | `/search` | Achievement search |
| `GET` | `/milestones` | Own milestones |
| `GET` | `/milestones/{user_id}` | Another user's milestones |
| `GET` | `/guides/{app_id}` | Guides for a game |
| `POST` | `/guides/{app_id}` | Create a guide (multipart: title, file, optional header image + description) |
| `PUT` | `/guides/{app_id}/{guide_id}` | Update own guide |
| `POST` | `/guides/{guide_id}/favorite` | Favorite a guide |
| `DELETE` | `/guides/{guide_id}/favorite` | Unfavorite a guide |

### Recommendation Service (`/api/recommendations/`)

Provides personalised game recommendations via pgvector cosine similarity and manages the wishlist and dismissals.

| Method | Route | Description |
|---|---|---|
| `GET` | `/` | Personalised game recommendations |
| `POST` | `/dismiss/{app_id}` | Dismiss a game (never show again) |
| `GET` | `/wishlist` | Saved games |
| `POST` | `/wishlist/{app_id}` | Add to wishlist |
| `DELETE` | `/wishlist/{app_id}` | Remove from wishlist |

---

## Points System

Chieve uses two independent scoring systems.

**Global Points** (Steam rarity)
Based on how rare an achievement is across all Steam players worldwide. Stored statically per achievement and refreshed when Steam global stats are pulled (every 7 days per game).

```
global_points = max(10, round(100 - global_unlock_percent))
```

**Community Points** (local rarity)
Based on how rare an achievement is among Chieve users specifically. Recalculated daily via a materialized view (`mv_community_points`) and aggregated into `user_profile_stats` for fast leaderboard queries.

---

## Database Migrations

Each service manages its own Alembic version table and runs migrations automatically on container start.

To generate a new migration locally:

```bash
cd backend/User_Service   # or Achievement_Service / Recommendation_Service
alembic revision --autogenerate -m "description"
```

To apply migrations manually:

```bash
alembic upgrade head
```

Version tables per service:

| Service | Version table |
|---|---|
| User Service | `alembic_version` |
| Achievement Service | `achievement_alembic_version` |
| Recommendation Service | `recommendation_alembic_version` |

---

## Background Workers

**Achievement Celery Worker**
- `platform_sync_task(user_id)` — fetches linked platforms from User Service, syncs Steam achievements, upserts profile stats. Triggered on demand via `POST /sync`.
- `refresh_community_points` — daily cron at 3 AM, refreshes `mv_community_points` and updates `user_profile_stats`.

**Recommendation Celery Worker** (combined worker + beat in one container)
- `generate_embeddings` — hourly cron, fetches games without embeddings from Achievement Service, generates 384-dimensional vectors using `all-MiniLM-L6-v2`, stores them in `game_embeddings`.

---

## Adding a New Platform

1. Implement `BasePlatformService` from [backend/Achievement_Service/src/services/platforms/base.py](backend/Achievement_Service/src/services/platforms/base.py)
2. Register the new class in [backend/Achievement_Service/src/services/platforms/dispatcher.py](backend/Achievement_Service/src/services/platforms/dispatcher.py)

The Celery sync task calls the dispatcher automatically — no further changes needed.

---

## Deployment

A `docker-compose.deploy.yml` is used for production. It is excluded from version control because it contains secrets. To deploy on a fresh server:

```bash
# copy and fill in your secrets
cp docker-compose.deploy.yml.example docker-compose.deploy.yml

docker compose -f docker-compose.deploy.yml up -d
```

Pre-built images are published to GitHub Container Registry on every push to `main`:

| Image | Tag |
|---|---|
| `ghcr.io/justinmuecke/chieve/frontend` | `latest` |
| `ghcr.io/justinmuecke/chieve/user-service` | `latest` |
| `ghcr.io/justinmuecke/chieve/achievement-service` | `latest` |
| `ghcr.io/justinmuecke/chieve/recommendation-service` | `latest` |

> **Note:** The production compose file does not include SSL termination. Place a reverse proxy (Caddy, nginx, Traefik) in front of port 80 to handle HTTPS before going live. MinIO (port 9000) also needs to be reachable by the browser for media delivery.

### Adding npm packages (frontend)

The frontend container stores `node_modules` in an anonymous Docker volume. After adding a new package, `--build` alone won't pick it up. Remove the container and its volume first:

```bash
docker compose stop frontend
# find the node_modules volume hash:
docker inspect chieve-frontend-1
docker rm <frontend_container_id>
docker volume rm <hash>
docker compose up --build frontend
```
