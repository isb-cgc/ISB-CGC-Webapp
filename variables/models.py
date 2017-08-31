from django.contrib.auth.models import User
from django.db import models
from projects.models import User_Feature_Definitions


class FavoriteManager(models.Manager):
    content = "null"

class VariableFavorite(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.TextField(null=True)
    user = models.ForeignKey(User, null=False, blank=False)
    active = models.BooleanField(default=True)
    last_date_saved = models.DateTimeField(auto_now=True)
    version = models.CharField(max_length=5, blank=False, null=True)
    objects = FavoriteManager()

    '''
    Sets the last viewed time for a variable
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

    def get_readable_version(self):
        return 'Version '+str(self.version[1:])

    @classmethod
    def get_list(cls, user, version=None):
        list = cls.objects.filter(user=user, active=True).order_by('-last_date_saved') if not version else cls.objects.filter(user=user, version=version, active=True).order_by('-last_date_saved')

        for fav in list:
            fav.variables = fav.get_variables()

        return list

    @classmethod
    def get_deep(cls, id, user=None):
        # Fix for 2036. If being called by e.g. the variable favorite detail page, you MUST provide a user id
        # to insure rando users cannot sniff variable favorites that do not belong to them. For other internal
        # uses, you can skip the argument to eliminate that check:
        variable_favorite_list = cls.objects.get(id=id, user=user) if user else cls.objects.get(id=id)
        variable_favorite_list.list = variable_favorite_list.get_variables()
        return variable_favorite_list

    @classmethod
    def create(cls, name, variables, user):
        variable_favorite_model = cls.objects.create(name=name, user=user, version="v2")
        variable_favorite_model.save()

        for var in variables:
            Variable.objects.create(name=var['name'], feature_id=var['feature_id'], type=var['type'], code=var['code'], variable_favorite=variable_favorite_model)

        return_obj = {
            'name' : variable_favorite_model.name,
            'id'   : variable_favorite_model.id
        }
        return return_obj

    def update(self, name, variables) :
        self.name = name

        existing_variables = self.variable_set.filter(variable_favorite=self)
        for var in existing_variables :
            var.delete()

        for var in variables :
            if var['feature_id'] != "None" :
                Variable.objects.create(name=var['name'], feature_id=var['feature_id'], type=var['type'], code=var['code'], variable_favorite_id=self.id)
            else :
                Variable.objects.create(name=var['name'], code=var['code'], type=var['type'], variable_favorite_id=self.id)

        self.save()
        return_obj = {
            'name' : self.name,
            'id'   : self.id
        }
        return return_obj

    def copy(self):
        model = self
        model.id = None
        model.name += " copy "
        model.save()
        variables = self.variable_set.filter(variable_favorite=self)
        for v in variables :
            v.variable_favorite = model
            v.id = None
            v.save()

        return model;

    def get_variables(self):
        return self.variable_set.filter(variable_favorite=self)

    def destroy(self):
        self.active = False
        self.save()
        existing_variables = self.variable_set.filter(variable_favorite=self)
        for var in existing_variables :
            var.delete()

        return {'message' : "variable favorite has been deleted"}

class VariableFavorite_Last_View(models.Model):
    variablefavorite = models.ForeignKey(VariableFavorite, blank=False)
    user = models.ForeignKey(User, null=False, blank=False)
    last_view = models.DateTimeField(auto_now=True)

class VariableManager(models.Manager):
    content = "null"

class Variable(models.Model):
    id                 = models.AutoField(primary_key=True)
    name               = models.TextField(null=False, blank=False)
    type               = models.CharField(max_length=20, null=True, blank=True)
    variable_favorite  = models.ForeignKey(VariableFavorite, blank=False)
    code               = models.CharField(max_length=2024, blank=False)
    feature            = models.ForeignKey(User_Feature_Definitions, null=True, blank=True)
    objects            = VariableManager()
