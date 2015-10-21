import json
import uuid
import time

from googleapiclient.errors import HttpError
from protorpc import messages
from protorpc import remote
import endpoints
from endpoints import NotFoundException

from Feature_Matrix import FMItem
from api_helpers import *
import bq_data_access.methylation_data as meth
import bq_data_access.copynumber_data as cnvr
import bq_data_access.protein_data as rppa
import bq_data_access.mirna_data as mirn
import bq_data_access.maf_data as maf


class MAFRecord(messages.Message):
    hugo_symbol = messages.StringField(1)
    amino_acid_position = messages.IntegerField(2)
    tumor_type = messages.StringField(3)
    uniprot_id = messages.StringField(4)
    variant_classification = messages.StringField(5)
    c_position = messages.StringField(6)
    tumor_sample_barcode = messages.StringField(7)
    match_norm_seq_allele2 = messages.StringField(8)
    tumor_seq_allele1 = messages.StringField(9)
    tumor_seq_allele2 = messages.StringField(10)
    match_norm_seq_allele1 = messages.StringField(11)
    reference_allele = messages.StringField(12)
    variant_type = messages.StringField(13)
    ucsc_cons = messages.StringField(14)


class MAFRecordList(messages.Message):
    items = messages.MessageField(MAFRecord, 1, repeated=True)
    total_rows = messages.IntegerField(2)


class MAFHugoSymbol(messages.Message):
    hugo_symbol = messages.StringField(1)


class MAFHugoSymbolList(messages.Message):
    items = messages.MessageField(MAFHugoSymbol, 1, repeated=True)


class InterproMatchLocation(messages.Message):
    # TODO this should likely be a float
    score = messages.IntegerField(1, variant=messages.Variant.INT32)
    start = messages.IntegerField(2, variant=messages.Variant.INT32)
    end = messages.IntegerField(3, variant=messages.Variant.INT32)


class InterproMatch(messages.Message):
    status = messages.StringField(1)
    name = messages.StringField(2)
    evd = messages.StringField(3)
    locations = messages.MessageField(InterproMatchLocation, 4, repeated=True)
    dbname = messages.StringField(5)
    id = messages.StringField(6)


class InterproJson(messages.Message):
    matches = messages.MessageField(InterproMatch, 1, repeated=True)
    uniprot_id = messages.StringField(2)
    length = messages.IntegerField(3, variant=messages.Variant.INT32)
    name = messages.StringField(4)


class InterproItem(messages.Message):
    uniprot_id = messages.StringField(1)
    interpro_json = messages.MessageField(InterproJson, 2, repeated=False)


class InterproItemList(messages.Message):
    items = messages.MessageField(InterproItem, 1, repeated=True)
    total_rows = messages.IntegerField(2)


class GENECODERecord(messages.Message):
    seqname = messages.StringField(1)
    source = messages.StringField(2)
    feature = messages.StringField(3)
    start = messages.IntegerField(4)
    end = messages.IntegerField(5)
    strand = messages.StringField(6)
    frame = messages.StringField(7)
    gene_id = messages.StringField(8)
    transcript_id = messages.StringField(9)
    gene_type = messages.StringField(10)
    gene_status = messages.StringField(11)
    gene_name = messages.StringField(12)
    transcript_type = messages.StringField(13)
    transcript_status = messages.StringField(14)
    transcript_name = messages.StringField(15)
    exon_number = messages.IntegerField(16)
    exon_id = messages.StringField(17)
    level = messages.StringField(18)
    tag = messages.StringField(19)
    ccdsid = messages.StringField(20)
    havana_gene = messages.StringField(21)
    havana_transcript = messages.StringField(22)
    protein_id = messages.StringField(23)
    transcript_support_level = messages.StringField(24)


class GENECODERecordList(messages.Message):
    items = messages.MessageField(GENECODERecord, 1, repeated=True)
    count = messages.IntegerField(2)


class GENECODECheckResponse(messages.Message):
    gene = messages.StringField(1)
    has_gene = messages.BooleanField(2)


class GENECODECheckResponseList(messages.Message):
    items = messages.MessageField(GENECODECheckResponse, 1, repeated=True)


class HumanMethylation(messages.Message):
    sample_id = messages.StringField(1)
    aliquot_id = messages.StringField(2)
    tumor_type = messages.StringField(3)
    probe_id = messages.StringField(4)
    beta_value = messages.FloatField(5)
    platform = messages.StringField(6)


class HumanMethylationList(messages.Message):
    items = messages.MessageField(HumanMethylation, 1, repeated=True)
    count = messages.IntegerField(2)
    pageToken = messages.StringField(3)
    jobId = messages.StringField(4)


