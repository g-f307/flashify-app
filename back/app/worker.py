# app/worker.py
from celery import Celery

# O 'broker' é a URL do Redis, por onde as tarefas são enviadas.
# O 'backend' também é o Redis, onde os resultados das tarefas são armazenados.
celery_app = Celery(
    "tasks",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0",
    include=["app.tasks"] # Aponta para o arquivo onde escreveremos nossas tarefas
)

celery_app.conf.update(
    task_track_started=True,
)