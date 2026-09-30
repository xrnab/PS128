# ── Stage 1: Builder ──────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build dependencies including OpenMP library
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libgomp1 && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install dependencies including lightweight ONNX Runtime
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Stage 2: Runtime ─────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Minimal runtime dependencies: libgomp1 for OpenMP acceleration in ONNX Runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 && \
    rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code and ML artifacts (including .onnx models)
COPY app/ ./app/
COPY data/ ./data/

# Render uses PORT env var (defaults to 10000)
ENV PORT=10000
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production
ENV OMP_NUM_THREADS=1
ENV MKL_NUM_THREADS=1

EXPOSE ${PORT}

# Start uvicorn – single worker keeps RAM strictly under 60-100MB
CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1"

