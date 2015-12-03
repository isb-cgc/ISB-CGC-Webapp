from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.http import JsonResponse
from django.conf import settings
from data_upload.models import UserUpload, UserUploadedFile

import json
import requests

@login_required
def upload_file(request):
    upload = UserUpload(owner=request.user)
    upload.save()

    for formfield in request.FILES:
        for file in request.FILES.getlist(formfield):
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

    return JsonResponse({'status':'success'})

@login_required
def test_form(request):
    return render(request, 'data_upload/test_form.html', {})
