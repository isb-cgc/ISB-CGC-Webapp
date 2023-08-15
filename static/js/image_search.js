/**
 *
 * Copyright 2021, Institute for Systems Biology
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
    baseUrl: STATIC_FILES_URL + 'js/',
    paths: {
        jquery: 'libs/jquery-3.5.1',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        base: 'base',
        underscore: 'libs/underscore-min',
        tablesorter: 'libs/jquery.tablesorter.min',
        assetscore: 'libs/assets.core',
        assetsresponsive: 'libs/assets.responsive',
        jquerydt: 'libs/jquery.dataTables.min',
        session_security: 'session_security/script'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'jquerydt': ['jquery'],
        'tablesorter': ['jquery'],
        'underscore': {exports: '_'},
        'session_security': ['jquery']
    }
});


require([
    'jquery',
    'underscore',
    'base', // This must ALWAYS be loaded!
    'jquerydt',
    'jqueryui',
    'bootstrap'
], function($, _, base) {

    const FLOAT_SLIDERS = ["Sphericity_quant"];

    $('.manifest-size-warning').hide();

    window.filterObj = {};
    window.projIdSel = [];
    window.studyIdSel = [];
    //window.tcgaColls = ["tcga_blca", "tcga_brca", "tcga_cesc", "tcga_coad", "tcga_esca", "tcga_gbm", "tcga_hnsc", "tcga_kich", "tcga_kirc", "tcga_kirp", "tcga_lgg", "tcga_lihc", "tcga_luad", "tcga_lusc", "tcga_ov", "tcga_prad", "tcga_read", "tcga_sarc", "tcga_stad", "tcga_thca", "tcga_ucec"];
    window.projSets = new Object();
    window.projSets['tcga']=["tcga_blca", "tcga_brca", "tcga_cesc", "tcga_coad", "tcga_esca", "tcga_gbm", "tcga_hnsc", "tcga_kich", "tcga_kirc", "tcga_kirp", "tcga_lgg", "tcga_lihc", "tcga_luad", "tcga_lusc", "tcga_ov", "tcga_prad", "tcga_read", "tcga_sarc", "tcga_stad", "tcga_thca", "tcga_ucec"];
    window.projSets['rider']=["rider_lung_ct", "rider_phantom_pet_ct","rider_breast_mri", "rider_neuro_mri","rider_phantom_mri", "rider_lung_pet_ct"];
    window.projSets['qin'] = ["qin_headneck","qin_lung_ct","qin_pet_phantom","qin_breast_dce_mri"];
    var first_filter_load = true;

    var plotLayout = {
        title: '',
        autosize: true,
        margin: {
            l: 30,
            r: 30,
            b: 60,
            t: 30,
            pad: 0
        },
        xaxis: {type: 'category', dtick: 1}
    };

    var pieLayout = {
        title: '',
        autosize: true,
        margin: {
            l: 30,
            r: 30,
            b: 60,
            t: 30,
            pad: 0
        },
        showlegend: false,
        legend: {
            x: 2,
            y: 0,
            traceorder: 'normal',
            font: {
                family: 'sans-serif',
                size: 4,
                color: '#000'
            },
            bgcolor: '#E2E2E2',
            bordercolor: '#FFFFFF',
            borderwidth: 2
        }
    };

    window.toggleCharts=function(cntrl){
        if (cntrl==="hide"){
            $('.chart-content').addClass('hidden');
            $('.showchrt').removeClass('hidden');
            $('.hidechrt').addClass('hidden');
        }
        else if (cntrl==="show"){
            $('.chart-content').removeClass('hidden');
            $('.hidechrt').removeClass('hidden');
            $('.showchrt').addClass('hidden');
        }

    }

    window.hidePanel=function(){
        $('#lh_panel').hide();
        $('#show_lh').show();
        $('#show_lh').removeClass('hidden');
        $('#rh_panel').removeClass('col-lg-9');
        $('#rh_panel').removeClass('col-md-9');
        $('#rh_panel').addClass('col-lg-12');
        $('#rh_panel').addClass('col-md-12');
    };

    window.showPanel=function(){
        $('#lh_panel').show();
        $('#show_lh').hide();
        $('#rh_panel').removeClass('col-lg-12');
        $('#rh_panel').removeClass('col-md-12');
        $('#rh_panel').addClass('col-lg-9');
        $('#rh_panel').addClass('col-md-9');
    };

    window.setSlider = function (slideDiv, reset, strt, end, isInt, updateNow) {
        $('#' + slideDiv).closest('.hasSlider').find('.slider-message').addClass('notDisp');
        parStr=$('#'+slideDiv).data("attr-par");
        var max = $('#' + slideDiv).slider("option", "max");
        var divName = slideDiv.replace("_slide","");
        if (reset) {
            strt = $('#' + slideDiv).parent().attr('data-min');
            end = $('#' + slideDiv).parent().attr('data-max');
            $('#' + slideDiv).parent().removeClass('isActive');
            $('#' + slideDiv).siblings('.reset').addClass('disabled');
            $('#' + slideDiv).parent().find('.sliderset').find(':input').val('');
        } else {
            $('#' + slideDiv).parent().addClass('isActive');
            $('#' + slideDiv).siblings('.reset').removeClass('disabled');
        }
        $('#' + slideDiv).parent().attr('data-curminrng',strt);
        $('#' + slideDiv).parent().attr('data-curmaxrng',end);
        vals = [strt, end];
        $('#' + slideDiv).find(".slide_tooltip").each(function(index){
            $(this).text(vals[index].toString());
        });

        $('#' + slideDiv).slider("values", "0", strt);
        $('#' + slideDiv).slider("values", "1", end);
        var inpDiv = slideDiv.replace("_slide", "_input");
        var val = String(strt) + "-" + String(end);

        document.getElementById(inpDiv).value = val;
        nm=new Array();
        var filterCats= $('#'+divName).parentsUntil('.tab-pane','.list-group-item__body');
        for (var i=0;i<filterCats.length;i++){
            var ind = filterCats.length-1-i;
            nm.push(filterCats[ind].id);
        }
        nm.push(divName);
        filtAtt = nm.join('.')+ '_rng';
        if (reset) {
            if (  (window.filterObj.hasOwnProperty(filtAtt)) && (window.filterObj[filtAtt].hasOwnProperty('rng')) ) {
                delete window.filterObj[filtAtt]['rng'];
                if ('none' in window.filterObj[filtAtt]){
                    window.filterObj[filtAtt]['type']='none';
                } else {
                    delete window.filterObj[filtAtt];
                }
            }
        } else {
            var attVal = [];
            if (isInt) {
                attVal = [parseInt(strt), parseInt(end)];
            } else {
                attVal = [parseFloat(strt), parseFloat(end)];
            }

            if (!(filtAtt in window.filterObj)){
                window.filterObj[filtAtt] = new Object();
            }
            window.filterObj[filtAtt]['rng'] = attVal;
            window.filterObj[filtAtt]['type'] = 'ebtw';
        }
        if (updateNow) {
            mkFiltText();
            updateFacetsData(true);
        }
     };

    var mkFiltText = function () {
        var hasTcga = false;
        var tcgaColSelected = false;
        if ((window.filterObj.hasOwnProperty('Program')) && (window.filterObj.Program.indexOf('TCGA')>-1)){
            tcgaColSelected = true;
            $('#tcga_clinical_heading').children('a').removeClass('disabled');
        }  else {
            $('#tcga_clinical_heading').children('a').addClass('disabled');
            if (!($('#tcga_clinical_heading').children('a')).hasClass('collapsed')){
                $('#tcga_clinical_heading').children('a').click();
            }
        }

        var curKeys = Object.keys(filterObj).sort();
        oStringA = new Array();
        accessStr = ''
        var collection = new Array();
        var accessStr=''
        for (i = 0; i < curKeys.length; i++) {
            var addKey = true;
            var curKey = curKeys[i];
            if (curKey.startsWith('Program')) {
                curArr = filterObj[curKey];
                for (var j = 0; j < curArr.length; j++) {
                    if (!(('Program.' + curArr[j]) in filterObj)) {
                        var colName = $('#' + curArr[j]).filter('.collection_name')[0].innerText;
                        collection.push(colName);
                    }
                }
            }
            else
                {
                var realKey="";
                if (curKey.endsWith('_rng')){
                    realKey = curKey.substring(0, curKey.length - 4).split('.').pop();
                }
                else{
                    realKey = curKey.split('.').pop();
                }
                if (curKey.endsWith('_rng') && $('#' + realKey ).hasClass('isQuant')) {
                //var realKey = curKey.substring(0, curKey.length - 4).split('.').pop();
                var disp = $('#' + realKey + '_heading').children().children('.attDisp')[0].innerText;
                if (curKey.startsWith('tcga_clinical') && tcgaColSelected) {
                    disp = 'tcga.' + disp;
                    hasTcga = true;
                } else if (curKey.startsWith('tcga_clinical') && !tcgaColSelected) {
                    addKey = false;
                    break;
                }
                if (addKey) {
                    var fStr = '';
                    if ('rng' in filterObj[curKey]) {
                        if (Array.isArray(filterObj[curKey]['rng'][0])) {
                            pset = new Array()
                            for (var ind = 0; ind < filterObj[curKey]['rng'].length; ind++) {
                                pair = filterObj[curKey]['rng'][ind];
                                pset.push(pair[0].toString() + '-' + pair[1].toString());
                            }
                            fStr += pset.join(", ")
                        } else {
                            fStr += filterObj[curKey]['rng'][0].toString() + '-' + (filterObj[curKey]['rng'][1]).toString();
                        }
                    }
                    if (('rng' in filterObj[curKey]) && ('none' in filterObj[curKey])) {
                        fStr += ', ';
                    }
                    if ('none' in filterObj[curKey]) {
                        fStr += 'None';
                    }

                    var nstr = '<span class="filter-type">' + disp + '</span> IN (<span class="filter-att">' + fStr + '</span>)';
                    oStringA.push(nstr);
                }
            }
                else {
                //var realKey = curKey.split('.').pop();
                var disp = $('#' + realKey + '_heading').children().children('.attDisp')[0].innerText;
                if (curKey.startsWith('tcga_clinical') && tcgaColSelected) {
                    disp = 'tcga.' + disp;
                    hasTcga = true;
                } else if (curKey.startsWith('tcga_clinical') && !tcgaColSelected) {
                    addKey = false;
                    break;
                }
                if (addKey) {
                    var valueSpans = $('#' + realKey + '_list').children().children().children('input:checked').siblings('.value');
                    oVals = new Array();
                    valueSpans.each(function () {
                        oVals.push($(this).text())
                    });

                    var oArray = oVals.sort().map(item => '<span class="filter-att">' + item.toString() + '</span>');
                    nstr = '<span class="filter-type">' + disp + '</span>';
                    var joinElem = $('#' + curKey).find('.join_val').filter(':checked');
                    if (joinElem.length > 0) {
                        var joinstr = joinElem.attr("value");
                        nstr += 'IN (' + oArray.join(joinstr) + ')';
                    } else {
                        nstr += 'IN (' + oArray.join("") + ')';
                    }
                    if (curKey === 'access') {
                        accessStr = nstr;
                    } else {
                        oStringA.push(nstr);
                    }
                }
            }
          }
        }
        if (hasTcga && tcgaColSelected) {
            $('#search_def_warn').show();
        } else {
            $('#search_def_warn').hide();
        }

        if (collection.length>0){
            var oArray = collection.sort().map(item => '<span class="filter-att">' + item.toString() + '</span>');
            nstr = '<span class="filter-type">Collection</span>';
            nstr += 'IN (' + oArray.join("") + ')';
            oStringA.unshift(nstr);
        }
        if (accessStr.length>0){
            oStringA.unshift(accessStr);
        }
        if (oStringA.length > 0) {
            var oString = oStringA.join(" AND");
            document.getElementById("search_def").innerHTML = '<p>' + oString + '</p>';
            document.getElementById('filt_txt').value=oString;
        } else {
            document.getElementById("search_def").innerHTML = '<span class="placeholder">&nbsp;</span>';
            document.getElementById('filt_txt').value="";
        }
    };

    window.showGraphs = function(selectElem){
        $(selectElem).parent().siblings('.graph-set').show();
        $(selectElem).parent().siblings('.less-graphs').show();
        $(selectElem).parent().hide();
    }
    window.hideGraphs = function(selectElem){
        $(selectElem).parent().siblings('.graph-set').hide();
        $(selectElem).parent().siblings('.more-graphs').show();
        $(selectElem).parent().hide();
    }

    window.toggleGraphOverFlow = function(id, showMore){
        if (showMore) {
            $('.' + id).parent().find('.more-graphs').hide();
            $('.' + id).parent().find('.less-graphs').show();
            $('.' + id).find('.chart-overflow').removeClass('hide-chart');
        }
        else {
            $('.' + id).parent().find('.more-graphs').show();
            $('.' + id).parent().find('.less-graphs').hide();
            $('.' + id).find('.chart-overflow').addClass('hide-chart')
        }
    }

    window.addNone = function(elem, parStr, updateNow) {
            var id = parStr+$(elem).closest('.list-group-item__body')[0].id+"_rng";

            if (elem.checked){
                if (!(id in window.filterObj)) {
                    window.filterObj[id] = new Array();
                    window.filterObj[id]['type']='none';
                }
                window.filterObj[id]['none'] = true;
                //$(elem).parent().parent().addClass('isActive');
            }

            else {
                if ((id in window.filterObj) && ('none' in window.filterObj[id])){
                    delete window.filterObj[id]['none'];
                    if (!('rng' in window.filterObj[id])){
                        delete window.filterObj[id];
                        //$(elem).parent().parent().removeClass('isActive');
                    }
                }
            }

            var slideNm = $(elem).parent()[0].id+"_slide";
            mkFiltText();

            if (updateNow) {
                updateFacetsData(true);
            }
        }

    var mkSlider = function (divName, min, max, step, isInt, wNone, parStr, attr_id, attr_name, lower, upper, isActive,checked) {
        $('#'+divName).addClass('hasSlider');
        if (isActive){
            $('#'+divName).addClass('isActive');
        }

        var tooltipL = $('<div class="slide_tooltip tooltipL slide_tooltipT" />').text('stuff').css({
            position: 'absolute',
            top: -25,
            left: 0,
            transform: 'translateX(-50%)',

        });


         var tooltipR = $('<div class="slide_tooltip slide_tooltipB tooltipR" />').text('stuff').css({
           position: 'absolute',
           top: 20,
           right: 0,
             transform: 'translateX(50%)'
         });


          var labelMin = $('<div class="labelMin"/>').text(min).css({
              position: 'absolute',
              top:-7,
              left: -22,
            });


        var labelMax = $('<div class="labelMax" />').text(max);

        labelMax.css({
            position: 'absolute',
            top: -7,
            right: -14-8*max.toString().length,
            });

        var slideName = divName + '_slide';
        var inpName = divName + '_input';
        var strtInp = lower + '-' + upper;
        var nm=new Array();
        var filterCats= $('#'+divName).parentsUntil('.tab-pane','.list-group-item__body');
        for (var i=0;i<filterCats.length;i++){
            var ind = filterCats.length-1-i;
            nm.push(filterCats[ind].id);
        }
        nm.push(divName);
        var filtName = nm.join('.') + '_rng';
        //var filtName = nm;

        $('#' + divName).append('<div id="' + slideName + '"  data-attr-par="'+parStr+'"></div>');
        if ($('#'+divName).find('#'+inpName).length===0){
            $('#' + divName).append('<input id="' + inpName + '" type="text" value="' + strtInp + '" style="display:none">');
        }

        if (isActive){
            $('#'+divName).find('.reset').removeClass('disabled');
        }
        else {
            $('#'+divName).find('.reset').addClass('disabled');
        }

         $('#'+slideName).append(labelMin);

        $('#' + slideName).slider({
            values: [lower, upper],
            step: step,
            min: min,
            max: max,
            range: true,
            disabled: is_cohort,
            slide: function (event, ui) {
                $('#' + inpName).val(ui.values[0] + "-" + ui.values[1]);
                $(this).find('.slide_tooltip').each( function(index){
                    $(this).text( ui.values[index].toString() );
                    $(this).closest('.ui-slider').parent().find('.sliderset').find(':input')[index].value=ui.values[index].toString();
                });
            },

            stop: function (event, ui) {
                //setFromSlider(divName, filtName, min, max);
                $('#' + slideName).addClass('used');
                var val = $('#' + inpName)[0].value;
                var valArr = val.split('-');
                window.setSlider(slideName, false, valArr[0], valArr[1], isInt, true);

            }
        }).find('.ui-slider-range').append(tooltipL).append(tooltipR);


         $('#' + slideName).hover(
                function(){
                    //$(this).removeClass("ui-state-active");
                   $(this).parent().find('.slide_tooltip');
                }
              ,
                function(){
                   $(this).parent().find('.slide_tooltip');
                }
            );


         $('#' + slideName).find(".slide_tooltip").each(function(index){
                    if (index ==0) {
                        $(this).text(lower.toString());
                    }
                    else {
                        $(this).text(upper.toString());
                    }
               });

         $('#'+slideName).attr('min',min);
        $('#'+slideName).attr('max',max);


        $('#' + slideName).data("filter-attr-id",attr_id);
        $('#' + slideName).data("filter-display-attr",attr_name);

        $('#'+slideName).append(labelMax);
        $('#'+slideName).addClass('space-top-15');

    };

    var updateTablesAfterFilter = function (collFilt, collectionsData){
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
            if (cRow[3]===0){
                var projIndex = window.selItems.selProjects.indexOf(projId);
                if (projIndex !==-1) window.selItems.selProjects.splice(projIndex,1);
                if (window.selItems.selCases.hasOwnProperty(projId)) {
                       selCases= window.selItems.selCases[projId];
                       for (j=0;j<selCases.length;j++){
                           var selCase = selCases[j];
                           rmSelCases.push(selCase);
                           delete window.selItems.selStudies[selCase];
                       }

                    delete window.selItems.selCases[projId];
                }
            }
            else {
                usedCollectionData.push(cRow);
            }

        }

        updateProjectTable(usedCollectionData);
        updateCaseTable(false, false, true, [false,false], rmSelCases,'');
    }

    window.updateProjectSelection = function(rowA){
    var purgeChildSelections=[false,false]
    var rowsAdded=false;
    var rowsRemoved=false;

    rowA.forEach(function(row) {
    projid = $(row).data('projectid');
    if ($(row).children('.ckbx').children().is(':checked')) {
        if (window.selItems.selProjects.indexOf(projid) < 0) {
            window.selItems.selProjects.push(projid);
            rowsAdded = true
        }
    } else {
        rowsRemoved = true;
        var removedProjects = new Array();
        if (window.selItems.selProjects.indexOf(projid) > -1) {
            ind = window.selItems.selProjects.indexOf(projid);
            window.selItems.selProjects.splice(ind, 1);
            removedProjects.push(projid);
        }
        if (removedProjects.length > 0) {
            purgeChildSelections = cleanChildSelections(removedProjects, 'projects', false);
        }
    }
    });

    var caseID='';
    if ($('#cases_panel').find('.caseID_inp').length>0){
    caseID = $('#cases_panel').find('.caseID_inp').val().trim();
    }
    updateCaseTable(rowsAdded, rowsRemoved, false, purgeChildSelections,[],caseID);
    }

    window.updateMultipleRows=function(table,add,type){
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
            updateCasesOrStudiesSelection(rowA, type);
        }
    }

    window.updateCasesOrStudiesSelection = function(rowA, type){
        var purgeChildTables=[false];
        var rowsAdded= ($(rowA[0]).children('.ckbx').children().is(':checked') )?true:false

        if (rowsAdded) {
            $(rowA).each(function() {

                if (type === 'cases') {
                    parentid = $(this).data('projectid');
                    childid = $(this).data('caseid');
                    curDic = window.selItems.selCases;
                    nextDic = window.selItems.selStudies;
                } else if (type === 'studies') {
                    parentid = $(this).data('caseid');
                    childid = $(this).data('studyid');
                    curDic = window.selItems.selStudies;
                }
                if (!(parentid in curDic)) {
                    curDic[parentid] = new Array();
                }
                if (curDic[parentid].indexOf(childid) < 0) {
                    curDic[parentid].push(childid)
                }

            });
        }
        else {
            rowsRemoved = new Array();
            $(rowA).each(function(){
                if (type === 'cases') {
                    parentid = $(this).data('projectid');
                    childid = $(this).data('caseid');
                    curDic = window.selItems.selCases;
                    nextDic = window.selItems.selStudies;
                }
                else if (type === 'studies') {
                    parentid = $(this).data('caseid');
                    childid = $(this).data('studyid');
                    curDic = window.selItems.selStudies;
                }

                if (parentid in curDic) {
                    if (curDic[parentid].indexOf(childid) > -1) {
                        ind = curDic[parentid].indexOf(childid);
                        curDic[parentid].splice(ind, 1);
                        rowsRemoved.push(childid);
                        if (curDic[parentid].length==0){
                            delete curDic[parentid];
                        }
                    }

                }
             });
             if ( (type ==='cases') && (rowsRemoved.length > 0)) {
                 purgeChildTables = cleanChildSelections(rowsRemoved, 'cases',false);
             }

        }
        if (type==='cases'){
            var studyID="";
            if ($('#studies_tab').find('.studyID-inp').length>0) {
                studyID=$('#studies_tab').find('.studyID-inp').val();
            }
            updateStudyTable(rowsAdded,!rowsAdded,false,purgeChildTables, studyID);
        }
        else if (type==='studies'){
            var seriesID="";
            if ($('#series_tab').find('.seriesID-inp').length>0) {
                seriesID=$('#series_tab').find('.seriesID-inp').val();
            }
            updateSeriesTable(rowsAdded,!rowsAdded,false,seriesID);
        }
    }

    cleanChildSelections = function(removedItems,itemType,cleanAll){
        var removedChildItems = new Array();
        var itemsRemoved = false;
        var updateChildTable = new Array();
        if (itemType ==='projects'){
            childDic=window.selItems.selCases
        }
        else if (itemType==='cases'){
            childDic=window.selItems.selStudies
        }
        if (cleanAll){
            removedItems = Object.keys(childDic);
        }
        for (i=0;i<removedItems.length;i++){
            id = removedItems[i];
            if (id in childDic)
            {
                removedChildItems = removedChildItems.concat(childDic[id]);
                delete childDic[id];
            }
        }
        if ((itemType==='projects') && ((removedChildItems.length>0)|| cleanAll)){
            let ret = cleanChildSelections(removedChildItems,'cases',cleanAll);
            updateChildTable = [true,ret[0]];
        }

        else {
            updateChildTable= ((removedChildItems.length>0) || cleanAll) ? [true]:[false]
        }
        return updateChildTable;
    }

    updateProjectTable = function(collectionData) {
        $('#proj_table').DataTable().destroy();
        $('#proj_table').DataTable(
            {
                "dom": '<"dataTables_controls"ilpf>rt<"bottom"><"clear">',
                "order": [[1, "asc"]],
                "data": collectionData,
                "createdRow": function (row, data, dataIndex) {
                    $(row).data('projectid', data[0]);
                    $(row).attr('id', 'project_row_' + data[0]);
                    $(row).on('click', function(event){
                        var elem = event.target;
                        if (!$(elem).parent().hasClass('ckbx')) {
                            ckbx=$(elem).closest('tr').find('.ckbx').children()
                            ckbx.prop("checked", !ckbx.prop("checked"));
                        }
                        updateProjectSelection([$(this)])
                    })
                },
                "columnDefs": [
                    {className: "ckbx text_data", "targets": [0]},
                    {className: "collex_name", "targets": [1]},
                    {className: "projects_table_num_cohort", "targets": [3]},
                ],
                "columns": [
                    {
                        "type": "html", "orderable": false, render: function (data) {
                            if (window.selItems.selProjects.indexOf(data)>-1) {
                                return '<input type="checkbox" checked>'
                            }
                            else {
                                return '<input type="checkbox">'
                            }
                        }
                    },
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

    //checkClientCache(request,'cases');

    var updateCache = function(cache,request,backendReqStrt, backendReqLength,data, colOrder){
        cache.lastRequest = request;
        cache.backendReqStrt=backendReqStrt;
        cache.backendReqLength=backendReqLength;
        cache.cacheLength = data['res'].length;
        cache.recordsTotal = data['cnt'];
        cache.data = data['res'];
        cache.colOrder = colOrder;

    }

    var checkClientCache = function(request, type){
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

    reorderCacheData = function(cache,request,thead){
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
            window.updateCaseTable(false, false,  true, [true,true], [],varStr)
        }
    }

    window.updateCaseTable = function(rowsAdded, rowsRemoved, refreshAfterFilter,updateChildTables, rmSelCases, caseID) {
        $('#cases_tab').data('rowsremoved',rowsRemoved);
        $('#cases_tab').data('refreshafterfilter',refreshAfterFilter);
        $('#cases_tab').data('updatechildtables',updateChildTables);
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
                "order": [[2, "asc"]],
                "createdRow": function (row, data, dataIndex) {
                    $(row).attr('id', 'case_' + data['PatientID'])
                    $(row).attr('data-projectid', data['collection_id']);
                    $(row).attr('data-caseid', data['PatientID']);
                    $(row).addClass('text_head');
                    $(row).addClass('project_' + data['collection_id']);
                    $(row).on('click', function(event){
                        var elem = event.target;
                        if (!$(elem).parent().hasClass('ckbx')) {
                            ckbx = $(elem).closest('tr').find('.ckbx').children()
                            ckbx.prop("checked", !ckbx.prop("checked"));
                        }
                        updateCasesOrStudiesSelection([$(this)], 'cases')
                    })
                },
                "columnDefs": [
                    {className: "ckbx", "targets": [0]},
                    {className: "col1 project-name", "targets": [1]},
                    {className: "col1 case-id", "targets": [2]},
                    {className: "col1 numrows", "targets": [3]},
                    {className: "col1", "targets": [4]},
                ],
                "columns": [
                    {"type": "html", "orderable": false, "data": "PatientID",
                        render: function (PatientID, type, row) {
                            collection_id = row['collection_id'][0];
                            if ((collection_id in window.selItems.selCases) && (window.selItems.selCases[collection_id].indexOf(PatientID) > -1)) {
                                return '<input type="checkbox" class="tbl-sel" checked="true">';
                            } else {
                                return '<input type="checkbox" class="tbl-sel">';
                            }
                        }
                    },

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
                    var cols = ['', 'collection_id', 'PatientID', 'StudyInstanceUID', 'SeriesInstanceUID'];
                    var ssCallNeeded = true;
                    if (window.selItems.selProjects.length === 0) {
                        ssCallNeeded = false;
                        $('#cases_tab').children('thead').children('tr').children('.ckbx').addClass('notVis');
                        updateChildTables = cleanChildSelections([], 'cases', true);
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

                        if (ssCallNeeded) {
                            if (refreshAfterFilter) {
                                for (projid in window.selItems.selCases) {
                                    checkIds = checkIds.concat(window.selItems.selCases[projid])

                                }
                            }
                            var curFilterObj = JSON.parse(JSON.stringify(parseFilterObj()));
                            curFilterObj.collection_id = window.selItems.selProjects;
                            if (caseID.trim().length > 0) {
                                curFilterObj.PatientID = caseID;
                                if (checkIds.indexOf(caseID) > -1) {
                                    checkIds = [caseID];
                                }
                                for (projid in window.selItems.selCases) {
                                    if (window.selItems.selCases[projid].indexOf(caseID) > -1) {
                                        window.selItems.selCases[projid].splice(window.selItems.selCases[projid].indexOf(caseID), 1);
                                        rmSelCases.push.apply(rmSelCases, window.selItems.selCases[projid]);
                                        window.selItems.selCases[projid] = [caseID];
                                    } else {
                                        rmSelCases.push.apply(rmSelCases, window.selItems.selCases[projid]);
                                        delete window.selItems.selCases[projid];
                                    }
                                }

                            }
                            var filterStr = JSON.stringify(curFilterObj);
                            let url = '/tables/cases/';
                            url = encodeURI(url);
                            ndic = {'filters': filterStr, 'limit': 2000}
                            ndic['checkids'] = JSON.stringify(checkIds);

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
                                window.casesCache = new Object();
                                colSort = ["", "collection_id", "PatientID", "unique_study", "unique_series"];
                                updateCache(window.casesCache, request, backendReqStrt, backendReqLength, data, colSort);
                                dataset = data['res'].slice(request.start - backendReqStrt, request.start - backendReqStrt + request.length);

                                    /* for (set in dataset) {
                                        set['ids'] = {'PatientID': set['PatientID'], 'collection_id': set['collection_id']}
                                    }*/
                                    if (dataset.length > 0) {
                                        $('#cases_tab').children('thead').children('tr').children('.ckbx').removeClass('notVis');
                                    } else {
                                        $('#cases_tab').children('thead').children('tr').children('.ckbx').addClass('notVis');
                                    }

                                    if (refreshAfterFilter && ((data['diff'].length > 0) || (rmSelCases.length > 0))) {
                                        if (data['diff'].length > 0) {
                                            for (projid in window.selItems.selCases) {
                                                for (var i = 0; i < window.selItems.selCases[projid].length; i++) {
                                                    caseid = window.selItems.selCases[projid][i];
                                                    var ind = data['diff'].indexOf(caseid);
                                                    if (ind > -1) {
                                                        window.selItems.selCases[projid].splice(i, 1);
                                                        i--;
                                                    }
                                                }
                                                if (window.selItems.selCases[projid].length === 0) {
                                                    delete window.selItems.selCases[projid];
                                                }
                                            }
                                        }
                                        updateChildTables = cleanChildSelections(data['diff'], 'cases', false);
                                        var studyID = '';
                                        if ($('#studies_tab').find('.studyID_inp').length > 0) {
                                            studyID = $('#studies_tab').find('.studyID_inp').val().trim();
                                        }
                                        updateStudyTable(false, true, true, true, studyID);
                                    } else if (updateChildTables[0]) {
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
                "order": [[1, "asc"]],
                "createdRow": function (row, data, dataIndex) {
                    $(row).attr('id', 'study_' + data['StudyInstanceUID'])
                    $(row).attr('data-studyid', data['StudyInstanceUID']);
                    $(row).attr('data-caseid', data['PatientID']);
                    $(row).addClass('text_head');
                    $(row).addClass('project_' + data['collection_id']);
                    $(row).addClass('case_' + data['PatientID']);
                    $(row).on('click', function(event){
                        var elem = event.target;
                        if (!($(elem).is('a')) && !($(elem).hasClass('fa-download')) && !($(elem).hasClass('fa-copy')) && !($(elem).hasClass('fa-eye')) && !($(elem).hasClass('tippy-box'))  && !($(elem).parents().hasClass('tippy-box'))  ) {
                            if (!$(elem).parent().hasClass('ckbx')) {
                                ckbx = $(elem).closest('tr').find('.ckbx').children()
                                ckbx.prop("checked", !ckbx.prop("checked"));
                            }
                            updateCasesOrStudiesSelection([$(this)], 'studies')
                        }
                    })
                },
                "columnDefs": [
                    {className: "ckbx", "targets": [0]},
                    {className: "col1 case-id", "targets": [1]},
                    {className: "col2 study-id study-id-col study-id-tltp", "targets": [2]},
                    {className: "col1 study-date", "targets": [3]},
                    {className: "col1 study-description", "targets": [4]},
                    {className: "col1 numrows", "targets": [5]},
                    {className: "ohif open-viewer", "targets": [6]},
                    {className: "download", "targets": [7]},

                ],
                "columns": [
                    {
                        "type": "html",
                        "orderable": false,
                        data: 'StudyInstanceUID',
                        render: function (data, type, row) {
                            var PatientID = row['PatientID'];
                            if ((PatientID in window.selItems.selStudies) && (window.selItems.selStudies[PatientID].indexOf(data) > -1)) {
                                return '<input type="checkbox" class="tbl-sel" checked="true">';
                            } else {
                                return '<input type="checkbox" class="tbl-sel">';
                            }
                        }
                    },
                    {
                        "type": "text", "orderable": true, data: 'PatientID', render: function (data) {
                            return data;
                        }
                    },
                    {
                        "type": "text", "orderable": true, data: 'StudyInstanceUID', render: function (data) {
                            return pretty_print_id(data) +
                            ' <a class="copy-this-table" role="button" content="' + data +
                                '" title="Copy Study ID to the clipboard"><i class="fa-solid fa-copy"></i></a>';
                        },
                        "createdCell": function (td, data) {
                            $(td).data('study-id', data);
                            return;
                        }
                    },
                    {
                        "type": "text", "orderable": true, data: 'StudyDate', render: function (data) {
                            // fix when StudyData is an array of values
                            var dt = new Date(Date.parse(data));
                            var dtStr = (dt.getMonth() + 1).toLocaleString('en-US', {minimumIntegerDigits: 2}) + "-" + dt.getDate().toLocaleString('en-US', {minimumIntegerDigits: 2}) + "-" + dt.getFullYear().toString();
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
                                    return '<a href="' + DICOM_STORE_PATH + data + '" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-eye"></i>'
                                }
                            }
                        }
                    },
                    {
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
                    var updateChildTables = [$('#studies_tab').data('updatechildtables')];
                    var checkIds = new Array();
                    var cols = ['', 'PatientID', 'StudyInstanceUID', 'StudyDate','StudyDescription', 'SeriesInstanceUID'];
                    var ssCallNeeded = true;

                    var caseArr = new Array();
                    for (projectid in window.selItems.selCases) {
                        for (var i = 0; i < window.selItems.selCases[projectid].length; i++) {
                            caseArr.push(window.selItems.selCases[projectid][i]);
                        }
                    }

                    if (caseArr.length === 0) {
                        ssCallNeeded = false;
                        $('#studies_tab').children('thead').children('tr').children('.ckbx').addClass('notVis');
                        if (refreshAfterFilter || updateChildTables[0]) {
                            var seriesID = "";
                            if ($('.series_tab').find('#series_id').length > 0) {
                                seriesID = $('#series_tab').find('.seriesID-inp').val();
                            }
                            updateSeriesTable(false, true, false,seriesID)
                        }
                        callback({"data": [], "recordsTotal": "0", "recordsFiltered": "0"});
                    } else {
                        var ret = checkClientCache(request, 'studies');
                        ssCallNeeded = ret[0];
                        var reorderNeeded = ret[1];
                        if (ssCallNeeded) {
                            var curFilterObj = parseFilterObj();
                            curFilterObj.collection_id = window.selItems.selProjects;
                            curFilterObj.PatientID = caseArr;
                            if (studyID.trim().length > 0) {
                                curFilterObj.StudyInstanceUID = studyID;
                                if (checkIds.indexOf(studyID) > -1) {
                                    checkIds = [studyID];
                                }
                                for (caseId in window.selItems.selStudies){
                                    if (window.selItems.selStudies[caseId].indexOf(studyID)>-1){
                                        window.selItems.selStudies[caseId]=[studyID]
                                    } else {
                                        delete window.selItems.selStudies[caseId];
                                    }
                                }
                            } else if (refreshAfterFilter){
                                for (caseId in window.selItems.selStudies){
                                    checkIds=checkIds.concat(window.selItems.selStudies[caseId])
                                }
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
                                    colSort = ["", "PatientID", "StudyInstanceUID","StudyDate","StudyDescription","unique_series"]
                                    updateCache(window.studiesCache, request, backendReqStrt, backendReqLength, data, colSort);
                                    dataset = data['res'].slice(request.start - backendReqStrt, request.start - backendReqStrt + request.length);
                                    if (dataset.length > 0) {
                                        $('#studies_tab').children('thead').children('tr').children('.ckbx').removeClass('notVis');
                                    } else {
                                        $('#studies_tab').children('thead').children('tr').children('.ckbx').addClass('notVis');
                                    }

                                    if (refreshAfterFilter || updateChildTables[0]) {
                                        var seriesID = "";
                                        if ($('.series_tab').find('#series_id').length > 0) {
                                            seriesID = $('#series_tab').find('.seriesID-inp').val();
                                        }
                                        updateSeriesTable(false, true, false,seriesID)
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
            alert("The following error was reported when processing server data: "+ err +". Please alert the systems administrator")
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
                },  {
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
                            return '<a href="' + DICOM_STORE_PATH + row['StudyInstanceUID'] + '?SeriesInstanceUID=' +
                                data + '" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-eye"></i>'
                        }

                    }
                },
                      {
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
                for (caseid in window.selItems.selCases) {
                    for (var i = 0; i < window.selItems.selCases[caseid].length; i++) {
                        caseArr.push(window.selItems.selCases[caseid][i]);
                    }
                }
                var studyArr = new Array();
                for (caseid in window.selItems.selStudies) {
                    for (var i = 0; i < window.selItems.selStudies[caseid].length; i++) {
                        studyArr.push(window.selItems.selStudies[caseid][i]);
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
                        curFilterObj.collection_id = window.selItems.selProjects;
                        curFilterObj.PatientID = caseArr;
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
            alert("The following error was reported when processing server data: "+ err +". Please alert the systems administrator");
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

    var pretty_print_id = function (id) {
        var newId = id.slice(0, 8) + '...' + id.slice(id.length - 8, id.length);
        return newId;
    }

    window.updateSearchScope = function (searchElem) {
        var project_scope = searchElem.selectedOptions[0].value;
        mkFiltText();
        updateFacetsData(true);
    }

    var updateCollectionTotals = function(listId, progDic){
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
        updateFilterSelections('program_set', {'unfilt':reformDic});
        updateColl(false);
    }

    var parseFilterObj = function (){
        var hasTcgaCol=false;
        if ((window.filterObj.hasOwnProperty('Program')) && (window.filterObj.Program.indexOf('TCGA')>-1)){
            hasTcgaCol=true;
        }
        collObj=new Array();
        filtObj = new Object();
        for (ckey in window.filterObj){
            if (ckey ==='Program'){
                for (ind=0;ind<window.filterObj[ckey].length;ind++){
                    program = window.filterObj[ckey][ind];
                    if (program in window.projSets){
                        if (!('Program.'+program in window.filterObj)){
                           collObj= collObj.concat(window.projSets[program]);
                        }
                    } else {
                        collObj.push(program);
                    }
                }
            } else if (ckey.startsWith('Program.')){
                 for (ind=0;ind<window.filterObj[ckey].length;ind++){
                     collObj.push(window.filterObj[ckey][ind]);
                 }
            } else if (!(ckey).startsWith('tcga_clinical') || hasTcgaCol){
                nmA = ckey.split('.');
                nm=nmA[nmA.length-1];
                if (nm.endsWith('_rng')){
                    if (window.filterObj[ckey].type==='none'){
                        nm=nm.replace('_rng','');
                    } else {
                        nm = nm.replace('_rng', '_' + window.filterObj[ckey].type);
                    }
                    if (  ('rng' in window.filterObj[ckey]) && ('none' in window.filterObj[ckey]) ){
                        if (Array.isArray(window.filterObj[ckey]['rng'][0])){
                            filtObj[nm] = [...window.filterObj[ckey]['rng']];
                            filtObj[nm].push('None');
                        }
                        else{
                          filtObj[nm] = [window.filterObj[ckey]['rng'],'None']
                        }
                    } else if ('rng' in window.filterObj[ckey]){
                        filtObj[nm] = window.filterObj[ckey]['rng']
                    } else if ('none' in window.filterObj[ckey]){
                        noneKey=nm.replace('_rng','');
                        filtObj[noneKey]=['None'];
                    }
                } else {
                    filtObj[nm] = window.filterObj[ckey];
                }
            }
        }
        if (collObj.length>0){
            filtObj['collection_id']= collObj.sort();
        }
        return filtObj;
    };

    var update_bq_filters = function() {
        let filters = parseFilterObj();
        if (Object.keys(filters).length <= 0) {
            $('.bq-string-display').attr("disabled","disabled");
            $('.bq-string-display').attr("title","Select a filter to enable this feature.");
            $('.bq-string').html("");
            $('#export-manifest-form input[name="filters"]').val("");
        } else {
            $('.bq-string-display').removeAttr("disabled");
            $('.bq-string-display').attr("title","Click to display this filter as a BQ string.");
            $('.bq-string-display').attr('filter-params', JSON.stringify(filters));
            $('#export-manifest-form input[name="filters"]').val(JSON.stringify(filters));
        }
    };

    var update_filter_url = function() {
        let filters = parseFilterObj();
        if (Object.keys(filters).length <= 0) {
            $('.get-filter-uri').attr("disabled","disabled");
            $('#export-manifest').attr("disabled","disabled");
            $('#export-manifest').attr("title","Select a filter to enable this feature.");
            $('.get-filter-uri').attr("title","Select a filter to enable this feature.");
            $('.filter-url').html("");
            $('.copy-url').removeAttr("content");
            $('.copy-url').attr("disabled","disabled");
            $('.hide-filter-uri').triggerHandler('click');
            $('.url-too-long').hide();
            $('#export-manifest-form').attr(
                'action',
                $('#export-manifest-form').data('uri-base')
            );
        } else {
            $('.get-filter-uri').removeAttr("disabled");
            $('#export-manifest').removeAttr("disabled");
            $('.copy-url').removeAttr("disabled");
            $('.get-filter-uri').attr("title","Click to display this filter set's query URL.");
            $('#export-manifest').attr("title","Export these search results as a manifest for downloading.");
            let url = BASE_URL+"/explore/filters/?";
            let encoded_filters = []
            for (let i in filters) {
                if (filters.hasOwnProperty(i)) {
                    let vals = filters[i];
                    if(!Array.isArray(filters[i])) {
                        vals = filters[i]['values'];
                        encoded_filters.push(i+"_op="+encodeURI(filters[i]['op']));
                    }
                    _.each(vals, function (val) {
                        encoded_filters.push(i+"="+encodeURI(val));
                    });
                }
            }
            url += encoded_filters.join("&");
            url.length > 2048 && $('.url-too-long').show();
            url.length <= 2048 && $('.url-too-long').hide();
            $('.filter-url').html(url);
            $('.copy-url').attr("content",url);
        }
    };

    var updateFacetsData = function (newFilt) {
        update_filter_url();
        update_bq_filters();
        if (window.location.href.search(/\/filters\//g) >= 0) {
            if (!first_filter_load) {
                window.history.pushState({}, '', window.location.origin + "/explore/")
            } else {
                first_filter_load = false;
            }
        }
        var url = '/explore/'
        var parsedFiltObj = parseFilterObj();
        url = encodeURI('/explore/')

        ndic = {
            'totals': JSON.stringify(["PatientID", "StudyInstanceUID", "SeriesInstanceUID"]),
            'counts_only': 'True',
            'is_json': 'True',
            'is_dicofdic': 'True',
            'data_source_type': ($("#data_source_type option:selected").val() || 'S'),
            'filters':JSON.stringify(parsedFiltObj),
            'disk_size': 'True'
        }
        var csrftoken = $.getCookie('csrftoken');
        let deferred = $.Deferred();
        $.ajax({
            url: url,
            data: ndic,
            dataType: 'json',
            type: 'post',
            contentType: 'application/x-www-form-urlencoded',
            beforeSend: function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
            success: function (data) {
                try {
                    var isFiltered = Boolean($('#search_def p').length > 0);
                    if (is_cohort) {
                        if (file_parts_count > display_file_parts_count) {
                            $('#file-export-option').prop('title', 'Your cohort exceeds the maximum for download.');
                            $('#file-export-option input').prop('disabled', 'disabled');
                            $('#file-export-option input').prop('checked', false);
                            $('#file-manifest').hide();
                            if (!user_is_social) {
                                $('#need-social-account').show();
                            } else {
                                $('#file-manifest-max-exceeded').show();
                                $('#bq-export-option input').prop('checked', true).trigger("click");
                            }
                        } else {
                            $('#file-manifest-max-exceeded').hide();
                            $('#file-manifest').show();

                            var select_box_div = $('#file-part-select-box');
                            var select_box = select_box_div.find('select');
                            if (file_parts_count > 1) {
                                select_box_div.show();
                                for (let i = 0; i < display_file_parts_count; ++i) {
                                    select_box.append($('<option/>', {
                                        value: i,
                                        text: "File Part " + (i + 1)
                                    }));
                                }
                            } else {
                                select_box_div.hide();
                            }
                        }
                        $('#search_def_stats').removeClass('notDisp');
                        $('#search_def_stats').html(data.totals.PatientID.toString() +
                            " Cases, " + data.totals.StudyInstanceUID.toString() +
                            " Studies, and " + data.totals.SeriesInstanceUID.toString() +
                            " Series in this cohort. " +
                            "Size on disk: " + data.totals.disk_size);

                        if (('filtered_counts' in data) && ('access' in data['filtered_counts']['origin_set']['All']['attributes']) && ('Limited' in data['filtered_counts']['origin_set']['All']['attributes']['access']) && (data['filtered_counts']['origin_set']['All']['attributes']['access']['Limited']['count']>0) ){
                            $('#search_def_access').removeClass('notDisp');
                            $('.access_warn').removeClass('notDisp');
                        }
                        else {
                            $('#search_def_access').addClass('notDisp');
                            $('.access_warn').addClass('notDisp');
                        }
                    } else {
                        if (isFiltered && data.total > 0) {
                            $('#save-cohort-btn').prop('disabled', '');
                            if (user_is_auth) {
                                $('#save-cohort-btn').prop('title', '');
                            }
                            $('#search_def_stats').removeClass('notDisp');
                            $('#search_def_stats').html(data.totals.PatientID.toString() + " Cases, " +
                                data.totals.StudyInstanceUID.toString()+" Studies, and " +
                                data.totals.SeriesInstanceUID.toString()+" Series in this cohort. " +
                                "Size on disk: " + data.totals.disk_size);
                            let select_box_div = $('#file-part-select-box');
                            let select_box = select_box_div.find('select');
                            if (data.totals.file_parts_count > 1) {
                                select_box_div.show();
                                for (let i = 0; i < data.totals.display_file_parts_count; ++i) {
                                    select_box.append($('<option/>', {
                                        value: i,
                                        text : "File Part " + (i + 1)
                                    }));
                                }
                            } else {
                                select_box_div.hide();
                            }
                            if (('filtered_counts' in data) && ('access' in data['filtered_counts']['origin_set']['All']['attributes']) && ('Limited' in data['filtered_counts']['origin_set']['All']['attributes']['access']) && (data['filtered_counts']['origin_set']['All']['attributes']['access']['Limited']['count']>0) ){
                               $('#search_def_access').removeClass('notDisp');
                               $('.access_warn').removeClass('notDisp');
                            } else {
                                $('#search_def_access').addClass('notDisp');
                                $('.access_warn').addClass('notDisp');
                            }
                        } else {
                            $('#search_def_access').addClass('notDisp');
                            $('.access_warn').addClass('notDisp');
                            $('#save-cohort-btn').prop('disabled', 'disabled');
                            if (data.total <= 0) {
                                $('#search_def_stats').removeClass('notDisp');
                                $('#search_def_stats').html('<span style="color:red">There are no cases matching the selected set of filters</span>');
                                //window.alert('There are no cases matching the selected set of filters.')
                            } else {
                                $('#search_def_stats').addClass('notDisp');
                                $('#search_def_stats').html("Don't show this!");
                            }
                            if (user_is_auth) {
                                $('#save-cohort-btn').prop('title', data.total > 0 ? 'Please select at least one filter.' : 'There are no cases in this cohort.');
                            } else {
                                $('#save-cohort-btn').prop('title', 'Log in to save.');
                            }
                        }
                    }
                    //updateCollectionTotals(data.total, data.origin_set.attributes.collection_id);

                    updateCollectionTotals('Program', data.programs);
                    //updateFilterSelections('search_orig_set', data.origin_set.All.attributes);


                    dicofdic = {'unfilt': data.origin_set.All.attributes, 'filt': ''}
                    if (isFiltered) {
                        dicofdic['filt'] = data.filtered_counts.origin_set.All.attributes;
                    } else {
                        dicofdic['filt'] = data.origin_set.All.attributes;
                    }
                    updateFilterSelections('access_set', dicofdic);
                    updateFilterSelections('analysis_set', dicofdic);
                    updateFilterSelections('search_orig_set', dicofdic);
                    createPlots('search_orig_set');

                    var derivedAttrs = Array.from($('#search_derived_set').children('.list-group').children('.list-group-item').children('.list-group-item__body').map(function () {
                        return this.id;
                    }));

                    if (data.hasOwnProperty('derived_set')) {
                        $('#search_derived_set').removeClass('disabled');
                        for (facetSet in data.derived_set) {
                            if ('attributes' in data.derived_set[facetSet]) {
                                dicofdic = {'unfilt': data.derived_set[facetSet].attributes, 'filt': ''}
                                if (isFiltered && data.filtered_counts.hasOwnProperty('derived_set')
                                    && data.filtered_counts.derived_set.hasOwnProperty(facetSet)
                                    && data.filtered_counts.derived_set[facetSet].hasOwnProperty('attributes')
                                ) {
                                    dicofdic['filt'] = data.filtered_counts.derived_set[facetSet].attributes;
                                } else if (isFiltered) {
                                    dicofdic['filt'] = {};
                                } else {
                                    dicofdic['filt'] = data.derived_set[facetSet].attributes;
                                }
                                updateFilterSelections(data.derived_set[facetSet].name, dicofdic);
                                var derivedAttrIndex = derivedAttrs.indexOf(data.derived_set[facetSet].name);
                                if (derivedAttrIndex > -1) {
                                    derivedAttrs.splice(derivedAttrIndex, 1);
                                }
                            }
                        }

                    } else {
                        $('#search_derived_set').addClass('disabled');
                    }


                    for (var i = 0; i < derivedAttrs.length; i++) {
                        updateFilterSelections(derivedAttrs[i], {});
                    }

                    createPlots('search_derived_set');

                    if (data.hasOwnProperty('related_set')) {
                        $('#search_related_set').removeClass('disabled');
                        dicofdic = {'unfilt': data.related_set.All.attributes, 'filt': ''}
                        if (isFiltered) {
                            dicofdic['filt'] = data.filtered_counts.related_set.All.attributes;
                        } else {
                            dicofdic['filt'] = data.related_set.All.attributes;
                        }
                        updateFilterSelections('search_related_set', dicofdic);
                        //createPlots('tcga_clinical');
                    } else {
                        $('#search_related_set').addClass('disabled');
                        updateFilterSelections('search_related_set', {});
                    }
                    createPlots('search_related_set');
                    var collFilt = new Array();
                    if ('collection_id' in parsedFiltObj) {
                        collFilt = parsedFiltObj['collection_id'];
                        var ind = 0;
                        while (ind < window.selItems.selProjects.length) {
                            proj = window.selItems.selProjects[ind]
                            if ((collFilt.indexOf(proj) > -1)) {
                                ind++
                            } else {
                                window.selItems.selProjects.splice(ind, 1);
                                if (proj in window.selItems.selStudies) {
                                    delete window.selItems.selStudies[proj];
                                }
                            }
                        }
                    }
                    updateTablesAfterFilter(collFilt, data.origin_set.All.attributes.collection_id);

                    if ($('.search-configuration').find('#hide-zeros')[0].checked) {
                        addSliders('search_orig_set', false, true, '');
                        addSliders('quantitative', false, true, 'quantitative.');
                        addSliders('tcga_clinical', false, true, 'tcga_clinical.');
                    }

                }
                //changeAjax(false);
                finally {
                    deferred.resolve();
                }
            },
            error: function(data){
                alert("There was an error fetching server data. Please alert the systems administrator")
                console.log('error loading data');
            }
        });
        return deferred.promise();
    };

    var manageUpdateFromPlot = function(plotId, label) {
        var listId = plotId.replace('_chart','_list');
        var filterId = plotId.replace('_chart','');
        let isInt = !FLOAT_SLIDERS.includes(filterId);
        var isSlider = $('#'+filterId).hasClass('hasSlider') ? true : false;
        if (isSlider) {
            var maxx =parseFloat($('#' + filterId).attr('data-max'));
            var minx=parseFloat($('#' + filterId).attr('data-min'));

            if (isInt){
                maxx=Math.ceil(maxx);
                minx=Math.floor(minx);
            }
            else{
                maxx=parseFloat(maxx.toFixed(2));
                minx=parseFloat(minx.toFixed(2));
            }
            var parStr = $('#'+filterId).find('#'+filterId+'_slide').data('attr-par');

            if ((label ==='None') && $('#'+filterId).hasClass('wNone')){
                butElem = $('#'+filterId).find('.noneBut').children('input')[0];
                butElem.checked=true
                setSlider(filterId+"_slide", true, minx, maxx, isInt, false);
                window.addNone(butElem,parStr,true);
            } else {
                if ($('#'+filterId).hasClass('wNone')){
                    butElem = $('#'+filterId).find('.noneBut').children('input')[0];
                    butElem.checked=false;
                    window.addNone(butElem,parStr,false);
                }

                var selArr = label.split(' To ');
                var strt = parseFloat((selArr[0] === '*') ? '0' : selArr[0]);
                var end = parseFloat((selArr[1] === '*') ? maxx : selArr[1]);
                if (isInt){
                    strt = Math.floor(strt);
                    end = Math.floor(end);
                }
                else{
                    strt = parseFloat(strt.toFixed(2));
                    end = parseFloat(end.toFixed(2));
                }
                setSlider(filterId+"_slide", false, strt, end, isInt,true);
            }
        } else {
            var inputList = $('#' + listId).find(':input');
            for (var i = 0; i < inputList.length; i++) {
                var curLabel = $(inputList[i]).parent().children()[1].innerHTML;
                if (label === curLabel) {
                    inputList[i].checked = true;
                } else {
                    inputList[i].checked = false;
                }

                if (i < inputList.length - 1) {
                    handleFilterSelectionUpdate(inputList[i], false, false);
                } else {
                    handleFilterSelectionUpdate(inputList[i], true, true);
                }
            }
        }
    }

    var plotCategoricalData = function (plotId, lbl, plotData, isPie, showLbl) {
        var width = 150;
        var height = 150;
        var shifty = 48;
        var xshift=width/2+20;
        var margin = 0;
        var radius = Math.min(width, height) / 2 - margin;
        var radiusB = 1.1*radius;
        var mx =0;
        var mn =0;

        var filterId=plotId.replace("_chart","");
        if ( $('#'+filterId).attr('max') ) {
            //var mn = $('#' + slideId).data('min');
            var mx = $('#' + filterId).attr('max');
        }

        // append the svg object to the div called 'my_dataviz'
        var svg = d3.select("#"+plotId)
         .select("svg")
         .attr("width", width)
         .attr("height", height).style("text-anchor","middle");

      /*  var svg = d3.select("#"+plotId)
         .select("svg")
            .attr("viewBox",`0 0 290 340`).style("text-anchor","middle"); */

        var Tooltip = $("#"+plotId + " div.chart-tooltip").length > 0
            ? d3.select("#"+plotId + " div.chart-tooltip")
            : d3.select("#"+plotId)
                .append("div")
                .attr("class", "chart-tooltip")
                .style("top", "180px")
                .style("left", "0px");

        svg.selectAll("*").remove();

        titlePart = svg.append("text")
            .attr("text-anchor","middle")
            .attr("font-size", "16px")
            .attr("fill","#2A537A");
        var title0="";
        var title1="";
        var title2="";

        if (lbl.includes('Quarter')){
            var titA = lbl.split('Quarter');
            title1=titA[0]+' Quarter';
            title2=titA[1];
        } else if (lbl.includes('Background')){
            var titA = lbl.split('Activity');
            var titB = titA[1].split('(');
            title0 = titA[0];
            title1= 'Activity '+titB[0];
            title2= '('+titB[1];
        } else if (lbl.includes('(')){
           var titA = lbl.split('(');
           title1=titA[0];
           title2='('+titA[1];
         }
        else if (lbl.includes('Max Total Pixel')){
            var titA = lbl.split('Pixel')
            title1=titA[0]+'Pixel'
            title2=titA[1]
        }
        else{
          title2=lbl;
         }

         titlePart.append("tspan").attr("x",xshift).attr("y",0).attr("dx",0).attr("dy",0).text(title0);
         titlePart.append("tspan").attr("x", xshift).attr("y", 0).attr("dx", 0).attr("dy", 20).text(title1);
        titlePart.append("tspan").attr("x", xshift).attr("y", 0).attr("dx", 0).attr("dy", 40).text(title2);

        var pieg=svg.append("g").attr("transform", "translate(" + (width / 2 +20)  + "," + (height / 2 + shifty) + ")");
        var data = new Object;
        var nonZeroLabels= new Array();
        //spcing = 1.0/parseFloat(plotData.dataCnt.length);
        var tot=0;

        for (i=0;i<plotData.dataCnt.length;i++) {
           var pkey = plotData.dataLabel[i];
           var cnt = plotData.dataCnt[i];
           data[pkey]=cnt;
           tot+=cnt;
           if (cnt>0){
               nonZeroLabels.push(pkey);
           }
           //rng.push(parseFloat(i)*parseFloat(spcing));
        }
        $('#'+plotId).data('total',tot.toString());

       // set the color scale
       var color = d3.scaleOrdinal()
        .domain(nonZeroLabels)
        .range(d3.schemeCategory10);

       // don't color last pie slice the same as first
       var colorPie = function(lbl){
         var col="";
           if ( (nonZeroLabels.length>1) & (lbl === nonZeroLabels[nonZeroLabels.length-1]) && (color(nonZeroLabels[0])===color(lbl))  ){
                    col=color(nonZeroLabels[5]);
           } else {
               col=color(lbl);
           }
           return col;
       }

       // Compute the position of each group on the pie:
      var pie = d3.pie().value(function(d) {return d.value; }).sort(null);
      var data_ready = pie(d3.entries(data));

     // Build the pie chart: Basically, each part of the pie is a path that we build using the arc function.
      pieg
      .selectAll('whatever')
      .data(data_ready)
      .enter()
      .append('path')
      .attr('d', d3.arc()
      .innerRadius(0)
      .outerRadius(radius)
      )
      .attr('fill', function(d){ return(
        colorPie(d.data.key)  )
       })
      .attr("stroke", "black")
      .attr("data-tooltip", function(d){
          let perc = (parseInt((parseFloat(d.data.value)/parseFloat($('#'+plotId).data('total')))*100)).toString()+"%";
          let val = d.data.key.replace('* To',mn.toString()+' To').replace('To *', 'To '+mx.toString());
          let count = d.data.value;

          return '<div>' + val + '<br />' + count + ' (' + perc + ')</div>';
      })
      .attr('data-tooltip-color', function(d){
          return colorPie(d.data.key);
      })
      .style("stroke-width", "0px")
      .style("opacity", 0.7)
          .on("mouseover", function(d){
              Tooltip.style("opacity", 1);
          })
          .on("mousemove",function(d){
              let node = $(d3.select(this).node());
            Tooltip
                .html(node.data('tooltip'));
            $(Tooltip.node()).children("div").css("border-color", node.data('tooltip-color'))
            d3.select(this).attr('d', d3.arc()
           .innerRadius(0)
           .outerRadius(radiusB)
           );

        })
         .on("mouseleave",function(d){
             Tooltip.style("opacity", 0);
            d3.select(this).attr('d', d3.arc()
           .innerRadius(0)
           .outerRadius(radius)
           );
         })
        .on("click",function(d){
            if (!is_cohort) {
                manageUpdateFromPlot(plotId, d.data.key);
            }
        });

        var txtbx=pieg.append("text").attr("x","0px").attr("y","10px").attr('text-anchor','start');
        txtbx.append("tspan").attr("x","0px").attr("y","0px").attr("dy",0);
        txtbx.append("tspan").attr("x","0px").attr("y","0px").attr("dy",20);
        txtbx.append("tspan").attr("x","0px").attr("y","0px").attr("dy",40);
        txtbx.attr("opacity",0);

        if (tot===0) {
            txtbx.attr('text-anchor','middle');
            tspans=txtbx.node().childNodes;
            tspans[0].textContent = "No Data Available";
            txtbx.attr("opacity",1);
        }
    }

    var findFilterCats = function (id, wCheckBox) {
        filterCats = new Array();
        listElems = $('#' + id).find('.list-group-item__body, .collection-list, .list-group-sub-item__body');
        if (wCheckBox){
            listElems = listElems.children('.search-checkbox-list').parent()
        }
        for (i = 0; i < listElems.length; i++) {
            elem = listElems.get(i);
            nm = elem.id;
            filterCats.push(nm);
        }
        return filterCats
    };

    var parseFilterForCounts = function (id) {
        var dataLabel = new Array();
        var dataCnt = new Array();

        listElems = $('#' + id).find('.checkbox')
        for (var i = 0; i < listElems.length; i++) {
            elem = listElems.get(i);
            spans = $(elem).find('span')
            lbl = spans.get(0).innerHTML;
            cnt = parseInt(spans.get(1).innerHTML);
            dataLabel.push(lbl);
            if ($(spans.get(1)).hasClass("plotit")) {
                dataCnt.push(cnt);
            } else {
                dataCnt.push(0);
            }
        }
        return {'dataLabel': dataLabel, 'dataCnt': dataCnt}
    }

    window.updatePlots = function (selectElem) {
        createPlots('search_orig_set');
        createPlots('search_derived_set');
        createPlots('search_related_set');
    }

    var createPlots = function (id) {

        var isPie = true;
        var ptIndx = document.getElementById("plot_type").selectedIndex;
        if (ptIndx === 1) {
            isPie = false;
        }
        var showLbl = document.getElementById("plot_label").checked

        var filterCats = findFilterCats(id,true);
        for (var i = 0; i < filterCats.length; i++) {
            filterCat = filterCats[i];
            filterData = parseFilterForCounts(filterCat);
            plotId = filterCat + "_chart";
            var lbl='';
            lbl = $('#' + filterCat + '_heading').children('a').children('.attDisp')[0].innerText;
            plotCategoricalData(plotId, lbl, filterData, isPie, showLbl);
        }
    }

    window.resort = function(filterCat){
        updateFilters(filterCat,{},false, false);
    }

    window.resortColl = function() {
       updateFilters('program_set',{},false, false);
       for (program in window.programs) {
           if (Object.keys(window.programs[program].projects).length > 1) {
               updateFilters(program,{},false, false);
           }
       }
    }

    var updateAttributeValues = function(attributeValList, dic){
        var allValues = attributeValList.children('li').children().children('input:checkbox');
        for (var i = 0; i < allValues.length; i++) {
            var elem = allValues.get(i);
            var val = $(elem)[0].value;
            var spans = $(elem).parent().find('span');
            var cntUf=0;
            if (dic.hasOwnProperty('unfilt') && dic['unfilt'].hasOwnProperty(val)) {
                cntUf = dic['unfilt'][val].count
            } else {
                cntUf = 0;
            }

            spans.filter('.case_count')[0].innerHTML = cntUf.toString();
            if (spans.filter('.plot_count').length>0) {
                var cntF = 0
                if (dic.hasOwnProperty('filt') && dic['filt'].hasOwnProperty(val)) {
                    cntF = dic['filt'][val].count
                } else {
                    cntF = 0;
                }

                spans.filter('.plot_count')[0].innerHTML = cntF.toString();
            }
        }
    }

    window.updateFilters = function (filterCat, dic, dataFetched, srch) {
        var numAttrAvail = 0;
        var numCnts=0;

        var headerCnt = $('#'+filterCat).filter('.collection_name').siblings().filter('.case_count');
        if (headerCnt.length>0){
            numCnts = headerCnt[0].innerHTML;
        }

        var showZeros = true;
        var searchDomain = $('#'+filterCat).closest('.search-configuration, #program_set, #analysis_set');
        //var isSearchConf = ($('#'+filterCat).closest('.search-configuration').find('#hide-zeros').length>0);
        if ((searchDomain.find('#hide-zeros').length>0) && (searchDomain.find('#hide-zeros').prop('checked'))){
            showZeros = false;
        }
        var textFilt=false;
        var textFiltVal='';
        if ($('#'+filterCat).children('.text-filter').length>0) {
            textFiltVal = $('#'+filterCat).children('.text-filter')[0].value;
        } else if ($('#'+filterCat).find('.collection_value').length>0){
            textFiltVal = $('#collection_search')[0].value;
        }

        if (!(textFiltVal==='')){
            textFilt=true;
        }

        if (  $('#'+filterCat).hasClass('isQuant') && dataFetched){
            if (dic.hasOwnProperty('unfilt') && dic['filt'].hasOwnProperty('min_max') ){
                if (dic['unfilt']['min_max'].hasOwnProperty('min')) {
                    $('#' + filterCat).attr('data-curmin', dic['unfilt']['min_max']['min']);
                } else {
                    $('#'+filterCat).attr('data-curmin','NA');
                }
                if (dic['unfilt']['min_max'].hasOwnProperty('max')) {
                    $('#' + filterCat).attr('data-curmax', dic['unfilt']['min_max']['max']);
                } else {
                    $('#'+filterCat).attr('data-curmax','NA');
                }
            } else {
                $('#'+filterCat).attr('data-curmin','NA');
                $('#'+filterCat).attr('data-curmax','NA');
            }
         }
        var filterList=$('#'+filterCat).children('ul');
        if (dataFetched){
            updateAttributeValues(filterList, dic);
        }

        var sorter= $('#'+filterCat).children('.sorter').find(":radio").filter(':checked');

        if ($('#'+filterCat).find('.collection_value').length>0){
            sorter= $('#Program').children('.sorter').find(":radio").filter(':checked');
        }

        if (sorter.length>0){
             if (sorter.val()==="alpha"){
                 const reRng= /^\d*\.?\d+\s+[Tt]o\s+\d*\.?\d+$/;

                 filterList.children('li').sort(
                    function (a,b){
                     var valA=$(a).children().children('.value').text().trim();
                     var valB=$(b).children().children('.value').text().trim();

                     if ( ($(a).children().children('input:checkbox')[0].checked || $(a).children().children('input:checkbox')[0].indeterminate) && !($(b).children().children('input:checkbox')[0].checked || $(b).children().children('input:checkbox')[0].indeterminate)){
                         return -1;
                     }
                     else if ( ($(b).children().children('input:checkbox')[0].checked || $(b).children().children('input:checkbox')[0].indeterminate) && !($(a).children().children('input:checkbox')[0].checked || $(a).children().children('input:checkbox')[0].indeterminate)){
                         return 1;
                     }

                     else if (reRng.test(valB) && reRng.test(valA)){
                         if ( parseFloat(valB.toLowerCase().split('to')[0].trim()) <  parseFloat(valA.toLowerCase().split('to')[0].trim())){
                             return 1;
                         }
                         else{
                             return -1;
                         }
                     }

                     else if (valB < valA){
                         return 1;
                     } else {
                         return -1;
                     }

                    }).appendTo(filterList);
             }
             else if (sorter.val()==="num"){
                 filterList.children('li').sort(
                    function (a,b){
                        if ( ($(a).children().children('input:checkbox')[0].checked || $(a).children().children('input:checkbox')[0].indeterminate) && !($(b).children().children('input:checkbox')[0].checked || $(b).children().children('input:checkbox')[0].indeterminate)){
                         return -1;
                         }
                         else if ( ($(b).children().children('input:checkbox')[0].checked || $(b).children().children('input:checkbox')[0].indeterminate) && !($(a).children().children('input:checkbox')[0].checked || $(a).children().children('input:checkbox')[0].indeterminate)){
                            return 1;
                         } else {

                            return (parseFloat($(a).children().children('.case_count').text()) < parseFloat($(b).children().children('.case_count').text()) ? 1 : -1)
                           }
                        }).appendTo(filterList);
             }
        }

        var allFilters = filterList.children('li').children().children('input:checkbox');

        var hasFilters=true;
        if (allFilters.length===0){
            hasFilters = false;
        }
        var checkedFilters=allFilters.children('li').children().children('input:checked');
        var showExtras = false;
        if ( ($('#' + filterCat).children('.more-checks').length>0) && $('#' + filterCat).children('.more-checks').hasClass("notDisp")) {
            showExtras = true;
        }
        //var allUnchecked = ((checkedFilters.length == 0) ? true : false)

        var numNonZero = 0;
        numCnts = 0;
        for (var i = 0; i < allFilters.length; i++) {

            var elem = allFilters.get(i);
            var val = $(elem).data('filterDisplayVal');
            var filtByVal = false;

            if ($(elem).siblings().filter('a').length===0) {
                if (textFilt && !(val.toLowerCase().includes(textFiltVal.toLowerCase()))) {
                    filtByVal = true;
                    $(elem).parent().parent().addClass('filtByVal');

                } else {
                    $(elem).parent().parent().removeClass('filtByVal');
                    if (srch){
                        let ctrl = $(elem).closest('.list-group-item').find('.list-group-item__heading').find('a');
                        if (ctrl.attr('aria-expanded')==='false'){
                            ctrl.click();
                        }
                    }
                }
            }
            let checked = $(elem).prop('checked');
            let spans = $(elem).parent().find('span');
            //var lbl = spans.get(0).innerHTML;
            let cntUf = parseInt(spans.filter('.case_count')[0].innerHTML);

            let isZero = true;
            if ( (cntUf>0) || checked)  {
                if (cntUf>0){
                    numNonZero++;
                }
                $(elem).parent().parent().removeClass('zeroed');
                isZero = false;
            } else {
                $(elem).parent().parent().addClass('zeroed');
                isZero = true;
            }
            let allChildrenHidden = false;
            if ( $(elem).parent().siblings().filter('.list-group-sub-item__body').length>0 ){
                if ($(elem).parent().siblings().filter('.list-group-sub-item__body').find('.checkbox').not('.notDisp').length===0){
                    allChildrenHidden = true;
                }
            }
            let thisAttrAvail = (( ( !isZero || showZeros) && !filtByVal  && !allChildrenHidden) || checked) ? true:false;
            if  ( thisAttrAvail){
                  numAttrAvail++;
                  numCnts+=cntUf;
            }

            if ( (numAttrAvail>5) && thisAttrAvail  ) {
                $(elem).parent().parent().addClass('extra-values');
            } else {
                $(elem).parent().parent().removeClass('extra-values');
            }

            if ( thisAttrAvail && (showExtras || (numAttrAvail<6)) ) {
                  $(elem).parent().parent().removeClass('notDisp');
            } else {
                $(elem).parent().parent().addClass('notDisp');
            }
        }

        if (hasFilters){
            if (numNonZero===0){
                $('#' + filterCat+'_heading').children('a').children().addClass('greyText');
                $('#' + filterCat+'_heading').children('a').children('.noCase').removeClass('notDisp');

            } else {
                $('#' + filterCat+'_heading').children('a').children().removeClass('greyText');
                $('#' + filterCat+'_heading').children('a').children('.noCase').addClass('notDisp');
            }

            var numMore = filterList.children('li').filter('.extra-values').length;
            if ($('#' + filterCat).children('.more-checks').children('.show-more').length>0){
                $('#' + filterCat).children('.more-checks').children('.show-more')[0].innerText = "show " + numMore.toString() + " more";
                if (numMore>0){
                    $('#' + filterCat).children('.more-checks').children('.show-more').removeClass('notDisp');
                    $('#' + filterCat).children('.less-checks').children('.show-less').removeClass('notDisp');
                } else {
                    $('#' + filterCat).children('.more-checks').children('.show-more').addClass('notDisp');
                    $('#' + filterCat).children('.less-checks').children('.show-less').addClass('notDisp');
                }
            }
            if ( numAttrAvail < 1)  {
                $('#' + filterCat).children('.more-checks').hide();
                $('#' + filterCat).children('.less-checks').hide();
                $('#' + filterCat).children('.check-uncheck').hide();
            } else if (showExtras) {
                $('#' + filterCat).children('.more-checks').hide();
                $('#' + filterCat).children('.less-checks').show();
                $('#' + filterCat).children('.check-uncheck').show();
            } else {
                $('#' + filterCat).children('.more-checks').show();
                $('#' + filterCat).children('.check-uncheck').show();
                if ($('#' + filterCat).children('.more-checks').children('.show-more').length>0){

                }
                $('#' + filterCat).children('.less-checks').hide();
            }
        }
        return [numAttrAvail, numCnts];
    }

    setAllFilterElements = function(hideEmpty,filtSet, srch=false){
        //var filtSet = ["search_orig_set","segmentation","quantitative","qualitative","tcga_clinical"];
        for (var i=0;i<filtSet.length;i++) {
            filterCats = findFilterCats(filtSet[i], false);
            let resetParentVal=false;
            progInd = filterCats.indexOf('Program');
            if (progInd>-1){
                filterCats.splice(progInd,1);
                filterCats.push('Program');
                resetParentVal=true;
            }

            for (var j = 0; j < filterCats.length; j++) {
                let ret = updateFilters(filterCats[j],{},false,srch);
                if (resetParentVal && !(filterCats[j]==='Program')){
                    parentVal=$('#'+filterCats[j]).siblings().filter('.list-group-item__heading').find('.case_count');
                    parentVal[0].innerHTML=ret[1];
                    if (ret[0]===0){
                         $('#'+filterCats[j]).addClass('notDisp')
                    }
                    else{
                        $('#'+filterCats[j]).removeClass('notDisp')
                    }
                }
            }
        }

    }

    window.updateColl = function(srch){
        let checked=$('#Program').find('.hide-zeros')[0].checked;
        let filtSet=['program_set']
        /* for (program in window.programs){
            if (Object.keys(window.programs[program].projects).length>1){
                filtSet.push(program)
            }
        }*/

        setAllFilterElements(checked,filtSet,srch);
    }

    window.hideAtt = function(hideElem){
        let filtSet = ["search_orig_set","segmentation","quantitative","qualitative","tcga_clinical"];
        setAllFilterElements(hideElem.checked, filtSet);
        addSliders('search_orig_set', false, hideElem.checked,'');
        addSliders('quantitative', false, hideElem.checked,'quantitative.');
        addSliders('tcga_clinical',false, hideElem.checked,'tcga_clinical.');
    }

    var updateFilterSelections = function (id, dicofdic) {
        let filterCats = findFilterCats(id,false);
        for (let i = 0; i < filterCats.length; i++) {
            let cat = filterCats[i]
            let filtDic = {'unfilt':'', 'filt':''}

            if ( (dicofdic.hasOwnProperty('unfilt')) &&  (dicofdic['unfilt'].hasOwnProperty(cat))){
                filtDic['unfilt']=dicofdic['unfilt'][cat]
            }
            if ( (dicofdic.hasOwnProperty('filt')) && (dicofdic['filt'].hasOwnProperty(cat))) {
                filtDic['filt']=dicofdic['filt'][cat]
            }
            updateFilters(filterCats[i], filtDic, true, false);
        }
    };

    var checkFilters = function(filterElem) {
        let operatorInfo = false;
        let operator = ""
        let opInfoElem = $(filterElem).closest('.list-group-item__body, .list-group-sub-item__body','.colections-list').find('.join_val').filter('input:checked')
        if (opInfoElem.length>0){
            operatorInfo = true;
            operator = opInfoElem.attr('value');
        }

        let isRng = $(filterElem).closest('.list-group-item__body, .list-group-sub-item__body','.colections-list').hasClass('isRng');
        let checked = $(filterElem).prop('checked');
        let neighbours =$(filterElem).parentsUntil('.list-group-item__body, .list-group-sub-item__body','ul').children().children().children('input:checkbox');
        let neighboursCk = $(filterElem).parentsUntil('.list-group-item__body, .list-group-sub-item__body','ul').children().children().children(':checked');
        let allChecked= false;
        let noneChecked = false;
        if (neighboursCk.length===0){
            noneChecked = true;
        }

        if (neighbours.length === neighboursCk.length){
            allChecked = true;
        }

        let filterCats= $(filterElem).parentsUntil('.tab-pane','.list-group-item, .checkbox');
        let j = 1;

        let curCat = '';
        let lastCat = '';
        numCheckBoxes = 0;
        for (var i=0;i<filterCats.length;i++){
            let filtnm = '';
            ind = filterCats.length-1-i;
            filterCat = filterCats[ind];
            hasCheckBox = false;
            if (filterCat.classList.contains('checkbox')){
                 checkBox = $(filterCat).find('input:checkbox')[0];
                 filtnm = checkBox.value;
                 hasCheckBox = true;
                 numCheckBoxes++;
            } else {
                let filtnmSrc = $(filterCat).children('.list-group-sub-item__body, .list-group-item__body, .collection-list')
                if (filtnmSrc.length<1){
                    filtnmSrc = $(filterCat).children().children('.collection_id')
                }


                filtnm = filtnmSrc[0].id;
                if  ($(filterCat).children('.list-group-item__heading').children('input:checkbox').length>0) {
                   hasCheckBox = true;
                   numCheckBoxes++;
                }
               checkBox = $(filterCat).children('.list-group-item__heading').children('input:checkbox')[0];
            }

            if ( hasCheckBox && (ind ===1) && !(allChecked) && !(noneChecked)){
                checkBox.indeterminate = true;
                checkBox.checked = false;
            } else if (hasCheckBox){
                checkBox.indeterminate = false;
            }
            filtArg=filtnm;
            isNoneCat=false;
            if (isRng){
                if (filtnm.match(/\s+[Tt]o\s+/)) {
                    filtArg = filtnm.split(/\s+[Tt]o\s+/).map(Number);
                }
                else{
                    isNoneCat=true;
                }
            }


            if ((checked) && (curCat.length>0) && hasCheckBox  ){
                if (!(checkBox.indeterminate)) {
                    checkBox.checked = true;
                }

                if (operatorInfo){
                    if (!(filterObj.hasOwnProperty(curCat))) {
                        filterObj[curCat] = new Object();
                        filterObj[curCat]['values'] = new Array();
                    }
                    filterObj[curCat]['op'] = operator
                    if (filterObj[curCat]['values'].indexOf(filtnm) < 0) {
                        filterObj[curCat]['values'].push(filtnm);
                    }

                }
                else if(isRng){
                    curCatRng = curCat+"_rng";
                    if (!(filterObj.hasOwnProperty(curCatRng))) {
                        filterObj[curCatRng] = new Object();
                        filterObj[curCatRng]['type']='ebtw'

                    }
                    if (isNoneCat){
                        filterObj[curCatRng]['none']=true;
                    }
                    else {
                        if (!(filterObj[curCatRng].hasOwnProperty('rng'))){
                            filterObj[curCatRng]['rng'] = new Array();
                        }
                        filterObj[curCatRng]['rng'].push(filtArg)
                    }
                }
                else {
                    if (!(filterObj.hasOwnProperty(curCat))) {
                        filterObj[curCat] = new Array();
                    }
                    if (filterObj[curCat].indexOf(filtnm) < 0) {
                        filterObj[curCat].push(filtnm);
                    }
                }
            }

            if (!checked && ( (ind===0) || ( (ind===1) && hasCheckBox && noneChecked)) ){
               checkBox.checked = false;
               if ( filterObj.hasOwnProperty(curCat) || (isRng && filterObj.hasOwnProperty(curCat+"_rng"))) {
                   if (operatorInfo) {
                       if (filterObj[curCat]['values'].indexOf(filtnm) > -1) {
                           pos = filterObj[curCat]['values'].indexOf(filtnm);
                           filterObj[curCat]['values'].splice(pos, 1);
                           if (Object.keys(filterObj[curCat]['values']).length === 0) {
                               delete filterObj[curCat];
                           }
                       }
                   }
                   else if(isRng)
                   {
                       curCatRng = curCat+"_rng";
                       if (isNoneCat && filterObj[curCatRng].hasOwnProperty('none')){
                           delete filterObj[curCatRng]['none'];
                       }

                       else if (filterObj[curCatRng]['rng'].map(String).indexOf(filtArg.toString()) > -1) {
                           pos = filterObj[curCatRng]['rng'].map(String).indexOf(filtArg.toString());
                           filterObj[curCatRng]['rng'].splice(pos, 1);
                           if (filterObj[curCatRng]['rng'].length === 0) {
                               delete filterObj[curCatRng]['rng'];
                           }
                       }
                       if (!filterObj[curCatRng].hasOwnProperty('rng')  && !filterObj[curCatRng].hasOwnProperty('none')){
                           delete filterObj[curCatRng];
                       }

                   }
                   else {
                       if (filterObj[curCat].indexOf(filtnm) > -1) {
                           pos = filterObj[curCat].indexOf(filtnm);
                           filterObj[curCat].splice(pos, 1);
                           if (Object.keys(filterObj[curCat]).length === 0) {
                               delete filterObj[curCat];
                           }
                       }
                   }
               }
               if (curCat.length>0){
                   curCat+="."
               }
                lastCat = curCat;
                curCat += filtnm;
                if ($(filterElem).parent().hasClass('list-group-item__heading')){
                      chkList=$(filterElem).parent().siblings().filter('.list-group-item__body').find('input:checkbox');
                      for (var ind=0; ind<chkList.length;ind++){
                          chkList[ind].checked=false;
                      }
                }
                for (var ckey in filterObj){
                    if (ckey.startsWith(curCat)){
                       delete filterObj[curCat];
                   }
               }
            }
            if (curCat.length>0){
                curCat+="."
            }
            curCat+=filtnm;
        }

        var childBoxes=$(filterElem).parent().siblings().find('input:checkbox');
        if (checked && (childBoxes.length>0)) {
            filterObj[curCat] = new Array();
            childBoxes.each(function(){
               this.checked=true;
               filterObj[curCat].push(this.value);
            });
        } else {
            delete filterObj[curCat];
            $(childBoxes).prop('checked',false);
        }
    };

    var applyFilters = function(){
        mkFiltText();
        updateFacetsData(true);
    }
    var handleFilterSelectionUpdate = function(filterElem, mkFilt, doUpdate) {
        checkFilters(filterElem);
        if (mkFilt) {
            mkFiltText();
        }
        if (doUpdate){
                updateFacetsData(true);
        }
    };

    var sortTable = function (tbl, curInd, asc) {
        var thd = $(tbl).find('thead').find('th')[curInd];
        var isSeries = ( ($(tbl).find('tbody')[0].id === 'series_table') ? true : false);
        rowSet = $(tbl).find('tbody').children();
        rowSet = rowSet.sort(function (a, b) {

            item1 = $(a).children()[curInd].innerText;
            item2 = $(b).children()[curInd].innerText;
            if (thd.classList.contains('numeric_data')) {
                item1 = parseFloat(item1);
                item2 = parseFloat(item2);
            }

            if (item1 ===item2){
                if ( isSeries && (curInd===0)){
                    var seriesNuma = parseInt( $(a).children()[1].innerText  );
                    var seriesNumb = parseInt( $(b).children()[1].innerText  );
                    if (seriesNuma === seriesNumb){
                        return 0;
                    } else if (((seriesNuma > seriesNumb) )){
                        return 1;
                    } else {
                        return -1;
                    }
                } else {
                   return 0;
                }
            } else if (((item1 > item2) && asc) || ((item2 > item1) && !asc)) {
                return 1;
            } else {
                return -1
            }
        });
        $(tbl).find('tbody').append(rowSet);
    };


    var filterItemBindings = function (filterId) {

        $('#' + filterId).find('.join_val').on('click', function () {
            var attribute = $(this).closest('.list-group-item__body, .list-group-sub-item__body','.colections-list')[0].id;
            if (filterObj.hasOwnProperty(attribute) && (window.filterObj[attribute]['values'].length>1)){
                mkFiltText();
                filterObj[attribute]['op']=$(this).attr('value');
                updateFacetsData(true);
            }
        });

        $('#' + filterId).find('input:checkbox').not('#hide-zeros').on('click', function () {
            handleFilterSelectionUpdate(this, true, true);
        });

        $('#' + filterId).find('.show-more').on('click', function () {
            $(this).parent().parent().children('.less-checks').show();
            $(this).parent().parent().children('.less-checks').removeClass('notDisp');
            $(this).parent().parent().children('.more-checks').addClass('notDisp');

            $(this).parent().hide();
            var extras = $(this).closest('.list-group-item__body, .collection-list, .list-group-sub-item__body').children('.search-checkbox-list').children('.extra-values')

            if ( ($('#'+filterId).closest('.search-configuration').find('#hide-zeros').length>0)  && ($('#'+filterId).closest('.search-configuration').find('#hide-zeros').prop('checked'))){
                extras=extras.not('.zeroed');
            }
            extras.removeClass('notDisp');
        });

        $('#' + filterId).find('.show-less').on('click', function () {
            $(this).parent().parent().children('.more-checks').show();
            $(this).parent().parent().children('.more-checks').removeClass('notDisp');
            $(this).parent().parent().children('.less-checks').addClass('notDisp');

            $(this).parent().hide();
            $(this).closest('.list-group-item__body, .collection-list, .list-group-sub-item__body').children('.search-checkbox-list').children('.extra-values').addClass('notDisp');
        });

        $('#' + filterId).find('.check-all').on('click', function () {
            if (!is_cohort) {
                checkUncheckAll(this, true, true);

            }
        });

        $('#' + filterId).find('.uncheck-all').on('click', function () {
          if (!is_cohort){
              checkUncheckAll(this, false, false);

          }
        });
    };

    var checkUncheckAll = function(aelem, isCheck, checkSrch){
        //$('#' + filterId).find('.checkbox').find('input').prop('checked', true);
                var filterElems = new Object();
                filterElems = $(aelem).parentsUntil('.list-group-item, #program_set').filter('.list-group-item__body, .list-group-sub-item__body, #Program').children('ul').children();
                for (var ind = 0; ind < filterElems.length; ind++) {
                    var ckElem = new Object();
                    if ($(filterElems[ind]).children().filter('.list-group-item__heading').length > 0) {
                        ckElem = $(filterElems[ind]).children().filter('.list-group-item__heading').children().filter('input:checkbox')[0];
                    } else {
                        ckElem = $(filterElems[ind]).children().filter('label').children().filter('input:checkbox')[0];
                    }
                    var subListUsed=false
                    if (checkSrch) {
                        subListElem = $(ckElem).parent().parent().children('.list-group-sub-item__body')
                        if (subListElem.length > 0) {
                            subListUsed = true
                            subFilterElems = subListElem.find('ul').find('.checkbox')
                            for (var subInd = 0; subInd < subFilterElems.length; subInd++) {
                                subFilterElem = subFilterElems[subInd];
                                if (!$(subFilterElem).hasClass('filtByVal')) {
                                    subCkElem = $(subFilterElem).find('input:checkbox')[0];
                                    subCkElem.checked = isCheck;
                                    if ((subInd < subFilterElems.length - 1) || (ind < filterElems.length - 1)) {
                                        handleFilterSelectionUpdate(subCkElem, false, false);
                                    } else {
                                        handleFilterSelectionUpdate(subCkElem, true, true);
                                    }
                                }

                            }

                        } else if (!$(ckElem).parent().parent().hasClass('filtByVal')) {
                            ckElem.checked = isCheck;
                        }
                    } else {
                        ckElem.checked = isCheck;
                    }

                    //$(filterElem).prop('checked') = true;
                    if ((ind < filterElems.length - 1) && (!subListUsed)){
                        handleFilterSelectionUpdate(ckElem, false, false);
                    } else if (!subListUsed) {
                        handleFilterSelectionUpdate(ckElem, true, true);
                    }

                }

    }

    var clearFilter = function (filterElem) {
        if (filterElem.classList.contains('all')){
                for (cat in window.filterObj){
                    delete window.filterObj[cat];
                }
                //window.filterObj.collection_id = window.tcgaColls;
            }
        if (filterElem.classList.contains('all')){

        }
    };

    var addFilterBindings = function(id){
     var filterCats = findFilterCats(id,false);
     for (var i=0;i<filterCats.length;i++){
         filterItemBindings(filterCats[i]);
    }
 };

    var addSliders = function(id, initialCreation, hideZeros, parStr){
        $('#'+id).find('.list-group-item__body.isQuant').each(function() {
            let attr_id = $(this).attr("id");
            let isInt = !FLOAT_SLIDERS.includes(attr_id);
            let min = parseFloat($(this).attr('data-min'));
            let max = parseFloat($(this).attr('data-max'));
            let lower = parseFloat($(this).attr('data-curminrng'));
            let upper = parseFloat($(this).attr('data-curmaxrng'));
            if (isInt){
                min=Math.floor(min);
                max=Math.ceil(max);
                lower=Math.floor(lower);
                upper=Math.ceil(upper);
            }
            else{
                min=parseFloat(min.toFixed(2));
                max=parseFloat(max.toFixed(2));
                lower=parseFloat(lower.toFixed(2));
                upper=parseFloat(upper.toFixed(2));
            }

            let addSlider = true;
            let isActive = $(this).hasClass('isActive');
            let wNone = $(this).hasClass('wNone');
            let checked = ($(this).find('.noneBut').length>0) ? $(this).find('.noneBut').find(':input')[0].checked : false;
            let txtLower = ($(this).find('.sl_lower').length>0) ? $(this).find('.sl_lower').val():'';
            let txtUpper = ($(this).find('.sl_lower').length>0) ? $(this).find('.sl_upper').val():'';
            let cntrNotDisp = ($(this).find('.cntr').length>0) ?$(this).find('.cntr').hasClass('notDisp'):true;


            if (initialCreation){
                let heading = $(this).prop('id') + '_heading';
                $('#'+heading).find('.fa-cog').attr('title', 'Control slider');
                $('#'+heading).find('.fa-search').remove();

                $(this).find('.more-checks').remove();
                $(this).find('.less-checks').remove();
                $(this).find('.sorter').remove();
                $('#'+this.id+'_list').addClass('hide');
            } else {
                let slideDivId = $(this).prop('id') + '_slide';
                curmin = parseFloat($(this).attr('data-curmin'));
                curmax = parseFloat($(this).attr('data-curmax'));
                if (isInt){
                    curmin = Math.floor(curmin);
                    curmax =Math.floor(curmax);
                }
                else{
                    curmin= parseFloat(curmin.toFixed(2));
                    curmax= parseFloat(curmax.toFixed(2));
                }
                $(this).find('#' + slideDivId).remove();
                $(this).find('.cntr').remove();
                //$(this).find('.noneBut').remove();
                let inpName = $(this).prop('id') + '_input';
                $(this).find('#'+inpName).remove();
                if (hideZeros) {
                    if ( ( (curmin === 'NA') || (curmax === 'NA')) && !isActive ){
                        addSlider = false;
                        $(this).removeClass('hasSlider');
                    } else if (isActive){
                        if (curmin === 'NA') {
                                min = lower;
                        } else {
                            min = Math.min(lower, curmin);
                        }
                        if (curmax === 'NA'){
                                max = upper;
                        } else {
                            max = Math.max(upper, curmax);
                        }
                    } else {
                            min = curmin;
                            max = curmax;
                            lower=min;
                            upper=max;
                    }
                } else if (!isActive){
                    lower=min;
                    upper=max;
                }
            }

            if (addSlider) {
                $(this).addClass('hasSlider');
                let step = max <=1 ? 0.05 : 1;
                let isInt = !FLOAT_SLIDERS.includes(attr_id);
                mkSlider($(this).prop('id'), min, max, step, isInt, wNone, parStr, $(this).data('filter-attr-id'), $(this).data('filter-display-attr'), lower, upper, isActive,checked);
                let cntrlDiv = $('<div class="cntr"></div>');
                cntrlDiv.append('<div class="sliderset" style="display:block;margin-bottom:8px">Lower: <input type="text" style="display:inline" size="5" class="sl_lower" value="'+ txtLower + '">' +
                    ' Upper: <input class="sl_upper" type="text" style="display:inline" size="5" class="upper" value="' + txtUpper + '">' +
                    '<div class="slider-message notDisp" style="color:red"><br>Please set lower and upper bounds to numeric values with the upper value greater than the lower, then press Return in either text box. </div></div>')
                cntrlDiv.append(  '<button class="reset" style="display:block;" onclick=\'setSlider("'+ this.id + '_slide", true,0,0,true, true,"'+parStr+'")\'>Clear Slider</button>');
                if (wNone){
                   cntrlDiv.append( '<span class="noneBut"><input type="checkbox"   onchange="addNone(this, \''+parStr+'\', true)"> None </span>');
                   cntrlDiv.find('.noneBut').find(':input')[0].checked = checked;
                }
                if (cntrNotDisp){
                    cntrlDiv.addClass('notDisp');
                }
                $(this).append(cntrlDiv);
                $(this).find('.sliderset').keypress(function(event){
                   var keycode = (event.keyCode ? event.keyCode : event.which);
                   if (keycode == '13'){

                   try {
                       let txtlower = parseFloat($(this).parent().find('.sl_lower').val());
                       let txtupper = parseFloat($(this).parent().find('.sl_upper').val());
                      if (txtlower<=txtupper){
                        setSlider($(this).closest('.hasSlider')[0].id+"_slide", false, txtlower, txtupper, false,true);
                      } else {
                          $(this).closest('.hasSlider').find('.slider-message').removeClass('notDisp');

                      }
                   }
                  catch(error){
                    $(this).closest('.hasSlider').find('.slider-message').removeClass('notDisp');
                    console.log(error);
                  }
               }
              });

            } else {
                $(this).removeClass('hasSlider');

            }

        });
     };

    var showFilters = [];
    var load_filters = function(filters) {
         var sliders = [];
        _.each(filters, function(group){
            _.each(group['filters'], function(filter) {
                let selector = 'div.list-group-item__body[data-filter-attr-id="' +
                    filter['id'] + '"], ' + 'div.list-group-sub-item__body[data-filter-attr-id="' +
                    filter['id'] + '"]';
                $(selector).parents('.collection-list').collapse('show');

                $(selector).each(function(index, selEle) {
                    let attValueFoundInside = false;
                    if ($(selEle).children('.ui-slider').length > 0) {
                        attValueFoundInside = true;
                        let pushSliders = false;
                        let left_val = 0;
                        let right_val = 0;
                        if (filter['values'].indexOf('None')>-1) {
                            var ckbx=$(selEle).find('.noneBut').children('input:checkbox')[0];
                            ckbx.checked=true;
                            var parStr=$(selEle).children('.ui-slider').data('attr-par');
                            addNone(ckbx, parStr, false);
                            if (filter['values'].length>1){
                                pushSliders=true;
                                var ind = (filter['values'].indexOf('None')+1)%2
                                var vals=JSON.parse(filter['values'][ind]);
                                left_val=vals[0];
                                right_val=vals[1];
                            }
                        } else {
                            pushSliders=true;
                            left_val=filter['values'][0].indexOf(".") >= 0 ? parseFloat(filter['values'][0]) : parseInt(filter['values'][0]);
                            right_val=filter['values'][1].indexOf(".") >= 0 ? parseFloat(filter['values'][1]) : parseInt(filter['values'][1]);
                        }

                        if (pushSliders) {
                            sliders.push({
                                'id': $('div.list-group-item__body[data-filter-attr-id="' + filter['id'] + '"]').children('.ui-slider')[0].id,
                                'left_val': left_val,
                                'right_val': right_val,
                            });
                        }
                     } else {
                       _.each(filter['values'], function (val) {
                           if (filter.hasOwnProperty('op')) {
                               if($(selEle).find('.join_val').length>0) {
                                   $(selEle).find('.join_val').filter('input[value=' + filter['op'].toUpperCase() + ']').prop("checked", true);
                               } else {
                                   (filter['op'] !== 'OR' && filter['op'] !== 'BTW') && base.showJsMessage(
                                       "warning",
                                       "Invalid operator seen for attribute '"+$(selEle).attr('id')+"'; default of OR used instead.",
                                       true
                                   );
                               }
                           }
                           if ($(selEle).find('input[data-filter-attr-id="' + filter['id'] + '"][value="' + val + '"]').length>0) {
                               attValueFoundInside = true;
                           }
                           $('input[data-filter-attr-id="' + filter['id'] + '"][value="' + val + '"]').prop("checked", true);
                           checkFilters($('input[data-filter-attr-id="' + filter['id'] + '"][value="' + val + '"]'));
                      });
                  }
                if (attValueFoundInside){

                    /*$(selEle).collapse('show');
                    $(selEle).find('.show-more').triggerHandler('click');
                    $(selEle).parents('.tab-pane.search-set').length > 0 && $('a[href="#' +
                    $(selector).parents('.tab-pane.search-set')[0].id + '"]').tab('show');
                     */
                    showFilters.push([selEle,selector]);
                }
               });
            });
        });
        if (sliders.length > 0) {
            load_sliders(sliders, false);
        }
        mkFiltText();
        return updateFacetsData(true).promise();
     };

    var load_sliders = function(sliders, do_update) {
        _.each(sliders, function(slider) {
            var slider_id = slider['id'];
            var isInt = !FLOAT_SLIDERS.includes(slider_id.replace('_slide',''));
            setSlider(slider_id, false, slider['left_val'], slider['right_val'], isInt, false);
            //updatePlotBinsForSliders(slider_id);
        });

        if (do_update) {
            mkFiltText();
            updateFacetsData(true).promise();
        }
     };

    var ANONYMOUS_FILTERS = {};
    var ANONYMOUS_SLIDERS = {};

    var save_anonymous_selection_data = function() {
        let groups = [];

        // Get all checked filters
        let filters = [];

        // For collection list
        $('.collection-list').each(function() {
            let $group = $(this);
            let checkboxes = $group.find("input:checked").not(".hide-zeros").not(".sort_val");
            if (checkboxes.length > 0) {
                let values = [];
                let my_id = "";
                checkboxes.each(function() {
                    let $checkbox = $(this);
                    let my_value = $checkbox[0].value;
                    my_id = $checkbox.data('filter-attr-id');
                    values.push(my_value);
                });
                filters.push({
                    'id': my_id,
                    'values': values,
                });
            }
        });

        // For other list item groups
        $('.list-group-item__body').each(function() {
            let $group = $(this);
            let my_id = $group.data('filter-attr-id');
            if (my_id != null)
            {
                let checkboxes = $group.find("input:checked").not(".hide-zeros").not(".sort_val");
                if (checkboxes.length > 0)
                {
                    let values = [];
                    checkboxes.each(function() {
                        let $checkbox = $(this);
                        let my_value = $checkbox[0].value;
                        values.push(my_value);
                    });
                    filters.push({
                        'id': my_id,
                        'values': values,
                    });
                }
            }
        });

        groups.push({'filters': filters});
        var filterStr = JSON.stringify(groups);
        sessionStorage.setItem('anonymous_filters', filterStr);

        // Get all sliders with not default value
        var sliders = [];
        $('.ui-slider').each(function() {
            let $this = $(this);
            let slider_id = $this[0].id;
            let left_val = $this.slider("values", 0);
            let right_val = $this.slider("values", 1);
            let min = $this.slider("option", "min");
            let max = $this.slider("option", "max");
            if (left_val !== min || right_val !== max) {
                sliders.push({
                   'id': slider_id,
                    'left_val': left_val,
                    'right_val': right_val,
                });
            }
        });
        let sliderStr = JSON.stringify(sliders);
        sessionStorage.setItem('anonymous_sliders', sliderStr);
    };

    var load_anonymous_selection_data = function() {
        // Load anonymous filters from session storage and clear it, so it is not always there
        let filter_str = sessionStorage.getItem('anonymous_filters');
        ANONYMOUS_FILTERS = JSON.parse(filter_str);
        sessionStorage.removeItem('anonymous_filters');

        let slider_str = sessionStorage.getItem('anonymous_sliders');
        ANONYMOUS_SLIDERS = JSON.parse(slider_str);
        sessionStorage.removeItem('anonymous_sliders');
    };

    var load_filter_selections = function(selections) {
        _.each(selections,function(selectors){
            let selEle = selectors[0];
            let selector = selectors[1];
            $(selEle).collapse('show');
            $(selEle).parents('.tab-pane.search-set').length > 0 && $('a[href="#' + $(selector).parents('.tab-pane.search-set')[0].id + '"]').tab('show');
        });
    };

    $('#save-cohort-btn').on('click', function() {
        if (!user_is_auth) {
            save_anonymous_selection_data();
            location.href=$(this).data('uri');
        }
    });

    $('#sign-in-dropdown').on('click', function() {
        save_anonymous_selection_data();
    });

    cohort_loaded = false;
    function load_preset_filters() {
        let loadPending = null;
        if (is_cohort && !cohort_loaded) {
             loadPending = load_filters(cohort_filters);
             loadPending.done(function () {
                 console.debug("Load pending complete.");
                 cohort_loaded = true;
                 $('input[type="checkbox"]').prop("disabled", "disabled");
                 $('#projects_table').find('input:checkbox').removeAttr("disabled");
                 //$('.check-all').prop("disabled","disabled");
                 // Re-enable checkboxes for export manifest dialog, unless not using social login
                 $('#export-manifest-modal input').removeAttr('disabled');

                 $('input#hide-zeros').prop("disabled", "");
                 $('input#hide-zeros').prop("checked", true);
                 $('input#hide-zeros').each(function(){$(this).triggerHandler('change')});
                 $('div.ui-slider').siblings('button').prop("disabled", true);
                 $('.noneBut').find('input:checkbox').prop("disabled",true);
             });
         } else {
             // Anonymously selected filters have precedence over filters for load.
             // check for localStorage key of saved filters from a login
             load_anonymous_selection_data();
             let has_sliders = (ANONYMOUS_SLIDERS !== null && ANONYMOUS_SLIDERS.length > 0);
             let has_filters = (ANONYMOUS_FILTERS !== null && ANONYMOUS_FILTERS[0]['filters'].length > 0);

             if (!(has_filters || has_sliders)) {
                 // No anonymous filters seen--check for filter URI
                if (filters_for_load && Object.keys(filters_for_load).length > 0) {
                     loadPending = load_filters(filters_for_load);
                     loadPending.done(function () {
                         //console.debug("External filter load done.");
                     });
                 }
             } else {
                 if (has_sliders) {
                     loadPending = load_sliders(ANONYMOUS_SLIDERS, !has_filters);
                     if (loadPending) {
                        loadPending.done(function () {
                             //console.debug("Sliders loaded from anonymous login.");
                         });
                     }
                 }
                 if (has_filters) {
                     loadPending = load_filters(ANONYMOUS_FILTERS);
                     loadPending.done(function () {
                         //console.debug("Filters loaded from anonymous login.");
                     });
                 }
             }
         }
         if (loadPending) {
             loadPending.done(function() {
                 load_filter_selections(showFilters);
             });
         }
     }

    $('.fa-cog').on("click",function(){
         let srt = $(this).parent().parent().parent().find('.cntr')
         if (srt.hasClass('notDisp')) {
             srt.removeClass('notDisp');
         } else {
             srt.addClass('notDisp');
         }
         $(this).parent().parent().parent().find('.text-filter, .collection-text-filter').addClass('notDisp');
     });

    $('.fa-search').on("click",function(){
         //alert('hi');
         srch=$(this).parent().parent().parent().find('.text-filter, .collection-text-filter, .analysis-text-filter');

         if (srch.hasClass('notDisp')) {
             srch.removeClass('notDisp');
             srch[0].focus();
         } else {
             srch.addClass('notDisp');
         }
         $(this).parent().parent().parent().find('.cntr').addClass('notDisp');
    });

    const myObserver = new ResizeObserver(entries => {
         entries.forEach(entry => {
             htr = $('.vert').height();
             htsrch = $('.search-scope').height();
             ht = Math.max(2000,htr-htsrch+100);
             $('.search-con').css('max-height',ht+'px');
       });
     });
    myObserver.observe($('#rh_panel')[0]);
    myObserver.observe($('.search-scope')[0]);

    $(document).ajaxStart(function(){
        $('.spinner').show();
    });

    $(document).ajaxStop(function(){
        $('.spinner').hide();
    });


    updateViaHistory = function(){
        let history = JSON.parse(document.getElementById('history').textContent);
        if (history.hasOwnProperty('hz') && history['hz']){
            for (let ckey in history['hz']){
                if(history['hz'].hasOwnProperty(ckey)) {
                    if (history['hz'][ckey]) {
                        $('#'+ckey).find('.hide-zeros').click();
                    }
                }
            }
        }

        if (history.hasOwnProperty('sorter') && history['sorter']){
            for (let ckey in history['sorter']){
                if(history['sorter'].hasOwnProperty(ckey)) {
                    $('#'+ckey).find(':input').each(function(){
                        if ($(this).val() == history['sorter'][ckey]) {
                            $(this).click();
                        }
                    });
                }
            }
        }
    }

    initializeTableData = function() {
        window.selItems = new Object();
        window.selItems.selStudies = new Object();
        window.selItems.selCases = new Object();
        window.selItems.selProjects = new Array();

        window.casesTableCache = { "data":[], "recordLimit":-1, "datastrt":0, "dataend":0, "req": {"draw":0, "length":0, "start":0, "order":{"column":0, "dir":"asc"} }};
        window.studyTableCache = { "data":[], "recordLimit":-1, "datastrt":0, "dataend":0, "req": {"draw":0, "length":0, "start":0, "order":{"column":0, "dir":"asc"} }};
        window.seriesTableCache = { "data":[], "recordLimit":-1, "datastrt":0, "dataend":0, "req": {"draw":0, "length":0, "start":0, "order":{"column":0, "dir":"asc"} }};
    }
    initSort = function(sortVal){
        var sortdivs=$('body').find('.sorter')
        for (div in sortdivs){
            $(div).find(":input[value='" + sortVal + "']").click();
        }
    }


    $(document).ready(function () {
        initializeTableData();
        filterItemBindings('access_set');
        filterItemBindings('program_set');
        filterItemBindings('analysis_set');

        filterItemBindings('search_orig_set');
        filterItemBindings('search_derived_set');
        filterItemBindings('search_related_set');

        max = Math.ceil(parseInt($('#age_at_diagnosis').data('data-max')));
        min = Math.floor(parseInt($('#age_at_diagnosis').data('data-min')));
        
        //quantElem=['#SliceThickness', '#min_PixelSpacing', '#max_TotalPixelMatrixColumns', '#max_TotalPixelMatrixRows','#age_at_diagnosis']
        quantElem=['#SliceThickness', '#age_at_diagnosis']
        quantElem.forEach(function(elem){
            $(elem).addClass('isQuant');
            $(elem).addClass('wNone');
            $(elem).find('.text-filter').remove();
        });
        rngElem=['#min_PixelSpacing', '#max_TotalPixelMatrixColumns', '#max_TotalPixelMatrixRows',]
        rngElem.forEach(function(elem){
            $(elem).addClass('isRng');
        });

        $('#quantitative').find('.list-group-item__body').each(function() {
            $(this).addClass('isQuant');
            $(this).addClass('wNone');
            $(this).find('.text-filter').remove();
        });

        addSliders('search_orig_set',true, false,'');
        addSliders('tcga_clinical',true, false,'tcga_clinical.');
        addSliders('quantitative',true, false,'quantitative.');

        createPlots('search_orig_set');
        createPlots('search_derived_set');
        createPlots('tcga_clinical');

        updateProjectTable(window.collectionData);

        $('.clear-filters').on('click', function () {
            $('input:checkbox').not('#hide-zeros').not('.tbl-sel').prop('checked',false);
            $('input:checkbox').not('#hide-zeros').not('.tbl-sel').prop('indeterminate',false);
            $('.ui-slider').each(function(){
                setSlider(this.id,true,0,0,true, false);
            })
            $('#search_def_warn').hide();
            window.filterObj= {};

            mkFiltText();
            updateFacetsData(true);
            initializeTableData();
            /* updateProjectTable(window.collectionData);
            $('#cases_tab').DataTable().destroy();
            $('#studies_tab').DataTable().destroy();
            $('#series_tab').DataTable().destroy(); */
        });

        load_preset_filters();

        $('.hide-filter-uri').on('click',function() {
            $(this).hide();
            $('.get-filter-uri').show();
            $('.copy-url').hide();
            $('.filter-url').hide();
            $('.filter-url').addClass("is-hidden");
        });

        $('.get-filter-uri').on('click',function(){
            $(this).hide();
            $('.hide-filter-uri').show();
            $('.copy-url').show();
            $('.filter-url').show();
            $('.filter-url').removeClass("is-hidden");
        });

        $('.filter-url-container').append(
            $('<div>')
                .addClass('alert alert-warning alert-dismissible url-too-long')
                .html(
                    "Your query's URL exceeds the maximum length allowed (2048 characters). "
                    + "You will need to select fewer filters or the URL will not properly load when used."
                )
                .prepend(
                    '<button type="button" class="close" data-hide="alert"><span aria-hidden="true">'
                    +'&times;</span><span class="sr-only">Close</span></button>'
                ).attr("style","display: none;")
        );

        /*
        $(window).on("beforeunload",function(){
            console.log("beforeunload called");
            let hs = new Object();
            hs['hz'] = new Object();
            hs['sorter'] = new Object();
            $('body').find('.hide-zeros').each(function(){
                let pfar = $(this).closest('.collection-list, .search-configuration, #analysis_set ');
                let pid = pfar[0].id;
                let checked = pfar.find('.hide-zeros')[0].checked;
                hs['hz'][pid] = checked;
            });

            $('body').find('.sorter').each(function(){
                let pfar = $(this).closest('.collection-list, .list-group-item__body ');
                let pid = pfar[0].id;
                let sort = $(this).find('input:checked').val()
                hs['sorter'][pid] = sort;
            });



            let url = encodeURI('/uihist/')
            let nhs = {'his':JSON.stringify(hs)}
            let csrftoken = $.getCookie('csrftoken');
            let deferred = $.Deferred();

            $.ajax({
                url: url,
                data: nhs,
                dataType: 'json',
                type: 'post',
                contentType: 'application/x-www-form-urlencoded',
                beforeSend: function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                success: function (data) {
                },
                error: function(data){
                    console.debug('Error saving ui preferences.');
                },
                complete: function(data) {
                    deferred.resolve();
                }
            });
        });


        initSort('num');
        if (document.contains(document.getElementById('history'))){
            //updateViaHistory();
        }
        */
    });
});
