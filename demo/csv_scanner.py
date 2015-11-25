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

import argparse
import csv

# given a list of CSV rows, test whether any of those rows contain the specified
# field name:value entry.
def matching_row_exists(csv_rows, field_name, field_value):
  return len(find_matching_rows(csv_rows, field_name, field_value, 1)) > 0

# given a list of CSV rows (strings -- i.e. the lines from a CSV document) and
# a target field name:value pair, find and return up to match_limit rows which
# contain the specified name:value entry.
def find_matching_rows(csv_rows, field_name, field_value, match_limit=float('inf')):
  assert match_limit > 0, 'invalid match limit: {} (must be positive'.format(match_limit)

  dict_reader = csv.DictReader(csv_rows)
  dict_reader.fieldnames = [field.strip() for field in dict_reader.fieldnames]
  # no reason to even look at any of the rows if the target field is missing
  if field_name not in dict_reader.fieldnames:
    print "WARNING: '{}' is not a field in the input file (fields found: {})".format(
        field_name, dict_reader.fieldnames)
    return []

  # process rows until either match_limit matches have been found, or all of the
  # rows have been processed
  matches = []
  for row in dict_reader:
    if row.get(field_name) == field_value:
      matches.append(row)
      if len(matches) >= match_limit:
        break
  return matches
