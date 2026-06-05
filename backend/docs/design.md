# Technical Design Document: Achievement Hunter Platform

---

## 1. System Architecture Overview

This platform uses a decoupled, event-driven microservices architecture optimized for minimal external API overhead, asynchronous background processing, and complete container statelessness.

```
                              [ Vite + React Frontend ]
                                         │
                                         ▼
                            [ API Gateway / Proxy ]
                            (Nginx / Traefik / Kong)
                                         │
             ┌───────────────────────────┴───────────────────────────┐
             ▼                                                       ▼
   [ User/Auth Service ]                                  [ Achievement Service ]
        (FastAPI)                                                (FastAPI)
             │                                                       │
             ├──────────────────────────┐          ┌─────────────────┼────────────────┐
             ▼                          ▼          ▼                 ▼                ▼
        [ Postgres ]                [ MinIO ] [ Postgres ]         [ Redis ]   [ OTel Collector ]
       (User DB &                 (Object Store, (Achievement     (Celery Task         │
      Auth Session)                 Avatars)      DB & Views)    Broker, Cache)        ▼
                                                       │                 │          [ Jaeger ]
                                                       ▼                 ▼        (Trace UI)
                                                 [ Message Queue / Celery ]
                                                  (Background Sync Worker)
                                                       │
                                                       ▼
                                             [ External API Calls ]
                                             (GitHub, Steam Web API)
```

---

## 2. Component Specifications

### 2.1. API Gateway / Reverse Proxy
*   **Technology**: Nginx, Traefik, or Kong.
*   **Role**: Handles SSL termination and CORS. Routes `/api/v1/auth/*` to the Auth Service and `/api/v1/achievements/*` to the Achievement Service.

### 2.2. User & Auth Service
*   **Technology**: FastAPI, PostgreSQL, `authlib` (or similar).
*   **Role**: Performs authentication via GitHub OAuth 2.0 and processes JWT generation. Maintains user accounts and third-party identity links.

### 2.3. Achievement Service
*   **Technology**: FastAPI, PostgreSQL, `aioboto3` (MinIO/S3 communication).
*   **Role**: Manages game schemas, logs user achievements, and calculates point leaderboards. Generates S3 presigned URLs for object uploads.

### 2.4. Background Worker (Celery)
*   **Technology**: Celery, Redis.
*   **Role**: Offloads heavy tasks from the synchronous FastAPI cycle. Executes Steam API sync runs, processes game schema caching, and runs daily point-calculation cron jobs.

### 2.5. Object Storage (MinIO / S3)
*   **Technology**: MinIO (local dev), Cloudflare R2 / AWS S3 (production).
*   **Role**: Stores user profile avatars, game icons, and banners. Ensures the FastAPI containers remain entirely stateless.

### 2.6. Observability
*   **Technology**: OpenTelemetry (OTel) SDK, OTel Collector, Jaeger.
*   **Role**: Provides end-to-end distributed tracing across HTTP requests, database queries, and asynchronous Celery jobs.

---

## 3. Core Workflows

### 3.1. Authentication & Account Linking
1.  **Registration/Login**: The user registers via GitHub OAuth 2.0. The Auth Service creates a record, generates a JWT, and stores the user's details.
2.  **Connecting Steam**:
    *   The user clicks "Link Steam." The backend generates a secure `state` string, caches it locally, and redirects the user to Steam via OpenID 2.0.
    *   Steam redirects back with assertion parameters.
    *   The backend validates the returning `state` to prevent CSRF, verifies the signature directly with Valve's endpoints, and extracts the unique SteamID64.
    *   The SteamID64 is saved into the `linked_accounts` table.

