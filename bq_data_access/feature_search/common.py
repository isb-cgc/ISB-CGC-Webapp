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
