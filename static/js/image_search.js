

function populateProjectsTable(tableId){
    tableElem=document.getElementById(tableId);
     var newInnerHTML='<tr><th>Project Name</th><th>Description</th><th>Total # of Patients</th><th># of Patients(this cohort)</th></tr>';
     for (i=0;i< projectA.length;i++){
         var index=projectIndex[projectA[i]]
         var curProject = projects[index]

         if (curProject.isActive){
             var idStr=curProject.id.toString();
             var numPatientsStr=curProject.patients.length.toString();
             var numPatientsActiveStr=curProject.numActivePatients.toString();
             var description='NA';

             var newProjectRow='<tr id="project_row_'+idStr+'" class="text_head" onclick="(toggleProj(this, \''+idStr+'\'))"><td>'+idStr+'</td><td>'+ description + '</td><td>'+numPatientsStr+'</td><td>'+numPatientsActiveStr+'</td> </tr>';
             newInnerHTML+=newProjectRow;
         }
     }
     tableElem.innerHTML=newInnerHTML;
}

function toggleProj(projRow,projectId){
    if (projRow.classList.contains("selected_grey")){
        $(projRow).removeClass("selected_grey");
         removeStudiesAndSeries(projectId, "studies_table")
    }
    else{
        $(projRow).addClass("selected_grey");
        addStudies(projectId, "studies_table");
    }
}

function toggleStudy(studyRow,studyId){
    if (studyRow.classList.contains("selected_grey")){
        $(studyRow).removeClass("selected_grey");
         removeSeries(studyRow.id, "series_table");
    }
    else{
        $(studyRow).addClass("selected_grey");
        addSeries(studyId,studyRow.id, "series_table");
    }
}



function removeStudiesAndSeries(projectId,studyTableId,seriesTableId){
    var pclass= "project_"+projectId;
    var studiesTable=document.getElementById(studyTableId);
    $('#'+studyTableId).find('.project_'+projectId).remove();
    removeSeries(pclass, 'series_table');
}

function removeSeries(selClass,seriesTableId){
    $('#'+seriesTableId).find('.'+selClass).remove();
}
function addStudies(projectId,studyTableId){
     var index=projectIndex[projectId]
     var curProject = projects[index]
     //var tableElem=document.getElementById(studyTableId);

     curProject.patients.forEach(function(curPatient,index){
         patientId=curPatient.id;
         curPatient.studies.forEach(function(curStudy,sIndex){


             studyId=curStudy.id
             studyDescription=curStudy.StudyDescription;
             studyDate=curStudy.StudyDate;
             var rowId='study_'+projectId+'_'+patientIndex[patientId].toString()+"_"+studyIndex[studyId].toString();
             var pclass='project_'+projectId;

              var fetchUrl='/projects/chc-tcia/locations/us-central1/datasets/'+projectId.toLowerCase()+'/dicomStores/'+projectId.toLowerCase()+'/study/'+studyId;
              var hrefTxt='<a href="'+fetchUrl+'">'+studyId+'</a>';

             var newHtml='<tr id="'+rowId+'" class="'+pclass+' text_head" onclick="(toggleStudy(this,\''+studyId+'\'))"><td>'+projectId+'</td><td>'+patientId+'</td><td>'+hrefTxt+'</td><td>'+studyDescription+'</td><td>'+studyDate+'</td></tr>'
             $('#'+studyTableId+' tr:last').after(newHtml);
         });

     });


}

