
require.config({
    baseUrl: STATIC_FILES_URL + 'js/',
    paths: {
        jquery: 'libs/jquery-3.5.1',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        jquerydt: 'libs/jquery.dataTables.min',
        //d3: 'libs/d3.v5.min',
        base: 'base',
        underscore: 'libs/underscore-min'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'jquerydt': ['jquery']
    }
});


require([
    'jquery',
    'underscore',
    'jquerydt',
    'jqueryui',
    'bootstrap',
    'base'
], function($, _, jqueryui, bootstrap, jquerydt ) {

    $('.manifest-size-warning').hide();

    window.filterObj = {};
    window.projIdSel = [];
    window.studyIdSel = [];
    //window.tcgaColls = ["tcga_blca", "tcga_brca", "tcga_cesc", "tcga_coad", "tcga_esca", "tcga_gbm", "tcga_hnsc", "tcga_kich", "tcga_kirc", "tcga_kirp", "tcga_lgg", "tcga_lihc", "tcga_luad", "tcga_lusc", "tcga_ov", "tcga_prad", "tcga_read", "tcga_sarc", "tcga_stad", "tcga_thca", "tcga_ucec"];
    window.projSets = new Object();
    window.projSets['tcga']=["tcga_blca", "tcga_brca", "tcga_cesc", "tcga_coad", "tcga_esca", "tcga_gbm", "tcga_hnsc", "tcga_kich", "tcga_kirc", "tcga_kirp", "tcga_lgg", "tcga_lihc", "tcga_luad", "tcga_lusc", "tcga_ov", "tcga_prad", "tcga_read", "tcga_sarc", "tcga_stad", "tcga_thca", "tcga_ucec"];
    window.projSets['rider']=["rider_lung_ct", "rider_phantom_pet_ct","rider_breast_mri", "rider_neuro_mri","rider_phantom_mri", "rider_lung_pet_ct"];
    window.projSets['qin'] = ["qin_headneck","qin_lung_ct","qin_pet_phantom","qin_breast_dce_mri"];

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
             parStr=$('#'+slideDiv).data("attr-par");
             if (parStr.startsWith('tcga_clinical') && !(reset)){
                checkTcga();
            }
            //var slideDiv = divName + "_slide";
            var max = $('#' + slideDiv).slider("option", "max");

            var divName = slideDiv.replace("_slide","");

            if (reset) {
                strt = $('#' + slideDiv).parent().attr('data-min');
                end = $('#' + slideDiv).parent().attr('data-max');
                if ( ($('#' + slideDiv).parent().find('.noneBut').length===0 ) ||  ( !($('#' + slideDiv).parent().find('.noneBut').find(':input')[0].checked)) ){
                    $('#' + slideDiv).parent().removeClass('isActive');
                }
            }
            else{
                $('#' + slideDiv).parent().addClass('isActive');
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
            //var inpDiv = divName + "_input";
            var val = String(strt) + "-" + String(end);

            // $("#inp_age_slide").value="0-120";
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
                    if ( 'none' in window.filterObj[filtAtt]){
                        window.filterObj[filtAtt]['type']='none';
                    }
                    else{
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
                //$(this).find('.slide_tooltip').text( ui.values[index].toString() );
                if (!(filtAtt in window.filterObj)){
                    window.filterObj[filtAtt] = new Object();
                }
                window.filterObj[filtAtt]['rng'] = attVal;
                if (end<max) {
                    window.filterObj[filtAtt]['type'] = 'ebtw';
                }
                else{
                    window.filterObj[filtAtt]['type'] = 'ebtwe';
                }
            }

            if (updateNow) {
                //updatePlotBinsForSliders(slideDiv);
                mkFiltText();
                updateFacetsData(true);
            }
        };

// Show more/less links on categories with >6 fiilters

         var mkFiltText = function () {
            var hasTcga = false;
            var tcgaColSelected = false;
            if ((window.filterObj.hasOwnProperty('Program')) && (window.filterObj.Program.indexOf('TCGA')>-1)){
                tcgaColSelected = true;
                $('#tcga_clinical_heading').children('a').removeClass('disabled');
             } else{
                $('#tcga_clinical_heading').children('a').addClass('disabled');
                if (!($('#tcga_clinical_heading').children('a')).hasClass('collapsed')){
                    $('#tcga_clinical_heading').children('a').click();
                }
            }

            var curKeys = Object.keys(filterObj).sort();
            oStringA = new Array();
            var collection = new Array();

            for (i = 0; i < curKeys.length; i++) {
                var addKey = true;
                var curKey = curKeys[i];
                /* if ((curKey === 'collection_id') && (filterObj[curKey] === tcgaColls)) {
                    continue;
                } */
                if (curKey.startsWith('Program')) {
                    curArr = filterObj[curKey];
                    for (var j = 0; j < curArr.length; j++) {
                        if (!(('Program.' + curArr[j]) in filterObj)) {
                            var colName=$('#'+curArr[j]).filter('.collection_name')[0].innerText;
                            collection.push(colName);
                        }
                    }
                } else if (curKey.endsWith('_rng')) {
                    var realKey = curKey.substring(0, curKey.length - 4).split('.').pop();
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
                            fStr += filterObj[curKey]['rng'][0].toString() + '-' + (filterObj[curKey]['rng'][1]).toString();
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
                } else {
                    var realKey = curKey.split('.').pop();

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
                        nstr += 'IN (' + oArray.join("") + ')';
                        oStringA.push(nstr);

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

            if (oStringA.length > 0) {
                var oString = oStringA.join(" AND");
                document.getElementById("search_def").innerHTML = '<p>' + oString + '</p>';
                 document.getElementById('filt_txt').value=oString;
            } else {
                document.getElementById("search_def").innerHTML = '<span class="placeholder">&nbsp;</span>';
                 document.getElementById('filt_txt').value="";
            }



            //alert(oString);
        };

        var mkFiltTextAlt = function () {

            var curKeys = Object.keys(filterObj).sort();
            outStr="";
            oStringA = new Array();
            oStringClinA = new Array();
             var collection = new Array();
             var collectionTcga = new Array();
            for (i = 0; i < curKeys.length; i++) {

                var curKey = curKeys[i];
                /* if ((curKey === 'collection_id') && (filterObj[curKey] === tcgaColls)) {
                    continue;
                } */
                if (curKey.startsWith('Program')){
                    var hasCollection = true;
                     curArr= filterObj[curKey];
                     for (var j=0;j<curArr.length;j++){
                         if ( ! ( ('Program.'+curArr[j]) in filterObj)){
                             if ( (curArr[j]==='tcga') || (curArr[j].startsWith('tcga_'))){
                                 collectionTcga.push(curArr[j]);
                             }
                             else{
                               collection.push(curArr[j]);
                             }

                         }
                     }
                }
                else{
                     if (curKey.endsWith('_rng')) {
                        var realKey=curKey.substring(0, curKey.length-4).split('.').pop();
                        var disp = $('#'+realKey+'_heading').children()[0].innerText;
                        var fStr='';
                        if ('rng' in filterObj[curKey]){
                            fStr += filterObj[curKey]['rng'][0].toString()+'-'+(filterObj[curKey]['rng'][1] + 1).toString();
                        }
                        if (('rng' in filterObj[curKey]) && ('none' in filterObj[curKey])){
                            fStr+=', ';
                        }
                        if ('none' in filterObj[curKey]){
                            fStr+='None';
                        }


                        var nstr = '<span class="filter-type">'+disp+'</span> IN (<span class="filter-att">' + fStr + '</span>)';

                    } else {
                        var realKey = curKey.split('.').pop()
                        var disp = $('#' + realKey + '_heading').children()[0].innerText;

                        var valueSpans = $('#' + realKey + '_list').children().children().children('input:checked').siblings('.value');
                        oVals = new Array();
                        valueSpans.each(function () {
                            oVals.push($(this).text())
                        });

                        var oArray = oVals.sort().map(item => '<span class="filter-att">' + item.toString() + '</span>');


                        //var nstr=disp+": "
                        //nstr += oArray.join(", &ensp; ");
                        nstr = '<span class="filter-type">' + disp + '</span>';
                        nstr += 'IN (' + oArray.join("") + ')';
                    }

                    if (curKey.startsWith('tcga_clinical')) {
                        oStringClinA.push(nstr);
                    }
                    else{
                        oStringA.push(nstr);
                    }
                }
            }

             if (oStringClinA.length>0){
                 if ((collection.length ==0) && (collectionTcga.length ===0)){
                    collection=['ispy1','lidc_idri','qin_headneck'];
                    collectionTcga=['tcga_blca','tcga_brca','tcga_cesc','tcga_coad','tcga_esca','tcga_gbm','tcga_hnsc','tcga_kich','tcga_kirc','tcga_kirp','tcga_lgg','tcga_lihc','tcga_luad','tcga_lusc','tcga_ov','tcga_prad','tcga_read','tcga_sarc','tcga_stad','tcga_thca','tcga_ucec'];
                }


            }
            else{
                collection=collection.concat(collectionTcga).sort();
                collectionTcga=[];
            }



            if ( (collection.length>0) && (collectionTcga.length>0) && (oStringA.length>0)){
                outStr="{"
            }
            if (collection.length>0){
                var oArray = collection.sort().map(item => '<span class="filter-att">' + item.toString() + '</span>');
                nstr = '<span class="filter-type">Collection</span>';
                nstr += 'IN (' + oArray.join("") + ')';
                outStr+=nstr;
            }
            if (collection.length>0 && collectionTcga.length>0){
                outStr+=" OR (";
            }
            if (collectionTcga.length>0){
                var oArray = collectionTcga.sort().map(item => '<span class="filter-att">' + item.toString() + '</span>');
                nstr = '<span class="filter-type">Collection</span>';
                nstr += 'IN (' + oArray.join("") + ')';
                outStr+=nstr+" AND ";
                outStr+=oStringClinA.join(" AND ")

            }

            if (collection.length>0 && collectionTcga.length>0){
                outStr+=")";

            }
            if ( (collection.length>0) && (collectionTcga.length>0) && (oStringA.length>0)){
                outStr+="}";
            }

            if ((collection.length>0 || collectionTcga.length>0) && (oStringA.length > 0)){
                outStr+=" AND ";
            }


            if (oStringA.length > 0) {
                var oString = oStringA.join(" AND");
                outStr+=oString;

            }
            document.getElementById("search_def").innerHTML = '<p>' + outStr + '</p>';
            //else {
            //    document.getElementById("search_def").innerHTML = '<span class="placeholder">&nbsp;</span>';
            //}

            //alert(oString);
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

        window.showMoreGraphs = function (graphClass, height) {
            $('.'+graphClass).parent().find('.more-graphs').hide();
            $('.'+graphClass).parent().find('.less-graphs').show();
            $('.'+graphClass).animate({height: height}, 800);
        };

        window.showLessGraphs = function (graphClass, height) {
            $('.'+graphClass).parent().find('.less-graphs').hide();
            $('.'+graphClass).parent().find('.more-graphs').show();
            $('.'+graphClass).animate({height: height}, 800);
        };

        window.addNone = function(elem, parStr, updateNow)
        {
            var id = parStr+$(elem).parent().parent()[0].id+"_rng";

            if (elem.checked){
                if (!(id in window.filterObj)) {
                    window.filterObj[id] = new Array();
                    window.filterObj[id]['type']='none';
                }
                window.filterObj[id]['none'] = true;
                $(elem).parent().parent().addClass('isActive');
            }

            else{
                if ((id in window.filterObj) && ('none' in window.filterObj[id])){
                    delete window.filterObj[id]['none'];
                    if (!('rng' in window.filterObj[id])){
                        delete window.filterObj[id];
                        $(elem).parent().parent().removeClass('isActive');
                    }
                }
            }

            if (parStr.startsWith('tcga_clinical')){
                checkTcga();
            }
            var slideNm = $(elem).parent()[0].id+"_slide";
            //updatePlotBinsForSliders(slideNm);
            mkFiltText();

            if (updateNow) {
                updateFacetsData(true);
            }
        }

        var updatePlotBinsForSliders =  function(slideName){
            var inpName = slideName.replace("_slide","_input")
            var listName =  slideName.replace("_slide","_list");

            var val = $('#' + inpName)[0].value;
            var valArr = val.split('-');
            var strtInd = parseInt(valArr[0]);
            var endInd = parseInt(valArr[1])-1;

            var wNone = false;
            if ( ($('#'+slideName).parent().children("input:checkbox").length>0) ){
                wNone = $('#'+slideName).parent().children("input:checkbox").prop('checked');
            }
            var i=0;

            $('#'+listName).find('.value').each(function(){
                 val = this.innerHTML;
                 var plotThis = false;
                 if (val.includes(' To ')){
                     valArr = val.split(' To ');
                     for (i =0; i<2; i++){
                         if (!(valArr[i]==='*')){
                             valArr[i]=parseInt(valArr[i]);
                         }

                     }
                     /* if ( ((valArr[0]==='*') || (endInd>= valArr[0])) && ((valArr[1]==='*') || (strtInd< valArr[1])) ){
                         $(this).parent().children('.plot_count').addClass('plotit');
                     }
                     else{
                         $(this).parent().children('.plot_count').removeClass('plotit');
                     } */
                 }
                 else if (val.includes('None')){
                     if (wNone){
                         $(this).parent().children('.plot_count').addClass('plotit');
                     }
                     else{
                         $(this).parent().children('.plot_count').removeClass('plotit');
                     }
                 }
            });
        }

        var mkSlider = function (divName, min, max, step, isInt, wNone, parStr, attr_id, attr_name, lower, upper, isActive,checked) {
            $('#'+divName).addClass('hasSlider');
            if (isActive){
                $('#'+divName).addClass('isActive');
            }

            var tooltipL = $('<div class="slide_tooltip tooltipL slide_tooltipT" />').text('stuff').css({
               position: 'absolute',
               top: -25,
               left: -5,
                });

             var tooltipR = $('<div class="slide_tooltip slide_tooltipB tooltipR" />').text('stuff').css({
               position: 'absolute',
               top: 20,
               right: -5,
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
            if ($('#'+divName).find('.reset').length===0){
                $('#' + divName).append(  '<button class="reset" style="display:block;margin-top:18px" onclick=\'setSlider("' + slideName + '",true,0,0,' + String(isInt) + ', true,"'+parStr+'")\'>Clear Slider</button>');
            }

             $('#'+slideName).append(labelMin);

             if (wNone){
                $('#' + divName).append( '<span class="noneBut"><input type="checkbox"   onchange="addNone(this, \''+parStr+'\', true)"> None </span>');
                $('#' + divName).find('.noneBut').find(':input')[0].checked = checked

             }


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
                        else{
                            $(this).text(upper.toString());
                        }
                   });

             $('#'+slideName).attr('min',min);
            $('#'+slideName).attr('max',max);


            $('#' + slideName).data("filter-attr-id",attr_id);
            $('#' + slideName).data("filter-display-attr",attr_name);

            $('#'+slideName).append(labelMax);


            $('#'+ divName+'_list').addClass('hide');
            $('#'+ divName).find('.more-checks').addClass('hide');
            $('#'+ divName).find('.less-checks').addClass('hide');
            $('#'+ divName).find('.hide-zeros').addClass('hide');
        };

        var editProjectsTableAfterFilter = function (tableId, collFilt, collectionsData) {
            //var selectedElem = document.getElementById(scopeId).selectedOptions[0];
            //var project_scope = selectedElem.value;
            //var curCount = collection[project_scope];
            var tableElem = document.getElementById(tableId);
            var tableRows = $(tableElem).find('tr');
            for (var i = 0; i < tableRows.length; i++) {
                var curRow = $(tableRows)[i];
                var projId = curRow.id.replace('project_row_', '');
                var newTot = 0;
                if (projId in collectionsData){
                        newTot = collectionsData[projId]['count'];
                }
                //var newTot = String(window.collection[projId]);
                var newCohortCol = 'patient_col_' + String(projId);
                document.getElementById(newCohortCol).innerHTML = newTot;
                var patientElemId = 'patient_col_' + projId;
                document.getElementById(patientElemId).innerHTML =  String(newTot);

                if ( (newTot> 0) && ((collFilt.length ===0) || (collFilt.indexOf(projId) >-1)) ) {
                    curRow.classList.remove('hide');

                } else {
                    var projIndex = window.selItems.selProjects.indexOf(projId);
                    if (projIndex !==-1) window.selItems.selProjects.splice(projIndex,1);
                    if (window.selItems.selCases.hasOwnProperty(projId)) {
                           selCases= window.selItems.selCases[projId];
                           for (j=0;j<selCases.length;j++){
                               var selCase = selCases[j];
                               delete window.selItems.selStudies[selCase];
                           }

                        delete window.selItems.selCases[projId];
                    }
                    curRow.classList.add('hide');
                    curRow.classList.remove("selected_grey");

                }
            }
            window.resetTableControls($('#projects_table'), true, 0);
        };

        window.createProjectsTable = function (tableId) {
            tableElem = document.getElementById(tableId);
            //var newInnerHTML='<tr><th>Project Name</th><th>Total # of Patients</th><th># of Patients(this cohort)</th></tr>';
            var newInnerHTML = '';
            //projectH = Object.keys(originalDataCounts.collection_id).sort();
            //projectH = tcgaColls;
            nonePos = projectH.indexOf('None');
            /* if (nonePos > -1) {
                projectH.splice(nonePos, 1);
            }*/

            for (i = 0; i < projectH.length; i++) {
                var idStr = projectH[i];
                var patientIdStr = 'patient_col_' + idStr;
                if (originalDataCounts.collection_id.hasOwnProperty(idStr)) {
                    var numPatientsStr = originalDataCounts.collection_id[idStr].toString();
                } else {
                    var numPatientsStr = "0";
                }
                var description = 'NA';
                var newProjectRow = '<tr id="project_row_' + idStr + '" class="text_head" onclick="(toggleRows(this, \'projects\', \'project_row_\', false))"><td>' + idStr + '</td><td>' + numPatientsStr + '</td><td id="' + patientIdStr + '" class="projects_table_num_cohort">' + numPatientsStr + '</td> </tr>';
                newInnerHTML += newProjectRow;

            }
            tableElem.innerHTML = newInnerHTML;
        };

        var resetCasesAndStudiesAndSeriesTables = function (caseId, studyId, seriesId) {

            tableElem = document.getElementById(caseId);
            //var newInnerHTML = '<tr><th>Project Name</th><th>Patient Id</th><th>Study Id</th><th>Study Description</th></tr>';
            tableElem.innerHTML = '';
            window.resetTableControls ($('#'+caseId), false, 0);

            tableElem = document.getElementById(studyId);
            //var newInnerHTML = '<tr><th>Project Name</th><th>Patient Id</th><th>Study Id</th><th>Study Description</th></tr>';
            tableElem.innerHTML = '';
            window.resetTableControls ($('#'+studyId), false, 0);

            tableElem = document.getElementById(seriesId);
            //var newInnerHTML = '<tr> <th>Study Id</th><th>Series Id</th><th>Modality</th><th>Body Part Examined</th> </tr>';
            tableElem.innerHTML = '';
            window.resetTableControls ($('#'+seriesId), false, 0);
        }

        var clearStagingMultiSel = function(){
            $('body').find('tr').removeClass('multiSel')
        }


        getSelRows = function(row){
            table = $(row).parent().parent();
            ck = $(row).find('input:checkbox').is(':checked');
            numPerPg= parseInt(table.parent().find('.files-per-page-select').data('fpp'));
            curPg= parseInt(table.parent().find('.dataTables_goto_page').data('curpage'));
            fInd=numPerPg*(curPg-1);
            lInd=fInd+numPerPg-1;

            return [fInd, lInd];
        }

        window.toggleRows = function (row, type,prefix,justClickedPlus) {

            var justClickedIndex=-1;
            var selRows = new Array();
            var addRow= true;
            var justAddedRows = new Array();

            if ($(row).parent().is('thead')){
                selRows= getSelRows(row);
                addRow = justClickedPlus;
            }

            else{
                selRows=[$(row).index(),$(row).index()];
                justClickedIndex=selRows[0];
                addRow = $(row).find('input:checkbox').is(':checked');
            }


            selRows=$(row).parent().parent().children('tbody').children().slice(selRows[0],selRows[1]+1);
            $(row).parent().children().removeClass('multiSel');
            var curArr = new Array();
            var projArr =  new Array();
            var selDic = new Object();
            var caseArr =  new Array();
            var studyArr =  new Array();

            var numArr=0;

            $(selRows).each( function(index){
                var thisInd = $(this).index();
                var curId = $(this)[0].id.substring(prefix.length);
                if (type==='studies'){
                    curId=curId.replaceAll('-','.');
                }

                if  ( addRow  &&  ((thisInd ===justClickedIndex) || !($(this).find('input:checkbox')[0]).checked )) {
                    $(this).addClass('tryToAdd')
                    if (!(thisInd ===justClickedIndex) ) {
                        $(this).find('input:checkbox')[0].checked=true;
                    }
                    curArr.push(curId);
                    numArr+= parseInt($(this).find('.projects_table_num_cohort, .numrows')[0].innerHTML);
                    if (type==='cases') {
                        var projectId = $(this).attr('data-projectid');
                        if (!(projectId in selDic)){
                            projArr.push(projectId);
                            selDic[projectId]= new Array();
                        }
                        selDic[projectId].push(curId);
                    }

                    else if (type==='studies'){
                        var projectId =$(this).attr('data-projectid');
                        if (projArr.indexOf(projectId)<0){
                            projArr.push(projectId);
                        }
                        var caseId= $(this).find(".case-id").text();
                        if (!(caseId in selDic)){
                            caseArr.push(caseId);
                            selDic[caseId]= new Array();
                        }
                        selDic[caseId].push(curId);

                    }


                }
                else if ( !addRow &&  ((thisInd ===justClickedIndex) || ($(this).find('input:checkbox')[0].checked) )) {

                    if (!(thisInd ===justClickedIndex) ) {
                        $(this).find('input:checkbox')[0].checked=false;
                    }


                    if (type === 'projects') {
                        removeCasesAndStudiesAndSeries(curId, "cases_table", "studies_table", "series_table");
                    }
                    else if (type ==='cases') {
                        var projectId = $(row).find(".project-name").text();
                        removeStudiesAndSeries(curId, "case", "studies_table", "series_table", projectId);
                    }
                    else if (type ==='studies'){
                        var caseId= $(row).find(".case-id").text();
                        if ((window.selItems.selStudies.hasOwnProperty(caseId)) && (window.selItems.selStudies[caseId].indexOf(curId) >-1) ){
                            var ind=window.selItems.selStudies[caseId].indexOf(curId);
                            window.selItems.selStudies[caseId].splice(ind);
                            if (window.selItems.selStudies[caseId].length===0){
                                delete window.selItems.selStudies[caseId];
                            }
                        }
                        removeRowsFromTable("series_table", curId, 'study');
                    }

                }

            })
            if (addRow){
                if (numArr <= 3000){
                    $(selRows).removeClass('tryToAdd');
                    if (type ==='projects') {
                        addCases(curArr, "cases_table", false);
                    }
                    if (type==='cases'){
                        addStudyOrSeries(projArr, curArr,[], 'studies_table', false, selDic, false);
                    }
                    if (type==='studies'){
                        addStudyOrSeries(projArr, caseArr, curArr, 'series_table', false, selDic, true);
                    }

                }
                else{
                    $(selRows).filter('.tryToAdd').find('input:checkbox').each(function(){
                        this.checked=false;
                    });
                    alert('Sorry only 3000 or less rows can be fetched at once. You have selected '+numArr.toString()+' rows.')
                    $(selRows).removeClass('.tryToAdd');
                }
            }
        }

        window.clearAllSeries = function (seriesTableId) {
            $('#' + seriesTableId).find('tr').remove();
            resetTableControls($('#' + seriesTableId), true, 0);
        };

        window.clearAllStudiesAndSeries = function (studyTableId, seriesTableId) {
            $('#' + studyTableId).find('tr').remove();
            resetTableControls($('#' + studyTableId), true, 0);
            window.clearAllSeries(seriesTableId);
        };

        window.clearAllCasesAndStudiesAndSeries = function (caseTableId,studyTableId, seriesTableId) {
            $('#' + caseTableId).find('tr').remove();
            resetTableControls($('#' + caseTableId), true, 0);
            window.clearAllStudiesAndSeries(studyTableId,seriesTableId);
        };



        removeRowsFromTable = function(tableId,selId,selType){
            var table = document.getElementById(tableId);
            var scrollPos = table.scrollTop+table.offsetTop;
            if (selType ==='study'){
                selId=selId.replaceAll('.','-');
            }
            var remainingTrs = $('#' + tableId).find('tr').not('.'+selType+'_' + selId);
            var newScrollInd = Array.from(remainingTrs.map(function () {
                return ((this.offsetTop <= scrollPos) ? 0 : 1)
            })).indexOf(1);
            /*
            if (newScrollInd > 0) {
                var scrollB = remainingTrs.get(newScrollInd - 1).offsetTop;
                var scrollF = remainingTrs.get(newScrollInd).offsetTop;

                if ((scrollPos - scrollB) < (scrollF - scrollPos)) {
                    var newScrollInd = newScrollInd + 1;
                }
            }

             */

            $('#' + tableId).find('.'+selType+'_' + selId).remove();
            resetTableControls($('#' + tableId), true, newScrollInd)

        }

        window.removeCasesAndStudiesAndSeries = function (projectId, caseTableId,studyTableId, seriesTableId) {
            removeRowsFromTable(caseTableId, projectId, 'project');
            projPos = window.selItems.selProjects.indexOf(projectId)
            if (projPos > -1) {
                window.selItems.selProjects.splice(projPos, 1);
            }

            if (projectId in window.selItems.selCases) {
                var selCases = window.selItems.selCases[projectId];
                    for (var i=0;i<selCases.length;i++){
                        var selCase = selCases[i];
                        if (selCase in window.selItems.selStudies){
                            delete window.selItems.selStudies[selCase];
                        }
                    }
                    delete window.selItems.selCases[projectId];
                }

             removeStudiesAndSeries(projectId,'project', studyTableId, seriesTableId, projectId);

        }

        window.removeStudiesAndSeries = function (selId, selType, studyTableId, seriesTableId, projectId) {
            //var pclass = "project_" + projectId;
            removeRowsFromTable(studyTableId, selId, selType)
            if ((selType==="case") && (window.selItems.selStudies.hasOwnProperty(selId))){
                delete window.selItems.selStudies[selId];
            }
            if ( (window.selItems.selCases.hasOwnProperty(projectId)) && (window.selItems.selCases[projectId].indexOf(selId)>-1) ){
                   var ind = window.selItems.selCases[projectId].indexOf(selId);
                   window.selItems.selCases[projectId].splice(ind);
                   if (window.selItems.selCases[projectId].length===0){
                       delete window.selItems.selCases[projectId];
                   }
            }

            removeRowsFromTable(seriesTableId,selId,selType);
        }

        window.removeSeries = function (selClass, seriesTableId) {
            var scrollPos = document.getElementById(seriesTableId).scrollTop;
            var remainingTrs = $('#' + seriesTableId).find('tr').not('.' + selClass);
            var newScrollInd = Array.from(remainingTrs.map(function () {
                return ((this.offsetTop <= scrollPos) ? 0 : 1)
            })).indexOf(1);
            if (newScrollInd > 0) {
                var scrollB = remainingTrs.get(newScrollInd - 1).offsetTop;
                var scrollF = remainingTrs.get(newScrollInd).offsetTop;

                if ((scrollPos - scrollB) < (scrollF - scrollPos)) {
                    var newScrollInd = newScrollInd + 1;
                }
            }

            $('#' + seriesTableId).find('.' + selClass).remove();
            resetTableControls($('#' + seriesTableId), true, newScrollInd)
        }

        window.addCases = function(projectIdArr, casetableId, refreshAfterFilter){

            changeAjax(true);
            var curSelCasesDic = new Object();
            var newSelCases = new Object();

            if (refreshAfterFilter) {
                for (projectId in window.selItems.selCases) {
                    curSelCasesDic[projectId] = new Object();
                    for (var i = 0; i < window.selItems.selCases[projectId].length; i++) {
                        var curCase = window.selItems.selCases[projectId][i];
                        curSelCasesDic[projectId][curCase] = 1;
                    }
                }
            }
            else {
                for (i in projectIdArr) {
                    window.selItems.selProjects.push(projectIdArr[i]);
                }
            }
            curFilterObj = JSON.parse(JSON.stringify(parseFilterObj()));
            curFilterObj.collection_id = projectIdArr;

            var filterStr = JSON.stringify(curFilterObj);
            var fields = ["collection_id", "PatientID","StudyInstanceUID","SeriesInstanceUID"];
            var collapse_on = 'PatientID'
            var order_docs = ["collection_id", "PatientID"];
            var orderDocStr = JSON.stringify(order_docs);
            var fieldStr = JSON.stringify(fields);
            //var sortOnStr = JSON.stringify(sort_on);
            var uniques = JSON.stringify(["PatientID","StudyInstanceUID","SeriesInstanceUID"]);
            let url = '/explore/'
            url = encodeURI(url);
            ndic= {'counts_only':'False', 'is_json':'True', 'with_clinical':'True', 'collapse_on':collapse_on, 'filters':filterStr, 'fields':fieldStr, 'order_docs':orderDocStr, 'uniques':uniques}
                //?counts_only=False&is_json=True&with_clinical=True&collapse_on=' + collapse_on + '&filters=' + filterStr + '&fields=' + fieldStr + '&order_docs=' + orderDocStr+'&uniques='+uniques;
            if (typeof(window.csr) !=='undefined'){
                ndic['csrfmiddlewaretoken'] = window.csr
            }

            $.ajax({
                url: url,
                dataType: 'json',
                type: 'post',
                data: ndic,
                contentType: 'application/x-www-form-urlencoded',
                success: function (data) {

                    studyDic = new Object();
                    if (data.hasOwnProperty('uniques') && data['uniques'].hasOwnProperty('StudyInstanceUID') && data['uniques']['StudyInstanceUID']['buckets']){
                        for (i=0;i<data['uniques']['StudyInstanceUID']['buckets'].length;i++){
                            curSet= data['uniques']['StudyInstanceUID']['buckets'][i];
                            if (curSet.hasOwnProperty('val') && curSet.hasOwnProperty('unique_count')){
                                studyDic[curSet['val']]=curSet['unique_count']
                            }
                        }

                    }
                    seriesDic = new Object();
                    if (data.hasOwnProperty('uniques') && data['uniques'].hasOwnProperty('SeriesInstanceUID') && data['uniques']['SeriesInstanceUID']['buckets']){
                        for (i=0;i<data['uniques']['SeriesInstanceUID']['buckets'].length;i++){
                            curSet= data['uniques']['SeriesInstanceUID']['buckets'][i];
                            if (curSet.hasOwnProperty('val') && curSet.hasOwnProperty('unique_count')){
                                seriesDic[curSet['val']]=curSet['unique_count']
                            }
                        }

                    }

                    for (i = 0; i < data['origin_set']['docs'].length; i++) {
                        var curData = data['origin_set']['docs'][i];
                        var projectId = curData.collection_id;
                        var projectNm = $('#'+projectId).filter('.collection_name')[0].innerText;
                        var patientId = curData.PatientID;
                        var numStudy=0;
                        if (studyDic.hasOwnProperty(patientId)){
                            numStudy=studyDic[patientId];
                        }
                        var numSeries=0;
                        if (seriesDic.hasOwnProperty(patientId)){
                            numSeries=seriesDic[patientId];
                        }


                        var pclass = 'project_' + projectId;
                        var newHtml = '';
                        var rowId = 'case_' + patientId.replace(/\./g, '-');

                        newHtml = '<tr id="' + rowId + '" data-projectid="' + projectId + '" class="' + pclass + ' text_head" >' +
                                   '<td class="ckbx"><input type="checkbox" onclick="(toggleRows($(this).parent().parent(), \'cases\', \'case_\', false))"></td>'+
                                   '<td class="col1 project-name">' + projectNm + '</td>' +
                                    '<td class="col1 case-id">' + patientId +'</td>' +
                                    '<td class="col1 numrows">' + numStudy.toString() + '</td>' +
                                    '<td class="col1 ">' + numSeries.toString() + '</td>' +
                                    '</tr>';



                        $('#' + casetableId).append(newHtml);

                        if (refreshAfterFilter && (curSelCasesDic.hasOwnProperty(projectId)) && (curSelCasesDic[projectId].hasOwnProperty(patientId)) ){
                            $('#' + casetableId).find('#'+rowId).addClass("selected_grey");
                            if ( !(newSelCases.hasOwnProperty(projectId))){
                                newSelCases[projectId] = new Array();
                            }
                           newSelCases[projectId].push(patientId);
                        }

                    }

                    changeAjax(false);
                    resetTableControls($('#' + casetableId), false, 0);

                    if (refreshAfterFilter){
                        window.selItems.selCases = newSelCases;
                        var caseArr = new Array();
                        for (projId in window.selItems.selCases) {
                        caseArr.push.apply(caseArr, window.selItems.selCases[projId]);
                        }
                        if (caseArr.length > 0) {
                              addStudyOrSeries(window.selItems.selProjects, caseArr,[], "studies_table", true, {},false);
                        }
                    }


                },
                error: function () {
                    changeAjax(false);
                    console.log("problem getting data");
                }
            });

        }

        addToSelItems = function(selDic, cat){
            for (item in selDic){
                if (!(item in window.selItems[cat])){
                    window.selItems[cat][item]= new Array();
                }
                for (var i=0;i<selDic[item].length;i++) {
                    var id = selDic[item][i];

                    if (window.selItems[cat][item].indexOf(id)<0){
                        window.selItems[cat][item].push(id);
                    }
                }
                window.selItems[cat][item].sort();
            }
        }

        window.addStudyOrSeries = function (projectIdArr, caseIdArr, studyIdArr, tableId, refreshAfterFilter, newSelItems, isSeries) {

            changeAjax(true);
            var curSelStudiesDic = new Object();
            var newSelStudies = new Object();


            if (refreshAfterFilter) {
                for (caseId in window.selItems.selStudies) {
                    curSelStudiesDic[caseId] = new Object();
                    for (var i = 0; i < window.selItems.selStudies[caseId].length; i++) {
                        var curStudy = window.selItems.selStudies[caseId][i];
                        curSelStudiesDic[caseId][curStudy] = 1;
                    }
                }
            }
             if ( !(refreshAfterFilter) && isSeries){
                addToSelItems(newSelItems, 'selStudies');
            }
            if ( !(refreshAfterFilter) && !isSeries){
                 addToSelItems(newSelItems, 'selCases');
            }

           var curFilterObj = new Object();
           if (isSeries){

               //curFilterObj.collection_id = projectIdArr;
               curFilterObj.StudyInstanceUID = studyIdArr;
           }
            else {
               curFilterObj = JSON.parse(JSON.stringify(parseFilterObj()));
           }
            curFilterObj.collection_id = projectIdArr;
            curFilterObj.PatientID = caseIdArr;

            //curFilterObj={"Diameter_btw":[51,'*']}

            var filterStr = JSON.stringify(curFilterObj);
            var fields = ["collection_id", "PatientID", "StudyInstanceUID", "StudyDescription", "StudyDate"];
            var collapse_on = 'StudyInstanceUID'
            var sort_on = ["collection_id asc", "PatientID asc", "StudyInstanceUID asc"];
            if (isSeries) {
                fields = ["collection_id", "PatientID", "StudyInstanceUID", "SeriesInstanceUID", "Modality", "BodyPartExamined", "SeriesNumber", "SeriesDescription"];
                collapse_on = 'SeriesInstanceUID'
                sort_on = ["collection_id asc", "PatientID asc", "StudyInstanceUID asc", "SeriesNumber asc"];
            }

            var fieldStr = JSON.stringify(fields);
            var sortDocStr = JSON.stringify(sort_on);

            let url = '/explore/';
                //?counts_only=False&is_json=True&with_clinical=True&collapse_on=' + collapse_on + '&filters=' + filterStr + '&fields=' + fieldStr + '&sort_on=' + sortDocStr;


            ndic={'counts_only':'False', 'is_json':'True', 'with_clinical':'True', 'filters': filterStr, 'collapse_on':collapse_on, 'fields':fieldStr, 'sort_on':sortDocStr }
            if (typeof(window.csr) !=='undefined'){
                ndic['csrfmiddlewaretoken'] = window.csr
            }
            if (!isSeries){
                var uniques = JSON.stringify(["StudyInstanceUID","SeriesInstanceUID"]);
                ndic['uniques']=uniques;
            }


            url = encodeURI(url);
            $.ajax({
                url: url,
                dataType: 'json',
                type: 'post',
                data: ndic,
                contentType: 'application/x-www-form-urlencoded',
                success: function (data) {

                    if (!isSeries) {
                        seriesDic = new Object();
                        if (data.hasOwnProperty('uniques') && data['uniques'].hasOwnProperty('SeriesInstanceUID') && data['uniques']['SeriesInstanceUID']['buckets']) {
                            for (i = 0; i < data['uniques']['SeriesInstanceUID']['buckets'].length; i++) {
                                curSet = data['uniques']['SeriesInstanceUID']['buckets'][i];
                                if (curSet.hasOwnProperty('val') && curSet.hasOwnProperty('unique_count')) {
                                    seriesDic[curSet['val']] = curSet['unique_count']
                                }
                            }

                        }
                    }

                    //nstart = new Date().getTime();
                    for (i = 0; i < data['origin_set']['docs'].length; i++) {
                        var curData = data['origin_set']['docs'][i];
                        var projectId = curData.collection_id;
                        var patientId = curData.PatientID;
                        var studyId = curData.StudyInstanceUID;
                        var ppStudyId = pretty_print_id(studyId);
                        var fetchUrl = DICOM_STORE_PATH + studyId;
                        var hrefTxt = ppStudyId + '</a>';
                        //var hrefTxt =  ppStudyId + '<span class="tooltiptext_ex">' + studyId + '</span>';
                        var pclass = 'project_' + projectId;
                        var cclass = 'case_' + patientId;
                        var newHtml = '';
                        if (isSeries) {
                            var seriesId = curData.SeriesInstanceUID;
                            var ppSeriesId = pretty_print_id(seriesId);
                            var seriesNumber = String(curData.SeriesNumber);
                            var seriesDescription = curData.SeriesDescription;
                            var bodyPartExamined = curData.BodyPartExamined;
                            var modality = curData.Modality;
                            var rowId = 'series_' + seriesId.replace(/\./g, '-')
                            var studyClass = 'study_' + studyId.replace(/\./g, '-');
                            var fetchUrlSeries = fetchUrl + '?SeriesInstanceUID=' + seriesId;
                            var hrefSeriesTxt = ppSeriesId + '<span class="tooltiptext_ex">' + seriesId + '</span>';
                            var seriesTxt =     ppSeriesId + '<span class="tooltiptext_ex">' + seriesId + '</span>';

                            newHtml = '<tr id="' + rowId + '" data-projectid="'+projectId+'" data-caseid="'+patientId+'" class="' + pclass + ' ' + cclass + ' ' + studyClass + ' text_head">' +
                                '<td class="col1 study-id study-id-col" data-study-id="'+studyId+'">' + hrefTxt + '</td>' +
                                '<td class="series-number">' + seriesNumber + '</td>' +
                                '<td class="col1 modality">' + modality + '</td>' +
                                '<td class="col1 body-part-examined">' + bodyPartExamined + '</td>' +
                                '<td class="series-description">' + seriesDescription + '</td>';
                            if ((modality ==='SEG') || (modality ==='RTSTRUCT') || (modality==='RTPLAN' ) || (modality==='RWV' ) ){
                                newHtml += '<td class="ohif open-viewer"><a href="/" onclick="return false;"><i class="fa fa-eye-slash no-viewer-tooltip"></i></td></tr>';

                            }
                            else {
                                newHtml += '<td class="ohif open-viewer"><a href="' + fetchUrlSeries + '" target="_blank"><i class="fa fa-eye"></i></td></tr>';
                            }
                        }

                        else{
                            var studyDescription = curData.StudyDescription;
                            //var studyDate = curData.StudyDate;
                            var rowId = 'study_' + studyId.replace(/\./g, '-');

                            var numSeries=0;
                            if (seriesDic.hasOwnProperty(studyId)){
                                numSeries=seriesDic[studyId];
                           }

                            newHtml = '<tr id="' + rowId + '" data-projectid="'+ projectId +'" class="' + pclass + ' ' + cclass +' text_head">' +
                                //'<td class="col1 project-name">' + projectId + '</td>' +
                                '<td class="ckbx"><input type="checkbox" onclick="(toggleRows($(this).parent().parent(), \'studies\', \'study_\', false))"></td>' +
                                 '<td class="col1 case-id">' + patientId + '</td>'+
                                '<td class="col2 study-id study-id-col" data-study-id="'+studyId+'">' + hrefTxt + '</td>' +
                                '<td class="col1 study-description">' + studyDescription + '</td>' +
                                '<td class="col1 numrows">' + numSeries.toString() + '</td>'+
                                '<td class="ohif open-viewer"><a  href="' + fetchUrl + '" target="_blank"><i class="fa fa-eye"></i></a></td></tr>'

                        }

                        $('#' + tableId).append(newHtml);
                        if ( !isSeries && refreshAfterFilter && (patientId in curSelStudiesDic) && (studyId in curSelStudiesDic[patientId])) {
                            $('#' + tableId).find('#'+ rowId).addClass("selected_grey");
                            if (!(patientId in newSelStudies)) {
                                newSelStudies[patientId] = new Array();
                            }
                            newSelStudies[patientId].push(studyId);
                        }


                    }

                    resetTableControls($('#' + tableId), false, 0);


                     if (refreshAfterFilter && !isSeries) {
                        window.selItems.selStudies = newSelStudies;
                        var studyArr = new Array();
                        for (caseId in window.selItems.selStudies) {
                             studyArr.push.apply(studyArr, window.selItems.selStudies[caseId]);
                        }
                        if (studyArr.length > 0) {
                              addStudyOrSeries(projectIdArr, caseIdArr,studyArr, "series_table", true, {}, true);
                        }
                    }
                    changeAjax(false);
                },
                error: function () {
                    changeAjax(false);
                    console.log("problem getting data");
                }
            });
        };

        window.addSeries = function (studyId, studyClass, seriesTableId) {
            var sIndex = studyIndex[studyId]
            var patientId = studyPatient[studyId]
            var ptIndex = patientIndex[patientId]

            var projectId = patientProject[patientId]
            var pindex = projectIndex[projectId]

            var curStudy = projects[pindex].patients[ptIndex].studies[sIndex]
            curStudy.series.forEach(function (curSeries, seriesIndex) {
                var seriesId = curSeries.id;
                var bodypart = curSeries.BodyPartExamined;
                var modality = curSeries.Modality;
                var seriesNumber = curSeries.SeriesNumber;
                var rowId = 'series_' + projectId + '_' + patientIndex[patientId].toString() + "_" + studyIndex[studyId].toString() + '_' + seriesNumber.toString();
                var pclass = 'project_' + projectId;
                var fetchUrl = DICOM_STORE_PATH + studyId;
                var hrefTxt = '<a href="' + fetchUrl + '">' + studyId + '</a>';

                //var sclass='study_'+projectId+'_'+patientIndex[patientId].toString()+"_"+studyIndex[studyId].toString();
                var newHtml = '<tr id="' + rowId + '" class="' + pclass + ' ' + studyClass + ' text_head"><td>' + hrefTxt + '</td><td>' + seriesId + '</td><td>' + seriesNumber + '</td><td>' + modality + '</td><td>' + bodypart + '</td></tr>'
                $('#' + seriesTableId + ' tr:last').after(newHtml);
            });
        };
/*
        window.resetHeaderCheckBox(table){
            var displayedRows = table.find('tbody').find('tr').not('.hide');
            var checkedDisplayedRowschecked =
            .find('input:checkbox')
                .is(':checked')

        }*/

        window.resetTableControls = function (tableElem, mvScroll, curIndex) {
            var tbodyOff= tableElem[0].offsetTop;
            var displayedRows = tableElem.find('tr').not('.hide');
            var rowPos = displayedRows.map(function () {
                return (this.offsetTop - tbodyOff);
            });
            //tableElem.data('rowpos', JSON.stringify(rowPos));
            var numRecords = displayedRows.length;
            var recordsPP = parseInt(tableElem.parent().parent().find('.files-per-page-select').val());
            tableElem.parent().parent().find('.total-file-count')[0].innerHTML = numRecords.toString();
            var numPages = parseInt((numRecords-1)  / recordsPP) + 1;

            if (mvScroll){
                curIndex=(parseInt(curIndex / recordsPP) )*recordsPP;
            } else {
                var curScrollPos = tableElem[0].scrollTop;
                curIndex = Array.from(rowPos.map(function () {
                    return ((this <= curScrollPos) ? 0 : 1)
                })).indexOf(1)-1;

                curIndex = Math.max(0,curIndex);
                if (curIndex<(rowPos.length-1)){
                    if ( (rowPos[curIndex+1] -curScrollPos)/(rowPos[curIndex+1]-rowPos[curIndex]) <0.20)
                   {
                    curIndex++;
                   }
               }
            }
            var lastInd = curIndex + recordsPP - 1;
            var currentPage = parseInt(curIndex / recordsPP) + 1;
            atEnd = false;
            if (curIndex === -1) {
                curIndex = (numPages - 1) * recordsPP;
                lastInd = numRecords - 1;
                atEnd = true;
            } else if (lastInd >= (numRecords-1)) {
                lastInd = numRecords - 1;
                atEnd = true;
            }

            if ((curIndex > -1) && (lastInd > -1)) {
                var totalHeight = displayedRows[lastInd].offsetTop + displayedRows[lastInd].offsetHeight - displayedRows[curIndex].offsetTop;
                tableElem.css('max-height', totalHeight.toString() + 'px');
            }

            if (mvScroll) {
                    tableElem[0].scrollTop = rowPos[curIndex];
            }

            tableElemGm = tableElem.parent().parent();
            tableElemGm.find('.showing')[0].innerHTML = (curIndex + 1).toString() + " to " + (lastInd + 1).toString();
            tableElemGm.find('.goto-page-number').data('max',numPages.toString());
            if (atEnd) {
                currentPage = numPages;
            }

            if (numRecords>0){
                tableElemGm.find('thead').find('.ckbx').removeClass('notVis');
            } else {
                tableElemGm.find('thead').find('.ckbx').addClass('notVis');
            }
            resetPagination(tableElemGm, currentPage, numPages, recordsPP, numRecords);
        }

        var resetPagination = function (tableElem, currentPage, numPages, recordsPP, numRecords) {
            if (numPages === 0) {
                $(tableElem).parent().parent().find('.dataTables_info').hide();
                $(tableElem).parent().parent().find('.dataTables_length').hide();
            } else {
                $(tableElem).parent().parent().find('.dataTables_info').show();
                $(tableElem).parent().parent().find('.dataTables_length').show();
            }

            if (numPages <= 1) {
                $(tableElem).parent().parent().find('.dataTables_goto_page').hide();
            } else {
                $(tableElem).parent().parent().find('.dataTables_goto_page').show();
            }

            $(tableElem).parent().parent().find('.dataTables_goto_page').data('curpage', currentPage);
            pageElem = $(tableElem).find('.paginate_button_space')[0];
            var html = '';
            if (currentPage > 3) {
                html += '<a class="dataTables_button paginate_button numeric_button">1</a>';
            }
            if (currentPage > 4) {
                html += '<span class="ellipsis">...</span>';
            }

            for (var i = Math.max(1, (currentPage - 2)); i < currentPage; i++) {
                html += '<a class="dataTables_button paginate_button numeric_button">' + i.toString() + '</a>';
            }
            html += '<a class="dataTables_button paginate_button numeric_button current">' + currentPage.toString() + '</a>';

            for (var i = currentPage + 1; i < Math.min((numPages + 1), currentPage + 3); i++) {
                html += '<a class="dataTables_button paginate_button numeric_button">' + i.toString() + '</a>';
            }


            if (numPages > currentPage + 3) {
                html += '<span class="ellipsis">...</span>';
            }
            if (numPages > currentPage + 2) {
                html += '<a class="dataTables_button paginate_button numeric_button">' + numPages.toString() + '</a>';

            }
            pageElem.innerHTML = html;

        }

        var changeAjax = function (isIncrement) {
            if (isIncrement) {
                $('#number_ajax')[0].value = String(parseInt($('#number_ajax')[0].value) + 1);
            } else {
                $('#number_ajax')[0].value = String(parseInt($('#number_ajax')[0].value) - 1);
            }
            //alert($('#number_ajax')[0].value)

            if ($('#number_ajax')[0].value === '0') {
                $('.spinner').hide();
            } else {
                $('.spinner').show();
            }
        }

        var pretty_print_id = function (id) {
            var newId = id.slice(0, 12) + '...' + id.slice(id.length - 12, id.length);
            return newId;
        }

        window.updateSearchScope = function (searchElem) {
            var project_scope = searchElem.selectedOptions[0].value;
            mkFiltText();
            updateFacetsData(true);
        }

        var resetFilterAttr = function (filterCat, filtDic) {
            filtElem = $('#' + filterCat)[0];
            selElements = $('#' + filterCat).find('input:checkbox');
            for (var i = 0; i < selElements.length; i++) {
                selElement = selElements[i];
                if (filtDic.hasOwnProperty(selElement.value)) {
                    selElement.checked = true;
                } else {
                    selElement.checked = false;
                }
            }
        }

        var updateSliderSelection = function (inpDiv, displaySet, header, attributeName, isInt) {
            var val = document.getElementById(inpDiv).value;
            var newText = "&emsp;&emsp;" + header + ": " + val;
            var attributeVals = new Array();
            valArr = val.split("-")
            if (isInt) {
                attributeVals = [parseInt(valArr[0]), parseInt(valArr[1])];
            } else {
                attributeVals = [parseInt(valArr[0]), parseInt(valArr[1])];
            }
            filterObj[attributeName] = attributeVals;
            //document.getElementById(displaySet).innerHTML=newText;
            mkFiltText();
            fetchCountData(false);
        };

        window.selectHistoricFilter = function (num) {
            //alert('previous');
            window.histIndex = window.histIndex + num;
            histObj = window.filtHistory[window.histIndex];
            window.filterObj = JSON.parse(JSON.stringify(histObj.filterObj));
            window.selItems = JSON.parse(JSON.stringify(histObj.selItems));
            /* if ((histObj.filterObj.hasOwnProperty('collection_id')) && (histObj.filterObj['collection_id'] === window.tcgaColls)) {
                window.filterObj['collection_id'] = window.tcgaColls;
            } */
            var filterCatsArr = new Array();
            filterCatsArr.push(findFilterCats('search_orig_set',false));
            filterCatsArr.push(findFilterCats('search_derived_set',false));
            filterCatsArr.push(findFilterCats('search_related_set',false));
            for (var i = 0; i < filterCatsArr.length; i++) {
                filterCats = filterCatsArr[i];
                for (var j = 0; j < filterCats.length; j++) {
                    filterCat = filterCats[j];
                    filtdic = {}
                    if (histObj.filterObj.hasOwnProperty(filterCat)) {
                        for (var k = 0; k < histObj.filterObj[filterCat].length; k++) {
                            filtAtt = histObj.filterObj[filterCat][k];
                            filtdic[filtAtt] = 1;
                        }
                    }
                    resetFilterAttr(filterCat, filtdic);
                }
            }
            resetSearchScope(histObj.filterObj.collection_id, 'project_scope');
            mkFiltText();
            updateFacetsData(false);
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
                    }
                    else {
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
        }
        var updateCollectionTotals_old = function (listId, progDic) {
            //dic.val dic.projects
            progList=$('#'+listId).children('.list-group-item');
            for (var ind=0;ind< progList.length;ind++){
                progItem=progList.get(ind);
                prog= $(progItem).children('.list-group-item__heading').find('input:checkbox')[0].value
                valSp = $(progItem).children('.list-group-item__heading').find('.case_count');
                if (prog in progDic){
                    valSp[0].innerHTML=String(progDic[prog].val);
                }
                else{
                    valSp[0].innerHTML='0'
                }
                projList = $(progItem).children('.list-group-item__body').children('.search-checkbox-list').children('.checkbox');
                for (var pjInd=0; pjInd<projList.length;pjInd++){
                    projItem=projList.get(pjInd);
                    proj=$(projItem).find('input:checkbox')[0].value;
                    valSp = $(projItem).find('.case_count');
                    if ( (prog in progDic) && ('projects' in progDic[prog]) && (proj in progDic[prog]['projects']) ){
                        valSp[0].innerHTML = progDic[prog]['projects'][proj];
                    }
                }
            }
        };

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
                            filtObj[nm] = [window.filterObj[ckey]['rng'],'None']
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

        var updateFacetsData = function (newFilt) {
            changeAjax(true);
            //var url = '/explore/?counts_only=True&is_json=true&is_dicofdic=True&data_source_type=' + ($("#data_source_type option:selected").val() || 'S');
            var url = '/explore/'
            var parsedFiltObj=parseFilterObj();
            if (Object.keys(parsedFiltObj).length > 0) {
                 url += '&filters=' + JSON.stringify(parsedFiltObj);
                 //url += '&filters='+JSON.stringify({"age_at_diagnosis":['None' ]});
            }

            url = encodeURI(url);
            url= encodeURI('/explore/')

            ndic={'counts_only':'True', 'is_json':'True', 'is_dicofdic':'True', 'data_source_type':($("#data_source_type option:selected").val() || 'S'), 'filters':JSON.stringify(parsedFiltObj) }
            if (typeof(window.csr) !=='undefined'){
                ndic['csrfmiddlewaretoken'] = window.csr
            }


            let deferred = $.Deferred();
            $.ajax({
                url: url,
                data: ndic,
                dataType: 'json',
                type: 'post',

                contentType: 'application/x-www-form-urlencoded',
                success: function (data) {
                    var isFiltered = Boolean($('#search_def p').length>0);
                    if (is_cohort) {
                        if (file_parts_count > display_file_parts_count) {
                            $('#file-export-option').prop('title', 'Your cohort exceeds the maximum for download.');
                            $('#file-export-option input').prop('disabled', 'disabled');
                            $('#file-export-option input').prop('checked', false);
                            $('#file-manifest').hide();
                            if(!user_is_social) {
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
                                        text : "File Part " + (i + 1)
                                    }));
                                }
                            } else {
                                select_box_div.hide();
                            }
                        }
                    } else {
                        if (isFiltered && data.total > 0){
                            $('#save-cohort-btn').prop('disabled','');
                            if(user_is_auth) {
                                $('#save-cohort-btn').prop('title','');
                            }
                        } else {
                            $('#save-cohort-btn').prop('disabled','disabled');
                            if (data.total<=0){
                                window.alert('There are no cases matching the selected set of filters.')
                            }
                            if(user_is_auth) {
                                $('#save-cohort-btn').prop('title',data.total > 0 ? 'Please select at least one filter.' : 'There are no cases in this cohort.');
                            } else {
                                $('#save-cohort-btn').prop('title','Log in to save.');
                            }
                        }
                    }
                    //updateCollectionTotals(data.total, data.origin_set.attributes.collection_id);
                    updateCollectionTotals('Program', data.programs);
                    //updateFilterSelections('search_orig_set', data.origin_set.All.attributes);

                    dicofdic= {'unfilt': data.origin_set.All.attributes, 'filt':''}
                    if (isFiltered){
                        dicofdic['filt']=data.filtered_counts.origin_set.All.attributes;
                    } else {
                        dicofdic['filt']=data.origin_set.All.attributes;
                    }

                    updateFilterSelections('search_orig_set', dicofdic);
                    createPlots('search_orig_set');

                    var derivedAttrs = Array.from($('#search_derived_set').children('.list-group').children('.list-group-item').children('.list-group-item__body').map( function() {return this.id;}  ));

                     if (data.hasOwnProperty('derived_set')) {
                        $('#search_derived_set').removeClass('disabled');
                        for (facetSet in data.derived_set){
                            if ('attributes' in data.derived_set[facetSet]){
                                dicofdic = {'unfilt': data.derived_set[facetSet].attributes, 'filt': ''}
                                if (isFiltered && data.filtered_counts.hasOwnProperty('derived_set')
                                    && data.filtered_counts.derived_set.hasOwnProperty(facetSet)
                                    && data.filtered_counts.derived_set[facetSet].hasOwnProperty('attributes')
                                ) {
                                    dicofdic['filt'] = data.filtered_counts.derived_set[facetSet].attributes;
                                }
                                else if (isFiltered)
                                    {
                                    dicofdic['filt'] = {};
                                }
                                else{
                                    dicofdic['filt'] = data.derived_set[facetSet].attributes;
                                }
                                updateFilterSelections(data.derived_set[facetSet].name, dicofdic);
                                var derivedAttrIndex = derivedAttrs.indexOf(data.derived_set[facetSet].name);

                                if (derivedAttrIndex>-1) {
                                    derivedAttrs.splice(derivedAttrIndex,1);
                                }
                            }
                        }
                    } else{
                        $('#search_derived_set').addClass('disabled');
                    }

                    for (var i=0; i< derivedAttrs.length;i++) {
                        updateFilterSelections(derivedAttrs[i], {});
                    }

                    createPlots('search_derived_set');

                    if (data.hasOwnProperty('related_set')) {
                        $('#search_related_set').removeClass('disabled');
                        dicofdic = {'unfilt':data.related_set.All.attributes, 'filt':''  }
                        if (isFiltered){
                            dicofdic['filt'] = data.filtered_counts.related_set.All.attributes;
                        } else{
                            dicofdic['filt'] = data.related_set.All.attributes;
                        }
                        updateFilterSelections('search_related_set', dicofdic);
                        //createPlots('tcga_clinical');
                    }
                    else{
                        $('#search_related_set').addClass('disabled');
                        updateFilterSelections('search_related_set', {});
                    }

                    createPlots('search_related_set');

                    var collFilt = new Array();
                    if ('collection_id' in parsedFiltObj){
                        collFilt=parsedFiltObj['collection_id'];
                        var ind=0;
                        while (ind <window.selItems.selProjects.length) {
                            proj=window.selItems.selProjects[ind]
                            if (  (collFilt.indexOf(proj)>-1)){
                                ind++
                            } else{
                                window.selItems.selProjects.splice(ind,1);
                                if (proj in window.selItems.selStudies){
                                    delete window.selItems.selStudies[proj];
                                }
                            }
                        }
                    }

                    editProjectsTableAfterFilter('projects_table', collFilt,data.origin_set.All.attributes.collection_id);
                    resetCasesAndStudiesAndSeriesTables('cases_table','studies_table','series_table' );

                    if (window.selItems.selProjects.length > 0) {
                        addCases(window.selItems.selProjects,  "cases_table", true);
                    }

                     if ($('#hide-zeros')[0].checked) {
                         addSliders('quantitative', false, true,'');
                         addSliders('tcga_clinical',false, true,'tcga_clinical.');
                     }

                    if (newFilt) {
                        histObj = new Object();
                        histObj.selItems = JSON.parse(JSON.stringify(window.selItems));
                        histObj.filterObj = JSON.parse(JSON.stringify(window.filterObj));

                        window.filtHistory.push(histObj);

                        if (window.filtHistory.length > window.histMaxLength) {
                            window.filtHistory.shift();
                        }
                        window.histIndex = window.filtHistory.length - 1;
                    }
                    /*
                    if ((window.filtHistory.length - 1) > window.histIndex) {
                        $('#next').show();
                    } else {
                        $('#next').hide();
                    }
                    if ((window.filtHistory.length > 0) && (window.histIndex > 0)) {
                        $('#previous').show();
                    } else {
                        $('#previous').hide();
                    }

                     */
                    changeAjax(false);
                    deferred.resolve();
                },
                error: function(data){
                    console.log('error loading data');
                }

            });
            return deferred.promise();
        };


        var manageUpdateFromPlot = function(plotId, label){
            var listId = plotId.replace('_chart','_list');
            var filterId = plotId.replace('_chart','');

            var isSlider = $('#'+filterId).hasClass('hasSlider') ? true : false;
            if (isSlider) {
                var maxx = Math.ceil(parseInt(maxx=$('#' + filterId).attr('data-max')));
                var minx= Math.floor(parseInt($('#' + filterId).attr('data-min')));

                var parStr = $('#'+filterId).find('#'+filterId+'_slide').data('attr-par');


                if(label == 'None') {

                     //var inpElem = $('#'+filterId).find('.noneBut')[0];
                    /*
                    if ($('#'+filterId).find('.noneBut').length>0) {
                       var inpElem = $('#'+filterId).find('.noneBut')[0];
                       inpElem.checked=true;
                       window.addNone(inpElem,parStr,false);
                     }
                    setSlider(filterId+"_slide", true, 0, maxx, true,true);
                    */

                } else {
                    if (! (typeof(inpElem)==="undefined")){
                        inpElem.checked=false;
                        var parStr = $(inpElem).data("attr-par");
                        window.addNone(inpElem,parStr,false);
                    }
                    var selArr = label.split(' To ');
                    var strt = parseInt((selArr[0] === '*') ? '0' : selArr[0]);
                    var end = parseInt((selArr[1] === '*') ? maxx : selArr[1]);
                    setSlider(filterId+"_slide", false, strt, end, true,true);
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

        var plotCategoricalData = function (plotId, lbl, plotData, isPie, showLbl){
            var width = 300;
            var height = 260;
            var shifty = 30;
            var margin = 50;
            var radius = Math.min(width, height) / 2 - margin;
            var radiusB = 1.2*radius;
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

            svg.selectAll("*").remove();

            titlePart = svg.append("text").attr("text-anchor","middle").attr("font-size", "14px").attr("fill","#2A537A");
            var title0="";
            var title1="";
            var title2="";

            if (lbl.includes('Quarter')){
                var titA = lbl.split('Quarter');
                title1=titA[0]+' Quarter';
                title2=titA[1];
            } else if(lbl.includes('Background')){
                var titA = lbl.split('Activity');
                var titB = titA[1].split('(');
                title0 = titA[0];
                title1= 'Activity '+titB[0];
                title2= '('+titB[1];
            } else if(lbl.includes('(')){
               var titA = lbl.split('(');
               title1=titA[0];
               title2='('+titA[1];
             } else {
              title2=lbl;
             }

            titlePart.append("tspan").attr("x",140).attr("y",15).attr("dx",0).attr("dy",0).text(title0);
            titlePart.append("tspan").attr("x", 140).attr("y", 15).attr("dx", 0).attr("dy", 20).text(title1);
            titlePart.append("tspan").attr("x", 140).attr("y", 15).attr("dx", 0).attr("dy", 40).text(title2);

            var pieg=svg.append("g").attr("transform", "translate(" + width / 2 + "," + (height / 2 + shifty) + ")");
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
          .style("stroke-width", "0px")
          .style("opacity", 0.7)
              .on("mousemove",function(d){
                var tot=parseFloat($('#'+plotId).data('total'));
                var frac = parseInt(parseFloat(d.data.value)/tot*100);
                var i=1;
                var xpos = d3.mouse(this)[0];
                var ypos = d3.mouse(this)[1];
               txtbx.attr("x",xpos);
               txtbx.attr("y",ypos+30);
               txtbx.selectAll('*').attr("x",xpos);
               txtbx.selectAll('*').attr("y",ypos+30);
               tspans=txtbx.node().childNodes;


               tspans[0].textContent = d.data.key.replace('* To',mn.toString()+' To').replace('To *', 'To '+mx.toString());
               tspans[1].textContent = d.data.value;
               tspans[2].textContent = frac.toString()+"%";
               txtbx.attr("opacity",1);

                d3.select(this).attr('d', d3.arc()
               .innerRadius(0)
               .outerRadius(radiusB)
               );

            })
             .on("mouseleave",function(d){
                d3.select(this).attr('d', d3.arc()
               .innerRadius(0)
               .outerRadius(radius)
               );

                txtbx.attr("opacity",0);
             })
            .on("click",function(d){
                if(!is_cohort) {
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

        var plotCategoricalDataBar = function (plotId, lbl, plotData, isPie, showLbl) {
            var nData = new Array();
            for (i=0;i<plotData.dataCnt.length;i++){
                nData.push({'cat': plotData.dataLabel[i], 'cnt': plotData.dataCnt[i]});
            }

            var svg = d3.select('#'+plotId).select("svg"),
            marginL = 20,
            marginR = 40,
            marginT = 50,
            marginB = 100;
            width = svg.attr("width") - marginL - marginR;
            height = svg.attr("height") - marginT - marginB;

            svg.append("text")
           .attr("transform", "translate("+marginL+",0)")
           .attr("x", 50)
           .attr("y", 30)
           .attr("font-size", "24px")
           .text(lbl);


            var xScale = d3.scaleBand().range([0, width]).padding(0.1).domain( nData.map(function(d){return d.cat}));
            var yScale = d3.scaleLinear().range([height, 0]).domain([0, d3.max(nData, function(d){ return d.cnt} )]);

            var g = svg.append("g").attr("transform", "translate(" + marginL + "," + marginT + ")");


            g.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(xScale)).selectAll("text")
                .attr("transform", "rotate(45)")
                .style("text-anchor", "start");

            g.append("g").call(d3.axisLeft(yScale));

            g.selectAll(".d3bar")
                .data(nData)
                .enter().append("rect")
                .attr("class", "d3bar")
                .attr("x", function (d) {
                    return xScale(d.cat)
                })
                .attr("y", function (d) {
                    return yScale(d.cnt)
                })
                .attr("width", xScale.bandwidth())
                .attr("height", function (d) {
                    return height - yScale(d.cnt);
                });

        };

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
                /*
                if ($('#' + filterCat).data('plotnm')){
                    lbl = $('#' + filterCat).data('plotnm');
                }
                else {
                    lbl = $('#' + filterCat + '_heading').children()[0].innerText;
                } */
                plotCategoricalData(plotId, lbl, filterData, isPie, showLbl);
            }
        }

        window.resort = function(filterCat){
            updateFilters(filterCat,{},false);
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
                }
                else {
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

        var updateFilters = function (filterCat, dic, dataFetched) {
            var showZeros = true;
            var searchDomain = $('#'+filterCat).closest('.search-configuration, .search-scope');
            //var isSearchConf = ($('#'+filterCat).closest('.search-configuration').find('#hide-zeros').length>0);
            if ((searchDomain.find('#hide-zeros').length>0) && (searchDomain.find('#hide-zeros').prop('checked'))){
                showZeros = false;
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
                } else{
                    $('#'+filterCat).attr('data-curmin','NA');
                    $('#'+filterCat).attr('data-curmax','NA');
                }
             }
            var filterList=$('#'+filterCat).children('ul');
            if (dataFetched){
                updateAttributeValues(filterList, dic);
            }

            var sorter= $('#'+filterCat).children('.sorter').find(":radio").filter(':checked');
            if (sorter.length>0){
                 if (sorter.val()==="alpha"){
                     filterList.children('li').sort(
                        function (a,b){
                        return (  $(b).children().children('.value').text() < $(a).children().children('.value').text() ? 1: -1)
                        }).appendTo(filterList);
                 }
                 else if (sorter.val()==="num"){
                     filterList.children('li').sort(
                        function (a,b){
                        return (  parseFloat($(a).children().children('.case_count').text()) < parseFloat($(b).children().children('.case_count').text()) ? 1: -1)
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
            var numAttrAvail = 0;
            var numNonZero = 0;
            for (var i = 0; i < allFilters.length; i++) {
                var elem = allFilters.get(i);
                var val = $(elem)[0].value;
                var checked = $(elem).prop('checked');
                var spans = $(elem).parent().find('span');
                //var lbl = spans.get(0).innerHTML;
                var cntUf = parseInt(spans.filter('.case_count')[0].innerHTML);


                var isZero
                if ( (cntUf>0) || checked)  {
                    if (cntUf>0){
                        numNonZero++;
                    }
                    $(elem).parent().parent().removeClass('zeroed');
                    isZero=false;
                } else {
                    $(elem).parent().parent().addClass('zeroed');
                    isZero=true;
                }
                if ( (cntUf>0) || checked || showZeros) {
                      numAttrAvail++;
                }
                if ( (numAttrAvail>5) && (!isZero || showZeros)  ) {
                    $(elem).parent().parent().addClass('extra-values');
                } else {
                    $(elem).parent().parent().removeClass('extra-values');
                }

                if ( ( (cntUf>0) || checked || showZeros ) && (showExtras || (numAttrAvail<6)) ) {
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
                        } else{
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
        }

        setAllFilterElements = function(hideEmpty,filtSet){
            //var filtSet = ["search_orig_set","segmentation","quantitative","qualitative","tcga_clinical"];
            for (var i=0;i<filtSet.length;i++) {
                filterCats = findFilterCats(filtSet[i], false);
                for (var j = 0; j < filterCats.length; j++) {
                        updateFilters(filterCats[j],{},false);
                }
            }
            addSliders('quantitative', false, hideEmpty,'');
            addSliders('tcga_clinical',false, hideEmpty,'tcga_clinical.');
        }

        window.hideColl = function(hideElem){
            var filtSet=["program_set"]
            setAllFilterElements(hideElem.checked,filtSet);
        }

        window.hideAtt = function(hideElem){
            var filtSet = ["search_orig_set","segmentation","quantitative","qualitative","tcga_clinical"];
            setAllFilterElements(hideElem.checked, filtSet);
        }

        var updateFilterSelections = function (id, dicofdic) {
            filterCats = findFilterCats(id,false);
            for (i = 0; i < filterCats.length; i++) {
                cat = filterCats[i]
                filtDic={'unfilt':'', 'filt':''}

                if ( (dicofdic.hasOwnProperty('unfilt')) &&  (dicofdic['unfilt'].hasOwnProperty(cat)))
                {
                    filtDic['unfilt']=dicofdic['unfilt'][cat]
                }
                if ( (dicofdic.hasOwnProperty('filt')) && (dicofdic['filt'].hasOwnProperty(cat))  )
                {
                    filtDic['filt']=dicofdic['filt'][cat]
                }
                updateFilters(filterCats[i], filtDic, true);
            }
        };

        var checkTcga = function(){
             if ( !('Program' in window.filterObj) ){
                    window.filterObj['Program'] = new Array();
                }
                if (window.filterObj['Program'].indexOf('TCGA')<0) {
                    window.filterObj['Program'].push('TCGA');
                    window.filterObj['Program.TCGA'] = ['tcga_blca','tcga_brca','tcga_cesc','tcga_coad','tcga_esca','tcga_gbm','tcga_hnsc','tcga_kich','tcga_kirc','tcga_kirp','tcga_lgg','tcga_lihc','tcga_luad','tcga_lusc','tcga_ov','tcga_prad','tcga_read','tcga_sarc','tcga_stad','tcga_thca','tcga_ucec'];
                    $('#TCGA_heading').parent().find('input:checkbox').prop('checked',true);
                    $('#TCGA_heading').parent().find('input:checkbox').prop('indeterminate',false);
                }

        };

        var resetTcgaFilters = function(){
            if ( ('Program' in window.filterObj) && (window.filterObj['Program'].indexOf('TCGA')<0 )){
                $('#tcga_clinical').find('input:checkbox').prop('checked',false);
                setSlider('age_at_diagnosis_slide',true,0,0,true, false);
                var attKey =  Object.keys(window.filterObj);
                for (att in attKey){
                    if (attKey[att].startsWith('tcga_clinical')){
                        delete(window.filterObj[attKey[att]]);
                    }
                }
            }
        };

        var checkFilters = function(filterElem) {
            var checked = $(filterElem).prop('checked');
            var neighbours =$(filterElem).parentsUntil('.list-group-item__body, .list-group-sub-item__body','ul').children().children().children('input:checkbox');
            var neighboursCk = $(filterElem).parentsUntil('.list-group-item__body, .list-group-sub-item__body','ul').children().children().children(':checked');
            var allChecked= false;
            var noneChecked = false;
            if (neighboursCk.length===0){
                noneChecked = true;
            }

            if (neighbours.length === neighboursCk.length){
                allChecked = true;
            }

            var filterCats= $(filterElem).parentsUntil('.tab-pane','.list-group-item, .checkbox');
            var j = 1;

            var curCat='';
            var lastCat='';
            numCheckBoxes=0;
            for (var i=0;i<filterCats.length;i++){
                var filtnm='';
                ind = filterCats.length-1-i;
                filterCat=filterCats[ind];
                hasCheckBox=false;
                if (filterCat.classList.contains('checkbox')){
                     checkBox =$(filterCat).find('input:checkbox')[0];
                     filtnm=checkBox.value;
                     hasCheckBox = true;
                     numCheckBoxes++;
                } else {
                    filtnm=$(filterCat).children('.list-group-sub-item__body, .list-group-item__body, .collection-list')[0].id;
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

                if ( (checked) && (filtnm ==='tcga_clinical') && !is_cohort){
                    checkTcga();
                }

                if ((checked) && (curCat.length>0) && hasCheckBox  ){
                    if (!(checkBox.indeterminate)) {
                        checkBox.checked = true;
                    }
                    if (!(filterObj.hasOwnProperty(curCat))){
                        filterObj[curCat] = new Array();
                    }
                    if (filterObj[curCat].indexOf(filtnm)<0){
                        filterObj[curCat].push(filtnm)
                    }
                    if ((ind ===0) && (curCat.startsWith('Program'))){
                       //resetTcgaFilters();
                    }
                    /* if ( allChecked && (i === (filterCats.length-1)) && (numCheckBoxes>1)) {
                        delete filterObj[curCat];
                    }*/
                }

                if (!checked && ( (ind===0) || ( (ind===1) && hasCheckBox && noneChecked)) ){
                   checkBox.checked = false;
                   //checkBox.indeterminate =  false;
                   if ( filterObj.hasOwnProperty(curCat) && (filterObj[curCat].indexOf(filtnm)>-1) ){
                        pos = filterObj[curCat].indexOf(filtnm);
                        filterObj[curCat].splice(pos,1);
                        if (Object.keys(filterObj[curCat]).length===0){
                             delete filterObj[curCat];
                        }
                   }

                   if ((ind ===0) && (curCat.startsWith('Program'))){
                       //resetTcgaFilters();
                    }
                   if (curCat.length>0){
                     curCat+="."
                     }
                    lastCat = curCat;
                    curCat+=filtnm;
                    //$(filterElem).find('input:checkbox').checked=false;
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
                //$(filterElem).parent().siblings().find('input:checkbox').prop('checked',true);
            } else {
                delete filterObj[curCat];
                $(childBoxes).prop('checked',false);
            }
        };

        var handleFilterSelectionUpdate = function(filterElem, mkFilt, doUpdate) {
            checkFilters(filterElem);
            if (mkFilt) {
                mkFiltText();
            }
            if (doUpdate){
                updateFacetsData(true);
            }
        };

        var tableSortBindings = function (filterId) {
            $('#' + filterId).find('.fa-caret-up, .fa-caret-down').on('click', function () {
                var sorter = this;
                $(this).parent().parent().parent().find('.fa-caret-up, .fa-caret-down').removeClass('selected_grey');
                $(this).addClass('selected_grey');
                var asc = false;
                if (sorter.classList.contains('fa-caret-up')) {
                    asc = true;
                }
                var curInd = $(this).parent().parent().index();
                var tbl = $(this).parentsUntil('div').filter('table');
                sortTable(tbl, curInd, asc);
            });
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
            $('#' + filterId).find('input:checkbox').not('#hide-zeros').on('click', function () {
                handleFilterSelectionUpdate(this, true, true);
            });

            $('#' + filterId).find('.show-more').on('click', function () {
                $(this).parent().parent().children('.less-checks').show();
                $(this).parent().parent().children('.less-checks').removeClass('notDisp');
                $(this).parent().parent().children('.more-checks').addClass('notDisp');

                $(this).parent().hide();
                var extras = $(this).parent().parent().children('.search-checkbox-list').children('.extra-values')

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
                $(this).parent().parent().children('.search-checkbox-list').children('.extra-values').addClass('notDisp');
            });

            $('#' + filterId).find('.check-all').on('click', function () {
                if (!is_cohort) {
                    //$('#' + filterId).find('.checkbox').find('input').prop('checked', true);
                    var filterElems = new Object();
                    filterElems = $(this).parentsUntil('.list-group-item, #program_set').filter('.list-group-item__body, .list-group-sub-item__body, #Program').children('ul').children();
                    for (var ind = 0; ind < filterElems.length; ind++) {
                        var ckElem = new Object();
                        if ($(filterElems[ind]).children().filter('.list-group-item__heading').length > 0) {
                            ckElem = $(filterElems[ind]).children().filter('.list-group-item__heading').children().filter('input:checkbox')[0];
                        } else {
                            ckElem = $(filterElems[ind]).children().filter('label').children().filter('input:checkbox')[0];
                        }
                        ckElem.checked = true;
                        //$(filterElem).prop('checked') = true;
                        if (ind < filterElems.length - 1) {
                            handleFilterSelectionUpdate(ckElem, false, false);
                        } else {
                            handleFilterSelectionUpdate(ckElem, true, true);
                        }
                    }
                }
            });

            $('#' + filterId).find('.uncheck-all').on('click', function () {
              if (!is_cohort){
                    //$('#' + filterId).find('.checkbox').find('input').prop('checked', true);
                    var filterElems = new Object();
                    filterElems = $(this).parentsUntil('.list-group-item, #program_set').filter('.list-group-item__body, .list-group-sub-item__body, #Program').children('ul').children();
                    for (var ind = 0; ind < filterElems.length; ind++) {
                        var ckElem = new Object();
                        if ($(filterElems[ind]).children().filter('.list-group-item__heading').length > 0) {
                            ckElem = $(filterElems[ind]).children().filter('.list-group-item__heading').children().filter('input:checkbox')[0];
                        } else {
                            ckElem = $(filterElems[ind]).children().filter('label').children().filter('input:checkbox')[0];
                        }

                        ckElem.checked = false;
                        if (ind < filterElems.length - 1) {
                            handleFilterSelectionUpdate(ckElem, false, false);
                        } else {
                            handleFilterSelectionUpdate(ckElem, true, true);
                        }
                   }
              }
            });
        };

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

    var addSliders = function(id,initialized,hideZeros, parStr){
        $('#'+id).find('.list-group-item__body.isQuant').each(function() {
            $(this).find('.more-checks').addClass('hide');
            $(this).find('.less-checks').addClass('hide');
            $(this).find('.sorter').addClass('hide');
            //var min = Math.ceil($(this).data('min') * 1000)/1000;
            //var min = Math.floor($(this).data('min'));

            var min = Math.floor(parseInt($(this).attr('data-min')));
            var max = Math.ceil(parseInt($(this).attr('data-max')));
            var lower = parseInt($(this).attr('data-curminrng'));
            var upper = parseInt($(this).attr('data-curmaxrng'));
            var addSlider = true;
            var isActive = $(this).hasClass('isActive');
            var wNone = $(this).hasClass('wNone');
            var checked = ($(this).find('.noneBut').length>0) ? $(this).find('.noneBut').find(':input')[0].checked : false;

            if (!initialized) {
                var slideDivId = $(this).prop('id') + '_slide';
                curmin = $(this).attr('data-curmin');
                curmax = $(this).attr('data-curmax');

                $(this).find('#' + slideDivId).remove();
                $(this).find('.reset').remove();

                $(this).find('.noneBut').remove();
                var inpName = $(this).prop('id') + '_input';
                $(this).find('#'+inpName).remove();

                if (hideZeros) {
                    if ( ( (curmin === 'NA') || (curmax === 'NA')) && !isActive ){
                        addSlider = false;
                        $(this).removeClass('hasSlider');
                        //$(this).removeClass('isActive');
                    } else if (isActive){
                        if (curmin === 'NA') {
                                min = lower;
                        } else {
                            min = Math.min(lower, Math.floor(curmin));
                        }
                        if (curmax === 'NA'){
                                max = upper;
                        } else {
                            max = Math.max(upper, Math.ceil(curmax));
                        }
                    } else {
                            min = Math.floor(curmin);
                            max = Math.ceil(curmax);
                            lower=min;
                            upper=max;
                            //$(this).attr('data-curminrng', lower);
                            //$(this).attr('data-curmaxrng', upper);
                    }
                } else if (!isActive){
                    lower=min;
                    upper=max;
                    //$(this).attr('data-curminrng', lower);
                    //$(this).attr('data-curmaxrng', upper);
                }
            }

            if (addSlider) {
                $(this).addClass('hasSlider');
                mkSlider($(this).prop('id'), min, max, 1, true, wNone, parStr, $(this).data('filter-attr-id'), $(this).data('filter-display-attr'), lower, upper, isActive,checked);
            } else{
                $(this).removeClass('hasSlider');
                //$(this).removeClass('isActive');
            }
        });
     };

     var load_filters = function(filters) {
         var sliders = [];
        _.each(filters, function(group){
            _.each(group['filters'], function(filter) {
                let selector = 'div.list-group-item__body[data-filter-attr-id="' + filter['id'] + '"], ' + 'div.list-group-sub-item__body[data-filter-attr-id="' + filter['id'] + '"]';
                $(selector).parents('.collection-list').collapse('show');

                $(selector).each(function(index, selEle)
                {
                    /*if ($(selEle).find('ul, .ui-slider').length>0) {
                        $(selEle).collapse('show');
                        $(selEle).find('.show-more').triggerHandler('click');
                        $(selEle).parents('.tab-pane.search-set').length > 0 && $('a[href="#' + $(selector).parents('.tab-pane.search-set')[0].id + '"]').tab('show');
                    }*/
                    var attValueFoundInside= false;
                    if ($(selEle).children('.ui-slider').length > 0) {
                        attValueFoundInside= true;
                       sliders.push({
                           'id': $('div.list-group-item__body[data-filter-attr-id="' + filter['id'] + '"]').children('.ui-slider')[0].id,
                           'left_val': filter['values'][0].indexOf(".") >= 0 ? parseFloat(filter['values'][0]) : parseInt(filter['values'][0]),
                           'right_val': filter['values'][1].indexOf(".") >= 0 ? parseFloat(filter['values'][1]) : parseInt(filter['values'][1]),
                       })
                     } else {
                       _.each(filter['values'], function (val) {
                           if ($(selEle).find('input[data-filter-attr-id="' + filter['id'] + '"][value="' + val + '"]').length>0) {
                               attValueFoundInside = true;
                           }
                           $('input[data-filter-attr-id="' + filter['id'] + '"][value="' + val + '"]').prop("checked", true);
                           checkFilters($('input[data-filter-attr-id="' + filter['id'] + '"][value="' + val + '"]'));

                      });
                  }
                    if (attValueFoundInside){
                        $(selEle).collapse('show');
                        $(selEle).find('.show-more').triggerHandler('click');
                        $(selEle).parents('.tab-pane.search-set').length > 0 && $('a[href="#' + $(selector).parents('.tab-pane.search-set')[0].id + '"]').tab('show');
                    }

               });
            });
        });
        if(sliders.length > 0) {
            load_sliders(sliders, false);
        }
        mkFiltText();
        return updateFacetsData(true).promise();
     };

     var load_sliders = function(sliders, do_update) {
        _.each(sliders, function(slider) {
            var slider_id = slider['id'];
            setSlider(slider_id, false, slider['left_val'], slider['right_val'], true, false);
            updatePlotBinsForSliders(slider_id);
        });

        if (do_update) {
            mkFiltText();
            updateFacetsData(true).promise();
        }
     };

    var ANONYMOUS_FILTERS = {};
    var ANONYMOUS_SLIDERS = {};

    var save_anonymous_selection_data = function() {
        var groups = [];

        // Get all checked filters
        var filters = [];

        // For collection list
        $('.collection-list').each(function() {
            var $group = $(this);
            var checkboxes = $group.find("input:checked").not(".hide-zeros");
            if (checkboxes.length > 0) {
                var values = [];
                var my_id = "";
                checkboxes.each(function() {
                    var $checkbox = $(this);
                    var my_value = $checkbox[0].value;
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
            var $group = $(this);
            var my_id = $group.data('filter-attr-id');
            if (my_id != null)
            {
                var checkboxes = $group.find("input:checked");
                if (checkboxes.length > 0)
                {
                    var values = [];
                    checkboxes.each(function() {
                        var $checkbox = $(this);
                        var my_value = $checkbox[0].value;
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
            var $this = $(this);
            var slider_id = $this[0].id;
            var left_val = $this.slider("values", 0);
            var right_val = $this.slider("values", 1);
            var min = $this.slider("option", "min");
            var max = $this.slider("option", "max");
            if (left_val !== min || right_val !== max) {
                sliders.push({
                   'id': slider_id,
                    'left_val': left_val,
                    'right_val': right_val,
                });
            }
        });
        var sliderStr = JSON.stringify(sliders);
        sessionStorage.setItem('anonymous_sliders', sliderStr);
    };

    var load_anonymous_selection_data = function() {
        // Load anonymous filters from session storage and clear it, so it is not always there
        var filter_str = sessionStorage.getItem('anonymous_filters');
        ANONYMOUS_FILTERS = JSON.parse(filter_str);
        sessionStorage.removeItem('anonymous_filters');

        var slider_str = sessionStorage.getItem('anonymous_sliders');
        ANONYMOUS_SLIDERS = JSON.parse(slider_str);
        sessionStorage.removeItem('anonymous_sliders');
    };

    $('#save-cohort-btn').on('click', function() {
        if(!user_is_auth) {
            save_anonymous_selection_data();
            location.href=$(this).data('uri');
        }
    });

    $('#sign-in-dropdown').on('click', function() {
        save_anonymous_selection_data();
    });

     cohort_loaded = false;
     function load_preset_filters() {
         if (is_cohort && !cohort_loaded) {
             var loadPending = load_filters(cohort_filters);
             loadPending.done(function () {
                 console.debug("Load pending complete.");
                 cohort_loaded = true;
                 $('input[type="checkbox"]').prop("disabled", "disabled");
                 $('#projects_table').find('input:checkbox').removeAttr("disabled");
                 //$('.check-all').prop("disabled","disabled");
                 // Re-enable checkboxes for export manifest dialog, unless not using social login
                 if (user_is_social)
                 {
                     $('.field-checkbox').removeAttr('disabled');
                     $('.column-checkbox').removeAttr('disabled');
                 }
                 $('#include-header-checkbox').removeAttr('disabled');

                 $('input#hide-zeros').prop("disabled", "");
                 $('input#hide-zeros').prop("checked", true);
                 $('input#hide-zeros').each(function(){$(this).triggerHandler('change')});
                 $('div.ui-slider').siblings('button').prop("disabled", true);
                 $('.noneBut').find('input:checkbox').prop("disabled",true);
             });
         } else if (Object.keys(filters_for_load).length > 0) {
             var loadPending = load_filters(filters_for_load);
             loadPending.done(function () {
                 //console.debug("External filter load done.");
             });
         } else {
             // check for localStorage key of saved filters from a login
             load_anonymous_selection_data();
             var has_sliders = (ANONYMOUS_SLIDERS !== null && ANONYMOUS_SLIDERS.length > 0);
             var has_filters = (ANONYMOUS_FILTERS !== null && ANONYMOUS_FILTERS[0]['filters'].length > 0);
             if (has_sliders) {
                 let loadPending = load_sliders(ANONYMOUS_SLIDERS, !has_filters);
                 if (has_filters) {
                     //console.debug("Sliders loaded from anonymous login.");
                 } else {
                    loadPending.done(function () {
                     //console.debug("Sliders loaded from anonymous login.");
                    });
                 }
             }
             if (has_filters) {
                 let loadPending = load_filters(ANONYMOUS_FILTERS);
                 loadPending.done(function () {
                     console.debug("Filters loaded from anonymous login.");
                 });
             }
         }
     }

     var demoUpdate = function(){
         var item = location.search.substr(1);
         tmp=item.split('=');
         if ((tmp.length===2) && (tmp[0]==='update')){
             if (tmp[1]==='filter1'){
                 $('#Modality_list').find('input:checkbox')[0].click();
             } else if (tmp[1]==='series1'){
                 $('#search_def')[0].innerHTML='<p><span class="filter-type">SeriesInstanceUID</span> IN (<span class="filter-att">12.0.3, 123.45, ... </span>)</p>'
             } else if (tmp[1]==='filter2'){
                 $('#Program_list').find('input:checkbox')[0].click();
             } else if (tmp[1]==='series2'){
                 $('#search_def')[0].innerHTML='<p><span class="filter-type">SeriesInstanceUID</span> IN (<span class="filter-att">15.0.3, 173.45, ... </span>)</p>'
             }

         }
     }

      $(document).ready(function () {
          $('.spinner').show();
          //const csrftoken = Cookies.get('csrftoken');

           // $('#proj_table').DataTable();
           // window.filterObj.collection_id = window.tcgaColls;
            //var cohort_loaded = false;
            window.selItems = new Object();
            window.selItems.selStudies = new Object();
            window.selItems.selCases = new Object();
            window.selItems.selProjects = new Array();
            window.histIndex  = 0;
            window.histMaxLength = 6;
            histObj = new Object();
            histObj.selItems = JSON.parse(JSON.stringify(window.selItems));
            histObj.filterObj = JSON.parse(JSON.stringify(window.filterObj));
            //histObj.filterObj.collection_id = window.tcgaColls;
            window.filtHistory = new Array();
            window.filtHistory.push(histObj);



            filterItemBindings('program_set');
            filterItemBindings('search_orig_set');
            filterItemBindings('search_derived_set');
            filterItemBindings('search_related_set');

            tableSortBindings('projects_table_head');
            tableSortBindings('studies_table_head')
            tableSortBindings('cases_table_head');
            tableSortBindings('series_table_head');

            shftP= $.Event("keyup");
            //shift key code
            shftP.which =  16;
            $('body').keyup( function(e){
                //if (e.shiftKey)
               //alert('lifted shiftkey');
               clearStagingMultiSel();
            }).trigger(shftP);

            $('body').mouseenter( function(e){
                if (!(window.event.shiftKey)){
                    //alert('enter no shift key');
                    clearStagingMultiSel();
                }
            })

            max= Math.ceil(parseInt($('#age_at_diagnosis').data('data-max')));
            min= Math.floor(parseInt($('#age_at_diagnosis').data('data-min')));

            $('#age_at_diagnosis').addClass('isQuant');
            $('#age_at_diagnosis').addClass('wNone');

            //mkSlider('age_at_diagnosis', min, max,1,true,true, 'tcga_clinical.', $('#age_at_diagnosis').data('filter-attr-id'), $('#age_at_diagnosis').data('filter-display-attr'),min,max,false);


            $('#quantitative').find('.list-group-item__body').each(function() {
                $(this).addClass('isQuant');
            });
            addSliders('tcga_clinical',true, false,'tcga_clinical.');
            addSliders('quantitative',true, false,'');

            createPlots('search_orig_set');
            createPlots('search_derived_set');
            createPlots('tcga_clinical');

            var numCol = $('#projects_table').children('tr').length
            $('#projects_panel').find('.total-file-count')[0].innerHTML = numCol.toString();
             $('#projects_panel').find('.goto-page-number').data('max','3');

            window.resetTableControls ($('#projects_table'), false,0);
            window.resetTableControls ($('#cases_table'), false, 0);
            window.resetTableControls ($('#studies_table'), false, 0);
            window.resetTableControls ($('#series_table'), false, 0);

             $('.clear-filters').on('click', function () {
                   $('input:checkbox').not('#hide-zeros').prop('checked',false);
                   $('input:checkbox').not('#hide-zeros').prop('indeterminate',false);
                   window.filterObj = new Object();
                   $('.ui-slider').each(function(){
                       setSlider(this.id,true,0,0,true, false);
                   })
                   $('#search_def_warn').hide();

                   mkFiltText();
                   updateFacetsData(true);
             });

            //$("#number_ajax").bind("change", function(){ alert($()this.val)} );
            load_preset_filters();
            $('.spinner').hide();
            //demoUpdate();
        }
    );
});
