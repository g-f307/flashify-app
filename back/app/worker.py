# back/app/worker.py
from celery import Celery
from celery.schedules import crontab

celery_app = Celery(
    "tasks",
    broker="redis://redis:6379/0",
    backend="redis://redis:6379/0",
    include=["app.tasks"]
)

celery_app.conf.update(
    task_track_started=True,
    
    # 🆕 CONFIGURAR TAREFAS AGENDADAS
    beat_schedule={
        # E-mail de inatividade: todo dia às 10h (horário UTC)
        'send-inactivity-emails': {
            'task': 'send_inactivity_emails',
            'schedule': crontab(hour=10, minute=0),
        },
        # E-mail de deck incompleto: a cada 6 horas
        'send-incomplete-deck-emails': {
            'task': 'send_incomplete_deck_emails',
            'schedule': crontab(minute=0, hour='*/6'),  # 0h, 6h, 12h, 18h
        },
    },
    timezone='UTC',
)