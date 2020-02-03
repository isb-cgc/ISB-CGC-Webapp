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
        'bootstrap': ['//stackpath.bootstrapcdn.com/bootstrap/3.1.1/js/bootstrap.min', 'libs/bootstrap.min'],
        'jquery': ['//cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.min', 'libs/jquery-1.11.1.min'],
        'datatables.net': ['//cdn.datatables.net/1.10.19/js/jquery.dataTables.min', 'libs/jquery.dataTables.min'],
        'datatables.bootstrap': ['https://cdn.datatables.net/1.10.20/js/dataTables.bootstrap.min'],
        'datatables.net-buttons': ['//cdn.datatables.net/buttons/1.6.0/js/dataTables.buttons.min'],
        'datatables.net-html5': ['//cdn.datatables.net/buttons/1.6.0/js/buttons.html5.min'],
        'chosen': ['//cdnjs.cloudflare.com/ajax/libs/chosen/1.8.7/chosen.jquery.min'],
        'buttons-colvis': ['//cdn.datatables.net/buttons/1.6.0/js/buttons.colVis.min']
    },
    shim: {
        'bootstrap': ['jquery'],
        'datatables.net': ['jquery'],
        'chosen':['jquery']
    }
});

require([
    'jquery',
    'bootstrap',
    'datatables.net',
    'datatables.bootstrap',
    'datatables.net-buttons',
    'datatables.net-html5',
    'buttons-colvis',
    'chosen'
], function ($) {
    $(document).ready(function () {
        var table = $('#bqmeta').DataTable({
            dom: 'lfBrtip',
            ajax: {
                url: BASE_URL+'/bq_meta_data',
                dataSrc: ''
            },
            buttons: [
                {
                    collectionTitle: '<i class="fa fa-sliders" style="margin-right: 5px;"></i>Toggle Columns',
                    extend: 'colvis',
                    text: '<i class="fa fa-cog" style="margin-right: 5px;"></i>Columns<span class="caret"></span>',
                    columns: '.colvis-toggle',
                    postfixButtons: [
                        {
                            extend: 'colvisRestore',
                            text: '<i class="fa fa-undo" style="margin-right: 5px;"></i>Restore'
                        }
                    ]
                },
                {
                    extend: 'csvHtml5',
                    text: '<i class="fa fa-download" style="margin-right: 5px;"></i>CSV Download',
                    title: 'bq-metadata',
                    exportOptions: {
                        columns: ':not(".no-export")'
                    }
                }
            ],
            columns: [
                {
                    "className": 'details-control no-export',
                    "orderable": false,
                    "data": null,
                    "defaultContent": ''
                },
                {
                    'name': 'friendlyName',
                    'data': function(data, type){
                        return (data.friendlyName ? data.friendlyName : (data.tableReference.datasetId+'-'+data.tableReference.tableId)).toUpperCase();
                    },
                    'className': 'label-filter colvis-toggle'
                },
                {
                    'name': 'datasetId',
                    'data': 'tableReference.datasetId',
                    'visible': false,
                    'className': 'colvis-toggle'
                },
                {
                    'name': 'tableId',
                    'data': 'tableReference.tableId',
                    'render': function (data, type) {
                        return type === 'display' ?
                            '<div class="nowrap-ellipsis">' + data + '</div>' :
                            data;
                    },
                    'width': '100px',
                    'className': 'custom-width-100 colvis-toggle',
                    'visible': false
                },
                {
                    'name': 'FullId',
                    'data': function (data){
                        return formatFullId(data.tableReference, true);
                    },
                    'visible': false
                },
                {
                    'name': 'category',
                    'data': function (data) {
                        return filtered_label_data(data.labels, 'category');
                    },
                    'render': function(data, type){
                        return format_label_display(data, type);
                    },
                    'className': 'label-filter colvis-toggle'
                },
                {
                    'name': 'referenceGenome',
                    'data': function (data) {
                        return filtered_label_data(data.labels, 'reference_genome');

                    },
                    'visible': false
                },
                {
                    'name': 'source',
                    'data': function (data) {
                        return filtered_label_data(data.labels, 'source');
                    },
                    'render': function(data, type){
                        return format_label_display(data, type);
                    },
                    'className': 'label-filter colvis-toggle'
                },
                {
                    'name': 'dataType',
                    'data': function (data) {
                        return filtered_label_data(data.labels, 'data_type');
                    },
                    'render': function(data, type) {
                        return format_label_display(data, type);
                    },
                    'className': 'label-filter colvis-toggle'
                },
                {
                    'name': 'status',
                    'data': function (data) {
                        return (data.labels && data.labels.status) ? data.labels.status: null;
                    },
                    'render': function(data, type){
                        return format_label_display(data, type);
                    },
                    'className': 'label-filter colvis-toggle'

                },
                {
                    'name': 'numRows',
                    'data': 'numRows',
                    'className': 'text-right colvis-toggle',
                    'render': $.fn.dataTable.render.number( ',', '.')
                },
                {
                    'name': 'createdDate',
                    'data': 'creationTime',
                    'className': 'text-right colvis-toggle',
                    'render': function (data, type) {
                        if (type === 'display') {
                            var date = new Date(parseInt(data));
                            var month = date.getMonth() + 1;
                            return month + "/" + date.getDate() + "/" + date.getFullYear();
                        }
                        else {
                            return data;
                        }
                    },
                    'searchable': false
                },
                {
                    'name': 'preview',
                    'data': function (row){
                        return row.id.split(/[.:]/).join('/');
                    },
                    'render': function (data, type) {
                        return type === 'display' ?
                            '<i class="preview-loading fa fa-circle-o-notch fa-spin" style="display: none; color:#19424e;" aria-hidden="true"></i>' : data;
                    },
                    "className": 'tbl-preview no-export',
                    'searchable': false,
                    'orderable': false
                },
                {
                    'name': 'description',
                    'data': function(row){
                        return row.description ? row.description: '';
                    },
                    'visible': false
                },
                {
                    'name': 'labels',
                    'data': function(row){
                        return row.labels ? row.labels: null;
                    },
                    'render': function(data, type){
                        var labels_arr = $.map(data, function(v, k){
                            if (type === 'display') {
                                return v ? k+':'+v : k;
                            }else{
                                return v ? v : k;
                            }
                        });
                        return labels_arr.join(', ');
                    },
                    'visible': false
                },
                {
                    'name': 'fields',
                    'data': function(row){
                        return format_schema_field_names(row.schema.fields, false);
                    },
                    'visible': false
                },
                {
                    // "name": "gcpLink",
                    "class": "text-center no-export colvis-toggle",
                    "searchable": false,
                    "data": function (data) {
                        return format_bq_gcp_console_link(data.tableReference);
                        // return 'https://console.cloud.google.com/bigquery'
                        //     + '?p=' + data.tableReference.projectId
                        //     + '&d=' + data.tableReference.datasetId
                        //     + '&t=' + data.tableReference.tableId
                        //     + '&page=table';
                    },
                    "render": function (data, type) {
                        return type === 'display' ?
                            '<a target="_blank" href="'
                            + data
                            + '" title="Open in Google Cloud Platform Console"><svg id="BIGQUERY_SECTION_cache12" fill="none" fill-rule="evenodd" height="15" viewBox="0 0 32 32" width="15" xmlns="http://www.w3.org/2000/svg" fit="" preserveAspectRatio="xMidYMid meet" focusable="false"><path d="M8.627 14.358v3.69c.58.998 1.4 1.834 2.382 2.435v-6.125H8.62z" fill="#19424e"></path><path d="M13.044 10.972v10.54c.493.073.998.12 1.516.12.473 0 .934-.042 1.386-.104V10.972h-2.902z" fill="#3A79B8"></path><path d="M18.294 15.81v4.604a6.954 6.954 0 0 0 2.384-2.556v-2.05h-2.384zm5.74 6.233l-1.99 1.992a.592.592 0 0 0 0 .836L27 29.83c.23.23.606.23.836 0l1.992-1.99a.594.594 0 0 0 0-.837l-4.957-4.956a.593.593 0 0 0-.83 0" fill="#3A79B8"></path><path d="M14.615 2C7.648 2 2 7.648 2 14.615 2 21.582 7.648 27.23 14.615 27.23c6.966 0 12.614-5.648 12.614-12.615C27.23 7.648 21.58 2 14.61 2m0 21.96a9.346 9.346 0 0 1-9.346-9.345 9.347 9.347 0 1 1 9.346 9.346" fill="#3A79B8"></path></svg></a>'
                            : data;
                    },
                    'visible': false,
                    "orderable": false
                }
            ],
            serverSide: false,
            order: [[1, 'asc']],
            initComplete: function (settings, json) {
                $('.spinner').remove();
                reset_table_style(settings);
            },
            drawCallback: function (settings) {
                reset_table_style(settings);
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
            if($(this).prop('multiple')){
                var regex_term = '';
                $.each($(this).val(),function(index, value){
                    regex_term += (index > 0 ? '|' : '') + '\\b' + value + '\\b(?!-)';
                });
                columnSearch(column_name, regex_term, true, false);
            }
            else{
                columnSearch(column_name, $(this).val(), false, false);
            }
        });

        $(".reset-btn").on('click', function () {

            $(".autocomplete_select_box").val('').trigger("chosen:updated");
            $('.bq-filter, .bq-select').val('');
            $('#status').val('current');
            $('.bq-checkbox').prop('checked', false);
            $('.bq-select, .bq-checkbox').trigger('change');
            $('.bq-filter').trigger('keyup');

        });

        $('#bqmeta').find('tbody').on('click', 'td.tbl-preview', function () {

            var td = $(this).closest('td');
            var tbl_path = table.cell(td).data();
            var tr = $(this).closest('tr');
            var row = table.row(tr);
            if (row.child.isShown() && tr.hasClass('preview-shown')) {
                // This row is already open - close it
                row.child.hide();
                tr.removeClass('shown preview-shown');
            } else {
                if(!td.data('preview-data')) {
                    //check if the preview data is stored
                    //if not get the data and store it
                    $.ajax({
                        type: "GET",
                        url: BASE_URL + "/get_tbl_preview/" + tbl_path + "/",
                        beforeSend: function () {
                            td.find('.preview-loading').show();
                        },
                        error: function (result) {
                            show_tbl_preview(row, tr, td, 'There has been an error retrieving the preview table.');
                        },
                        success: function (data) {
                            td.data('preview-data', data.rows);
                            show_tbl_preview(row, tr, td);
                        }
                    });
                }
                else{ // use the stored data to display
                    show_tbl_preview(row, tr, td);
                }
            }
        });

        var columnSearch = function(column_name, term, regex_search, smart_search){
            table
                .columns(column_name+':name')
                .search(term, regex_search, smart_search)
                .draw();
        };

        // Add event listener for opening and closing details
        $('#bqmeta').find('tbody').on('click', 'td.details-control', function () {
            var tr = $(this).closest('tr');
            var row = table.row(tr);
            if (row.child.isShown() && tr.hasClass('details-shown')) {
                // This row is already open - close it
                row.child.hide();
                tr.removeClass('shown details-shown');
            }
            else {
                // Open this row
                row.child(format_tbl_details(row.data())).show();
                $(".copy-btn").on('click', function () {
                    copy_to_clipboard($(this).siblings('.full_id_txt'));
                });
                tr.addClass('shown details-shown');
                tr.removeClass('preview-shown');
            }
        });
        $('#bq-meta-form').find('i.fa-info-circle').tooltip();
        $('#status').val('current');
        $('#status').trigger('change');
        $(".autocomplete_select_box").chosen({
            // disable_search_threshold: 10,
            no_results_text: "Oops, nothing found!",
            width: "100%"
        });

    });

    var show_tbl_preview = function(row, tr, td, err_mssg){
        if(err_mssg) {
            row.child('<div class="float-right"><i class="fa fa-exclamation-triangle" style="margin-right: 5px;"></i>'+err_mssg+'</div>').show();
        } else {
            var schema_fields = row.data().schema.fields;
            var tbl_data = td.data('preview-data');
            row.child(format_tbl_preview(schema_fields, tbl_data)).show();
        }
        tr.removeClass('details-shown');
        td.find('.preview-loading').hide();
        tr.addClass('shown preview-shown');
    };

    var format_bq_gcp_console_link = function(tbl_ref){
        return 'https://console.cloud.google.com/bigquery'
                            + '?p=' + tbl_ref.projectId
                            + '&d=' + tbl_ref.datasetId
                            + '&t=' + tbl_ref.tableId
                            + '&page=table';
    };

    var format_tbl_details = function(d) {
        // `d` is the original data object for the row
        return '<table class="detail-table">' +
            '<td style="vertical-align:top;"><strong>Full ID</strong></td>' +
            '<td>'+
            '<span class="full_id_txt">' + formatFullId(d.tableReference, false) +
            '</span>'+
            '<button class="copy-btn" title="Copy to Clipboard">' +
            '<i class="fa fa-clipboard" aria-hidden="true"></i>'+
            'COPY' +
            '</button>' +

            '<button class="" style="margin-left: 0;" title="Open in Google Cloud Platform Console" onClick="window.open(\'' + format_bq_gcp_console_link(d.tableReference) + '\');">' +
            '<svg id="BIGQUERY_SECTION_cache12" fill="none" fill-rule="evenodd" height="10" viewBox="0 0 28 24" width="9" xmlns="http://www.w3.org/2000/svg" fit="" preserveAspectRatio="xMidYMid meet" focusable="false"><path d="M8.627 14.358v3.69c.58.998 1.4 1.834 2.382 2.435v-6.125H8.62z" fill="#19424e"></path><path d="M13.044 10.972v10.54c.493.073.998.12 1.516.12.473 0 .934-.042 1.386-.104V10.972h-2.902z" fill="#3A79B8"></path><path d="M18.294 15.81v4.604a6.954 6.954 0 0 0 2.384-2.556v-2.05h-2.384zm5.74 6.233l-1.99 1.992a.592.592 0 0 0 0 .836L27 29.83c.23.23.606.23.836 0l1.992-1.99a.594.594 0 0 0 0-.837l-4.957-4.956a.593.593 0 0 0-.83 0" fill="#3A79B8"></path><path d="M14.615 2C7.648 2 2 7.648 2 14.615 2 21.582 7.648 27.23 14.615 27.23c6.966 0 12.614-5.648 12.614-12.615C27.23 7.648 21.58 2 14.61 2m0 21.96a9.346 9.346 0 0 1-9.346-9.345 9.347 9.347 0 1 1 9.346 9.346" fill="#3A79B8"></path></svg>'+
            ' OPEN' +
            '</button>' +

            '</td>'+
            '</tr><tr>' +
            '<td style="vertical-align:top;"><strong>Dataset ID</strong></td>' +
            '<td>' + d.tableReference.datasetId+ '</td>' +
            '</tr><tr>' +
            '<td style="vertical-align:top;"><strong>Table ID</strong></td>' +
            '<td>' + d.tableReference.tableId + '</td>' +
            '</tr><tr>' +
            '<td style="vertical-align:top;"><strong>Description</strong></td>' +
            '<td>' + (d.description == null? 'N/A' : d.description)+ '</td>' +
            '</tr><tr>' +
            '<td><strong>Schema</strong></td>' +
            '<td>' + form_schema_table(d.schema.fields) + '</td>' +
            '</tr><tr>' +
            '<td><strong>Labels</strong></td>' +
            '<td>'+tokenize_labels(d.labels)+'</td>' +
            '</tr></table>';
    };

    var formatFullId = function(tblRef, wrapText){
        return (wrapText? '`':'') +tblRef.projectId + '.' + tblRef.datasetId+'.'+ tblRef.tableId + (wrapText? '`':'');
    };

    var copy_to_clipboard = function(el) {
        var $temp = $("<input>");
        $("body").append($temp);
        $temp.val( '`' + $(el).text() + '`' ).select();
        document.execCommand("copy");
        $temp.remove();
    };

    var format_schema_field_names = function(schema_fields, in_html){
        var schema_field_names_str = '';
        for(var col=0; col < schema_fields.length; col++){
            if(schema_fields[col]['type']==='RECORD'){
                var nested_fields = schema_fields[col]['fields'];
                for(var n_col=0; n_col < nested_fields.length; n_col++){
                    if(nested_fields[n_col]['type'] === 'RECORD'){
                        var double_nested_fields = nested_fields[n_col]['fields'];
                        for(var nn_col=0; nn_col < double_nested_fields.length; nn_col++){
                            schema_field_names_str += (in_html ? '<th>': '') + schema_fields[col]['name'] +'.'
                                + nested_fields[n_col]['name'] + '.'
                                + double_nested_fields[nn_col]['name']
                                + (in_html ? '</th>':', ');
                        }
                    }
                    else{
                        schema_field_names_str += (in_html? '<th>':'') + schema_fields[col]['name'] +'.' + nested_fields[n_col]['name'] + (in_html? '</th>': ', ');
                    }

                }
            }
            else{
                schema_field_names_str += (in_html ? '<th>':'') + schema_fields[col]['name'] + (in_html ? '</th>': ', ');
            }
        }

        if (schema_field_names_str.substr(-2) === ', '){ // remove the last comma
            schema_field_names_str = schema_field_names_str.slice(0,-2);
        }

        return schema_field_names_str;
    };

    var format_tbl_preview_body = function(schema_fields, rows){
        var tbody_str = '';
        for(var row = 0; row < rows.length; row++){

            tbody_str += '<tr>';
            for(var col = 0; col < schema_fields.length; col++){
                var cell = rows[row]['f'][col]['v'];
                if(schema_fields[col]['type']==='RECORD' || schema_fields[col]['mode']==='REPEATED'){
                    var nested_fields_len =  schema_fields[col]['type']==='RECORD' ? schema_fields[col]['fields'].length : 1;
                    for(var n_col=0; n_col < nested_fields_len; n_col++){
                        if('fields' in schema_fields[col] && schema_fields[col]['fields'][n_col]['type']==='RECORD'){
                            var n_nested_fields_len = schema_fields[col]['fields'][n_col]['fields'].length;
                            for(var nn_col = 0; nn_col < n_nested_fields_len; nn_col++){
                                tbody_str += nest_table_cell(cell, n_col, nn_col);
                            }
                        }
                        else{
                            tbody_str += nest_table_cell(cell, n_col);
                        }
                    }
                }
                else{
                    tbody_str += '<td nowrap="">'+cell+'</td>';
                }
            }
            tbody_str += '</tr>';
        }
        return tbody_str;

    };

    var format_tbl_preview = function(schema_fields, rows){
        var html_tbl = '<div class="preview-table-container"><table class="preview-table">';
        html_tbl += '<tr>';
        html_tbl += format_schema_field_names(schema_fields, true);
        html_tbl += '</tr>';
        html_tbl += format_tbl_preview_body(schema_fields, rows);
        html_tbl += '</table></div>';
        return html_tbl;
    };

    var nest_table_cell = function(cell, n_col, nn_col){
        var MAX_NESTED_ROW = 5;
        var truncate_rows = cell.length > MAX_NESTED_ROW;
        var td_str = '<td><table>';
        if (cell) {
            for (var n_row = 0; n_row < (truncate_rows ? MAX_NESTED_ROW : cell.length); n_row++) {

                td_str += '<tr><td>';
                if(truncate_rows && n_row == MAX_NESTED_ROW-1){
                    cell[n_row]['v'] = '<i class="fa fa-ellipsis-v" aria-hidden="true" style="margin-left: 5px;" title="'+(cell.length-MAX_NESTED_ROW+1)+' rows are truncated for preview."></i>';
                }
                if (typeof cell[n_row]['v']['f'] === 'object') {
                    if(nn_col != null){
                        if(cell[n_row]['v']['f'][n_col]['v'].length > 0 ){
                            td_str += (cell[n_row]['v']['f'][n_col]['v'][0]['v']['f'][nn_col]['v'] ? cell[n_row]['v']['f'][n_col]['v'][0]['v']['f'][nn_col]['v']: '&nbsp;');
                        }else{
                            td_str += '&nbsp;';
                        }
                    }
                    else {
                        var n_cell = cell[n_row]['v']['f'][n_col]['v'];
                        if(typeof n_cell === 'object' &&  n_cell){
                            td_str += '['+ ($.map(n_cell, function(nn_row){
                                return nn_row['v'];
                            }).join(', ')) + ']';
                        }
                        else{
                            td_str += n_cell;
                        }

                    }
                } else {

                    td_str += cell[n_row]['v'];
                }
                td_str += '</td></tr>';

            }
        }
        else {
            td_str += '<tr><td></td></td>';
        }
        td_str += '</table></td>';
        return td_str;

    };

    var tokenize_labels = function(labels_obj){
        var tokenized_str = '';
        $.each(labels_obj, function(key, value){
            tokenized_str += '<span class="label">'+ key + (value ? ' : ' + value : '') + '</span>';
        });
        return tokenized_str;
    };


    var form_schema_table = function (data) {
        var schema_table = '<table class="schema-table">';
        if(data){
            schema_table += '<tr><th>Field Name</th><th>Type</th><th>Mode</th><th>Description</th></tr>'
        }
        $.each(data, function (i, d) {
            schema_table += '<tr><td>'+ d.name + '</td><td>' + d.type + '</td><td>' + d.mode +'</td><td>' + d.description +'</td></tr>';
            if(d.type === 'RECORD'){
                $.each(d.fields, function(ii, dd){
                    schema_table += '<tr><td>&nbsp;&nbsp;&nbsp;&nbsp;.'+ dd.name + '</td><td>' + dd.type + '</td><td>' + dd.mode +'</td><td>' + dd.description +'</td></tr>';
                    if(dd.type === 'RECORD'){
                        $.each(dd.fields, function(iii, ddd) {
                            schema_table += '<tr><td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.'+ ddd.name + '</td><td>' + ddd.type + '</td><td>' + ddd.mode +'</td><td>' + ddd.description +'</td></tr>';
                        });
                    }
                });
            }

        });
        schema_table += '</table>';
        return schema_table;
    };

    var filtered_label_data = function(data_labels, filter_key_term){
        var filtered_val_arr = $.map(data_labels, function (val, key) {
            return key.startsWith(filter_key_term) ? val : null;
        });
        return (filtered_val_arr.length > 0 ? filtered_val_arr.join(', ') : null);
    };

    var format_label_display = function(data, type){
        return (type === 'display' && data) ?
            data.toUpperCase().replace(/_/g, ' ') : data;
    };

    var reset_table_style = function (settings) {
        $('#bqmeta').find('th').attr('style','');
        var api = new $.fn.dataTable.Api( settings );
        var csv_button = api.buttons('.buttons-csv');
        if (api.rows({ filter: 'applied' }).data().length === 0) {
            csv_button.disable();
        }
        else {
            csv_button.enable();
        }
    };

});