class Methylation450Annotation(messages.Message):
    AddressA_ID = messages.IntegerField(1)
    AddressB_ID = messages.IntegerField(2)
    AlleleA_ProbeSeq = messages.StringField(3)
    AlleleB_ProbeSeq = messages.StringField(4)
    CHR = messages.StringField(5)
    Chromosome_36 = messages.StringField(6)
    Color_Channel = messages.StringField(7)
    Coordinate_36 = messages.StringField(8)
    DHS = messages.StringField(9)
    DMR = messages.StringField(10)
    Enhancer = messages.StringField(11)
    Forward_Sequence = messages.StringField(12)
    Genome_Build = messages.IntegerField(13)
    HMM_Island = messages.StringField(14)
    IlmnID = messages.StringField(15)
    Infinium_Design_Type = messages.StringField(16)
    MAPINFO = messages.StringField(17)
    Methyl27_Loci = messages.StringField(18)
    Name = messages.StringField(19)
    Next_Base = messages.StringField(20)
    Phantom = messages.StringField(21)
    Probe_SNPs = messages.StringField(22)
    Probe_SNPs_10 = messages.StringField(23)
    Random_Loci = messages.StringField(24)
    Regulatory_Feature_Group = messages.StringField(25)
    Regulatory_Feature_Name = messages.StringField(26)
    Relation_to_UCSC_CpG_Island = messages.StringField(27)
    SourceSeq = messages.StringField(28)
    Strand = messages.StringField(29)
    UCSC_CpG_Islands_Name = messages.StringField(30)
    RefGene_Group = messages.StringField(31)
    RefGene_Accession = messages.StringField(32)
    RefGene_Name = messages.StringField(33)


class Methylation450AnnotationList(messages.Message):
    items = messages.MessageField(Methylation450Annotation, 1, repeated=True)
    count = messages.IntegerField(2)
    pageToken = messages.StringField(3)
    jobId = messages.StringField(4)


class miRNAIsoformItem(messages.Message):
    ParticipantBarcode = messages.StringField(1)
    SampleBarcode = messages.StringField(2)
    AliquotBarcode = messages.StringField(3)
    Disease_Code = messages.StringField(4)
    SampleTypeLetterCode = messages.StringField(5)
    Platform = messages.StringField(6)  # HiSeq vs GA
    cross_mapped = messages.StringField(7)
    isoform_coords = messages.StringField(8)  # only with isoform type
    miRNA_ID = messages.StringField(9)
    miRNA_accession = messages.StringField(10)  # only with isoform type
    miRNA_transcript = messages.StringField(11)  # only with isoform type
    read_count = messages.IntegerField(12)
    reads_per_million_miRNA_mapped = messages.FloatField(13)


class miRNAIsoformItemList(messages.Message):
    items = messages.MessageField(miRNAIsoformItem, 1, repeated=True)
    count = messages.IntegerField(2)
    pageToken = messages.StringField(3)
    jobId = messages.StringField(4)


class miRNAItem(messages.Message):
    ParticipantBarcode = messages.StringField(1)
    SampleBarcode = messages.StringField(2)
    AliquotBarcode = messages.StringField(3)
    Disease_Code = messages.StringField(4)
    SampleTypeLetterCode = messages.StringField(5)
    Platform = messages.StringField(6)  # HiSeq vs GA
    cross_mapped = messages.StringField(7)
    miRNA_ID = messages.StringField(8)
    read_count = messages.IntegerField(9)
    reads_per_million_miRNA_mapped = messages.FloatField(10)


class miRNAItemList(messages.Message):
    items = messages.MessageField(miRNAItem, 1, repeated=True)
    count = messages.IntegerField(2)
    pageToken = messages.StringField(3)
    jobId = messages.StringField(4)


class CNVLevel3(messages.Message):
    aliquot_id = messages.StringField(1)
    chromosome = messages.StringField(2)
    start = messages.IntegerField(3)
    end = messages.IntegerField(4)
    num_probes = messages.IntegerField(5)
    segment_mean = messages.FloatField(6)


class CNVLevel3List(messages.Message):
    items = messages.MessageField(CNVLevel3, 1, repeated=True)
    count = messages.IntegerField(2)
    pageToken = messages.StringField(3)
    jobId = messages.StringField(4)

class Feature_defs_Creation(messages.Message):
    featureType = messages.StringField(1)
    name = messages.StringField(2)

class Feature_defs_Creation_List(messages.Message):
    items = messages.MessageField(Feature_defs_Creation, 1, repeated=True)
    count = messages.IntegerField(2)
    pageToken = messages.StringField(3)
    jobId = messages.StringField(4)

def sync_query(service, project_id, query, timeout=10000, num_retries=5, maxResults=None):
    query_data = {
        'query': query,
        'timeoutMs': timeout,
        'allowLargeResults': True,
        'maxResults': maxResults
    }
    return service.jobs().query(
        projectId=project_id,
        body=query_data).execute(num_retries=num_retries)

def process_feature_type(featureType):
    items = {}
    if featureType == 'MIRN':
        items['platform'], items['query_strs'] = mirn.build_feature_query()
        items['fieldnames'], items['build_table_stmt'] = mirn.build_feature_table_stmt()
        items['insert_features_stmt'] = mirn.insert_features_stmt()
    elif featureType == 'METH':
        items['query_strs'] = meth.build_feature_query()
        items['fieldnames'], items['build_table_stmt'] = meth.build_feature_table_stmt()
        items['insert_features_stmt'] = meth.insert_features_stmt()
    elif featureType == 'CNVR':
        items['query_strs'] = cnvr.build_feature_query()
        items['fieldnames'], items['build_table_stmt'] = cnvr.build_feature_table_stmt()
        items['insert_features_stmt'] = cnvr.insert_features_stmt()
    elif featureType == 'RPPA':
        items['query_strs'] = rppa.build_feature_query()
        items['fieldnames'], items['build_table_stmt'] = rppa.build_feature_table_stmt()
        items['insert_features_stmt'] = rppa.insert_features_stmt()
    elif featureType == 'GNAB':
        items['query_strs'] = maf.build_feature_query()
        items['fieldnames'], items['build_table_stmt'] = maf.build_feature_table_stmt()
        items['insert_features_stmt'] = maf.insert_features_stmt()
    else:
        raise endpoints.NotFoundException('You must specify a feature type: MIRN, METH, CNVR, RPPA, GNAB.')

    return items

