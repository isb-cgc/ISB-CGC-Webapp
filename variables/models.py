import operator

from django.db import models
from django.contrib.auth.models import User
from django.db.models import Q
from projects.models import Project, Study

from django.conf import settings

class VariableFavoriteManager(models.Manager):
    content = "null"

class VariableFavorite(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.TextField(null=True)
    user = models.ForeignKey(User, null=False, blank=False)
    active = models.BooleanField(default=True)
    last_date_saved = models.DateTimeField(auto_now_add=True)
    objects = VariableFavoriteManager()

    '''
    Sets the last viewed time for a cohort
    '''
    def mark_viewed (self, request, user=None):
        if user is None:
            user = request.user

        last_view = self.variablefavorite_last_view_set.filter(user=user)
        if last_view is None or len(last_view) is 0:
            last_view = self.variablefavorite_last_view_set.create(user=user)
        else:
            last_view = last_view[0]

        last_view.save(False, True)

        return last_view

    @classmethod
    def create(cls, name, variables, user):
        variable_favorite_model = cls.objects.create(name=name, user=user)
        variable_favorite_model.save()

        for var in variables :
            Variable.create(name=var['name'], project_id=var['project_id'], study_id = var['study_id'], favorite=variable_favorite_model)

        return_obj = {
            'name'          : variable_favorite_model.name,
            'id'            : variable_favorite_model.id
        }
        return return_obj

    @classmethod
    def get_list(cls, user):
        list = cls.objects.filter(user=user).order_by('-last_date_saved')

        for fav in list:
            fav.variables = fav.get_variables()

        return list

    @classmethod
    def get_deep(cls, id):
        variable_favorite_list = cls.objects.get(id=id)
        variable_favorite_list.get_variables()
        return variable_favorite_list

    def get_variables(self):
        return self.variable_set.filter(variable_favorite=self)

class VariableFavorite_Last_View(models.Model):
    variablefavorite = models.ForeignKey(VariableFavorite, blank=False)
    user = models.ForeignKey(User, null=False, blank=False)
    last_view = models.DateTimeField(auto_now_add=True, auto_now=True)

class Variable(models.Model):
    id                 = models.AutoField(primary_key=True)
    name               = models.TextField(null=False, blank=False)
    variable_favorite  = models.ForeignKey(VariableFavorite, blank=False)
    project            = models.ForeignKey(Project, null=True, blank=True)
    study              = models.ForeignKey(Study, null=True, blank=True)

    @classmethod
    def create(cls, name, project_id, study_id, favorite):
        if project_id != "-1" and study_id != "-1" :
            study   = Study.objects.get(id=study_id)
            project = Project.objects.get(id=project_id)
            variable_model = cls.objects.create(name=name, project_id=project, study_id=study, variable_favorite=favorite)
            variable_model.save()
        else :
            variable_model = cls.objects.create(name=name, variable_favorite=favorite)
            variable_model.save()