### 3.2. Achievement Synchronization (Asynchronous)
1.  The user requests a profile sync.
2.  The backend checks a Redis-based rate-limiting bucket (e.g., maximum 1 sync per 15 minutes per user).
3.  If allowed, the backend pushes a job to Redis and returns a `202 Accepted` status with a Task ID.
4.  The Celery worker processes the task:
    *   Calls Steam's `GetPlayerAchievements` and `GetOwnedGames` APIs.
    *   **Privacy Check**: If Steam returns empty or unauthorized payloads, the worker flags the account as "Private Profile" in the DB.
    *   **Caching Strategy**: If a game's schema does not exist locally, the worker fetches the schema via `GetSchemaForGame` and the global percentages via `GetGlobalAchievementPercentagesForApp` and saves them.
    *   Updates the `user_achievements` table.
5.  The frontend polls the backend using the Task ID to monitor completion status.

### 3.3. Profile Image Upload (Presigned URLs)
1.  The frontend asks the backend for an upload token.
2.  FastAPI requests a presigned PUT URL from MinIO/S3 for a specific key (e.g., `avatars/user_123.png`) with an expiration of 5 minutes.
3.  The frontend uploads the file directly to MinIO/S3 using the presigned URL. The file never consumes memory or CPU on the FastAPI instances.

---

## 4. Database Schema Design (PostgreSQL)

