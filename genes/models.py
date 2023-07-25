import operator
import sys

from django.db import models
from django.contrib.auth.models import User
from django.db.models import Q
import logging

logger = logging.getLogger('main_logger')


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
