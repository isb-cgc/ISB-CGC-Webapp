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
from operator import itemgetter

MENDELEY_PAPERS_FILE = "mendeley_papers.json"

def test():
    client_id = input("Input your app ID for Mendeley API: \n")
    client_secret = input("Input your app secret for Mendeley API: \n")
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
    isb_cgc_papers = {}
    i = 1
    for g in groups:
        print("[{}] {}".format(i, g.name))
        i = i + 1
        if g.name == 'ISB-CGC':
            target_group = session.groups.get(g.id)
            docs = target_group.documents.iter()
            for doc in docs:
                isb_cgc_papers.update({doc.title: doc.id})

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
    json_papers = {}
    papers_array = []
    for doc in docs:
        this_paper = {}

        this_paper['title'] = doc.title

        if doc.title in isb_cgc_papers:
            this_paper['id'] = isb_cgc_papers.get(doc.title)
        else:
            this_paper['id'] = doc.id

        if doc.identifiers:
            identifiers = ""
            iden_len = len(doc.identifiers)
            i = 0
            for key, value in doc.identifiers.items():
                identifiers += "{}: {}".format(key, value)
                if i != iden_len - 1:
                    identifiers += ", "
                i = i + 1
            this_paper['identifiers'] = identifiers
        else:
            this_paper['identifiers'] = doc.identifiers

        if doc.authors:
            author_names = ""
            count = 0
            for author in doc.authors[:-1]:
                if count >= 3:
                    break
                count += 1
                author_names += "{} {}, ".format(author.first_name, author.last_name)
            if count < 3:
                author_names += "{} {}".format(doc.authors[-1].first_name, doc.authors[-1].last_name)
            else:
                author_names += "et al."
            this_paper['authors'] = author_names
        else:
            this_paper['authors'] = doc.authors

        this_paper['source'] = doc.source
        this_paper['type'] = doc.type
        this_paper['year'] = doc.year if doc.year else 0

        if doc.keywords:
            keywords = ""
            for keyword in doc.keywords[:-1]:
                keywords += "{}, ".format(keyword)
            keywords += doc.keywords[-1]
            this_paper['keywords'] = keywords
        else:
            this_paper['keywords'] = doc.keywords

        papers_array.append(this_paper)

    # Sort the list by year in reverse order (oldest last)
    papers_array.sort(key=itemgetter('year'), reverse=True)

    json_papers['papers'] = papers_array

    # Write JSON file to GCP bucket
    f = open(MENDELEY_PAPERS_FILE, 'r+')
    f.truncate(0)

    f = open(MENDELEY_PAPERS_FILE, 'w')
    json.dump(json_papers, f, indent=4)

    print(str(len(papers_array)) + " papers generated, please upload to GCP bucket to update: "
          "webapp-static-files-isb-cgc-dev/static/publications/mendeley_papers.json")

if __name__ == "__main__":
    test()

