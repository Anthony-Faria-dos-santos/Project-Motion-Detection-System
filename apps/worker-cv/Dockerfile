FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

COPY apps/worker-cv/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/worker-cv/src ./src

CMD ["python", "-m", "src.main"]
