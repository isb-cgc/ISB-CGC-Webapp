"""

Copyright 2015, Institute for Systems Biology

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

"""

import logging
from datetime import datetime

import endpoints
from protorpc import messages
from protorpc import remote
from django.core.exceptions import ObjectDoesNotExist, MultipleObjectsReturned
from django.contrib.auth.models import User as Django_User
from django.core.signals import request_finished
import django


from metadata import MetadataItem, IncomingMetadataItem

from accounts.models import NIH_User
from cohorts.models import Cohort as Django_Cohort, Cohort_Perms, Patients, Samples, Filters
from bq_data_access.cohort_bigquery import BigQueryCohortSupport
from api_helpers import *


logger = logging.getLogger(__name__)

INSTALLED_APP_CLIENT_ID = settings.INSTALLED_APP_CLIENT_ID
CONTROLLED_ACL_GOOGLE_GROUP = settings.ACL_GOOGLE_GROUP

DEFAULT_COHORT_NAME = 'Untitled Cohort'

IMPORTANT_FEATURES = [
    'tumor_tissue_site',
    'gender',
    'vital_status',
    'country',
    'Study',
    'age_at_initial_pathologic_diagnosis',
    'TP53',
    'RB1',
    'NF1',
    'APC',
    'CTNNB1',
    'PIK3CA',
    'PTEN',
    'FBXW7',
    'NRAS',
    'ARID1A',
    'CDKN2A',
    'SMAD4',
    'BRAF',
    'NFE2L2',
    'IDH1',
    'PIK3R1',
    'HRAS',
    'EGFR',
    'BAP1',
    'KRAS',
    'DNAseq_data',
    'mirnPlatform',
    'cnvrPlatform',
    'methPlatform',
    'gexpPlatform',
    'rppaPlatform'
]

class ReturnJSON(messages.Message):
    msg = messages.StringField(1)


class FilterDetails(messages.Message):
    name = messages.StringField(1)
    value = messages.StringField(2)

class Cohort(messages.Message):
    id = messages.StringField(1)
    name = messages.StringField(2)
    last_date_saved = messages.StringField(3)
    perm = messages.StringField(4)
    email = messages.StringField(5)
    comments = messages.StringField(6)
    source_type = messages.StringField(7)
    source_notes = messages.StringField(8)
    parent_id = messages.IntegerField(9)
    filters = messages.MessageField(FilterDetails, 10, repeated=True)
    num_patients = messages.StringField(11)
    num_samples = messages.StringField(12)

class CohortsList(messages.Message):
    items = messages.MessageField(Cohort, 1, repeated=True)
    count = messages.IntegerField(2)

class CohortPatientsSamplesList(messages.Message):
    patients = messages.StringField(1, repeated=True)
    patient_count = messages.IntegerField(2)
    samples = messages.StringField(3, repeated=True)
    sample_count = messages.IntegerField(4)
    cohort_id = messages.IntegerField(5)


class PatientDetails(messages.Message):
    clinical_data = messages.MessageField(MetadataItem, 1)
    samples = messages.StringField(2, repeated=True)
    aliquots = messages.StringField(3, repeated=True)
    error = messages.StringField(4)

class DataDetails(messages.Message):
    SampleBarcode = messages.StringField(1)
    DataCenterName = messages.StringField(2)
    DataCenterType = messages.StringField(3)
    DataFileName = messages.StringField(4)
    DataFileNameKey = messages.StringField(5)
    DatafileUploaded = messages.StringField(6)
    DataLevel = messages.StringField(7)
    Datatype = messages.StringField(8)
    GenomeReference = messages.StringField(9)
    Pipeline = messages.StringField(10)
    Platform = messages.StringField(11)
    platform_full_name = messages.StringField(12)
    Project = messages.StringField(13)
    Repository = messages.StringField(14)
    SDRFFileName = messages.StringField(15)
    SecurityProtocol = messages.StringField(16)

class SampleDetails(messages.Message):
    biospecimen_data = messages.MessageField(MetadataItem, 1)
    aliquots = messages.StringField(2, repeated=True)
    patient = messages.StringField(3)
    data_details = messages.MessageField(DataDetails, 4, repeated=True)
    data_details_count = messages.IntegerField(5)
    error = messages.StringField(6)

class DataFileNameKeyList(messages.Message):
    datafilenamekeys = messages.StringField(1, repeated=True)
    count = messages.IntegerField(2)


Cohort_Endpoints = endpoints.api(name='cohort_api', version='v1', description="Get information about "
                                "cohorts, patients, and samples. Create and delete cohorts.",
                                 allowed_client_ids=[INSTALLED_APP_CLIENT_ID, endpoints.API_EXPLORER_CLIENT_ID])

