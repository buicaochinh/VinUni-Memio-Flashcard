from celery import Celery


celery_app = Celery(
    "memio_worker",
    broker="redis://redis:6379/0",
    backend="redis://redis:6379/1",
)

celery_app.conf.update(
    timezone="Asia/Ho_Chi_Minh",
    enable_utc=True,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
)


@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    # Run every 5 minutes (starter).
    sender.add_periodic_task(300.0, "src.app.worker.tasks.send_due_cards", name="send_due_cards")

