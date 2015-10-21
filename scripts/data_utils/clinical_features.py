from sys import argv
from csv import DictWriter

from bq_data_access.clinical_data import feature_search


def main():
    out_file_path = argv[1]
    result = feature_search('', disable_filter=True)

    writer = DictWriter(open(out_file_path, 'wb'), delimiter='\t', fieldnames=['feature_type', 'gene', 'label', 'internal_id'])
    writer.writeheader()
    writer.writerows(result)

if __name__ == '__main__':
    main()
