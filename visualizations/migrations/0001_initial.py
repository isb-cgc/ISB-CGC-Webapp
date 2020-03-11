# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('cohorts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Plot',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('title', models.TextField(null=True)),
                ('x_axis', models.TextField()),
                ('y_axis', models.TextField()),
                ('color_by', models.TextField(null=True)),
                ('plot_type', models.TextField()),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Plot_Cohorts',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('cohort', models.ForeignKey(on_delete=models.CASCADE, to='cohorts.Cohort')),
                ('plot', models.ForeignKey(on_delete=models.CASCADE, to='visualizations.Plot')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Plot_Comments',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('date_created', models.DateTimeField(auto_now_add=True)),
                ('content', models.CharField(max_length=1024)),
                ('plot', models.ForeignKey(on_delete=models.CASCADE, related_name='plot_comment', to='visualizations.Plot')),
                ('user', models.ForeignKey(on_delete=models.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='SavedViz',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.TextField(null=True)),
                ('last_date_saved', models.DateTimeField(auto_now=True)),
                ('active', models.BooleanField(default=True)),
                ('parent', models.ForeignKey(on_delete=models.CASCADE, default=None, blank=True, to='visualizations.SavedViz', null=True)),
            ],
            options={
                'verbose_name_plural': 'Saved Visualizations',
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Viz_Perms',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('perm', models.CharField(default=b'READER', max_length=10, choices=[(b'READER', b'Reader'), (b'OWNER', b'Owner')])),
                ('user', models.ForeignKey(on_delete=models.CASCADE, to=settings.AUTH_USER_MODEL)),
                ('visualization', models.ForeignKey(on_delete=models.CASCADE, to='visualizations.SavedViz')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.AddField(
            model_name='plot',
            name='visualization',
            field=models.ForeignKey(on_delete=models.CASCADE, to='visualizations.SavedViz'),
            preserve_default=True,
        ),
    ]
