# Dockerfile para o backend FastAPI
FROM python:3.11-slim
WORKDIR /app
COPY ./gcp-credentials.json /app/gcp-credentials.json
COPY app /app/app
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
ENV PYTHONUNBUFFERED=1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
