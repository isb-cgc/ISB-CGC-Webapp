# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('projects', '__first__'),
    ]

    operations = [
        migrations.CreateModel(
            name='Cohort',
            fields=[
                ('id', models.AutoField(serialize=False, primary_key=True)),
                ('name', models.TextField(null=True)),
                ('active', models.BooleanField(default=True)),
                ('last_date_saved', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name_plural': 'Saved Cohorts',
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Cohort_Comments',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('date_created', models.DateTimeField(auto_now_add=True)),
                ('content', models.CharField(max_length=1024)),
                ('cohort', models.ForeignKey(related_name='cohort_comment', to='cohorts.Cohort')),
                ('user', models.ForeignKey(to=settings.AUTH_USER_MODEL)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Cohort_Last_View',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('last_view', models.DateTimeField(auto_now=True, auto_now_add=True)),
                ('cohort', models.ForeignKey(to='cohorts.Cohort')),
                ('user', models.ForeignKey(to=settings.AUTH_USER_MODEL)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Cohort_Perms',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('perm', models.CharField(default=b'READER', max_length=10, choices=[(b'READER', b'Reader'), (b'OWNER', b'Owner')])),
                ('cohort', models.ForeignKey(to='cohorts.Cohort')),
                ('user', models.ForeignKey(to=settings.AUTH_USER_MODEL, blank=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Filters',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.CharField(max_length=256)),
                ('value', models.CharField(max_length=512)),
                ('feature_def', models.ForeignKey(blank=True, to='projects.User_Feature_Definitions', null=True)),
                ('resulting_cohort', models.ForeignKey(blank=True, to='cohorts.Cohort', null=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Patients',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('patient_id', models.TextField()),
                ('cohort', models.ForeignKey(to='cohorts.Cohort')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Samples',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('sample_id', models.TextField()),
                ('cohort', models.ForeignKey(to='cohorts.Cohort')),
                ('study', models.ForeignKey(blank=True, to='projects.Study', null=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Source',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('type', models.CharField(max_length=10, choices=[(b'FILTERS', b'Filters'), (b'SET_OPS', b'Set Operations'), (b'PLOT_SEL', b'Plot Selections'), (b'CLONE', b'Clone')])),
                ('notes', models.CharField(max_length=1024, blank=True)),
                ('cohort', models.ForeignKey(related_name='source_cohort', to='cohorts.Cohort')),
                ('parent', models.ForeignKey(related_name='source_parent', blank=True, to='cohorts.Cohort', null=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
    ]
