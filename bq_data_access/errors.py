class FeatureAccessError(Exception):
    def __init__(self, message):
        self.message = message

    def __str__(self):
        return self.message

class FeatureNotFoundException(FeatureAccessError):
    """Exception raised when the queried internal feature identifier is invalid"""

