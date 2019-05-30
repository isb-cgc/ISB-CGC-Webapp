#
# Copyright 2015, Institute for Systems Biology
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

from cohorts.models import Cohort

from builtins import object
import operator

from django.db import models
from django.db.models import Q
from django.contrib.auth.models import User

from functools import reduce


class SavedVizManager(models.Manager):
    def search(self, search_terms):
        terms = [term.strip() for term in search_terms.split()]
        q_objects = []

        for term in terms:
            q_objects.append(Q(name__icontains=term))

        # Start with a bare QuerySet
        qs = self.get_queryset()

        # Use operator's or_ to string together all of your Q objects.
        return qs.filter(reduce(operator.and_, [reduce(operator.or_, q_objects), Q(active=True)]))

    def generic_viz_only(self, request):
        viz_perms = Viz_Perms.objects.filter(user=request.user).values_list('visualization', flat=True)
        plot_viz_ids = Plot.objects.filter(visualization__in=viz_perms).exclude(plot_type='seqpeek').values_list('visualization', flat=True)
        return SavedViz.objects.filter(id__in=plot_viz_ids, active=True)

    def seqpeek_only(self, request):
        viz_perms = Viz_Perms.objects.filter(user=request.user).values_list('visualization', flat=True)
        plot_viz_ids = Plot.objects.filter(visualization__in=viz_perms, plot_type='seqpeek').values_list('visualization', flat=True)
        return SavedViz.objects.filter(id__in=plot_viz_ids, active=True)

class SavedViz(models.Model):
    name = models.TextField(null=True)
    last_date_saved = models.DateTimeField(auto_now=True)
    active = models.BooleanField(default=True)
    parent = models.ForeignKey('self', null=True, blank=True, default=None)
    objects = SavedVizManager()

    def get_perm(self, request):
        perm = self.viz_perms_set.filter(user_id=request.user.id).order_by('perm')
        if len(perm) >= 1:
            return perm[0]
        else:
            return None

    def get_owner(self):
        return self.viz_perms_set.filter(perm=Viz_Perms.OWNER)[0].user

    class Meta(object):
        verbose_name_plural = "Saved Visualizations"

class Plot(models.Model):
    visualization = models.ForeignKey(SavedViz, blank=False)
    title = models.TextField(null=True)
    x_axis = models.TextField()
    y_axis = models.TextField()
    color_by = models.TextField(null=True)
    plot_type = models.TextField()
    log_transf_x = models.BooleanField(default=False)
    log_transf_y = models.BooleanField(default=False)
    # notes = models.CharField(max_length=1024, null=True)

class Plot_Cohorts(models.Model):
    plot = models.ForeignKey(Plot, blank=False)
    cohort = models.ForeignKey(Cohort, blank=False)

class Viz_Perms(models.Model):
    READER = 'READER'
    OWNER = 'OWNER'
    PERMISSIONS = (
        (READER, 'Reader'),
        (OWNER, 'Owner')
    )

    visualization = models.ForeignKey(SavedViz, null=False, blank=False)
    user = models.ForeignKey(User, null=False, blank=False)
    perm = models.CharField(max_length=10, choices=PERMISSIONS, default=READER)

class Plot_Comments(models.Model):
    plot = models.ForeignKey(Plot, blank=False, related_name='plot_comment')
    user = models.ForeignKey(User, null=False, blank=False)
    date_created = models.DateTimeField(auto_now_add=True)
    content = models.CharField(max_length=1024, null=False)