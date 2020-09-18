
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


require(['jquery', 'underscore', 'jquerydt','jqueryui', 'bootstrap','base'],
    function($, _, jqueryui, bootstrap, jquerydt ) {

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
        }

         window.showPanel=function(){
            $('#lh_panel').show();
            $('#show_lh').hide();
            $('#rh_panel').removeClass('col-lg-12');
            $('#rh_panel').removeClass('col-md-12');
            $('#rh_panel').addClass('col-lg-9');
            $('#rh_panel').addClass('col-md-9');
        }

        window.setSlider = function (slideDiv, reset, strt, end, isInt, updateNow) {
            //var slideDiv = divName + "_slide";
            var divName = slideDiv.replace("_slide","");

            if (reset) {
                strt = $('#' + slideDiv).slider("option", "min");
                end = $('#' + slideDiv).slider("option", "max");
            }

             vals = [strt, end];
            $('#' + slideDiv).find('.ui-slider-handle').each( function(index){
                $(this).find('.slide_tooltip').text( vals[index].toString() );
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
            filtAtt = nm.join('.')+ '_btw';
            if (reset) {
                if (  (window.filterObj.hasOwnProperty(filtAtt)) && (window.filterObj[filtAtt].hasOwnProperty('rng')) ) {
                    delete window.filterObj[filtAtt]['rng'];
                    if (!( 'none' in window.filterObj[filtAtt])){
                        delete window.filterObj[filtAtt];
                    }
                }
            } else {
                var attVal = [];
                if (isInt) {
                    attVal = [parseInt(strt), parseInt(end)];
                    // edge effect
                    attVal = [parseInt(strt), parseInt(end) - 1];
                } else {
                    attVal = [parseFloat(strt), parseFloat(end)];
                }
                //$(this).find('.slide_tooltip').text( ui.values[index].toString() );
                if (!(filtAtt in window.filterObj)){
                    window.filterObj[filtAtt] = new Object();
                }
                window.filterObj[filtAtt]['rng'] = attVal;
            }


            if (updateNow) {
                updatePlotBinsForSliders(slideDiv);
                mkFiltText();
                updateFacetsData(true);
            }
        };

// Show more/less links on categories with >6 fiilters


         var mkFiltText = function () {
            var hasTcga = false;
            var curKeys = Object.keys(filterObj).sort();
            oStringA = new Array();
             var collection = new Array();
            for (i = 0; i < curKeys.length; i++) {

                var curKey = curKeys[i];
                /* if ((curKey === 'collection_id') && (filterObj[curKey] === tcgaColls)) {
                    continue;
                } */
                if (curKey.startsWith('Program')){
                     curArr= filterObj[curKey];
                     for (var j=0;j<curArr.length;j++){
                         if ( ! ( ('Program.'+curArr[j]) in filterObj)){
                             collection.push(curArr[j]);
                         }
                     }
                }
                else if (curKey.endsWith('_btw')) {
                    var realKey=curKey.substring(0, curKey.length-4).split('.').pop();
                    var disp = $('#'+realKey+'_heading').children()[0].innerText;
                    if (curKey.startsWith('tcga_clinical')){
                        disp='tcga.'+disp;
                        hasTcga = true;
                    }

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
                    oStringA.push(nstr);
                } else {
                    var realKey=curKey.split('.').pop();

                    var disp = $('#'+realKey+'_heading').children()[0].innerText;;
                    if (curKey.startsWith('tcga_clinical')){
                        disp='tcga.'+disp;
                        hasTcga = true;
                    }

                    var valueSpans = $('#'+realKey+'_list').children().children().children('input:checked').siblings('.value');
                    oVals= new Array();
                    valueSpans.each( function(){oVals.push($(this).text()) });

                    var oArray = oVals.sort().map(item => '<span class="filter-att">' + item.toString() + '</span>');


                    //var nstr=disp+": "
                    //nstr += oArray.join(", &ensp; ");
                    nstr = '<span class="filter-type">' + disp + '</span>';
                    nstr += 'IN (' + oArray.join("") + ')';
                    oStringA.push(nstr);
                }
                if (hasTcga){
                    $('#search_def_warn').show();
                }
                else{
                    $('#search_def_warn').hide();
                }
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
            } else {
                document.getElementById("search_def").innerHTML = '<span class="placeholder">&nbsp;</span>';
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
                     if (curKey.endsWith('_btw')) {
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

        window.addNone = function(elem, parStr)
        {
            var id = parStr+$(elem).parent()[0].id+"_btw";

            if (elem.checked){
                if (!(id in window.filterObj)) {
                    window.filterObj[id] = new Object();
                }
                window.filterObj[id]['none'] = true;
            }

            else{
                if ((id in window.filterObj) && ('none' in window.filterObj[id])){
                    delete window.filterObj[id]['none'];
                    if (!('rng' in window.filterObj[id])){
                        delete window.filterObj[id];
                    }
                }
            }

            if (parStr.startsWith('tcga_clinical')){
                checkTcga();
            }
            var slideNm = $(elem).parent()[0].id+"_slide";
            updatePlotBinsForSliders(slideNm);
            mkFiltText();
            updateFacetsData(true);
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
                wNone = $('#'+slideName).parent().children("input:checkbox")[0].checked;
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
                     if ( ((valArr[0]==='*') || (endInd>= valArr[0])) && ((valArr[1]==='*') || (strtInd< valArr[1])) ){
                         $(this).parent().children('.plot_count').addClass('plotit');
                     }
                     else{
                         $(this).parent().children('.plot_count').removeClass('plotit');
                     }
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

        var mkSlider = function (divName, min, max, step, isInt, wNone, parStr) {
             var tooltipL = $('<div class="slide_tooltip tooltipL" />').text('stuff').css({
               position: 'absolute',
               top: -25,
               left: -5,
                }).hide();

             var tooltipR = $('<div class="slide_tooltip tooltipR" />').text('stuff').css({
               position: 'absolute',
               top: -25,
               right: -5,
                }).hide();



            var slideName = divName + '_slide';
            var inpName = divName + '_input';
            var strtInp = min + '-' + max;
            var nm=new Array();
            var filterCats= $('#'+divName).parentsUntil('.tab-pane','.list-group-item__body');
            for (var i=0;i<filterCats.length;i++){
                var ind = filterCats.length-1-i;
                nm.push(filterCats[ind].id);
            }
            nm.push(divName);
            var filtName = nm.join('.') + '_btw';
            $('#' + divName).append('<div id="' + slideName + '"></div>  <input id="' + inpName + '" type="text" value="' + strtInp + '" style="display:none"> <button style="display:inline-block;" onclick=\'setSlider("' + slideName + '",true,0,0,' + String(isInt) + ', true)\'>Reset</button>');

            /*
             if (wNone){
                $('#' + divName).append( '<input type="checkbox" onchange="addNone(this, \''+parStr+'\')"> None' );
            }
             */

            $('#' + slideName).slider({
                values: [min, max],
                step: step,
                min: min,
                max: max,
                range: true,
                disabled: is_cohort,
                slide: function (event, ui) {
                      $('#' + inpName).val(ui.values[0] + "-" + ui.values[1]);

                     $(this).find('.slide_tooltip').each( function(index){
                        $(this).text( ui.values[index].toString() );
                        $(this).show();
                    });

                },



                stop: function (event, ui) {
                    //   updateSliderSelection(inpDiv, displaySet, header, attributeName, isInt);


                    var val = $('#' + inpName)[0].value;
                    var valArr = val.split('-');
                    var attVal = [];
                    if (isInt) {
                        //attVal = [parseInt(valArr[0]), parseInt(valArr[1])];
                        // edge effect
                        attVal = [parseInt(valArr[0]), parseInt(valArr[1]) - 1];
                    } else {
                        attVal = [parseFloat(valArr[0]), parseFloat(valArr[1])];
                    }

                    if (!( filtName in window.filterObj )) {
                        window.filterObj[filtName] = new Object();
                    }
                    window.filterObj[filtName]['rng'] = attVal;

                    if (filtName.startsWith('tcga_clinical')) {
                        checkTcga();
                    }
                     updatePlotBinsForSliders(slideName);
                    mkFiltText();
                    updateFacetsData(true);

                }
            }).find('.ui-slider-range').append(tooltipL).append(tooltipR);

            //$('#' + slideName).find('.ui-slider-range').append(tooltipR);

            $('#' + slideName).hover(
                    function(){
                        //$(this).removeClass("ui-state-active");
                       $(this).parent().find('.slide_tooltip').show();
                    }
                  ,
                    function(){
                       $(this).parent().find('.slide_tooltip').hide();
                    }
                );


             $('#' + slideName).find(".slide_tooltip").each(function(index){
                        if (index ==0) {
                            $(this).text(min.toString());
                        }
                        else{
                            $(this).text(max.toString());
                        }
                   });



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
                    if (window.selItems.selStudies.hasOwnProperty(projId)) {
                        delete window.selItems.selStudies[projId];
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
                var newProjectRow = '<tr id="project_row_' + idStr + '" class="text_head" onclick="(toggleProj(this, \'' + idStr + '\'))"><td>' + idStr + '</td><td>' + numPatientsStr + '</td><td id="' + patientIdStr + '" class="projects_table_num_cohort">' + numPatientsStr + '</td> </tr>';
                newInnerHTML += newProjectRow;

            }
            tableElem.innerHTML = newInnerHTML;
        };

        var resetSeriesAndStudiesTables = function (studyId, seriesId) {

            tableElem = document.getElementById(studyId);
            //var newInnerHTML = '<tr><th>Project Name</th><th>Patient Id</th><th>Study Id</th><th>Study Description</th></tr>';
            tableElem.innerHTML = '';
            window.resetTableControls ($('#'+studyId), false, 0);

            tableElem = document.getElementById(seriesId);
            //var newInnerHTML = '<tr> <th>Study Id</th><th>Series Id</th><th>Modality</th><th>Body Part Examined</th> </tr>';
            tableElem.innerHTML = '';
            window.resetTableControls ($('#'+seriesId), false, 0);
        }

        window.toggleProj = function (projRow, projectId) {

            var num_cohort = parseInt($(projRow).find(".projects_table_num_cohort")[0].innerHTML)
            if (num_cohort === 0) {
                alert('no patients for this project in the selected cohort')
                return;
            }
            if (projRow.classList.contains("selected_grey")) {
                $(projRow).removeClass("selected_grey");
                projPos = window.selItems.selProjects.indexOf(projectId)
                if (projPos > -1) {
                    window.selItems.selProjects.splice(projPos, 1);
                }
                if (projectId in window.selItems.selStudies) {
                    delete window.selItems.selStudies[projectId];
                }
                removeStudiesAndSeries(projectId, "studies_table", "series_table")

            } else {
                if (!(window.event.shiftKey)) {
                    $(projRow).parent().find('tr').removeClass("selected_grey");
                    window.selItems.selProjects = [];
                    window.selItems.selStudies = {};
                    window.clearAllStudiesAndSeries("studies_table", "series_table");

                }
                $(projRow).addClass("selected_grey");
                window.selItems.selProjects.push(projectId);
                addStudyOrSeries([projectId], [], "studies_table", false);
            }
        }

        window.toggleStudy = function (studyRow, studyId, projectId) {

            if (studyRow.classList.contains("selected_grey")) {
                $(studyRow).removeClass("selected_grey");
                removeSeries(studyRow.id, "series_table");
                if (window.selItems.selStudies.hasOwnProperty(projectId)) {

                    studyPos = window.selItems.selStudies[projectId].indexOf(studyId);
                    if (studyPos > -1) {
                        window.selItems.selStudies[projectId].splice(studyPos, 1);
                        if (window.selItems.selStudies[projectId].length == 0) {
                            delete window.selItems.selStudies[projectId];
                        }
                    }
                }
            } else {
                if (!(window.event.shiftKey)) {
                    $(studyRow).parent().find('tr').removeClass("selected_grey");
                    window.selItems.selStudies = {};
                    window.clearAllSeries("series_table");
                }

                if (!(window.selItems.selStudies.hasOwnProperty(projectId))) {
                    window.selItems.selStudies[projectId] = new Array();
                }
                window.selItems.selStudies[projectId].push(studyId);

                $(studyRow).addClass("selected_grey");
                addStudyOrSeries([projectId], [studyId], "series_table", false);
            }
        };

        window.clearAllSeries = function (seriesTableId) {
            $('#' + seriesTableId).find('tr').remove();
            resetTableControls($('#' + seriesTableId), true, 0);
        };

        window.clearAllStudiesAndSeries = function (studyTableId, seriesTableId) {
            $('#' + studyTableId).find('tr').remove();
            resetTableControls($('#' + studyTableId), true, 0);
            window.clearAllSeries(seriesTableId);
        };

        window.removeStudiesAndSeries = function (projectId, studyTableId, seriesTableId) {
            var pclass = "project_" + projectId;
            var scrollPos = document.getElementById(studyTableId).scrollTop;
            var studiesTable = document.getElementById(studyTableId);
            //var remainingTrs = $('#' + studyTableId).find('tr').not('.project_' + projectId)

            var scrollPos = document.getElementById(studyTableId).scrollTop;
            var remainingTrs = $('#' + studyTableId).find('tr').not('.project_' + projectId);
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

            $('#' + studyTableId).find('.project_' + projectId).remove();
            if (window.selItems.selStudies.hasOwnProperty(projectId)) {
                delete window.selItems.selStudies[projectId];
            }
            resetTableControls($('#' + studyTableId), true, newScrollInd);

            removeSeries(pclass, seriesTableId);
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


        window.addStudyOrSeries = function (projectIdArr, studyIdArr, tableId, refresh) {

            changeAjax(true);
            var curSelStudiesDic = new Object();
            var newSelStudies = new Object();
            var isSeries = false;

            if (studyIdArr.length > 0) {
                //curFilterObj.StudyInstanceUID = studyIdArr;
                isSeries = true;
            } else if (refresh) {
                for (projId in window.selItems.selStudies) {
                    curSelStudiesDic[projId] = new Object();
                    for (var i = 0; i < window.selItems.selStudies[projId].length; i++) {
                        var curStudy = window.selItems.selStudies[projId][i];
                        curSelStudiesDic[projId][curStudy] = 1;
                    }
                }
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


            var filterStr = JSON.stringify(curFilterObj);
            var fields = ["collection_id", "PatientID", "StudyInstanceUID", "StudyDescription", "StudyDate"];
            var collapse_on = 'StudyInstanceUID'
            var order_docs = ["collection_id", "PatientID", "StudyInstanceUID"];
            if (isSeries) {
                fields = ["collection_id", "PatientID", "StudyInstanceUID", "SeriesInstanceUID", "Modality", "BodyPartExamined", "SeriesNumber", "SeriesDescription"];
                collapse_on = 'SeriesInstanceUID'
                order_docs = ["collection_id", "PatientID", "StudyInstanceUID", "SeriesNumber"];
            }

            var fieldStr = JSON.stringify(fields);
            var orderDocStr = JSON.stringify(order_docs);
            let url = '/explore/?counts_only=False&is_json=True&with_clinical=True&collapse_on=' + collapse_on + '&filters=' + filterStr + '&fields=' + fieldStr + '&order_docs=' + orderDocStr;
            url = encodeURI(url);

            $.ajax({
                url: url,
                dataType: 'json',
                type: 'get',
                contentType: 'application/x-www-form-urlencoded',
                success: function (data) {
                    //nstart = new Date().getTime();
                    for (i = 0; i < data['origin_set']['docs'].length; i++) {
                        var curData = data['origin_set']['docs'][i];
                        var projectId = curData.collection_id;
                        var patientId = curData.PatientID;
                        var studyId = curData.StudyInstanceUID;
                        var ppStudyId = pretty_print_id(studyId);
                        var fetchUrl = DICOM_STORE_PATH + studyId;
                        var hrefTxt = ppStudyId + '</a><span class="tooltiptext_ex">' + studyId + '</span>';
                        //var hrefTxt =  ppStudyId + '<span class="tooltiptext_ex">' + studyId + '</span>';
                        var pclass = 'project_' + projectId;
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
                            var seriesTxt = ppSeriesId + '<span class="tooltiptext_ex">' + seriesId + '</span>';

                            newHtml = '<tr id="' + rowId + '" class="' + pclass + ' ' + studyClass + ' text_head"><td class="col1 tooltip_ex">' + hrefTxt + '</td><td>' + seriesNumber + '</td><td class="col1">' + modality + '</td><td class="col1">' + bodyPartExamined + '</td><td>' + seriesDescription + '</td>';
                            if ((modality ==='SEG') || (modality ==='RTSTRUCT')){
                            newHtml += '<td class="ohif greyout tooltip_ex"><span class="tooltiptext_ex">Please open at the study level to see this series</span><a   href="/" onclick="return false;"><img src="' + STATIC_FILES_URL + 'img/ohif_sm.png"></a></td></tr>';

                            }
                            else {
                            newHtml += '<td class="ohif"><a   href="' + fetchUrlSeries + '" target="_blank"><img src="' + STATIC_FILES_URL + 'img/ohif_sm.png"></a></td></tr>';
                            }
                        }
                          else{
                            var studyDescription = curData.StudyDescription;
                            //var studyDate = curData.StudyDate;
                            var rowId = 'study_' + studyId.replace(/\./g, '-');

                            if (refresh && (projectId in curSelStudiesDic) && (studyId in curSelStudiesDic[projId])) {
                                if (!(projectId in newSelStudies)) {
                                    newSelStudies[projectId] = new Array();
                                }
                                newSelStudies[projectId].push(studyId);

                                newHtml = '<tr id="' + rowId + '" class="' + pclass + ' text_head selected_grey" onclick="(toggleStudy(this,\'' + studyId + '\',\'' + projectId + '\'))"><td class="col1">' + projectId + '</td><td class="col1">' + patientId + '</td><td class="col2 tooltip_ex">' + hrefTxt + '</td><td class="col1">' + studyDescription + '</td><td class="ohif"><a  href="' + fetchUrl + '" target="_blank"><img src="'+STATIC_FILES_URL+'img/ohif_sm.png"></a></td></tr>'

                            } else {
                                newHtml = '<tr id="' + rowId + '" class="' + pclass + ' text_head" onclick="(toggleStudy(this,\'' + studyId + '\',\'' + projectId + '\'))"><td class="col1">' + projectId + '</td><td class="col1">' + patientId + '</td><td class="col2 tooltip_ex">' + hrefTxt + '</td><td class="col1">' + studyDescription + '</td><td class="ohif"><a  href="' + fetchUrl + '" target="_blank"><img src="'+STATIC_FILES_URL+'img/ohif_sm.png"></a></td></tr>'
                            }
                        }
                        //var rowId='study_'+projectId+'_'+patientIndex[patientId].toString()+"_"+studyIndex[studyId].toString();


                        //document.getElementById(tableId).innerHTML += newHtml;
                        $('#' + tableId).append(newHtml);

                    }
                    //newScrollInd = findScrollInd(tableId);
                    resetTableControls($('#' + tableId), false, 0);

                    /* nend = new Date().getTime();
                    diff = nend - nstart;
                    alert(diff); */
                    if (refresh && !isSeries) {
                        window.selItems.selStudies = newSelStudies;
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

        var findScrollInd = function (tableId) {
            var scrollPos = document.getElementById(tableId).scrollTop;
            var remainingTrs = $('#' + studyTableId).find('tr').not('.project_' + projectId);
            var newScrollInd = remainingTrs.map(function () {
                return ((this.offsetTop <= scrollPos) ? 0 : 1)
            }).indexOf(1);
            if (newScrollInd > 0) {
                var scrollB = remainingTrs.get(newScrollInd - 1).offsetTop;
                scrollF = remainingTrs.get(newScrollInd).offsetTop;

                if ((scrollPos - scrollB) < (scrollF - scrollPos)) {
                    var newScrollInd = newScrollInd + 1;

                }
            }
            return newScrollInd;
        }

        /* $('.table').find('tbody').on('scroll', function () {
            resetTableControls($(this), false,-1);
        }); */


        var setTableView = function (panelTableElem) {
            var curPage = $(panelTableElem).find('.dataTables_goto_page').data('curpage');
            var recordsPP = $(panelTableElem).find('.files-per-page-select').val();
            var curRecords = $(panelTableElem).find('tbody').find('tr');


        }

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


            if (!mvScroll) {
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
            tableElemGm.find('.goto-page-number')[0].max = numPages;
            if (atEnd) {
                currentPage = numPages;
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
            //document.getElementById('selected_project').innerHTML=project_scope;

            /*
            if (project_scope === 'All') {

                filterObj['collection_id'] = tcgaColls;
            } else {
                filterObj['collection_id'] = [project_scope];

            }*/
            //document.getElementById('total').innerHTML = window.collection[project_scope];
            mkFiltText();
            updateFacetsData(true);
            //window.resetTableControls($('#projects_table'),true,0);

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
    /*
        var resetSearchScope = function (scopeArr, searchId) {
            var selectElem = $('#' + searchId)[0];
            var selIndex = 0;
            if (scopeArr === window.tcgaColls) {
                selIndex = 0;
            } else {
                selProject = scopeArr[0];
                selectionArr = $(selectElem).children("option");
                for (var i = 0; i < selectionArr.length; i++) {
                    selectItem = selectionArr[i];
                    if (selProject === selectItem.value) {
                        selIndex = i;
                        break;
                    }
                }

            }
            selectElem.selectedIndex = selIndex;
        }

*/
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
                if ((item !=='All') && (item !=='None')){

                    if (! ('projects' in progDic[item]) ) {
                        reformDic[listId][item]=new Object();
                        reformDic[listId][item]['count'] = progDic[item]['val'];
                    }

                    else if (item.toLowerCase() === 'tcga'){
                        reformDic[listId][item]=new Object();
                        reformDic[listId][item]['count'] = progDic[item]['val'];
                        reformDic[item] =  new Object();
                        for (project in progDic[item]['projects']){
                            reformDic[item][project]=new Object();
                            reformDic[item][project]['count']=progDic[item]['projects'][project];
                        }

                    }

                    //else if (('projects' in progDic[item]) && Object.keys(progDic[item]['projects']).length == 1 ){
                     else{
                        nm = Object.keys(progDic[item]['projects'])[0];
                        reformDic[listId][nm]=new Object();
                        reformDic[listId][nm]['count'] = progDic[item]['val'];
                    }
                     /*

                    else {
                        reformDic[listId][item]=new Object();
                        reformDic[listId][item]['count'] = progDic[item]['val'];
                        reformDic[item] =  new Object();
                        for (project in progDic[item]['projects']){
                            reformDic[item][project]=new Object();
                            reformDic[item][project]['count']=progDic[item]['projects'][project];
                        }
                    }

                      */
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
                        }
                        else {
                            collObj.push(program);
                        }
                    }
                }
                else if (ckey.startsWith('Program.')){
                     for (ind=0;ind<window.filterObj[ckey].length;ind++){
                         collObj.push(window.filterObj[ckey][ind]);
                     }
                }
                else{
                    nmA = ckey.split('.');
                    nm=nmA[nmA.length-1];
                    if (nm.endsWith('_btw')){
                        if ('rng' in window.filterObj[ckey]){
                            filtObj[nm] = window.filterObj[ckey]['rng']
                        }
                        if ('none' in window.filterObj[ckey]){
                            noneKey=nm.replace('_btw','');
                            filtObj[noneKey]='None';
                        }
                    }
                    else {
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

            var url = '/explore/?counts_only=True&is_json=true&is_dicofdic=True&data_source_type=' + ($("#data_source_type option:selected").val() || 'S');
            var parsedFiltObj=parseFilterObj();
            if (Object.keys(parsedFiltObj).length > 0) {

                url += '&filters=' + JSON.stringify(parsedFiltObj);
            }

            url = encodeURI(url);

            let deferred = $.Deferred();

            $.ajax({
                url: url,
                dataType: 'json',
                type: 'get',
                contentType: 'application/x-www-form-urlencoded',
                success: function (data) {

                    var isFiltered = true;
                    if ($('#search_def p').length>0){
                      $('#save-cohort-btn').prop('disabled','');
                      if(user_is_auth) {
                        $('#save-cohort-btn').prop('title','');
                        }
                   }
                    else{
                        isFiltered = false;
                       $('#save-cohort-btn').prop('disabled','disabled');
                        if(user_is_auth) {
                            $('#save-cohort-btn').prop('title','Please select at least one filter.');
                        }
                    }
                    //updateCollectionTotals(data.total, data.origin_set.attributes.collection_id);
                    updateCollectionTotals('Program', data.programs);
                    //updateFilterSelections('search_orig_set', data.origin_set.All.attributes);

                    dicofdic= {'unfilt': data.origin_set.All.attributes, 'filt':''}
                    if (isFiltered){
                        dicofdic['filt']=data.filtered_counts.origin_set.All.attributes;
                    }
                    else {
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
                                if (isFiltered){
                                    dicofdic['filt'] = data.filtered_counts.derived_set[facetSet].attributes;
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
                    }
                    else{
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
                        }
                        else{
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
                        while (ind <window.selItems.selProjects.length)
                        {
                            proj=window.selItems.selProjects[ind]
                            if (  (collFilt.indexOf(proj)>-1)){
                                ind++
                            }
                            else{
                                window.selItems.selProjects.splice(ind,1);
                                if (proj in window.selItems.selStudies){
                                    delete window.selItems.selStudies[proj];
                                }
                            }
                        }
                    }

                    editProjectsTableAfterFilter('projects_table', collFilt,data.origin_set.All.attributes.collection_id);
                    resetSeriesAndStudiesTables('series_table', 'studies_table');
                    var studyArr = new Array();
                    for (projId in window.selItems.selStudies) {
                        studyArr.push.apply(studyArr, window.selItems.selStudies[projId]);
                    }
                    if (window.selItems.selProjects.length > 0) {
                        addStudyOrSeries(window.selItems.selProjects, [], "studies_table", true);
                    }
                    if (studyArr.length > 0) {
                        addStudyOrSeries(window.selItems.selProjects, studyArr, "series_table", true);
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
                error: function () {
                    changeAjax(false);
                    console.log("problem getting data");
                }
            });
            return deferred.promise();
        };


        var manageUpdateFromPlot = function(plotId, label){
            var listId = plotId.replace('_chart','_list');
            var filterId = plotId.replace('_chart','');

            var isSlider = $('#'+filterId).find('#'+filterId+'_slide').length>0 ? true : false;
            if (isSlider) {
                maxx = $('#'+filterId).data('attr-max').toString();
                if(label == 'None') {

                } else {
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
            }
            else if(lbl.includes('Background')){
                var titA = lbl.split('Activity');
                var titB = titA[1].split('(');
                title0 = titA[0];
                title1= 'Activity '+titB[0];
                title2= '('+titB[1];
            }

            else if(lbl.includes('(')){
               var titA = lbl.split('(');
               title1=titA[0];
               title2='('+titA[1];
             }
            else{
              title2=lbl;
             }


            titlePart.append("tspan").attr("x",140).attr("y",15).attr("dx",0).attr("dy",0).text(title0);
            titlePart.append("tspan").attr("x", 140).attr("y", 15).attr("dx", 0).attr("dy", 20).text(title1);
            titlePart.append("tspan").attr("x", 140).attr("y", 15).attr("dx", 0).attr("dy", 40).text(title2);


             var pieg=svg.append("g")
             .attr("transform", "translate(" + width / 2 + "," + (height / 2 + shifty) + ")");
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

           // Compute the position of each group on the pie:
          var pie = d3.pie()
          .value(function(d) {return d.value; }).sort(null);
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
            color(d.data.key)  )
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
               tspans[0].textContent = d.data.key;
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

        if (tot===0){
            txtbx.attr('text-anchor','middle');
            tspans=txtbx.node().childNodes;
            tspans[0].textContent = "No Data Available";
            txtbx.attr("opacity",1);
        }

        }


         var plotCategoricalDataBar = function (plotId, lbl, plotData, isPie, showLbl){
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

        g.append("g")
            .call(d3.axisLeft(yScale));


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
                lbl = $('#' + filterCat + '_heading').children()[0].innerText;
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

        var updateFilters = function (filterCat, dic, dataFetched) {
            var hasSlider = ( $('#'+filterCat+'_slide').length>0 );
            var allListItems=$('#'+filterCat).children('ul').children('li');
            var allFilters=allListItems.children().children('input:checkbox');
            var checkedFilters=allListItems.children().children('input:checked');
            var showZeros = true;
            var isSearchConf = ($('#'+filterCat).closest('.search-configuration').find('#hide-zeros').length>0);

            if ( isSearchConf  && ($('#'+filterCat).closest('.search-configuration').find('#hide-zeros')[0].checked)){
                showZeros = false;
            }



            if ( ($('#' + filterCat).children('.hide-zeros').length>0) &&  ($('#' + filterCat).children('.hide-zeros').hasClass("notDisp")) ){
                showZeros = false;
            }
            var showExtras = false;
            if ( ($('#' + filterCat).children('.more-checks').length>0) && $('#' + filterCat).children('.more-checks').hasClass("notDisp")) {
                showExtras = true;
            }

            var allUnchecked = ((checkedFilters.length == 0) ? true : false)
            var numAttrAvail = 0;

            for (var i = 0; i < allFilters.length; i++) {
                var elem = allFilters.get(i);
                var val = $(elem)[0].value;
                var checked = $(elem)[0].checked;

                var spans = $(elem).parent().find('span');
                var lbl = spans.get(0).innerHTML;

                var oldCntUf = parseInt(spans.filter('.case_count')[0].innerHTML);
                var cntUf=0
                if (dataFetched && dic.hasOwnProperty('unfilt') && dic['unfilt'].hasOwnProperty(val)) {
                    cntUf = dic['unfilt'][val].count
                }
                else if (dataFetched){
                    cntUf = 0;
                }
                else{
                    cntUf = oldCntUf;
                }

                spans.filter('.case_count')[0].innerHTML = cntUf.toString();

                if (spans.filter('.plot_count').length>0) {
                    var oldCntF = parseInt(spans.filter('.plot_count')[0].innerHTML);
                    var cntF = 0
                    if (dataFetched && dic.hasOwnProperty('filt') && dic['filt'].hasOwnProperty(val)) {
                        cntF = dic['filt'][val].count
                    } else if (dataFetched) {
                        cntF = 0;
                    } else {
                        cntF = oldCntF;
                    }

                    spans.filter('.plot_count')[0].innerHTML = cntF.toString();
                }



                if ( (cntUf>0) || checked)  {
                    $(elem).parent().parent().removeClass('zeroed');
                }
                else {
                    $(elem).parent().parent().addClass('zeroed');
                }

                if ( (cntUf>0) || checked || showZeros) {
                      numAttrAvail++;
                }

                if ( (numAttrAvail>5) ) {
                    $(elem).parent().parent().addClass('extra-values');
                }
                else {
                    $(elem).parent().parent().removeClass('extra-values');
                }

                if ( ( (cntUf>0) || checked || showZeros ) && (showExtras || (numAttrAvail<6)) ) {
                      $(elem).parent().parent().show();
                }
                else {
                    $(elem).parent().parent().hide();
                }

               /* if (!hasSlider) {
                    if (checked || allUnchecked) {
                        $(spans.filter('.plot_count')).addClass('plotit');
                    } else {
                        $(spans.filter('.plot_count')).removeClass('plotit');
                    }
                }

                */
            }


            if ( numAttrAvail < 6)  {
                    $('#' + filterCat).children('.more-checks').hide();
                    $('#' + filterCat).children('.less-checks').hide();

                }
            else if (showExtras) {
                $('#' + filterCat).children('.more-checks').hide();
                $('#' + filterCat).children('.less-checks').show();
            }

            else {
                var numMore;
                var allListItems
                if (showZeros){
                    numMore = allListItems.length-5;
                }
                else{
                    numMore = allListItems.filter('.zeroed').length-5;
                }
                $('#' + filterCat).children('.more-checks').show();
                $('#' + filterCat).children('.more-checks').children('.show-more')[0].innerText="show "+numMore.toString()+" more";
                $('#' + filterCat).children('.less-checks').hide();
            }



        }

        window.hideAtt = function(){
            var filtSet = ["search_orig_set","segmentation","quantitative","qualitative","search_related_set"];
            for (var i=0;i<filtSet.length;i++) {
                filterCats = findFilterCats(filtSet[i], false);
                for (var j = 0; j < filterCats.length; j++) {
                        updateFilters(filterCats[j],{},false);
                }
            }
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
                if (window.filterObj['Program'].indexOf('tcga')<0) {
                    window.filterObj['Program'].push('tcga');
                    window.filterObj['Program.tcga'] = ['tcga_blca','tcga_brca','tcga_cesc','tcga_coad','tcga_esca','tcga_gbm','tcga_hnsc','tcga_kich','tcga_kirc','tcga_kirp','tcga_lgg','tcga_lihc','tcga_luad','tcga_lusc','tcga_ov','tcga_prad','tcga_read','tcga_sarc','tcga_stad','tcga_thca','tcga_ucec'];
                    $('#tcga_heading').parent().find('input:checkbox').prop('checked',true);
                    $('#tcga_heading').parent().find('input:checkbox').prop('indeterminate',false);
                }

        };

        var resetTcgaFilters = function(){
            if ( ('Program' in window.filterObj) && (window.filterObj['Program'].indexOf('tcga')<0 )){
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
            var checked = $(filterElem)[0].checked;
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
                }
                else
               {

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

                if ( (checked) && (filtnm ==='tcga_clinical')){
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
                       resetTcgaFilters();
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
                       resetTcgaFilters();
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
                        }
                        else if (((seriesNuma > seriesNumb) )){
                            return 1;
                        }
                        else {
                            return -1;
                        }
                    }
                   else{
                       return 0;
                    }
                }

                else if (((item1 > item2) && asc) || ((item2 > item1) && !asc)) {
                    return 1;
                }
                else {
                    return -1
                }
            });
            $(tbl).find('tbody').append(rowSet);
        }


        var filterItemBindings = function (filterId) {
        $('#' + filterId).find('input:checkbox').on('click', function () {
            handleFilterSelectionUpdate(this, true, true);
        });

        /*
        $('#' + filterId).find('.hide-zeros-a').on('click', function () {
            $(this).parent().parent().children('.show-zeros').show();
            $(this).parent().parent().children('.show-zeros').removeClass('notDisp');
            $(this).parent().parent().children('.hide-zeros').addClass('notDisp');
            $(this).parent().hide();
            var filterCat =$(this).parent().parent()[0].id;
            updateFilters(filterCat, {}, false);
        });


        $('#' + filterId).find('.show-zeros-a').on('click', function () {
            $(this).parent().parent().children('.hide-zeros').show();
            $(this).parent().parent().children('.hide-zeros').removeClass('notDisp');
            $(this).parent().parent().children('.show-zeros').addClass('notDisp');
            $(this).parent().hide();
            var filterCat =$(this).parent().parent()[0].id;
            updateFilters(filterCat, {}, false);

        });

         */


        $('#' + filterId).find('.show-more').on('click', function () {

            $(this).parent().parent().find('.less-checks').show();
            $(this).parent().parent().find('.less-checks').removeClass('notDisp');
            $(this).parent().parent().find('.more-checks').addClass('notDisp');
            $(this).parent().hide();
            var extras = $(this).parent().parent().children('.search-checkbox-list').children('.extra-values')

            if ( ($('#'+filterId).closest('.search-configuration').find('#hide-zeros').length>0)  && ($('#'+filterCat).closest('.search-configuration').find('#hide-zeros')[0].checked)){
                extras=extras.not('.zeroed');
            }
                extras.show();

        });


        $('#' + filterId).find('.show-less').on('click', function () {

            $(this).parent().parent().find('.more-checks').show();
            $(this).parent().parent().find('.more-checks').removeClass('notDisp');
            $(this).parent().parent().find('.less-checks').addClass('notDisp');
            $(this).parent().hide();
            $(this).parent().parent().children('.search-checkbox-list').children('.extra-values').hide();


        });


        $('#' + filterId).find('.check-all').on('click', function () {
            //$('#' + filterId).find('.checkbox').find('input').prop('checked', true);
            var filterElems = $(this).parentsUntil('.list-group-item').filter('.list-group-item__body').children('ul').children();
            for (var ind =0;ind<filterElems.length;ind++)
            {
                var ckElem = new Object();
                if ($(filterElems[ind]).children().filter('.list-group-item__heading').length>0){
                    ckElem = $(filterElems[ind]).children().filter('.list-group-item__heading').children().filter('input:checkbox')[0];
                }
                else{
                   ckElem=$(filterElems[ind]).children().filter('label').children().filter('input:checkbox')[0];
                }

                ckElem.checked= true;
              //$(filterElem)[0].checked = true;
              if (ind<filterElems.length-1) {
                  handleFilterSelectionUpdate(ckElem, false, false);
              }
              else{
                  handleFilterSelectionUpdate(ckElem, true, true);
              }
            }
        });



        $('#' + filterId).find('.uncheck-all').on('click', function () {
             //$('#' + filterId).find('.checkbox').find('input').prop('checked', true);
            var filterElems = $(this).parentsUntil('.list-group-item').filter('.list-group-item__body').children('ul').children();
            for (var ind =0;ind<filterElems.length;ind++)
            {
                var ckElem = new Object();
                if ($(filterElems[ind]).children().filter('.list-group-item__heading').length>0){
                    ckElem = $(filterElems[ind]).children().filter('.list-group-item__heading').children().filter('input:checkbox')[0];
                }
                else{
                   ckElem=$(filterElems[ind]).children().filter('label').children().filter('input:checkbox')[0];
                }

              ckElem.checked = false;
                if (ind<filterElems.length-1) {
                  handleFilterSelectionUpdate(ckElem, false, false);
              }
              else{
                  handleFilterSelectionUpdate(ckElem, true, true);
              }

            }

        });


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

        }

     var addFilterBindings = function(id){
         var filterCats = findFilterCats(id,false);
         for (var i=0;i<filterCats.length;i++){
             filterItemBindings(filterCats[i]);
        }
     }

     var addSliders = function(id){
            $('#'+id).find('.list-group-item__body').each(function(){
                $(this).find('.more-checks').addClass('hide');
                $(this).find('.less-checks').addClass('hide');
                //var min = Math.ceil($(this).data('attr-min') * 1000)/1000;
                //var min = Math.floor($(this).data('attr-min'));
                var min = 0;
                var max = Math.floor($(this).data('attr-max'));
                if (this.id.startsWith('Glycolysis') ){
                    min = 0;
                    max = 300;
                }
                else if (this.id.startsWith('Percent') ){
                    min = 0;
                    max = 100;
                }
                //var max = Math.ceil($(this).data('attr-max') * 1000)/1000;
                mkSlider($(this).prop('id'),min, max,1,true,false,'');
            });
     };


     $(document).ready(function () {

           // $('#proj_table').DataTable();
           // window.filterObj.collection_id = window.tcgaColls;
            window.selItems = new Object();
            window.selItems.selStudies = new Object();
            window.selItems.selProjects = new Array();
            window.histIndex  = 0;
            window.histMaxLength = 6;
            histObj = new Object();
            histObj.selItems = JSON.parse(JSON.stringify(window.selItems));
            histObj.filterObj = JSON.parse(JSON.stringify(window.filterObj));
            //histObj.filterObj.collection_id = window.tcgaColls;
            window.filtHistory = new Array();
            window.filtHistory.push(histObj);
            createPlots('search_orig_set');
            createPlots('search_derived_set');
            createPlots('tcga_clinical');
           /* addFilterBindings('search_orig_set');
            addFilterBindings('search_related_set');*/

            filterItemBindings('program_set');
            filterItemBindings('search_orig_set');
            filterItemBindings('search_derived_set');
            filterItemBindings('search_related_set');
            tableSortBindings('projects_table_head');
            tableSortBindings('studies_table_head');
            tableSortBindings('series_table_head');

            mkSlider('age_at_diagnosis',0,parseInt($('#age_at_diagnosis').data('attr-max')),1,true,true, 'tcga_clinical.');

            addSliders('quantitative');

            var numCol = $('#projects_table').children('tr').length
            $('#projects_panel').find('.total-file-count')[0].innerHTML = numCol.toString();
             $('#projects_panel').find('.goto-page-number')[0].max=3;

            window.resetTableControls ($('#projects_table'), false, 0);
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
        }
    );

     var load_filters = function(filters) {
        _.each(filters, function(group){
            _.each(group['filters'], function(filter){
                $('div.list-group-item__body[data-attr-id="'+filter['id']+'"]').collapse('show');
                _.each(filter['values'], function(val){
                    $('input[data-filter-attr-id="'+filter['id']+'"][value="'+val+'"]').prop("checked",true);
                    checkFilters($('input[data-filter-attr-id="'+filter['id']+'"][value="'+val+'"]'));
                });
            });
        });
        mkFiltText();
        return updateFacetsData(true).promise();
     };

     var cohort_loaded = false;
     $(window).on('load', function(){
        if(is_cohort && !cohort_loaded) {
             var loadPending = load_filters(cohort_filters);
             loadPending.done(function(){
                cohort_loaded = true;
                $('input[type="checkbox"]').prop("disabled","disabled");
                $('div.ui-slider').siblings('button').prop('disabled','disabled');
                $('input#hide-zeros').prop("disabled","");
                $('input#hide-zeros').prop("checked",true);
                $('input#hide-zeros').triggerHandler('change');
             });
        } else if(Object.keys(filters_for_load).length > 0) {
            load_filters(filters_for_load);
        } /* TODO: check for localStorage key of saved filters from a login */
    });
});

