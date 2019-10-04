/**
 *
 * Copyright 2019, Institute for Systems Biology
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

require.config({
    paths: {
        // 'jquery': 'libs/jquery-1.11.1.min',
        'jquery': ['//cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.min', 'libs/jquery-1.11.1.min'],
        'dataTables': ['//cdn.datatables.net/1.10.18/js/dataTables.bootstrap.min'],
        'dataTables.net': ['//cdn.datatables.net/1.10.19/js/jquery.dataTables.min', 'libs/jquery.dataTables.min'],
        'dataTables.rowGroup': ['//cdn.datatables.net/rowgroup/1.0.3/js/dataTables.rowGroup.min', 'libs/dataTables.rowGroup.min']
    },
    shim: {
        'dataTables.net': ['jquery'],
        'dataTables.rowGroup': ['jquery', 'dataTables.net']
    },
    map: {
        '*': {
            'datatables.net': 'dataTables'
        }
    }
});

require([
    'jquery',
    'dataTables.net',
    'dataTables.rowGroup'
], function ($) {
    $(document).ready(function () {
        var table = $('#bqmeta').DataTable({
            ajax: {
                //Change to the location of your json file.
                url:'/static/data/bq_meta_datasets.json', //todo: change this to fetch url programmically
                dataSrc: ''
            },
            columns: [

                // Change to reflect the columns in the json file that you want.
                // Remember to add appropriate headers in the table's
                // thead element or it won't render.

                {
                    "className": 'details-control',
                    "orderable": false,
                    "data": null,
                    "defaultContent": ''
                },

                // {
                //     'name': 'description',
                //     'data': 'description',
                //     'render': function (data, type) {
                //         return type === 'display' ?
                //             (data ? '<i class="fa fa-info-circle hover-bubble"></i><div class="hover-bubble">' + data + '</div>' : '') :
                //             data;
                //     }
                // },

                // {
                //     'name': 'projectId',
                //     'data': 'projectId',
                //     'visible': false
                // },

                {
                    'name': 'datasetId',
                    'data': 'tableReference.datasetId'
                },
                {
                    'name': 'tableId',
                    'data': 'tableReference.tableId'
                },
                {
                    'name': 'fullId',
                    'data': 'id',
                    'render': function (data, type) {
                        return type === 'display' ?
                            '<div class="nowrap-ellipsis">' + data + '</div>' :
                            data;
                    }
                },
                {
                    'name': 'status',
                    'data': function (data) {
                        if(data.labels && data.labels.status){
                            return data.labels.status;
                        }
                        else
                            return null;
                    }
                },
                {
                    'name': 'category',
                    'data': function (data) {
                        if(data.labels && data.labels.category){
                            return data.labels.category.replace('_',' ');
                        }
                        else
                            return null;
                    }
                },
                {
                    'name': 'numRows',
                    'data': 'numRows',
                    'className': 'td-body-right',
                    'render': $.fn.dataTable.render.number( ',', '.')
                },
                {
                    'name': 'createdDate',
                    'data': 'creationTime',
                    'className': 'td-body-right',
                    'render': function (data) {
                        var date = new Date(parseInt(data));
                        var month = date.getMonth() + 1;
                        return month + "/" + date.getDate() + "/" + date.getFullYear();
                    },
                    'searchable': false
                },
                {
                    'name': 'description',
                    'data': function(row){
                        if(row.description)
                            return 'description';
                        else
                            return null;
                    },
                    'visible': false
                },
                {
                    'name': 'labels',
                    'data': function(row){
                        if(row.labels){
                            return row.labels;
                        }
                        else
                            return null;
                    },
                    'render': function(data){
                        var labels_str = '';
                        for(var k in data){
                            if(data[k]){
                                labels_str += data[k];
                            }
                            else{
                                labels_str += k;
                            }
                            labels_str += ' ';
                        }
                        return labels_str;
                    },
                    'visible': false
                },
                {
                    'name': 'fields',
                    'data': 'schema.fields',
                    'render': function (data){
                        return fields_to_str(data);
                    },
                    'visible': false
                },
                // {
                //     'name': 'selfLink',
                //     'data': 'selfLink',
                //     'render': function (data, type) {
                //         return type === 'display' ?
                //             '<div class="nowrap-ellipsis">' + data + '</div>' :
                //             data;
                //     }
                // }
            ],
            // Only use this for a paginated api.
            serverSide: false,
            order: [[1, 'asc']],
            // rowGroup: {
            //     dataSrc: 'datasetId'
            // }
            "drawCallback": function() {
                // $('#status').val('current');

                // $('i.hover-bubble')
                //     .mouseenter(function () {
                //     $(this).parent('td').find('div.hover-bubble').show();
                //     }).mouseout(function () {
                //         $(this).parent('td').find('div.hover-bubble').hide();
                //     });
            }

        });



        $('.bq-filter').on('keyup', function () {
            var column_name = $(this).attr('data-column-name');
            columnSearch(column_name, this.value);
        });

        $('.bq-checkbox').on('change', function () {
            var column_name = $(this).attr('data-column-name');
            var checkbox_vals = '';
            $('input[data-column-name='+column_name+']:checked').each(function(i){
                checkbox_vals += (i > 0 ? '|': '') + $(this).val();
            });
            columnSearch(column_name, checkbox_vals, true, false);
        });

        $('.bq-select').on('change', function () {
            var column_name = $(this).attr('data-column-name');
            var select_vals = $(this).val();
            columnSearch(column_name, select_vals);
        });

        var columnSearch = function(column_name, term, regex_search, smart_search) {
            table
                .columns(column_name+':name')
                .search(term, regex_search, smart_search)
                .draw();
        };


        // Add event listener for opening and closing details
        $('#bqmeta tbody').on('click', 'td.details-control', function () {
            var tr = $(this).closest('tr');
            var row = table.row(tr);
            if (row.child.isShown()) {
                // This row is already open - close it
                row.child.hide();
                tr.removeClass('shown');
            }
            else {
                // Open this row
                row.child(format(row.data())).show();
                tr.addClass('shown');
            }
        });
        $('#status').val('current');
        $('#status').trigger('change');

    });

    function format(d) {
        // `d` is the original data object for the row
        return '<table class="detail-table">' +
            '<tr>' +
            '<td style="vertical-align: top;"><strong>Description</strong></td>' +
            '<td>' + (d.description == null? 'N/A' : d.description)+ '</td>' +
            '</tr><tr>' +
            '<td><strong>Schema</strong></td>' +
            '<td>' + form_schema_table(d.schema.fields) + '</td>' +
            '</tr><tr>' +
            '<td><strong>Labels</strong></td>' +
            '<td>'+tokenize_labels(d.labels)+'</td>' +
            '</tr></table>';
    }

    var tokenize_labels = function(labels_obj){
        var tokenized_str = '';
        for(var k in labels_obj){
            tokenized_str += '<span class="label">'+k+(labels_obj[k] ? ' : '+labels_obj[k] : '')+'</span>';
        }
        return tokenized_str;
    };

    var fields_to_str = function (data) {
        var fields_str = '';
        $.each(data, function (i, d) {
            fields_str += (i > 0 ? ' ' : '') + d.name;
        });
        return fields_str;
    };

    var form_schema_table = function (data) {
        var schema_table = '<table class="schema-table">';
        if(data){
            schema_table += '<tr><th>Field Name</th><th>Type</th><th>Mode</th><th>Description</th></tr>'
        }
        $.each(data, function (i, d) {
            schema_table += '<tr><td>'+ d.name + '</td><td>' + d.type + '</td><td>' + d.mode +'</td><td>' + d.description +'</td></tr>';
        });
        schema_table += '</table>';
        return schema_table;
    };




});