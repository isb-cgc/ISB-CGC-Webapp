from django.db import models
from django.contrib.auth.models import User

# Create your models here.
class Comparison(models.Model):
    # TODO: can use ManyToMany for ids in future for cohort 2+ maybe?
    id1 = models.IntegerField()
    id2 = models.IntegerField()
    comparison_title = models.CharField(max_length=50)
    date_created = models.DateField()

    @classmethod
    def create(cls, cohort_id1, cohort_id2):
        comparison_model = cls.objects.create(id1=cohort_id1, id2=cohort_id2)
        # TODO: set default title
        # TODO: set date_created
        comparison_model.save()

        return comparison_model

    @classmethod
    def get_survival_analysis(cls):
        # TODO: return survival analysis
        return

    @classmethod
    def get_percentage_comparison(cls, label):
        # TODO: return percentage breakdown
        return

class Dashboard(models.Model):
    compares = models.ManyToManyField(Comparison)
    owner = models.ForeignKey(User, on_delete=models.CASCADE)

    @classmethod
    def init(cls, user):
        comparison_dashboard = cls.objects.create(owner=user)
        comparison_dashboard.save()

        return comparison_dashboard
