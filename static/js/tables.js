/**
 *
 * Copyright 2020, Institute for Systems Biology
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
    baseUrl: STATIC_FILES_URL+'js/',
    paths: {
        jquery: 'libs/jquery-3.7.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        base: 'base',
        session_security: 'session_security/script',
        underscore: 'libs/underscore-min',
        assetscore: 'libs/assets.core',
        assetsresponsive: 'libs/assets.responsive',
        tablesorter:'libs/jquery.tablesorter.min',
        filterutils:'filterutils',
        cartutils:'cartutils',
        tippy: 'libs/tippy-bundle.umd.min',
        '@popperjs/core': 'libs/popper.min',

    },
    shim: {
        '@popperjs/core': {
          exports: "@popperjs/core"
        },
        'tippy': {
          exports: 'tippy',
            deps: ['@popperjs/core']
        },
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'tablesorter': ['jquery'],
        'underscore': {exports: '_'},
        'filterutils':['jquery'],
        'cartutils':['jquery']
    }
});

// Set up common JS UI actions which span most views
require([
    'cartutils',
    'filterutils',
    'tippy',
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'underscore',
    'base',
    'assetscore',
    'assetsresponsive',
    'tablesorter'

], function(cartutils,filterutils,tippy,$, jqueryui, bootstrap, session_security, _,base) {
    'use strict';
});

// Return an object for consts/methods used by most views

define(['cartutils','filterutils','tippy','jquery', 'base'], function(cartutils, filterutils, tippy, $, base) {

    $('#proj_table, #cases_tab, #studies_tab, #series_tab, #cart-table').on('preInit.dt', function(){
        window.show_spinner();
    });
    $('#proj_table, #cases_tab, #studies_tab, #series_tab, #cart-table').on('draw.dt', function(){
        window.hide_spinner();
    });

    // Update the rows in the Projects Table, clear the other tables.
    window.updateTablesAfterFilter = function (collFilt, collectionsData, collectionStats,cartStats){

        var usedCollectionData = new Array();

        var hasColl = collFilt.length>0 ? true : false;
        for (var i=0;i<window.collectionData.length;i++){
            var cRow = window.collectionData[i];
            var projId=cRow[0];
            if ( (projId in collectionsData) && (!hasColl || (collFilt.indexOf(projId)>-1)) ){
                cRow[3] = collectionsData[projId]['count'];
            } else {
               cRow[3] = 0;
            }

            if (cRow[3]>0) {
                usedCollectionData.push(cRow);
            }
        }

        updateProjectTable(usedCollectionData,collectionStats, cartStats);
        initializeTableViewedItemsData();
        initializeTableCacheData();
        $('#cases_tab').DataTable().destroy();
        $('#studies_tab').DataTable().destroy();
        $('#series_tab').DataTable().destroy();
        updateCaseTable(false,"");
        updateStudyTable(false,"");
        updateSeriesTable(false,"");


    }

    // initialize cases, studies, and series cache data
    const initializeTableViewedItemsData = function(){
        window.openProjects ={}
        window.openCases = {}
        window.openStudies = {}
    }
    const initializeTableCacheData =  function() {

        window.casesTableCache = {
            "data": [],
            "recordLimit": -1,
            "datastrt": 0,
            "dataend": 0,
            "req": {"draw": 0, "length": 0, "start": 0, "order": {"column": 0, "dir": "asc"}}
        };
        window.studyTableCache = {
            "data": [],
            "recordLimit": -1,
            "datastrt": 0,
            "dataend": 0,
            "req": {"draw": 0, "length": 0, "start": 0, "order": {"column": 0, "dir": "asc"}}
        };
        window.seriesTableCache = {
            "data": [],
            "recordLimit": -1,
            "datastrt": 0,
            "dataend": 0,
            "req": {"draw": 0, "length": 0, "start": 0, "order": {"column": 0, "dir": "asc"}}
        };

    }

    // check if a cache of cases, studies, or series data needs to be updated with a server call
    const checkClientCache = function(request, type){
        var cache;
        var reorderNeeded = false;
        var updateNeeded = true;
        if (request.draw ===1){
            updateNeeded = true;
        } else {
            if (type === 'cases') {
                cache = window.casesCache;
            } else if (type === 'studies') {
                cache = window.studiesCache;
            } else if (type === 'series') {
                cache = window.seriesCache;
            }

            if ((cache.lastRequest.order[0]['column'] === request.order[0]['column']) && (cache.lastRequest.order[0]['dir'] === request.order[0]['dir'])) {
                if ( (cache.backendReqStrt<=request.start) && ( (cache.backendReqStrt+cache.backendReqLength) >= (request.start+request.length)  )){
                    updateNeeded=false;
                } else {
                    updateNeeded = true;
                }
            } else if (cache.cacheLength===cache.recordsTotal){
                updateNeeded = false;
                reorderNeeded=true;
            } else {
                updateNeeded = true;
            }
        }
        return [updateNeeded , reorderNeeded];
    }

    // update cache of cases, studies or series data
    const updateCache = function(cache,request,backendReqStrt, backendReqLength,data, colOrder){
        cache.lastRequest = request;
        cache.backendReqStrt=backendReqStrt;
        cache.backendReqLength=backendReqLength;
        cache.cacheLength = data['res'].length;
        cache.recordsTotal = data['cnt'];
        cache.data = data['res'];
        cache.colOrder = colOrder;
    }

    // reorder cache data
    const reorderCacheData = function(cache,request,thead){
        function compCols(a,b,col,dir,isNum,hasAux,auxCol,auxIsNum){
            var cmp=0;
            if (isNum){
                cmp=parseFloat(a[col])- parseFloat(b[col]);
            } else {
                cmp=(a[col]>b[col] ? 1 :  a[col]==b[col]? 0: -1)
            }

            if (dir ==='desc'){
                cmp=-cmp;
            }

            if ((cmp === 0) && hasAux){
                if (auxIsNum){
                    cmp=parseFloat(a[auxCol])- parseFloat(b[auxCol]);
                } else {
                    cmp=(a[auxCol]>b[auxCol] ? 1 :  a[auxCol]==b[auxCol]? 0: -1)
                }
            }
            if (cmp==0){
                cmp=1;
            }
            return cmp;
        }


        var dir = request.order[0]['dir'];
        var colId = parseInt(request.order[0]['column']);
        var col = cache.colOrder[colId];
        var ntmp  = cache.data.slice(0,3);
        var rtmp = new Array();

        isNum = ( $(thead.children('tr').children().get(colId)).hasClass('numeric_data') ? true: false);
        hasAux = ( $(thead.children('tr').children().get(colId)).hasClass('has_aux') ? true: false);

        if (hasAux){
            auxColId = parseInt($(thead.children('tr').children().get(colId)).data('auxid'));
            auxCol = cache.colOrder[auxColId]
            auxIsNum = ( $(thead.children('tr').children().get(auxColId)).hasClass('numeric_data') ? true: false);
        } else {
            auxColId=-1
            auxCol=''
            auxIsNum= false;
        }
         cache.data.sort((a,b)=> compCols(a,b,col,dir,isNum,hasAux,auxCol,auxIsNum))
    }

    // classes for project(collection) table columns
    var projectTableColDefs = function(){
        return [{className: "ckbx text_data viewbx caseview", "targets": [0]},
                {className: "ckbx shopping-cart-holder", "targets": [1]},
                {className: "ckbx cartnumholder", "targets": [2]},
                {className: "collex_name", "targets": [3]},
                {className: "collex-case-count table-count", "targets": [4]},
                {className: "projects_table_num_cohort table-count", "targets": [5]}];
    }

    // project(collection) table column definitions
    const projectTableColumns = function(){
        var caret_col= { "type": "html", "orderable": false, render: function (data) {
            if (('state' in window.selProjects[data]) && ('view' in window.selProjects[data]['state']) && (window.selProjects[data]['state']['view'] )) {
                return '<a role="button" title="Display cases in this collection below.">'+
                    '<i class="fa fa-solid fa-caret-right is-hidden"></i>' +
                    '<i class="fa fa-solid fa-caret-down"></i></a>'
            } else {
                return '<a role="button" title="Display cases in this collection below.">'+
                    '<i class="fa fa-solid fa-caret-right"></i>' +
                    '<i class="fa fa-solid fa-caret-down is-hidden"></i></a>'
            }
       },
            createdCell: function(td) {
                $(td).attr("title", "Display cases in this collection below.");
                $(td).addClass('expansion-toggle');
                if ($(td).find('.fa-caret-right.is-hidden').length > 0) {
                    $(td).addClass('open');
                }
            }
        };

        var cart_col = {"type": "html", "orderable": false, render: function () {
               return '<i class="fa-solid fa-cart-shopping shopping-cart"></i>'
          }
       };
        var cartnum_col={"type": "html", "orderable": false, render: function(td, data, row)
            {
                return ('<span class="cartnum cartnum_style">'+row[1]+'</span>');
            }};
        var collection_col = {"type": "html", "orderable": true, render: function (td, data, row){
             return '<span id="'+row[0]+'" class="collection_name value">'+row[3]+'</span>\n' +
                 '<span><i class="collection_info fa-solid fa-info-circle" value="'+row[0]+'" data-filter-display-val="'+row[3]+'"></i></span>'+
                 ' <a class="copy-this" role="button" content="' + row[0] +
                 '" title="Copy the IDC collection_id to the clipboard"><i class="fa-solid fa-copy"></i></a>'
               }};
        var case_col = { "type": "num", orderable: true };
        var dyn_case_col = {
            "type": "num",
            orderable: true,
            "createdCell": function (td, data, row) {
                $(td).attr('id', 'patient_col_' + row[0]);
                return;
            }
        };

        return [caret_col, cart_col, cartnum_col, collection_col, case_col, dyn_case_col];
    }

     const setRowCartClasses = function(row){
            if ( parseInt($(row).attr('series_in_cart'))>0)
            {
                $(row).addClass('someInCart');
            }
            else{
                $(row).removeClass('someInCart');
            }

            if ( parseInt($(row).attr('series_in_cart'))<parseInt($(row).attr('mxseries')))
            {
                $(row).addClass('extraInItem');
            }
            else{
                $(row).removeClass('extraInItem');
            }

            if ( parseInt($(row).attr('series_in_filter'))>parseInt($(row).attr('series_in_filter_and_cart'))){
                $(row).addClass('extraInFilter');
            }
            else{
                $(row).removeClass('extraInFilter');
            }


        }


    // creates the project or collection table  on document load and after filtering. Defines the chevron and cart selection actions
    window.updateProjectTable = function(collectionData,collectionStats, cartStats) {
        var newCollectionData = []

        for (var collecid = 0;collecid<collectionData.length;collecid++) {
            var cur = collectionData[collecid];
            var projid = cur[0];
            var lclstats = {}
            if (('patient_per_collec' in collectionStats) && (projid in collectionStats['patient_per_collec'])) {
                lclstats['mxcases'] = collectionStats['patient_per_collec'][projid]
                lclstats['cases_in_filter'] = collectionStats['patient_per_collec'][projid]
            } else {
                lclstats['mxcases'] = 0
                lclstats['cases_in_filter']=0
            }
            if (('study_per_collec' in collectionStats) && (projid in collectionStats['study_per_collec'])) {
                lclstats['mxstudies'] = collectionStats['study_per_collec'][projid]
                lclstats['studies_in_filter'] = collectionStats['study_per_collec'][projid];
            } else {
                lclstats['mxstudies'] = 0;
                lclstats['studies_in_filter']=0
            }
            if (('series_per_collec' in collectionStats) && (projid in collectionStats['series_per_collec'])) {
                //stats['mxseries'] = collectionStats['series_per_collec'][projid]
                lclstats['series_in_filter']=collectionStats['series_per_collec'][projid];
            } else {
                lclstats['mxseries'] = 0
                lclstats['series_in_filter'] =0;
            }
            lclstats['mxseries']=stats['series_per_collec'][projid]

            var items = ["cases", "studies", "series"]
            for (var itemid = 0; itemid < 3; itemid++) {
                var item = items[itemid];
                    if (projid in cartStats) {

                    if ((projid in cartStats) && ('unique_' + item in cartStats[projid])) {
                        lclstats[item + "_in_filter"] = cartStats[projid]['unique_' + item ]
                    } else {
                        lclstats[item + "_in_filter"] = 0;
                    }
                    if ((projid in cartStats) && ('unique_' + item + '_cart' in cartStats[projid])) {
                        lclstats[item + "_in_cart"] = cartStats[projid]['unique_' + item + '_cart'];
                    } else {
                        lclstats[item + "_in_cart"] = 0
                    }
                    if ((projid in cartStats) && ('unique_' + item + '_filter_and_cart' in cartStats[projid])) {
                        lclstats[item + '_in_filter_and_cart'] = cartStats[projid]['unique_' + item + '_filter_and_cart'];
                    } else {
                        lclstats[item + '_in_filter_and_cart'] = 0;
                    }

                   }

                  else{
                  lclstats[item + '_in_cart'] = 0;
                  lclstats[item + '_in_filter_and_cart'] = 0;
                  //stats[item + '_in_filter'] = 0;
                  }
            }

            var ncur=[cur[0], lclstats["series_in_cart"], cur[0], cur[1],cur[2],cur[3],lclstats];
            newCollectionData.push(ncur);
        }


        $('#proj_table').DataTable().destroy();
        $("#proj_table_wrapper").find('.dataTables_controls').remove();
        var colDefs = projectTableColDefs();
        var columns = projectTableColumns();
        var ord = [[3, "asc"]]

        $('#proj_table').DataTable(
            {
                "dom": '<"dataTables_controls"ilpf>rt<"bottom"><"clear">',
                "order": ord,
                "data": newCollectionData,
                "createdRow": function (row, data, dataIndex) {
                    $(row).data('projectid', data[0]);
                    $(row).attr('data-projectid', data[0]);
                    $(row).data('totalcases', data[5]);
                    $(row).attr('totalcases', data[5]);
                    $(row).attr('id', 'project_row_' + data[0]);
                    var projid = data[0];
                    // stats is created from the explorer data page when the page is first created
                    // collectionStats are stats for the current filter
                    //cartStats where applicable are cart related stats
                    var stats = data[6];


                    for (var stat in stats){
                        $(row).attr(stat,stats[stat]);
                    }
                    setRowCartClasses(row);

                    $(row).on('click', function(event) {
                        handleRowClick("collections", row, event, [projid])

                    });

                     $(row).find('.collection_info').on("mouseenter", function(e){
                        $(e.target).addClass('fa-lg');
                        $(e.target).parent().parent().data("clickForInfo",false);;
                      });

                   $(row).find('.collection_info').on("mouseleave", function(e){
                      $(e.target).parent().parent().data("clickForInfo",false);
                      $(e.target).removeClass('fa-lg');
                    });
                },
                "columnDefs":[ ...colDefs],
                "columns":[...columns]
            }
        );
        $('#proj_table').children('tbody').attr('id', 'projects_table');
        $('#projects_table_head').find('th').each(function() {
            this.style.width = null;
        });
    }


    window.getProjectCartStats = function(projidArr){
        var parsedFiltObj = filterutils.parseFilterObj();
        parsedFiltObj.collection_id = projidArr;
        var ndic={'filters':JSON.stringify(parsedFiltObj),}

        ndic['partitions'] = JSON.stringify(window.partitions);
        ndic['filtergrp_list'] = JSON.stringify(window.filtergrp_list);
        ndic['sort'] = 'collection_id';
        ndic['sortdir']='asc';

        var url = encodeURI('/tables/collections/')
        var csrftoken = $.getCookie('csrftoken');
        let deferred = $.Deferred();
        $.ajax({
            url: url,
            dataType: 'json',
            data: ndic,
            type: 'post',
            contentType: 'application/x-www-form-urlencoded',
            beforeSend: function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
            success: function (data) {
                try {
                  ret = data['res'];
                } catch(err){
                    console.log('error processing data');
                    alert("There was an error processing the server data. Please alert the systems administrator")
                } finally {
                    deferred.resolve(ret);

                }
            }, error: function () {
                console.log("problem getting data");
            }
        });
         return deferred.promise();

    }


    const caseTableColDefs = function(){
        return [
            {className: "ckbx studyview","targets": [0]},
            {className: "ckbx shopping-cart-holder", "targets": [1]},
            {className: "ckbx cartnumholder", "targets":[2]},
            {className: "col1 project-name", "targets": [3]},
            {className: "col1 case-id", "targets": [4]},
            {className: "col1 numrows", "targets": [5]},
            {className: "col1", "targets": [6]}];
    };

    const caseTableColumns = function() {
        const caret_col = {
            "type": "html", "orderable": false, "data":"PatientID", render: function (PatientID, type, row) {
                collection_id=row['collection_id'][0]
                if ((collection_id in window.openCases) && (PatientID in window.openCases[collection_id]) ) {
                    //return '<input type="checkbox" checked>'
                   return '<a role="button">'+
                        '<i class="fa fa-solid fa-caret-right is-hidden" style="font-family :\'Font Awesome 6 Free\' !important"></i>' +
                        '<i class="fa fa-solid fa-caret-down" style="font-family :\'Font Awesome 6 Free\' !important"></i></a>'

                } else {
                    return '<a role="button" title="Display studies in this case below.">'+
                        '<i class="fa fa-solid fa-caret-right " style="font-family :\'Font Awesome 6 Free\' !important"></i>' +
                        '<i class="fa fa-solid fa-caret-down is-hidden" style="font-family :\'Font Awesome 6 Free\' !important"></i></a>'
                }
            },
            createdCell: function(td) {
                $(td).attr("title", "Display studies in this case below.");
                $(td).addClass('expansion-toggle');
                if ($(td).find('.fa-caret-right.is-hidden').length > 0) {
                    $(td).addClass('open');
                }
            }
        };

       var cart_col = {"type": "html", "orderable": false, render: function () {
               return '<i class="fa-solid fa-cart-shopping shopping-cart"></i>'
          }
       };

        const cart_col_ck= {"type": "html", "orderable": false, render: function () {
               return '<input class="sel-item shopping-cart" type="checkbox">'
          }
        };

        const cartnum_col= {
            "type": "html", "orderable": false, "data": "PatientID", render: function (data, type, row) {
                var nm=0
                if ('unique_series_cart' in row) {
                    nm=row['unique_series_cart']
                }
                return ('<span class="cartnum cartnum_style">'+nm+'</span>');
            }

        };
        const collection_col =  {"type": "text", "orderable": true, data: 'collection_id', render: function (data)
            {
                var projectNm = $('#' + data).filter('.collection_name')[0].innerText; return projectNm;}}
        const case_col = {"type": "text", "orderable": true, data: 'PatientID', render: function (data) {
            return data +
            ' <a class="copy-this" role="button" content="' + data +
                '" title="Copy Case ID to the clipboard"><i class="fa-solid fa-copy"></i></a>';
        }};
        const study_col  = {"type": "num", "orderable": true, data: 'unique_studies'};
        const series_col =  {"type": "num", "orderable": true, data: 'unique_series'};
        return [caret_col, cart_col, cartnum_col, collection_col, case_col, study_col, series_col];
    };

    // recreates the cases table when a chevron is clicked in the projects table. Defines the chevron and cart selection actions.
    // Updates data structures such as casesCache, which caches case rows to limit calls to the server, and selProjects, which stores information
    // across tables about which items are added to the cart, and which chevrons are selected
    window.updateCaseTable = function(rowsAdded,caseID, table_search) {
        let updatePromise = $.Deferred();
        viewedProjects =Object.keys(window.openProjects);
        if ($('#cases_tab_wrapper').find('.dataTables_controls').length>0){
            pageRows = parseInt($('#cases_tab_wrapper').find('.dataTables_length select').val());
        } else {
            pageRows = 10;
        }
        var ord = [[4, 'asc'],[3, 'asc']];

        $('#cases_tab').DataTable().destroy();
        try {
            $('#cases_tab').DataTable({
                "iDisplayLength": pageRows,
                "autoWidth": false,
                "dom": '<"dataTables_controls"ilp>rt<"bottom"><"clear">',
                "order": [[4, 'asc'],[3, 'asc']],
                "createdRow": function (row, data, dataIndex) {
                    $(row).attr('id', 'case_' + data['PatientID'])
                    $(row).attr('data-projectid', data['collection_id'][0]);
                    $(row).attr('data-caseid', data['PatientID']);
                    $(row).attr('data-totalstudies', parseInt(data['unique_studies']));
                    $(row).attr('data-totalseries', parseInt(data['unique_series']));
                    $(row).addClass('text_head');
                    $(row).addClass('project_' + data['collection_id']);
                    var projid = data['collection_id'][0];
                    var caseid = data['PatientID'];

                    if ('cart_series_in_collection' in data){
                       $(row).attr('cart_series_in_collection',  data['cart_series_in_collection']);
                    }
                    else{
                        $(row).attr('cart_series_in_collection','0')
                    }

                    if ('filter_series_in_collection' in data){
                       $(row).attr('filter_series_in_collection',  data['filter_series_in_collection']);
                    }
                    else{
                        $(row).attr('filter_series_in_collection','0')
                    }
                    if ('filter_cart_series_in_collection' in data){
                       $(row).attr('filter_cart_series_in_collection',  data['filter_series_in_collection']);
                    }
                    else{
                        $(row).attr('filter_cart_series_in_collection','0')
                    }

                    var items=[ "studies", "series"]
                    for (var i=0;i<2;i++){
                        var item=items[i];

                        if ('nf_unique_'+item in data){
                           $(row).attr('mx'+item, data['nf_unique_'+item]);
                        }
                        else{
                            $(row).attr('mx'+item, data['unique_'+item]);
                        }
                        $(row).attr(item+'_in_filter', data['unique_'+item]);
                        if ('unique_'+item+'_cart' in data){
                            $(row).attr(item+'_in_cart', data['unique_'+item+'_cart']);
                        }
                        else{
                            $(row).attr(item+'_in_cart', 0);
                        }
                        if ('unique_'+item+'_filter_and_cart' in data){
                            $(row).attr(item+'_in_filter_and_cart', data['unique_'+item+'_filter_and_cart']);
                        }
                        else{
                            $(row).attr(item+'_in_filter_and_cart', 0);
                        }
                    }

                    setRowCartClasses(row);

                    $(row).on('click', function(event) {
                        handleRowClick('cases', row, event,[projid, caseid])

                    });
                },
                "columnDefs": [...caseTableColDefs()],
                "columns": [...caseTableColumns()],
                "processing": true,
                "serverSide": true,
                "ajax": function (request, callback, settings) {
                    var backendReqLength = 500;
                    var backendReqStrt = Math.max(0, request.start - Math.floor(backendReqLength * 0.5));

                    var cols = ['', '','','collection_id', 'PatientID', 'StudyInstanceUID', 'SeriesInstanceUID'];
                    var ssCallNeeded = true;
                    if (viewedProjects.length === 0) {
                        callback({"data": [], "recordsTotal": "0", "recordsFiltered": "0"})
                    } else {
                        var ret = checkClientCache(request, 'cases');
                        var ssCallNeeded = ret[0];
                        var reorderNeeded = ret[1];
                        if (ssCallNeeded) {
                            var curFilterObj = JSON.parse(JSON.stringify(filterutils.parseFilterObj()));
                            curFilterObj.collection_id = viewedProjects;
                            if (caseID.trim().length>0){
                                curFilterObj.PatientID = [caseID];
                            }
                            var filterStr = JSON.stringify(curFilterObj);


                            let url = '/tables/cases/';
                            url = encodeURI(url);
                            ndic = {'filters': filterStr, 'limit': 500}
                            ndic['partitions'] = JSON.stringify(window.partitions);
                            ndic['filtergrp_list'] = JSON.stringify(window.filtergrp_list);

                            ndic['offset'] = backendReqStrt;
                            ndic['limit'] = backendReqLength;


                            if (typeof (request.order) !== 'undefined') {
                                if (typeof (request.order[0].column) !== 'undefined') {
                                    ndic['sort'] = cols[request.order[0].column];
                                }
                                if (typeof (request.order[0].dir) !== 'undefined') {
                                    ndic['sortdir'] = request.order[0].dir;
                                }

                            }
                        ndic['table_search'] = table_search;

                        var csrftoken = $.getCookie('csrftoken');
                        $.ajax({
                            url: url,
                            dataType: 'json',
                            data: ndic,
                            type: 'post',
                            contentType: 'application/x-www-form-urlencoded',
                            beforeSend: function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                            success: function (data) {
                                try {
                                window.casesCache = new Object();
                                colSort = ["", "", "", "collection_id", "PatientID", "unique_studies", "unique_series"];
                                updateCache(window.casesCache, request, backendReqStrt, backendReqLength, data, colSort);
                                dataset = data['res'].slice(request.start - backendReqStrt, request.start - backendReqStrt + request.length);

                                callback({
                                    "data": dataset,
                                    "recordsTotal": data["cnt"],
                                    "recordsFiltered": data["cnt"]
                                  });
                                updatePromise.resolve();
                               } catch(err){
                                    console.log('error processing data');
                                    alert("There was an error processing the server data. Please alert the systems administrator")
                                   }
                                   updatePromise.reject();
                                },
                                error: function () {
                                    console.log("problem getting data");
                                    alert("There was an error fetching server data. Please alert the systems administrator")
                                    $('#cases_tab').children('thead').children('tr').children('.ckbx').addClass('notVis');
                                    callback({"data": [], "recordsTotal": "0", "recordsFiltered": "0"})
                                    updatePromise.reject();
                                }
                            });
                        } else {
                            if (reorderNeeded) {
                                reorderCacheData(window.casesCache, request, $('#cases_table_head'));
                            }
                            dataset = window.casesCache.data.slice(request.start - window.casesCache.backendReqStrt, request.start - window.casesCache.backendReqStrt + request.length);
                            window.casesCache.lastRequest = request;
                            callback({
                                "data": dataset,
                                "recordsTotal": window.casesCache.recordsTotal,
                                "recordsFiltered": window.casesCache.recordsTotal
                            });
                            updatePromise.resolve();
                        }
                    }
                }
            });
        } catch(err){
            alert("The following error occurred trying to update the case table:" +err+". Please alert the systems administrator");
            updatePromise.reject();
        }

        $('#cases_tab').on('draw.dt', function(){
            $('#cases_table_head').children('tr').children().each(function(){
                this.style.width=null;
                }
            );
        });
        $('#cases_tab').find('tbody').attr('id','cases_table');
        $('#cases_panel').find('.dataTables_controls').find('.dataTables_length').after(
            '<div class="dataTables_goto_page"><label>Page </label><input class="goto-page-number" '
            + 'type="number"><button onclick="changePage(\'cases_tab_wrapper\')">Go</button></div>'
        );
        $('#cases_panel').find('.dataTables_controls').find('.dataTables_paginate').after(
            '<div class="dataTables_filter"><strong>Find by Case ID:</strong><input class="caseID_inp '
            + 'table-search-box" data-search-type="case" type="text-box" value="'+caseID+'" maxlength="256"><button '
            + 'class="clear"><i class="fa fa-solid fa-circle-xmark"></i></button></div>'
        );
        return updatePromise;
    }

    window.updateStudyTable = function(rowsAdded, studyID, table_search) {
        let updatePromise = $.Deferred();
        let nonViewAbleModality= new Set([""]);
        var viewCases = [];
        for (projid in window.openCases) {
            viewCases = viewCases.concat(Object.keys(window.openCases[projid]));
        }
        var viewCollections = Object.keys(window.openProjects);
        if ($('#studies_tab_wrapper').find('.dataTables_controls').length>0){
            pageRows = parseInt($('#studies_tab_wrapper').find('.dataTables_length select').val());
        } else {
            pageRows = 10;
        }
        $('#studies_tab').DataTable().destroy();

        try {
            $('#studies_tab').DataTable({
                "iDisplayLength": pageRows,
                "autoWidth": false,
                "dom": '<"dataTables_controls"ilp>rt<"bottom"><"clear">',
                "order": [[3, "asc"]],
                "createdRow": function (row, data, dataIndex) {
                    $(row).attr('id', 'study_' + data['StudyInstanceUID'])
                    $(row).attr('data-studyid', data['StudyInstanceUID']);
                    $(row).attr('data-caseid', data['PatientID']);
                    $(row).attr('data-projectid', data['collection_id'][0]);
                    $(row).attr('data-totalseries', parseInt(data['unique_series']));
                    $(row).addClass('text_head');
                    $(row).addClass('project_' + data['collection_id']);
                    $(row).addClass('case_' + data['PatientID']);

                    var projid = data['collection_id'][0];
                    var caseid=data['PatientID']
                    var studyid =data['StudyInstanceUID']

                    if ('cart_series_in_collection' in data){
                       $(row).attr('cart_series_in_collection',  data['cart_series_in_collection']);
                    }
                    else{
                        $(row).attr('cart_series_in_collection','0')
                    }
                    if ('filter_series_in_collection' in data){
                       $(row).attr('filter_series_in_collection',  data['filter_series_in_collection']);
                    }
                    else{
                        $(row).attr('filter_series_in_collection','0')
                    }
                    if ('filter_cart_series_in_collection' in data){
                       $(row).attr('filter_cart_series_in_collection',  data['filter_cart_series_in_collection']);
                    }
                    else{
                        $(row).attr('filter_cart_series_in_collection','0')
                    }

                    if ('cart_series_in_case' in data){
                       $(row).attr('cart_series_in_case',  data['cart_series_in_case']);
                    }
                    else{
                        $(row).attr('cart_series_in_case','0')
                    }

                    if ('filter_series_in_case' in data){
                       $(row).attr('filter_series_in_case',  data['filter_series_in_case']);
                    }
                    else{
                        $(row).attr('filter_series_in_case','0')
                    }
                    if ('filter_cart_series_in_case' in data){
                       $(row).attr('filter_cart_series_in_case',  data['filter_cart_series_in_case']);
                    }
                    else{
                        $(row).attr('filter_cart_series_in_case','0')
                    }


                    if ('nf_unique_series' in data){
                           $(row).attr('mxseries', data['nf_unique_series']);
                        }
                        else{
                            $(row).attr('mxseries', data['unique_series']);
                        }
                        $(row).attr('series_in_filter', data['unique_series']);
                        if ('unique_series_cart' in data){
                            $(row).attr('series_in_cart', data['unique_series_cart']);
                        }
                        else{
                            $(row).attr('series_in_cart', 0);
                        }
                        if ('unique_series_filter_and_cart' in data){
                            $(row).attr('series_in_filter_and_cart', data['unique_series_filter_and_cart']);
                        }
                        else{
                            $(row).attr('series_in_filter_and_cart', 0);
                        }

                    setRowCartClasses(row);

                    var cnt = 0;
                    var content = ""
                    var ids = [projid, caseid, studyid]
                    $(row).on('click', function(event) {
                        handleRowClick("studies", row, event, ids);
                    });
                },
                "columnDefs": [
                    {className: "ckbx seriesview", "targets": [0]},
                    {className: "ckbx shopping-cart-holder", "targets": [1]},
                    {className: "ckbx cartnumholder", "targets": [2]},
                    {className: "col1 case-id", "targets": [3]},
                    {className: "col2 study-id study-id-col study-id-tltp", "targets": [4]},
                    {className: "col1 study-date", "targets": [5]},
                    {className: "col1 study-description", "targets": [6]},
                    {className: "col1 numrows", "targets": [7]},
                    {className: "ohif open-viewer", "targets": [8]},
                    {className: "download-col", "targets": [9]},
                ],
                "columns": [
                    {
                        "type": "html",
                        "orderable": false,
                        "data": "StudyInstanceUID",
                        render: function (StudyInstanceUID, type, row) {
                            var PatientID= row['PatientID']
                            var collection_id=row['collection_id']
                            if ( (PatientID in window.openStudies) && (StudyInstanceUID in window.openStudies[PatientID])) {
                                //return '<input type="checkbox" checked>'
                               return '<a role="button">'+
                                    '<i class="fa fa-solid fa-caret-right is-hidden" style="font-family :\'Font Awesome 6 Free\' !important"></i>' +
                                    '<i class="fa fa-solid fa-caret-down" style="font-family :\'Font Awesome 6 Free\' !important"></i></a>'

                            } else {
                                return '<a role="button">'+
                                    '<i class="fa fa-solid fa-caret-right " style="font-family :\'Font Awesome 6 Free\' !important"></i>' +
                                    '<i class="fa fa-solid fa-caret-down is-hidden" style="font-family :\'Font Awesome 6 Free\' !important"></i></a>'

                            }
                        },
                        createdCell: function(td) {
                            $(td).attr("title", "Display series in this study below.");
                            $(td).addClass('expansion-toggle');
                            if ($(td).find('.fa-caret-right.is-hidden').length > 0) {
                                $(td).addClass('open');
                            }
                        }
                    },
                   {
                       "type": "html",
                       "orderable": false,
                       render: function () {
                            return '<i class="fa-solid fa-cart-shopping shopping-cart"></i>'

                       }
                    }, {
                        "type": "html", "orderable": false, "data": "StudyInstanceUID", render: function (data, type, row) {
                            var cnt =0;
                           if ('unique_series_cart' in row) {
                              cnt =row['unique_series_cart']
                           }

                            return '<span class="cartnum cartnum_style">'+cnt.toString()+'</span>'
                        }
                    }, {
                        "type": "text", "orderable": true, data: 'PatientID', render: function (data) {
                            return data;
                        }
                    }, {
                        "type": "text", "orderable": true, data: 'StudyInstanceUID', render: function (data) {
                            return pretty_print_id(data) +
                            ' <a class="copy-this" role="button" content="' + data +
                                '" title="Copy Study ID to the clipboard"><i class="fa-solid fa-copy"></i></a>';
                        },
                        "createdCell": function (td, data) {
                            $(td).data('study-id', data);
                            return;
                        }
                    }, {
                        "type": "text", "orderable": true, data: 'StudyDate', render: function (data) {
                            // fix when StudyData is an array of values
                            var dt = new Date(Date.parse(data));
                            var dtStr = (dt.getUTCMonth() + 1).toLocaleString('en-US', {minimumIntegerDigits: 2}) + "-" + dt.getUTCDate().toLocaleString('en-US', {minimumIntegerDigits: 2}) + "-" + dt.getUTCFullYear().toString();
                            return dtStr;
                        }
                    },
                    {"type": "num", "orderable": true, data: 'StudyDescription'},
                    {"type": "num", "orderable": true, data: 'unique_series'},
                    {
                        "type": "html",
                        "orderable": false,
                        data: 'StudyInstanceUID',
                        render: function (data, type, row) {
                            var coll_id="";
                            if (Array.isArray(row['collection_id'])){
                                coll_id=row['collection_id'][0];
                            } else {
                                coll_id=row['collection_id']
                            }
                            if (row['access'].includes('Limited') ) {
                                return '<i class="fa-solid fa-circle-minus coll-explain"></i>';
                            } else {
                                let modality = row['Modality'];
                                let is_xc = (modality === "XC" || (Array.isArray(modality) && modality.includes("XC")));

                                if (( Array.isArray(modality) && modality.includes('SM')) || (modality === 'SM')) {
                                    return '<a href="' + SLIM_VIEWER_PATH + data + '" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-eye"></i>'
                                 } else {
                                    let v2_link = is_xc ? "" : OHIF_V2_PATH + data;
                                    let v3_link = OHIF_V3_PATH + "=" + data;
                                    let v2_element = '<li title="Not available for this modality."><a class="disabled" href="'
                                        + v2_link + '" target="_blank" rel="noopener noreferrer">OHIF v2</a></li>';
                                    let default_viewer = v3_link;
                                    let volView_element = '<li title="VolView is disabled for this Study."><a class="disabled">VolView ' +
                                        '<i class="fa-solid fa-external-link external-link-icon" aria-hidden="true">' +
                                        '</a></li>';
                                    let bucket = Array.isArray(row['aws_bucket']) ? row['aws_bucket'][0] : row['aws_bucket'];
                                    if(!is_xc) {
                                        if(bucket.indexOf(",") < 0) {
                                            let volView_link = VOLVIEW_PATH + "=[" + row['crdc_series_uuid'].map(function (i) {
                                                return "s3://" + row['aws_bucket'] + "/" + i;
                                            }).join(",") + ']"';
                                            volView_element = '<li><a class="external-link" href="" url="'+volView_link+'" ' +
                                                'data-toggle="modal" data-target="#external-web-warning">VolView ' +
                                                '<i class="fa-solid fa-external-link external-link-icon" aria-hidden="true">' +
                                                '</a></li>';
                                        }
                                        v2_element = '<li><a href="'+v2_link+'" target="_blank" rel="noopener noreferrer">OHIF v2</a></li>';
                                    }
                                    return '<a href="' + default_viewer + '" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-eye"></i>' +
                                        '<div class="dropdown viewer-toggle">' +
                                        '<a class="dropdown-toggle btnGroupDropViewers" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true"><i class="fa-solid fa-caret-down"></i></a>' +
                                        '<ul class="dropdown-menu viewer-menu">' +
                                        '<li><a href="'+v3_link+'" target="_blank" rel="noopener noreferrer">OHIF v3</a></li>' +
                                        v2_element +
                                        volView_element +
                                        '</ul>' +
                                        '</div>';
                                }
                            }
                        }
                    }, {
                          "type":"html",
                          "orderable": false,
                          data: 'StudyInstanceUID', render: function (data, type, row){
                              return '<i class="fa fa-download study-export export-button" data-series-count="'+row['unique_series']
                                  +'" data-uid="'+data+'"data-toggle="modal" data-target="#export-manifest-modal"></i>'
                          }
                      }
                ],
                "processing": true,
                "serverSide": true,
                "ajax": function (request, callback, settings) {
                    var backendReqLength = 500;
                    var backendReqStrt = Math.max(0, request.start - Math.floor(backendReqLength * 0.5));
                    var cols = ['', '', 'PatientID', 'StudyInstanceUID', 'StudyDate','StudyDescription', 'SeriesInstanceUID'];
                    var ssCallNeeded = true;

                    if (viewCases.length === 0) {
                        ssCallNeeded = false;
                        callback({"data": [], "recordsTotal": "0", "recordsFiltered": "0"});
                        updatePromise.resolve();
                    } else {
                        var ret = checkClientCache(request, 'studies');
                        ssCallNeeded = ret[0];
                        var reorderNeeded = ret[1];
                        if (ssCallNeeded) {
                            var curFilterObj = filterutils.parseFilterObj();
                            curFilterObj.collection_id = viewCollections;
                            curFilterObj.PatientID = viewCases;
                            if (studyID.trim().length > 0) {
                                curFilterObj.StudyInstanceUID = [studyID];

                            }
                            var filterStr = JSON.stringify(curFilterObj);
                            let url = '/tables/studies/';
                            url = encodeURI(url);
                            ndic = {'filters': filterStr, 'limit': 2000}
                            ndic['offset'] = backendReqStrt;
                            ndic['limit'] = backendReqLength;
                            if (typeof (request.order) !== 'undefined') {
                                if (typeof (request.order[0].column) !== 'undefined') {
                                    ndic['sort'] = cols[request.order[0].column];
                                }
                               if (typeof (request.order[0].dir) !== 'undefined') {
                                   ndic['sortdir'] = request.order[0].dir;
                               }
                            }
                            ndic['partitions'] = JSON.stringify(window.partitions);
                            ndic['filtergrp_list'] = JSON.stringify(window.filtergrp_list);
                            ndic['table_search'] = table_search;
                            let csrftoken = $.getCookie('csrftoken');

                            $.ajax({
                                url: url,
                                dataType: 'json',
                                data: ndic,
                                type: 'post',
                                contentType: 'application/x-www-form-urlencoded',
                                beforeSend: function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                                success: function (data) {
                                    try {
                                        window.studiesCache = new Object();
                                        colSort = ["", "", "PatientID", "StudyInstanceUID","StudyDate","StudyDescription","unique_series"]
                                        updateCache(window.studiesCache, request, backendReqStrt, backendReqLength, data, colSort);
                                        dataset = data['res'].slice(request.start - backendReqStrt, request.start - backendReqStrt + request.length);

                                        callback({
                                            "data": dataset,
                                            "recordsTotal": data["cnt"],
                                            "recordsFiltered": data["cnt"]
                                        });
                                        updatePromise.resolve();
                                    } catch(err){
                                      console.log('error processing data');
                                      alert("There was an error processing the server data. Please alert the systems administrator");
                                      updatePromise.reject();
                                   }
                                },
                                error: function () {
                                    console.log("problem getting data");
                                    alert("There was an error fetching server data. Please alert the systems administrator");
                                    callback({"data": [], "recordsTotal": "0", "recordsFiltered": "0"});
                                    updatePromise.reject();
                                }
                            });
                        } else {
                            if (reorderNeeded) {
                                reorderCacheData(window.studiesCache, request, $('#studies_table_head'));
                            }
                            dataset = window.studiesCache.data.slice(request.start - window.studiesCache.backendReqStrt, request.start - window.studiesCache.backendReqStrt + request.length);
                            window.studiesCache.lastRequest = request;
                            callback({
                                "data": dataset,
                                "recordsTotal": window.studiesCache.recordsTotal,
                                "recordsFiltered": window.studiesCache.recordsTotal
                            });
                            updatePromise.resolve();
                        }
                    }
                }
            });
        } catch(err){
            alert("The following error error was reported when processing server data: "+ err +". Please alert the systems administrator");
            updatePromise.reject();
        }

        $('#studies_tab').on('draw.dt', function(){
            $('#studies_table_head').children('tr').children().each(function(){
                this.style.width=null;
                }
            );
        })

        $('#studies_tab').children('tbody').attr('id','studies_table');
        $('#studies_tab_wrapper').find('.dataTables_controls').find('.dataTables_length').after(
            '<div class="dataTables_goto_page"><label>Page </label><input class="goto-page-number" type="number">'
            +'<button onclick="changePage(\'studies_tab_wrapper\')">Go</button></div>'
        );
        $('#studies_tab_wrapper').find('.dataTables_controls').find('.dataTables_paginate').after(
            '<div class="dataTables_filter"><strong>Find by Study Instance UID:</strong><input data-search-type="study"'
            + ' class="studyID_inp table-search-box" type="text-box" value="'+studyID+'" maxlength="256"><button '
            + 'class="clear"><i class="fa fa-solid fa-circle-xmark"></i></button></div>'
        );
        return updatePromise;
    }

    window.updateSeriesTable = function(rowsAdded, seriesID, table_search) {
        let updatePromise = $.Deferred();
        var nonViewAbleModality= new Set(["PR","SEG","RTSTRUCT","RTPLAN","RWV", "SR", "ANN"])
        var slimViewAbleModality=new Set(["SM"])
        viewStudies = []
        for (caseid in window.openStudies){
            viewStudies = viewStudies.concat(Object.keys(window.openStudies[caseid]));
        }
        if ($('#series_tab_wrapper').find('.dataTables_controls').length>0){
            pageRows = parseInt($('#series_tab_wrapper').find('.dataTables_length select').val());
        } else {
            pageRows = 10;
        }
        $('#series_tab').DataTable().destroy();
        try {
            $('#series_tab').DataTable({
                "iDisplayLength": pageRows,
                 "autoWidth": false,
                 "dom": '<"dataTables_controls"ilp>rt<"bottom"><"clear">',
                 "order": [[0, "asc"]],
                 "createdRow": function (row, data, dataIndex) {
                    $(row).attr('id', 'series_' + data['SeriesInstanceUID'])
                    $(row).attr('data-studyid', data['StudyInstanceUID']);
                    $(row).attr('data-caseid', data['PatientID']);
                    $(row).attr('data-projectid', data['collection_id'][0]);
                    $(row).attr('data-crdc',  data['crdc_series_uuid'])
                    $(row).attr('data-aws',  data['aws_bucket'])
                    $(row).attr('data-gcs',  data['gcs_bucket'])
                    $(row).addClass('text_head');

                    $(row).attr('data-aws',  data['aws_bucket'])

                     if ('cart_series_in_collection' in data){
                       $(row).attr('cart_series_in_collection',  data['cart_series_in_collection']);
                    } else{
                        $(row).attr('cart_series_in_collection','0')
                    }
                    if ('filter_series_in_collection' in data){
                       $(row).attr('filter_series_in_collection',  data['filter_series_in_collection']);
                    } else {
                        $(row).attr('filter_series_in_collection','0')
                    }
                    if ('filter_cart_series_in_collection' in data){
                       $(row).attr('filter_cart_series_in_collection',  data['filter_cart_series_in_collection']);
                    } else {
                        $(row).attr('filter_cart_series_in_collection','0')
                    }

                    if ('cart_series_in_case' in data){
                       $(row).attr('cart_series_in_case',  data['cart_series_in_case']);
                    } else {
                        $(row).attr('cart_series_in_case','0')
                    }
                    if ('filter_series_in_case' in data){
                       $(row).attr('filter_series_in_case',  data['filter_series_in_case']);
                    } else {
                        $(row).attr('filter_series_in_case','0')
                    }
                    if ('filter_cart_series_in_case' in data){
                       $(row).attr('filter_cart_series_in_case',  data['filter_cart_series_in_case']);
                    } else {
                        $(row).attr('filter_cart_series_in_case','0')
                    }

                    if ('cart_series_in_study' in data){
                       $(row).attr('cart_series_in_study',  data['cart_series_in_study']);
                    } else {
                        $(row).attr('cart_series_in_study','0')
                    }
                    if ('filter_series_in_study' in data){
                       $(row).attr('filter_series_in_study',  data['filter_series_in_study']);
                    }
                    else{
                        $(row).attr('filter_series_in_study','0')
                    }
                    if ('filter_cart_series_in_study' in data){
                       $(row).attr('filter_cart_series_in_study',  data['filter_cart_series_in_study']);
                    }
                    else{
                        $(row).attr('filter_cart_series_in_study','0')
                    }


                    var collection_id=data['collection_id'][0];
                    var PatientID=data['PatientID'];
                    var studyid= data['StudyInstanceUID'];
                    var seriesid = data['SeriesInstanceUID'];
                    if (('unique_series_cart' in data) && (data['unique_series_cart']>0)) {
                        $(row).attr('series_in_cart','1');
                        $(row).attr('series_in_filter_and_cart','1');
                        $(row).addClass('someInCart');
                    }
                    else{
                        $(row).attr('series_in_cart','0');
                        $(row).attr('series_in_filter_and_cart','0')
                        $(row).removeClass('someInCart');
                    }
                    $(row).attr('series_in_filter','1');


                     $(row).find('.shopping-cart').parent().on('click', function(event){
                         $(row).find('.shopping-cart-holder').trigger('shopping-cart:update-started');
                            var elem = event.target;
                            if ($(elem).hasClass('ckbx')){
                                elem=$(elem).find('.shopping-cart')[0];
                            }
                             handleCartClick("series", row, elem, [collection_id,PatientID,studyid, seriesid]);

                    });
                 },
                "columnDefs": [
                    {className: "ckbx shopping-cart-holder", "targets": [0]},
                    {className: "col1 study-id study-id-col study-id-tltp", "targets": [1]},
                    {className: "series-id series-id-tltp", "targets": [2]},
                    {className: "series-number", "targets": [3]},
                    {className: "col1 modality", "targets": [4]},
                    {className: "col1 body-part-examined", "targets": [5]},
                    {className: "series-description", "targets": [6]},
                    {className: "ohif open-viewer", "targets": [7]},
                    {className: "download-col", "targets": [8]},

                 ],
                  "columns": [
                      {"type": "html", "orderable": false, render: function () {
                       return '<i class="fa-solid fa-cart-shopping shopping-cart"></i>'

                  }
               },

                  {
                    "type": "text", "orderable": true, data: 'StudyInstanceUID', render: function (data) {
                        return pretty_print_id(data) +
                            ' <a class="copy-this" role="button" content="' + data +
                                '"  title="Copy Study ID to the clipboard"><i class="fa-solid fa-copy"></i></a>';
                    }, "createdCell": function (td, data) {
                        $(td).data('study-id', data);
                        return;
                    }
                }, {
                    "type": "text", "orderable": true, data: 'SeriesInstanceUID', render: function (data) {
                        return pretty_print_id(data) +
                            ' <a class="copy-this" role="button" content="' + data +
                                '"  title="Copy Series ID to the clipboard"><i class="fa-solid fa-copy"></i></a>';
                    }, "createdCell": function (td, data) {
                        $(td).data('series-id', data);
                        return;
                    }
                },
                {"type": "num", "orderable": true, data: 'SeriesNumber'},
                {"type": "text", "orderable": true, data: 'Modality'},
                {"type": "text", "orderable": true, data: 'BodyPartExamined'},
                {
                    "type": "text", "orderable": true, data: 'SeriesDescription', render: function (data) {
                        if (data.length > 1) {
                            return data[0] + ',...';
                        } else if (data.length === 1) {
                            return data[0];
                        } else {
                            return '';
                        }
                    },
                    "createdCell": function (td, data) {
                        if (data.length > 1) {
                            $(td).attr('data-description', data);
                            $(td).addClass('description-tip');
                            return;

                        }
                    },
                }, {
                    "type": "html",
                    "orderable": false,
                    data: 'SeriesInstanceUID',
                    render: function (data, type, row) {
                        var coll_id="";
                        let modality = row['Modality'];
                        let is_xc = (modality === "XC" || (Array.isArray(modality) && modality.includes("XC")));
                        if (Array.isArray(row['collection_id'])){
                            coll_id=row['collection_id'][0];
                        } else {
                            coll_id=row['collection_id']
                        }
                        if (row['access'].includes('Limited') ) {
                            return '<i class="fa-solid fa-circle-minus coll-explain"></i>';
                        }
                        else if ( (Array.isArray(row['Modality']) && row['Modality'].some(function(el){
                            return nonViewAbleModality.has(el)
                        }) ) || nonViewAbleModality.has(row['Modality']) )   {
                            let tooltip = "no-viewer-tooltip";
                            return `<a href="/" onclick="return false;"><i class="fa-solid fa-eye-slash ${tooltip}"></i>`;
                        } else if (  ( Array.isArray(row['Modality']) && row['Modality'].some(function(el){
                            return slimViewAbleModality.has(el)}
                        ) ) || (slimViewAbleModality.has(row['Modality']))) {
                            return '<a href="' + SLIM_VIEWER_PATH + row['StudyInstanceUID'] + '/series/' + data +
                                '" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-eye"></i>'
                        } else {
                            let v2_link = is_xc ? "" : OHIF_V2_PATH + row['StudyInstanceUID'] + '?SeriesInstanceUID=' + data;
                            let v3_link = OHIF_V3_PATH + "=" + row['StudyInstanceUID'] + '&SeriesInstanceUIDs=' + data;
                            let default_viewer = v3_link;
                            let volView_link = is_xc ? "" : VOLVIEW_PATH + "=[s3://" + row['aws_bucket'] + '/' + row['crdc_series_uuid']+']"';
                            let v2_element = '<li title="Not available for this modality."><a class="disabled" href="'
                                + v2_link + '" target="_blank" rel="noopener noreferrer">OHIF v2</a></li>';
                            let volView_element = '<li title="VolView is disabled for this Study."><a class="disabled">VolView ' +
                                        '<i class="fa-solid fa-external-link external-link-icon" aria-hidden="true">' +
                                        '</a></li>';
                            if(!is_xc) {
                                v2_element = '<li><a href="' + v2_link + '" target="_blank" rel="noopener noreferrer">OHIF v2</a></li>';
                                volView_element = '<li><a class="external-link" href="" url="' + volView_link + '" ' +
                                    'data-toggle="modal" data-target="#external-web-warning">VolView ' +
                                    '<i class="fa-solid fa-external-link external-link-icon" aria-hidden="true">' +
                                    '</a></li>';
                            }

                            return '<a href="' + default_viewer + '" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-eye"></i>' +
                                '<div class="dropdown viewer-toggle">' +
                                '<a class="dropdown-toggle btnGroupDropViewers" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true"><i class="fa-solid fa-caret-down"></i></a>' +
                                '<ul class="dropdown-menu viewer-menu">' +
                                '<li><a href="'+v3_link+'" target="_blank" rel="noopener noreferrer">OHIF v3</a></li>' +
                                v2_element +
                                volView_element +
                                '</ul></div>';
                        }
                    }
                }, {
                      "type":"html",
                      "orderable": false,
                      data: 'SeriesInstanceUID', render: function (data){
                          return '<i class="fa fa-download series-export export-button" data-uid="'+data+'"data-toggle="modal" data-target="#export-manifest-modal"></i>'
                      }
                  }
            ],
            "processing": true,
            "serverSide": true,
            "ajax": function (request, callback, settings, refreshAfterFilter) {
                     var backendReqLength = 500;

                var backendReqStrt = Math.max(0, request.start - Math.floor(backendReqLength * 0.5));

                var cols = ['StudyInstanceUID', 'SeriesInstanceUID','SeriesNumber', 'Modality', 'BodyPartExamined', 'SeriesDescription']
                var ssCallNeeded = true;


                if (viewStudies.length == 0) {
                    ssCallNeeded = false;
                    $('#series_tab').children('thead').children('tr').children('.ckbx').addClass('notVis');
                    callback({"data": [], "recordsTotal": "0", "recordsFiltered": "0"});
                    updatePromise.resolve();
                } else {
                    var ret = checkClientCache(request, 'series');
                    ssCallNeeded = ret[0]
                    var reorderNeeded = ret[1];

                    if (ssCallNeeded) {
                        var curFilterObj = new Object();

                        curFilterObj.StudyInstanceUID = viewStudies;
                        if (seriesID.trim().length > 0) {
                                curFilterObj.SeriesInstanceUID = [seriesID];
                        }
                        var filterStr = JSON.stringify(curFilterObj);

                        let url = '/tables/series/';
                        url = encodeURI(url);
                        ndic = {'filters': filterStr, 'limit': 2000}

                        ndic['offset'] = backendReqStrt;
                        ndic['limit'] = backendReqLength;

                        if (typeof (request.order) !== 'undefined') {
                            if (typeof (request.order[0].column) !== 'undefined') {
                                ndic['sort'] = cols[request.order[0].column];
                            }
                            if (typeof (request.order[0].dir) !== 'undefined') {
                                ndic['sortdir'] = request.order[0].dir;
                            }
                        }
                         ndic['partitions'] = JSON.stringify(window.partitions);
                        ndic['filtergrp_list'] = JSON.stringify(window.filtergrp_list);
                        ndic['table_search'] = table_search;
                        var csrftoken = $.getCookie('csrftoken');
                        $.ajax({
                            url: url,
                            dataType: 'json',
                            data: ndic,
                            type: 'post',
                            contentType: 'application/x-www-form-urlencoded',
                            beforeSend: function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                            success: function (data) {
                                try {
                                    window.seriesCache = new Object();
                                    var colSort = ['StudyInstanceUID', 'SeriesInstanceUID', 'SeriesNumber', 'Modality', 'BodyPartExamined', 'SeriesDescription']
                                    updateCache(window.seriesCache, request, backendReqStrt, backendReqLength, data, colSort)
                                    dataset = data['res'].slice(request.start - backendReqStrt, request.start - backendReqStrt + request.length);

                                    callback({
                                        "data": dataset,
                                        "recordsTotal": data["cnt"],
                                        "recordsFiltered": data["cnt"]
                                    });
                                    updatePromise.resolve();
                                }
                                catch(err){
                                  console.log('error processing data');
                                   alert("There was an error processing the server data. Please alert the systems administrator");
                                   updatePromise.reject();
                                }
                            },
                            error: function () {
                                console.log("problem getting data");
                                alert("There was an error fetching server data. Please alert the systems administrator")
                                $('#series_tab').children('thead').children('tr').children('.ckbx').addClass('notVis');
                                callback({"data": [], "recordsTotal": "0", "recordsFiltered": "0"});
                                updatePromise.reject();
                            }
                        });
                    } else {
                        if (reorderNeeded) {
                            reorderCacheData(window.seriesCache, request, $('#series_table_head'));
                        }
                        dataset = window.seriesCache.data.slice(request.start - window.seriesCache.backendReqStrt, request.start - window.seriesCache.backendReqStrt + request.length);
                        window.seriesCache.lastRequest = request;
                        callback({
                            "data": dataset,
                            "recordsTotal": window.seriesCache.recordsTotal,
                            "recordsFiltered": window.seriesCache.recordsTotal
                        });
                        updatePromise.resolve();
                    }
                }
              }
           });
        }
        catch(err){
            alert("The following nerror was reported when processing server data: "+ err +". Please alert the systems administrator");
            updatePromise.reject();
        }

        $('#series_tab').on('draw.dt', function(){
            $('#series_table_head').children('tr').children().each(function(){
                this.style.width=null;
            });
        });
        $('#series_tab').children('tbody').attr('id','series_table');
        $('#series_tab_wrapper').find('.dataTables_controls').find('.dataTables_length').after(
            '<div class="dataTables_goto_page"><label>Page </label><input class="goto-page-number" type="number">'
            +'<button onclick="changePage(\'series_tab_wrapper\')">Go</button></div>'
        );
        $('#series_tab_wrapper').find('.dataTables_controls').find('.dataTables_paginate').after(
            '<div class="dataTables_filter"><strong>Find by Series Instance UID:</strong><input '
            +'class="seriesID_inp table-search-box" type="text-box" data-search-type="series" value="'
            +seriesID+'" maxlength="256"><button class="clear"><i class="fa fa-solid fa-circle-xmark"></i></button></div>'
        );
        return updatePromise;
    }

    let SEARCH_QUEUE = [];
    let SEARCH_PENDING = false;
    let update_search_thread = null;
    let SUBSEQUENT_DELAY = 400;
    let update_methods = {
        'caseID': window.updateCaseTable,
        'seriesID': window.updateSeriesTable,
        'studyID': window.updateStudyTable
    };
    let Last_searches = {
        'caseID': null,
        'studyID': null,
        'seriesID': null
    };

    function enqueueSearch(panel, id, input){
        SEARCH_QUEUE.push(function(){
            filterTable(panel, id, input)
        });
    }

    function dequeueSearch(){
        if(SEARCH_QUEUE.length > 0) {
            SEARCH_QUEUE.shift()();
        }
    }

    // Filter a table based on the case/series/study ID search
    // A call to this method will result in a SUBSEQUENT_DELAY pause before execution begins. Subsequent calls will
    // clear this timeout if they arrive before SUBSEQUENT_DELAY has run down, thus waiting until the triggering event
    // stops long enough for the callback to begin. Any calls sent in after the callback fires will see one call
    // queued and the others ignored, so that only a single call fires once the first one is completed.
    function filterTable(wrapper, type, input){
        if(SEARCH_PENDING) {
            if(SEARCH_QUEUE.length <= 0) {
                enqueueSearch(wrapper, type, input);
            }
            return;
        }

        (update_search_thread !== null) && clearTimeout(update_search_thread);

        update_search_thread = setTimeout(function(){
            SEARCH_PENDING = true;
            let varStr = input.val();
            // Don't search again if no change was made (this squelches any non-change)
            if(Last_searches[type] !== varStr) {
                Last_searches[type] = varStr;
                update_methods[type](false,  varStr, true)
                    .then(function(){
                        SEARCH_PENDING = false;
                        dequeueSearch();
                    })
                    .fail(function(){
                        SEARCH_PENDING = false;
                        dequeueSearch();
                    });
            } else {
                SEARCH_PENDING = false;
                dequeueSearch();
            }
        }, SUBSEQUENT_DELAY);
    }

    $('#rh_panel').on('change keyup', '.table-search-box', function(event){
        let type = $(this).attr("data-search-type");
        filterTable(`${type}_panel`, `${type}ID`, $(this));
    });

    $('#rh_panel').on('click', '.dataTables_filter button.clear', function(){
        let search_box = $(this).siblings('.table-search-box');
        search_box.val('');
        search_box.trigger("change");
    });

    window.resetCartInTables = function(projArr){
         for (var i =0; i< projArr.length;i++){
            propagateCartTableStatChanges([projArr[i]], {}, false,true);

        }
         clearCartSelectionsInCaches();
    }

     const propagateCartTableStatChanges = function(ids, itemChng, addingToCart,purge){

        var tableset = ["projects_table","cases_table","studies_table","series_table"];
        var lbl = ['data-projectid', 'data-caseid', 'data-studyid', 'data-seriesid']
        for (var i=0;i<4;i++){
            var tbl= tableset[i];
            var rowsel = $("#"+tbl).find('tr');

             if ((ids.length ==4) && (tbl=="series_table")){
                 var serid="series_"+ids[3];
                 rowsel = $(document.getElementById(serid));
             }
             else {
                 for (var j = 0; j < Math.min(i + 1, ids.length); j++) {
                     rowsel = rowsel.filter('[' + lbl[j] + ' = "' + ids[j] + '"]');
                 }
             }

            if (purge || (i>=ids.length)){
                var addOrRemoveAll = true;
            }
            else{
                var addOrRemoveAll = false
            }
            rowsel.each(function() {
                var row = this;
                var curids= ids.slice(0,i+1)
               updateTableRowCartStatsDownstream(row, itemChng, curids, addingToCart, addOrRemoveAll, tbl,purge);
            });
        }
        for (var lvl=0;lvl<3;lvl++){
            for (var tbli=lvl+1; tbli<4;tbli++){
                var tbl= tableset[tbli];
                var rowsel = $("#"+tbl).find('tr');
                var mxIdsToCk=Math.min(ids.length,lvl+1)
                for (var k=0;k<mxIdsToCk;k++){
                    rowsel =rowsel.filter('[' + lbl[k] + ' = "' + ids[k] + '"]');
                }
                rowsel.each(function() {
                var row = this;
                if ((lvl+1)<ids.length){
                    var curids= ids.slice(0,lvl+1) ;
                }
                else{
                  var curids= ids.slice(0,ids.length) ;
                }


                 updateTableRowCartStatsUpstream(row, itemChng, curids, lvl, addingToCart,purge);
                });

            }
        }

    }

     const updateTableRowCartStatsUpstream = function(row,itemChng,ids, lvl,addingToCart,purge){
         var upstream =["collection","case","study"];
         // update row attributes

         var upstreamLblCrt = "cart_series_in_" + upstream[lvl];
         if (row.hasAttribute(upstreamLblCrt)) {
             var curcart = parseInt($(row).attr(upstreamLblCrt))
         } else {
                 var curcart = 0
         }

         var upstreamLblFilt = "filter_series_in_" + upstream[lvl];
         if (row.hasAttribute(upstreamLblFilt)) {
             var curfilt = parseInt($(row).attr(upstreamLblFilt))
         } else {
                 var curfilt = 0
         }

         var upstreamLblFiltCrt = "filter_cart_series_in_" + upstream[lvl];
         if (row.hasAttribute(upstreamLblFiltCrt)) {
             var curfiltcart = parseInt($(row).attr(upstreamLblFiltCrt))
         } else {
                 var curfiltcart = 0
         }

         // if selection was made at a higher level than level being looked at. Only some series added/deleted belong to the item
         var newseries=0;
         if (ids.length<(lvl+1) && !purge){
            if (addingToCart){
                newseries=curfilt-curfiltcart;
            }
            else{
                newseries=-curfiltcart;
            }
         }
         // else they all belong here
         else if (!purge){
             newseries=itemChng['series']['added'];
         }

         if (!purge) {
             $(row).attr(upstreamLblCrt, curcart + newseries);
             $(row).attr(upstreamLblFiltCrt, curfiltcart + newseries);
         }
         else{
             $(row).attr(upstreamLblCrt, 0);
             $(row).attr(upstreamLblFiltCrt, 0);
         }

     }

     const updateTableRowCartStatsDownstream = function(row, itemChng, ids, addingToCart, addOrRemoveAll, tbl, purge) {
         var items =["collections","cases","studies","series"];
         var mini = ids.length
         var mxi=4
         if (tbl=="series_table"){
             mini=3;
             mxi=4;
         }
         for (var i = mini; i < mxi; i++) {
             var lbl = items[i];
             var lbl_mx= 'mx'+lbl;
             var lbl_filter = lbl + '_in_filter';
             var lbl_cart = lbl + '_in_cart';
             var lbl_filter_cart = lbl + '_in_filter_and_cart';
             var mx =0;
             var in_cart=0;
             var in_filter=0;
             var in_filter_cart=0;
             if (row.hasAttribute(lbl_mx)) {
                  mx = parseInt($(row).attr(lbl_mx));
             } else {
                  mx = 0;
             }
             if (row.hasAttribute(lbl_filter)) {
                  in_filter = parseInt($(row).attr(lbl_filter));
             } else {
                  in_filter = 0;
             }

             if (row.hasAttribute(lbl_cart)) {
                  in_cart = parseInt($(row).attr(lbl_cart));
             } else {
                  in_cart = 0;
             }

             if (row.hasAttribute(lbl_filter_cart)) {
                  in_filter_cart = parseInt($(row).attr(lbl_filter_cart));
             } else {
                  in_filter_cart = 0;
             }
             var in_filter_not_cart= in_filter - in_filter_cart;
             if (purge){
                 in_cart=0;
                 in_filter_cart =0;
             }
             else if ((tbl =="series_table") && (lbl=="series")){
                 if ((addingToCart)){
                     in_cart=1;
                     in_filter_cart =1;
                 }
                 else{
                     in_cart=0;
                     in_filter_cart =0;
                 }
             }
             else if ((addingToCart) && (addOrRemoveAll)){
                 in_cart= in_cart + in_filter_not_cart;
                 in_filter_cart= in_filter;
             }
             else if (!(addingToCart) && (addOrRemoveAll)){
                 in_cart= in_cart - (in_filter - in_filter_not_cart);
                 in_filter_cart= 0;
             }
             else{
                in_cart = in_cart + itemChng[lbl]['added'];
                in_filter_cart = in_filter_cart + itemChng[lbl]['added'];
             }

             $(row).attr(lbl + "_in_cart", in_cart);
             $(row).attr(lbl + "_in_filter_and_cart", in_filter_cart);
             if (lbl =='series'){
                 if (!(tbl=="series_table")) {
                     $(row).find('.cartnum').text(in_cart);
                 }
               if (in_cart>0){
                   $(row).addClass('someInCart');
               }
               else {
                   $(row).removeClass('someInCart');
               }
               if (mx> in_cart){
                    $(row).addClass('extraInItem');
               }
               else{
                   $(row).removeClass('extraInItem');
               }
               if (in_filter > in_filter_cart){
                   $(row).addClass('extraInFilter');
               }
               else{
                   $(row).removeClass('extraInFilter');
               }

             }

         }

     }

    const clearCartSelectionsInCaches = function(){
        var caches = ["", "casesCache", "studiesCache", "seriesCache"];
        var rowsToClearUpstream = [["cart_series_in_collection","filter_cart_series_in_collection"], ["cart_series_in_case","filter_cart_series_in_case"], ["cart_series_in_study","filter_cart_series_in_study"]];
        var rowsToClearDownstream = [["unique_cases_cart", "unique_cases_filter_and_cart"], ["unique_studies_cart", "unique_studies_filter_and_cart"], ["unique_series_cart", "unique_series_filter_and_cart"]];
        for (var cacheNum = 1; cacheNum < 4; cacheNum++) {
            if ((caches[cacheNum] in window) && ('data' in window[caches[cacheNum]]) ) {

                var curCache = window[caches[cacheNum]]['data'];
                // iterate thru each row in the curCaceh
                for (var rowid = 0; rowid < curCache.length; rowid++) {
                    var curRow = curCache[rowid];
                    for (var upid = 0; upid < rowsToClearUpstream.length; upid++) {
                        var lbl1 = rowsToClearUpstream[upid][0];
                        if (lbl1 in curRow) {
                            curRow[lbl1] = 0
                        }
                        var lbl2 = rowsToClearUpstream[upid][1];
                        if (lbl2 in curRow) {
                            curRow[lbl2] = 0
                        }

                    }

                    for (var dwnid = 0; dwnid < rowsToClearDownstream.length; dwnid++) {
                        var lbl1 = rowsToClearDownstream[dwnid][0];
                        if (lbl1 in curRow) {
                            curRow[lbl1] = 0
                        }
                        var lbl2 = rowsToClearDownstream[dwnid][0];
                        if (lbl2 in curRow) {
                            curRow[lbl2] = 0;
                        }

                    }

                }
            }
        }


    }
    const updateTableCacheAfterCartSelection = function(ids,itemChng, addingToCart, cacheNum) {
        var caches = ["", "casesCache", "studiesCache", "seriesCache"];
        var ckids = ["collection_id", "PatientID", "StudyInstanceUID", "SeriesInstanceUID"];
        var items = ["collection", "cases", "studies", "series"];
        var upstream = [["cart_series_in_collection", "filter_cart_series_in_collection"], ["cart_series_in_case","filer_cart_series_in_case"], ["cart_series_in_study","filter_cart_series_in_study"]];
        var downstream = [["unique_cases_cart", "unique_cases_filter_cart"], ["unique_studies_cart", "unique_studies_filter_cart"], ["unique_series_cart", "unique_series_filter_cart"]];
        var chnglvl = ids.length
        var curCache = window[caches[cacheNum]]['data'];
        // iterate thru each row in the curCaceh
        for (var rowid = 0; rowid < curCache.length; rowid++) {
            var curRow = curCache[rowid]
            var mtch_row_stats_update_ids = true;

            //iterate through image levels higher than the
            for (var upstreamlvl = 0; upstreamlvl < cacheNum; upstreamlvl++) {
                // if the lvl of change in collection, cases, study series hierarchy is lower than the current category being on considered, check for exact match
                var newseries=0;
                if (mtch_row_stats_update_ids) {

                    if (chnglvl >= upstreamlvl) {
                        var attToMtchId = curRow[ckids[upstreamlvl]];
                        if (attToMtchId == ids[upstreamlvl]) {
                            newseries = itemChng['series']['added'];
                        } else {
                            mtch_row_stats_update_ids = false;
                        }
                    }
                    // here the chng lvl is lower than the upstream level at which we are tracking changes; all series in the filter but not in cart are added, OR all series in filter and cart are subtracted
                    else if (mtch_row_stats_update_ids) {
                        if (addingToCart) {
                            if (('series_filter_and_cart') in curRow) {
                                var newseries = curRow['unique_series'] - curRow['series_filter_and_cart'];
                            } else {
                                var newseries = curRow['unique_series']
                            }

                        }
                        else{
                            if (('series_filter_and_cart') in curRow) {
                                var newseries= - curRow['series_filter_and_cart'];
                            }
                        }

                    }
                }
                if (mtch_row_stats_update_ids) {
                    for (var i = 0; i < 2; i++) {

                    if (upstream[upstreamlvl][i] in curRow) {
                        curRow[upstream[upstreamlvl][i]] = curRow[upstream[upstreamlvl][i]] + newseries;
                    } else {
                        curRow[upstream[upstreamlvl][i]] = newseries;
                    }
                }

                }

            }
            // for downstream, check that the ids for the change lvl 'match' or 'include' the curRow being investigated
            if ((chnglvl < (cacheNum+1)) && mtch_row_stats_update_ids) {
                var chnglvldownstreamcachelvl = false;
            } else if (mtch_row_stats_update_ids) {
                var chnglvldownstreamcachelvl = true;
                var attToMtchId = curRow[ckids[cacheNum]];
                if (!(attToMtchId == ids[cacheNum])) {
                    mtch_row_stats_update_ids = false;

                }

            }

            if (mtch_row_stats_update_ids) {
                for (var itemid = Math.min(cacheNum + 1, 3); itemid < 4; itemid++) {
                    var newitems = 0;
                    var curitem = items[itemid];

                    var infilterlbl = "unique_" + curitem;
                    if (cacheNum == 3) {
                        var infilt = 1;
                    } else {
                        var infilt = curRow[infilterlbl]
                    }

                    var infiltercartlbl = "unique_" + curitem + "_filter_and_cart"
                    if (infiltercartlbl in curRow) {
                        var infiltercart = curRow[infiltercartlbl];
                    } else {
                        var infiltercart = 0;
                    }
                    var incartlbl = "unique_" + curitem + "_cart"


                    if (chnglvldownstreamcachelvl) {
                        newitems = itemChng[curitem]['added'];
                    } else if (addingToCart) {
                        newitems = infilt - infiltercart
                    } else {
                        newitems = -infiltercart;
                    }

                    if (incartlbl in curRow) {
                        curRow[incartlbl] = curRow[incartlbl] + newitems;
                    } else {
                        curRow[incartlbl] = newitems;
                    }

                    if (infiltercartlbl in curRow) {
                        curRow[infiltercartlbl] = curRow[infiltercartlbl] + newitems;
                    } else {
                        curRow[infiltercartlbl] = newitems;
                    }

                }

            }

        }
    }

    const updateTableCachesAfterCartSelection =function(ids,itemChng, addingToCart) {
        var caches = ["", "casesCache", "studiesCache", "seriesCache"];
        var ckids = ["collection_id", "PatientID", "StudyInstanceUID", "SeriesInstanceUID"];
        var items = ["collection", "cases", "studies", "series"];
        var upstream = ["cart_series_in_collection", "cart_studies_in_case", "cart_studies_in_study"];
        var downstream = [["unique_cases_cart", "unique_cases_filter_cart"], ["unique_studies_cart", "unique_studies_filter_cart"], ["unique_series_cart", "unique_series_filter_cart"]];
        var chnglvl = ids.length
        //var checkUpstream=false;
        //var checkDownStream=false;

        // iterate through each cache
        for (var cacheNum = 1; cacheNum < 4; cacheNum++) {
           if ((caches[cacheNum] in window) && ('data' in window[caches[cacheNum]])){
               updateTableCacheAfterCartSelection(ids,itemChng, addingToCart, cacheNum);
           }
       }
    }



    const handleCartClick = function(tabletype, row, elem, ids){
             var updateElems =["series", "studies","cases"]
            //$(row).find('.shopping-cart-holder').trigger('shopping-cart:update-started');
             var addingToCart = true;
             if (tabletype=="series") {
                 if ($(elem).parentsUntil('tr').parent().hasClass('someInCart')) {
                     addingToCart = false;
                 } else {
                     addingToCart = true;
                 }
             }
             else {
                 if ($(elem).parentsUntil('tr').parent().hasClass('extraInFilter')) {
                     addingToCart = true;
                 } else {
                     addingToCart = false;
                 }
             }

             // record new selection
             var newSel={}
             newSel['added'] = addingToCart;
             newSel['sel'] = ids;
             cartutils.updateCartSelections(newSel);
             window.updatePartitionsFromScratch();
             var ret =cartutils.formcartdata();
             window.partitions = ret[0];
             window.filtergrp_list = ret[1];


             var items =["collections","cases","studies","series"]
             var upstream =["collection","case","study"]
             var itemChng={}

             // calculate change in items downstream, ie series added to collection, case, study. studies added to collection, case
             for (var i=ids.length;i<4;i++) {

                 var curitem = items[i];
                 itemChng[curitem] ={};
                 var incartkey = "in_cart";
                 var infilterkey = "in_filter";
                 var infiltercartkey = "in_filter_and_cart";

                 var statsKeys = [incartkey, infilterkey, infiltercartkey]
                 for (var j = 0; j < statsKeys.length; j++) {

                     if (row.hasAttribute(curitem+"_"+statsKeys[i])) {
                         itemChng[curitem][statsKeys[j]] = parseInt($(row).attr(curitem+"_"+statsKeys[j]));
                     } else {
                         itemChng[curitem][statsKeys[j]] = parseInt($(row).attr(curitem+"_"+statsKeys[j]));
                     }

                 }
                if (addingToCart) {
                    itemChng[curitem]['added']=itemChng[curitem]['in_filter']-itemChng[curitem]['in_filter_and_cart'];
                }
                else{
                     itemChng[curitem]['added']= - itemChng[curitem]['in_filter_and_cart'];
                }

             }

             // if tabletype is series then itemChng["series"]["added"] is not set above

             if ((tabletype=="series") && (addingToCart)) {
                 itemChng["series"]={};
                 itemChng["series"]['added'] = 1;
             }
             else if ((tabletype=="series") && (!addingToCart)) {
                 itemChng["series"]={};
                 itemChng["series"]['added'] = -1;
             }


             // calculate any change upstream, ie new collection because there are now series etc. Use the itemChng['series'] set above
             for (var i=0;i<Math.min(ids.length,3);i++){
                 var curitem = items[i];
                 itemChng[curitem]={}
                 if (i==ids.length-1){
                     var upstreamlbl="series_in_cart" ;
                 }
                 else {
                     var upstreamlbl = "cart_series_in_" + upstream[i];
                 }

                 if (row.hasAttribute(upstreamlbl)) {
                         var curseries = parseInt($(row).attr(upstreamlbl));
                     } else {
                         var curseries = 0;
                     }
                 var seriesadded = itemChng['series']['added'];
                 if ((curseries>0)  && ((curseries+seriesadded)==0)){
                     itemChng[curitem]['added']=-1;
                 }
                 else if ((curseries==0)  && (seriesadded>0)){
                     itemChng[curitem]['added']=1;
                 }
                 else{
                     itemChng[curitem]['added']=0;
                 }

             }


             var proj_id=ids[0]
             if (!(proj_id in window.proj_in_cart) && addingToCart){
                 window.proj_in_cart[proj_id]= new Object();
             }
             for (var i=1;i<items.length;i++){
                 curitem=items[i]
                 if (!(curitem in window.proj_in_cart[proj_id])){
                     window.proj_in_cart[proj_id][curitem]=0;
                 }
                 window.proj_in_cart[proj_id][curitem]=window.proj_in_cart[proj_id][curitem]+itemChng[curitem]['added'];
             }
             if (window.proj_in_cart[proj_id]['series']==0){
                 delete(window.proj_in_cart[proj_id]);
             }
             cartutils.updateCartCounts();
             propagateCartTableStatChanges(ids, itemChng, addingToCart,false);
             updateTableCachesAfterCartSelection(ids,itemChng,addingToCart);

    };

    $('.addMult').on('click', function() {
        var idsattr=["data-projectid", "data-caseid", "data-studyid"]
        var idsArr=[]
        var tbl_head = $(this).parentsUntil('table').filter('thead');
        var tbl_head_id = tbl_head.attr('id');
        if ($(this).hasClass('fa-plus-circle')){
            var rowsAdded = true;
        }
        else{
            var rowsAdded = false;
        }
        if (tbl_head_id == "projects_table_head"){
            var tabletype = "collections";
            var body_id = "projects_table"
            var numids=1;

        }
        else if (tbl_head_id == "cases_table_head"){
            var tabletype = "cases";
            var body_id = "cases_table";
            var numids=2
        }
        else if (tbl_head_id == "studies_table_head"){
            var tabletype ="studies";
            var body_id ="studies_table";
            var numids=3;
        }

        $('#'+body_id).find('tr').each(function(){
            var ids=[]
            for (var numid=0;numid<numids;numid++){
                var id = $(this).attr(idsattr[numid]);
                ids.push(id);
            }
            idsArr.push(ids);

            if (rowsAdded){
                $(this).find('.fa-caret-right').addClass('is-hidden');
                $(this).find('.fa-caret-down').removeClass('is-hidden');
                $(this).find('.viewbx').addClass('open');
            }
            else{
               $(this).find('.fa-caret-right').removeClass('is-hidden');
                $(this).find('.fa-caret-down').addClass('is-hidden');
                $(this).find('.viewbx').removeClass('open');
            }
        });

        changeViewStates(tabletype,idsArr,rowsAdded);

    });

    const changeViewStates = function(tabletype, idsArr, rowsAdded) {
        var caseTableUpdate = false;
        var studyTableUpdate = false;
        var seriesTableUpdate = false;

        for (var idsIndx = 0; idsIndx < idsArr.length; idsIndx++) {
            var ids = idsArr[idsIndx];
            if (tabletype == "collections") {
                caseTableUpdate = true;
                var projid = ids[0]
                if (rowsAdded) {
                    window.openProjects[projid] = 1;
                }
                else {
                    if (projid in window.openProjects) {
                        delete (window.openProjects[projid]);
                    }
                    if (projid in window.openCases) {
                        studyTableUpdate = true;
                        for (caseid in window.openCases[projid]) {
                            if (caseid in window.openStudies) {
                                seriesTableUpdate = true;
                                delete (window.openStudies[caseid])
                            }
                        }
                        delete (openCases[projid]);
                    }
                }
            }
            else if (tabletype === 'cases') {
                studyTableUpdate = true;
                var projid = ids[0];
                var caseid = ids[1];
                if (rowsAdded) {
                    if (!(projid in window.openCases)) {
                        window.openCases[projid] = {}
                    }
                    window.openCases[projid][caseid] = 1
                } else {
                    if ((projid in window.openCases) && (caseid in window.openCases[projid])) {
                        delete (window.openCases[projid][caseid])
                    }
                    if (caseid in window.openStudies) {
                        seriesTableUpdate = true;
                        delete (window.openStudies[caseid])
                    }
                }
            }
            else if (tabletype === 'studies') {
                seriesTableUpdate = true;
                var projid = ids[0];
                var caseid = ids[1];
                var studyid = ids[2];
                if (rowsAdded) {
                    if (!(caseid in window.openStudies)) {
                        window.openStudies[caseid] = {}
                    }
                    window.openStudies[caseid][studyid] = 1
                } else {
                    if ((caseid in window.openStudies) && (studyid in window.openStudies[caseid])) {
                        delete (window.openStudies[caseid][studyid]);
                    }
                }
            }
        }

        if (caseTableUpdate) {
            var caseID = "";
            if ($('#cases_tab').find('.caseID-inp').length > 0) {
                caseID = $('#studies_tab').find('.caseID-inp').val();
            }
            updateCaseTable(rowsAdded, caseID, false);
        }
        if (studyTableUpdate) {
            var studyID = "";
            if ($('#studies_tab').find('.studyID-inp').length > 0) {
                studyID = $('#studies_tab').find('.studyID-inp').val();
            }
            updateStudyTable(rowsAdded, studyID, false);
        }
        if (seriesTableUpdate) {
            var seriesID = "";
            if ($('#series_tab').find('.seriesID-inp').length > 0) {
                seriesID = $('#series_tab').find('.seriesID-inp').val();
            }
            updateSeriesTable(rowsAdded, seriesID, false);

        }


      }


    const handleRowClick =  function(tabletype, row, event, ids){
        let elem = event.target;
        if ($(elem).hasClass('collection_info')) {
            displayInfo($(elem));
                        }
         else if ($(elem).hasClass('copy-this') || $(elem).hasClass('fa-copy')) {
                            //do nothing. handled by triggers in base.js and explore.js to copy to clipboard and show a copy tooltip
                        }

         else if ($(elem).hasClass('ohif') || $(elem).parentsUntil('tr').hasClass('ohif')) {
            //do nothing here. opening the viewer
        }

         else if ($(elem).hasClass('download-col') || $(elem).parentsUntil('tr').hasClass('download-col')) {
            //do nothing here. downloading a series or study manifest
        }


         else if ($(elem).hasClass('shopping-cart') || $(elem).hasClass('shopping-cart-holder')) {
             handleCartClick(tabletype, row, elem, ids);
         }
         // click anywhere else, open tables below
         else {

             let toggle_elem = $(row).find('.expansion-toggle')
             if (toggle_elem.length>0) {
                 var rowsAdded;
                 toggle_elem = toggle_elem[0];
                 $(toggle_elem).hasClass('open') ? $(toggle_elem).removeClass('open') : $(toggle_elem).addClass('open');
             }

                 if ($(row).find('.fa-caret-down.is-hidden').length>0){
                     var rowsAdded = true;
                     $(row).find('.fa-caret-right').addClass('is-hidden');
                     $(row).find('.fa-caret-down').removeClass('is-hidden');

                 } else {
                     var rowsAdded = false;
                     $(row).find('.fa-caret-right').removeClass('is-hidden');
                     $(row).find('.fa-caret-down').addClass('is-hidden');
                 }
                 changeViewStates(tabletype, [ids], rowsAdded);
         }

    }


    // change the viewed 'page' for any table
    window.changePage = function(wrapper){
        var elem=$('#'+wrapper);
        var valStr = elem.find('.dataTables_controls').find('.goto-page-number').val();
        try {
            var val =parseInt(valStr);
            if (Number.isInteger(val) && (val>0) ) {
                elem.find('table').DataTable().page(val-1).draw(false);
            }
        }
        catch(err){
           console.log(err);
        }

    }

    const pretty_print_id = function (id) {
        var newId = id.slice(0, 8) + '...' + id.slice(id.length - 8, id.length);
        return newId;
    }
    return {
        initializeTableCacheData: initializeTableCacheData,
        initializeTableViewedItemsData: initializeTableViewedItemsData,
        propagateCartTableStatChanges:propagateCartTableStatChanges

    };
});