def parse_responses(feature_type, row, platform):
    if feature_type == 'MIRN':
        num_value_fields, result = mirn.parse_response(row, platform)
    elif feature_type == 'METH':
        num_value_fields, result = meth.parse_response(row)
    elif feature_type == 'CNVR':
        num_value_fields, result = cnvr.parse_response(row)
    elif feature_type == 'RPPA':
        num_value_fields, result = rppa.parse_response(row)
    elif feature_type == 'GNAB':
        num_value_fields, result = maf.parse_response(row)
    else:
        raise endpoints.NotFoundException('This is the wrong feature type.')

    return num_value_fields, result

def check_table_exists(cursor, feature_type):
    print "Checking if table exists already"
    table_name = "feature_defs_" + str(feature_type).lower()
    check_sql_stmt = ("SHOW TABLES LIKE \'{table_name}\'").format(table_name=table_name)
    cursor.execute(check_sql_stmt)
    return cursor.fetchone()


def save_feature_defs_table(cursor, stmt, fieldnames, result):
    print "Saving results to feature defs table"
    print len(result)
    parsed_data = []
    for row in result:
        item = []
        for field in fieldnames:
            item.append(row[field])
        parsed_data.append(tuple(item))

    CHUNK_SIZE = 1000
    print "Number of results: " + str(len(parsed_data))
    for chunk in [parsed_data[i : i + CHUNK_SIZE] for i in range(0, len(parsed_data), CHUNK_SIZE)]:
        cursor.executemany(stmt, chunk)

#################################################################
# BEGINNING OF BIGQUERY ENDPOINTS
#################################################################

BQ_Endpoints = endpoints.api(name='bq_api', version='v1')

