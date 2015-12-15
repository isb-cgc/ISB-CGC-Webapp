from copy import deepcopy
import re
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.conf import settings
from django.http import JsonResponse, HttpResponseNotFound
from django.conf import settings
from django.db import connection
from data_upload.models import UserUpload, UserUploadedFile
from projects.models import User_Feature_Definitions, Project

import json
import requests

@login_required
def project_list(request):
    template = 'projects/project_list.html'

    # TODO Handle sharing
    context = {
        'projects': request.user.project_set.all().filter(active=True),
        'public_projects': Project.objects.all().filter(is_public=True,active=True)
    }
    return render(request, template, context)

@login_required
def project_detail(request, project_id=0):
    # """ if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name """
    template = 'projects/project_detail.html'

    # TODO Handle sharing
    proj = Project.objects.get(id=project_id,active=True)

    if proj.owner_id != request.user.id and not proj.is_public:
        # Project is not the user's and is not public, return 404
        return HttpResponseNotFound('Project Not Found');


    context = {
        'project': proj
    }
    return render(request, template, context)

@login_required
def project_upload(request):
    template = 'projects/project_upload.html'
    context = {}
    return render(request, template, context)

def filter_column_name(original):
    return re.sub(r"[^a-zA-Z]+", "_", original.lower())

def create_metadata_tables(user, study, columns):
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_metadata_%s_%s (
          id INTEGER UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          study_id INTEGER UNSIGNED,
          sample_barcode VARCHAR(200),
          file_path VARCHAR(200),
          file_name VARCHAR(200),
          data_type VARCHAR(200),
          pipeline VARCHAR(200),
          platform VARCHAR(200)
        )
    """, [user.id, study.id])

    feature_table_sql = """
        CREATE TABLE IF NOT EXISTS user_metadata_samples_%s_%s (
          id INTEGER UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          participant_barcode VARCHAR(200),
          sample_barcode VARCHAR(200),
          has_mrna BOOLEAN,
          has_mirna BOOLEAN,
          has_protein BOOLEAN,
          has_meth BOOLEAN
    """
    feature_table_args = [user.id, study.id]

    for column in columns:
        feature_table_sql += ", " + filter_column_name(column['name']) + " " + column['type']

    feature_table_sql += ")"
    cursor.execute(feature_table_sql, feature_table_args)



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

        if request.POST['data-type'] == 'extend':
            # TODO Does this need a share check??
            study.extends_id = request.POST['extend-study-id']

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
            "USER_METADATA_TABLES": {
                "METADATA_DATA" : "user_metadata_" + str(request.user.id) + "_" + str(study.id),
                "METADATA_SAMPLES" : "user_metadata_samples_" + str(request.user.id) + "_" + str(study.id),
                "FEATURE_DEFS": User_Feature_Definitions._meta.db_table
            }
        }
        all_columns = []

        for formfield in request.FILES:
            file = request.FILES[formfield]
            file_upload = UserUploadedFile(upload=upload, file=file, bucket=config['BUCKET'])
            file_upload.save()

            descriptor = json.loads(request.POST[formfield + '_desc'])
            datatype = request.POST[formfield + '_type']
            fileJSON = {
                "FILENAME": file_upload.file.name,
                "PLATFORM": descriptor['platform'],
                "PIPELINE": descriptor['pipeline'],
                "BIGQUERY_TABLE_NAME": "cgc_" + ("user" if datatype == 'user_gen' else datatype) +
                                       "_" + str(proj.id) + "_" + str(study.id),
                "DATATYPE": datatype,
                "COLUMNS": []
            }

            if datatype == "user_gen":
                for column in descriptor['columns']:
                    if column['ignored']:
                        continue

                    type = column['type']
                    if type == 'string' or type == 'url' or type == 'file':
                        type = 'VARCHAR(200)'
                    else:
                        type = filter_column_name(type)

                    controlled = None
                    if 'controlled' in column:
                        controlled = column['controlled']['key']

                    fileJSON['COLUMNS'].append({
                        "NAME"   : column['name'],
                        "TYPE"   : type,
                        "INDEX"  : column['index'],
                        "MAP_TO" : controlled,
                    })

                    all_columns.append({
                        "name": column['name'],
                        "type": type
                    })

            config['FILES'].append(fileJSON)

        create_metadata_tables(request.user, study, all_columns)
        request.user.user_data_tables_set.create(
            study=study,
            metadata_data_table=config['USER_METADATA_TABLES']['METADATA_DATA'],
            metadata_samples_table=config['USER_METADATA_TABLES']['METADATA_SAMPLES'],
            data_upload=upload,
            google_project=request.user.googleproject,
            google_bucket=request.user.bucket_set.all()[0]
        )

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