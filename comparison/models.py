from django.db import models
from django.contrib.auth.models import User
from datetime import date
from django.core.exceptions import ObjectDoesNotExist

# Create your models here.

class Comparison(models.Model):
    # TODO: can use ManyToMany for ids in future for cohort 2+ maybe?
    id1 = models.IntegerField()
    id2 = models.IntegerField()
    comparison_title = models.CharField(max_length=50)
    date_created = models.DateField()

    owner = models.ForeignKey(User, on_delete=models.CASCADE)

    @classmethod
    def new_comparison(cls, cohort_id1, cohort_id2):
        today = date.today()
        title = "compare - " + today.strftime("%m/%d/%y")
        comparison_model = cls.objects.create(id1=cohort_id1, id2=cohort_id2, comparison_title=title, date_created=today)

        comparison_model.save()
        return comparison_model

    @classmethod
    def survival_analysis(cls):
        # TODO: return survival analysis
        return

    @classmethod
    def percentage_comparison(cls, label):
        # TODO: return percentage breakdown
        return

class Dashboard(models.Model):
    compares = models.ManyToManyField(Comparison)
    current_compare = Comparison()
    owner = models.ForeignKey(User, on_delete=models.CASCADE)

    @classmethod
    def start(cls, user):
        try:
            dash = cls.objects.get(owner=user)
            return dash
        except ObjectDoesNotExist:
            dash = cls.objects.create(owner=user)
            dash.save()
            return dash

    @classmethod
    def new_comparison(cls, cohort_1, cohort_2):
        comp = Comparison.new_comparison(cohort_id1=cohort_1, cohort_id2=cohort_2)
        comp.save()

        cls.compares.add(comp)
        cls.current_compare = comp

        return comp

    @classmethod
    def remove_comparison(cls, compare_id):
        comp = cls.compares.get(id=compare_id)

        cls.compares.remove(id=compare_id)

        return comp


