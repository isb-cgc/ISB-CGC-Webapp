
require.config({
    baseUrl: STATIC_FILES_URL + 'js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        plotly: 'libs/plotly-latest.min',
        base: 'base'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
    }
});


require(['jquery', 'jqueryui', 'bootstrap','plotly', 'base'],
    function($, jqueryui, bootstrap, plotly) {

    window.filterObj = {};
    window.projIdSel = [];
    window.studyIdSel = [];
    window.tcgaColls = ["tcga_blca", "tcga_brca", "tcga_cesc", "tcga_coad", "tcga_esca", "tcga_gbm", "tcga_hnsc", "tcga_kich", "tcga_kirc", "tcga_kirp", "tcga_lgg", "tcga_lihc", "tcga_luad", "tcga_lusc", "tcga_ov", "tcga_prad", "tcga_read", "tcga_sarc", "tcga_stad", "tcga_thca", "tcga_ucec"];


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




    window.setSlider = function(divName,reset,strt,end,isInt) {
        slideDiv= divName + "_slide";
        if (reset){
            strt = $('#'+slideDiv).slider("option","min");
            end = $('#'+slideDiv).slider("option","max");
        }
        $('#'+slideDiv).slider("values", "0", strt);
        $('#'+slideDiv).slider("values", "1", end);

        var inpDiv = divName + "_input";
        var val = String(strt)+"-"+String(end);

        // $("#inp_age_slide").value="0-120";
        document.getElementById(inpDiv).value = val;
        filtAtt = divName + '_btw'
        if (reset) {
            if (window.filterObj.hasOwnProperty("age_at_diagnosis_btw")) {
                delete window.filterObj["age_at_diagnosis_btw"];
            }
        }
        else{
            var attVal=[];
            if (isInt){
                attVal = [ parseInt(strt), parseInt(end)  ];
            }
            else{
                attVal = [ parseFloat(strt), parseFloat(end)  ];
            }
            window.filterObj[filtAtt] = attVal
        }

        mkFiltText();
        updateFacetsData(true);

    }

// Show more/less links on categories with >6 fiilters


    var mkFiltText = function() {
        var curKeys = Object.keys(filterObj).sort();
        oStringA = new Array();
        for (i = 0; i < curKeys.length; i++) {
            var curKey = curKeys[i];
            if ((curKey === 'collection_id') && (filterObj[curKey] === tcgaColls)) {
                continue;
            }
            if (curKey === 'age_at_diagnosis_btw') {
                var nstr = '<span class="filter-type">AGE</span> IN (<span class="filter-att">' + filterObj[curKey][0].toString() + '-' + filterObj[curKey][1].toString() + ')</span>';

            } else {
                var disp = curKey;
                var oArray = filterObj[curKey].sort().map(item => '<span class="filter-att">' + item.toString() + '</span>');
                //var nstr=disp+": "
                //nstr += oArray.join(", &ensp; ");
                nstr = '<span class="filter-type">' + disp + '</span>';
                nstr += 'IN (' + oArray.join("") + ')';

            }
            oStringA.push(nstr);
        }
        if (oStringA.length > 0) {
            var oString = oStringA.join(" AND");
            document.getElementById("search_def").innerHTML = oString;
        } else {
            document.getElementById("search_def").innerHTML = "";
        }
        //alert(oString);
    }

    window.showMoreGraphs =function() {
        $('.more-graphs').hide();
        $('.less-graphs').show();
        $('.related-graphs').animate({height: '400px'}, 800);
    }

    window.showLessGraphs =function() {
        $('.less-graphs').hide();
        $('.more-graphs').show();
        $('.related-graphs').animate({height: '200px'}, 800);
    }

    var mkSlider = function(divName,min,max,step,isInt) {

         var slideName = divName +'_slide';
         var inpName = divName + '_input';
         var strtInp = min + '-' + max;
         var filtName = divName + '_btw';
        $('#' + divName).append('<div id="'+ slideName + '"></div>  <input id="'+ inpName +'" type="text" value="'+ strtInp + '"> <button onclick=\'setSlider("'+divName+'",true,0,0,'+String(isInt)+')\'>Reset</button>');

        $('#'+slideName).slider({
            values: [min, max],
            step: step,
            min: min,
            max: max,
            range: true,
            slide: function (event, ui) {
                $('#' + inpName).val(ui.values[0] + "-" + ui.values[1]);
            },
            stop: function (event, ui) {
             //   updateSliderSelection(inpDiv, displaySet, header, attributeName, isInt);

             var val = $('#'+inpName)[0].value;
             var valArr = val.split('-');
             var attVal =[];
             if (isInt) {
                 attVal = [parseInt(valArr[0]), parseInt(valArr[1])];
             }
             else{
                 attVal = [parseFloat(valArr[0]), parseFloat(valArr[1])];
             }
             window.filterObj[filtName] = attVal;
             mkFiltText();
             updateFacetsData(true);

            }
        });
    }



    var editProjectsTableAfterFilter = function(tableId, scopeId) {
        var selectedElem = document.getElementById(scopeId).selectedOptions[0];
        var project_scope = selectedElem.value;
        var curCount = collection[project_scope];
        var tableElem = document.getElementById(tableId);
        var tableRows =$(tableElem).find('tr');
        for (var i=0;i<tableRows.length;i++){
            var curRow= $(tableRows)[i];
            var projId = curRow.id.replace('project_row_','');
            var newTot = String(window.collection[projId]);
            var newCohortCol = 'patient_col_'+String(projId);
            document.getElementById(newCohortCol).innerHTML = newTot;

            var patientElemId = 'patient_col_' + projId;

            if ((project_scope === 'All') || (project_scope === projId)) {
                 document.getElementById(patientElemId).innerHTML = String(window.collection[projId]);
                 curRow.classList.remove('hide');
                 if (project_scope === projId){
                     window.selItems.selProjects.push(projId);
                     curRow.classList.add("selected_grey");
                     window.selItems.selProjects = [projId];
                 }
            }
            else{
                if (window.selItems.selStudies.hasOwnProperty(projId)){
                    delete window.selItems.selStudies[projId];
                }
                curRow.classList.add('hide');
                curRow.classList.remove("selected_grey");
                document.getElementById(patientElemId).innerHTML = '0';
            }
        }


    }

    window.createProjectsTable = function(tableId) {
        tableElem = document.getElementById(tableId);
        //var newInnerHTML='<tr><th>Project Name</th><th>Total # of Patients</th><th># of Patients(this cohort)</th></tr>';
        var newInnerHTML = '';
        //projectH = Object.keys(originalDataCounts.collection_id).sort();
        projectH = tcgaColls;
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
    }

    var resetSeriesAndStudiesTables = function(studyId, seriesId) {

        tableElem = document.getElementById(studyId);
        //var newInnerHTML = '<tr><th>Project Name</th><th>Patient Id</th><th>Study Id</th><th>Study Description</th></tr>';
        tableElem.innerHTML = '';

        tableElem = document.getElementById(seriesId);
        //var newInnerHTML = '<tr> <th>Study Id</th><th>Series Id</th><th>Modality</th><th>Body Part Examined</th> </tr>';
        tableElem.innerHTML = '';
    }

    window.toggleProj = function(projRow, projectId) {
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
            if (projectId in window.selItems.selStudies){
                delete window.selItems.selStudies[projectId];
            }
            removeStudiesAndSeries(projectId, "studies_table","series_table")

        } else {
            $(projRow).addClass("selected_grey");
            window.selItems.selProjects.push(projectId);
            addStudyOrSeries([projectId], [], "studies_table", false);
        }
    }

    window.toggleStudy = function(studyRow, studyId, projectId) {

        if (studyRow.classList.contains("selected_grey")) {
            $(studyRow).removeClass("selected_grey");
            removeSeries(studyRow.id, "series_table");
            if (window.selItems.selStudies.hasOwnProperty(projectId)){

                   studyPos = window.selItems.selStudies[projectId].indexOf(studyId);
                   if (studyPos > -1) {
                       window.selItems.selStudies[projectId].splice(studyPos, 1);
                       if (window.selItems.selStudies[projectId].length ==0){
                           delete window.selItems.selStudies[projectId];
                       }
                   }
             }


        } else {

            if (!(window.selItems.selStudies.hasOwnProperty(projectId))){
                   window.selItems.selStudies[projectId] = new Array();
             }
            window.selItems.selStudies[projectId].push(studyId);

            $(studyRow).addClass("selected_grey");
            addStudyOrSeries([projectId], [studyId], "series_table", false);
        }
    }

    window.removeStudiesAndSeries =  function(projectId, studyTableId, seriesTableId) {
        var pclass = "project_" + projectId;
        var studiesTable = document.getElementById(studyTableId);
        $('#' + studyTableId).find('.project_' + projectId).remove();
            if (window.selItems.selStudies.hasOwnProperty(projectId)){
                delete window.selItems.selStudies[projectId];
             }

        removeSeries(pclass, seriesTableId);
    }

    window.removeSeries = function(selClass, seriesTableId) {
        $('#' + seriesTableId).find('.' + selClass).remove();
    }

    var changeAjax = function(isIncrement){
        if (isIncrement){
            $('#number_ajax')[0].value = String(parseInt($('#number_ajax')[0].value)+1);
        }
        else{
            $('#number_ajax')[0].value = String(parseInt($('#number_ajax')[0].value)-1);
        }
        //alert($('#number_ajax')[0].value)

        if ( $('#number_ajax')[0].value === '0'){
            $('.spinner').hide();
        }
        else{
            $('.spinner').show();
        }

    }

    var pretty_print_id = function(id){
        var newId = id.slice(0,12)+'...'+id.slice(id.length-12,id.length);
        return newId;
    }

    window.addStudyOrSeries = function(projectIdArr, studyIdArr, tableId, refresh) {
        changeAjax(true);
        var curSelStudiesDic = new Object();
        var newSelStudies = new Object();

        var curFilterObj = JSON.parse(JSON.stringify(filterObj));
        curFilterObj.collection_id = projectIdArr;
        var isSeries = false;
        if (studyIdArr.length > 0) {
            curFilterObj.StudyInstanceUID = studyIdArr;
            isSeries = true;
        }
        else if(refresh){
            for (projId in window.selItems.selStudies){
                curSelStudiesDic[projId] = new Object();
                for (var i=0;i<window.selItems.selStudies[projId].length;i++){
                     var curStudy =  window.selItems.selStudies[projId][i];
                     curSelStudiesDic[projId][curStudy] = 1;
                }
            }
        }

        var filterStr = JSON.stringify(curFilterObj);
        var fields = ["collection_id", "PatientID", "StudyInstanceUID", "StudyDescription", "StudyDate"];
        var collapse_on = 'StudyInstanceUID'
        var order_docs =["collection_id", "PatientID", "StudyInstanceUID"];
        if (isSeries) {
            fields = ["collection_id", "PatientID", "StudyInstanceUID", "SeriesInstanceUID", "Modality", "BodyPartExamined", "SeriesNumber","SeriesDescription"];
            collapse_on = 'SeriesInstanceUID'
            order_docs =["collection_id", "PatientID", "StudyInstanceUID","SeriesNumber"];
        }

        var fieldStr = JSON.stringify(fields);
        var orderDocStr =  JSON.stringify(order_docs);
        let url = '/explore/?counts_only=False&is_json=True&collapse_on=' + collapse_on + '&with_clinical=False&filters=' + filterStr + '&fields=' + fieldStr + '&order_docs=' + orderDocStr;
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
                    var fetchUrl = '/projects/chc-tcia/locations/us-central1/datasets/' + projectId.replace('_', '-') + '/dicomStores/' + projectId.replace('_', '-') + '/study/' + studyId;
                    var hrefTxt = '<a href="' + fetchUrl + '" target="_blank">' + ppStudyId + '</a><span class="tooltiptext_ex">' + studyId + '</span>';
                    var pclass = 'project_' + projectId;
                    var newHtml='';
                    if (isSeries) {
                        var seriesId = curData.SeriesInstanceUID;
                        var ppSeriesId = pretty_print_id(seriesId);
                        var seriesNumber = String(curData.SeriesNumber);
                        var seriesDescription = curData.SeriesDescription;
                        var bodyPartExamined = curData.BodyPartExamined;
                        var modality = curData.Modality;
                        var rowId = 'series_' + seriesId.replace(/\./g, '-')
                        var studyClass = 'study_' + studyId.replace(/\./g, '-');
                        var fetchUrlSeries = fetchUrl+'?SeriesInstanceUID='+seriesId;
                        var hrefSeriesTxt = '<a href="' + fetchUrlSeries + '" target="_blank">' + ppSeriesId + '</a><span class="tooltiptext_ex">' + seriesId + '</span>';
                        var seriesTxt = ppSeriesId + '<span class="tooltiptext_ex">' + seriesId + '</span>';
                        newHtml = '<tr id="' + rowId + '" class="' + pclass + ' ' + studyClass + ' text_head"><td class="col1 tooltip_ex">' + hrefTxt + '</td><td>' + seriesNumber + '</td><td class="col2 tooltip_ex">' + seriesTxt + '</td><td class="col1">' + modality + '</td><td class="col1">' + bodyPartExamined + '</td><td>' + seriesDescription + '</td></tr>';

                    } else {

                        var studyDescription = curData.StudyDescription;
                        //var studyDate = curData.StudyDate;
                        var rowId = 'study_' + studyId.replace(/\./g, '-');

                        if ( refresh && (projectId in curSelStudiesDic) && (studyId in curSelStudiesDic[projId]) ){
                             if (!(projectId in newSelStudies)){
                                  newSelStudies[projectId] = new Array();
                             }
                              newSelStudies[projectId].push(studyId);

                             newHtml = '<tr id="' + rowId + '" class="' + pclass + ' text_head selected_grey" onclick="(toggleStudy(this,\'' + studyId + '\',\'' + projectId + '\'))"><td class="col1">' + projectId + '</td><td class="col1">' + patientId + '</td><td class="col2 tooltip_ex">' + hrefTxt + '</td><td class="col1">' + studyDescription + '</td></tr>'

                        }
                        else {
                             newHtml = '<tr id="' + rowId + '" class="' + pclass + ' text_head" onclick="(toggleStudy(this,\'' + studyId + '\',\'' + projectId + '\'))"><td class="col1">' + projectId + '</td><td class="col1">' + patientId + '</td><td class="col2 tooltip_ex">' + hrefTxt + '</td><td class="col1">' + studyDescription + '</td></tr>'
                        }
                    }
                    //var rowId='study_'+projectId+'_'+patientIndex[patientId].toString()+"_"+studyIndex[studyId].toString();


                    //document.getElementById(tableId).innerHTML += newHtml;
                    $('#'+tableId).append(newHtml);
                }
                /* nend = new Date().getTime();
                diff = nend - nstart;
                alert(diff); */
                if (refresh && !isSeries){
                    window.selItems.selStudies = newSelStudies;
                }
                changeAjax(false);

            },
            error: function () {
                changeAjax(false);
                console.log("problem getting data");
            }

        });


    }

    window.addSeries = function(studyId, studyClass, seriesTableId) {
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
            var fetchUrl = '/projects/chc-tcia/locations/us-central1/datasets/' + projectId.toLowerCase() + '/dicomStores/' + projectId.toLowerCase() + '/study/' + studyId;
            var hrefTxt = '<a href="' + fetchUrl + '">' + studyId + '</a>';

            //var sclass='study_'+projectId+'_'+patientIndex[patientId].toString()+"_"+studyIndex[studyId].toString();
            var newHtml = '<tr id="' + rowId + '" class="' + pclass + ' ' + studyClass + ' text_head"><td>' + hrefTxt + '</td><td>' + seriesId + '</td><td>' + seriesNumber + '</td><td>' + modality + '</td><td>' + bodypart + '</td></tr>'
            $('#' + seriesTableId + ' tr:last').after(newHtml);
        });


    }




    var resolveRelatedPlotsCatWCountsRng=function(plotData, plotId, lbl, pHeader) {
        phA = new Array();
        ctA = new Array();

        for (i = 0; i < pHeader.length; i++) {
            var key = pHeader[i][0];
            var nm = pHeader[i][1];
            var ct = 0;
            if (plotData.hasOwnProperty(key)) {
                ct = plotData[key];
            }
            phA.push(nm)
            ctA.push(ct)
        }

        var pdata = [
            {
                x: phA,
                y: ctA,
                type: 'bar'
            }
        ];

        plotLayout.title = lbl
        Plotly.newPlot(plotId, pdata, plotLayout, {displayModeBar: false});

       /* document.getElementById(plotId).on('plotly_click', function (data) {
            alert('here');
        }); */


    };



    window.updateSearchScope = function(searchElem) {
        var project_scope = searchElem.selectedOptions[0].value;
        //document.getElementById('selected_project').innerHTML=project_scope;
        if (project_scope === 'All') {
            /*if (filterObj.hasOwnProperty('collection_id')){
                delete filterObj['collection_id']
            }*/
            filterObj['collection_id'] = tcgaColls;
        } else {
            filterObj['collection_id'] = [project_scope];

        }
        //document.getElementById('total').innerHTML = window.collection[project_scope];
        mkFiltText();
        updateFacetsData(true);



    }

    var resetFilterAttr = function(filterCat, filtDic){
         filtElem = $('#'+filterCat)[0];
         selElements = $('#'+filterCat).find('input:checkbox');
         for (var i=0;i<selElements.length;i++){
             selElement = selElements[i];
             if (filtDic.hasOwnProperty(selElement.value)){
                 selElement.checked = true;
             }
             else{
                 selElement.checked = false;
             }
         }

    }

    var resetSearchScope = function(scopeArr, searchId){
        var selectElem= $('#'+searchId)[0];
        var selIndex = 0;
        if (scopeArr === window.tcgaColls){
            selIndex = 0;
        }
        else{
            selProject = scopeArr[0];
            selectionArr = $(selectElem).children("option");
            for (var i=0;i<selectionArr.length;i++){
                selectItem = selectionArr[i];
                if (selProject === selectItem.value){
                    selIndex = i;
                    break;
                }
            }

        }
        selectElem.selectedIndex=selIndex;
    }





    var updateSliderSelection = function(inpDiv, displaySet, header, attributeName, isInt) {
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

    }

    window.selectHistoricFilter = function(num){
        //alert('previous');
        window.histIndex = window.histIndex + num ;
        histObj = window.filtHistory[window.histIndex];
        window.filterObj = JSON.parse(JSON.stringify(histObj.filterObj));
        window.selItems = JSON.parse(JSON.stringify(histObj.selItems));
        if ( (histObj.filterObj.hasOwnProperty('collection_id')) && (histObj.filterObj['collection_id']===window.tcgaColls)){
            window.filterObj['collection_id'] = window.tcgaColls;
        }
        var filterCatsArr = new Array();
        filterCatsArr.push(findFilterCats('search_orig_set'));
        filterCatsArr.push(findFilterCats('search_related_set'));
        for (var i=0;i<filterCatsArr.length;i++){
            filterCats = filterCatsArr[i];
            for (var j=0;j<filterCats.length;j++){
                filterCat = filterCats[j];
                filtdic = {}
                if (histObj.filterObj.hasOwnProperty(filterCat)){
                    for (var k=0;k<histObj.filterObj[filterCat].length;k++){
                        filtAtt = histObj.filterObj[filterCat][k];
                        filtdic[filtAtt]=1;
                    }
                }
                resetFilterAttr(filterCat,filtdic);
            }
        }
        resetSearchScope(histObj.filterObj.collection_id,'project_scope');
        mkFiltText();
        updateFacetsData(false);

    }
    var updateCollectionTotals = function(total,dic){
         for (var item in window.collection) {
             if (item === 'All'){
                  window.collection[item] = parseInt(total);
             }
             else if (dic.hasOwnProperty(item)){
                 window.collection[item] = parseInt(dic[item].count);
             }
             else{
                 window.collection[item] = '0';
             }
        }

         var selectedElem = document.getElementById('project_scope').selectedOptions[0];
         var curCount = 0;
         var project_scope = selectedElem.value;
         curCount = window.collection[project_scope];
         document.getElementById('total').innerHTML = String(curCount);
    }

    var updateFacetsData = function(newFilt) {
        changeAjax(true);

        var url = '';
        if (Object.keys(filterObj).length === 0) {
            url = '/explore/?counts_only=True&is_json=true&is_dicofdic=True';
        } else {
            url = '/explore/?counts_only=True&is_json=true&is_dicofdic=True&filters=' + JSON.stringify(filterObj);
        }
        url = encodeURI(url);

        $.ajax({
            url: url,
            dataType: 'json',
            type: 'get',
            contentType: 'application/x-www-form-urlencoded',
            success: function (data) {
                updateCollectionTotals(data.total, data.origin_set.attributes.collection_id);
                updateFilterSelections('search_orig_set',data.origin_set.attributes);
                updateFilterSelections('search_related_set',data.related_set.attributes);
                createPlots('search_orig_set');
                createPlots('search_related_set');
                editProjectsTableAfterFilter('projects_table','project_scope');
                resetSeriesAndStudiesTables ('series_table', 'studies_table');
                var studyArr = new Array();
                for (projId in window.selItems.selStudies){
                    studyArr.push.apply(studyArr, window.selItems.selStudies[projId]);
                }
                if (window.selItems.selProjects.length >0) {
                    addStudyOrSeries(window.selItems.selProjects, [], "studies_table", true);
                }
                if (studyArr.length>0) {
                    addStudyOrSeries(window.selItems.selProjects, studyArr, "series_table", true);
                }

                if (newFilt) {
                    histObj = new Object();
                    histObj.selItems = JSON.parse(JSON.stringify(window.selItems));
                    histObj.filterObj = JSON.parse(JSON.stringify(window.filterObj));
                    if ( (window.filterObj.hasOwnProperty('collection_id')) && (window.filterObj['collection_id']===window.tcgaColls)){
                        histObj.filterObj['collection_id'] = window.tcgaColls;
                    }

                    window.filtHistory.push(histObj);

                    if (window.filtHistory.length > window.histMaxLength){
                        window.filtHistory.shift();
                    }
                    window.histIndex = window.filtHistory.length -1;
                }

                if ( (window.filtHistory.length-1) > window.histIndex){
                    $('#next').show();
                }
                else{
                    $('#next').hide();
                }
                if ( (window.filtHistory.length>0) && (window.histIndex>0)){
                    $('#previous').show();
                }
                else{
                    $('#previous').hide();
                }


               changeAjax(false);

            },
            error: function () {
                changeAjax(false);
                console.log("problem getting data");

            }

        });
    }



     var plotCategoricalData=function(plotId, lbl, plotData) {

        xdata= new Array();
        ydata = new Array();
        for (var i=0;i<plotData.dataCnt.length;i++){
            if (plotData.dataCnt[i] >0){
                ydata.push(plotData.dataCnt[i]);
                xdata.push(plotData.dataLabel[i]);
            }
        }
        var data = [{
       values: ydata,
        labels: xdata,
        type: 'pie',
        textposition: 'inside',
        textinfo: 'none',
        sort:false
       }];

       var layout = {
        height: 400,
         width: 500
        };
      pieLayout.title = lbl.toUpperCase().replace(/_/g, " ");
Plotly.newPlot(plotId, data, pieLayout,{displayModeBar: false});
        /*
        var pdata = [
            {
                x: plotData.dataLabel,
                y: plotData.dataCnt,
                type: 'pie'
            }
        ];

        plotLayout.title = lbl;
        Plotly.newPlot(plotId, pdata, plotLayout, {displayModeBar: false});*/


        document.getElementById(plotId).on('plotly_click', function (data, plotId) {
            var chartid = data.event.path[7].id;
            var filterId = chartid.replace("_chart","");
            if (filterId === 'age_at_diagnosis'){
                var sel = data.points[0].x;
                var selArr = sel.split(' To ');
                var strt = parseInt((selArr[0] === '*') ? '0': selArr[0]);
                var end = parseInt((selArr[0] === '*') ?'0': selArr[1]);
                setSlider(filterId,false,strt,end,true);

            }
            else {
                //alert(String(data.event.path[6].id));
                var label = data.points[0].label;
                var listId = filterId + '_list';
                var inputList = $('#'+listId).find(':input');
                for (var i=0;i<inputList.length;i++){
                   var curLabel = $(inputList[i]).parent().children()[1].innerHTML;
                    if (label === curLabel){
                        inputList[i].checked = true;
                    }
                    else{
                        inputList[i].checked = false;
                    }
                }
                handleFilterSelectionUpdate(filterId);
            }
        });

    };

     var findFilterCats = function(id){
        filterCats = new Array();
        listElems  = $('#' + id).find('.list-group-item__body');
         for (i=0;i<listElems.length;i++) {
             elem = listElems.get(i);
             nm = elem.id;
             filterCats.push(nm);
         }
         return filterCats
    }



    var parseFilterForCounts = function(id) {
        var dataLabel = new Array();
        var dataCnt = new Array();

        listElems = $('#' + id).find('.checkbox')
        for (var i=0;i<listElems.length;i++) {
            elem=listElems.get(i);
            spans = $(elem).find('span')
            lbl = spans.get(0).innerHTML;
            cnt = parseInt(spans.get(1).innerHTML);
            dataLabel.push(lbl);
            if ($(spans.get(1)).hasClass("plotit")) {
                dataCnt.push(cnt);
            }
            else{
                dataCnt.push(0);
            }
        }
        return {'dataLabel': dataLabel, 'dataCnt': dataCnt}
    }

    var createPlots = function(id){
        var filterCats = findFilterCats(id);
        for (var i=0;i<filterCats.length;i++){
             filterCat = filterCats[i];
             filterData = parseFilterForCounts(filterCat);

             plotId = filterCat+"_chart";
             lbl = $('#'+filterCat+'_heading').children()[0].innerText;

             plotCategoricalData(plotId, lbl, filterData);

        }

     }

     var updateFilters = function(filterCat,dic,dataFound){
         var allFilters = $('#'+filterCat).find('input');
         var checkedFilters = $('#'+filterCat).find('input:checked');
         var useAll = ( (checkedFilters.length==0) ? true : false)

         for (var i = 0; i < allFilters.length; i++) {
             var elem = allFilters.get(i);
             var val = $(elem)[0].value;
             var checked =$(elem)[0].checked;

             var spans = $(elem).parent().find('span');
             var lbl = spans.get(0).innerHTML;
             var cnt = parseInt(spans.get(1).innerHTML);

             if( dataFound && dic.hasOwnProperty(val)){
                 spans.get(1).innerHTML = String(dic[val].count);

             }
             else{
                 spans.get(1).innerHTML = '0';
             }
             if (checked || useAll){
                     $(spans.get(1)).addClass('plotit');
                 }
             else{
                 $(spans.get(1)).removeClass('plotit');
             }
         }

    }


     var updateFilterSelections = function(id,dicofdic){
         filterCats = findFilterCats(id);
         for (i=0;i<filterCats.length;i++){
             cat=filterCats[i]
             if (dicofdic.hasOwnProperty(cat)) {
                 updateFilters(filterCats[i], dicofdic[cat], true);
             }
             else {
                 updateFilters(filterCats[i], '', false);
             }
         }
   }
     var handleFilterSelectionUpdate = function(filterCat) {
        var numFilters = $('#'+filterCat).find('input').length;
        var checkedFilters = $('#'+filterCat).find('input:checked');

        var attributeVals = new Array();
        checkedFilters.each(function() {
            attributeVals.push( $(this)[0].value );
         });

         if (attributeVals.length>0){
             filterObj[filterCat] = attributeVals;
         }
         else if(filterObj.hasOwnProperty(filterCat)){
             delete filterObj[filterCat];
         }

        mkFiltText();
        updateFacetsData(true);

    }

    var filterItemBindings = function (filterId) {
        $('#' + filterId).find('.checkbox').find(':input').on('click', function () {
            handleFilterSelectionUpdate(filterId);
        });

        $('#' + filterId).find('.show-more').on('click', function () {
            $('#' + filterId).find('.extra-values').show();
            $('#' + filterId).find('.less-checks').show();
            $('#' + filterId).find('.more-checks').hide();
        });


        $('#' + filterId).find('.show-less').on('click', function () {
            $('#' + filterId).find('.extra-values').hide();
            $('#' + filterId).find('.more-checks').show();
            $('#' + filterId).find('.less-checks').hide();
        });

        $('#' + filterId).find('.check-all').on('click', function () {
            $('#' + filterId).find('.checkbox').find('input').prop('checked', true);
           handleFilterSelectionUpdate(filterId);
            //$('#'+filterId).find('.checkbox').find('input').each(function(){
            //  $(this).triggerHandler('change');
            //});
        });

        $('#' + filterId).find('.uncheck-all').on('click', function () {
            $('#' + filterId).find('.checkbox').find('input').prop('checked', false);
            handleFilterSelectionUpdate(filterId);
            //$('#'+filterId).find('.checkbox').find('input').each(function(){
            //  $(this).triggerHandler('change');
            //});
        });


    }


     var addFilterBindings = function(id){
         var filterCats = findFilterCats(id);
         for (var i=0;i<filterCats.length;i++){
             filterItemBindings(filterCats[i]);
        }
     }



     $(document).ready(function () {
            window.filterObj.collection_id = window.tcgaColls;
            window.selItems = new Object();
            window.selItems.selStudies = new Object();
            window.selItems.selProjects = new Array();
            window.histIndex  = 0;
            window.histMaxLength = 6;
            histObj = new Object();
            histObj.selItems = JSON.parse(JSON.stringify(window.selItems));
            histObj.filterObj = JSON.parse(JSON.stringify(window.filterObj));
            histObj.filterObj.collection_id = window.tcgaColls;
            window.filtHistory = new Array();
            window.filtHistory.push(histObj);
            createPlots('search_orig_set');
            createPlots('search_related_set');
            addFilterBindings('search_orig_set');
            addFilterBindings('search_related_set');


            $('#age_at_diagnosis_list').addClass('hide');
            $('#age_at_diagnosis').find('.more-checks').addClass('hide');
            $('#age_at_diagnosis').find('.less-checks').addClass('hide');
            mkSlider('age_at_diagnosis',0,120,1,true);




            //$("#number_ajax").bind("change", function(){ alert($()this.val)} );

        }
    );



});