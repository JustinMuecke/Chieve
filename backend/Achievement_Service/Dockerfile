FROM python:3.12-slim

WORKDIR /app

RUN pip install uv

COPY pyproject.toml .
RUN uv pip install --system -e .

COPY src/ ./src/
COPY alembic/ ./alembic/
COPY alembic.ini .

CMD alembic upgrade head && uvicorn src.main:app --host 0.0.0.0 --port 8001
