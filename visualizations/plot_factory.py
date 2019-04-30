from __future__ import absolute_import

from builtins import str
from builtins import map
from past.builtins import basestring
from builtins import object
import json
import collections
import datetime

from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_protect
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.contrib.auth.models import User
from django.core.urlresolvers import reverse
from django.utils import formats

from .models import SavedViz, Plot, Plot_Cohorts, Viz_Perms, Plot_Comments
from cohorts.models import Cohort, Cohort_Perms, Samples
from .plot_enums import PlotEnums

# This factory generates the data objects needed for every visualization
class PlotFactory(object):
    @classmethod
    def _decode_list(cls, data):
        rv = []
        for item in data:
            if isinstance(item, str):
                item = item.encode('utf-8')
            elif isinstance(item, list):
                item = cls._decode_list(item)
            elif isinstance(item, dict):
                item = cls._decode_dict(item)
            rv.append(item)
        return rv

    @classmethod
    def _decode_dict(cls, data):
        rv = {}
        for key, value in data.items():
            if isinstance(key, str):
                key = key.encode('utf-8')
            if isinstance(value, str):
                value = value.encode('utf-8')
            elif isinstance(value, list):
                value = cls._decode_list(value)
            elif isinstance(value, dict):
                value = cls._decode_dict(value)
            rv[key] = value
        return rv

    @classmethod
    def convert(cls, data):
        if isinstance(data, basestring):
            return str(data)
        elif isinstance(data, collections.Mapping):
            return dict(list(map(cls.convert, iter(data.items()))))
        elif isinstance(data, collections.Iterable):
            return type(data)(list(map(cls.convert, data)))
        else:
            return data

    @staticmethod
    def union_cohort_samples_cases(cohort_ids):
        cohort_cases = Samples.objects.filter(cohort_id__in=cohort_ids).distinct().values_list('case_barcode', flat=True)
        cohort_samples = Samples.objects.filter(cohort_id__in=cohort_ids).distinct().values_list('sample_barcode', flat=True)
        return cohort_samples, cohort_cases

    @classmethod
    def generate_generic_plot(cls, title, cohort):
        viz = SavedViz.objects.create(name=title)
        viz.save()
        # perm = Viz_Perms.objects.create(visualization=viz, user=request.user, perm=Viz_Perms.OWNER)
        # perm.save()
        # viz_perm = perm
        plot = Plot.objects.create(visualization=viz,
                                   title='',
                                   x_axis='CLIN:age_at_initial_pathologic_diagnosis',
                                   y_axis='',
                                   color_by='CLIN:Study')

        plot.save()
        plot_cohort = Plot_Cohorts.objects.create(plot=plot, cohort=cohort)
        plot_cohort.save()

        item = {
                'plot_id': int(plot.id),
                'title': plot.title.encode('utf-8'),
                'x_attr': str(plot.x_axis),
                'y_attr': str(plot.y_axis),
                'color_by': str(plot.color_by),
                'cohorts': [{
                        'id': int(cohort.id),
                        'name': cohort.name.encode('utf-8')
                    }],
                'cohort_name': str(cohort.name),
                'patient_length': len(cohort.case_size()),
                'sample_length': len(cohort.samples_size()),
        }

        plots_data.append(item)
        plot_render_data.append({
            'id': int(plot.id),
            'title': plot.title.encode('utf-8'),
            'cohorts': [{
                        'id': int(cohort.id),
                        'name': cohort.name.encode('utf-8')
                    }],
            'cohort_name': str(cohort.name),
            'patient_length': len(cohort.patients_set.all()),
            'sample_length': len(cohort.samples_set.all()),
            'comments': [],
            'viz_perm': perm.perm,
            'x_attr': str(plot.x_axis),
            'y_attr': str(plot.y_axis),
            'color_by': str(plot.color_by),
        })

        return {  'template'                : 'visualizations/genericplot.html',
                  'searches'                : searches,
                  'viz'                     : viz,
                  'viz_perm'                : viz_perm.perm,
                  'plots_data'              : plots_data,
                  'plot_render_data'        : plot_render_data,
                  'users'                   : users,
                  'friendly_name_map'       : PlotEnums.get_fm_friendly_name_map(),
                  'categorical_attributes'  : PlotEnums.get_fm_categorical_attributes(),
                  'numerical_attributes'    : PlotEnums.get_fm_numerical_attributes()
                }