@Cohort_Endpoints.api_class(resource_name='cohort_endpoints')
class Cohort_Endpoints_API(remote.Service):


    GET_RESOURCE = endpoints.ResourceContainer(token=messages.StringField(1), cohort_id=messages.IntegerField(2))
    @endpoints.method(GET_RESOURCE, CohortsList,
                      path='cohorts_list', http_method='GET', name='cohorts.list')
    def cohorts_list(self, request):
        '''
        Lists cohorts a user has either READER or OWNER permission on.
        :param token: Optional. Access token with email scope to verify user's google identity.
        :param cohort_id: Optional. Cohort id to get information about.
        :return: List of one or more cohorts along with information about each cohort.
        '''
        user_email = None
        cursor = None
        filter_cursor = None
        db = None

        if endpoints.get_current_user() is not None:
            user_email = endpoints.get_current_user().email()

        # users have the option of pasting the access token in the query string
        # or in the 'token' field in the api explorer
        # but this is not required
        access_token = request.__getattribute__('token')
        if access_token:
            user_email = get_user_email_from_token(access_token)

        cohort_id = request.__getattribute__('cohort_id')

        if user_email:
            django.setup()
            try:
                user_id = Django_User.objects.get(email=user_email).id
            except (ObjectDoesNotExist, MultipleObjectsReturned), e:
                logger.warn(e)
                raise endpoints.NotFoundException("%s does not have an entry in the user database." % user_email)

            query_dict = {'cohorts_cohort_perms.user_id': user_id, 'cohorts_cohort.active': unicode('1')}

            if cohort_id:
                query_dict['cohorts_cohort.id'] = cohort_id

            query_str = 'select cohorts_cohort.id, ' \
                        'cohorts_cohort.name, ' \
                        'cohorts_cohort.last_date_saved, ' \
                        'cohorts_cohort_perms.perm, ' \
                        'auth_user.email, ' \
                        'cohorts_cohort_comments.content as comments, ' \
                        'cohorts_source.type as source_type, ' \
                        'cohorts_source.notes as source_notes, ' \
                        'cohorts_source.parent_id ' \
                        'from cohorts_cohort_perms ' \
                        'join cohorts_cohort ' \
                        'on cohorts_cohort.id=cohorts_cohort_perms.cohort_id ' \
                        'join auth_user ' \
                        'on auth_user.id=cohorts_cohort_perms.user_id ' \
                        'left join cohorts_cohort_comments ' \
                        'on cohorts_cohort_comments.user_id=cohorts_cohort_perms.user_id ' \
                        'left join cohorts_source ' \
                        'on cohorts_source.cohort_id=cohorts_cohort_perms.cohort_id '

            query_tuple = ()
            if query_dict:
                query_str += ' where ' + '=%s and '.join(key for key in query_dict.keys()) + '=%s'
                query_tuple = tuple(value for value in query_dict.values())

            try:
                db = sql_connection()
                cursor = db.cursor(MySQLdb.cursors.DictCursor)
                cursor.execute(query_str, query_tuple)
                data = []
                for row in cursor.fetchall():
                    filter_query_str = 'SELECT name, value ' \
                                       'FROM cohorts_filters ' \
                                       'WHERE cohorts_filters.resulting_cohort_id=%s'

                    filter_cursor = db.cursor(MySQLdb.cursors.DictCursor)
                    filter_cursor.execute(filter_query_str, (str(row['id']),))
                    filter_data = []
                    for filter_row in filter_cursor.fetchall():
                        filter_data.append(FilterDetails(
                            name=str(filter_row['name']),
                            value=str(filter_row['value'])
                        ))

                    data.append(Cohort(
                        id=str(row['id']),
                        name=str(row['name']),
                        last_date_saved=str(row['last_date_saved']),
                        perm=str(row['perm']),
                        email=str(row['email']),
                        comments=str(row['comments']),
                        source_type=None if row['source_type'] is None else str(row['source_type']),
                        source_notes=None if row['source_notes'] is None else str(row['source_notes']),
                        parent_id=None if row['parent_id'] is None else int(row['parent_id']),
                        filters=filter_data
                    ))

                return CohortsList(items=data, count=len(data))
            except (IndexError, TypeError) as e:
                raise endpoints.NotFoundException(
                    "User {}'s cohorts not found. {}: {}".format(user_email, type(e), e))
            finally:
                if cursor: cursor.close()
                if filter_cursor: filter_cursor.close()
                if db and db.open: db.close()
                request_finished.send(self)
        else:
            raise endpoints.UnauthorizedException("Authentication failed.")


    GET_RESOURCE = endpoints.ResourceContainer(cohort_id=messages.IntegerField(1, required=True),
                                               token=messages.StringField(2))
    @endpoints.method(GET_RESOURCE, CohortPatientsSamplesList,
                      path='cohort_patients_samples_list', http_method='GET',
                      name='cohorts.cohort_patients_samples_list')
    def cohort_patients_samples_list(self, request):
        """
        Returns information about the participants and samples in a particular cohort.
        :param cohort_id: Required.
        :param token: Optional. Access token with email scope to verify user's google identity.
        :return: List of participant barcodes, sample barcodes, and a total count of each.
        Returns error message if the cohort id is invalid or if the user does not have reader or
        owner permissions on that cohort.
        """

        db = None
        cursor = None
        user_email = None

        if endpoints.get_current_user() is not None:
            user_email = endpoints.get_current_user().email()

        # users have the option of pasting the access token in the query string
        # or in the 'token' field in the api explorer
        # but this is not required
        access_token = request.__getattribute__('token')
        if access_token:
            user_email = get_user_email_from_token(access_token)

        cohort_id = request.__getattribute__('cohort_id')

        if user_email:
            django.setup()
            try:
                user_id = Django_User.objects.get(email=user_email).id
            except (ObjectDoesNotExist, MultipleObjectsReturned), e:
                logger.warn(e)
                raise endpoints.UnauthorizedException("%s does not have an entry in the user database." % user_email)

            try:
                db = sql_connection()
                cursor = db.cursor(MySQLdb.cursors.DictCursor)
                cursor.execute("select count(*) from cohorts_cohort_perms where user_id=%s and cohort_id=%s", (user_id, cohort_id))
                result = cursor.fetchone()
                if int(result['count(*)']) == 0:
                    error_message = "{} does not have owner or reader permissions on cohort {}.".format(user_email, cohort_id)
                    raise endpoints.ForbiddenException(error_message)

                cursor.execute("select count(*) from cohorts_cohort where id=%s and active=%s", (cohort_id, unicode('0')))
                result = cursor.fetchone()
                if int(result['count(*)']) > 0:
                    error_message = "Cohort {} was deleted.".format(cohort_id)
                    raise endpoints.NotFoundException(error_message)

            except (IndexError, TypeError) as e:
                logger.warn(e)
                raise endpoints.NotFoundException("Cohort {} not found.".format(cohort_id))
            finally:
                if cursor: cursor.close()
                if db and db.open: db.close()

            patient_query_str = 'select cohorts_patients.patient_id ' \
                        'from cohorts_patients ' \
                        'inner join cohorts_cohort_perms ' \
                        'on cohorts_cohort_perms.cohort_id=cohorts_patients.cohort_id ' \
                        'inner join cohorts_cohort ' \
                        'on cohorts_patients.cohort_id=cohorts_cohort.id ' \
                        'where cohorts_patients.cohort_id=%s ' \
                        'and cohorts_cohort_perms.user_id=%s ' \
                        'and cohorts_cohort.active=%s ' \
                        'group by cohorts_patients.patient_id '

            patient_query_tuple = (cohort_id, user_id, unicode('1'))

            sample_query_str = 'select cohorts_samples.sample_id ' \
                        'from cohorts_samples ' \
                        'inner join cohorts_cohort_perms ' \
                        'on cohorts_cohort_perms.cohort_id=cohorts_samples.cohort_id ' \
                        'inner join cohorts_cohort ' \
                        'on cohorts_samples.cohort_id=cohorts_cohort.id ' \
                        'where cohorts_samples.cohort_id=%s ' \
                        'and cohorts_cohort_perms.user_id=%s ' \
                        'and cohorts_cohort.active=%s ' \
                        'group by cohorts_samples.sample_id '

            sample_query_tuple = (cohort_id, user_id, unicode('1'))

            try:
                db = sql_connection()

                cursor = db.cursor(MySQLdb.cursors.DictCursor)
                cursor.execute(patient_query_str, patient_query_tuple)
                patient_data = []
                for row in cursor.fetchall():
                    patient_data.append(row['patient_id'])

                cursor.execute(sample_query_str, sample_query_tuple)
                sample_data = []
                for row in cursor.fetchall():
                    sample_data.append(row['sample_id'])

                return CohortPatientsSamplesList(patients=patient_data,
                                                 patient_count=len(patient_data),
                                                 samples=sample_data,
                                                 sample_count=len(sample_data),
                                                 cohort_id=int(cohort_id))
            except (IndexError, TypeError) as e:
                logger.warn(e)
                raise endpoints.NotFoundException("Cohort {} not found.".format(cohort_id))
            finally:
                if cursor: cursor.close()
                if db and db.open: db.close()
                request_finished.send(self)

        else:
            raise endpoints.UnauthorizedException("Authentication failed.")



    GET_RESOURCE = endpoints.ResourceContainer(patient_barcode=messages.StringField(1, required=True))
    @endpoints.method(GET_RESOURCE, PatientDetails,
                      path='patient_details', http_method='GET', name='cohorts.patient_details')
    def patient_details(self, request):
        """
        Returns information about a particular participant.
        :param patient_barcode: Required.
        :return: List of samples and a list of aliquots associated with the participant barcode
        as well as clinical data on that participant.
        """

        clinical_cursor = None
        sample_cursor = None
        aliquot_cursor = None
        db = None

        patient_barcode = request.__getattribute__('patient_barcode')

        clinical_query_str = 'select * ' \
                    'from metadata_clinical ' \
                    'where ParticipantBarcode=%s' \
                    # % patient_barcode

        query_tuple = (str(patient_barcode),)


        sample_query_str = 'select SampleBarcode ' \
                           'from metadata_biospecimen ' \
                           'where ParticipantBarcode=%s'

        aliquot_query_str = 'select AliquotBarcode ' \
                            'from metadata_data ' \
                            'where ParticipantBarcode=%s ' \
                            'group by AliquotBarcode'
        try:
            db = sql_connection()
            clinical_cursor = db.cursor(MySQLdb.cursors.DictCursor)
            clinical_cursor.execute(clinical_query_str, query_tuple)
            row = clinical_cursor.fetchone()
            if row is None:
                clinical_cursor.close()
                db.close()
                error_message = "Patient barcode {} not found in metadata_clinical table.".format(patient_barcode)
                return PatientDetails(error=error_message, clinical_data=None, samples=[], aliquots=[])
            item = MetadataItem(
                age_at_initial_pathologic_diagnosis=None if "age_at_initial_pathologic_diagnosis" not in row or row["age_at_initial_pathologic_diagnosis"] is None else int(row["age_at_initial_pathologic_diagnosis"]),
                anatomic_neoplasm_subdivision=str(row["anatomic_neoplasm_subdivision"]),
                batch_number=None if "batch_number" not in row or row["batch_number"] is None else int(row["batch_number"]),
                bcr=str(row["bcr"]),
                clinical_M=str(row["clinical_M"]),
                clinical_N=str(row["clinical_N"]),
                clinical_stage=str(row["clinical_stage"]),
                clinical_T=str(row["clinical_T"]),
                colorectal_cancer=str(row["colorectal_cancer"]),
                country=str(row["country"]),
                days_to_birth=None if "days_to_birth" not in row or row['days_to_birth'] is None else int(row["days_to_birth"]),
                days_to_death=None if "days_to_death" not in row or row['days_to_death'] is None else int(row["days_to_death"]),
                days_to_initial_pathologic_diagnosis=None if "days_to_initial_pathologic_diagnosis" not in row or row['days_to_initial_pathologic_diagnosis'] is None else int(row["days_to_initial_pathologic_diagnosis"]),
                days_to_last_followup=None if "days_to_last_followup" not in row or row['days_to_last_followup'] is None else int(row["days_to_last_followup"]),
                days_to_submitted_specimen_dx=None if "days_to_submitted_specimen_dx" not in row or row['days_to_submitted_specimen_dx'] is None else int(row["days_to_submitted_specimen_dx"]),
                Study=str(row["Study"]),
                ethnicity=str(row["ethnicity"]),
                frozen_specimen_anatomic_site=str(row["frozen_specimen_anatomic_site"]),
                gender=str(row["gender"]),
                height=None if "height" not in row or row['height'] is None else int(row["height"]),
                histological_type=str(row["histological_type"]),
                history_of_colon_polyps=str(row["history_of_colon_polyps"]),
                history_of_neoadjuvant_treatment=str(row["history_of_neoadjuvant_treatment"]),
                history_of_prior_malignancy=str(row["history_of_prior_malignancy"]),
                hpv_calls=str(row["hpv_calls"]),
                hpv_status=str(row["hpv_status"]),
                icd_10=str(row["icd_10"]),
                icd_o_3_histology=str(row["icd_o_3_histology"]),
                icd_o_3_site=str(row["icd_o_3_site"]),
                lymphatic_invasion=str(row["lymphatic_invasion"]),
                lymphnodes_examined=str(row["lymphnodes_examined"]),
                lymphovascular_invasion_present=str(row["lymphovascular_invasion_present"]),
                menopause_status=str(row["menopause_status"]),
                mononucleotide_and_dinucleotide_marker_panel_analysis_status=str(row["mononucleotide_and_dinucleotide_marker_panel_analysis_status"]),
                mononucleotide_marker_panel_analysis_status=str(row["mononucleotide_marker_panel_analysis_status"]),
                neoplasm_histologic_grade=str(row["neoplasm_histologic_grade"]),
                new_tumor_event_after_initial_treatment=str(row["new_tumor_event_after_initial_treatment"]),
                number_of_lymphnodes_examined=None if "number_of_lymphnodes_examined" not in row or row['number_of_lymphnodes_examined'] is None else int(row["number_of_lymphnodes_examined"]),
                number_of_lymphnodes_positive_by_he=None if "number_of_lymphnodes_positive_by_he" not in row or row['number_of_lymphnodes_positive_by_he'] is None else int(row["number_of_lymphnodes_positive_by_he"]),
                ParticipantBarcode=str(row["ParticipantBarcode"]),
                pathologic_M=str(row["pathologic_M"]),
                pathologic_N=str(row["pathologic_N"]),
                pathologic_stage=str(row["pathologic_stage"]),
                pathologic_T=str(row["pathologic_T"]),
                person_neoplasm_cancer_status=str(row["person_neoplasm_cancer_status"]),
                pregnancies=str(row["pregnancies"]),
                primary_neoplasm_melanoma_dx=str(row["primary_neoplasm_melanoma_dx"]),
                primary_therapy_outcome_success=str(row["primary_therapy_outcome_success"]),
                prior_dx=str(row["prior_dx"]),
                Project=str(row["Project"]),
                psa_value=None if "psa_value" not in row or row["psa_value"] is None else float(row["psa_value"]),
                race=str(row["race"]),
                residual_tumor=str(row["residual_tumor"]),
                tobacco_smoking_history=str(row["tobacco_smoking_history"]),
                tumor_tissue_site=str(row["tumor_tissue_site"]),
                tumor_type=str(row["tumor_type"]),
                weiss_venous_invasion=str(row["weiss_venous_invasion"]),
                vital_status=str(row["vital_status"]),
                weight=None if "weight" not in row or row["weight"] is None else int(float(row["weight"])),
                year_of_initial_pathologic_diagnosis=str(row["year_of_initial_pathologic_diagnosis"])
            )

            sample_cursor = db.cursor(MySQLdb.cursors.DictCursor)
            sample_cursor.execute(sample_query_str, query_tuple)
            sample_data = []
            for row in sample_cursor.fetchall():
                sample_data.append(row['SampleBarcode'])

            aliquot_cursor = db.cursor(MySQLdb.cursors.DictCursor)
            aliquot_cursor.execute(aliquot_query_str, query_tuple)
            aliquot_data = []
            for row in aliquot_cursor.fetchall():
                aliquot_data.append(row['AliquotBarcode'])

            return PatientDetails(clinical_data=item, samples=sample_data, aliquots=aliquot_data)
        except (IndexError, TypeError), e:
            raise endpoints.NotFoundException("Patient {} not found.".format(patient_barcode))
        finally:
            if clinical_cursor: clinical_cursor.close()
            if sample_cursor: sample_cursor.close()
            if aliquot_cursor: aliquot_cursor.close()
            if db and db.open: db.close()


    GET_RESOURCE = endpoints.ResourceContainer(sample_barcode=messages.StringField(1, required=True),
                                               platform=messages.StringField(2),
                                               pipeline=messages.StringField(3))
    @endpoints.method(GET_RESOURCE, SampleDetails,
                      path='sample_details', http_method='GET', name='cohorts.sample_details')
    def sample_details(self, request):
        """
        Returns information about a particular sample.
        :param sample_barcode: Required.
        :param platform: Optional. Filter results by a particular platform.
        :param pipeline: Optional. Filter results by a particular pipeline.
        :return: Biospecimen data about the sample, a list of aliquots associated with the sample barcode,
        and a list of details about each aliquot.
        """

        biospecimen_cursor = None
        aliquot_cursor = None
        patient_cursor = None
        data_cursor = None
        db = None

        sample_barcode = request.__getattribute__('sample_barcode')
        biospecimen_query_str = 'select * ' \
                                'from metadata_biospecimen ' \
                                'where SampleBarcode=%s'

        query_tuple = (str(sample_barcode),)
        extra_query_tuple = query_tuple

        aliquot_query_str = 'select AliquotBarcode ' \
                            'from metadata_data ' \
                            'where SampleBarcode=%s '



        patient_query_str = 'select ParticipantBarcode ' \
                            'from metadata_biospecimen ' \
                            'where SampleBarcode=%s '


        data_query_str = 'select ' \
                         'SampleBarcode, ' \
                         'DataCenterName, ' \
                         'DataCenterType, ' \
                         'DataFileName, ' \
                         'DataFileNameKey, ' \
                         'DatafileUploaded, ' \
                         'DataLevel,' \
                         'Datatype,' \
                         'GenomeReference,' \
                         'Pipeline,' \
                         'Platform,' \
                         'platform_full_name,' \
                         'Project,' \
                         'Repository,' \
                         'SDRFFileName,' \
                         'SecurityProtocol ' \
                         'from metadata_data ' \
                         'where SampleBarcode=%s'

        if request.__getattribute__('platform') is not None:
            platform = request.__getattribute__('platform')
            aliquot_query_str += ' and platform=%s '
            data_query_str += ' and platform=%s '
            extra_query_tuple += (str(platform),)

        if request.__getattribute__('pipeline') is not None:
            pipeline = request.__getattribute__('pipeline')
            aliquot_query_str += ' and pipeline=%s '
            data_query_str += ' and pipeline=%s '
            extra_query_tuple += (str(pipeline),)

        aliquot_query_str += ' group by AliquotBarcode'
        patient_query_str += ' group by ParticipantBarcode'

        try:
            db = sql_connection()
            biospecimen_cursor = db.cursor(MySQLdb.cursors.DictCursor)
            biospecimen_cursor.execute(biospecimen_query_str, query_tuple)
            row = biospecimen_cursor.fetchone()
            if row is None:
                biospecimen_cursor.close()
                db.close()
                error_message = "Sample barcode {} not found in metadata_biospecimen table.".format(sample_barcode)
                return SampleDetails(biospecimen_data=None, aliquots=[], patient=None, data_details=[],
                                     data_details_count=None, error=error_message)
            item = MetadataItem(
                avg_percent_lymphocyte_infiltration=None if "avg_percent_lymphocyte_infiltration" not in row or row["avg_percent_lymphocyte_infiltration"] is None else float(row["avg_percent_lymphocyte_infiltration"]),
                avg_percent_monocyte_infiltration=None if "avg_percent_monocyte_infiltration" not in row or row["avg_percent_monocyte_infiltration"] is None else float(row["avg_percent_monocyte_infiltration"]),
                avg_percent_necrosis=None if "avg_percent_necrosis" not in row or row["avg_percent_necrosis"] is None else float(row["avg_percent_necrosis"]),
                avg_percent_neutrophil_infiltration=None if "avg_percent_neutrophil_infiltration" not in row or row["avg_percent_neutrophil_infiltration"] is None else float(row["avg_percent_neutrophil_infiltration"]),
                avg_percent_normal_cells=None if "avg_percent_normal_cells" not in row or row["avg_percent_normal_cells"] is None else float(row["avg_percent_normal_cells"]),
                avg_percent_stromal_cells=None if "avg_percent_stromal_cells" not in row or row["avg_percent_stromal_cells"] is None else float(row["avg_percent_stromal_cells"]),
                avg_percent_tumor_cells=None if "avg_percent_tumor_cells" not in row or row["avg_percent_tumor_cells"] is None else float(row["avg_percent_tumor_cells"]),
                avg_percent_tumor_nuclei=None if "avg_percent_tumor_nuclei" not in row or row["avg_percent_tumor_nuclei"] is None else float(row["avg_percent_tumor_nuclei"]),
                batch_number=None if "batch_number" not in row or row["batch_number"] is None else int(row["batch_number"]),
                bcr=str(row["bcr"]),
                days_to_collection=None if "days_to_collection" not in row or row['days_to_collection'] is None else int(row["days_to_collection"]),
                max_percent_lymphocyte_infiltration=None if "max_percent_lymphocyte_infiltration" not in row or row["max_percent_lymphocyte_infiltration"] is None else int(row["max_percent_lymphocyte_infiltration"]),  # 46)
                max_percent_monocyte_infiltration=None if "max_percent_monocyte_infiltration" not in row or row["max_percent_monocyte_infiltration"] is None else int(row["max_percent_monocyte_infiltration"]),  # 47)
                max_percent_necrosis=None if "max_percent_necrosis" not in row or row["max_percent_necrosis"] is None else int(row["max_percent_necrosis"]),  # 48)
                max_percent_neutrophil_infiltration=None if "max_percent_neutrophil_infiltration" not in row or row["max_percent_neutrophil_infiltration"] is None else int(row["max_percent_neutrophil_infiltration"]),  # 49)
                max_percent_normal_cells=None if "max_percent_normal_cells" not in row or row["max_percent_normal_cells"] is None else int(row["max_percent_normal_cells"]),  # 50)
                max_percent_stromal_cells=None if "max_percent_stromal_cells" not in row or row["max_percent_stromal_cells"] is None else int(row["max_percent_stromal_cells"]),  # 51)
                max_percent_tumor_cells=None if "max_percent_tumor_cells" not in row or row["max_percent_tumor_cells"] is None else int(row["max_percent_tumor_cells"]),  # 52)
                max_percent_tumor_nuclei=None if "max_percent_tumor_nuclei" not in row or row["max_percent_tumor_nuclei"] is None else int(row["max_percent_tumor_nuclei"]),  # 53)
                min_percent_lymphocyte_infiltration=None if "min_percent_lymphocyte_infiltration" not in row or row["min_percent_lymphocyte_infiltration"] is None else int(row["min_percent_lymphocyte_infiltration"]),  # 55)
                min_percent_monocyte_infiltration=None if "min_percent_monocyte_infiltration" not in row or row["min_percent_monocyte_infiltration"] is None else int(row["min_percent_monocyte_infiltration"]),  # 56)
                min_percent_necrosis=None if "min_percent_necrosis" not in row or row["min_percent_necrosis"] is None else int(row["min_percent_necrosis"]),  # 57)
                min_percent_neutrophil_infiltration=None if "min_percent_neutrophil_infiltration" not in row or row["min_percent_neutrophil_infiltration"] is None else int(row["min_percent_neutrophil_infiltration"]),  # 58)
                min_percent_normal_cells=None if "min_percent_normal_cells" not in row or row["min_percent_normal_cells"] is None else int(row["min_percent_normal_cells"]),  # 59)
                min_percent_stromal_cells=None if "min_percent_stromal_cells" not in row or row["min_percent_stromal_cells"] is None else int(row["min_percent_stromal_cells"]),  # 60)
                min_percent_tumor_cells=None if "min_percent_tumor_cells" not in row or row["min_percent_tumor_cells"] is None else int(row["min_percent_tumor_cells"]),  # 61)
                min_percent_tumor_nuclei=None if "min_percent_tumor_nuclei" not in row or row["min_percent_tumor_nuclei"] is None else int(row["min_percent_tumor_nuclei"]),  # 62)
                ParticipantBarcode=str(row["ParticipantBarcode"]),
                Project=str(row["Project"]),
                SampleBarcode=str(row["SampleBarcode"]),
                Study=str(row["Study"])
            )
            aliquot_cursor = db.cursor(MySQLdb.cursors.DictCursor)
            aliquot_cursor.execute(aliquot_query_str, extra_query_tuple)
            aliquot_data = []
            for row in aliquot_cursor.fetchall():
                aliquot_data.append(row['AliquotBarcode'])

            patient_cursor = db.cursor(MySQLdb.cursors.DictCursor)
            patient_cursor.execute(patient_query_str, query_tuple)
            row = patient_cursor.fetchone()
            if row is None:
                aliquot_cursor.close()
                patient_cursor.close()
                biospecimen_cursor.close()
                db.close()
                error_message = "Sample barcode {} not found in metadata_biospecimen table.".format(sample_barcode)
                return SampleDetails(biospecimen_data=None, aliquots=[], patient=None, data_details=[],
                                     data_details_count=None, error=error_message)
            patient_barcode = str(row["ParticipantBarcode"])

            data_cursor = db.cursor(MySQLdb.cursors.DictCursor)
            data_cursor.execute(data_query_str, extra_query_tuple)
            data_data = []
            for row in data_cursor.fetchall():
                data_item = DataDetails(
                    SampleBarcode=str(row['SampleBarcode']),
                    DataCenterName=str(row['DataCenterName']),
                    DataCenterType=str(row['DataCenterType']),
                    DataFileName=str(row['DataFileName']),
                    DataFileNameKey=str(row['DataFileNameKey']),
                    DatafileUploaded=str(row['DatafileUploaded']),
                    DataLevel=str(row['DataLevel']),
                    Datatype=str(row['Datatype']),
                    GenomeReference=str(row['GenomeReference']),
                    Pipeline=str(row['Pipeline']),
                    Platform=str(row['Platform']),
                    platform_full_name=str(row['platform_full_name']),
                    Project=str(row['Project']),
                    Repository=str(row['Repository']),
                    SDRFFileName=str(row['SDRFFileName']),
                    SecurityProtocol=str(row['SecurityProtocol'])
                )
                data_data.append(data_item)

            return SampleDetails(biospecimen_data=item, aliquots=aliquot_data,
                                 patient=patient_barcode, data_details=data_data,
                                 data_details_count=len(data_data))

        except (IndexError, TypeError) as e:
            logger.warn(e)
            raise endpoints.NotFoundException("Sample details for barcode {} not found".format(sample_barcode))
        finally:
            if biospecimen_cursor: biospecimen_cursor.close()
            if aliquot_cursor: aliquot_cursor.close()
            if patient_cursor: patient_cursor.close()
            if data_cursor: data_cursor.close()
            if db and db.open: db.close()



    GET_RESOURCE = endpoints.ResourceContainer(cohort_id=messages.IntegerField(1, required=True),
                                               platform=messages.StringField(2),
                                               pipeline=messages.StringField(3),
                                               token=messages.StringField(4))
    @endpoints.method(GET_RESOURCE, DataFileNameKeyList,
                      path='datafilenamekey_list_from_cohort', http_method='GET', name='cohorts.datafilenamekey_list_from_cohort')
    def datafilenamekey_list_from_cohort(self, request):
        """
        Returns a list of cloud storage paths for files associated with
        all the samples in a specified cohort.
        :param cohort_id: Required.
        :param platform: Optional. Filter results by platform.
        :param pipeline: Optional. Filter results by pipeline.
        :param token: Optional. Access token with email scope to verify user's google identity.
        :return: List of cloud storage file paths. If the user is dbGaP authorized, controlled-access file paths
        will appear in the list.
        """
        user_email = None
        cursor = None
        db = None
        dbGaP_authorized = False
        cohort_id = None

        platform = request.__getattribute__('platform')
        pipeline = request.__getattribute__('pipeline')
        cohort_id = request.__getattribute__('cohort_id')

        if endpoints.get_current_user() is not None:
            user_email = endpoints.get_current_user().email()

        # users have the option of pasting the access token in the query string
        # or in the 'token' field in the api explorer
        # but this is not required
        access_token = request.__getattribute__('token')
        if access_token:
            user_email = get_user_email_from_token(access_token)

        if user_email:
            dbGaP_authorized = is_dbgap_authorized(user_email)

            query_str = 'SELECT DataFileNameKey, SecurityProtocol, Repository ' \
                        'FROM metadata_data '

            try:
                user_id = Django_User.objects.get(email=user_email).id
                django_cohort = Django_Cohort.objects.get(id=cohort_id)
                cohort_perm = Cohort_Perms.objects.get(cohort_id=cohort_id, user_id=user_id)
            except (ObjectDoesNotExist, MultipleObjectsReturned), e:
                logger.warn(e)
                err_msg = "Error retrieving cohort {} for user {}: {}".format(cohort_id, user_email, e)
                if 'Cohort_Perms' in e.message:
                    err_msg = "User {} does not have permissions on cohort {}. Error: {}"\
                        .format(user_email, cohort_id, e)
                raise endpoints.UnauthorizedException(err_msg)

            query_str += 'JOIN cohorts_samples ON metadata_data.SampleBarcode=cohorts_samples.sample_id ' \
                         'WHERE cohorts_samples.cohort_id=%s '
            query_tuple = (cohort_id,)

            if platform:
                query_str += ' and metadata_data.Platform=%s '
                query_tuple += (platform,)

            if pipeline:
                query_str += ' and metadata_data.Pipeline=%s '
                query_tuple += (pipeline,)

            query_str += ' GROUP BY DataFileNameKey'

            try:
                db = sql_connection()
                cursor = db.cursor(MySQLdb.cursors.DictCursor)
                cursor.execute(query_str, query_tuple)
                logger.info(query_str)
                logger.info(query_tuple)

                datafilenamekeys = []
                for row in cursor.fetchall():
                    file_path = row.get('DataFileNameKey') if len(row.get('DataFileNameKey', '')) else '/file-path-currently-unavailable'
                    if 'controlled' not in str(row['SecurityProtocol']).lower():
                        datafilenamekeys.append("gs://{}{}".format(settings.OPEN_DATA_BUCKET, file_path))
                    elif dbGaP_authorized:
                        bucket_name = ''
                        # hard-coding mock bucket names for now --testing purposes only
                        if row['Repository'].lower() == 'dcc':
                            bucket_name = 'gs://62f2c827-mock-mock-mock-1cde698a4f77'
                        elif row['Repository'].lower() == 'cghub':
                            bucket_name = 'gs://360ee3ad-mock-mock-mock-52f9a5e7f99a'
                        datafilenamekeys.append("{}{}".format(bucket_name, file_path))

                return DataFileNameKeyList(datafilenamekeys=datafilenamekeys, count=len(datafilenamekeys))

            except (IndexError, TypeError), e:
                logger.warn(e)
                raise endpoints.NotFoundException("File paths for cohort {} not found.".format(cohort_id))
            finally:
                if cursor: cursor.close()
                if db and db.open: db.close()

        else:
            raise endpoints.UnauthorizedException("Authentication failed.")


    GET_RESOURCE = endpoints.ResourceContainer(sample_barcode=messages.StringField(1, required=True),
                                               platform=messages.StringField(2),
                                               pipeline=messages.StringField(3),
                                               token=messages.StringField(4))
    @endpoints.method(GET_RESOURCE, DataFileNameKeyList,
                      path='datafilenamekey_list_from_sample', http_method='GET', name='cohorts.datafilenamekey_list_from_sample')
    def datafilenamekey_list_from_sample(self, request):
        """
        Returns a list of cloud storage paths for files associated with either a sample barcode.
        :param sample_barcode: Required.
        :param cohort_id: Required if sample_barcode is absent, else optional.
        :param platform: Optional. Filter results by platform.
        :param pipeline: Optional. Filter results by pipeline.
        :param token: Optional. Access token with email scope to verify user's google identity.
        :return: List of cloud storage file paths. If the user is dbGaP authorized, controlled-access file paths
        will appear in the list.
        """
        user_email = None
        cursor = None
        db = None
        dbGaP_authorized = False

        sample_barcode = request.__getattribute__('sample_barcode')
        platform = request.__getattribute__('platform')
        pipeline = request.__getattribute__('pipeline')

        if endpoints.get_current_user() is not None:
            user_email = endpoints.get_current_user().email()

        # users have the option of pasting the access token in the query string
        # or in the 'token' field in the api explorer
        # but this is not required
        access_token = request.__getattribute__('token')
        if access_token:
            user_email = get_user_email_from_token(access_token)

        if user_email:
            dbGaP_authorized = is_dbgap_authorized(user_email)

            query_str = 'SELECT DataFileNameKey, SecurityProtocol, Repository ' \
                        'FROM metadata_data WHERE SampleBarcode=%s '

            query_tuple = (sample_barcode,)

            if platform:
                query_str += ' and Platform=%s '
                query_tuple += (platform,)

            if pipeline:
                query_str += ' and Pipeline=%s '
                query_tuple += (pipeline,)

            query_str += ' GROUP BY DataFileNameKey'

            try:
                db = sql_connection()
                cursor = db.cursor(MySQLdb.cursors.DictCursor)
                cursor.execute(query_str, query_tuple)
                logger.info(query_str)
                logger.info(query_tuple)

                datafilenamekeys = []
                for row in cursor.fetchall():
                    file_path = row.get('DataFileNameKey') if len(row.get('DataFileNameKey', '')) else '/file-path-currently-unavailable'
                    if 'controlled' not in str(row['SecurityProtocol']).lower():
                        datafilenamekeys.append("gs://{}{}".format(settings.OPEN_DATA_BUCKET, file_path))
                    elif dbGaP_authorized:
                        bucket_name = ''
                        # hard-coding mock bucket names for now --testing purposes only
                        if row['Repository'].lower() == 'dcc':
                            bucket_name = 'gs://62f2c827-mock-mock-mock-1cde698a4f77'
                        elif row['Repository'].lower() == 'cghub':
                            bucket_name = 'gs://360ee3ad-mock-mock-mock-52f9a5e7f99a'
                        datafilenamekeys.append("{}{}".format(bucket_name, file_path))

                return DataFileNameKeyList(datafilenamekeys=datafilenamekeys, count=len(datafilenamekeys))

            except (IndexError, TypeError), e:
                logger.warn(e)
                raise endpoints.NotFoundException("File paths for sample {} not found.".format(sample_barcode))

            finally:
                if cursor: cursor.close()
                if db and db.open: db.close()

        else:
            raise endpoints.UnauthorizedException("Authentication failed.")



    POST_RESOURCE = endpoints.ResourceContainer(IncomingMetadataItem,
                                                name=messages.StringField(2, required=True),
                                                token=messages.StringField(3)
                                                )
    @endpoints.method(POST_RESOURCE, Cohort,
                      path='save_cohort', http_method='POST', name='cohort.save')
    def save_cohort(self, request):
        """
        Creates and saves a cohort. Takes a JSON object in the request body to use as the cohort's filters.
        :param name: Required. Name of cohort to be saved.
        :param token: Optional. Access token with email scope to verify user's google identity.
        :return: Information about the saved cohort, including the number of patients and the number
        of samples in that cohort.
        """
        user_email = None
        patient_cursor = None
        sample_cursor = None
        db = None

        if endpoints.get_current_user() is not None:
            user_email = endpoints.get_current_user().email()

        # users have the option of pasting the access token in the query string
        # or in the 'token' field in the api explorer
        # but this is not required
        access_token = request.__getattribute__('token')
        if access_token:
            user_email = get_user_email_from_token(access_token)

        if user_email:
            django.setup()
            try:
                django_user = Django_User.objects.get(email=user_email)
                user_id = django_user.id
            except (ObjectDoesNotExist, MultipleObjectsReturned), e:
                logger.warn(e)
                raise endpoints.NotFoundException("%s does not have an entry in the user database." % user_email)

            keys = [k for k in IncomingMetadataItem.__dict__.keys() if not k.startswith('_') and request.__getattribute__(k)]
            values = (request.__getattribute__(k) for k in keys)
            query_dict = dict(zip(keys, values))

            if not query_dict:
                raise endpoints.BadRequestException("You must specify at least one filter in the request body to save a cohort.")

            patient_query_str = 'SELECT DISTINCT(IF(ParticipantBarcode="", LEFT(SampleBarcode,12), ParticipantBarcode)) AS ParticipantBarcode ' \
                                'FROM metadata_samples '

            sample_query_str = 'SELECT SampleBarcode ' \
                               'FROM metadata_samples '

            value_tuple = ()
            if len(query_dict) > 0:
                where_clause = build_where_clause(query_dict)
                patient_query_str += ' WHERE ' + where_clause['query_str']
                sample_query_str += ' WHERE ' + where_clause['query_str']
                value_tuple = where_clause['value_tuple']

            # patient_query_str += ' GROUP BY ParticipantBarcode'
            sample_query_str += ' GROUP BY SampleBarcode'

            patient_barcodes = []
            sample_barcodes = []
            try:
                db = sql_connection()
                patient_cursor = db.cursor(MySQLdb.cursors.DictCursor)
                patient_cursor.execute(patient_query_str, value_tuple)
                for row in patient_cursor.fetchall():
                    patient_barcodes.append(row['ParticipantBarcode'])

                sample_cursor = db.cursor(MySQLdb.cursors.DictCursor)
                sample_cursor.execute(sample_query_str, value_tuple)
                for row in sample_cursor.fetchall():
                    sample_barcodes.append(row['SampleBarcode'])

            except (IndexError, TypeError), e:
                logger.warn(e)
                raise endpoints.NotFoundException("Error retrieving samples or patients")
            finally:
                if patient_cursor: patient_cursor.close()
                if sample_cursor: sample_cursor.close()
                if db and db.open: db.close()
                request_finished.send(self)

            cohort_name = request.__getattribute__('name')

            # 1. create new cohorts_cohort with name, active=True, last_date_saved=now
            created_cohort = Django_Cohort.objects.create(name=cohort_name, active=True, last_date_saved=datetime.utcnow())
            created_cohort.save()

            # 2. insert patients into cohort_patients
            patient_barcodes = list(set(patient_barcodes))
            patient_list = [Patients(cohort=created_cohort, patient_id=patient_code) for patient_code in patient_barcodes]
            Patients.objects.bulk_create(patient_list)

            # 3. insert samples into cohort_samples
            sample_barcodes = list(set(sample_barcodes))
            sample_list = [Samples(cohort=created_cohort, sample_id=sample_code) for sample_code in sample_barcodes]
            Samples.objects.bulk_create(sample_list)

            # 4. Set permission for user to be owner
            perm = Cohort_Perms(cohort=created_cohort, user=django_user, perm=Cohort_Perms.OWNER)
            perm.save()

            # 5. Create filters applied
            for key, val in query_dict.items():
                Filters.objects.create(resulting_cohort=created_cohort, name=key, value=val).save()

            # 6. Store cohort to BigQuery
            project_id = settings.BQ_PROJECT_ID
            cohort_settings = settings.GET_BQ_COHORT_SETTINGS()
            bcs = BigQueryCohortSupport(project_id, cohort_settings.dataset_id, cohort_settings.table_id)
            bcs.add_cohort_with_sample_barcodes(created_cohort.id, sample_barcodes)

            return Cohort(id=str(created_cohort.id),
                          name=cohort_name,
                          last_date_saved=str(datetime.utcnow()),
                          num_patients=str(len(patient_barcodes)),
                          num_samples=str(len(sample_barcodes))
                          )

        else:
            raise endpoints.UnauthorizedException("Authentication failed.")


    DELETE_RESOURCE = endpoints.ResourceContainer(cohort_id=messages.IntegerField(1, required=True),
                                                  token=messages.StringField(2)
                                                  )
    @endpoints.method(DELETE_RESOURCE, ReturnJSON,
                      path='delete_cohort', http_method='POST', name='cohort.delete')
    def delete_cohort(self, request):
        """
        Deletes a cohort. User must have owner permissions on the cohort.
        :param cohort_id: Required. Id of cohort to delete.
        :param token: Optional. Access token with email scope to verify user's google identity.
        :return: Message indicating whether the cohort was deleted or not.
        """
        user_email = None
        return_message = None

        if endpoints.get_current_user() is not None:
            user_email = endpoints.get_current_user().email()

        # users have the option of pasting the access token in the query string
        # or in the 'token' field in the api explorer
        # but this is not required
        access_token = request.__getattribute__('token')
        if access_token:
            user_email = get_user_email_from_token(access_token)

        cohort_id = request.__getattribute__('cohort_id')

        if user_email:
            django.setup()
            try:
                django_user = Django_User.objects.get(email=user_email)
                user_id = django_user.id
            except (ObjectDoesNotExist, MultipleObjectsReturned), e:
                logger.warn(e)
                request_finished.send(self)
                raise endpoints.NotFoundException("%s does not have an entry in the user database." % user_email)
            try:
                cohort_to_deactivate = Django_Cohort.objects.get(id=cohort_id)
                if cohort_to_deactivate.active is True:
                    cohort_perm = Cohort_Perms.objects.get(cohort_id=cohort_id, user_id=user_id)
                    if cohort_perm.perm == 'OWNER':
                        cohort_to_deactivate.active = False
                        cohort_to_deactivate.save()
                        return_message = 'Cohort %d successfully deactivated.' % cohort_id
                    else:
                        return_message = 'You do not have owner permission on cohort %d.' % cohort_id
                else:
                    return_message = "Cohort %d was already deactivated." % cohort_id
                request_finished.send(self)
            except (ObjectDoesNotExist, MultipleObjectsReturned), e:
                logger.warn(e)
                request_finished.send(self)
                raise endpoints.NotFoundException(
                    "Either cohort %d does not have an entry in the database "
                    "or you do not have owner or reader permissions on this cohort." % cohort_id)
        else:
            raise endpoints.UnauthorizedException("Unsuccessful authentication.")

        return ReturnJSON(msg=return_message)



    POST_RESOURCE = endpoints.ResourceContainer(IncomingMetadataItem)
    @endpoints.method(POST_RESOURCE, CohortPatientsSamplesList,
                      path='preview_cohort', http_method='POST', name='cohort.preview')
    def preview_cohort(self, request):
        """
        Previews a cohort. Takes a JSON object in the request body to use as the cohort's filters.
        :return: Information about the cohort, including the number of patients and the number
        of samples in that cohort.
        """
        patient_cursor = None
        sample_cursor = None
        db = None

        keys = [k for k in IncomingMetadataItem.__dict__.keys() if not k.startswith('_') and request.__getattribute__(k)]
        values = (request.__getattribute__(k) for k in keys)
        query_dict = dict(zip(keys, values))

        if not query_dict:
            sorted_keys = sorted(k for k in IncomingMetadataItem.__dict__.keys() if not k.startswith('_'))
            raise endpoints.BadRequestException(
                "You must specify at least one filter to preview a cohort. "
                "Possible filters are: {}".format(sorted_keys))

        patient_query_str = 'SELECT DISTINCT(IF(ParticipantBarcode="", LEFT(SampleBarcode,12), ParticipantBarcode)) ' \
                            'AS ParticipantBarcode ' \
                            'FROM metadata_samples '

        sample_query_str = 'SELECT SampleBarcode ' \
                           'FROM metadata_samples '

        value_tuple = ()
        if len(query_dict) > 0:
            where_clause = build_where_clause(query_dict)
            patient_query_str += ' WHERE ' + where_clause['query_str']
            sample_query_str += ' WHERE ' + where_clause['query_str']
            value_tuple = where_clause['value_tuple']

        sample_query_str += ' GROUP BY SampleBarcode'

        patient_barcodes = []
        sample_barcodes = []
        try:
            db = sql_connection()
            patient_cursor = db.cursor(MySQLdb.cursors.DictCursor)
            patient_cursor.execute(patient_query_str, value_tuple)
            for row in patient_cursor.fetchall():
                patient_barcodes.append(row['ParticipantBarcode'])

            sample_cursor = db.cursor(MySQLdb.cursors.DictCursor)
            sample_cursor.execute(sample_query_str, value_tuple)
            for row in sample_cursor.fetchall():
                sample_barcodes.append(row['SampleBarcode'])

        except (IndexError, TypeError), e:
            logger.warn(e)
            raise endpoints.NotFoundException("Error retrieving samples or patients: {}".format(e))
        finally:
            if patient_cursor: patient_cursor.close()
            if sample_cursor: sample_cursor.close()
            if db and db.open: db.close()

        return CohortPatientsSamplesList(patients=patient_barcodes,
                                         patient_count=len(patient_barcodes),
                                         samples=sample_barcodes,
                                         sample_count=len(sample_barcodes))