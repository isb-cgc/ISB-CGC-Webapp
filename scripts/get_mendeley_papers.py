###
# Copyright 2015-2020, Institute for Systems Biology
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
###

from __future__ import print_function

from mendeley import Mendeley
import json

def test():
    client_id = 9526
    client_secret = "AmIvWP7FRxeLHX7n"
    redirect_uri = "https://isb-cgc.appspot.com/"

    # These values should match the ones supplied when registering your application.
    mendeley = Mendeley(client_id, client_secret=client_secret, redirect_uri=redirect_uri)

    auth = mendeley.start_implicit_grant_flow()

    # The user needs to visit this URL, and log in to Mendeley.
    login_url = auth.get_login_url()

    print("Go to this link to log in: \n" + login_url)

    # After logging in, the user will be redirected to a URL, auth_response.
    auth_response = input("Copy the redirect link here: \n")
    auth_response = auth_response.rstrip()

    # print("** Response is: " + auth_response)
    session = auth.authenticate(auth_response)
    # print(session.token['access_token'])

    # List all groups I have access to
    groups = session.groups.iter()

    i = 1
    for g in groups:
        print("[{}] {}".format(i, g.name))
        i = i + 1

    # Let choose a group
    selected_index = int(input('Select group to get paper from: '))
    i = 1
    group_id = ''
    groups = session.groups.iter()
    for g in groups:
        if i == selected_index:
            group_id = g.id
            break
        i = i + 1

    if group_id == '':
        quit()

    # Get all the documents in the group
    target_group = session.groups.get(group_id)
    docs = target_group.documents.iter()

    # Write documents to json
    json_result = ""

    for doc in docs:
        this_row = {}
        this_row['title'] = doc.title
        this_row['id'] = doc.id

        if doc.identifiers:
            identifiers = ""
            iden_len = len(doc.identifiers)
            i = 0
            for key, value in doc.identifiers.items():
                identifiers += "{}: {}".format(key, value)
                if i != iden_len - 1:
                    identifiers += ", "
                i = i + 1
            this_row['identifiers'] = identifiers
        else:
            this_row['identifiers'] = doc.identifiers

        if doc.authors:
            author_names = ""
            for author in doc.authors[:-1]:
                author_names += "{} {}, ".format(author.first_name, author.last_name)
            author_names += "{} {}".format(doc.authors[-1].first_name, doc.authors[-1].last_name)
            this_row['authors'] = author_names
        else:
            this_row['authors'] = doc.authors

        this_row['source'] = doc.source
        this_row['type'] = doc.type
        this_row['year'] = doc.year

        if doc.keywords:
            keywords = ""
            for keyword in doc.keywords[:-1]:
                keywords += "{}, ".format(keyword)
            keywords += doc.keywords[-1]
            this_row['keywords'] = keywords
        else:
            this_row['keywords'] = doc.keywords

        json_row = json.dumps(this_row) + "\n"
        print(json_row)
        json_result += json_row

    # Write JSON file to GCP bucket


    print("something")



if __name__ == "__main__":
    test()

