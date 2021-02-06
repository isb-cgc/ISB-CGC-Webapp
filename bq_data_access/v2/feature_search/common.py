#
# Copyright 2015-2019, Institute for Systems Biology
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

class FeatureSearchError(Exception):
    def __init__(self, message):
        self.message = message

    def __str__(self):
        return self.message

class InvalidDataTypeException(FeatureSearchError):
    """Exception raised when requested data type does not exist"""

class InvalidQueryException(FeatureSearchError):
    """Exception raised when a query for a datatype is invalid"""

class InvalidFieldException(InvalidQueryException):
    """Exception raised when the requested search field does not exist for a datatype"""

class EmptyQueryException(InvalidQueryException):
    """Exception raised when a query contain only empty keywords"""

class BackendException(FeatureSearchError):
    """Exception raised when feature search fails because of backend datasource"""

FOUND_FEATURE_LIMIT = 20
