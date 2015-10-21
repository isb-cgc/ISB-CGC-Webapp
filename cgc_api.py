import endpoints

from api.users import User_Endpoints
from api.maf import MAFEndpointsAPI
from api.feature_access_v2 import FeatureAccessEndpoints
from api.data_access import FeatureDataEndpoints
from api.big_query import BQ_Endpoints
from api.Cohorts import Cohort_Endpoints
from api.metadata import Meta_Endpoints
from api.pairwise_api import Pairwise_Endpoints
package = 'isb-cgc-api'


APPLICATION = endpoints.api_server([
    MAFEndpointsAPI,
    Cohort_Endpoints,
    BQ_Endpoints,
    FeatureAccessEndpoints,
    Meta_Endpoints,
    FeatureDataEndpoints,
    Pairwise_Endpoints,
    User_Endpoints
])

