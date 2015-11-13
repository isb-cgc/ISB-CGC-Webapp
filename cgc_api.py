import endpoints

from api.feature_access import FeatureAccessEndpoints
from api.single_feature_access import SingleFeatureDataAccess
from api.data_access import FeatureDataEndpoints
from api.Cohorts import Cohort_Endpoints
from api.metadata import Meta_Endpoints
from api.pairwise_api import Pairwise_Endpoints
from api.seqpeek_view_api import SeqPeekViewDataAccessAPI

package = 'isb-cgc-api'


APPLICATION = endpoints.api_server([
    Cohort_Endpoints,
    FeatureAccessEndpoints,
    Meta_Endpoints,
    FeatureDataEndpoints,
    SingleFeatureDataAccess,
    Pairwise_Endpoints,
    SeqPeekViewDataAccessAPI
])

