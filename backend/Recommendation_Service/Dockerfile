FROM python:3.12-slim

WORKDIR /app

RUN pip install uv

COPY pyproject.toml .
RUN uv pip install --system -e .

# Pre-download the embedding model so first request isn't slow
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY src/ ./src/
COPY alembic/ ./alembic/
COPY alembic.ini .

CMD alembic upgrade head && uvicorn src.main:app --host 0.0.0.0 --port 8002
