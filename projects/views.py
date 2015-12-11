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
from projects.models import Project

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
    redirect_url = '/projects/'
    proj = None
    study = None

    # TODO: Validation

    if request.POST['project-type'] == 'new':
        proj = request.user.project_set.create(name=request.POST['project-name'], description=request.POST['project-description'])
        proj.save()
    else:
        proj = request.user.project_set.all().filter(id=request.POST['project-id'])

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

        for formfield in request.FILES:
            for file in request.FILES.getlist(formfield):
                print file.name
                file_upload = UserUploadedFile(upload=upload, file=file)
                file_upload.save()

        if settings.PROCESSING_ENABLED:
            files = {'config.json': ('config.json',
                                     json.dumps({
                                         'foo': 'bar'
                                     }))}
            r = requests.post(settings.PROCESSING_JENKINS_URL + '/job/' + settings.PROCESSING_JENKINS_PROJECT + '/buildWithParameters',
                              files=files, auth=(settings.PROCESSING_JENKINS_USER, settings.PROCESSING_JENKINS_PASSWORD))

            if r.status_code < 400:
                upload.status = 'Processing'
                upload.jobURL = r.headers['Location']
            else:
                upload.status = 'Error Initializing'

            upload.save()

    return JsonResponse({'status':'success', 'redirect_url': '/projects/1/'})