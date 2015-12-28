import operator

from django.db import models
from django.contrib.auth.models import User
from django.db.models import Q


class GeneFavoriteManager(models.Manager):
    content = None

class GeneFavorite(models.Model):
    id      = models.AutoField(primary_key=True)
    name    = models.TextField(null=True)
    active  = models.BooleanField(default=True)
    user    = models.ForeignKey(User, null=False, blank=False)
    last_date_saved = models.DateTimeField(auto_now_add=True)
    objects = GeneFavoriteManager()

    '''
    Sets the last viewed time for a cohort
    '''
    def mark_viewed (self, request, user=None):
        if user is None:
            user = request.user

        last_view = self.genefavorite_last_view_set.filter(user=user)
        if last_view is None or len(last_view) is 0:
            last_view = self.genefavorite_last_view_set.create(user=user)
        else:
            last_view = last_view[0]

        last_view.save(False, True)

        return last_view

    @classmethod
    def create(cls, name, gene_list, user):
        gene_favorite_model = cls.objects.create(name=name, user=user)
        gene_favorite_model.save()

        for gene in gene_list :
            gene(name=gene['name'])

        return_obj = {
            'name'          : gene_favorite_model.name,
            'id'            : gene_favorite_model.id
        }
        return return_obj

    @classmethod
    def get_list(cls, user):
        list = cls.objects.filter(user=user).order_by('-last_date_saved')

        for fav in list:
            fav.genes = fav.get_genes()

        return list

    def get_genes(self):
        return self.gene_set.filter(variable_favorite=self)

    def destroy(self):
        self.active = False

class GeneFavorite_Last_View(models.Model):
    genefavorite = models.ForeignKey(GeneFavorite, blank=False)
    user = models.ForeignKey(User, null=False, blank=False)
    last_view = models.DateTimeField(auto_now_add=True, auto_now=True)

class Gene(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.TextField(null=False, blank=False)