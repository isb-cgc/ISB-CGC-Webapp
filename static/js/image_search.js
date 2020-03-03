
require.config({
    baseUrl: '/static/js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security/script',
        plotly: 'libs/plotly-latest.min',

    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
    }
});


require(['jquery', 'jqueryui', 'session_security', 'bootstrap','plotly'], function($, jquery, jqueryui, bootstrap, session_security, plotly,  _)
{



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


    window.resetAge = function() {
        $("#age_slide").slider("values", "0", 0);
        $("#age_slide").slider("values", "1", 120);
        // $("#inp_age_slide").value="0-120";
        document.getElementById("inp_age_slide").value = "0-120";
        if (filterObj.hasOwnProperty("age_at_diagnosis_btw")) {
            delete filterObj["age_at_diagnosis_btw"];
        }

        mkFiltText();
        fetchCountData(false);

    }

// Show more/less links on categories with >6 fiilters

    var filterItemBindings = function (filterId, checkBoxDiv, displaySet, header, attributeName, isImageAttr, isRangeAttr) {
        $('#' + filterId).find('.checkbox').find(':input').on('click', function () {
            updateFilterSelection(checkBoxDiv, displaySet, header, attributeName, isImageAttr, isRangeAttr);
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
            updateFilterSelection(checkBoxDiv, displaySet, header, attributeName, isImageAttr, isRangeAttr);
            //$('#'+filterId).find('.checkbox').find('input').each(function(){
            //  $(this).triggerHandler('change');
            //});
        });

        $('#' + filterId).find('.uncheck-all').on('click', function () {
            $('#' + filterId).find('.checkbox').find('input').prop('checked', false);
            updateFilterSelection(checkBoxDiv, displaySet, header, attributeName, isImageAttr, isRangeAttr);
            //$('#'+filterId).find('.checkbox').find('input').each(function(){
            //  $(this).triggerHandler('change');
            //});
        });


    }



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

    var mkSlider = function(divName, inpDiv, displaySet, header, attributeName, isInt) {
        $("#" + divName).slider({
            values: [0, 120],
            step: 1,
            min: 0,
            max: 120,
            range: true,
            slide: function (event, ui) {
                $("#" + inpDiv).val(ui.values[0] + "-" + ui.values[1]);
            },
            stop: function (event, ui) {
                updateSliderSelection(inpDiv, displaySet, header, attributeName, isInt);
            }
        });
    }


    window.editProjectsTable = function(tableId, scopeId) {
        var project_scope = document.getElementById(scopeId).selectedOptions[0].value;

        var tableElem = document.getElementById(tableId);
        var countElems = $(tableElem).find('.projects_table_num_cohort');
        //countElems.forEach( function(element) { element.innerHTML='0'});
        for (i = 0; i < countElems.length; i++) {
            countElems[i].innerHTML = '0';
        }

        var projKeys = Object.keys(originalDataCounts.collection_id);
        for (i = 0; i < projKeys.length; i++) {
            var idStr = projKeys[i]
            var countStr = originalDataCounts.collection_id[idStr].toString();
            var patientElemId = 'patient_col_' + idStr;
            if (document.getElementById(patientElemId)) {
                if ((project_scope === 'All') || (project_scope === idStr)) {
                    document.getElementById(patientElemId).innerHTML = countStr
                }
            }
            var projectElemId = 'project_row_' + idStr;
            if (document.getElementById(projectElemId)) {
                if ((project_scope === 'All') || (project_scope === idStr)) {
                    document.getElementById(projectElemId).classList.remove('hide');
                    if (project_scope === idStr){
                        document.getElementById(projectElemId).classList.add("selected_grey");
                        window.projIdSel = [idStr];
                        addStudyOrSeries([idStr], [], "studies_table");
                     }
                } else {
                    document.getElementById(projectElemId).classList.add('hide');
                }

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

    window.resetTables = function(projectId, studyId, seriesId) {

        projRows = $('#' + projectId).find(".selected_grey");
        for (i = 0; i < projRows.length; i++) {
            projRow = projRows[i];
            $(projRow).removeClass("selected_grey");
        }
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
            projPos = window.projIdSel.indexOf(projectId)
            if (projPos > -1) {
                projIdSel.splice(projPos, 1);
            }
            removeStudiesAndSeries(projectId, "studies_table")

        } else {
            $(projRow).addClass("selected_grey");
            window.projIdSel.push(projectId);
            addStudyOrSeries([projectId], [], "studies_table");
        }
    }

    window.toggleStudy = function(studyRow, studyId, projectId) {
        if (studyRow.classList.contains("selected_grey")) {
            $(studyRow).removeClass("selected_grey");
            removeSeries(studyRow.id, "series_table");
        } else {
            $(studyRow).addClass("selected_grey");
            addStudyOrSeries([projectId], [studyId], "series_table", false);
        }
    }

    window.removeStudiesAndSeries =  function(projectId, studyTableId, seriesTableId) {
        var pclass = "project_" + projectId;
        var studiesTable = document.getElementById(studyTableId);
        $('#' + studyTableId).find('.project_' + projectId).remove();
        removeSeries(pclass, 'series_table');
    }

    window.removeSeries = function(selClass, seriesTableId) {
        $('#' + seriesTableId).find('.' + selClass).remove();
    }

    window.addStudyOrSeries = function(projectIdArr, studyIdArr, tableId, refresh) {

        curFilterObj = JSON.parse(JSON.stringify(filterObj));
        curFilterObj.collection_id = projectIdArr;
        var isSeries = false;
        if (studyIdArr.length > 0) {
            curFilterObj.StudyInstanceUID = studyIdArr;
            isSeries = true;
        }

        filterStr = JSON.stringify(curFilterObj);
        fields = ["collection_id", "PatientID", "StudyInstanceUID", "StudyDescription", "StudyDate"];
        collapse_on = 'StudyInstanceUID'
        if (isSeries) {
            fields = ["collection_id", "PatientID", "StudyInstanceUID", "SeriesInstanceUID", "Modality", "BodyPartExamined", "SeriesNumber"];
            collapse_on = 'SeriesInstanceUID'
        }
        fieldStr = JSON.stringify(fields);
        let url = '/idc/filtered/?counts_only=False&collapse_on=' + collapse_on + '&with_clinical=False&filters=' + filterStr + '&fields=' + fieldStr;
        url = encodeURI(url);

        $.ajax({
            url: url,
            dataType: 'json',
            type: 'get',
            contentType: 'application/x-www-form-urlencoded',
            success: function (data) {
                //nstart = new Date().getTime();
                for (i = 0; i < data['docs'].length; i++) {
                    curData = data['docs'][i]
                    var projectId = curData.collection_id;
                    var patientId = curData.PatientID;
                    var studyId = curData.StudyInstanceUID;
                    var fetchUrl = '/projects/chc-tcia/locations/us-central1/datasets/' + projectId.replace('_', '-') + '/dicomStores/' + projectId.replace('_', '-') + '/study/' + studyId;
                    var hrefTxt = '<a href="' + fetchUrl + '" target="_blank">' + studyId + '</a>';
                    var pclass = 'project_' + projectId;
                    if (isSeries) {
                        var seriesId = curData.SeriesInstanceUID;
                        var bodyPartExamined = curData.BodyPartExamined;
                        var modality = curData.Modality;
                        var rowId = 'series_' + seriesId.replace(/\./g, '-')
                        var studyClass = 'study_' + studyId.replace(/\./g, '-');
                        var newHtml = '<tr id="' + rowId + '" class="' + pclass + ' ' + studyClass + ' text_head"><td class="col1">' + hrefTxt + '</td><td class="col2">' + seriesId + '</td><td class="col1">' + modality + '</td><td class="col1">' + bodyPartExamined + '</td></tr>'

                    } else {

                        var studyDescription = curData.StudyDescription;
                        //var studyDate = curData.StudyDate;
                        var rowId = 'study_' + studyId.replace(/\./g, '-');
                        var newHtml = '<tr id="' + rowId + '" class="' + pclass + ' text_head" onclick="(toggleStudy(this,\'' + studyId + '\',\'' + projectId + '\'))"><td class="col1">' + projectId + '</td><td class="col1">' + patientId + '</td><td class="col2">' + hrefTxt + '</td><td class="col1">' + studyDescription + '</td></tr>'

                    }
                    //var rowId='study_'+projectId+'_'+patientIndex[patientId].toString()+"_"+studyIndex[studyId].toString();


                    //document.getElementById(tableId).innerHTML += newHtml;
                    $('#'+tableId).append(newHtml);
                }
                /* nend = new Date().getTime();
                diff = nend - nstart;
                alert(diff); */

            },
            error: function () {
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


    var resolveAllPlots = function() {
        plotCategoricalData('modality', 'modality_chart', 'Modality', originalDataCounts['Modality'], 'Modality');
        plotCategoricalData('body_part', 'body_part_examined_chart', 'BodyPartExamined', originalDataCounts['BodyPartExamined'], 'BodyPartExamined');

        plotCategoricalData('disease', 'disease_code_chart', 'Disease Code', clinicalDataCounts['disease_code'], 'disease_code');
        plotCategoricalData('vital_status', 'vital_status_chart', 'Vital Status', clinicalDataCounts['vital_status'], 'vital_status');
        plotCategoricalData('gender', 'gender_chart', 'Gender', clinicalDataCounts['gender'], 'gender');
        var aHeader = [['* to 10', '0 to 10'], ['10 to 20', '11 to 20'], ['20 to 30', '21 to 30'], ['30 to 40', '31 to 40'], ['40 to 50', '41 to 50'], ['50 to 60', '51 to 60'], ['60 to 70', '61 to 70'], ['70 to 80', '71 to 80'], ['80 to *', '81+'], ['None', 'None']]
        resolveRelatedPlotsCatWCountsRng(clinicalDataCounts['age'], "age_chart", "Age", aHeader);

        plotCategoricalData('race', 'race_chart', 'Race', clinicalDataCounts['race'], 'race');
        plotCategoricalData('ethnicity', "ethnicity_chart", "Ethnicity", clinicalDataCounts['ethnicity'], "ethnicity");

    }

     var plotCategoricalData=function(elem, plotId, lbl, dataDic, filterA) {
        var dataList = document.getElementById(elem).getElementsByTagName("ul")[0].getElementsByTagName("input");
        var dataHeaders = new Array();
        var dataValues = new Array();
        var dataValueMp = new Object();
        var dataCount = new Array();

        for (i = 0; i < dataList.length; i++) {
            var input = dataList[i];
            var dataHeader = input.innerHTML;
            dataHeaders.push(dataHeader);
            dataCount[i] = 0;
            var dataVal = input.value;
            dataValueMp[dataVal] = i;
            dataValues.push(dataVal);
            if (dataDic.hasOwnProperty(dataVal) && (!filterObj.hasOwnProperty(filterA) || filterObj[filterA].indexOf(dataVal) > -1)) {
                dataCount[i] = dataDic[dataVal];
            }
        }

        var pdata = [
            {
                x: dataValues,
                y: dataCount,
                type: 'bar'
            }
        ];

        plotLayout.title = lbl;
        Plotly.newPlot(plotId, pdata, plotLayout, {displayModeBar: false});

        document.getElementById(plotId).on('plotly_click', function (data) {
            alert('here');
        });

    };

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

        document.getElementById(plotId).on('plotly_click', function (data) {
            alert('here');
        });


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
        mkFiltText();
        fetchCountData(false);

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

    var updateFilterSelection = function(checkBoxDiv, displaySet, header, attributeName, isImageAttr, isRangeAttr) {
        var newText = "&emsp;&emsp;" + header + ": ";
        var checkBoxElem = document.getElementById(checkBoxDiv);

        var listItems = checkBoxElem.getElementsByTagName('li');
        var numChecked = 0;
        var attributeVals = new Array();
        for (i = 0; i < listItems.length; i++) {
            checkBoxElem = listItems[i].getElementsByTagName('input')[0];
            if (checkBoxElem.checked) {
                if (numChecked > 0) {
                    newText += ", ";
                }
                newText += listItems[i].innerText;
                attributeVals.push(checkBoxElem.value)
                numChecked++;
            }
        }
        if (numChecked === 0) {
            //newText="&emsp;&emsp;"+header+": All";
            delete filterObj[attributeName];
        } else {
            filterObj[attributeName] = attributeVals;
        }
        //document.getElementById(displaySet).innerHTML=newText;
        mkFiltText();
        fetchCountData(false);

    }

    var fetchCountData = function(refresh) {
        var url = '';
        if (Object.keys(filterObj).length === 0) {
            url = '/idc/filtered/?counts_only=True';
        } else {
            url = '/idc/filtered/?counts_only=True&filters=' + JSON.stringify(filterObj);
        }
        url = encodeURI(url);

        $.ajax({
            url: url,
            dataType: 'json',
            type: 'get',
            contentType: 'application/x-www-form-urlencoded',
            success: function (data) {
                clinicalDataCounts = data['clinical'];
                originalDataCounts = data['facets'];

                var isEdit = true;
                if (refresh) {


                    filter = new Object();

                    diseaseCodeH = Object.keys(data['clinical']['disease_code']).sort();
                    nonePos = diseaseCodeH.indexOf('None');
                    diseaseCodeH.splice(nonePos, 1);
                    diseaseCodeH.push('None');


                    raceH = Object.keys(data['clinical']['race']).sort();
                    nonePos = raceH.indexOf('None');
                    raceH.splice(nonePos, 1);
                    raceH.push('None');
                    ethnicityH = Object.keys(data['clinical']['ethnicity']).sort();

                    nonePos = ethnicityH.indexOf('None');
                    ethnicityH.splice(nonePos, 1);
                    ethnicityH.push('None');
                    isEdit = false;
                    constructClinicalFilterOptions();
                    createProjectsTable("projects_table");
                    mkSlider('age_slide', 'inp_age_slide', 'age_set', 'Age', 'age_at_diagnosis_btw', true);
                } else {
                    resetTables('projects_table', 'studies_table', 'series_table');
                    editProjectsTable('projects_table', 'project_scope');
                }
                resolveAllPlots();


            },
            error: function () {
                console.log("problem getting data");
            }
        });
    }

    var constructClinicalFilterOptions = function() {

        projectElem = document.getElementById("project_scope");
        projList = tcgaColls;
        for (i = 0; i < projList.length; i++) {
            nm = projList[i]
            if (nm !== 'None') {
                opt = document.createElement("option");
                opt.value = nm;
                opt.innerHTML = nm;
                projectElem.appendChild(opt);
            }
        }


        diseaseElem = document.getElementById("disease_list");
        removeChildren(diseaseElem);
        for (i = 0; i < diseaseCodeH.length; i++) {
            diseaseCode = diseaseCodeH[i];
            if (diseaseCode !== "None") {
                var opt = document.createElement("LI");
                opt.classList.add("checkbox")
                if (i > 5) {
                    opt.classList.add("extra-values");
                }
                opt.innerHTML = '&emsp;<input type="checkbox" value="' + diseaseCode + '">' + diseaseCode;
                diseaseElem.appendChild(opt);
            }
        }

        opt = document.createElement("LI");
        opt.classList.add("checkbox");
        opt.classList.add("extra-values");
        opt.innerHTML = '&emsp;<input type="checkbox" value="None">NA';
        diseaseElem.appendChild(opt);


        filterItemBindings('disease', 'disease_list', 'disease_code_set', 'Disease Code', 'disease_code', false, false);
        raceElem = document.getElementById("race_list");
        for (i = 0; i < raceH.length; i++) {
            race = raceH[i];
            if (race !== "None") {
                var opt = document.createElement("LI");
                opt.classList.add("checkbox");
                if (i > 5) {
                    opt.classList.add("extra-values");
                }
                opt.innerHTML = '&emsp;<input type="checkbox" value="' + race + '">' + race;
                raceElem.appendChild(opt);
            }
        }
        opt = document.createElement("LI");
        opt.classList.add("checkbox");
        opt.classList.add("extra-values");
        opt.innerHTML = '&emsp;<input id="race_list_none" type="checkbox" value="None" >NA';
        raceElem.appendChild(opt);

        filterItemBindings('race', 'race_list', 'race_set', 'Race', 'race', 'false', 'false');

        ethnicityElem = document.getElementById("ethnicity_list");
        for (i = 0; i < ethnicityH.length; i++) {
            ethnicity = ethnicityH[i];
            if (ethnicity !== "None") {
                var opt = document.createElement("LI");
                opt.classList.add("checkbox");
                opt.innerHTML = '&emsp;<input type="checkbox" value="' + ethnicity + '" >' + ethnicity;
                ethnicityElem.appendChild(opt);
            }
        }
        opt = document.createElement("LI");
        opt.classList.add("checkbox");
        opt.innerHTML = '&emsp;<input id="ethnicity_list_none" type="checkbox" value="none" >NA';
        ethnicityElem.appendChild(opt);

        filterItemBindings('ethnicity', 'ethnicity_list', 'ethnicity_set', 'Ethnicity', 'ethnicity', 'false', 'false');


    }

    var removeChildren = function(elem) {
        while (elem.firstChild) {
            elem.removeChild(elem.firstChild);
        }
    }

     $(document).ready(function () {
            filterObj.collection_id = tcgaColls;
            filterItemBindings('Modality', 'Modality', 'modality_set', 'Modality', 'Modality', true, false);
            filterItemBindings('BodyPartExamined', 'BodyPartExamined', 'body_part_examined_set', 'Body Part Examined', 'BodyPartExamined', true, false);

            filterItemBindings('vital_status', 'vital_list', 'vital_status_set', 'Vital Status', 'vital_status', false, false);
            filterItemBindings('gender', 'gender_list', 'gender_set', 'Gender', 'gender', false, false)
            //fetchCountData(true);

        }
    );


});