@BQ_Endpoints.api_class(resource_name='bq_endpoints')
class BQ_Endpoints_API(remote.Service):

    GET_RESOURCE = endpoints.ResourceContainer(Feature_defs_Creation,
                                               limit=messages.IntegerField(2), jobId=messages.StringField(3),
                                               pageToken=messages.StringField(4), maxResults=messages.IntegerField(5),
                                               featureType=messages.StringField(6))

    @endpoints.method(GET_RESOURCE, Feature_defs_Creation_List,
                      path='feature_defs_creation', name='bq.feature_defs_creation')
    def feature_defs_creation(self, request):
        service = authorize_credentials_with_Google()
        feature_type = None
        responses = []

        if request.__getattribute__('jobId') is not None and request.__getattribute__('pageToken') is not None:
            responses.append(service.jobs().getQueryResults(
                projectId=settings.BQ_PROJECT_ID,
                jobId=request.__getattribute__('jobId'),
                pageToken=request.__getattribute__('pageToken')
            ).execute(num_retries=5))
        else:
            maxResults = request.__getattribute__('maxResults')
            query_dict = {}
            for key, value in Feature_defs_Creation.__dict__.items():
                if not key.startswith('_'):
                    if request.__getattribute__(key) is not None:
                        query_dict[key] = request.__getattribute__(key)
            if 'featureType' not in query_dict:
                raise endpoints.NotFoundException('You must specify a feature type: MIRN, METH, CNVR, RPPA, GNAB.')

            items = process_feature_type(query_dict['featureType'])

            for query_str in items['query_strs']:
                feature_type = query_dict['featureType']

                if request.__getattribute__('limit') is not None:
                    query_str += ' LIMIT ' + str(request.__getattribute__('limit'))

                responses.append(sync_query(service, settings.BQ_PROJECT_ID, query_str, maxResults=maxResults))

        response_list = []
        results = []
        count = 0
        table = 0
        num_value_fields = 1

        try:
            db = sql_connection()
            cursor = db.cursor()

            if check_table_exists(cursor, feature_type) is None:
                print "Creating table for " + str(feature_type)
                cursor.execute(items['build_table_stmt'])
            else:
                print "Table already exits for " + str(feature_type)

            for response in responses:

                while not (response['jobComplete']):
                    print 'waiting 10s ...'
                    time.sleep(10)

                if response['jobComplete']:
                    count += int(response['totalRows'])
                    print "Number of rows in BQ response: " + str(response['totalRows'])

                while (len(results) / num_value_fields) < count:
                    if 'rows' in response:
                        for row in response['rows']:
                            row = row['f']

                            # Save to response list
                            response_list.append(Feature_defs_Creation(
                                featureType=str(feature_type),
                                name=str(row[0]['v'])
                            ))

                            # Parse response row for table insertion
                            if items['platform'] is not None:
                                num_value_fields, result = parse_responses(feature_type, row, items['platform'][table])
                                for entry in result:
                                    results.append(entry)

                    if 'pageToken' in response:
                        page_token = response['pageToken']
                        job_id = response['jobReference']['jobId']
                        response = service.jobs().getQueryResults(
                                        projectId=settings.BQ_PROJECT_ID,
                                        jobId=job_id,
                                        pageToken=page_token).execute(num_retries=5)
                page_token = None
                job_id = None
                if 'pageToken' in response:
                    page_token = response['pageToken']
                    job_id = response['jobReference']['jobId']
                table += 1

            print "Writing results for " + str(feature_type)
            save_feature_defs_table(cursor, items['insert_features_stmt'], items['fieldnames'], results)
            db.commit()
            print("Finished writing results to feature defs table")

        except Exception as e:
            raise NotFoundException('feature_defs_creation API error')

        return Feature_defs_Creation_List(items=response_list, count=count, pageToken=page_token, jobId=job_id)

    GET_RESOURCE = endpoints.ResourceContainer(
        miRNAItem, limit=messages.IntegerField(2),
        jobId=messages.StringField(3), pageToken=messages.StringField(4),
        maxResults=messages.IntegerField(5)
    )
    @endpoints.method(GET_RESOURCE, miRNAItemList,
                      path='miRNA', name='bq.miRNA')
    def miRNA(self, request):

        service = authorize_credentials_with_Google()

        if request.__getattribute__('jobId') is not None and request.__getattribute__('pageToken') is not None:
            response = service.jobs().getQueryResults(
                projectId=settings.BQ_PROJECT_ID,
                jobId=request.__getattribute__('jobId'),
                pageToken=request.__getattribute__('pageToken')
            ).execute(num_retries=5)
        else:
            maxResults = request.__getattribute__('maxResults')
            query_dict = {}
            for key, value in miRNAItem.__dict__.items():
                if not key.startswith('_'):
                    if request.__getattribute__(key) is not None:
                        query_dict[key] = request.__getattribute__(key)

            query_str = "SELECT * FROM [tcga_data_open.miRNA_BCGSC_mirna]"

            if len(query_dict) > 0:
                where_clause = build_where_clause(query_dict)
                query_str += ' WHERE ' + where_clause['big_query_str']

            if request.__getattribute__('limit') is not None:
                query_str += ' LIMIT ' + str(request.__getattribute__('limit'))

            response = sync_query(service, settings.BQ_PROJECT_ID, query_str, maxResults=maxResults)

        response_list = []
        if 'rows' in response:
            for row in response['rows']:
                row = row['f']
                response_list.append(miRNAItem(
                    ParticipantBarcode=str(row[0]['v']),
                    SampleBarcode=str(row[1]['v']),
                    AliquotBarcode=str(row[2]['v']),
                    Disease_Code=str(row[3]['v']),
                    SampleTypeLetterCode=str(row[4]['v']),
                    Platform=str(row[5]['v']),
                    cross_mapped=str(row[6]['v']),
                    miRNA_ID=str(row[7]['v']),
                    read_count=None if not row[8]['v'] else int(row[8]['v']),
                    reads_per_million_miRNA_mapped=None if not row[9]['v'] else float(row[9]['v'])
                ))

        page_token = None
        job_id = None
        if 'pageToken' in response:
            page_token = response['pageToken']
            job_id = response['jobReference']['jobId']

        count = None if 'totalRows' not in response else int(response['totalRows'])

        return miRNAItemList(items=response_list, count=count, pageToken=page_token, jobId=job_id)

    GET_RESOURCE = endpoints.ResourceContainer(
        miRNAIsoformItem, limit=messages.IntegerField(2),
        jobId=messages.StringField(3), pageToken=messages.StringField(4),
        maxResults=messages.IntegerField(5)
    )
    @endpoints.method(GET_RESOURCE, miRNAIsoformItemList,
                      path='miRNA_isoform', name='bq.miRNA_isoform')
    def miRNA_isoform(self, request):

        service = authorize_credentials_with_Google()

        if request.__getattribute__('jobId') is not None and request.__getattribute__('pageToken') is not None:
            response = service.jobs().getQueryResults(
                projectId=settings.BQ_PROJECT_ID,
                jobId=request.__getattribute__('jobId'),
                pageToken=request.__getattribute__('pageToken')
            ).execute(num_retries=5)
        else:
            maxResults = request.__getattribute__('maxResults')
            query_dict = {}
            for key, value in miRNAIsoformItem.__dict__.items():
                if not key.startswith('_'):
                    if request.__getattribute__(key) is not None:
                        query_dict[key] = request.__getattribute__(key)

            query_str = "SELECT * FROM [tcga_data_open.miRNA_BCGSC_isoform]"

            if len(query_dict) > 0:
                where_clause = build_where_clause(query_dict)
                query_str += ' WHERE ' + where_clause['big_query_str']

            if request.__getattribute__('limit') is not None:
                query_str += ' LIMIT ' + str(request.__getattribute__('limit'))

            response = sync_query(service, settings.BQ_PROJECT_ID, query_str, maxResults=maxResults)

        response_list = []
        if 'rows' in response:
            for row in response['rows']:
                row = row['f']
                response_list.append(miRNAIsoformItem(
                    ParticipantBarcode=str(row[0]['v']),
                    SampleBarcode=str(row[1]['v']),
                    AliquotBarcode=str(row[2]['v']),
                    Disease_Code=str(row[3]['v']),
                    SampleTypeLetterCode=str(row[4]['v']),
                    Platform=str(row[5]['v']),
                    cross_mapped=str(row[6]['v']),
                    isoform_coords=str(row[7]['v']),
                    miRNA_ID=str(row[8]['v']),
                    miRNA_accession=str(row[9]['v']),
                    miRNA_transcript=str(row[10]['v']),
                    read_count=None if not row[11]['v'] else int(row[11]['v']),
                    reads_per_million_miRNA_mapped=None if not row[12]['v'] else float(row[12]['v'])
                ))

        page_token = None
        job_id = None
        if 'pageToken' in response:
            page_token = response['pageToken']
            job_id = response['jobReference']['jobId']

        count = None if 'totalRows' not in response else int(response['totalRows'])

        return miRNAIsoformItemList(items=response_list, count=count, pageToken=page_token, jobId=job_id)

    GET_RESOURCE = endpoints.ResourceContainer(
        CNVLevel3, limit=messages.IntegerField(2),
        jobId=messages.StringField(3), pageToken=messages.StringField(4),
        maxResults=messages.IntegerField(5)
    )
    @endpoints.method(GET_RESOURCE, CNVLevel3List,
                      path='cnv', name='bq.cnv')
    def cnv(self, request):

        service = authorize_credentials_with_Google()

        if request.__getattribute__('jobId') is not None and request.__getattribute__('pageToken') is not None:
            response = service.jobs().getQueryResults(
                projectId=settings.BQ_PROJECT_ID,
                jobId=request.__getattribute__('jobId'),
                pageToken=request.__getattribute__('pageToken')
            ).execute(num_retries=5)
        else:
            maxResults = request.__getattribute__('maxResults')
            query_dict = {}
            for key, value in CNVLevel3.__dict__.items():
                if not key.startswith('_'):
                    if request.__getattribute__(key) is not None:
                        query_dict[key] = request.__getattribute__(key)

            query_str = "SELECT * FROM [isb_cgc.TCGA_CNV_Level3]"

            if len(query_dict) > 0:
                where_clause = build_where_clause(query_dict)
                query_str += ' WHERE ' + where_clause['big_query_str']

            if request.__getattribute__('limit') is not None:
                query_str += ' LIMIT ' + str(request.__getattribute__('limit'))

            response = sync_query(service, settings.BQ_PROJECT_ID, query_str, maxResults=maxResults)

        response_list = []
        if 'rows' in response:
            for row in response['rows']:
                row = row['f']
                response_list.append(CNVLevel3(
                    aliquot_id=str(row[0]['v']),
                    chromosome=str(row[1]['v']),
                    start=None if not row[2]['v'] else int(row[2]['v']),
                    end=None if not row[3]['v'] else int(row[3]['v']),
                    num_probes=None if not row[4]['v'] else int(row[4]['v']),
                    segment_mean=None if not row[5]['v'] else float(row[5]['v'])
                ))

        page_token = None
        job_id = None
        if 'pageToken' in response:
            page_token = response['pageToken']
            job_id = response['jobReference']['jobId']

        count = None if not 'totalRows' in response else int(response['totalRows'])

        return CNVLevel3List(items=response_list, count=count, pageToken=page_token, jobId=job_id)




    GET_RESOURCE = endpoints.ResourceContainer(
        Methylation450Annotation, limit=messages.IntegerField(2),
        jobId=messages.StringField(3), pageToken=messages.StringField(4),
        maxResults=messages.IntegerField(5)
    )
    @endpoints.method(GET_RESOURCE, Methylation450AnnotationList,
                      path='meth_annotation450', name='bq.meth_annotation450')
    def methylation_annotation450(self, request):

        service = authorize_credentials_with_Google()

        if request.__getattribute__('jobId') is not None and request.__getattribute__('pageToken') is not None:
            response = service.jobs().getQueryResults(
                projectId=settings.BQ_PROJECT_ID,
                jobId=request.__getattribute__('jobId'),
                pageToken=request.__getattribute__('pageToken')
            ).execute(num_retries=5)
        else:
            maxResults = request.__getattribute__('maxResults')
            query_dict = {}
            for key, value in Methylation450Annotation.__dict__.items():
                if not key.startswith('_'):
                    if request.__getattribute__(key) is not None:
                        query_dict[key] = request.__getattribute__(key)

            query_str = "SELECT * FROM [isb_cgc.methylation_450K_annotation]"

            if len(query_dict) > 0:
                where_clause = build_where_clause(query_dict)
                query_str += ' WHERE ' + where_clause['big_query_str']

            if request.__getattribute__('limit') is not None:
                query_str += ' LIMIT ' + str(request.__getattribute__('limit'))

            response = sync_query(service, settings.BQ_PROJECT_ID, query_str, maxResults=maxResults)

        response_list = []
        if 'rows' in response:
            for row in response['rows']:
                row = row['f']
                response_list.append(Methylation450Annotation(
                    AddressA_ID=None if not row[0]['v'] else int(row[0]['v']),
                    AddressB_ID=None if not row[1]['v'] else int(row[1]['v']),
                    AlleleA_ProbeSeq=str(row[2]['v']),
                    AlleleB_ProbeSeq=str(row[3]['v']),
                    CHR=str(row[4]['v']),
                    Chromosome_36=str(row[5]['v']),
                    Color_Channel=str(row[6]['v']),
                    Coordinate_36=str(row[7]['v']),
                    DHS=str(row[8]['v']),
                    DMR=str(row[9]['v']),
                    Enhancer=str(row[10]['v']),
                    Forward_Sequence=str(row[11]['v']),
                    Genome_Build=None if not row[12]['v'] else int(row[12]['v']),
                    HMM_Island=str(row[13]['v']),
                    IlmnID=str(row[14]['v']),
                    Infinium_Design_Type=str(row[15]['v']),
                    MAPINFO=str(row[16]['v']),
                    Methyl27_Loci=str(row[17]['v']),
                    Name=str(row[18]['v']),
                    Next_Base=str(row[19]['v']),
                    Phantom=str(row[20]['v']),
                    Probe_SNPs=str(row[21]['v']),
                    Probe_SNPs_10=str(row[22]['v']),
                    Random_Loci=str(row[23]['v']),
                    Regulatory_Feature_Group=str(row[24]['v']),
                    Regulatory_Feature_Name=str(row[25]['v']),
                    Relation_to_UCSC_CpG_Island=str(row[26]['v']),
                    SourceSeq=str(row[27]['v']),
                    Strand=str(row[28]['v']),
                    UCSC_CpG_Islands_Name=str(row[29]['v']),
                    RefGene_Group=str(row[30]['v']),
                    RefGene_Accession=str(row[31]['v']),
                    RefGene_Name=str(row[32]['v'])
                ))

        page_token = None
        job_id = None
        if 'pageToken' in response:
            page_token = response['pageToken']
            job_id = response['jobReference']['jobId']

        return Methylation450AnnotationList(items=response_list, count=int(response['totalRows']), pageToken=page_token, jobId=job_id)


    GET_RESOURCE = endpoints.ResourceContainer(
        HumanMethylation, limit=messages.IntegerField(2),
        jobId=messages.StringField(3), pageToken=messages.StringField(4),
        maxResults=messages.IntegerField(5)
    )
    @endpoints.method(GET_RESOURCE, HumanMethylationList,
                      path='methylation', name='bq.methylation')
    def methylation(self, request):

        service = authorize_credentials_with_Google()

        if request.__getattribute__('jobId') is not None and request.__getattribute__('pageToken') is not None:
            response = service.jobs().getQueryResults(
                projectId=settings.BQ_PROJECT_ID,
                jobId=request.__getattribute__('jobId'),
                pageToken=request.__getattribute__('pageToken')
            ).execute(num_retries=5)
        else:
            maxResults = request.__getattribute__('maxResults')
            query_dict = {}
            for key, value in HumanMethylation.__dict__.items():
                if not key.startswith('_'):
                    if request.__getattribute__(key) is not None:
                        query_dict[key] = request.__getattribute__(key)

            if 'platform' not in query_dict:
                raise endpoints.NotFoundException('You must specify a platform: 450k or 27k.')

            if query_dict['platform'] == '450k':
                query_str = "SELECT * FROM [isb_cgc.HumanMethylation450]"
            elif query_dict['platform'] == '27k':
                query_str = "SELECT * FROM [isb_cgc.HumanMethylation27]"
            else:
                raise endpoints.NotFoundException('You must specify a platform: 450k or 27k.')

            if len(query_dict) > 1:
                where_clause = build_where_clause(query_dict)
                query_str += ' WHERE ' + where_clause['big_query_str']

            if request.__getattribute__('limit') is not None:
                query_str += ' LIMIT ' + str(request.__getattribute__('limit'))

            response = sync_query(service, settings.BQ_PROJECT_ID, query_str, maxResults=maxResults)

        response_list = []
        if 'rows' in response:
            for row in response['rows']:
                row = row['f']
                response_list.append(HumanMethylation(
                    sample_id=str(row[0]['v']),
                    aliquot_id=str(row[1]['v']),
                    tumor_type=str(row[2]['v']),
                    probe_id=str(row[3]['v']),
                    beta_value=None if not row[4]['v'] else float(row[4]['v']),
                    platform=str(query_dict['platform'])
                ))

        page_token = None
        job_id = None
        if 'pageToken' in response:
            page_token = response['pageToken']
            job_id = response['jobReference']['jobId']

        return HumanMethylationList(items=response_list, count=int(response['totalRows']), pageToken=page_token, jobId=job_id)


    GET_RESOURCE = endpoints.ResourceContainer(gene=messages.StringField(1))
    @endpoints.method(GET_RESOURCE, GENECODECheckResponseList, path='GENCODE_check', name='GENCODE.check')
    def GENCODE_check(self, request):

        gene_list = []
        if request.__getattribute__('gene') is None:
            raise endpoints.NotFoundException('Enter a gene.')
        else:
            gene_list = request.__getattribute__('gene').split(',')

        service = authorize_credentials_with_Google()

        response_list = []
        for gene in gene_list:
            query_str = "SELECT count(*) FROM [isb_cgc.GENCODE] where gene_name = '%s'" % gene
            response = sync_query(service, settings.BQ_PROJECT_ID, query_str)

            if 'rows' in response:
                if response['rows'][0]['f'][0]['v'] == '0':
                    response_list.append(GENECODECheckResponse(gene=gene, has_gene=False))
                else:
                    response_list.append(GENECODECheckResponse(gene=gene, has_gene=True))

        return GENECODECheckResponseList(items=response_list)

    GET_RESOURCE = endpoints.ResourceContainer(MAFHugoSymbol)
    @endpoints.method(GET_RESOURCE, MAFHugoSymbolList,
                      path='bq_maf_genes', http_method='GET', name='bq.maf_genes')
    def bq_maf_genes(self, request):
        service = authorize_credentials_with_Google()
        query_str = "select hugo_symbol from [isb_cgc.maf_test] group by hugo_symbol order by hugo_symbol;"
        response = sync_query(service, settings.BQ_PROJECT_ID, query_str)

        data = []
        if 'rows' in response:
            for row in response['rows']:
                row = row['f']
                data.append(MAFHugoSymbol(
                    hugo_symbol=str(row[0]['v'])
                ))
        return MAFHugoSymbolList(items=data)

    GET_RESOURCE = endpoints.ResourceContainer(MAFRecord, limit=messages.IntegerField(2))

    @endpoints.method(GET_RESOURCE, MAFRecordList,
                      path='bq_maf', http_method='GET', name='bq.maf')
    def bq_maf(self, request):
        service = authorize_credentials_with_Google()
        query_dict = {}
        limit = None

        if request.__getattribute__('limit') != None:
            limit = request.__getattribute__('limit')

        for key, value in MAFRecord.__dict__.items():
            if not key.startswith('_'):
                if request.__getattribute__(key) is not None:
                    query_dict[key] = request.__getattribute__(key)

        query_str = 'SELECT * FROM [isb_cgc.maf]'
        if len(query_dict) > 0:
            where_clause = build_where_clause(query_dict)
            query_str += ' WHERE ' + where_clause['big_query_str']

        if limit is not None:
            query_str += ' LIMIT %d' % limit

        response = sync_query(service, settings.BQ_PROJECT_ID, query_str)

        data = []
        total_rows = 0
        if 'rows' in response:
            for row in response['rows']:
                row = row['f']
                data.append(MAFRecord(
                    hugo_symbol=str(row[0]['v']),
                    amino_acid_position=int(row[1]['v']),
                    tumor_type=str(row[2]['v']),
                    uniprot_id=str(row[3]['v']),
                    variant_classification=str(row[4]['v']),
                    c_position=str(row[5]['v']),
                    tumor_sample_barcode=str(row[6]['v']),
                    match_norm_seq_allele2=str(row[7]['v']),
                    tumor_seq_allele1=str(row[8]['v']),
                    tumor_seq_allele2=str(row[9]['v']),
                    match_norm_seq_allele1=str(row[10]['v']),
                    reference_allele=str(row[11]['v']),
                    variant_type=str(row[12]['v']),
                    ucsc_cons=str(row[13]['v'])
                ))
            total_rows = int(response['totalRows'])

        return MAFRecordList(items=data, total_rows=total_rows)


    @endpoints.method(GET_RESOURCE, InterproItemList,
                      path='bq_interpro', http_method='GET', name='bq.interpro')
    def bq_interpro(self, request):
        service = authorize_credentials_with_Google()
        query_dict = {}
        if request.__getattribute__('uniprot_id') is not None:
            query_dict['uniprot_id'] = request.__getattribute__('uniprot_id')
        if request.__getattribute__('limit') is not None:
            query_dict['limit'] = request.__getattribute__('limit')

        test_query_str = 'SELECT * FROM [isb_cgc.interpro]'
        if len(query_dict) > 0:
            if 'uniprot_id' in query_dict:
                test_query_str += ' where uniprot_id'
                if len(query_dict['uniprot_id'].split(',')) > 1:
                    test_query_str += ' in('
                    for uniprot_id in query_dict['uniprot_id'].split(','):
                        test_query_str += '"' + uniprot_id + '", '
                    test_query_str += ')'
                else:
                    test_query_str += '="%s"' % query_dict['uniprot_id']
            if 'limit' in query_dict:
                test_query_str += ' limit ' + str(query_dict['limit'])
            try:
                response = sync_query(service, settings.BQ_PROJECT_ID, test_query_str)
            except HttpError:
                delete_table(service, settings.BQ_PROJECT_ID, 'test', 'deleteme')
                response = run(service, settings.BQ_PROJECT_ID, test_query_str, True, 10, 10)
        else:
            delete_table(service, settings.BQ_PROJECT_ID, 'test', 'deleteme')
            response = run(service, settings.BQ_PROJECT_ID, test_query_str, True, 10, 10)

        data = []
        if 'rows' in response:
            row = response['rows'][0]
            interpro_literal = row['f'][1]['v']
            interpro_literal = interpro_literal.replace('\'', '"')
            interpro_literal = json.loads(interpro_literal)
            match_data = []
            for match in interpro_literal['matches']:

                match_location_data = []
                for location in match['locations']:
                    match_location_data.append(InterproMatchLocation(
                        score=int(location['score']),
                        start=int(location['start']),
                        end=int(location['end'])
                    ))

                match_data.append(InterproMatch(
                    status=str(match['status']),
                    name=str(match['name']),
                    evd=str(match['evd']),
                    locations=match_location_data,
                    dbname=str(match['dbname']),
                    id=str(match['id']),
                ))
            interpro_json = InterproJson(
                matches=match_data,
                uniprot_id=str(interpro_literal['uniprot_id']),
                length=int(interpro_literal['length']),
                name=str(interpro_literal['name'])
            )
            data.append(InterproItem(
                uniprot_id=str(row['f'][0]['v']),
                interpro_json=interpro_json
            ))

            delete_table(service, settings.BQ_PROJECT_ID, 'test', 'deleteme')
            return InterproItemList(items=data, total_rows=int(response['totalRows']))
        else:
            return InterproItemList(items=data, total_rows=0)

    GET_RESOURCE = endpoints.ResourceContainer(
        FMItem,
        limit=messages.StringField(2),
        data_level=messages.StringField(3),
        data_type=messages.StringField(4),
        platform=messages.StringField(5),
        archive_name=messages.StringField(6)
        # search_id=messages.StringField(7)
    )

