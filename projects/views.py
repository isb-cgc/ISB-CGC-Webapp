from copy import deepcopy
import re
from google.appengine.api import urlfetch
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.conf import settings
from django.http import JsonResponse
from django.conf import settings
from data_upload.models import UserUpload, UserUploadedFile

import json
import requests

@login_required
def project_list(request):
    template = 'projects/project_list.html'
    context = {}
    return render(request, template, context)

@login_required
def project_detail(request, project_id=0):
    # """ if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name """
    template = 'projects/project_detail.html'
    context = {}
    return render(request, template, context)

@login_required
def project_upload(request):
    template = 'projects/project_upload.html'
    context = {}
    return render(request, template, context)

@login_required
def upload_files(request):
    status = 'success'
    message = None
    proj = None
    study = None

    # TODO: Validation

    if request.POST['project-type'] == 'new':
        proj = request.user.project_set.create(name=request.POST['project-name'], description=request.POST['project-description'])
        proj.save()
    else:
        proj = request.user.project_set.all().filter(id=request.POST['project-id'])[0]

    if proj is None:
        status = 'error'
        message = 'Unable to create project'
    else:
        study = proj.study_set.create(
            name=request.POST['study-name'],
            description=request.POST['study-description'],
            owner=request.user
        )
        study.save()

        upload = UserUpload(owner=request.user)
        upload.save()

        config = {
            "USER_PROJECT": proj.id,
            "USER_ID": request.user.id,
            "STUDY": study.id,
            "BUCKET": request.user.bucket_set.all()[0].bucket_name,
            "GOOGLE_PROJECT": request.user.googleproject.project_name,
            "BIGQUERY_DATASET": request.user.googleproject.big_query_dataset,
            "FILES": [],
            "USER_METADATA_TABLES": { # TODO
                "METADATA_DATA" : "user_metadata_1_1",
                "METADATA_SAMPLES" : "user_metadata_samples_1_1",
                "FEATURE_DEFS": "user_feature_defs_1_1"
            }
        }

        for formfield in request.FILES:
            file = request.FILES[formfield]
            file_upload = UserUploadedFile(upload=upload, file=file)
            file_upload.save()

            descriptor = json.loads(request.POST[formfield + '_desc'])
            fileJSON = {
                "FILENAME": file_upload.file.name,
                "PLATFORM": descriptor['platform'],
                "PIPELINE": descriptor['pipeline'],
                "BIGQUERY_TABLE_NAME": "", # TODO
                "DATATYPE": request.POST[formfield + '_type'],
                "COLUMNS": []
            }

            if fileJSON['DATATYPE'] == "user_gen":
                for column in descriptor['columns']:
                    if column['ignored']:
                        continue

                    print column
                    type = column['type']
                    if type == 'string' or type == 'url' or type == 'file':
                        type = 'VARCHAR(200)'

                    fileJSON['COLUMNS'].append({
                        "NAME"  : column['name'],
                        "TYPE"  : type,
                        "INDEX" : column['index'],
                        "MAP_TO" : "the big query column name that the column maps to?", # TODO
                    })

            config['FILES'].append(fileJSON)

        if settings.PROCESSING_ENABLED:
            files = {'config.json': ('config.json', json.dumps(config))}
            r = requests.post(settings.PROCESSING_JENKINS_URL + '/job/' + settings.PROCESSING_JENKINS_PROJECT + '/buildWithParameters',
                              files=files, auth=(settings.PROCESSING_JENKINS_USER, settings.PROCESSING_JENKINS_PASSWORD))

            if r.status_code < 400:
                upload.status = 'Processing'
                upload.jobURL = r.headers['Location']
            else:
                upload.status = 'Error Initializing'

            upload.save()

    resp = {
        'status': status,
        'message': message
    }
    if status is "success":
        resp['redirect_url'] = '/projects/' + str(proj.id) + '/'

    return JsonResponse(resp)