```sql
-- USER & AUTH DB --
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    github_id VARCHAR(100) UNIQUE,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE linked_accounts (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'steam', 'xbox', 'playstation'
    platform_user_id VARCHAR(255) NOT NULL, -- e.g. SteamID64
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, platform)
);

-- ACHIEVEMENT DB --
CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    external_app_id INT UNIQUE NOT NULL, -- Steam AppID
    name VARCHAR(255) NOT NULL,
    header_image_url VARCHAR(500)
);

CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    game_id INT REFERENCES games(id) ON DELETE CASCADE,
    api_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    description TEXT,
    icon_url VARCHAR(500),
    global_unlock_percent NUMERIC(5, 2), -- Steam-wide percentage
    global_points INT DEFAULT 10, -- Computed based on global_unlock_percent
    UNIQUE(game_id, api_name)
);

CREATE TABLE user_achievements (
    user_id INT NOT NULL,
    achievement_id INT REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (user_id, achievement_id)
);

-- Denormalized Cache Table for High-Speed Leaderboards --
CREATE TABLE user_profile_stats (
    user_id INT PRIMARY KEY,
    total_achievements INT DEFAULT 0,
    total_global_points INT DEFAULT 0,
    total_community_points INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. Dual-Points System

The platform features two distinct scoring mechanics to encourage varied playing styles.

### 5.1. Steam Points (Global Rarity)
*   **Formula**: Calculated and stored statically in `achievements.global_points` whenever the global percentages are updated (weekly/monthly).
    $$\text{global\_points} = \max\left(10, \text{round}\left(100 - \text{global\_unlock\_percent}\right)\right)$$
*   **Performance**: Summing a user's global points is a straightforward indexed query on the local database.

### 5.2. Community Points (Site-Wide Rarity)
*   **Formula**: Based on how rare an achievement is *only* among users registered on your platform.
*   **Calculation Pipeline (Daily at 3:00 AM)**:
    1.  A materialized view calculations the local unlock percentage:
        ```sql
        CREATE MATERIALIZED VIEW mv_community_points AS
        WITH total_users AS (SELECT COUNT(*)::numeric FROM users)
        SELECT 
            ua.achievement_id,
            GREATEST(10, ROUND(100 - ((COUNT(ua.user_id)::numeric / (SELECT * FROM total_users)) * 100))) AS community_points
        FROM user_achievements ua
        GROUP BY ua.achievement_id;
        ```
    2.  The background task refreshes the materialized view:
        ```sql
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_community_points;
        ```
    3.  A secondary query sums the points for each user and writes the updated aggregates into `user_profile_stats`.
    4.  The leaderboards query directly from `user_profile_stats`, delivering sub-millisecond responses.

---

## 6. Observability & Tracing Architecture

To debug microservice handshakes, you will use **OpenTelemetry (OTel)** with auto-instrumentations.

### 6.1. Context Propagation
*   When a client requests a sync, FastAPI initiates a trace.
*   `opentelemetry-instrumentation-celery` automatically injects the active tracing headers into the Redis queue broker payload.
*   The Celery worker reads these headers, extracts the tracing context, and starts its own span under the *same* trace ID.
*   Any outbound external HTTP requests (to Steam or GitHub) made by `httpx` or `requests` inside the worker are auto-instrumented to log their round-trip times and response codes.

### 6.2. Instrumentation Libraries (Python)
Ensure your python environments include:
*   `opentelemetry-instrumentation-fastapi`
*   `opentelemetry-instrumentation-celery`
*   `opentelemetry-instrumentation-sqlalchemy`
*   `opentelemetry-instrumentation-httpx`

---

## 7. Local Developer Docker Compose Blueprint

This `docker-compose.yml` sets up your databases, message queues, local S3 storage, and telemetry pipelines.

```yaml
services:
  # Databases & Brokers
  postgres-db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: achievement_hunter
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # Object Storage (MinIO)
  minio:
    image: minio/minio
    ports:
      - "9000:9000" # API
      - "9001:9001" # Web Admin Console
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - miniodata:/data

  # Automated bucket creator for MinIO
  minio-init:
    image: minio/mc
    depends_on:
      - minio
    entrypoint: >
      /bin/sh -c "
      until (/usr/bin/mc config host add localminio http://minio:9000 minioadmin minioadmin) do echo 'Waiting for MinIO...' && sleep 1; done;
      /usr/bin/mc mb -p localminio/avatars;
      /usr/bin/mc anonymous set public localminio/avatars;
      exit 0;
      "

  # Distributed Tracing Backend (Jaeger)
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686" # Web UI
      - "4317:4317"   # OTLP gRPC port
      - "4318:4318"   # OTLP HTTP port

  # OpenTelemetry Collector
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-config.yaml:/etc/otel-collector/config.yaml
    ports:
      - "13133:13133" # health check extension
    depends_on:
      - jaeger

volumes:
  pgdata:
  miniodata:
```

### Next Steps to Boot the Project
1.  **OTel Config**: Save a standard `otel-config.yaml` file in your root folder routing incoming data on `4317` directly to the `jaeger` service.
2.  **FastAPI Setup**: Build your basic authentication endpoints using GitHub OAuth and standard JWT libraries.
3.  **Celery Hookup**: Set up your worker, initialize the tracer inside `celery.py`, and test a mock Steam sync routing its records into Postgres and images into MinIO.import os
import re
import secrets
from urllib.parse import urlencode

from fastapi import Request
from fastapi.responses import RedirectResponse
import httpx

from src.models.errors import SteamAuthError, SteamStateError
from src.services.postgres_service import PostgresService

STEAM_OPENID_URL = "https://steamcommunity.com/openid/login"
STEAM_ID_PATTERN = re.compile(r"https://steamcommunity\.com/openid/id/(\d+)$")


class SteamService:
    def __init__(self, postgres: PostgresService):
        self.postgres = postgres
        self.callback_url = os.getenv("STEAM_CALLBACK_URL", "http://localhost:8000/steam/callback")
        self.realm = os.getenv("STEAM_REALM", "http://localhost:8000")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        self._secure_cookies = os.getenv("ENV") == "production"

    def link(self):
        state = secrets.token_urlsafe(32)
        params = urlencode({
            "openid.ns": "http://specs.openid.net/auth/2.0",
            "openid.mode": "checkid_setup",
            "openid.return_to": f"{self.callback_url}?state={state}",
            "openid.realm": self.realm,
            "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
            "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
        })
        response = RedirectResponse(url=f"{STEAM_OPENID_URL}?{params}")
        response.set_cookie(
            key="steam_state",
            value=state,
            httponly=True,
            max_age=300,
            samesite="lax",
            secure=self._secure_cookies,
        )
        return response

    async def callback(self, request: Request, user_id: int):
        state = request.query_params.get("state")
        cookie_state = request.cookies.get("steam_state")
        if not cookie_state or cookie_state != state:
            raise SteamStateError("State verification failed (possible CSRF request)")

        validation_params = {
            k: v for k, v in request.query_params.items() if k != "state"
        }
        validation_params["openid.mode"] = "check_authentication"

        async with httpx.AsyncClient() as client:
            try:
                validation_response = await client.post(STEAM_OPENID_URL, data=validation_params)
                validation_response.raise_for_status()
            except httpx.HTTPStatusError as e:
                raise SteamAuthError(f"Steam validation request failed: {e.response.status_code}") from e

        if "is_valid:true" not in validation_response.text:
            raise SteamAuthError("Steam OpenID assertion is not valid")

        claimed_id = request.query_params.get("openid.claimed_id", "")
        match = STEAM_ID_PATTERN.match(claimed_id)
        if not match:
            raise SteamAuthError("Could not extract SteamID from claimed identity")

        steam_id = match.group(1)

        await self.postgres.link_platform(
            user_id=user_id,
            platform="steam",
            platform_user_id=steam_id,
        )

        redirect = RedirectResponse(url=f"{self.frontend_url}/settings")
        redirect.delete_cookie("steam_state")
        return redirect
import os
import re
import secrets
from urllib.parse import urlencode

from fastapi import Request
from fastapi.responses import RedirectResponse
import httpx

from src.models.errors import SteamAuthError, SteamStateError
from src.services.postgres_service import PostgresService

STEAM_OPENID_URL = "https://steamcommunity.com/openid/login"
STEAM_ID_PATTERN = re.compile(r"https://steamcommunity\.com/openid/id/(\d+)$")


class SteamService:
    def __init__(self, postgres: PostgresService):
        self.postgres = postgres
        self.callback_url = os.getenv("STEAM_CALLBACK_URL", "http://localhost:8000/steam/callback")
        self.realm = os.getenv("STEAM_REALM", "http://localhost:8000")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        self._secure_cookies = os.getenv("ENV") == "production"

    def link(self):
        state = secrets.token_urlsafe(32)
        params = urlencode({
            "openid.ns": "http://specs.openid.net/auth/2.0",
            "openid.mode": "checkid_setup",
            "openid.return_to": f"{self.callback_url}?state={state}",
            "openid.realm": self.realm,
            "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
            "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
        })
        response = RedirectResponse(url=f"{STEAM_OPENID_URL}?{params}")
        response.set_cookie(
            key="steam_state",
            value=state,
            httponly=True,
            max_age=300,
            samesite="lax",
            secure=self._secure_cookies,
        )
        return response

    async def callback(self, request: Request, user_id: int):
        state = request.query_params.get("state")
        cookie_state = request.cookies.get("steam_state")
        if not cookie_state or cookie_state != state:
            raise SteamStateError("State verification failed (possible CSRF request)")

        validation_params = {
            k: v for k, v in request.query_params.items() if k != "state"
        }
        validation_params["openid.mode"] = "check_authentication"

        async with httpx.AsyncClient() as client:
            try:
                validation_response = await client.post(STEAM_OPENID_URL, data=validation_params)
                validation_response.raise_for_status()
            except httpx.HTTPStatusError as e:
                raise SteamAuthError(f"Steam validation request failed: {e.response.status_code}") from e

        if "is_valid:true" not in validation_response.text:
            raise SteamAuthError("Steam OpenID assertion is not valid")

        claimed_id = request.query_params.get("openid.claimed_id", "")
        match = STEAM_ID_PATTERN.match(claimed_id)
        if not match:
            raise SteamAuthError("Could not extract SteamID from claimed identity")

        steam_id = match.group(1)

        await self.postgres.link_platform(
            user_id=user_id,
            platform="steam",
            platform_user_id=steam_id,
        )

        redirect = RedirectResponse(url=f"{self.frontend_url}/settings")
        redirect.delete_cookie("steam_state")
        return redirect