'''
query that returns sample_ids, RPKM, and normalized_counts for mRNA expression
#SELECT COUNT(DISTINCT(sample_id)) FROM (

SELECT

IF(a.sample_id IS NULL,b.sample_id,a.sample_id) AS sample_id,
#IF(a.aliquot_id IS NULL, b.aliquot_id, a.aliquot_id)AS aliquot_id,
#IF(a.HGNC_gene_symbol IS NULL, b.HGNC_gene_symbol , a.HGNC_gene_symbol) AS HGNC_gene_symbol,
a.RPKM AS RPKM,
b.normalized_count AS normalized_count
FROM
(
SELECT
sample_id,
aliquot_id,
HGNC_gene_symbol,
RPKM
FROM
[isb_cgc.mRNA_BCGSC_CA_IlluminaGA_RNASeq_RPKMGeneQuantification],
[isb_cgc.mRNA_BCGSC_CA_IlluminaHiSeq_RNASeq_RPKMGeneQuantification]
WHERE HGNC_gene_symbol=<gene_symbol>
) as a
OUTER JOIN EACH
(
SELECT
sample_id,
aliquot_id,
disease_type,
HGNC_gene_symbol,
normalized_count
FROM
[isb_cgc.mRNA_UNC_IlluminaGA_RNASeqV2_RSEMGeneNormalized],
[isb_cgc.mRNA_UNC_IlluminaHiSeq_RNASeqV2_RSEMGeneNormalized]
WHERE HGNC_gene_symbol=<gene_symbol>
) as b
ON a.aliquot_id=b.aliquot_id
WHERE <normalized_count or RPKM> BETWEEN <norm_min> AND <norm_max>
#)
'''


