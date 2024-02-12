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
        jquery: 'libs/jquery-3.5.1',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security/script',
        underscore: 'libs/underscore-min',
        assetscore: 'libs/assets.core',
        assetsresponsive: 'libs/assets.responsive',
        tablesorter:'libs/jquery.tablesorter.min',
        filterutils:'filterutils'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'tablesorter': ['jquery'],
        'underscore': {exports: '_'},
        'filterutils':['jquery']
    }
});

// Set up common JS UI actions which span most views
require([
    'filterutils',
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'underscore',
    'utils',
    'assetscore',
    'assetsresponsive',
    'tablesorter'
], function(filterutils,$, jqueryui, bootstrap, session_security, _, utils) {
    'use strict';


});

// Return an object for consts/methods used by most views
define(['filterutils','jquery', 'utils'], function(filterutils, $, utils) {


    window.updateTablesAfterFilter = function (collFilt, collectionsData, collectionStats){
        var rmSelCases = new Array();
        var usedCollectionData = new Array();
        rmCases = []
        var hasColl = collFilt.length>0 ? true : false;
        for (var i=0;i<window.collectionData.length;i++){
            var cRow = window.collectionData[i];
            var projId=cRow[0];
            if ( (projId in collectionsData) && (!hasColl || (collFilt.indexOf(projId)>-1)) ){
                cRow[3] = collectionsData[projId]['count'];
            }
            else {
               cRow[3] = 0;
            }

            if (cRow[3]>0) {
                usedCollectionData.push(cRow);
            }

        }

        for (projid in window.selProjects) {
            if ( ('state' in window.selProjects[projid]) && ('view' in window.selProjects[projid]['state'])){
                delete(window.selProjects[projid]['state']['view']);
            }

            for (caseid in window.selProjects[projid].selCases){
                if (('state' in window.selProjects[projid].selCases[caseid]) && ('view' in window.selProjects[projid].selCases[caseid]['state'])){
                    delete(window.selProjects[projid].selCases[caseid]['state']['view']);
                }
            }
        }

        updateProjectTable(usedCollectionData,collectionStats);
        initializeTableData();
        $('#cases_tab').DataTable().destroy();
        $('#studies_tab').DataTable().destroy();
        $('#series_tab').DataTable().destroy();

        updateCaseTable(false, false, true, [false,false], rmSelCases,'',-1, -1);

    }

    window.updateProjectTable = function(collectionData,collectionStats) {
        newCollectionData = []

        for (i = 0;i<collectionData.length;i++){
            cur=collectionData[i];
            ncur=[cur[0], cur[0], cur[0], cur[1],cur[2],cur[3]];
            newCollectionData.push(ncur);
        }

        $('#proj_table').DataTable().destroy();
        $("#proj_table_wrapper").find('.dataTables_controls').remove();
        $('#proj_table').DataTable(
            {
                "dom": '<"dataTables_controls"ilpf>rt<"bottom"><"clear">',
                "order": [[3, "asc"]],
                "data": newCollectionData,
                "createdRow": function (row, data, dataIndex) {
                    $(row).data('projectid', data[0]);
                    $(row).attr('data-projectid', data[0]);
                    $(row).data('totalcases', data[5]);
                    $(row).attr('totalcases', data[5]);
                    $(row).attr('id', 'project_row_' + data[0]);
                    if (Object.keys(collectionStats).length>0){
                        if (('study_per_collec' in collectionStats) && (data[0] in collectionStats['study_per_collec'])){
                            $(row).attr('totalstudy', collectionStats['study_per_collec'][data[0]]);
                        }
                        if (('series_per_collec' in collectionStats) && (data[0] in collectionStats['series_per_collec'])){
                            $(row).attr('totalseries', collectionStats['series_per_collec'][data[0]]);
                        }
                        if (('size_per_collec' in collectionStats) && (data[0] in collectionStats['size_per_collec'])){
                            $(row).attr('totalsize', collectionStats['size_per_collec'][data[0]]);
                        }
                    }

                    $(row).find('.caseview').on('click', function(event){
                        var elem = event.target;
                        updateProjectSelection([$(row)]);
                    })
                    $(row).find('.fa-cart-shopping').parent().on('click', function(event){
                        var elem = event.target;
                        if ($(elem).hasClass('ckbx')){
                            elem=$(elem).find('.fa-cart-shopping')[0];
                        }
                        var rowsAdded = false;
                        var projid=data[0]

                        window.selProjects[projid]['totalChild']=parseInt($(row).attr('totalcases'));
                        window.selProjects[projid]['totalCases']=parseInt($(row).attr('totalcases'));
                        window.selProjects[projid]['totalStudies']=parseInt($(row).attr('totalstudy'));
                        window.selProjects[projid]['totalSeries']=parseInt($(row).attr('totalseries'));
                        /*
                        if (!('mxseries' in window.selProjects[projid]) || (window.selProjects[projid]['mxseries']<window.selProjects[projid]['totalSeries'])){
                            window.selProjects[projid]['mxseries']=window.selProjects[projid]['totalSeries'];
                        }
                        if (!('mxstudies' in window.selProjects[projid]) || (window.selProjects[projid]['mxstudies']<window.selProjects[projid]['totalStudies'])){
                            window.selProjects[projid]['mxstudies']=window.selProjects[projid]['totalStudies'];
                        }*/

                        if (  ($(elem).hasClass('selected'))  ){
                            rowsAdded = false;
                            $(elem).removeClass('selected');
                            $(elem).removeClass('partselected');
                            $(elem).addClass('unselected');
                            window.selProjects[projid]['state']['checked']=false;
                        }
                        else {
                             rowsAdded = true;

                            $(elem).removeClass('unselected');
                            $(elem).addClass('selected');
                            $(elem).removeClass('partselected');
                            window.selProjects[projid]['state']['checked']=true;

                        }
                        clearChildStates([data[0]],rowsAdded,'project');
                        clearChildSelections([data[0]]);
                        updateProjStudyMp(projid,window.selProjects[projid]['totalStudies'], window.selProjects[projid]['totalSeries'], window.filterSet[0].selProjects[projid]['mxstudies'], window.filterSet[0].selProjects[projid]['mxseries']);
                        //mksearchtwo();

                    });


                },
                "columnDefs": [
                    {className: "ckbx text_data viewbx", "targets": [0]},
                    {className: "ckbx", "targets": [1]},
                    {className: "ckbx cartnum", "targets": [2]},

                    {className: "collex_name", "targets": [3]},
                    {className: "projects_table_num_cohort", "targets": [5]},
                ],
                "columns": [
                    {
                        "type": "html", "orderable": false, render: function (data) {
                            if (('state' in window.selProjects[data]) && ('view' in window.selProjects[data]['state']) && (window.selProjects[data]['state']['view'] )) {
                                //return '<input type="checkbox" checked>'
                               return '<a role="button" class="caseview">'+
                                    '<i class="fa fa-solid fa-caret-right notDisp" style="font-family :\'Font Awesome 6 Free\' !important"></i>' +
                                    '<i class="fa fa-solid fa-caret-down" style="font-family :\'Font Awesome 6 Free\' !important"></i></a>'

                            }
                            else {
                                return '<a role="button" class="caseview">'+
                                    '<i class="fa fa-solid fa-caret-right " style="font-family :\'Font Awesome 6 Free\' !important"></i>' +
                                    '<i class="fa fa-solid fa-caret-down notDisp" style="font-family :\'Font Awesome 6 Free\' !important"></i></a>'

                            }
                        }
                    },
                    {"type": "html", "orderable": false, render: function (data) {
                            var selState = checkSelectionState([data]);
                            return '<i class="fa-solid fa-cart-shopping '+selState+'">';
                        }
                    },

                    {"type": "html", "orderable": false, render: function(data){
                        var projid=data;
                        return (updateProjectOrCaseRowCount([projid]));
                        }},
                    {"type": "text", "orderable": true},
                    {"type": "num", orderable: true},
                    {
                        "type": "num", orderable: true, "createdCell": function (td, data, row) {
                            $(td).attr('id', 'patient_col_' + row[0]);
                            return;
                        }
                    }
                ]
            }
        );
        //"createdCell":function(td,data,row){$(td).attr("id","patient_col_"+row[1]);}
        $('#proj_table').children('tbody').attr('id', 'projects_table');
        $('#proj_table')[0].style.width=null;
    }

    const updateProjStudyMp = function(projid, totStudies, totSeries, mxStudies, mxSeries){

        var curFilterObj = JSON.parse(JSON.stringify(filterutils.parseFilterObj()));
        curFilterObj.collection_id = projid;
        var filterStr = JSON.stringify(curFilterObj);
        let url = '/studymp/';
        url = encodeURI(url);
        let ndic = {'filters': filterStr, 'totstudies': totStudies, 'totseries': totSeries, 'mxstudies': mxStudies, 'mxseries':mxSeries}
        if (!('studymp' in window.selProjects[projid])){
            window.selProjects[projid]['studymp']={};
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
                window.selProjects[projid]['studymp']=data['studymp']
                if (!(projid in window.projstudymp)){
                    window.projstudymp[projid]={}
                }
                for (studyid in data['studymp']){
                    window.projstudymp[projid][studyid] = data['studymp'][studyid]
                }
                for (caseid in data['casestudymp']){
                    if (!(caseid in window.casestudymp)) {
                        window.casestudymp[caseid] = {}
                    }
                    for (studyid in data['casestudymp'][caseid]){
                            window.casestudymp[caseid][studyid]=data['casestudymp'][caseid][studyid]
                    }
                }

                if ('seriesmp' in data){
                    updateSeriesMp(data['seriesmp'])
                }
                mksearchtwo();
                },
            error: function () {
                console.log("problem getting data");
            }
        });
    }

    const cartCalcs= function(ids){
      var projid=ids[0];
      var caseid;
      var studyid;
      var projSelector=$('#projects_table').filter('[data-projectid="'+projid+'"]');
      var caseSelector= new Object();
      var studySelector = new Object();
      if (ids.length ==1){
          caseSelector=$('#cases_table').filter('[data-projectid="'+projid+'"]');
          studySelector=$('#studies_table').filter('[data-projectid="'+projid+'"]');
      }
      else if (ids.length==2){
          caseSelector=$('#cases_table').filter('[data-caseid="'+ids[1]+'"]');
          studySelector=$('#studies_table').filter('[data-caseid="'+ids[1]+'"]');
      }
      else if (ids.length==3){
          caseSelector=$('#cases_table').filter('[data-caseid="'+ids[1]+'"]');
          studySelector=$('#studies_table').filter('[data-studyid="'+ids[2]+'"]');
      }
      projSelector.each(function(){
          var projid = $(this).attr('data-projid');
          var studymp = window.selProjects[projid].studymp;
          var tot= calcCart(studymp);
          $(this).find('.cartnum').text(tot.toString());
      });

      caseSelector.each(function(){
          var projid = $(this).attr('data-projid');
          var caseid = $(this).attr('data-caseid');
          var studymp = window.selProjects[projid].selCases[caseid].studymp;
          var tot= calcCart(studymp);
          $(this).find('.cartnum').text(tot.toString());
      });

      studySelector.each(function(){
          var studyid = $(this).attr('data-studyid');
          var cnt= parseInt($(this).attr('data-totalseries'));
          var tot= calcCart({studyid:cnt});
          $(this).find('.cartnum').text(tot.toString());
      });


    }

    var calcCart = function(studymp){
        //var dics=['selProjects', 'selCases', 'selStudies']
        var tot=0;
        for (studyid in studymp){
            if (studyid in window.cart){
                if (window.cart[studyid]['all']){
                    tot+= window.cart[studyid]['totnum'];
                }
                else{
                    tot+= window.cart[studyid]['series'].length;
                }
            }
        }
        return tot;

    }

    window.updateCaseTable = function(rowsAdded, rowsRemoved, refreshAfterFilter,updateChildTables, rmSelCases, caseID, studylimit, serieslimit) {
        $('#cases_tab').data('rowsremoved',rowsRemoved);
        $('#cases_tab').data('refreshafterfilter',refreshAfterFilter);
        $('#cases_tab').data('updatechildtables',updateChildTables);
        var viewProjects = getKeysByState(window.selProjects,'view')
        if ($('#cases_tab_wrapper').find('.dataTables_controls').length>0){
            pageRows = parseInt($('#cases_tab_wrapper').find('.dataTables_length select').val());
        }
        else {
            pageRows = 10;
        }
        $('#cases_tab').DataTable().destroy();
        try{
            $('#cases_tab').DataTable({
                "iDisplayLength": pageRows,
                "autoWidth": false,
                "dom": '<"dataTables_controls"ilp>rt<"bottom"><"clear">',
                "order": [[3, "asc"]],
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

                    if (!(caseid in window.selProjects[projid].selCases)) {
                        initCaseDataAndRow(projid, caseid, row, data['unique_study']);
                     }
                    window.selProjects[projid].selCases[caseid]['studymp']=data['studyid'];
                    if (!(caseid in window.casestudymp)){
                        window.casestudymp[caseid]={}
                    }


                    if (!(projid in window.projstudymp)){
                        window.projstudymp[projid]={}
                    }
                    if (!('studymp'  in window.selProjects[projid])){
                        window.selProjects[projid]['studymp'] ={};
                    }
                    for (id in data['studyid']){
                        window.selProjects[projid]['studymp'][id]=data['studyid'][id];
                        window.projstudymp[projid][id]=data['studyid'][id];
                        window.casestudymp[caseid][id]=data['studyid'][id];
                    }


                    var cnt = updateProjectOrCaseRowCount([projid,caseid]);
                    $(row).find('.cartnum').html(cnt);

                    $(row).find('.studyview').on('click', function(event){
                        var elem = event.target;
                        var rowsAdded= ($(row).find('.fa-caret-down.notDisp').length>0 )?true:false
                        if (rowsAdded){
                            $(row).find('.fa-caret-down').removeClass('notDisp');
                            $(row).find('.fa-caret-right').addClass('notDisp');
                        }
                        else{
                            $(row).find('.fa-caret-down').addClass('notDisp');
                            $(row).find('.fa-caret-right').removeClass('notDisp');
                        }
                        updateCasesOrStudiesSelection([$(row)], 'cases', true,rowsAdded)
                    });
                    $(row).find('.fa-cart-shopping').parent().on('click', function(event){
                        var elem = event.target;
                        if ($(elem).hasClass('ckbx')){
                            elem=$(elem).find('.fa-cart-shopping')[0];
                        }

                        var rowsAdded = true;
                        if ($(elem).hasClass('selected')){
                            rowsAdded = false;
                        }
                        //clearProjectChildSelections(data[0]);
                        var ischecked=updateCasesOrStudiesSelection([$(row)], 'cases', false, rowsAdded);

                        chnglvl= propagateSelection([data['collection_id'][0],data['PatientID']], ischecked);
                        if (chnglvl=='project'){
                            clearChildStates(data['collection_id'][0],rowsAdded,'project');
                            clearChildSelections([data['collection_id'][0]]);
                        }
                        else{
                          clearChildStates(data['PatientID'],rowsAdded,'case');
                          clearChildSelections([data['collection_id'][0],data['PatientID']]);
                        }

                        mksearchtwo();
                    });

                },
                "columnDefs": [
                    {className: "ckbx", "targets": [0,1]},
                    {className: "cartnum ckbx", "targets":[2]},
                    {className: "col1 project-name", "targets": [3]},
                    {className: "col1 case-id", "targets": [4]},
                    {className: "col1 numrows", "targets": [5]},
                    {className: "col1", "targets": [6]},
                ],
                "columns": [
                    {
                        "type": "html", "orderable": false, "data":"PatientID", render: function (PatientID, type, row) {
                            collection_id=row['collection_id'][0]
                            if ((collection_id in window.selProjects) && (PatientID in window.selProjects[collection_id].selCases) && (window.selProjects[collection_id].selCases[PatientID]['state']['view'] )) {
                                //return '<input type="checkbox" checked>'
                               return '<a role="button" class="studyview">'+
                                    '<i class="fa fa-solid fa-caret-right notDisp" style="font-family :\'Font Awesome 6 Free\' !important"></i>' +
                                    '<i class="fa fa-solid fa-caret-down" style="font-family :\'Font Awesome 6 Free\' !important"></i></a>'

                            }
                            else {
                                return '<a role="button" class="studyview">'+
                                    '<i class="fa fa-solid fa-caret-right " style="font-family :\'Font Awesome 6 Free\' !important"></i>' +
                                    '<i class="fa fa-solid fa-caret-down notDisp" style="font-family :\'Font Awesome 6 Free\' !important"></i></a>'

                            }
                        }
                    },
                    {"type": "html", "orderable": false, "data": "PatientID",
                        render: function (PatientID, type, row) {
                            var collection_id = row['collection_id'][0];
                            var selState = checkSelectionState([collection_id, PatientID]);
                            return '<i class="fa-solid fa-cart-shopping '+selState+'"></i>';

                        }
                    },
                    {"type": "html", "orderable": false, "data": "PatientID", render: function(PatientID, type, row){
                        return '0';
                        }},

                    {"type": "text", "orderable": true, data: 'collection_id', render: function (data) {
                            var projectNm = $('#' + data).filter('.collection_name')[0].innerText;
                            return projectNm;
                        }
                    },
                    {"type": "text", "orderable": true, data: 'PatientID', render: function (data) {
                            return data;
                        }
                    },
                    {"type": "num", "orderable": true, data: 'unique_study'},
                    {"type": "num", "orderable": true, data: 'unique_series'}
                ],
                "processing": true,
                "serverSide": true,
                "ajax": function (request, callback, settings) {
                    var backendReqLength = 500;
                    var backendReqStrt = Math.max(0, request.start - Math.floor(backendReqLength * 0.5));

                    var rowsRemoved = $('#cases_tab').data('rowsremoved');
                    var refreshAfterFilter = $('#cases_tab').data('refreshafterfilter');
                    var updateChildTables = $('#cases_tab').data('updatechildtables');
                    var checkIds = new Array();
                    var cols = ['', '','','collection_id', 'PatientID', 'StudyInstanceUID', 'SeriesInstanceUID'];
                    var ssCallNeeded = true;
                    if (viewProjects.length === 0) {
                        ssCallNeeded = false;
                        $('#cases_tab').children('thead').children('tr').children('.ckbx').addClass('notVis');
                        //updateChildTables = cleanChildSelections([], 'cases', true);
                        studyID = '';
                        if ($('#studies_tab_wrapper').find('.studyID_inp').length > 0) {
                            studyID = $('#studies_tab_wrapper').find('.studyID_inp').val().trim();
                        }

                        updateStudyTable(false, true, refreshAfterFilter, [updateChildTables[1]], studyID);
                        callback({"data": [], "recordsTotal": "0", "recordsFiltered": "0"})
                    } else {
                        var ret = checkClientCache(request, 'cases');
                        var ssCallNeeded = ret[0];
                        var reorderNeeded = ret[1];
                        var checkIds=[]
                        if (ssCallNeeded) {
                            if (refreshAfterFilter) {
                                for (var id in viewProjects) {
                                    var projid=viewProjects[id]
                                     checkIds = checkIds.concat(Object.keys(window.selProjects[projid].selCases))
                                }
                            }
                            var curFilterObj = JSON.parse(JSON.stringify(filterutils.parseFilterObj()));
                            curFilterObj.collection_id = viewProjects;

                            if (caseID.trim().length>0){
                                curFilterObj.PatientID = caseID;
                                if (checkIds.indexOf(caseID) > -1) {
                                    checkIds = [caseID];
                                }
                            }

                            var filterStr = JSON.stringify(curFilterObj);
                            let url = '/tables/cases/';
                            url = encodeURI(url);
                            ndic = {'filters': filterStr, 'limit': 2000}
                            ndic['checkids'] = JSON.stringify(checkIds);

                            ndic['offset'] = backendReqStrt;
                            ndic['limit'] = backendReqLength;
                            if (studylimit>0){
                                ndic['studylimit'] = studylimit;
                            }
                            if (serieslimit>0){
                                ndic['serieslimit'] = serieslimit;
                            }

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
                                window.casesCache = new Object();
                                colSort = ["", "", "","collection_id", "PatientID", "unique_study", "unique_series"];
                                updateCache(window.casesCache, request, backendReqStrt, backendReqLength, data, colSort);
                                dataset = data['res'].slice(request.start - backendReqStrt, request.start - backendReqStrt + request.length);
                                if ('seriesmp' in data){
                                    updateSeriesMp(data['seriesmp']);
                                }
                                    /* for (set in dataset) {
                                        set['ids'] = {'PatientID': set['PatientID'], 'collection_id': set['collection_id']}
                                    }*/
                                    if (dataset.length > 0) {
                                        $('#cases_tab').children('thead').children('tr').children('.ckbx').removeClass('notVis');
                                    } else {
                                        $('#cases_tab').children('thead').children('tr').children('.ckbx').addClass('notVis');
                                    }

                                    if (refreshAfterFilter && ((data['diff'].length > 0) || (rmSelCases.length > 0))) {

                                        var studyID = '';
                                        if ($('#studies_tab').find('.studyID_inp').length > 0) {
                                            studyID = $('#studies_tab').find('.studyID_inp').val().trim();
                                        }
                                        updateStudyTable(false, true, true, true, studyID);
                                    } else {
                                        var studyID = "";
                                        if ($('.studies_tab').find('#study_id').length > 0) {
                                            studyID = $('#studies_tab').find('.studyID-inp').val();
                                        }
                                        updateStudyTable(false, true, false, [updateChildTables[1]], studyID);
                                    }
                                    callback({
                                        "data": dataset,
                                        "recordsTotal": data["cnt"],
                                        "recordsFiltered": data["cnt"]
                                    })

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
        }
        catch(err){
            alert("The following error occurred trying to update the case table:" +err+". Please alert the systems administrator");
        }

        $('#cases_tab').on('draw.dt', function(){
            $('#cases_table_head').children('tr').children().each(function(){
                this.style.width=null;
                }
            );

            if ( ($('#cases_table').find('tr').length===0) ||  ($('#cases_table').find('.fa-cart-shopping').filter('.unselected, .partselected').length>0)){
                $('#cases_table_head').find('.fa-cart-shopping').removeClass('selected');
                $('#cases_table_head').find('.fa-cart-shopping').addClass('unselected');
            }
            else{
                $('#cases_table_head').find('.fa-cart-shopping').addClass('selected');
                $('#cases_table_head').find('.fa-cart-shopping').removeClass('unselected');

            }

        })

        $('#cases_tab').find('tbody').attr('id','cases_table');
        $('#cases_panel').find('.dataTables_controls').find('.dataTables_length').after('<div class="dataTables_goto_page"><label>Page </label><input class="goto-page-number" type="number"><button onclick="changePage(\'cases_tab_wrapper\')">Go</button></div>');
        $('#cases_panel').find('.dataTables_controls').find('.dataTables_paginate').after('<div class="dataTables_filter"><strong>Find by Case ID:</strong><input class="caseID_inp" type="text-box" value="'+caseID+'"><button onclick="filterTable(\'cases_panel\',\'caseID\')">Go</button></div>');
    }

    window.updateStudyTable = function(rowsAdded, rowsRemoved, refreshAfterFilter,updateChildTables,studyID) {
        let nonViewAbleModality= new Set(["XC"]);
        $('#studies_tab').data('rowsremoved',rowsRemoved);
        $('#studies_tab').data('refreshafterfilter',refreshAfterFilter);
        $('#studies_tab').data('updatechildtables',updateChildTables);
        var viewCases = getCasesByState('view');
        if ($('#studies_tab_wrapper').find('.dataTables_controls').length>0){
            pageRows = parseInt($('#studies_tab_wrapper').find('.dataTables_length select').val());
        }
        else {
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
                    $(row).attr('data-projectid', data['collection_id']);
                    $(row).attr('data-totalseries', parseInt(data['unique_series']));
                    $(row).addClass('text_head');
                    $(row).addClass('project_' + data['collection_id']);
                    $(row).addClass('case_' + data['PatientID']);

                    var projid = data['collection_id'][0];
                    var caseid=data['PatientID']
                    var studyid =data['StudyInstanceUID']

                    if (!(studyid in window.selProjects[projid].selCases[caseid].selStudies)) {
                        initStudyDataAndRow(projid, caseid, studyid, row, data['unique_series']);
                     }
                    window.selProjects[projid].selCases[caseid].selStudies[studyid]['seriesmp']=data['seriesmp'];
                    $(row).find('.seriesview').on('click', function(event){
                        var elem = event.target;
                        var rowsAdded= ($(row).find('.fa-caret-down.notDisp').length>0 )?true:false
                        if (rowsAdded){
                            $(row).find('.fa-caret-down').removeClass('notDisp');
                            $(row).find('.fa-caret-right').addClass('notDisp');
                        }
                        else{
                            $(row).find('.fa-caret-down').addClass('notDisp');
                            $(row).find('.fa-caret-right').removeClass('notDisp');
                        }
                        updateCasesOrStudiesSelection([$(row)], 'studies', true,rowsAdded)
                    });

                    $(row).find('.fa-cart-shopping').parent().on('click', function(event){
                        var elem = event.target;
                        if ($(elem).hasClass('ckbx')){
                            elem=$(elem).find('.fa-cart-shopping')[0];
                        }

                        var rowsAdded = true;
                        if ($(elem).hasClass('selected')){
                            rowsAdded = false;
                        }
                        //clearProjectChildSelections(data[0]);
                        var ischecked=updateCasesOrStudiesSelection([$(row)], 'studies', false, rowsAdded);

                        chnglvl= propagateSelection([data['collection_id'][0],data['PatientID'], data['StudyInstanceUID']], ischecked);
                        if (chnglvl=='project'){
                            clearChildStates(data['collection_id'][0],rowsAdded,'project');
                            clearChildSelections([data['collection_id'][0]]);
                        }
                        else if (chnglvl=='case' ){
                          clearChildStates(data['PatientID'],rowsAdded,'case');
                          clearChildSelections([data['collection_id'][0],data['PatientID']]);
                        }
                        else{
                            clearChildStates(data['StudyInstanceUID'],rowsAdded,'study');
                          clearChildSelections([data['collection_id'][0],data['PatientID'], data['StudyInstanceUID']]);
                        }

                        mksearchtwo();
                    });



                },
                "columnDefs": [
                    {className: "ckbx", "targets": [0,1]},
                    {className: "ckbx, cartnum", "targets": [2]},
                    {className: "col1 case-id", "targets": [3]},
                    {className: "col2 study-id study-id-col study-id-tltp", "targets": [4]},
                    {className: "col1 study-date", "targets": [5]},
                    {className: "col1 study-description", "targets": [6]},
                    {className: "col1 numrows", "targets": [7]},
                    {className: "ohif open-viewer", "targets": [8]},

                ],
                "columns": [
                    {
                        "type": "html", "orderable": false, "data":"StudyInstanceUID", render: function (StudyInstanceUID, type, row) {
                            var PatientID= row['PatientID']
                            var collection_id=row['collection_id']
                            if ( (StudyInstanceUID in window.selProjects[collection_id].selCases[PatientID].selStudies) && ('view' in window.selProjects[collection_id].selCases[PatientID].selStudies[StudyInstanceUID]['state']) && window.selProjects[collection_id].selCases[PatientID].selStudies[StudyInstanceUID]['state']['view']) {
                                //return '<input type="checkbox" checked>'
                               return '<a role="button" class="seriesview">'+
                                    '<i class="fa fa-solid fa-caret-right notDisp" style="font-family :\'Font Awesome 6 Free\' !important"></i>' +
                                    '<i class="fa fa-solid fa-caret-down" style="font-family :\'Font Awesome 6 Free\' !important"></i></a>'

                            }
                            else {
                                return '<a role="button" class="seriesview">'+
                                    '<i class="fa fa-solid fa-caret-right " style="font-family :\'Font Awesome 6 Free\' !important"></i>' +
                                    '<i class="fa fa-solid fa-caret-down notDisp" style="font-family :\'Font Awesome 6 Free\' !important"></i></a>'

                            }
                        }
                    },
                    {
                        "type": "html",
                        "orderable": false,
                        data: 'StudyInstanceUID',
                        render: function (data, type, row) {

                            var collection_id=row['collection_id'][0];
                            var PatientID=row['PatientID'];
                            var StudyInstanceUID = row['StudyInstanceUID'];
                            var selState = checkSelectionState([collection_id, PatientID, StudyInstanceUID]);
                            return '<i class="fa-solid fa-cart-shopping '+selState+'"></i>';


                        }

                    },
                    {
                        "type": "html", "orderable": false, "data": "StudyInstanceUID", render: function (data) {
                            var cnt =0;
                            if (data in window.glblcart) {
                                 if (window.glblcart[studyid]['all']) {
                                     cnt += window.seriesmp[studyid]['val'].length
                                 } else {
                                     cnt += window.glblcart[studyid]['sel'].length
                                 }
                             }
                            return cnt.toString();
                        }
                    },

                    {
                        "type": "text", "orderable": true, data: 'PatientID', render: function (data) {
                            return data;
                        }
                    },{
                        "type": "text", "orderable": true, data: 'StudyInstanceUID', render: function (data) {
                            return pretty_print_id(data) +
                            ' <a class="copy-this-table" role="button" content="' + data +
                                '" title="Copy Study ID to the clipboard"><i class="fa-solid fa-copy"></i></a>';
                        },
                        "createdCell": function (td, data) {
                            $(td).data('study-id', data);
                            return;
                        }
                    },{
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
                            }
                            else {
                                coll_id=row['collection_id']
                            }
                            if (row['access'].includes('Limited') ) {
                                return '<i class="fa-solid fa-circle-minus coll-explain"></i>';
                            }
                            else {
                                var modality = row['Modality'];
                                if ( (Array.isArray(row['Modality']) && row['Modality'].some(function(el){
                                    return nonViewAbleModality.has(el)
                                }) ) || nonViewAbleModality.has(row['Modality']) )   {
                                    return '<a href="/" onclick="return false;"><i class="fa-solid fa-eye-slash not-viewable"></i>';
                                } else if (( Array.isArray(modality) && modality.includes('SM')) || (modality === 'SM')) {
                                    return '<a href="' + SLIM_VIEWER_PATH + data + '" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-eye"></i>'
                                 } else {
                                    let v2_link = OHIF_V2_PATH + data;
                                    let v3_link = OHIF_V3_PATH + "=" + data;
                                    let volView_link = VOLVIEW_PATH + "=[" + row['crdc_series_uuid'].map(function(i){
                                        return "s3://"+row['aws_bucket']+"/"+i;
                                    }).join(",") + ']"';
                                    return '<a href="' + v2_link + '" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-eye"></i>' +
                                        '<div class="dropdown viewer-toggle">' +
                                        '<a id="btnGroupDropViewers" class="dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true"><i class="fa-solid fa-caret-down"></i></a>' +
                                        '<ul class="dropdown-menu viewer-menu" aria-labelledby="btnGroupDropViewers">' +
                                        '<li><a href="'+v2_link+'" target="_blank" rel="noopener noreferrer">OHIF v2</a></li>' +
                                        '<li><a href="'+v3_link+'" target="_blank" rel="noopener noreferrer">OHIF v3</a></li>' +
                                        '<li><a class="external-link" href="" url="'+volView_link+'" ' +
                                        'data-toggle="modal" data-target="#external-web-warning">VolView ' +
                                        '<i class="fa-solid fa-external-link external-link-icon" aria-hidden="true">' +
                                        '</a></li>' +
                                        '</ul>' +
                                        '</div>';
                                }
                            }
                        }
                    }, {
                          "type":"html",
                          "orderable": false,
                          data: 'StudyInstanceUID', render: function (data){
                              return '<i class="fa fa-download study-export" data-uid="'+data+'"data-toggle="modal" data-target="#export-manifest-modal"></i>'
                          }

                      }
                ],
                "processing": true,
                "serverSide": true,
                "ajax": function (request, callback, settings, refreshAfterFilter) {
                    var backendReqLength = 500;
                    var backendReqStrt = Math.max(0, request.start - Math.floor(backendReqLength * 0.5));

                    var rowsRemoved = $('#studies_tab').data('rowsremoved');
                    var refreshAfterFilter = $('#studies_tab').data('refreshafterfilter');
                    //var updateChildTables = [$('#studies_tab').data('updatechildtables')];
                    var checkIds = new Array();
                    var cols = ['', '', 'PatientID', 'StudyInstanceUID', 'StudyDate','StudyDescription', 'SeriesInstanceUID'];
                    var ssCallNeeded = true;

                    var caseArr = viewCases;
                    /*for (projectid in window.selItems.selCases) {
                        for (var i = 0; i < window.selItems.selCases[projectid].length; i++) {
                            caseArr.push(window.selItems.selCases[projectid][i]);
                        }
                    }*/

                    if (caseArr.length === 0) {
                        ssCallNeeded = false;
                        $('#studies_tab').children('thead').children('tr').children('.ckbx').addClass('notVis');
                        if (refreshAfterFilter || updateChildTables[0]) {
                            var seriesID = "";
                            if ($('.series_tab').find('#series_id').length > 0) {
                                seriesID = $('#series_tab').find('.seriesID-inp').val();
                            }
                            //updateSeriesTable(false, true, false,seriesID)
                        }
                        callback({"data": [], "recordsTotal": "0", "recordsFiltered": "0"});
                    } else {
                        var ret = checkClientCache(request, 'studies');
                        ssCallNeeded = ret[0];
                        var reorderNeeded = ret[1];
                        if (ssCallNeeded) {
                            var curFilterObj = filterutils.parseFilterObj();
                            curFilterObj.collection_id = getKeysByState(window.selProjects,'view');
                            curFilterObj.PatientID = caseArr;
                            if (studyID.trim().length > 0) {
                                curFilterObj.StudyInstanceUID = studyID;

                            } else if (refreshAfterFilter){
                                checkIds=viewCases;
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
                            var csrftoken = $.getCookie('csrftoken');
                            $.ajax({
                                url: url,
                                dataType: 'json',
                                data: ndic,
                                type: 'post',
                                contentType: 'application/x-www-form-urlencoded',
                                beforeSend: function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                                success: function (data) {
                                    window.studiesCache = new Object();
                                    colSort = ["", "", "PatientID", "StudyInstanceUID","StudyDate","StudyDescription","unique_series"]
                                    updateCache(window.studiesCache, request, backendReqStrt, backendReqLength, data, colSort);
                                    if ('seriesmp' in data){
                                        updateSeriesMp(data['seriesmp']);
                                    }

                                    dataset = data['res'].slice(request.start - backendReqStrt, request.start - backendReqStrt + request.length);
                                    if (dataset.length > 0) {
                                        $('#studies_tab').children('thead').children('tr').children('.ckbx').removeClass('notVis');
                                    } else {
                                        $('#studies_tab').children('thead').children('tr').children('.ckbx').addClass('notVis');
                                    }

                                    if (ssCallNeeded) {
                                        var seriesID = "";
                                        if ($('.series_tab').find('#series_id').length > 0) {
                                            seriesID = $('#series_tab').find('.seriesID-inp').val();
                                        }
                                        //updateSeriesTable(false, true, false,seriesID)
                                    }
                                    callback({
                                        "data": dataset,
                                        "recordsTotal": data["cnt"],
                                        "recordsFiltered": data["cnt"]
                                    })

                                },
                                error: function () {
                                    console.log("problem getting data");
                                    alert("There was an error fetching server data. Please alert the systems administrator");
                                    $('#studies_tab').children('thead').children('tr').children('.ckbx').addClass('notVis');
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
        }
        catch(err){
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

    window.updateSeriesTable = function(rowsAdded, rowsRemoved, refreshAfterFilter,seriesID) {
        var nonViewAbleModality= new Set(["PR","SEG","RTSTRUCT","RTPLAN","RWV", "XC"])
        var slimViewAbleModality=new Set(["SM"])
        $('#series_tab').attr('data-rowsremoved', rowsRemoved);
        $('#series_tab').attr('data-refreshafterfilter', refreshAfterFilter);
        if ($('#series_tab_wrapper').find('.dataTables_controls').length>0){
            pageRows = parseInt($('#series_tab_wrapper').find('.dataTables_length select').val());
        }
        else {
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
                    $(row).attr('data-crdc',  data['crdc_series_uuid'])
                    $(row).attr('data-aws',  data['aws_bucket'])
                    $(row).attr('data-gcs',  data['gcs_bucket'])
                    $(row).addClass('text_head');
                 },
                "columnDefs": [
                    {className: "col1 study-id study-id-col study-id-tltp", "targets": [0]},
                    {className: "series-id series-id-tltp", "targets": [1]},
                    {className: "series-number", "targets": [2]},
                    {className: "col1 modality", "targets": [3]},
                    {className: "col1 body-part-examined", "targets": [4]},
                    {className: "series-description", "targets": [5]},
                    {className: "ohif open-viewer", "targets": [6]},
                    {className: "download", "targets": [7]},

                 ],
                  "columns": [
                  {
                    "type": "text", "orderable": true, data: 'StudyInstanceUID', render: function (data) {
                        return pretty_print_id(data) +
                            ' <a class="copy-this-table" role="button" content="' + data +
                                '"  title="Copy Study ID to the clipboard"><i class="fa-solid fa-copy"></i></a>';
                    }, "createdCell": function (td, data) {
                        $(td).data('study-id', data);
                        return;
                    }
                }, {
                    "type": "text", "orderable": true, data: 'SeriesInstanceUID', render: function (data) {
                        return pretty_print_id(data) +
                            ' <a class="copy-this-table" role="button" content="' + data +
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
                            let tooltip = (
                                row['Modality'] === "XC" || (Array.isArray(row['Modality']) && row['Modality'].includes("XC"))
                            ) ? "not-viewable" : "no-viewer-tooltip";
                            return `<a href="/" onclick="return false;"><i class="fa-solid fa-eye-slash ${tooltip}"></i>`;
                        } else if (  ( Array.isArray(row['Modality']) && row['Modality'].some(function(el){
                            return slimViewAbleModality.has(el)}
                        ) ) || (slimViewAbleModality.has(row['Modality']))) {
                            return '<a href="' + SLIM_VIEWER_PATH + row['StudyInstanceUID'] + '/series/' + data +
                                '" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-eye"></i>'
                        } else {
                            let v2_link = '<a href="' + OHIF_V2_PATH + row['StudyInstanceUID'] + '?SeriesInstanceUID=' +
                                data + '" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-eye"></i>';
                            let v3_link = OHIF_V3_PATH + "=" + row['StudyInstanceUID'] + '&SeriesInstanceUID=' + data;
                            let volView_link = VOLVIEW_PATH + "=[s3://" + row['aws_bucket'] + '/'+row['crdc_series_uuid']+']"';
                            return v2_link +
                                '<div class="dropdown viewer-toggle">' +
                                '<a id="btnGroupDropViewers" class="dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true"><i class="fa-solid fa-caret-down"></i></a>' +
                                '<ul class="dropdown-menu viewer-menu" aria-labelledby="btnGroupDropViewers">' +
                                '<li><a href="'+v3_link+'" target="_blank" rel="noopener noreferrer">OHIF v3</a></li>' +
                                '<li><a href="'+volView_link+'" target="_blank" rel="noopener noreferrer">VolView</a></li>' +
                                '</ul>' +
                                '</div>';
                        }
                    }
                }, {
                      "type":"html",
                      "orderable": false,
                      data: 'SeriesInstanceUID', render: function (data){
                          return '<i class="fa fa-download series-export" data-uid="'+data+'"data-toggle="modal" data-target="#export-manifest-modal"></i>'
                      }
                  }
            ],
            "processing": true,
            "serverSide": true,
            "ajax": function (request, callback, settings, refreshAfterFilter) {
                     var backendReqLength = 500;

                var backendReqStrt = Math.max(0, request.start - Math.floor(backendReqLength * 0.5));
                var rowsRemoved = $('#series_tab').data('rowsremoved');
                var refreshAfterFilter = $('#series_tab').data('refreshafterfilter');
                var cols = ['StudyInstanceUID', 'SeriesInstanceUID','SeriesNumber', 'Modality', 'BodyPartExamined', 'SeriesDescription']
                var ssCallNeeded = true;
                var caseArr = new Array();
                var studyArr = new Array();

                for (projid in window.selProjects) {

                    for (caseid in window.selProjects[projid].selCases){
                        /* if (('state' in window.selProjects[projid].selCases[caseid]) && window.selProjects[projid].selCases[caseid]['state']['view']){
                                caseArr.push(caseid);
                            } */
                        for (studyid in window.selProjects[projid].selCases[caseid].selStudies){
                            if (('state' in window.selProjects[projid].selCases[caseid].selStudies[studyid]) && window.selProjects[projid].selCases[caseid].selStudies[studyid]['state']['view']){
                                studyArr.push(studyid);
                            }
                        }
                    }
                }

                if (studyArr.length == 0) {
                    ssCallNeeded = false;
                    $('#series_tab').children('thead').children('tr').children('.ckbx').addClass('notVis');
                    callback({"data": [], "recordsTotal": "0", "recordsFiltered": "0"});
                } else {
                    var ret = checkClientCache(request, 'series');
                    ssCallNeeded = ret[0]
                    var reorderNeeded = ret[1];

                    if (ssCallNeeded) {
                        var curFilterObj = new Object();
                        //curFilterObj.collection_id = Object.keys(window.selProjects);
                        //curFilterObj.PatientID = caseArr;
                        curFilterObj.StudyInstanceUID = studyArr;
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
                                window.seriesCache = new Object();
                                var colSort = ['StudyInstanceUID', 'SeriesInstanceUID','SeriesNumber', 'Modality', 'BodyPartExamined', 'SeriesDescription']
                                updateCache(window.seriesCache, request, backendReqStrt, backendReqLength, data, colSort)
                                dataset = data['res'].slice(request.start - backendReqStrt, request.start - backendReqStrt + request.length);

                                callback({
                                    "data": dataset,
                                    "recordsTotal": data["cnt"],
                                    "recordsFiltered": data["cnt"]
                                })
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

    window.updateProjectSelection = function(rowA){
    var purgeChildSelections=[false,false]
    var rowsAdded=false;
    var rowsRemoved=false;
    var projid='';
        var totalCases =0;
        var totalStudies=0;
        var totalSeries=0;
    rowA.forEach(function(row) {
    var projid = $(row).data('projectid');
    totalCases= $(row).data('totalcases');
    totalStudies =$(row).attr('totalstudy');
    totalSeries =$(row).attr('totalseries');
    if ($(row).find('.fa-caret-down.notDisp').length>0){
        $(row).find('.fa-caret-right').addClass('notDisp');
        $(row).find('.fa-caret-down').removeClass('notDisp');
        if (!(projid in window.selProjects)) {
            window.selProjects[projid]=new Object();
            window.selProjects[projid]['selCases']=new Object();
            window.selProjects[projid]['state']={'view':true, 'selection':'none', 'added':true};
            window.selProjects[projid]['selDescNum']=0;
            window.selProjects[projid]['unselDescNum']=0;
            window.selProjects[projid]['partselDescNum']=0;
            window.selProjects[projid]['viewDescNum']=0;
            window.selProjects[projid]['totalCases']=totalCases;
            window.selProjects[projid]['totalStudies']=$(row).attr('totalstudy');
            window.selProjects[projid]['totalSeries']=$(row).attr('totalseries');

            rowsAdded = true;
        }
        else if (!(window.selProjects[projid]['state']['view'])){
            window.selProjects[projid]['state']['view'] = true;
            rowsAdded = true;
        }

    } else {
        $(row).find('.fa-caret-right').removeClass('notDisp');
        $(row).find('.fa-caret-down').addClass('notDisp');
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
    updateCaseTable(rowsAdded, rowsRemoved, false, purgeChildSelections,[],caseID, parseInt(totalStudies), parseInt(totalSeries));
    }

    window.updateCasesOrStudiesSelection = function(rowA, type, viewUpdate, rowsAdded) {
        var updateret= new Object();
        var purgeChildTables = [false];
        $(rowA).each(function () {
            if (type === 'cases') {
                var projid = $(this).data('projectid');
                var caseid = $(this).data('caseid');
                var totalStudies = $(this).data('totalstudies');

                if (!(caseid in window.selProjects[projid].selCases)) {
                    initCaseDataAndRow(projid, caseid, rowA, totalStudies);
                }

                if (viewUpdate) {
                    window.selProjects[projid].selCases[caseid]['state']['view'] = rowsAdded;
                    updateret = rowsAdded;
                }
                else {
                    if (rowsAdded){
                        $(this).find('.fa-cart-shopping').addClass('selected');
                        $(this).find('.fa-cart-shopping').removeClass('unselected');
                        $(this).find('.fa-cart-shopping').removeClass('partselected');
                    }
                    else{
                        $(this).find('.fa-cart-shopping').addClass('unselected');
                        $(this).find('.fa-cart-shopping').removeClass('selected');
                        $(this).find('.fa-cart-shopping').removeClass('partselected');
                    }
                    var ids=[projid]
                    var clicks =cntClicksInPath(ids)
                    var clicksEven = (clicks%2==0) ? true : false;
                    if ((rowsAdded && clicksEven) || (!rowsAdded && !clicksEven)){
                        window.selProjects[projid].selCases[caseid]['state']['checked'] = true;
                    }
                    else{
                        window.selProjects[projid].selCases[caseid]['state']['checked'] = false;
                    }
                   updateret = window.selProjects[projid].selCases[caseid]['state']['checked'];
                   }

                }

            else if (type === 'studies') {
                var projid = $(this).data('projectid');
                var caseid = $(this).data('caseid');
                var studyid = $(this).data('studyid');
                var totalSeries = $(this).data('totalseries');

                if (!(studyid in window.selProjects[projid].selCases[caseid].selStudies)) {
                    initStudyDataAndRow(projid, caseid, studyid, rowA, totalSeries);
                }
                if (viewUpdate) {
                    window.selProjects[projid].selCases[caseid].selStudies[studyid]['state']['view'] = rowsAdded;
                    updateret = rowsAdded;
                }
                else {
                    if (rowsAdded){
                        $(this).find('.fa-cart-shopping').addClass('selected');
                        $(this).find('.fa-cart-shopping').removeClass('unselected');
                        $(this).find('.fa-cart-shopping').removeClass('partselected');
                    }
                    else{
                         $(this).find('.fa-cart-shopping').addClass('unselected');
                        $(this).find('.fa-cart-shopping').removeClass('selected');
                        $(this).find('.fa-cart-shopping').removeClass('partselected');
                    }
                    var ids=[projid, caseid]
                    var clicks =cntClicksInPath(ids)
                    var clicksEven = (clicks%2==0) ? true : false;
                    if ((rowsAdded && clicksEven) || (!rowsAdded && !clicksEven)){
                        window.selProjects[projid].selCases[caseid].selStudies[studyid]['state']['checked'] = true;
                    }
                    else{
                        window.selProjects[projid].selCases[caseid].selStudies[studyid]['state']['checked'] = false;
                    }
                    updateret = window.selProjects[projid].selCases[caseid].selStudies[studyid]['state']['checked'];
                }
            }
        });

        if (viewUpdate) {
            if (type === 'cases') {
                var studyID = "";
                if ($('#studies_tab').find('.studyID-inp').length > 0) {
                    studyID = $('#studies_tab').find('.studyID-inp').val();
                }
                updateStudyTable(rowsAdded, !rowsAdded, false, purgeChildTables, studyID);
            } else if (type === 'studies') {
                var seriesID = "";
                if ($('#series_tab').find('.seriesID-inp').length > 0) {
                    seriesID = $('#series_tab').find('.seriesID-inp').val();
                }
                updateSeriesTable(rowsAdded, !rowsAdded, false, seriesID);
            }
        }
       return updateret;
    }

    const initProjectData = function(project){

        window.selProjects[project]['selCases']=new Object();
        window.selProjects[project]['state']={'view':false, 'checked':false};
        window.selProjects[project]['totalChild']=stats['patient_per_collec'][project];;
        window.selProjects[project]['numChildFullCheck']=0;
        window.selProjects[project]['numChildMixCheck'] = 0;
        window.selProjects[project]['numChildNoCheck']=stats['patient_per_collec'][project];
        window.selProjects[project]['numChecksAbove']=0;

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

    const initCaseDataAndRow = function(projid, caseid, row, totalStudies){
        window.selProjects[projid].selCases[caseid] = new Object();
        window.selProjects[projid].selCases[caseid].selStudies = new Object();
        window.selProjects[projid].selCases[caseid]['state'] = new Object();
        window.selProjects[projid].selCases[caseid]['state']['view']=false;
        window.selProjects[projid].selCases[caseid]['state']['checked']=false;
        window.selProjects[projid].selCases[caseid]['totalChild'] = totalStudies;
        window.selProjects[projid].selCases[caseid]['studymp']={};

        window.selProjects[projid].selCases[caseid]['numChildFullCheck'] = 0;
        window.selProjects[projid].selCases[caseid]['numChildMixCheck'] = 0;
        window.selProjects[projid].selCases[caseid]['numChildNoCheck'] = totalStudies;

        window.selProjects[projid].selCases[caseid]['numChecksAbove'] = 0;

        window.selProjects[projid].selCases[caseid]['totalStudies']=$(row).attr('data-totalstudies');
        window.selProjects[projid].selCases[caseid]['totalSeries']=$(row).attr('data-totalseries');
    }

    const initStudyDataAndRow = function(projid, caseid, studyid, row,totalSeries){
        window.selProjects[projid].selCases[caseid].selStudies[studyid] = new Object();
        window.selProjects[projid].selCases[caseid].selStudies[studyid].selSeries = new Object();
        window.selProjects[projid].selCases[caseid].selStudies[studyid]['state'] = new Object();
        window.selProjects[projid].selCases[caseid].selStudies[studyid]['state']['view']=false;
        window.selProjects[projid].selCases[caseid].selStudies[studyid]['state']['checked']=false;
        window.selProjects[projid].selCases[caseid].selStudies[studyid]['totalChild'] = totalSeries;
        window.selProjects[projid].selCases[caseid].selStudies[studyid]['seriesmp']={};
        window.selProjects[projid].selCases[caseid].selStudies[studyid]['numChildFullCheck'] = 0;
        window.selProjects[projid].selCases[caseid].selStudies[studyid]['numChildMixCheck'] = 0;
        window.selProjects[projid].selCases[caseid].selStudies[studyid]['numChildNoCheck'] = totalSeries;

        window.selProjects[projid].selCases[caseid].selStudies[studyid]['totalSeries']=$(row).attr('data-totalseries');

    }


    const checkSelectionState = function(inp){
        var selState = 'unselected';
        var isSel = false;
        var pdic = window.selProjects;
        var cdics=['selCases','selStudies','selSeries']
        for (var i=0;i<inp.length;i++)
        {
            ckey=inp[i]
            if (ckey in pdic ){
                var curDic = pdic[ckey];
                if ((inp.length == (i+1)) && ((curDic.numChildFullCheck>0) || ((curDic.numChildFullCheck>0))) ){
                   selState = 'partselected';
                }
                else if ('state' in curDic){
                    if (curDic['state']['checked']){
                        isSel = (isSel) ? false:true
                        selState = (isSel)? 'selected':'unselected'
                    }

                }
                if (i<=(inp.length-1)){
                    pdic=curDic[cdics[i]]

                }
            }
            else{
                break;
            }
        }
     return selState;
    }


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
        var childType='';

        if (type=='project'){

            parDic=window.selProjects;
            curDic=window.selProjects[projid];
             id=projid;
            childDic=window.selProjects[projid].selCases;
            childType='case';
            table='projects_table';
            datatype='data-projectid'

        }
        if (type=='case'){
            caseid=ref[1]
            parDic=window.selProjects[projid].selCases
            id=caseid;
            curDic=window.selProjects[projid].selCases[caseid];
            childDic=window.selProjects[projid].selCases[caseid].selStudies;
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
            table='studies_table';
            datatype='data-studyid';
        }

        if ( ($('#'+table).find('['+datatype+'="'+id+'"]').find('.fa-cart-shopping').hasClass('partselected')) || ('selection' in curDic['state']) ){
            curDic['state']['view']=false;
            if (!(type=='study')){
                  for (item in childDic){
                     childRef=[...ref,item]
                     removeFromView(childType,childRef)
                 }
              }

            }
        else{
            delete(parDic[id]);
        }

    }

    window.updateMultipleRowsa=function(table,add,type){
        rowA=$(table).find('tbody').children();
        rowArr = new Array();
        $(rowA).each(function(){
                $(this).children('.ckbx').children().prop("checked",add);
                rowArr.push($(this))
        });
        if (type === 'projects'){
            updateProjectSelection(rowArr);
        }
        else {
            updateCasesOrStudiesSelection(rowA, type, true);
        }
    }

    window.updateDescSelections =  function(dic,tbl,type){
        if (type ==='cases'){
            for (studyid in dic.selStudies){
                if ('select' in (dic.selStudies['state'])){
                    cref='#study_'+studyid;
                    $(tbl).find('#study_'+studyid).find('.fa-cart-shopping').removeClass('selected');
                    $(tbl).find('#study_'+studyid).find('.fa-cart-shopping').removeClass('unselected');
                    $(tbl).find('#study_'+studyid).find('.fa-cart-shopping').removeClass('partselected');


                    updateDescSelections = updateDescSelections(dic.selStudies[studyid],$('#series_table')[0],'studies');

                    if (('view' in dic.selStudies['state']) && (dic.selStudies['state']['view'])){
                        delete dic.selStudies[studyid]['state']['select']
                    }
                    else{
                        delete dic.selStudies[studyid];
                    }
                }

            }
        }
        else if (type ==='studies'){
            for (seriesid in dic.selSeries){
                if ('select' in (dic.selSeries['state'])){
                    cref='#series_'+seriesid;
                    $(tbl).find('#series_'+seriesid).find('.fa-cart-shopping').removeClass('selected');
                    $(tbl).find('#series_'+seriesid).find('.fa-cart-shopping').removeClass('unselected');
                    $(tbl).find('#series_'+seriesid).find('.fa-cart-shopping').removeClass('partselected');

                    if (('view' in dic.selSeries['state']) && (dic.selSeries['state']['view'])){
                        delete dic.selSeries[seriesid]['state']['select']
                    }
                    else{
                        delete dic.selSeries[seriesid];
                    }
                }

            }
        }


    }

    const clearChildStates = function(id,selected,ptype){
        var tbls=[];
        var dataid=''

        if (ptype=='project')
        {
            tbls=['cases_table','studies_table','series_table'];
            dataid='data-projectid';
        }
        else if (ptype='case'){
            tbls=['studies_table','series_table'];
            dataid='data-caseid';
        }
        else if (ptype='study'){
            tbl=['series_table'];
            dataid='data-studyid';
        }


        var state="";
        var nstate="";
        if (selected){
            state="selected";
            nstate="unselected";
        }
        else{
            state="unselected";
            nstate="selected";
        }
        for (var i=0;i<tbls.length;i++)
        {
            tbl=tbls[i]
            $('#' + tbl).find('[' + dataid + '="'+ id + '"]').find('.fa-cart-shopping').each(function () {
                $(this).removeClass('partselected');
                $(this).removeClass(nstate);
                $(this).addClass(state);

            });
        }

    }


    const clearChildSelections = function(ids){
        //items=['selProjects','selCases','selStudies','selSeries'];
        var curDic = new Object();
        var parDic= new Object();
        if ((ids.length==1) && (ids[0] in window.selProjects) && ('selCases' in window.selProjects[ids[0]])){

           parDic=window.selProjects[ids[0]];
           curDic=window.selProjects[ids[0]].selCases
        }
        else if ((ids.length==2) && (ids[0] in window.selProjects) && (ids[1] in window.selProjects[ids[0]].selCases) && ('selStudies' in window.selProjects[ids[0]].selCases[ids[1]])){
            parDic=window.selProjects[ids[0]].selCases[ids[1]];
            curDic=window.selProjects[ids[0]].selCases[ids[1]].selStudies
        } 
        else if ((ids.length==3) && (ids[0] in window.selProjects) && (ids[1] in window.selProjects[ids[0]].selCases) && (ids[2] in window.selProjects[ids[0]].selCases[ids[1]].selStudies) && ('selSeries' in window.selProjects[ids[0]].selCases[ids[1]].selStudies[ids[2]])){
            parDic=window.selProjects[ids[0]].selCases[ids[1]].selStudies[ids[2]];
            curDic=window.selProjects[ids[0]].selCases[ids[1]].selStudies[ids[2]].selSeries
        }

        for (nxtid in curDic){
            parDic.numChildFullCheck=0;
            parDic.numChildMixCheck=0;
            parDic.numChildNoCheck=parDic.totalChild;
          parDic.parselDescNum=0;
          if (curDic[nxtid]['state']['view'] || ('studymp' in curDic[nxtid])){
              /*if ('checked' in curDic[nxtid]['state']) {

              }*/
              delete curDic[nxtid]['state']['checked'];
              nids=[...ids,nxtid]
              clearChildSelections(nids);
          }
          else{
              delete curDic[nxtid]
          }
      }

    }


    window.selectAllData =function(item){
        //alert('here');
        var rowsAdded=false;
        if ($(item).find('.fa-cart-shopping').hasClass('none')){
            rowsAdded=true;
            $(item).find('.fa-cart-shopping').removeClass('none');
            $(item).find('.fa-cart-shopping').addClass('selected');
        }
        else{
            $(item).find('.fa-cart-shopping').addClass('none');
            $(item).find('.fa-cart-shopping').removeClass('selected');
        }

        $('#projects_table').find('tr').each(function()
        {
            row=this
            elem=$(row).find('.fa-cart-shopping')[0]
            projid=$(row).attr('data-projectid');
            if (!(projid in window.selProjects))
                //if (1===1)
                {
                    window.selProjects[projid]=new Object();
                    window.selProjects[projid]['selCases']=new Object();
                    window.selProjects[projid]['state']={'selection':'none'}
                    window.selProjects[projid]['selDescNum']=0;
                    window.selProjects[projid]['unselDescNum']=0;
                    window.selProjects[projid]['partselDescNum']=0;
                    window.selProjects[projid]['viewDescNum']=0;

                }
            window.selProjects[projid]['totalCases']=$(row).attr('totalcases');
            window.selProjects[projid]['totalStudies']=$(row).attr('totalstudy');
            window.selProjects[projid]['totalSeries']=$(row).attr('totalseries');
            if (rowsAdded){

                $(elem).removeClass('none');
                $(elem).removeClass('unselected');
                $(elem).addClass('selected');
                $(elem).removeClass('partselected');


            }
            else{
                $(elem).removeClass('none');
                $(elem).removeClass('selected');
                $(elem).addClass('unselected');
                $(elem).removeClass('partselected');

            }

            clearChildStates(projid,rowsAdded,'project');
            clearChildSelections([projid]);


        });
        mksearchtwo();

    }

    window.selectAllVisCases =function(item){
        //alert('here');
        parentUpdated = false;
        var rowsAdded=false;
        if ($(item).find('.fa-cart-shopping').hasClass('unselected')){
            rowsAdded=true;
            $(item).find('.fa-cart-shopping').removeClass('unselected');
            $(item).find('.fa-cart-shopping').addClass('selected');
        }
        else{
            $(item).find('.fa-cart-shopping').addClass('unselected');
            $(item).find('.fa-cart-shopping').removeClass('selected');
        }


        $('#cases_table').find('tr').each(function()
        {
            row=this;
            elem=$(row).find('.fa-cart-shopping')[0]
            projid=$(row).attr('data-projectid');
            caseid=$(row).attr('data-caseid');

            $('#projects_table').find('[data-projectid='+projid+']').find('.fa-cart-shopping').removeClass('none');
            $('#projects_table').find('[data-projectid='+projid+']').find('.fa-cart-shopping').removeClass('selected');
            $('#projects_table').find('[data-projectid='+projid+']').find('.fa-cart-shopping').removeClass('unselected');
            $('#projects_table').find('[data-projectid='+projid+']').find('.fa-cart-shopping').addClass('partselected');
            var totalCases=$('#projects_table').find('[data-projectid='+projid+']').attr('data-totalcases');
            var totalStudies=$('#projects_table').find('[data-projectid='+projid+']').attr('data-totalstudies');
            var totalSeries=$('#projects_table').find('[data-projectid='+projid+']').attr('data-totalseries');


            if (!(projid in window.selProjects))
                //if (1===1)
                {
                    window.selProjects[projid]=new Object();
                    window.selProjects[projid]['selCases']=new Object();
                    window.selProjects[projid]['state']={'selection':'none'}
                    window.selProjects[projid]['selDescNum']=0;
                    window.selProjects[projid]['unselDescNum']=0;
                    window.selProjects[projid]['partselDescNum']=0;
                    window.selProjects[projid]['viewDescNum']=0;
                    window.selProjects[projid]['totalCases']=totalCases;
                    window.selProjects[projid]['totalStudies']=totalStudies;
                    window.selProjects[projid]['totalSeries']=totalSeries;
                }

            if (!(caseid in window.selProjects[projid]['selCases'])){
                window.selProjects[projid].selCases[caseid]=new Object();
                window.selProjects[projid].selCases[caseid]['selStudies']=new Object();
                window.selProjects[projid].selCases[caseid]['state']={'selection':'none'};
                window.selProjects[projid].selCases[caseid]['selDescNum']=0;
                window.selProjects[projid].selCases[caseid]['unselDescNum']=0;
                window.selProjects[projid].selCases[caseid]['partselDescNum']=0;
                window.selProjects[projid].selCases[caseid]['viewDescNum']=0;
                 window.selProjects[projid].selCases[caseid]['totalStudies']=$(this).attr('data-totalstudies');
                 window.selProjects[projid].selCases[caseid]['totalSeries']=$(this).attr('data-totalseries');
            }


            if (rowsAdded){

                $(elem).removeClass('none');
                $(elem).removeClass('unselected');
                $(elem).addClass('selected');
                $(elem).removeClass('partselected');

                if ('selection' in window.selProjects[projid].selCases[caseid]['state']) {
                    if (window.selProjects[projid].selCases[caseid]['state']['selection'] === 'unselected') {
                        window.selProjects[projid].unselDescNum = window.selProjects[projid].unselDescNum - 1;
                    } else if (window.selProjects[projid].selCases[caseid]['state']['selection'] === 'partselected') {
                        window.selProjects[projid].partselDescNum = window.selProjects[projid].partselDescNum - 1;
                    }
                }
                window.selProjects[projid].selDescNum=window.selProjects[projid].selDescNum+1;
                window.selProjects[projid]['state']['selection']='partselected';




            }
            else{
                $(elem).removeClass('none');
                $(elem).removeClass('selected');
                $(elem).addClass('unselected');
                $(elem).removeClass('partselected');

                if ('selection' in window.selProjects[projid].selCases[caseid]['state']) {
                    if (window.selProjects[projid].selCases[caseid]['state']['selection'] === 'selected') {
                        window.selProjects[projid]['selDescNum'] = window.selProjects[projid]['selDescNum'] - 1;
                    } else if (window.selProjects[projid].selCases[caseid]['state']['selection'] === 'partselected') {
                                window.selProjects[projid]['partselDescNum'] = window.selProjects[projid]['partselDescNum'] - 1;
                    }
                }
                window.selProjects[projid]['unselDescNum']=window.selProjects[projid]['unselDescNum']+1;

            }

            chnglvl= propagateSelection([projid,caseid], rowsAdded);
            if (chnglvl=='project'){
                clearChildStates(projid,rowsAdded,'project');
                clearChildSelections([projid]);
            }
            else{
                clearChildStates(caseid,rowsAdded,'case');
                clearChildSelections([projid,caseid]);
            }


        });
        mksearchtwo();

    }

    const updateCache = function(cache,request,backendReqStrt, backendReqLength,data, colOrder){
        cache.lastRequest = request;
        cache.backendReqStrt=backendReqStrt;
        cache.backendReqLength=backendReqLength;
        cache.cacheLength = data['res'].length;
        cache.recordsTotal = data['cnt'];
        cache.data = data['res'];
        cache.colOrder = colOrder;

    }

    const checkClientCache = function(request, type){
        var cache;
        var reorderNeeded = false;
        var updateNeeded = true;
        if (request.draw ===1){
            updateNeeded = true;
        }
        else {
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
                }
                else {
                    updateNeeded = true;
                }
            } else if (cache.cacheLength===cache.recordsTotal){
                updateNeeded = false;
                reorderNeeded=true;
            }
            else {
                updateNeeded = true;
            }
        }
        return [updateNeeded , reorderNeeded];
    }

    const reorderCacheData = function(cache,request,thead){
        function compCols(a,b,col,dir,isNum,hasAux,auxCol,auxIsNum){
            var cmp=0;
            if (isNum){
                cmp=parseFloat(a[col])- parseFloat(b[col]);
            }
            else {
                cmp=(a[col]>b[col] ? 1 :  a[col]==b[col]? 0: -1)
            }

            if (dir ==='desc'){
                cmp=-cmp;
            }

            if ((cmp === 0) && hasAux){
                if (auxIsNum){
                    cmp=parseFloat(a[auxCol])- parseFloat(b[auxCol]);
                }
                else {
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
        }
        else {
            auxColId=-1
            auxCol=''
            auxIsNum= false;
        }

         cache.data.sort((a,b)=> compCols(a,b,col,dir,isNum,hasAux,auxCol,auxIsNum))

    }

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

    window.filterTable = function(wrapper, type){
        var elem=$('#'+wrapper);
        var varStr=elem.find('.dataTables_controls').find('.'+type+'_inp').val();
        if (type ==="seriesID") {
            window.updateSeriesTable(false, false, true,varStr)
        }

        else if (type ==="studyID") {
            window.updateStudyTable(false, false, true, true, varStr)
        }
        else if (type==="caseID"){
            window.updateCaseTable(false, false,  true, [true,true], [],varStr,-1, -1)
        }
    }

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
            nkeys=getKeysByState(window.selProjects[projid].selCases,state);
            ret=ret.concat(nkeys);
        }
        return ret;

    }

    const addTotals = function(totals, lvl, curDic, alreadyAdded, isSelected,ids) {
        //cart = new Object()
        var dictypes = ["selProjects", "selCases", "selStudies", "selSeries"]
        var tots = ["totalProjects","totalCases", "totalStudies", "totalSeries"]
        var nxtAdded = alreadyAdded;
        if (('state' in curDic) && ('checked' in curDic['state'])) {
            if (curDic['state']['checked']) {
                isSelected = (isSelected) ? false : true;
            }
        }

        if (alreadyAdded) {
            if (!isSelected) {
                for (var i = lvl + 1; i < tots.length; i++) {
                    totals[i] = totals[i] - parseInt(curDic[tots[i]]);
                }
                nxtAdded = false;

                if (lvl<2){
                    for (var studyid in curDic['studymp']){
                        if (studyid in window.cart){
                            delete(window.cart[studyid]);
                        }
                    }
                }
                else if (lvl==2){
                    var studyid = ids[2];
                    if (studyid in window.cart){
                        delete(window.cart[studyid]);
                    }
                }
                else if (lvl==3){
                    var projid = ids[0];
                    var caseid = ids[1];
                    var studyid = ids[2];
                    var seriesid = ids[3];
                    if (studyid in window.cart){
                        if (window.cart[studyid]['all']){
                            window.cart[studyid]['all'] = false;
                            selseries= window.selProjects[projid].selCases[caseid].selStudies[studyid].seriesmp['val'];
                            window.cart[studyid]['sel']= new Set(selseries);
                        }
                        window.cart[studyid]['sel'].remove(seriesid);
                    }
                }


                if ((curDic['numChildMixCheck'] == 0) || (curDic['numChildFullCheck'] == 0)) {
                    totals[lvl] = totals[lvl] - 1;
                }
            }

        }

        if (!alreadyAdded) {
            if (isSelected) {
                totals[lvl] = totals[lvl] + 1;
                for (var i = lvl + 1; i < tots.length; i++) {
                    totals[i] = totals[i] + parseInt(curDic[tots[i]])
                }
                nxtAdded = true;

                if (lvl<2){
                    for (var studyid in curDic['studymp']){
                            window.cart[studyid]= new Object();
                            window.cart[studyid]['all'] = true;
                            window.cart[studyid]['sel'] = new Set();

                    }
                }
                else if (lvl==2){
                    var studyid = ids[2];
                    window.cart[studyid]= new Object();
                    window.cart[studyid]['all'] = true;
                    window.cart[studyid]['sel'] = new Set();
                }

                else if (lvl==3) {
                    var projid = ids[0];
                    var caseid = ids[1];
                    var studyid = ids[2];
                    var seriesid = ids[3];
                    if (!(studyid in cart)) {
                        window.cart[studyid] = new Object();
                        window.cart[studyid]['all'] = false;
                        window.cart[studyid]['sel'] = new Set();
                    }
                    window.cart[studyid]['sel'].add(seriesid);
                    if ((studyid in window.seriesmp) && (window.seriesmp['val'].length == window.cart[studyid]['sel'])) {
                         window.cart[studyid]['all'] = true;
                        window.cart[studyid]['sel'] = new Set();
                    }
                    else{
                        window.cart[studyid]['all'] = false;
                    }
                }


            } else if ((curDic['numChildMixCheck'] > 0) || (curDic['numChildFullCheck'] > 0)) {
                totals[lvl] = totals[lvl] + 1;
            }

        }

        if (lvl < 3) {
          var nlvl=lvl+1;
          var nxtDicO = curDic[dictypes[nlvl]]
          for (var ky  in nxtDicO) {
                var nxtDic=nxtDicO[ky]
                nids =[...ids,ky];
                addTotals(totals, nlvl, nxtDic, nxtAdded, isSelected,nids)
           }
        }
       //filtSet.cart=cart;
       //getGlblCart();
    }
    const mkGlblCart=function(){
        var finalCart={}
        for (var i=0;i<window.filterSet.length;i++){
            curCart = filterSet[i].cart;

            if (filterSet[i]['enabled']) {
                for (studyid in curCart) {
                    if (studyid in finalCart) {
                        if ((finalCart[studyid]['all']) || (curCart[studyid]['all'])) {
                            finalCart[studyid]['all'] = true;
                            finalCart[studyid]['sel'] = new Set();
                        } else {
                            finalCart[studyid]['all'] = false;
                            finalCart[studyid]['sel'] = new Set([...finalCart[studyid]['sel'], ...curCart[studyid]['sel']])
                            if ((studyid in window.seriesmp) && (window.seriesmp[studyid]['val'].length == finalCart[studyid]['sel'].length)) {
                                finalCart[studyid]['all'] = true;
                                finalCart[studyid]['sel'] = new Set();
                            }

                        }
                    } else {
                        finalCart[studyid] = new Object();
                        finalCart[studyid]['all'] = curCart[studyid]['all'];
                        finalCart[studyid]['sel'] = new Set(...curCart[studyid]['sel']);
                    }
                }
            }
        }
        window.glblcart = finalCart;
    }

    const getGlobalCounts= function(){
        tots=[0,0,0,0]
        for (projid in window.projstudymp){
            for (studyid in window.projstudymp[projid]){
                if (studyid in window.glblcart){
                    tots[0]++;
                    break;;

                }
            }
        }

            for (caseid in window.casestudymp){
                for (studyid in window.casestudymp[caseid]) {
                    if (studyid in window.glblcart) {
                        tots[1]++;
                        break;
                    }
                }
            }

        tots[2] = Object.keys(window.glblcart).length;
        for (studyid in window.glblcart){
            if (window.glblcart[studyid]['all']){
                tots[3]=tots[3]+window.seriesmp[studyid]['val'].length
            }
            else{
                tots[3]=tots[3]+window.glblcart[studyid]['sel'].length
            }
        }
        return tots;
    }


    const updateProjectOrCaseRowCount = function(ids){
        var cnt = 0;
        var studymp={};
        if ((ids.length==1) && (ids[0] in window.projstudymp)){
            studymp=window.projstudymp[ids[0]];
        }
        if ( (ids.length==2) && (ids[1] in window.casestudymp)){
            studymp=window.casestudymp[ids[1]];
        }
        for (var studyid in studymp){
            if (studyid in window.glblcart){
                if (window.glblcart[studyid]['all']){
                  cnt += window.seriesmp[studyid]['val'].length
               }
              else{
                  cnt += window.glblcart[studyid]['sel'].length
              }
            }
        }


        return cnt.toString();
    }

    const updateStudyRowCount= function(row){
        if ($(row).find('.cartnum').length > 0) {
                   $(row).find('.cartnum').text('0');
                   var idfull = row.id;
                   var studyid = idfull.substr(6, idfull.length - 6);
                   var cnt = 0;
                   if (studyid in window.glblcart) {
                       if (window.glblcart[studyid]['all']) {
                           cnt = window.seriesmp[studyid]['val'].length
                       } else {
                           cnt = window.glblcart[studyid]['sel'].length
                       }
                       $(row).find('.cartnum').text(cnt.toString());
                   }
               }
    }

    const updateTableCounts = function() {

          $('#projects_table').find('tr').each(function () {
                $(this).find('.cartnum').text('0');
             }
           );

           $('#cases_table').find('tr').each(function () {
                   $(this).find('.cartnum').text('0');
               }
           );

           $('#studies_table').find('tr').each(function () {
               updateStudyRowCount(this)
           });


        for (studyid in window.glblcart){
            var cnt=0
            if (studyid in window.seriesmp){
              var projid = window.seriesmp[studyid]['proj'];
              var caseid = window.seriesmp[studyid]['PatientID'];

              if (window.glblcart[studyid]['all']){
                  cnt = window.seriesmp[studyid]['val'].length
              }
              else{
                  cnt =window.glblcart[studyid]['sel'].length
              }
               $('#projects_table').find('[data-projectid='+projid+']').each(function(){
                   var curval=parseInt($(this).find('.cartnum').text());
                   nval= cnt+curval
                   $(this).find('.cartnum').text(nval.toString());
               });
              $('#cases_table').find('[data-caseid='+caseid+']').each(function(){
                   var curval=parseInt($(this).find('.cartnum').text());
                   nval= cnt+curval
                   $(this).find('.cartnum').text(nval.toString());
               });


            }


        }
    }

    const mksearchtwo =function() {
        var totals = [0, 0, 0, 0];
        for (studyid in window.cart){
            delete(window.cart[studyid])
        }
        for (project in window.selProjects) {
            var curDic = window.selProjects[project];
            addTotals(totals, 0, curDic, false, false,[project])
        }
        mkGlblCart();
        updateTableCounts();
        var gtotals=getGlobalCounts();

          $('#search_numbers').removeClass('notDisp');
          $('#search_numbers').html(totals[0].toString() + " Collections, " +
                                 totals[1].toString() + " Cases, " +
                                totals[2].toString()+" Studies, and " +
                                totals[3].toString()+" Series currently in the filterset<br>" +
              gtotals[0].toString()+" Collections, "+gtotals[1]+" Cases, "+gtotals[2]+" Studies, and "+gtotals[3]+" Series in the cart") ;

          //window.currentCart=totals[0];
          //window.currentSet= totals[0];

          window.cartSize=totals[0];
          window.filterSet[window.filterSetNum].cartSize = totals[0];
          val=$('#filter-option-modal').find('input[name="filtchoice"]:checked').val();

          if ((val=='cancel') && window.choiceMade && (window.cartSize>0)){
             $('.search-scope').find("input:checkbox").attr("disabled",true);
             $('.search-configuration').find("input:checkbox").attr("disabled",true);
          }
          else{
              $('.search-scope').find("input:checkbox").attr("disabled",false);
             $('.search-configuration').find("input:checkbox").attr("disabled",false);
          }


    }

    const updateCollectionTable = function () {
        var curFilterObj = JSON.parse(JSON.stringify(filterutils.parseFilterObj()));
        var filterStr = JSON.stringify(curFilterObj);
        let url = '/tables/collections/';
        url = encodeURI(url);
        ndic = {'filters': filterStr, 'limit': 2000}

        var csrftoken = $.getCookie('csrftoken');
        //let deferred = $.Deferred();
        $.ajax({
            url: url,
            data: ndic,
            dataType: 'json',
            type: 'post',
            contentType: 'application/x-www-form-urlencoded',
            beforeSend: function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
            success: function (data) {
                alert('here')

            },
            error: function(data){
                alert("There was an error fetching server data. Please alert the systems administrator")
                console.log('error loading data');
            }
        });

    };

    const cntClicksInPath =function(ids) {
        var lvls = ['selProjects', 'selCases', 'selStudies', 'selSeries']
        var clicks = 0;
        var parDic = window.selProjects;
        for (var i = 0; i < ids.length; i++) {
            var curDic = parDic[ids[i]];
            if (('state' in curDic) && ('checked' in curDic['state']) && curDic['state']['checked']) {
                clicks++;
            }
            parDic=curDic[lvls[i+1]]
        }
        return clicks
    }

    const updateSeriesMp=function(newmap){
        for (var ky in newmap){
            window.seriesmp[ky]=newmap[ky]
        }
    }

    const determineDicState = function(curDic){
        dicState='';
        if ( (curDic['numChildMixCheck']>0) ||   (curDic['numChildFullCheck']>0) ){
            dicState ='mix';
        }
        else if ( ('state' in curDic) && ('checked' in curDic['state'])){
            if (curDic['state']['checked']){
                dicState = 'full'
            }
            else{
                dicState = 'none';
            }
        }
        else{
            dicState='none';
        }
     return dicState;
    }

    const propagateSelection = function(ids, isChecked){

        var lvl = ['project', 'case', 'study','series']
        var chnglvl =lvl[ids.length-1];
        var dicSet=['selProjects', 'selCases', 'selStudies'];
        var tableSet=['projects_table', 'cases_table', 'studies_table'];
        var dataSet=['data-projectid','data-caseid','data-studyid']
        var parDicA=new Array();
        var parDic=window;
        var nclked = 0;
        for (var i=0;i<ids.length-1;i++){
            parDic=parDic[dicSet[i]][ids[i]];
            parDicA.push(parDic);

        }

        var tableSet = tableSet.splice(0,ids.length-1).reverse();
        var dataSet = dataSet.splice(0,ids.length-1).reverse();
        var nids = [...ids].splice(0,ids.length-1).reverse();
        var clvl = [...lvl].splice(0,ids.length-1).reverse();
        var curDic=parDic[dicSet[ids.length-1]][ids[ids.length-1]]
        var dicSetR= dicSet.slice(0,ids.length).reverse();

        parDicA.reverse();
        var oldDicState;
        var curDicState;

         if (isChecked){
            oldDicState = 'none';
            curDicState = 'full';
        }
        else if (!isChecked){
            oldDicState ='full';
            curDicState='none';
        }
        if ( (curDic['numChildMixCheck']>0) ||   (curDic['numChildFullCheck']>0) ){
            oldDicState ='mix';
        }

        for (var i=0;i<parDicA.length;i++){
            parDic=parDicA[i];
            cdic=dicSetR[i];
            tableid=tableSet[i];
            dataid=dataSet[i];
            id = nids[i];
            var oldParDicState;
            var parsel='';
            oldParDicState = determineDicState(parDic);

            statemp={"full":"numChildFullCheck", "mix":"numChildMixCheck", "none":"numChildNoCheck"};

            parDic[statemp[oldDicState]] = parDic[statemp[oldDicState]] - 1;
            parDic[statemp[curDicState]] = parDic[statemp[curDicState]] + 1;


           if (parDic['numChildFullCheck']==parDic['totalChild']){
               if (!('state' in parDic)){
                   parDic['state'] = new Object();
                   parDic['state']['checked'] = true;
                   parDic['state']['view'] = false;
               }
               else{
                  parDic['state']['checked'] = (parDic['state']['checked']) ? false : true;
               }

               parDic['numChildFullCheck']=0;
               parDic['numChildMixCheck']=0;
               parDic['numChildNoCheck']=parDic['totalChild'];
               csets=parDic[cdic];
               for (ind in csets){
                   rdic=parDic[cdic][ind];
                   if ('state' in rdic){
                       rdic['state']['checked']=false;
                   }
                   rdic['numChildMixCheck']=0;
                   rdic['numChildFullCheck']=0;
                   rdic['numChildNoCheck']=rdic['totalChild'];
               }
           }

           var curParDicState = determineDicState(parDic);

           if (parDic['numChildNoCheck']<parDic['totalChild']){
               parsel='partselected';
           }
           else {
               var clicks = cntClicksInPath([...nids].reverse())
               var clicksEven = (clicks % 2 == 0) ? true : false;
               if (clicksEven){
                   parsel='unselected';
               }
               else{
                   parsel='selected';
               }
           }
           /*
           else if ('state' in parDic){
               if (parDic['state']['checked']){
                   parsel='selected';
               }
               else{
                   parsel='unselected';
               }
           }
           else{
               parsel='selected';
           } */

           $('#'+tableid).find('['+dataid+'="'+id+'"]').find('.fa-cart-shopping').removeClass('partselected');
           $('#'+tableid).find('['+dataid+'="'+id+'"]').find('.fa-cart-shopping').removeClass('unselected');
           $('#'+tableid).find('['+dataid+'="'+id+'"]').find('.fa-cart-shopping').removeClass('selected');
           $('#'+tableid).find('['+dataid+'="'+id+'"]').find('.fa-cart-shopping').addClass(parsel);

           if ((parsel=='selected') || (parsel=='unselected')){
               chnglvl=clvl[i];
           }
           curDicState=curParDicState;
           oldDicState=oldParDicState;
        }
        return chnglvl;
    }



    const pretty_print_id = function (id) {
        var newId = id.slice(0, 8) + '...' + id.slice(id.length - 8, id.length);
        return newId;
    }


    const initializeTableData =  function()  {

        window.casesTableCache = { "data":[], "recordLimit":-1, "datastrt":0, "dataend":0, "req": {"draw":0, "length":0, "start":0, "order":{"column":0, "dir":"asc"} }};
        window.studyTableCache = { "data":[], "recordLimit":-1, "datastrt":0, "dataend":0, "req": {"draw":0, "length":0, "start":0, "order":{"column":0, "dir":"asc"} }};
        window.seriesTableCache = { "data":[], "recordLimit":-1, "datastrt":0, "dataend":0, "req": {"draw":0, "length":0, "start":0, "order":{"column":0, "dir":"asc"} }};

    }

    const updateFilterSetData = function(){
       window.filterSet[0]['caches']=[window.casesTableCache,window.studyTableCache,window.seriesTableCache];

    }

    window.deleteFilterSet =function(){
       $('.delfilt').find('input').prop('checked', false);
       var filtSetElem =  $('#filtersetdrop').find(":selected");
       var nm = parseInt(filtSetElem.val())-1;
       window.filterSet[nm]['enabled'] = false;
       filtSetElem.remove();
       if ($('#filtersetdrop').children().length<3) {
           $('.delfilt').addClass('notDisp');
       }

       for (var i=0;i<window.filterSet.length;i++){
           if (filterSet[i]['enabled']){
               nm=i;
               break
           }
       }
       changeFilterSet(nm, true);

    }


    const createNewFilterSet = function(curfilt, csel){

        filtSet =new Object();
        filtSet.filterObj = curfilt;
        filtSet['enabled'] = true;
        filtSet['cart'] = new Object();
        filtSet['selProjects']= new Object();
        for (program in window.programs) {
            for (project in window.programs[program]['projects']) {
                filtSet['selProjects'][project] = new Object();
                filtSet.selProjects[project]['selCases'] = new Object();
                filtSet.selProjects[project]['state'] = {'view': false, 'checked': false};
                filtSet.selProjects[project]['totalChild'] = window.selProjects[project]['totalChild'];
                filtSet.selProjects[project]['numChildFullCheck'] = 0;
                filtSet.selProjects[project]['numChildMixCheck'] = 0;
                filtSet.selProjects[project]['numChildNoCheck'] = window.selProjects[project]['numChildNoCheck'];
                filtSet.selProjects[project]['numChecksAbove'] = 0;
                filtSet.selProjects[project]['totalCases'] = window.selProjects[project]['totalCases'];
                filtSet.selProjects[project]['totalSeries'] = window.selProjects[project]['totalSeries'];
                filtSet.selProjects[project]['totalStudies'] = window.selProjects[project]['totalStudies'];
            }
        }


        filtSet.casesTableCache = { "data":[], "recordLimit":-1, "datastrt":0, "dataend":0, "req": {"draw":0, "length":0, "start":0, "order":{"column":0, "dir":"asc"} }};
        filtSet.studyTableCache = { "data":[], "recordLimit":-1, "datastrt":0, "dataend":0, "req": {"draw":0, "length":0, "start":0, "order":{"column":0, "dir":"asc"} }};
        filtSet.seriesTableCache = { "data":[], "recordLimit":-1, "datastrt":0, "dataend":0, "req": {"draw":0, "length":0, "start":0, "order":{"column":0, "dir":"asc"} }};
        filtSet.cartSize=0;
        /*
        filtSet['projects_panel'] = $('#projects_panel')[0].cloneNode(true);
        filterSet['cases_panel'] = $('#cases_panel')[0].cloneNode(true); */
        window.filterSet.push(filtSet);
        var nm1=(window.filterSet.length-1).toString();
        var nm2=window.filterSet.length.toString();
        var pg='filtstate'+nm1;
        $('#filtersetdiv').append(' <span id="filt'+nm1+'" class="filts" onclick="changeFilterSet('+nm1+', true)">Filterset '+nm2+'</span>')
        $('#filtersetnew').before('<option value="'+nm2+'">Filter Set '+nm2+'</option>');
        if ($('#filtersetdrop').children().length>2) {
            $('.delfilt').removeClass('notDisp');
        }
        if (csel){
            changeFilterSet(window.filterSet.length-1, true);

        }

    }

    const updateFiltControls = function(){
      var filters_for_load = tables.mapFiltObj(window.filterObj);
      var i=0;

      }


    /*

     var filtSet= window.filterObj[nkey];
         for (var i=0;i<filtSet.length;i++){
             var filt= filtSet[i];
             filtVal[filt]=1;
         }
     $('input:checkbox').each(function(){
         if (this.hasAttribute('data-filter-display-val')){
            var val= this.getAttribute('data-filter-display-val') ;
            if (val in filtVal){
                $(this).prop("checked", true);
            }
            else{
                $(this).prop("checked", false);
            }
         }
     });
        */

    window.changeFilterSetViaButton= function(){
        var num=parseInt($('#filtersetdrop').find(':selected').val());
        if (num==-1){
            window.filterSet[window.filterSetNum].filterObj = JSON.parse(JSON.stringify(filterObjOld));
            filterObjOld = JSON.parse(JSON.stringify(filterObj));
            createNewFilterSet(filterObj, true);
        }
        else {
            num=num-1;
            changeFilterSet(num, true);
        }

    }

    window.changeFilterSet =function(num, doUpdate){
        window.filterSetNum=num
        window.selProjects = window.filterSet[num]['selProjects'];
        window.casesTableCache = window.filterSet[num].casesTableCache;
        window.studyTableCache = window.filterSet[num].studyTableCache;
        window.seriesTableCache = window.filterSet[num].seriesTableCache;
        window.filterObj = window.filterSet[num].filterObj;

        window.cartSize =window.filterSet[num].cartSize
        window.cart=window.filterSet[num].cart



        $('#filtersetdiv').find('.filts').removeClass('curfilt');
        $('#filtersetdiv').find('#filt'+num.toString()).addClass('curfilt');
        $('#filtersetdrop').find('option').prop('selected', false)
        $('#filtersetdrop').find('option[value="'+(num+1).toString()+'"]').prop('selected', true);
        //$('#cases_panel_container').append(window.filterSet[num]['cases_panel']);
        //updateFiltControls();
        var filters_for_load = filterutils.mapFiltObj(window.filterObj);
        clear_filters();
        filters_loaded=load_filters(filters_for_load);
        filters_loaded.done(function () {
           mksearchtwo();
        });


    }

    const initSort = function(sortVal){
        var sortdivs=$('body').find('.sorter')
        for (div in sortdivs){
            $(div).find(":input[value='" + sortVal + "']").click();
        }
    }

     const updateCollectionTotals = function(listId, progDic){
        var reformDic = new Object();
        reformDic[listId] = new Object();
        for (item in progDic){
            if ((item !=='All') && (item !=='None') && (item in window.programs) && (Object.keys(progDic[item]['projects']).length>0)){
                if ( Object.keys(window.programs[item]['projects']).length===1) {
                    nitem=Object.keys(progDic[item]['projects'])[0];
                    reformDic[listId][nitem]=new Object();
                    reformDic[listId][nitem]['count'] = progDic[item]['val'];
                } else {
                    reformDic[listId][item]=new Object();
                    reformDic[listId][item]['count'] = progDic[item]['val'];
                    reformDic[item] =  new Object();
                    for (project in progDic[item]['projects']){
                        reformDic[item][project]=new Object();
                        reformDic[item][project]['count']=progDic[item]['projects'][project]['val'];
                    }
                }
            }
        }
        filterutils.updateFilterSelections('program_set', {'unfilt':reformDic});
        updateColl(false);
    }

    window.viewcart = function(){
        var csrftoken = $.getCookie('csrftoken');

        document.getElementById('glblcart').value=JSON.stringify(window.glblcart);
        document.getElementById('seriesmp').value=JSON.stringify(window.seriesmp);
        document.getElementById('theForm').submit();
    }

    return {
        updateProjectTable: updateProjectTable,
        updateCollectionTotals: updateCollectionTotals,
        initializeTableData: initializeTableData,
        updateTablesAfterFilter:updateTablesAfterFilter,
        initProjectData:initProjectData,
        createNewFilterSet:createNewFilterSet,
        updateFilterSetData:updateFilterSetData,
        updateFiltControls:updateFiltControls


    };
});