function addSeries(studyId, studyClass,seriesTableId){
    var sIndex = studyIndex[studyId]
    var patientId=studyPatient[studyId]
    var ptIndex =  patientIndex[patientId]

    var projectId=patientProject[patientId]
    var pindex=projectIndex[projectId]

    var curStudy=projects[pindex].patients[ptIndex].studies[sIndex]
    curStudy.series.forEach(function(curSeries, seriesIndex){
        var seriesId=curSeries.id;
        var bodypart=curSeries.BodyPartExamined;
        var modality=curSeries.Modality;
        var seriesNumber=curSeries.SeriesNumber;
        var rowId='series_'+projectId+'_'+patientIndex[patientId].toString()+"_"+studyIndex[studyId].toString()+'_'+seriesNumber.toString();
        var pclass='project_'+projectId;
        var fetchUrl='/projects/chc-tcia/locations/us-central1/datasets/'+projectId.toLowerCase()+'/dicomStores/'+projectId.toLowerCase()+'/study/'+studyId;
              var hrefTxt='<a href="'+fetchUrl+'">'+studyId+'</a>';

        //var sclass='study_'+projectId+'_'+patientIndex[patientId].toString()+"_"+studyIndex[studyId].toString();
        var newHtml='<tr id="'+rowId+'" class="'+pclass+' '+studyClass+' text_head"><td>'+hrefTxt+'</td><td>'+seriesId+'</td><td>'+seriesNumber+'</td><td>'+modality+'</td><td>'+bodypart+'</td></tr>'
             $('#'+seriesTableId+' tr:last').after(newHtml);
    });


}

function getLastIdString(inp){
    var strA=inp.split('.');
    return strA[strA.length-1];

}




function resolveAllPlots(){
    resolveOriginalDataPlots("modality","modality_chart","Modality");
    resolveOriginalDataPlots("body_part","body_part_examined_chart", "BodyPartExamined");

    resolveRelatedPlotsCatWCounts( clinicalDataCounts['disease_code'],"disease_code_chart","Disease Code");
    resolveRelatedPlotsCatWCounts( clinicalDataCounts['vital_status'],"vital_statistics_chart","Vital Status");
    resolveRelatedPlotsCatWCounts( clinicalDataCounts['gender'],"gender_chart","Gender");
    resolveRelatedPlotsCatWCountsRng( clinicalDataCounts['age'],"age_chart","Age");
    //resolveRelatedPlotsCatWCountsRng( clinicalDataCounts['bmi'],"bmi_chart","Body Mass Index");
    resolveRelatedPlotsCatWCounts( clinicalDataCounts['race'],"race_chart","Race");
    resolveRelatedPlotsCatWCounts( clinicalDataCounts['ethnicity'],"ethnicity_chart","Ethnicity");

    //resolveRelateDataPlotsCat("disease", "disease_code_chart","disease_code");
    //resolveRelateDataPlotsCat("vital", "vital_statistics_chart","vital_status");
    //resolveRelateDataPlotsCat("gender", "gender_chart","gender");

    //resolveRelateDataPlotsRange("age", "age_chart","age");
    //resolveRelateDataPlotsCat("race", "race_chart","race");
    //resolveRelateDataPlotsCat("ethnicity", "ethnicity_chart","ethnicity");

}

function updateAllFilterSelections(){

    updateFilterSelection('modality', 'modality_set','Modality','Modality',0,false);
    updateFilterSelection('body_part', 'body_part_examined_set','Body Part Examined','BodyPartExamined',true,false);

    updateFilterSelection('disease_list', 'disease_code_set','Disease Code', 'disease_code','false','false');
    updateFilterSelection('vital_list', 'vital_status_set','Vital Status','vital_status',false,false);
    updateFilterSelection('gender_list', 'gender_set','Gender','gender',false,false);
    updateFilterSelection('age_list', 'age_set','Age','age',false,true);
    updateFilterSelection('bmi_list', 'bmi_set','BMI','bmi',false,true);
    updateFilterSelection('race_list', 'race_set','Race', 'race','false','false');
    updateFilterSelection('ethnicity_list', 'ethnicity_set','Ethnicity','ethnicity','false','false');



}

