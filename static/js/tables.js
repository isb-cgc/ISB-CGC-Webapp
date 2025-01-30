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

    // TODO: Adjust these to indicate cart update
    $('#proj_table, #cases_tab, #studies_tab, #series_tab').on('shopping-cart:update-started', '.shopping-cart-holder', function(){
        window.show_spinner();
    });

    $('#proj_table, #cases_tab, #studies_tab, #series_tab').on('shopping-cart:update-complete', '.shopping-cart-holder', function(){
        window.hide_spinner();
    });

    $(document).on('study-map:update-started', function(){
        window.show_spinner();
    });
    $(document).on('study-map:update-complete', function(){
        window.hide_spinner();
    });

    // Update the rows in the Projects Table, clear the other tables.
    window.updateTablesAfterFilter = function (collFilt, collectionsData, collectionStats,cartStats){
        window.show_spinner();
        var usedCollectionData = new Array();
        rmCases = []
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

        window.hide_spinner();
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
                {className: "ckbx", "targets": [2]},
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

    /*
    const setProjectRowArrts = function(items, cartStats){
        for item in items:

    }*/

    // creates the project or collection table  on document load and after filtering. Defines the chevron and cart selection actions
    window.updateProjectTable = function(collectionData,collectionStats, cartStats) {
        var newCollectionData = []

        for (var collecid = 0;collecid<collectionData.length;collecid++) {
            var cur = collectionData[collecid];
            var projid = cur[0];
            var stats = {}
            if (('patient_per_collec' in collectionStats) && (projid in collectionStats['patient_per_collec'])) {
                stats['mxcases'] = collectionStats['patient_per_collec'][projid]
                stats['cases_in_filter'] = collectionStats['patient_per_collec'][projid]
            } else {
                stats['mxcases'] = 0
                stats['cases_in_filter']=0
            }
            if (('study_per_collec' in collectionStats) && (projid in collectionStats['study_per_collec'])) {
                stats['mxstudies'] = collectionStats['study_per_collec'][projid]
                stats['studies_in_filter'] = collectionStats['study_per_collec'][projid];
            } else {
                stats['mxstudies'] = 0;
                stats['studies_in_filter']=0
            }
            if (('series_per_collec' in collectionStats) && (projid in collectionStats['series_per_collec'])) {
                stats['mxseries'] = collectionStats['series_per_collec'][projid]
                stats['series_in_filter']=collectionStats['series_per_collec'][projid];
            } else {
                stats['mxseries'] = 0
                stats['series_in_filter'] =0;
            }


            var items = ["cases", "studies", "series"]
            for (var itemid = 0; itemid < 3; itemid++) {
                var item = items[itemid];
                    if (projid in cartStats) {

                    if ((projid in cartStats) && ('unique_' + item in cartStats[projid])) {
                        stats[item + "_in_filter"] = cartStats[projid]['unique_' + item + '_in_filter']
                    } else {
                        stats[item + "_in_filter"] = 0;
                    }
                    if ((projid in cartStats) && ('unique_' + item + '_cart' in cartStats[projid])) {
                        stats[item + "_in_cart"] = cartStats[projid]['unique_' + item + '_cart'];
                    } else {
                        stats[item + "_in_cart"] = 0
                    }
                    if ((projid in cartStats) && ('unique_' + item + '_filter_and_cart' in cartStats[projid])) {
                        stats[item + '_in_filter_and_cart'] = cartStats[projid]['unique_' + item + '_filter_and_cart'];
                    } else {
                        stats[item + '_in_filter_and_cart'] = 0;
                    }

                   }

                  else{
                  stats[item + '_in_cart'] = 0;
                  stats[item + '_in_filter_and_cart'] = 0;
                  //stats[item + '_in_filter'] = 0;
                  }
            }

            var ncur=[cur[0], stats["series_in_cart"], cur[0], cur[1],cur[2],cur[3],stats];
            newCollectionData.push(ncur);
        }
        //newCollectionData.sort((a,b) => a[0].localeCompare(b[0]))

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
                    if ($(row).attr('series_in_cart')>0)
                    {
                        $(row).addClass('someInCart');
                    }
                    else{
                        $(row).removeClass('someInCart');
                    }

                    if ($(row).attr('series_in_cart')<$(row).attr('mxseries'))
                    {
                        $(row).addClass('extraInItem');
                    }
                    else{
                        $(row).removeClass('extraInItem');
                    }


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

    // initialize data structuers used to track which projects(collections) have items added to the cart,
    // and which chevrons are clicked in the project table
    const initProjectData = function(project){
        window.selProjects[project]['selCases']=new Object();
        window.selProjects[project]['state']={'view':false};
        window.selProjects[project]['totalChild']=stats['patient_per_collec'][project];;
        window.selProjects[project]['numChildFullCheck']=0;
        window.selProjects[project]['numChildMixCheck'] = 0;
        window.selProjects[project]['numChildNoCheck']=stats['patient_per_collec'][project];
        window.selProjects[project]['numChecksAbove']=0;
        window.selProjects[project]['extraInFilt'] = true;

        if (project in stats['patient_per_collec']){
            window.selProjects[project]['totalCases']=stats['patient_per_collec'][project];
        }

        if (project in stats['study_per_collec']){
            window.selProjects[project]['totalStudies']=stats['study_per_collec'][project];
            window.selProjects[project]['mxstudies']=stats['study_per_collec'][project];
        }

        if (project in stats['series_per_collec']){
            window.selProjects[project]['totalSeries']=stats['series_per_collec'][project];
            window.selProjects[project]['mxseries']=stats['series_per_collec'][project];
        }
    }

    // open the cases for the selected projects(collections) in the cases table.
    // Also update call updateProjStudyMp if studymp is not defined for some of the collections
    window.updateProjectViewSelection = function(rowA) {
        var rowsAdded = false;
        var rowsRemoved = false;
        var projid = '';
        var totalCases = 0;
        var totalStudies =0;
        var totalSeries = 0;
        var mxseries = 0;
        var mxstudies = 0;
        var projUpdate = new Array();
        rowA.forEach(function(row) {
        var projid = $(row).data('projectid');
        totalCases= $(row).data('totalcases');
        totalStudies =$(row).attr('totalstudy');
        totalSeries =$(row).attr('totalseries');

        if ($(row).find('.fa-caret-down.is-hidden').length>0){
            $(row).find('.fa-caret-right').addClass('is-hidden');
            $(row).find('.fa-caret-down').removeClass('is-hidden');


        } else {
            $(row).find('.fa-caret-right').removeClass('is-hidden');
            $(row).find('.fa-caret-down').addClass('is-hidden');
            if (( projid in window.selProjects) && (window.selProjects[projid]['state']['view'])==true) {
                rowsRemoved = true;
                //window.selProjects[projid]['state']['view'] = false;
                removeFromView("project", [projid]);
                }
            }
        });


        var caseID='';
        if ($('#cases_panel').find('.caseID_inp').length>0){
            caseID = $('#cases_panel').find('.caseID_inp').val().trim();
        }
        var viewProjects = getKeysByState(window.selProjects,'view');
        mxseries = 0;
        mxstudies = 0;
        for (var i=0;i<viewProjects.length;i++){
            projid=viewProjects[i];
            mxseries=mxseries+window.selProjects[projid]['mxseries'];
            mxstudies=mxstudies+window.selProjects[projid]['mxstudies'];
        }
        updateCaseTable(rowsAdded, caseID);

    };


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
                    $(document).trigger('study-map:update-complete');
                }
            }, error: function () {
                console.log("problem getting data");
            }
        });
         return deferred.promise();

    }

    // defines the studymp for selected projects(collections). Also adds data to the window.casestudymp and window.studymp.
    // Called when the user clicks a cart OR a chevron in the projects(collections) table
    window.updateProjStudyMp = function(projidA, mxStudies, mxSeries, offset, limit) {
        var curFilterObj = JSON.parse(JSON.stringify(filterutils.parseFilterObj()));
        $(document).trigger('study-map:update-started');
        curFilterObj.collection_id = projidA;
        var filterStr = JSON.stringify(curFilterObj);
        let url = '/studymp/';
        url = encodeURI(url);
        let ndic = {
            'filters': filterStr,
            'mxstudies': mxStudies,
            'mxseries': mxSeries,
            'limit': limit,
            'offset': offset
        }
        for (var i = 0; i < projidA.length; i++) {
            projid=projidA[i];
            window.selProjects[projid]['studymp'] = {};
        }
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
                    for (var i = 0; i < projidA.length; i++) {
                        projid = projidA[i];
                        if (!(projid in window.projstudymp)) {
                            window.projstudymp[projid] = {};
                        }
                    }
                    for (projid in data['projstudymp']) {
                        window.selProjects[projid]['studymp'] = data['projstudymp'][projid];
                        for (studyid in data['projstudymp'][projid]) {
                            window.projstudymp[projid][studyid] = data['projstudymp'][projid][studyid];
                        }
                    }
                    for (caseid in data['casestudymp']) {
                        if (!(caseid in window.casestudymp)) {
                            window.casestudymp[caseid] = {}
                        }
                        for (studyid in data['casestudymp'][caseid]) {
                            window.casestudymp[caseid][studyid] = data['casestudymp'][caseid][studyid]
                        }
                    }
                    if ('studymp' in data) {
                        updateStudyMp(data['studymp'])
                    }
                } catch(err){
                    console.log('error processing data');
                    alert("There was an error processing the server data. Please alert the systems administrator")
                } finally {
                    deferred.resolve('studymp');
                    $(document).trigger('study-map:update-complete');
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
            {className: "ckbx", "targets":[2]},
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
        const study_col  = {"type": "num", "orderable": true, data: 'unique_study'};
        const series_col =  {"type": "num", "orderable": true, data: 'unique_series'};
        return [caret_col, cart_col, cartnum_col, collection_col, case_col, study_col, series_col];
    };

    // recreates the cases table when a chevron is clicked in the projects table. Defines the chevron and cart selection actions.
    // Updates data structures such as casesCache, which caches case rows to limit calls to the server, and selProjects, which stores information
    // across tables about which items are added to the cart, and which chevrons are selected
    window.updateCaseTable = function(rowsAdded,caseID) {
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
                    $(row).attr('data-totalstudies', parseInt(data['unique_study']));
                    $(row).attr('data-totalseries', parseInt(data['unique_series']));
                    $(row).addClass('text_head');
                    $(row).addClass('project_' + data['collection_id']);
                    var projid = data['collection_id'][0];
                    var caseid = data['PatientID'];

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

                    if ($(row).attr('series_in_cart')>0)
                    {
                        $(row).addClass('someInCart');
                    }
                    else{
                        $(row).removeClass('someInCart');
                    }

                    if ($(row).attr('series_in_cart')<$(row).attr('mxseries'))
                    {
                        $(row).addClass('extraInItem');
                    }
                    else{
                        $(row).removeClass('extraInItem');
                    }





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
                        $('#cases_tab').children('thead').children('tr').children('.ckbx').addClass('notVis');

                        //updateStudyTable(rowsAdded, '');
                        callback({"data": [], "recordsTotal": "0", "recordsFiltered": "0"})
                    } else {
                        var ret = checkClientCache(request, 'cases');
                        var ssCallNeeded = ret[0];
                        var reorderNeeded = ret[1];
                        if (ssCallNeeded) {
                            var curFilterObj = JSON.parse(JSON.stringify(filterutils.parseFilterObj()));
                            curFilterObj.collection_id = viewedProjects;
                            if (caseID.trim().length>0){
                                curFilterObj.PatientID = caseID;
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
                                colSort = ["", "", "", "collection_id", "PatientID", "unique_study", "unique_series"];
                                updateCache(window.casesCache, request, backendReqStrt, backendReqLength, data, colSort);
                                dataset = data['res'].slice(request.start - backendReqStrt, request.start - backendReqStrt + request.length);

                                callback({
                                    "data": dataset,
                                    "recordsTotal": data["cnt"],
                                    "recordsFiltered": data["cnt"]
                                  })
                               } catch(err){
                                    console.log('error processing data');
                                    alert("There was an error processing the server data. Please alert the systems administrator")
                                   }
                                },
                                error: function () {
                                    console.log("problem getting data");
                                    alert("There was an error fetching server data. Please alert the systems administrator")
                                    $('#cases_tab').children('thead').children('tr').children('.ckbx').addClass('notVis');
                                    callback({"data": [], "recordsTotal": "0", "recordsFiltered": "0"})
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
                            })
                        }
                    }
                }
            });
        } catch(err){
            alert("The following error occurred trying to update the case table:" +err+". Please alert the systems administrator");
        }

        $('#cases_tab').on('draw.dt', function(){
            $('#cases_table_head').children('tr').children().each(function(){
                this.style.width=null;
                }
            );
        });
        $('#cases_tab').find('tbody').attr('id','cases_table');
        $('#cases_panel').find('.dataTables_controls').find('.dataTables_length').after('<div class="dataTables_goto_page"><label>Page </label><input class="goto-page-number" type="number"><button onclick="changePage(\'cases_tab_wrapper\')">Go</button></div>');
        $('#cases_panel').find('.dataTables_controls').find('.dataTables_paginate').after('<div class="dataTables_filter"><strong>Find by Case ID:</strong><input class="caseID_inp" type="text-box" value="'+caseID+'"><button onclick="filterTable(\'cases_panel\',\'caseID\')">Go</button></div>');
    }

    // initialize data structures used to track which cases have items added to the cart,
    // and which chevrons are clicked in the cases table
    const initCaseDataAndRow = function(projid, caseid, row, totalStudies){
        window.selProjects[projid].selCases[caseid] = new Object();
        window.selProjects[projid].selCases[caseid].selStudies = new Object();
        window.selProjects[projid].selCases[caseid]['state'] = new Object();
        window.selProjects[projid].selCases[caseid]['state']['view']=false;
        window.selProjects[projid].selCases[caseid]['totalChild'] = totalStudies;
        window.selProjects[projid].selCases[caseid]['studymp']={};
        window.selProjects[projid].selCases[caseid]['numChildFullCheck'] = 0;
        window.selProjects[projid].selCases[caseid]['numChildMixCheck'] = 0;
        window.selProjects[projid].selCases[caseid]['numChildNoCheck'] = totalStudies;
        window.selProjects[projid].selCases[caseid]['numChecksAbove'] = 0;
        window.selProjects[projid].selCases[caseid]['totalStudies']=$(row).attr('data-totalstudies');
        window.selProjects[projid].selCases[caseid]['totalSeries']=$(row).attr('data-totalseries');
    }


     // calculate the cartnum value and 'state' of the cart selection for a project(collection) table row or case table row.
    //  Currently only used for the cases table
    const calcProjectOrCaseRowCounts = function(ids){
        //return [0,false,false,false]
        var cntSeriesInCart = 0;
        var cntSeriesInFilt=0;
        var studymp= new Object();
        var studympFilt=new Object();
        var selItem=new Object();
        var maxSeries = 0;
        var studyMpFiltDefined = false;

        var numSeriesInItem = 0;
        if (ids.length ==1 && (ids[0] in stats)){
            var numSeriesInItem = stats[ids[0]];
        }
        if ((ids.length==1) && (ids[0] in window.projstudymp)){
            studymp=window.projstudymp[ids[0]];
        }
        if ((ids.length==1) && (ids[0] in window.selProjects)){
            maxSeries = stats['series_per_collec'][ids[0]];
            selItem = window.selProjects[ids[0]]
            if (('studymp' in window.selProjects[ids[0]]) && !(typeof(window.selProjects[ids[0]].studymp) =="undefined")) {
                studympFilt = window.selProjects[ids[0]].studymp;
                studympFiltDefined = true;
            }
        }
        if ( (ids.length==2) && (ids[1] in window.casestudymp)){
            studymp=window.casestudymp[ids[1]];
        }

         if ((ids.length==2) && (ids[0] in window.selProjects) && (ids[1] in window.selProjects[ids[0]].selCases)) {
             maxSeries = window.selProjects[ids[0]].selCases[ids[1]].maxseries;
             selItem = window.selProjects[ids[0]].selCases[ids[1]];
             if (('studymp' in window.selProjects[ids[0]].selCases[ids[1]]) && !(typeof(window.selProjects[ids[0]].selCases[ids[1]].studymp) =="undefined")) {
              studympFilt = window.selProjects[ids[0]].selCases[ids[1]].studymp;
              studympFiltDefined = true;
            }
        }

        for (var studyid in studymp){
            if (studyid in window.glblcart){
                if (window.glblcart[studyid]['all']){
                  cntSeriesInCart += window.studymp[studyid]['cnt']
               } else{
                  cntSeriesInCart += window.glblcart[studyid]['sel'].size
              }
            }
            if (studyid in studympFilt){
                cntSeriesInFilt += studympFilt[studyid]
            }
        }
        //return cnt.toString();
        return [cntSeriesInCart, cntSeriesInFilt, maxSeries, studyMpFiltDefined ];
    }

    // update the Study table if a case is clicked in the Cases table, or update the Series table if a study is clicked in the Studies table
    window.updateCasesOrStudiesViewSelection = function(rowA, type, rowsAdded) {
        var updateret= new Object();
        var purgeChildTables = [true];
        $(rowA).each(function () {
            if (type === 'cases') {
                var projid = $(this).data('projectid');
                var caseid = $(this).data('caseid');
                var totalStudies = $(this).data('totalstudies');
                var totalSeries = $(this).data('totalseries');
                if (!(caseid in window.selProjects[projid].selCases)) {
                    initCaseDataAndRow(projid, caseid, rowA, totalStudies);
                }
                window.selProjects[projid].selCases[caseid]['state']['view'] = rowsAdded;
                updateret = rowsAdded;
                if (!(rowsAdded)){
                    removeFromView("case", [projid, caseid]);
                }
                //updateStudyTable(rowsAdded, rowsRemoved, false, purgeChildSelections,[],caseID, parseInt(totalStudies), parseInt(totalSeries));

            } else if (type === 'studies') {
                var projid = $(this).data('projectid');
                var caseid = $(this).data('caseid');
                var studyid = $(this).data('studyid');
                var totalSeries = $(this).data('totalseries');

                if (!(studyid in window.selProjects[projid].selCases[caseid].selStudies)) {
                    initStudyDataAndRow(projid, caseid, studyid, rowA, totalSeries);
                }
                window.selProjects[projid].selCases[caseid].selStudies[studyid]['state']['view'] = rowsAdded;
                updateret = rowsAdded;
            }
        });

        if (type === 'cases') {
            var studyID = "";
            if ($('#studies_tab').find('.studyID-inp').length > 0) {
                studyID = $('#studies_tab').find('.studyID-inp').val();
            }
            updateStudyTable(rowsAdded,  studyID);
        } else if (type === 'studies') {
            var seriesID = "";
            if ($('#series_tab').find('.seriesID-inp').length > 0) {
                seriesID = $('#series_tab').find('.seriesID-inp').val();
            }
            updateSeriesTable(rowsAdded, !rowsAdded, false, seriesID);
        }
       return updateret;
    }

    window.updateStudyTable = function(rowsAdded, studyID) {
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

                    if ($(row).attr('series_in_cart')>0)
                    {
                        $(row).addClass('someInCart');
                    }
                    else{
                        $(row).removeClass('someInCart');
                    }

                    if ($(row).attr('series_in_cart')<$(row).attr('mxseries'))
                    {
                        $(row).addClass('extraInItem');
                    }
                    else{
                        $(row).removeClass('extraInItem');
                    }


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
                    {className: "ckbx", "targets": [2]},
                    {className: "col1 case-id", "targets": [3]},
                    {className: "col2 study-id study-id-col study-id-tltp", "targets": [4]},
                    {className: "col1 study-date", "targets": [5]},
                    {className: "col1 study-description", "targets": [6]},
                    {className: "col1 numrows", "targets": [7]},
                    {className: "ohif open-viewer", "targets": [8]},
                ],
                "columns": [
                    {
                        "type": "html",
                        "orderable": false,
                        "data": "StudyInstanceUID",
                        render: function (StudyInstanceUID, type, row) {
                            var PatientID= row['PatientID']
                            var collection_id=row['collection_id']
                            if ( (PatientID in window.openStudies) && (data in window.openStudies[PatientID])) {
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
                                if ( (Array.isArray(row['Modality']) && row['Modality'].some(function(el){
                                    return nonViewAbleModality.has(el)
                                }) ) || nonViewAbleModality.has(row['Modality']) )   {
                                    return '<a href="/" onclick="return false;"><i class="fa-solid fa-eye-slash not-viewable"></i>';
                                } else if (( Array.isArray(modality) && modality.includes('SM')) || (modality === 'SM')) {
                                    return '<a href="' + SLIM_VIEWER_PATH + data + '" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-eye"></i>'
                                 } else {
                                    let v2_link = is_xc ? "" : OHIF_V2_PATH + data;
                                    let v3_link = OHIF_V3_PATH + "=" + data;
                                    let v2_element = '<li title="Not available for this modality."><a class="disabled" href="'
                                        + v2_link + '" target="_blank" rel="noopener noreferrer">OHIF v2</a></li>';
                                    let default_viewer = is_xc ? v3_link : v2_link;
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
                                        v2_element +
                                        '<li><a href="'+v3_link+'" target="_blank" rel="noopener noreferrer">OHIF v3</a></li>' +
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
                    } else {
                        var ret = checkClientCache(request, 'studies');
                        ssCallNeeded = ret[0];
                        var reorderNeeded = ret[1];
                        if (ssCallNeeded) {
                            var curFilterObj = filterutils.parseFilterObj();
                            curFilterObj.collection_id = viewCollections;
                            curFilterObj.PatientID = viewCases;
                            if (studyID.trim().length > 0) {
                                curFilterObj.StudyInstanceUID = studyID;

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
                                        window.studiesCache = new Object();
                                        colSort = ["", "", "PatientID", "StudyInstanceUID","StudyDate","StudyDescription","unique_series"]
                                        updateCache(window.studiesCache, request, backendReqStrt, backendReqLength, data, colSort);
                                        dataset = data['res'].slice(request.start - backendReqStrt, request.start - backendReqStrt + request.length);

                                        callback({
                                            "data": dataset,
                                            "recordsTotal": data["cnt"],
                                            "recordsFiltered": data["cnt"]
                                        })
                                    } catch(err){
                                      console.log('error processing data');
                                   alert("There was an error processing the server data. Please alert the systems administrator")
                                   }
                                },
                                error: function () {
                                    console.log("problem getting data");
                                    alert("There was an error fetching server data. Please alert the systems administrator");
                                    callback({"data": [], "recordsTotal": "0", "recordsFiltered": "0"})
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
                            })
                        }
                    }
                }
            });
        } catch(err){
            alert("The following error error was reported when processing server data: "+ err +". Please alert the systems administrator")
        }

        $('#studies_tab').on('draw.dt', function(){
            $('#studies_table_head').children('tr').children().each(function(){
                this.style.width=null;
                }
            );
        })

        $('#studies_tab').children('tbody').attr('id','studies_table');
        $('#studies_tab_wrapper').find('.dataTables_controls').find('.dataTables_length').after('<div class="dataTables_goto_page"><label>Page </label><input class="goto-page-number" type="number"><button onclick="changePage(\'studies_tab_wrapper\')">Go</button></div>');
        $('#studies_tab_wrapper').find('.dataTables_controls').find('.dataTables_paginate').after('<div class="dataTables_filter"><strong>Find by Study Instance UID:</strong><input class="studyID_inp" type="text-box" value="'+studyID+'"><button onclick="filterTable(\'studies_tab_wrapper\',\'studyID\')">Go</button></div>');
    }
    const initStudyDataAndRow = function(projid, caseid, studyid, row,totalSeries){
        window.selProjects[projid].selCases[caseid].selStudies[studyid] = new Object();
        window.selProjects[projid].selCases[caseid].selStudies[studyid].selSeries = new Object();
        window.selProjects[projid].selCases[caseid].selStudies[studyid]['state'] = new Object();
        window.selProjects[projid].selCases[caseid].selStudies[studyid]['state']['view']=false;
        window.selProjects[projid].selCases[caseid].selStudies[studyid]['totalChild'] = totalSeries;
        window.selProjects[projid].selCases[caseid].selStudies[studyid]['studymp']= new Object();
        window.selProjects[projid].selCases[caseid].selStudies[studyid]['numChildFullCheck'] = 0;
        window.selProjects[projid].selCases[caseid].selStudies[studyid]['numChildMixCheck'] = 0;
        window.selProjects[projid].selCases[caseid].selStudies[studyid]['numChildNoCheck'] = totalSeries;
        window.selProjects[projid].selCases[caseid].selStudies[studyid]['totalSeries']=$(row).attr('data-totalseries');
    }


    window.updateSeriesTable = function(rowsAdded, seriesID) {
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

                    var collection_id=data['collection_id'][0];
                    var PatientID=data['PatientID'];
                    var studyid= data['StudyInstanceUID'];
                    var seriesid = data['SeriesInstanceUID'];


                     $(row).find('.shopping-cart').parent().on('click', function(event){
                         $(row).find('.shopping-cart-holder').trigger('shopping-cart:update-started');
                         setTimeout(function(){
                            var elem = event.target;
                            if ($(elem).hasClass('ckbx')){
                                elem=$(elem).find('.shopping-cart')[0];
                            }
                            var addingToCart = true;
                            if ($(elem).parentsUntil('tr').parent().hasClass('someInCart')) {
                                addingToCart = false;
                            } else {
                                addingToCart = true;
                            }

                         }, 100);
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
                    {className: "download", "targets": [8]},

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
                            let default_viewer = (modality === "XC" || (Array.isArray(modality) && modality.includes("XC"))) ? v3_link : v2_link;
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
                                v2_element +
                                '<li><a href="'+v3_link+'" target="_blank" rel="noopener noreferrer">OHIF v3</a></li>' +
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
                } else {
                    var ret = checkClientCache(request, 'series');
                    ssCallNeeded = ret[0]
                    var reorderNeeded = ret[1];

                    if (ssCallNeeded) {
                        var curFilterObj = new Object();

                        curFilterObj.StudyInstanceUID = viewStudies;
                        if (seriesID.trim().length > 0) {
                                curFilterObj.SeriesInstanceUID = seriesID;
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
                                    })
                                }
                                catch(err){
                                      console.log('error processing data');
                                   alert("There was an error processing the server data. Please alert the systems administrator")
                                }
                            },
                            error: function () {
                                console.log("problem getting data");
                                alert("There was an error fetching server data. Please alert the systems administrator")
                                $('#series_tab').children('thead').children('tr').children('.ckbx').addClass('notVis');
                                callback({"data": [], "recordsTotal": "0", "recordsFiltered": "0"})
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
                        })
                    }
                }
              }
           });
        }
        catch(err){
            alert("The following nerror was reported when processing server data: "+ err +". Please alert the systems administrator");
        }

        $('#series_tab').on('draw.dt', function(){
            $('#series_table_head').children('tr').children().each(function(){
                this.style.width=null;
            });
        });
        $('#series_tab').children('tbody').attr('id','series_table');
        $('#series_tab_wrapper').find('.dataTables_controls').find('.dataTables_length').after('<div class="dataTables_goto_page"><label>Page </label><input class="goto-page-number" type="number"><button onclick="changePage(\'series_tab_wrapper\')">Go</button></div>');
        $('#series_tab_wrapper').find('.dataTables_controls').find('.dataTables_paginate').after('<div class="dataTables_filter"><strong>Find by Series Instance UID:</strong><input class="seriesID_inp" type="text-box" value="'+seriesID+'"><button onclick="filterTable(\'series_tab_wrapper\',\'seriesID\')">Go</button></div>');
    }
    const initSeriesData =function(projid, caseid, studyid, seriesid){
        window.selProjects[projid].selCases[caseid].selStudies[studyid].selSeries[seriesid] = new Object();
        window.selProjects[projid].selCases[caseid].selStudies[studyid].selSeries[seriesid]['state'] = new Object();
        window.selProjects[projid].selCases[caseid].selStudies[studyid].selSeries[seriesid]['state']['incart']=false;
    }

     const propagateCartTableStatChangesUpstream = function(numadded, ids){
        var tableset = ["projects_table","cases_table","studies"];
        for (var i=0;i<ids.length-1;i++){

            var tbl= tableset[i];

            var rowsel = $("#"+tbl).find('tr').filter('[data-projectid = "'+ids[0]+'"]');
            if (i>1){
                rowsel = rowsel.filter('[data-caseid="'+ids[1]+'"]')
            }
            if (i>2){
                rowsel = rowsel.filter('[data-studyid="'+ids[2]+'"]')
            }
            rowsel.each(function(){
               var incart=0;
               var inboth=0;
               if (this.hasAttribute("series_in_cart")){
                   incart = $(this).attr("series_in_cart");
               }
               if (this.hasAttribute("series_in_filter_and_cart")){
                   inboth = $(this).attr("series_in_filter_and_cart");
               }
               $(this).attr("series_in_cart", incart+numadded);
               $(this).attr("series_in_filter_and_cart", inboth+numadded);
               $(this).find('.cartnum').val(incart+numadded);

               if ($(this).attr("series_in_cart")>0){
                      if (($(this).attr("series_in_cart"))<($(this).attr("mxseries"))){
                           $(this).addClass('someInCart');
                           $(this).addClass('extraInItem');
                       } else {
                           $(this).addClass('someInCart');
                           $(this).removeClass('extraInItem');
                       }
               }
               else{
                   $(this).addClass('extraInItem');
                   $(this).removeClass('someInCart');
                }

            });

         }
       }


     const propagateCartTableStatChangesDownStream = function(addingToCart,ids){
        var tableset = ["cases_table","studies", "series"]
        //var cacheset = ["casesTableCache","studiesTableCache", "seriesTableCache"]
        var numids = ids.length-1;
        for (var i =numids;i<3;i++){
            var tbl= tableset[i];

            var rowsel = $("#"+tbl).find('tr').filter('[data-projectid = "'+ids[0]+'"]');
            if (ids.length>1){
                rowsel = rowsel.filter('[data-caseid="'+ids[1]+'"]')
            }
            if (ids.length>2){
                rowsel = rowsel.filter('[data-studyid="'+ids[2]+'"]')
            }

            rowsel.each(function(){
               if (i<2) {
                   if (addingToCart) {
                       var seriesinboth = 0;
                       var newseries = 0;
                       if (this.hasAttribute("series_in_filter_and_cart")) {
                           seriesinboth = parseInt($(this).attr("series_in_filter_and_cart"));
                           newseries = parseInt($(this).attr("series_in_filter")) - parseInt($(this).attr("series_in_filter_and_cart"));
                          }
                       else {
                           seriesinboth = 0
                           newseries = parseInt($(this).attr("series_in_filter"));
                          }
                       $(this).attr("series_in_filter_and_cart", seriesinboth + newseries);
                       var incart = 0;
                       if (this.hasAttribute("series_in_cart")) {
                           incart = parseInt($(this).attr("series_in_cart"));
                       }
                       $(this).attr("series_in_cart", incart + newseries);
                       $(this).find(".cartnum").text((incart + newseries).toString());
                   } else {
                       var seriesremoved = 0;
                       if (this.hasAttribute("series_in_filter_and_cart")) {
                           seriesremoved = parseInt($(this).attr("series_in_filter_and_cart"));
                           var incart = parseInt($(this).attr("series_in_cart"));

                           $(this).attr("series_in_filter_and_cart", 0);
                           $(this).attr("series_in_cart", incart - seriesremoved);
                           $(this).find(".cartnum").text((incart - seriesremoved).toString());
                       }
                   }
                   if (this.hasAttribute("series_in_cart")) {
                       if (parseInt($(this).attr("series_in_cart")) < parseInt($(this).attr("mxseries"))) {
                           $(this).addClass('someInCart');
                           $(this).addClass('extraInItem');
                       } else {
                           $(this).addClass('someInCart');
                           $(this).removeClass('extraInItem');
                        }
                     }
                      else {
                       $(this).removeClass('someInCart');
                       $(this).addClass('extraInItem');
                     }
                 }

               else{

                   if (addingToCart){
                     $(this).addClass('someInCart');
                       if (parseInt($(this).attr('series_in_cart'))<parseInt($(this).attr('mxseries'))){
                           $(this).addClass('extraInItem');
                       }
                       else{
                           $(this).removeClass('extraInItem');
                       }
                    }
                   else {
                       $(this).removeClass('someInCart');
                       $(this).addClass('extraInItem')
                   }
               }

             });

        }
    }
     const propagateTableCacheCartChangesUpstream = function(numadded, ids){
        var cacheset = ["casesCache","studiesCache"];
        var projid=ids[0];
        var caseid=ids[1];
        var studyid;

        if (ids.length>2){
            studyid=ids[2]
        }
        for (var i=0;i<ids.length-1;i++){
            var rowFound = true;
            var cacheArr = window[cacheset[i]]['data'];

            for (cacheRow in cacheArr){
                if ((projid == cacheRow['collection_id']) && (caseid == cacheRow['PatientID'])){
                    if ((ids.length<3) || (studyid == cacheRow['StudyInstanceUID'])) {
                        rowFound = true;
                    }
                }
                if (rowFound){
                    if ('unique_series_cart' in row){
                        row['unique_series_cart']=row['unique_series_cart']+numadded;
                    }
                    else{
                         row['unique_series_cart']=numadded;
                    }
                    if ('unique_series_filter_and_cart' in row){
                        row['unique_series_filter_cart']=row['unique_series_filter_cart']+numadded;
                    }
                    else{
                        row['unique_series_filter_cart']=numadded;
                    }
                    break;
                }
            }
        }

     }

     const propagateTableCacheCartChangesDownstream = function(addingToCart, ids) {
        var cacheset = ["casesTableCache","studyTableCache","seriesTableCache"];
        var projid=ids[0];
        var caseid;
        var studyid;
        if (ids.length>1){
            caseid=ids[1]
        }

        if (ids.length>2){
            studyid=ids[2]
        }
        for (var i=ids.length-1;i<cacheset.length;i++){
            var cacheArr = window[cacheset[i]]['data'];
            for (var cacheRow in cacheArr){
                var rowMatches= false;
                if ((projid == cacheRow['collection_id'])){
                    if ((ids.length<1) || (caseid == cacheRow['PatientID'])) {
                        if ((ids.length<2) || (studyid == cacheRow['StudyInstanceUID'])){
                            rowMatches = true;
                        }
                    }
                }
                if ((rowMatches) && addingToCart){
                    //add all series from filter to cart and record in cache row
                    var addednum;
                    if ('unique_series_filter_cart' in row){
                         addednum = row['unique_series_filter']-row['unique_series_filter_cart']
                    }
                    else{
                        addednum = row['unique_series_filter']-row['unique_series_filter_cart']
                    }
                    row['unique_series_cart']=row['unique_series_cart']+addednum;
                    row['unique_series_filter_cart']=row['unique_series_filter'];

                }
                else if ((rowMatches) && !addingToCart){
                    var removenum;
                    if ('unique_series_filter_cart' in row){
                        removenum=row['unique_series_filter_cart'];
                    }
                    else{
                        removenum=0;
                    }
                    row['unique_series_filter_cart']=0
                    row['unique_series_cart']=row['unique_series_cart']-removenum;
                }
            }
        }

     }


    const handleCartClick = function(tabletype, row, elem, ids){
            //$(row).find('.shopping-cart-holder').trigger('shopping-cart:update-started');
             var addingToCart = true;
             if ($(elem).parentsUntil('tr').parent().hasClass('someInCart')) {
                 addingToCart = false;
             } else {
                 addingToCart = true;
             }

             var newSel={}
             newSel['added'] = addingToCart;
             newSel['sel'] = ids;
             cartutils.updateCartSelections(newSel);
             window.updatePartitionsFromScratch();
             var ret =cartutils.formcartdata();
             window.partitions = ret[0];
             window.filtergrp_list = ret[1];

             var series_in_cart=0;
             if (row.hasAttribute("series_in_cart")){
                 series_in_cart=parseInt($(row).attr("series_in_cart"));
             }
             var series_in_filter=0;
             if (row.hasAttribute("series_in_filter")) {
                 series_in_filter = parseInt($(row).attr("series_in_filter"));
             }
             var series_in_filter_and_cart=0;
             if (row.hasAttribute("series_in_filter_and_cart")) {
                 series_in_filter_and_cart = parseInt($(row).attr("series_in_filter_and_cart"));
             }
             var series_in_filter_not_cart = series_in_filter - series_in_filter_and_cart;


             var series_added=0;
             if (addingToCart){
                  series_in_cart = series_in_filter_not_cart + series_in_cart;
                  series_in_filter_and_cart = series_in_filter_not_cart + series_in_filter_and_cart;
                 $(row).attr("series_in_cart", series_in_cart);
                 $(row).attr("series_in_filter_and_cart", series_in_filter_and_cart);
                 var seriesAdded = series_in_filter_not_cart;

                 $(row).find('.cartnum').text(series_in_cart);
                 $(row).addClass('someInCart');
                 if (($(row).attr("series_in_cart"))<($(row).attr("series_in_cart"))){
                     $(row).addClass('extraInItem');
                 }
                 else{
                     $(row).removeClass('extraInItem');
                 }

             }
             else{

                 series_in_cart = series_in_cart - series_in_filter_and_cart;
                 series_in_filter_and_cart = 0;
                 $(row).attr("series_in_cart", series_in_cart);
                 $(row).attr("series_in_filter_and_cart", series_in_filter_and_cart);
                 $(row).addClass('extraInItem');
                 if ($(row).attr("series_in_cart")==0){
                     $(row).removeClass('someInCart');
                 }
                 $(row).find('.cartnum').text(series_in_cart);

                 var seriesAdded = -series_in_filter_and_cart;
             }
             if (ids.length>1) {
                 propagateCartTableStatChangesUpstream(seriesAdded, ids);
                 propagateTableCacheCartChangesUpstream(seriesAdded, ids);
             }
             if (ids.length<4){
                 propagateCartTableStatChangesDownStream(addingToCart, ids);
                 propagateTableCacheCartChangesDownstream(addingToCart, ids);
             }

    };
    const handleRowClick =  function(tabletype, row, event, ids){
        let elem = event.target;
        if ($(elem).hasClass('collection_info')) {
            displayInfo($(elem));
                        }
         else if ($(elem).hasClass('copy-this') || $(elem).hasClass('fa-copy')) {
                            //do nothing. handled by triggers in base.js and explore.js to copy to clipboard and show a copy tooltip
                        }
         else if ($(elem).hasClass('shopping-cart') || $(elem).hasClass('shopping-cart-holder')) {
             handleCartClick(tabletype, row, elem, ids);
         }
         // click anywhere else, open tables below
         else {
             var caseTableUpdate = false;
             var studyTableUpdate = false;
             var seriesTableUpdate = false;

             let toggle_elem = $(row).find('.expansion-toggle')
             if (toggle_elem.length>0) {
                 var rowsAdded;
                 toggle_elem = toggle_elem[0];
                 $(toggle_elem).hasClass('open') ? $(toggle_elem).removeClass('open') : $(toggle_elem).addClass('open');
             }

                 if ($(row).find('.fa-caret-down.is-hidden').length>0){
                     rowsAdded = true;
                     $(row).find('.fa-caret-right').addClass('is-hidden');
                     $(row).find('.fa-caret-down').removeClass('is-hidden');

                 } else {
                     $(row).find('.fa-caret-right').removeClass('is-hidden');
                     $(row).find('.fa-caret-down').addClass('is-hidden');
                 }

                 if (tabletype == "collections") {
                     caseTableUpdate = true;
                     //updateProjectViewSelection([$(row)], rowsAdded);
                     var projid = ids[0]
                     if (rowsAdded) {
                         window.openProjects[projid] =1;
                     }
                     else {
                         if (projid in window.openProjects){
                             delete(window.openProjects[projid]);
                         }
                         if (projid in window.openCases){
                             studyTableUpdate = true;
                             for (caseid in window.openCases[projid] ){
                                 if (caseid in window.openStudies){
                                     seriesTableUpdate = true;
                                     delete(window.openStudies[caseid])
                                 }
                            }
                            delete(openCases[projid]);
                        }
                      }
                 }
                 else if (tabletype === 'cases') {
                     studyTableUpdate = true;
                     var projid=ids[0];
                     var caseid=ids[1];
                     if (rowsAdded){
                         if (!(projid in window.openCases)){
                             window.openCases[projid]={}
                         }
                         window.openCases[projid][caseid]=1
                     }
                     else{
                         if ((projid in window.openCases) && (caseid in window.openCases[projid])){
                             delete(window.openCases[projid][caseid])
                         }
                         if (caseid in window.openStudies){
                             seriesTableUpdate = true;
                             delete(window.openStudies[caseid])
                         }
                     }
                 } else if (tabletype === 'studies') {
                     seriesTableUpdate  = true;
                     var projid=ids[0];
                     var caseid=ids[1];
                     var studyid =ids[2];
                     if (rowsAdded){
                         if( !(caseid in window.openStudies)){
                             window.openStudies[caseid]={}
                         }
                         window.openStudies[caseid][studyid]=1
                     }
                     else{
                         if ((caseid in window.openStudies) && (studyid in window.openStudies[caseid])){
                             delete (window.openStudies[caseid][studyid]);
                         }
                     }
               }
               if (caseTableUpdate) {
                   var caseID = "";
                   if ($('#cases_tab').find('.caseID-inp').length > 0) {
                       caseID = $('#studies_tab').find('.caseID-inp').val();
                   }
                   updateCaseTable(rowsAdded, caseID);
               }
               if (studyTableUpdate) {
                   var studyID = "";
                   if ($('#studies_tab').find('.studyID-inp').length > 0) {
                       studyID = $('#studies_tab').find('.studyID-inp').val();
                   }
                   updateStudyTable(rowsAdded, studyID);
               }
               if (seriesTableUpdate){
                   var seriesID = "";
                     if ($('#series_tab').find('.seriesID-inp').length > 0) {
                     seriesID = $('#series_tab').find('.seriesID-inp').val();
                 }
                updateSeriesTable(rowsAdded, seriesID);

               }
         }

    }

    //deprecated. open several items for view in the child table
    window.updateMultipleRowsa=function(table,add,type){
        rowA=$(table).find('tbody').children();
        rowArr = new Array();
        $(rowA).each(function(){
                $(this).children('.ckbx').children().prop("checked",add);
                rowArr.push($(this))
        });
        if (type === 'projects'){
            updateProjectViewSelection(rowArr);
        }
        else {
            updateCasesOrStudiesViewSelection(rowA, type, true);
        }
    }
    // change the view page for any table
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
    //filter table based on 'Search' text
    window.filterTable = function(wrapper, type){
        var elem=$('#'+wrapper);
        var varStr=elem.find('.dataTables_controls').find('.'+type+'_inp').val();
        if (type ==="seriesID") {
            window.updateSeriesTable(false,varStr)
        }

        else if (type ==="studyID") {
            window.updateStudyTable(false,  varStr)
        }
        else if (type==="caseID"){
            window.updateCaseTable(false,varStr)
        }
    }



    //  get arrays of cases, studies that are being 'viewed' in the child tables
    const getKeysByState = function(dic,state){
        var ret=[]
        var keyArr=Object.keys(dic)
        for (i=0;i<keyArr.length;i++){
            var ckey=keyArr[i]
            if ( ('state' in dic[ckey]) && (state in dic[ckey]['state']) && (dic[ckey]['state'][state]) ){
                ret.push(ckey)
            }
        }
        return ret
    }
    const getCasesByState = function(state){
        var ret=[];
        for (projid in window.selProjects){
            nkeys=getKeysByState(window.selProjects[projid].selCases,state);
            ret=[...ret,...nkeys];
        }
        return ret;
    }
    const getStudiesByState = function(state){
        ret=[];
        for (projid in window.selProjects){
            for (caseid in window.selProjects[projid].selCases) {
                nkeys = getKeysByState(window.selProjects[projid].selCases[caseid].selStudies, state);
                ret = [...ret,...nkeys];
            }
        }
        return ret;
    }

    // change data structures to reflect that a certain item is not open for viewing
    const removeFromView = function(type, ref){
        var projid=ref[0];
        var caseid='';
        var studyid='';
        var seriesid='';
        var parDic=new Object();
        var curDic = new Object();
        var childDic = new Object();
        var table='';
        var datatype='';
        var id='';
        var child='';

        if (type=='project'){

            parDic=window.selProjects;
            curDic=window.selProjects[projid];
             id=projid;
            childDic=window.selProjects[projid].selCases;
            child='selCases';
            table='projects_table';
            datatype='data-projectid'

        }
        if (type=='case'){
            caseid=ref[1]
            parDic=window.selProjects[projid].selCases
            id=caseid;
            curDic=window.selProjects[projid].selCases[caseid];
            childDic=window.selProjects[projid].selCases[caseid].selStudies;
            child='selStudies'
            childType='study';
            table='cases_table';
            datatype='data-caseid';
        }
        if (type=='study'){
            caseid=ref[1];
            studyid=ref[2];
            parDic=window.selProjects[projid].selCases[caseid].selStudies;
            id=studyid;
            curDic=window.selProjects[projid].selCases[caseid].selStudies[studyid];
            child='selStudies';
            table='studies_table';
            datatype='data-studyid';
        }

        curDic[child]= new Object();
        if ('state' in curDic){
            curDic['state']['view'] = false;
        }

    }



    // update the cartnums, classes on the cart columns of all rows of all tables
    window.updateTableCounts = function() {
        $('#proj_table').DataTable().rows().every(function() {
              var row = this.node();
              var projid = $(row).attr('data-projectid')
              $(row).find('.cartnum').text('0');
              $(row).addClass('extraInFilt');
              $(row).removeClass('someInCart');
              $(row).removeClass('extraInCart');
              $(row).addClass('extraInItem');
              $(row).addClass('willAdd');
              if ('someInCart' in window.selProjects[projid]) {
                  delete (window.selProjects[projid]['someInCart']);
              }
              if ('extraInCart' in window.selProjects[projid]) {
                  delete (window.selProjects[projid]['extraInCart']);
              }
              window.selProjects[projid]['extraInFilt']=true;
              window.selProjects[projid]['extraInItem'] = true;
              if ('studymp' in window.selProjects[projid]){
                  delete (window.selProjects[projid]['extraInFilt']);
                 $(row).removeClass('extraInFilt');
                 $(row).removeClass('willAdd');
                  for (studyid in window.selProjects[projid].studymp) {
                      if (!(studyid in window.glblcart) || !(window.glblcart[studyid]['all'])) {
                          $(row).addClass('extraInFilt');
                          $(row).addClass('willAdd');
                          window.selProjects[projid]['extraInFilt'] = true;
                          break;
                      }
                  }
              }
          });

           $('#cases_table').find('tr').each(function () {
               if (this.hasAttribute('data-caseid')) {
                   $(this).find('.cartnum').text('0');
                   var projid = $(this).attr('data-projectid');
                   var caseid = $(this).attr('data-caseid');

                   $(this).removeClass('extraInFilt');
                    $(this).removeClass('someInCart');
                    $(this).removeClass('extraInCart');

                    $(this).addClass('extraInItem');
                    window.selProjects[projid].selCases[caseid]['extraInItem']=true;

                    if ('someInCart' in window.selProjects[projid].selCases[caseid]){
                      delete(window.selProjects[projid].selCases[caseid]['someInCart']);
                    }
                    if ('extraInCart' in window.selProjects[projid].selCases[caseid]){
                      delete(window.selProjects[projid].selCases[caseid]['extraInCart']);
                    }
                    if ('extraInFilt' in window.selProjects[projid].selCases[caseid]){
                      delete(window.selProjects[projid].selCases[caseid]['extraInFilt']);
                      $(this).removeClass('willAdd');
                    }

                    for (studyid in window.selProjects[projid].selCases[caseid].studymp) {
                        if (!(studyid in window.glblcart) || !(window.glblcart[studyid]['all'])) {
                            $(this).addClass('extraInFilt');
                            $(this).addClass('willAdd');
                            window.selProjects[projid].selCases[caseid]['extraInFilt']=true;
                            break;
                        }
                    }
               }
           });

           $('#studies_table').find('tr').each(function () {
               if (this.hasAttribute('data-studyid')) {
                    updateStudyRowCount(this);
                 }
           });

           $('#series_table').find('tr').each(function () {
               if (this.hasAttribute('id')) {
               updateSeriesRowCount(this);
              }
           });

        for (studyid in window.glblcart){
            var seriesMissing = false;
            var cnt=0;
            if (studyid in window.studymp){
              var projid = window.studymp[studyid]['proj'];
              var caseid = window.studymp[studyid]['PatientID'];


              if (window.glblcart[studyid]['all']){
                  cnt = window.studymp[studyid]['cnt'];
              }
              else{
                  cnt =window.glblcart[studyid]['sel'].size;
                  seriesMissing = true;
              }

               var nm="#project_row_"+projid;
              $('#proj_table').DataTable().rows([nm]).every(function(){
                  var row = this.node();

               //$('#projects_table').find('[data-projectid='+projid+']').each(function(){
                   var maxseries = stats['series_per_collec'][projid]
                   $(row).addClass('someInCart');
                   window.selProjects[projid]['someInCart']=true;
                   var curval=parseInt($(row).find('.cartnum').text());
                   var nval= cnt+curval;
                   if (nval>= maxseries){
                       $(row).removeClass('extraInItem');
                       if ('extraInItem' in window.selProjects[projid]) {
                           delete(window.selProjects[projid]['extraInItem'])
                       }
                   }
                    if (isNaN(cnt)){
                       var stp=1;
                   }
                   if (isNaN(curval)){
                       var stp=1;
                   }

                   $(row).find('.cartnum').text(nval.toString());

               });

              $('#cases_table').find('[data-caseid='+caseid+']').each(function(){
                  $(this).addClass('someInCart');
                  window.selProjects[projid].selCases[caseid]['someInCart']=true;
                  var maxseries = window.selProjects[projid].selCases[caseid].maxseries;
                   var curval=parseInt($(this).find('.cartnum').text());
                   if (isNaN(cnt)){
                       alert('no!')
                   }
                   if (isNaN(curval)){
                       alert('no!')
                   }
                   var nval= cnt+curval
                   if (nval>= maxseries){
                       $(this).removeClass('extraInItem');
                       if ('extraInItem' in window.selProjects[projid].selCases[caseid]) {
                           delete(window.selProjects[projid].selCases[caseid]['extraInItem'])
                       }
                   }

                   $(this).find('.cartnum').text(nval.toString());
                   if (nval.toString()=='NaN'){
                       alert('her');
                   }
               });
            }
        }
    }
    const updateStudyRowCount= function(row){
        if ($(row).find('.cartnum').length > 0) {
          ;

          $(row).removeClass('extraInFilt');
          $(row).removeClass('someInCart');
          $(row).find('.cartnum').text('0');
          var idfull = row.id;
          var studyid = idfull.substr(6, idfull.length - 6);
          var projid=$(row).attr('data-projectid');
          var caseid=$(row).attr('data-caseid');

          var cnt = 0;

          if ('someInCart' in window.selProjects[projid].selCases[caseid].selStudies[studyid]){
              delete(window.selProjects[projid].selCases[caseid].selStudies[studyid]['someInCart']);
          }

          $(row).addClass('extraInFilt');
          window.selProjects[projid].selCases[caseid].selStudies[studyid]['extraInFilt']=true;

          if (studyid in window.glblcart) {
              $(row).addClass('someInCart');
              window.selProjects[projid].selCases[caseid].selStudies[studyid]['someInCart'] = true;
              if (window.glblcart[studyid]['all']) {
                  cnt = window.studymp[studyid]['cnt'];
                  $(row).removeClass('extraInFilt');
                  if ('extraInFilt' in window.selProjects[projid].selCases[caseid].selStudies[studyid]){
                      delete (window.selProjects[projid].selCases[caseid].selStudies[studyid]['extraInFilt']);
                  }

              } else {
                  $(row).addClass('extraInFilt');
                  window.selProjects[projid].selCases[caseid].selStudies[studyid]['extraInFilt'] = true;
                  cnt = window.glblcart[studyid]['sel'].size
              }
              $(row).find('.cartnum').text(cnt.toString());
          }
        }

    }
    const updateSeriesRowCount = function(row){
        if ($(row).find('.shopping-cart').length > 0) {
           var studyid = $(row).attr('data-studyid');
           var seriesid = $(row).attr('id').toString().substring(7);
           if (studyid in window.glblcart) {
               if ((window.glblcart[studyid]['all']) || (window.glblcart[studyid]['sel'].has(seriesid))) {
                   $(row).addClass('someInCart');
                   $(row).removeClass('willAdd');
               } else {
                   $(row).removeClass('someInCart');
                   $(row).addClass('willAdd');
               }
           } else {
               $(row).removeClass('someInCart');
               $(row).addClass('willAdd');
           }
       }
    };

    // update window.studymp based on any new information from the server
    const updateStudyMp=function(newmap){
        for (var ky in newmap) {
            if (!(ky in window.studymp)) {
                window.studymp[ky] = newmap[ky]
                if (!('cnt' in window.studymp[ky]) && ('val' in window.studymp[ky])) {
                    window.studymp[ky]['cnt'] = window.studymp[ky]['val'].length;
                }
            } else if (newmap[ky]['val'].length > window.studymp[ky]['val'].length) {
                window.studymp[ky]['val'] = newmap[ky]['val'];
                window.studymp[ky]['cnt'] = window.studymp[ky]['val'].length;
            }
        }
    }

    const pretty_print_id = function (id) {
        var newId = id.slice(0, 8) + '...' + id.slice(id.length - 8, id.length);
        return newId;
    }
    return {
        initializeTableCacheData: initializeTableCacheData,
        initializeTableViewedItemsData: initializeTableViewedItemsData,
        initProjectData:initProjectData

    };
});