def async_query(service, project_id, query, batch=False, num_retries=5):
    job_data = {
        'jobReference': {
            'projectId': project_id,
            'job_id': str(uuid.uuid4())
        },
        'configuration': {
            'query': {
                'query': query,
                'priority': 'BATCH' if batch else 'INTERACTIVE',
                'allowLargeResults': True,  # need destinationTable for this
                'destinationTable': {
                    'projectId': project_id,
                    'datasetId': 'test',
                    'tableId': 'deleteme'
                }
            }
        }
    }
    return service.jobs().insert(
        projectId=project_id,
        body=job_data).execute(num_retries=num_retries)


def run(service, project_id, query_string, batch, num_retries, interval):
    query_job = async_query(service,
                            project_id,
                            query_string,
                            batch,
                            num_retries)

    poll_job(service,
             query_job['jobReference']['projectId'],
             query_job['jobReference']['jobId'],
             interval,
             num_retries)

    for page in paging(service.jobs().getQueryResults,
                       num_retries=num_retries,
                       **query_job['jobReference']):
        return page


def poll_job(service, projectId, jobId, interval=5, num_retries=5):

    job_get = service.jobs().get(
        projectId=projectId,
        jobId=jobId)
    job_resource = job_get.execute(num_retries=num_retries)

    while not job_resource['status']['state'] == 'DONE':
        print('Job is {}, waiting {} seconds...'
              .format(job_resource['status']['state'], interval))
        time.sleep(interval)
        job_resource = job_get.execute(num_retries=num_retries)

    return job_resource


def paging(request_func, num_retries=5, **kwargs):
    has_next = True
    while has_next:
        response = request_func(**kwargs).execute(num_retries=num_retries)
        if 'pageToken' in response:
            kwargs['pageToken'] = response['pageToken']
        else:
            has_next = False
        yield response


def delete_table(service, project_id, dataset_id, table_id):
    list_of_tables = service.tables().list(projectId=project_id, datasetId=dataset_id).execute()['tables']
    for table in list_of_tables:
        if table['tableReference']['tableId'] == table_id:
            service.tables().delete(projectId=project_id, datasetId=dataset_id, tableId=table_id).execute()