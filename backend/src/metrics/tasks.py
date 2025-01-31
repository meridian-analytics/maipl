
from celery import shared_task

@shared_task(bind=True, name='merics_eval_background')
def metrics_eval_background(self, task):
    pass