function updateSearchScope(searchElem){
    var project_scope=searchElem.selectedOptions[0].value;
    document.getElementById('selected_project').innerHTML=project_scope;

}
function updateFilterSelection(checkBoxDiv, displaySet, header, attributeName, isStudyAttr,isRangeAttr){
    var newText="&emsp;&emsp;"+header+": ";
    var checkBoxElem=document.getElementById(checkBoxDiv);

    var listItems=checkBoxElem.getElementsByTagName('li');
    var numChecked=0;
    var attributeVals = new Array();
    for (i=0;i<listItems.length;i++){
        checkBoxElem=listItems[i].getElementsByTagName('input')[0];
        if (checkBoxElem.checked){
            if (numChecked>0) {
                newText += ", " ;
            }
            newText+= listItems[i].innerText;
            attributeVals.push(checkBoxElem.value)
            numChecked++;
        }
    }
    if (numChecked === listItems.length){
        newText="&emsp;&emsp;"+header+": All";

    }
    else {
        filter[attributeName] = attributeVals;
    }
    document.getElementById(displaySet).innerHTML=newText;


}




function fetchData(refresh,counts_only){


    $.ajax({
                url: '/idc/filtered/',
                dataType: 'json',
                type: 'get',
                contentType: 'application/x-www-form-urlencoded',
                success: function(data){
                    clinicalDataCounts=data['clinical']
                    originalDataCounts=data['facets']
                    if (!counts_only) {
                        projects = data.projects;
                        projectIndex = data.projectIndex;
                        projectA = data.projectA.sort();
                        patientIndex = data.patientIndex;
                        patientProject = data.patientProject;
                        studyIndex = data.studyIndex;
                        studyPatient = data.studyPatient;
                        seriesIndex = data.seriesIndex;
                        seriesStudy = data.seriesStudy;
                    }


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

                        constructClinicalFilterOptions();
                    }
                    //updateSelections(-1,[]);
                    resolveAllPlots();
                    populateProjectsTable("projects_table");
                },
                error: function(  ){
                    console.log( "problem getting data" );
                }
            });
}


function constructClinicalFilterOptions(){

    //projectA=projectA.sort();
    projectElem=document.getElementById("project_scope");
    for (i=0;i<projectA.length;i++){
        nm=projectA[i]

        opt=document.createElement("option");
        opt.value=nm;
        opt.innerHTML=nm;
        projectElem.appendChild(opt);
    }

    //diseaseCodeA=Object.keys(diseaseCodeH).sort();

    //ethnicityA=diseaseCodeH.keys().sort();
    diseaseElem=document.getElementById("disease_list");
    removeChildren(diseaseElem);
    for (i=0;i<diseaseCodeH.length;i++){
        diseaseCode=diseaseCodeH[i];
        if (diseaseCode !=="None") {
            var opt = document.createElement("LI");
            opt.innerHTML = '&emsp;<input type="checkbox" checked value="' + diseaseCode + '" onclick="updateFilterSelection(\'disease_list\', \'disease_code_set\',\'Disease Code\', \'disease_code\',false,false)">' + diseaseCode;
            diseaseElem.appendChild(opt);
        }
    }
    //<li><input type="checkbox" checked value="na">NA</li>
    opt = document.createElement("LI");
    opt.innerHTML = '&emsp;<input type="checkbox" checked value="None" onclick="updateFilterSelection(\'disease_list\', \'disease_code_set\',\'Disease Code\', \'disease_code\',false,false)">NA';
    diseaseElem.appendChild(opt);

    //raceA=Object.keys(raceH).sort();
    raceElem=document.getElementById("race_list");
    for (i=0;i<raceH.length;i++){
        race=raceH[i];
        if (race !=="None") {
            var opt = document.createElement("LI");
            opt.innerHTML = '&emsp;<input type="checkbox" checked value="' + race + '"  onclick="updateFilterSelection(\'race_list\', \'race_set\',\'Race\', \'race\',\'false\',\'false\')">' + race;
            raceElem.appendChild(opt);
        }
    }
    opt = document.createElement("LI");
    opt.innerHTML = '&emsp;<input id="race_list_none" type="checkbox" checked value="None" onclick="updateFilterSelection(0,\'race_list\', \'race_set\',\'Race\', \'race\',\'false\',\'false\')">NA';
    raceElem.appendChild(opt);

    //ethnicityA=Object.keys(ethnicityH).sort();
    ethnicityElem=document.getElementById("ethnicity_list");

    for (i=0;i<ethnicityH.length;i++){
        ethnicity=ethnicityH[i];
        if (ethnicity !=="None") {
            var opt = document.createElement("LI");
            opt.innerHTML = '&emsp;<input type="checkbox" checked value="' + ethnicity + '" onclick="updateFilterSelection(\'ethnicity_list\', \'ethnicity_set\',\'Ethnicity\',\'ethnicity\',\'false\',\'false\')">' + ethnicity;
            ethnicityElem.appendChild(opt);
        }
    }
    opt = document.createElement("LI");
    opt.innerHTML = '&emsp;<input id="ethnicity_list_none" type="checkbox" checked value="none" onclick="updateFilterSelection(0,\'ethnicity_list\', \'ethnicity_set\',\'Ethnicity\',\'ethnicity\',\'false\',\'false\')">NA';
    ethnicityElem.appendChild(opt);



}

