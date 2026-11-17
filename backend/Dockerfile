# --- Backend: Python FastAPI on Fly.io ---
FROM python:3.11-slim

# System deps for psycopg2 / bcrypt / pillow if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps (leverage layer caching)
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir gunicorn

# Copy backend source
COPY . ./

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8001

EXPOSE 8001

# One async uvicorn worker: the Starter plan has 0.5 CPU, and a single worker
# keeps database connections well under Supabase's 15-connection limit even
# while an old and a new server overlap during a deploy.
CMD ["gunicorn", "server:app", \
     "-k", "uvicorn.workers.UvicornWorker", \
     "-w", "1", \
     "-b", "0.0.0.0:8001", \
     "--timeout", "120", \
     "--access-logfile", "-"]
