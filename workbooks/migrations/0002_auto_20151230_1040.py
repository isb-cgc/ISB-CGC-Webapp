# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings
from workbooks.models import Workbook

def add_owner(apps, schema_editor):
    workbook = apps.get_model('workbooks', 'Workbook')

    # Set owner from old model
    set = workbook.objects.all()
    for wb in set:
        new_wb = Workbook.objects.get(id=wb.id)
        # Hard-coded 'OWNER' value pulled from old model
        new_wb.owner_id = wb.workbook_perms_set.filter(perm='OWNER')[0].user.id
        new_wb.save()


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('sharing', '0001_initial'),
        ('workbooks', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='workbook',
            name='active',
            field=models.BooleanField(default=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='workbook',
            name='owner',
            field=models.ForeignKey(null=True, to=settings.AUTH_USER_MODEL),
            preserve_default=False,
        ),
        migrations.RunPython(
            add_owner
        ),
        migrations.AlterField(
            model_name='workbook',
            name='owner',
            field=models.ForeignKey(default=2, to=settings.AUTH_USER_MODEL),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='workbook',
            name='shared',
            field=models.ManyToManyField(to='sharing.Shared_Resource'),
            preserve_default=True,
        ),
    ]
