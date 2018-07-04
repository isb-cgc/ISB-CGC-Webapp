import operator
import sys

from django.db import models
from django.contrib.auth.models import User
from django.db.models import Q
import logging

logger = logging.getLogger('main_logger')


class GeneFavoriteManager(models.Manager):
    content = None

class GeneFavorite(models.Model):
    id      = models.AutoField(primary_key=True)
    name    = models.TextField(null=True)
    active  = models.BooleanField(default=True)
    user    = models.ForeignKey(User, null=False, blank=False)
    last_date_saved = models.DateTimeField(auto_now=True)
    objects = GeneFavoriteManager()

    @classmethod
    def get_list(cls, user):
        list = cls.objects.filter(user=user, active=True).order_by('-last_date_saved')

        for fav in list:
            fav.genes = fav.get_genes()

        return list

    @classmethod
    def create(cls, name, gene_list, user):
        gene_favorite_model = cls.objects.create(name=name, user=user)
        gene_favorite_model.save()

        for gene_name in gene_list:
            # Get the formal gene symbol name, if it exists
            gene_symbol = GeneSymbol.objects.filter(symbol=gene_name)
            if len(gene_symbol) > 0:
                gene_name = gene_symbol[0].symbol
            gene_model = Gene(name=gene_name, gene_favorite=gene_favorite_model)
            gene_model.save()

        return_obj = {
            'name'          : gene_favorite_model.name,
            'id'            : gene_favorite_model.id
        }
        return return_obj

    '''
    Sets the last viewed time for a cohort
    '''
    def mark_viewed(self, request, user=None):
        if user is None:
            user = request.user

        last_view = self.genefavorite_last_view_set.filter(user=user)
        if last_view is None or len(last_view) is 0:
            last_view = self.genefavorite_last_view_set.create(user=user)
        else:
            last_view = last_view[0]

        last_view.save(False, True)

        return last_view

    def get_genes_list(self):
        return self.gene_set.all().values_list('name', flat=True)

    def edit_list(self, gene_list, user):
        if self.user == user :
            #TODO delete all then resave not the most efficient
            genes = Gene.objects.filter(gene_favorite=self)
            for g in genes :
                g.delete()

            for gene_name in gene_list:
                gene_model = Gene(name=gene_name, gene_favorite=self)
                gene_model.save()

            return_obj = {
                'genes': gene_list,
            }
        else :
            return_obj = {
                'error'     : "you do not have access to update this list",
            }
        return return_obj

    def get_genes(self):
        return self.gene_set.filter(gene_favorite=self)

    def get_gene_name_list(self):
        names = []
        genes = self.get_genes()
        for g in genes:
            names.append(g.name)

        return names

    def destroy(self):
        self.active = False
        genes = Gene.objects.filter(gene_favorite=self)
        for g in genes:
            g.delete()
        self.save()
        return {'message': "gene favorite has been deleted"}


class GeneFavorite_Last_View(models.Model):
    genefavorite = models.ForeignKey(GeneFavorite, blank=False)
    user = models.ForeignKey(User, null=False, blank=False)
    last_view = models.DateTimeField(auto_now=True)


class Gene(models.Model):
    id            = models.AutoField(primary_key=True)
    name          = models.TextField(null=False, blank=False)
    gene_favorite = models.ForeignKey(GeneFavorite, null=False, blank=False)


class GeneSymbol_Manager(models.Manager):
    content = None


#used solely for list of gene symbols
class GeneSymbol(models.Model):
    id = models.AutoField(primary_key=True)
    symbol = models.CharField(max_length=255, null=False, blank=False, db_index=True)
    type = models.CharField(max_length=16, null=True, blank=False)
    objects = GeneSymbol_Manager()

     #returns a boolean on whether the string is valid
    @classmethod
    def is_gene_valid(cls, string):
        result = cls.objects.filter(symbol=string)
        if result.count() > 0:
            return True
        else:
            return False

    # returns the type-string if a matching symbol is found
    @classmethod
    def get_type(cls, symbol):
        genesymbol = cls.objects.filter(symbol=symbol)

        if len(genesymbol) > 0:
            return genesymbol[0].type
        return None

    #returns a list of gene symbol suggestions
    @classmethod
    def suggest_symbol(cls, string):
        results = cls.objects.filter(symbol__istartswith=string)[:10].values('symbol')
        return results
