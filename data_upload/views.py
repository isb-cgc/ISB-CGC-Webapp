from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.http import JsonResponse
from data_upload.models import UserUpload, UserUploadedFile

@login_required
def upload_file(request):
    upload = UserUpload(owner=request.user)
    upload.save()

    for formfield in request.FILES:
        for file in request.FILES.getlist(formfield):
            file_upload = UserUploadedFile(upload=upload, file=file)
            file_upload.save()


    return JsonResponse({'status':'succes'})

@login_required
def test_form(request):
    return render(request, 'data_upload/test_form.html', {})