var plotLayout = {
     title:'',
    autosize:true,
    margin: {
    l: 30,
    r: 30,
    b: 60,
    t: 30,
    pad: 0
  },
    xaxis:{type:'category', dtick:1}
};


function resolveOriginalDataPlots(elem, plotId,lbl) {

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
    }
    for (i = 0; i < projects.length; i++) {
        curProject = projects[i]
        if (curProject.isActive) {

            for (j = 0; j < curProject.patients.length; j++) {
                curPatient = curProject.patients[j];


                if ((curPatient.isActive) && (curPatient.numActiveStudies > 0)) {
                    var dataFound = new Object();
                    for (k = 0; k < curPatient.studies.length; k++) {
                        curStudy = curPatient.studies[k];
                        if ( (curStudy.isActive) && (curStudy.numActiveSeries>0) ) {
                            for (l = 0; l < curStudy.series.length; l++) {
                                curSeries = curStudy.series[l];
                                if (curSeries.isActive) {
                                    dataFound[curSeries[lbl].toLowerCase()] = 1;
                                }
                            }
                        }
                    }
                    dataFoundList = Object.keys(dataFound);
                    for (k = 0; k < dataFoundList.length; k++) {
                        dataVal = dataFoundList[k]
                        if (dataValueMp.hasOwnProperty(dataVal)) {
                            dataCount[dataValueMp[dataVal]]++;
                        }
                    }
                }


            }

        }
    }


var pdata =[
    {
        x:dataValues,
        y: dataCount,
        type: 'bar'
    }
];

plotLayout.title=lbl;
Plotly.newPlot(plotId,pdata,plotLayout);
plotLayout.title='';

}

function resolveRelatedPlotsCatWCountsRng(plotDataA, plotId,lbl){
    pHeader = plotDataA.map(function(val,index){return val[0]});
    pCounts = plotDataA.map(function(val,index){return val[1]});

     var pdata =[
    {
        x:pHeader,
        y: pCounts,
        type: 'bar'
    }
];

plotLayout.title=lbl
Plotly.newPlot(plotId,pdata,plotLayout);


}

function resolveRelatedPlotsCatWCounts(plotDataFacetCountDic, plotId,lbl){

    pHeader = Object.keys(plotDataFacetCountDic).sort();
    nonePos = pHeader.indexOf('None');
    if (nonePos>-1) {
        pHeader.splice(nonePos, 1);
        pHeader.push('None');
    }

    pCounts = new Array();
    for (i=0;i<pHeader.length;i++){
        lbl=pHeader[i];
        cnt=plotDataFacetCountDic[lbl]
        pCounts.push(cnt)

    }
    var pdata =[
    {
        x:pHeader,
        y: pCounts,
        type: 'bar'
    }
];

plotLayout.title=lbl
Plotly.newPlot(plotId,pdata,plotLayout);


}




function removeChildren(elem){
    while(elem.firstChild){
        elem.removeChild(elem.firstChild);
    }
}


