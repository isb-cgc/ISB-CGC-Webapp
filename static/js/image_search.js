
require.config({
    baseUrl: STATIC_FILES_URL + 'js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        jquerydt: 'libs/jquery.dataTables.min',
        plotly: 'libs/plotly-latest.min',
        base: 'base'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'jquerydt': ['jquery']
    }
});


require(['jquery', 'jquerydt','jqueryui', 'bootstrap','plotly', 'base'],
    function($, jqueryui, bootstrap, plotly, jquerydt) {

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


        window.setSlider = function (divName, reset, strt, end, isInt) {
            slideDiv = divName + "_slide";
            if (reset) {
                strt = $('#' + slideDiv).slider("option", "min");
                end = $('#' + slideDiv).slider("option", "max");
            }
            $('#' + slideDiv).slider("values", "0", strt);
            $('#' + slideDiv).slider("values", "1", end);

            var inpDiv = divName + "_input";
            var val = String(strt) + "-" + String(end);

            // $("#inp_age_slide").value="0-120";
            document.getElementById(inpDiv).value = val;
            filtAtt = divName + '_btw'
            if (reset) {
                if (window.filterObj.hasOwnProperty("age_at_diagnosis_btw")) {
                    delete window.filterObj["age_at_diagnosis_btw"];
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
                window.filterObj[filtAtt] = attVal
            }

            mkFiltText();
            updateFacetsData(true);

        }

// Show more/less links on categories with >6 fiilters

        var mkFiltText = function () {

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

                else if (curKey === 'age_at_diagnosis_btw') {
                    var nstr = '<span class="filter-type">AGE</span> IN (<span class="filter-att">' + filterObj[curKey][0].toString() + '-' + (filterObj[curKey][1] + 1).toString() + ')</span>';
                     oStringA.push(nstr);
                } else {
                    var disp = curKey;
                    var oArray = filterObj[curKey].sort().map(item => '<span class="filter-att">' + item.toString() + '</span>');
                    //var nstr=disp+": "
                    //nstr += oArray.join(", &ensp; ");
                    nstr = '<span class="filter-type">' + disp + '</span>';
                    nstr += 'IN (' + oArray.join("") + ')';
                    oStringA.push(nstr);

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
        }

        window.showMoreGraphs = function () {
            $('.more-graphs').hide();
            $('.less-graphs').show();
            $('.related-graphs').animate({height: '800px'}, 800);
        }

        window.showLessGraphs = function () {
            $('.less-graphs').hide();
            $('.more-graphs').show();
            $('.related-graphs').animate({height: '200px'}, 800);
        }

        var mkSlider = function (divName, min, max, step, isInt) {

            var slideName = divName + '_slide';
            var inpName = divName + '_input';
            var strtInp = min + '-' + max;
            var filtName = divName + '_btw';
            $('#' + divName).append('<div id="' + slideName + '"></div>  <input id="' + inpName + '" type="text" value="' + strtInp + '"> <button onclick=\'setSlider("' + divName + '",true,0,0,' + String(isInt) + ')\'>Reset</button>');

            $('#' + slideName).slider({
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
                    window.filterObj[filtName] = attVal;
                    mkFiltText();
                    updateFacetsData(true);

                }
            });
        }


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
                    if (window.selItems.selStudies.hasOwnProperty(projId)) {
                        delete window.selItems.selStudies[projId];
                    }
                    curRow.classList.add('hide');
                    curRow.classList.remove("selected_grey");

                }
            }



            window.resetTableControls($('#projects_table'), true, 0);
        }

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
        }

        var resetSeriesAndStudiesTables = function (studyId, seriesId) {

            tableElem = document.getElementById(studyId);
            //var newInnerHTML = '<tr><th>Project Name</th><th>Patient Id</th><th>Study Id</th><th>Study Description</th></tr>';
            tableElem.innerHTML = '';

            tableElem = document.getElementById(seriesId);
            //var newInnerHTML = '<tr> <th>Study Id</th><th>Series Id</th><th>Modality</th><th>Body Part Examined</th> </tr>';
            tableElem.innerHTML = '';
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
        }

        window.clearAllSeries = function (seriesTableId) {
            $('#' + seriesTableId).find('tr').remove();
            resetTableControls($('#' + seriesTableId), true, 0);

        }

        window.clearAllStudiesAndSeries = function (studyTableId, seriesTableId) {
            $('#' + studyTableId).find('tr').remove();
            resetTableControls($('#' + studyTableId), true, 0);
            window.clearAllSeries(seriesTableId);
        }

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

            var curFilterObj = JSON.parse(JSON.stringify(parseFilterObj()));
            curFilterObj.collection_id = projectIdArr;
            var isSeries = false;
            if (studyIdArr.length > 0) {
                curFilterObj.StudyInstanceUID = studyIdArr;
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
            let url = '/explore/?counts_only=False&is_json=True&with_clinical=False&collapse_on=' + collapse_on + '&filters=' + filterStr + '&fields=' + fieldStr + '&order_docs=' + orderDocStr;
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
                        //var hrefTxt = '<a href="' + fetchUrl + '" target="_blank">' + ppStudyId + '</a><span class="tooltiptext_ex">' + studyId + '</span>';
                        var hrefTxt =  ppStudyId + '<span class="tooltiptext_ex">' + studyId + '</span>';
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
                            var hrefSeriesTxt = '<a href="' + fetchUrlSeries + '" target="_blank">' + ppSeriesId + '</a><span class="tooltiptext_ex">' + seriesId + '</span>';
                            var seriesTxt = ppSeriesId + '<span class="tooltiptext_ex">' + seriesId + '</span>';

                            newHtml = '<tr id="' + rowId + '" class="' + pclass + ' ' + studyClass + ' text_head" onclick="window.open(\''+fetchUrlSeries+'\',\'_blank\')"><td class="col1 tooltip_ex">' + hrefTxt + '</td><td>' + seriesNumber + '</td><td class="col1">' + modality + '</td><td class="col1">' + bodyPartExamined + '</td><td>' + seriesDescription + '</td></tr>';

                        } else {

                            var studyDescription = curData.StudyDescription;
                            //var studyDate = curData.StudyDate;
                            var rowId = 'study_' + studyId.replace(/\./g, '-');

                            if (refresh && (projectId in curSelStudiesDic) && (studyId in curSelStudiesDic[projId])) {
                                if (!(projectId in newSelStudies)) {
                                    newSelStudies[projectId] = new Array();
                                }
                                newSelStudies[projectId].push(studyId);

                                newHtml = '<tr id="' + rowId + '" class="' + pclass + ' text_head selected_grey" onclick="(toggleStudy(this,\'' + studyId + '\',\'' + projectId + '\'))"><td class="col1">' + projectId + '</td><td class="col1">' + patientId + '</td><td class="col2 tooltip_ex">' + hrefTxt + '</td><td class="col1">' + studyDescription + '</td></tr>'

                            } else {
                                newHtml = '<tr id="' + rowId + '" class="' + pclass + ' text_head" onclick="(toggleStudy(this,\'' + studyId + '\',\'' + projectId + '\'))"><td class="col1">' + projectId + '</td><td class="col1">' + patientId + '</td><td class="col2 tooltip_ex">' + hrefTxt + '</td><td class="col1">' + studyDescription + '</td></tr>'
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


        }

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
                var fetchUrl = '/projects/chc-tcia/locations/us-central1/datasets/' + projectId.toLowerCase() + '/dicomStores/' + projectId.toLowerCase() + '/study/' + studyId;
                var hrefTxt = '<a href="' + fetchUrl + '">' + studyId + '</a>';

                //var sclass='study_'+projectId+'_'+patientIndex[patientId].toString()+"_"+studyIndex[studyId].toString();
                var newHtml = '<tr id="' + rowId + '" class="' + pclass + ' ' + studyClass + ' text_head"><td>' + hrefTxt + '</td><td>' + seriesId + '</td><td>' + seriesNumber + '</td><td>' + modality + '</td><td>' + bodypart + '</td></tr>'
                $('#' + seriesTableId + ' tr:last').after(newHtml);
            });


        }

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


        $('.table').find('tbody').on('scroll', function () {
            var tbodyOff= $(this)[0].offsetTop;
            var rowPos = $(this).find('tr').not('.hide').map(function () {
                return (this.offsetTop -tbodyOff);
            });
            var curScrollPos = $(this)[0].scrollTop;
            var scrollPosInd = Array.from(rowPos.map(function () {
                return ((this < curScrollPos) ? 0 : 1)
            })).indexOf(1)-1;
            scrollPosInd = Math.max(0,scrollPosInd);
            if (scrollPosInd<(rowPos.length-1)){
                if ( (rowPos[scrollPosInd+1] -curScrollPos)/(rowPos[scrollPosInd+1]-rowPos[scrollPosInd]) <0.20)
                {
                  scrollPosInd++;
                }
            }
            var recordsPP = parseInt($(this).parent().parent().find('.files-per-page-select').val());
            var numRecords = $(this).find('tr').length;
            var numPages = parseInt(numRecords / recordsPP) + 1;


            var lastInd = scrollPosInd + recordsPP - 1;
            if (scrollPosInd === -1) {
                scrollPosInd = (numPages - 1) * recordsPP;
                lastInd = numRecords - 1;
            } else if ((scrollPosInd + recordsPP) > numRecords) {
                lastInd = numRecords - 1;
            }
            var currentPage = parseInt(scrollPosInd / recordsPP) + 1;
            if (lastInd === (numRecords -1)){
                currentPage = numPages;
            }



            //var tblbody = $(this).find('tbody')[0];
            var totalHeight = $(this)[0].rows[lastInd].offsetTop + $(this)[0].rows[lastInd].offsetHeight - $(this)[0].rows[scrollPosInd].offsetTop;
            $(this).css('max-height', totalHeight.toString() + 'px');
            $(this).parent().parent().find('.showing')[0].innerHTML = (scrollPosInd + 1).toString() + " to " + (lastInd + 1).toString();

            resetPagination($(this).parent().parent(), currentPage, numPages);
            //alert('mv');
        });

        var setTableView = function (panelTableElem) {
            var curPage = $(panelTableElem).find('.dataTables_goto_page').data('curpage');
            var recordsPP = $(panelTableElem).find('.files-per-page-select').val();
            var curRecords = $(panelTableElem).find('tbody').find('tr');


        }

        window.resetTableControls = function (tableElem, mvScroll, curIndex) {

            var displayedRows = tableElem.find('tr').not('.hide');
            var rowPos = displayedRows.map(function () {
                return this.offsetTop
            });
            tableElem.data('rowpos', JSON.stringify(rowPos));
            var numRecords = displayedRows.length;
            var recordsPP = parseInt(tableElem.parent().parent().find('.files-per-page-select').val());
            tableElem.parent().parent().find('.total-file-count')[0].innerHTML = numRecords.toString();
            var numPages = parseInt(numRecords / recordsPP) + 1;


            if (!mvScroll) {
                var curScrollPos = tableElem[0].scrollTop;
                curIndex = Array.from(rowPos.map(function () {
                    return ((this <= curScrollPos) ? 0 : 1)
                })).indexOf(1);
            }
            var lastInd = curIndex + recordsPP - 1;
            var currentPage = parseInt(curIndex / recordsPP) + 1;
            atEnd = false;
            if (curIndex === -1) {
                curIndex = (numPages - 1) * recordsPP;
                lastInd = numRecords - 1;
            } else if ((curIndex + recordsPP) > numRecords) {
                lastInd = numRecords - 1;
                atEnd = true;
            }

            if ((curIndex > -1) && (lastInd > -1)) {
                var totalHeight = displayedRows[lastInd].offsetTop + displayedRows[lastInd].offsetHeight - displayedRows[curIndex].offsetTop;
                tableElem.css('max-height', totalHeight.toString() + 'px');

                if (mvScroll) {
                    tableElem[0].scrollTop = rowPos[curIndex] - tableElem[0].offsetTop;
                }

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


        var resolveRelatedPlotsCatWCountsRng = function (plotData, plotId, lbl, pHeader) {
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

        }

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
            filterCatsArr.push(findFilterCats('search_orig_set'));
            filterCatsArr.push(findFilterCats('search_related_set'));
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
        var updateCollectionTotals = function (listId, progDic) {
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
        }

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
                    filtObj[nm]= window.filterObj[ckey];
                }
            }
            if (collObj.length>0){
                filtObj['collection_id']= collObj.sort();
            }
            return filtObj;
        }
        var updateFacetsData = function (newFilt) {
            changeAjax(true);

            var url = '/explore/?counts_only=True&is_json=true&is_dicofdic=True&data_source_type=' + $("#data_source_type option:selected").val();
            var parsedFiltObj=parseFilterObj();
            if (Object.keys(parsedFiltObj).length > 0) {

                url += '&filters=' + JSON.stringify(parsedFiltObj);
            }

            url = encodeURI(url);

            $.ajax({
                url: url,
                dataType: 'json',
                type: 'get',
                contentType: 'application/x-www-form-urlencoded',
                success: function (data) {
                    //updateCollectionTotals(data.total, data.origin_set.attributes.collection_id);
                    updateCollectionTotals('Program_list', data.programs);

                    updateFilterSelections('search_orig_set', data.origin_set.attributes);
                    createPlots('search_orig_set');

                    if (data.hasOwnProperty('derived_set')) {
                        $('#search_derived_set').removeClass('disabled');
                        updateFilterSelections('search_derived_set', data.derived_set.attributes);
                       // createPlots('search_derived_set');
                          createPlots('segmentation');
                    }

                    if (data.hasOwnProperty('related_set')) {
                        $('#search_related_set').removeClass('disabled');
                        updateFilterSelections('search_related_set', data.related_set.attributes);
                        createPlots('tcga_clinical');
                       // createPlots('search_related_set');
                    }
                    var collFilt = new Array();
                    if ('collection_id' in parsedFiltObj){
                        collFilt=parsedFiltObj['collection_id'];
                    }

                    editProjectsTableAfterFilter('projects_table', collFilt,data.origin_set.attributes.collection_id);
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


                    changeAjax(false);

                },
                error: function () {
                    changeAjax(false);
                    console.log("problem getting data");

                }

            });
        }



        var plotCategoricalData = function (plotId, lbl, plotData, isPie, showLbl) {
            var layout = new Object();
            xdata = new Array();
            ydata = new Array();
            var plotCats = 0;

            for (var i = 0; i < plotData.dataCnt.length; i++) {
                if (plotData.dataCnt[i] > 0) {
                    ydata.push(plotData.dataCnt[i]);
                    xdata.push(plotData.dataLabel[i]);
                    plotCats++;
                }
            }
            var data = new Object();
            var textinfo = ""
            if (showLbl && (plotCats > 0)) {
                textinfo = 'label';
            } else {
                textinfo = 'none';
            }

            if (isPie || (plotCats === 0)) {
                layout = pieLayout;
                data = [{
                    values: ydata,
                    labels: xdata,
                    //marker: {colors:['rgb(256,256,256)']},
                    type: 'pie',
                    textposition: 'inside',
                    textinfo: textinfo,
                    //textinfo: textinfo,
                    sort: false
                }];
            } else {
                layout = plotLayout;
                if (showLbl) {
                    delete layout.xaxis;
                } else {
                    layout.xaxis = {tickvals: []};
                }
                data = [
                    {
                        x: xdata,
                        y: ydata,
                        type: 'bar'
                    }

                ];
            }

            layout.title = lbl.toUpperCase().replace(/_/g, " ");
            delete layout.annotations;


            if (plotCats === 0) {
                data[0].values = [0];
                data[0].labels = [''];
                data[0].marker = {colors: ['rgb(256,256,256)']};
                layout.annotations = [{text: 'No Data', showarrow: false, font: {size: 18}}];
            }

            Plotly.newPlot(plotId, data, layout, {displayModeBar: false});

            document.getElementById(plotId).on('plotly_click', function (data, plotId) {
                var chartid = new Object();
                if (isPie) {
                    chartid = data.event.path[7].id;
                } else {
                    chartid = data.event.path[6].id;
                }

                var filterId = chartid.replace("_chart", "");
                if (filterId === 'age_at_diagnosis') {
                    //var sel = data.points[0].x;
                    var sel = new Object();
                    if (isPie) {
                        sel = data.points[0].label;
                    } else {
                        sel = data.points[0].x;
                    }
                    var selArr = sel.split(' To ');
                    var strt = parseInt((selArr[0] === '*') ? '0' : selArr[0]);
                    var end = parseInt((selArr[1] === '*') ? '120' : selArr[1]);
                    setSlider(filterId, false, strt, end, true);

                } else {
                    //alert(String(data.event.path[6].id));
                    var index;
                    var label;
                    if (isPie) {
                        label = data.points[0].label;
                    } else {
                        index = data.points[0].pointIndex;
                    }
                    var listId = filterId + '_list';
                    var inputList = $('#' + listId).find(':input');
                    for (var i = 0; i < inputList.length; i++) {
                        if (isPie) {
                            var curLabel = $(inputList[i]).parent().children()[1].innerHTML;
                            if (label === curLabel) {
                                inputList[i].checked = true;
                            } else {
                                inputList[i].checked = false;
                            }
                        } else {
                            if (i === index) {
                                inputList[i].checked = true;
                            } else {
                                inputList[i].checked = false;
                            }
                        }
                        if (i<inputList.length-1) {
                            handleFilterSelectionUpdate(inputList[i], false, false);
                        }
                        else{
                            handleFilterSelectionUpdate(inputList[i], true, true);
                        }
                    }
                    //handleFilterSelectionUpdate(filterId);
                }
            });

        };


        var findFilterCats = function (id) {
            filterCats = new Array();
            listElems = $('#' + id).find('.list-group-item__body');
            for (i = 0; i < listElems.length; i++) {
                elem = listElems.get(i);
                nm = elem.id;
                filterCats.push(nm);
            }
            return filterCats
        }


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
            createPlots('tcga_clinical');
             createPlots('segmentation');
        }

        var createPlots = function (id) {

            var isPie = true;
            var ptIndx = document.getElementById("plot_type").selectedIndex;
            if (ptIndx === 1) {
                isPie = false;
            }
            var showLbl = document.getElementById("plot_label").checked


            var filterCats = findFilterCats(id);
            for (var i = 0; i < filterCats.length; i++) {
                filterCat = filterCats[i];
                filterData = parseFilterForCounts(filterCat);
                plotId = filterCat + "_chart";
                lbl = $('#' + filterCat + '_heading').children()[0].innerText;
                plotCategoricalData(plotId, lbl, filterData, isPie, showLbl);
            }

        }

        var updateFilters = function (filterCat, dic, dataFound) {
            var allFilters = $('#' + filterCat).find('input:checkbox');
            var checkedFilters = $('#' + filterCat).find('input:checked');
            var useAll = ((checkedFilters.length == 0) ? true : false)
            var numAttrShown = 0;
            for (var i = 0; i < allFilters.length; i++) {
                var elem = allFilters.get(i);
                var val = $(elem)[0].value;
                var checked = $(elem)[0].checked;

                var spans = $(elem).parent().find('span');
                var lbl = spans.get(0).innerHTML;
                var cnt = parseInt(spans.get(1).innerHTML);

                if (dataFound && dic.hasOwnProperty(val) && (dic[val].count > 0)) {
                    numAttrShown++;
                    spans.get(1).innerHTML = String(dic[val].count);
                    //$(elem).parent().parent().removeClass('hidden');
                    if (numAttrShown > 5) {
                        $(elem).parent().parent().addClass('extra-values');
                    }

                } else {
                    spans.get(1).innerHTML = '0';
                    //$(elem).parent().parent().addClass('hidden');
                    $(elem).parent().parent().removeClass('extra-values');

                }
                if (checked || useAll) {
                    $(spans.get(1)).addClass('plotit');
                } else {
                    $(spans.get(1)).removeClass('plotit');
                }
            }
            if ($('#' + filterCat).find('.more-checks').length > 0) {
                if (numAttrShown < 6) {
                    $('#' + filterCat).find('.more-checks').hide();
                    $('#' + filterCat).find('.less-checks').hide();
                    $('#' + filterCat).find('.extra-values').removeClass('extra-values');

                } else {
                    if ($('#' + filterCat).find('.less-checks').is(":hidden")) {
                        $('#' + filterCat).find('.more-checks').show();
                        $('#' + filterCat).find('.extra-values').hide();
                    } else {
                        $('#' + filterCat).find('.more-checks').hide();
                        $('#' + filterCat).find('.less-checks').show();
                        $('#' + filterCat).find('.extra-values').show();
                    }
                }
            }


        }


        var updateFilterSelections = function (id, dicofdic) {
            filterCats = findFilterCats(id);
            for (i = 0; i < filterCats.length; i++) {
                cat = filterCats[i]
                if (dicofdic.hasOwnProperty(cat)) {
                    updateFilters(filterCats[i], dicofdic[cat], true);
                } else {
                    updateFilters(filterCats[i], '', false);
                }
            }
        }

        var handleFilterSelectionUpdate = function(filterElem, mkFilt, doUpdate) {
        var checked = $(filterElem)[0].checked;
        var filterCats= $(filterElem).parentsUntil('.tab-pane','.list-group-item, .checkbox');
        var j = 1;

        var curCat='';
        for (var i=0;i<filterCats.length;i++){
            ind = filterCats.length-1-i;
            filterCat=filterCats[ind];
            hasCheckBox=false;
            if (filterCat.classList.contains('checkbox')){
                 checkBox =$(filterCat).find('input:checkbox')[0];
                 filtnm=checkBox.value;
                 hasCheckBox = true;
            }
            else {
                filtnm=$(filterCat).children('.list-group-item__body')[0].id;
                if  ($(filterCat).children('.list-group-item__heading').children('input:checkbox').length>0) {
                   hasCheckBox = true;
                }
               checkBox = $(filterCat).children('.list-group-item__heading').children('input:checkbox')[0];
            }
            if ((checked) && (curCat.length>0) && hasCheckBox  ){
                checkBox.checked = true;
                if (!(filterObj.hasOwnProperty(curCat))){
                    filterObj[curCat] = new Array();
                }
                if (filterObj[curCat].indexOf(filtnm)<0){
                    filterObj[curCat].push(filtnm)
                }
            }

            if (!checked && (ind==0)){

               if ( filterObj.hasOwnProperty(curCat) && (filterObj[curCat].indexOf(filtnm)>-1) ){
                    pos = filterObj[curCat].indexOf(filtnm);
                    filterObj[curCat].splice(pos,1);
                    if (Object.keys(filterObj[curCat]).length===0){
                         delete filterObj[curCat];
                    }
               }

               if (curCat.length>0){
                 curCat+="."
                 }
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
        if (mkFilt) {
            mkFiltText();
        }
        if (doUpdate){
            updateFacetsData(true);
        }


    }





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
                //alert('here');

            });
        }

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



        $('#' + filterId).find('.show-more').on('click', function () {

            $(this).parent().parent().find('.less-checks').show();
            $(this).parent().hide();
            $(this).parent().parent().children('.search-checkbox-list').children('.extra-values').show();


        });


        $('#' + filterId).find('.show-less').on('click', function () {

            $(this).parent().parent().find('.more-checks').show();
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
         var filterCats = findFilterCats(id);
         for (var i=0;i<filterCats.length;i++){
             filterItemBindings(filterCats[i]);
        }
     }



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
            createPlots('segmentation');
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


            $('#age_at_diagnosis_list').addClass('hide');
            $('#age_at_diagnosis').find('.more-checks').addClass('hide');
            $('#age_at_diagnosis').find('.less-checks').addClass('hide');
            mkSlider('age_at_diagnosis',0,120,1,true);

            var numCol = $('#projects_table').children('tr').length
            $('#projects_panel').find('.total-file-count')[0].innerHTML = numCol.toString();
             $('#projects_panel').find('.goto-page-number')[0].max=3;

            window.resetTableControls ($('#projects_table'), false, 0);
            window.resetTableControls ($('#studies_table'), false, 0);
            window.resetTableControls ($('#series_table'), false, 0);

            //$("#number_ajax").bind("change", function(){ alert($()this.val)} );

        }
    );



});
