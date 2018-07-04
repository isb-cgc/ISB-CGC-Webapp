"""

Copyright 2017, Institute for Systems Biology

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


# pip install enum34
from enum import Enum


class PlottableDataType(Enum):
    GEXP = 1
    GNAB = 2
    METH = 3
    RPPA = 4
    CNVR = 5
    MIRN = 6
    CLIN = 7
    USER = 8


FEATURE_ID_TO_TYPE_MAP = {
    'gexp': PlottableDataType.GEXP,
    'gnab': PlottableDataType.GNAB,
    'meth': PlottableDataType.METH,
    'rppa': PlottableDataType.RPPA,
    'cnvr': PlottableDataType.CNVR,
    'mirn': PlottableDataType.MIRN,
    'clin': PlottableDataType.CLIN,
    'user': PlottableDataType.USER
}

