filterObj = {};
projIdSel = [];
studyIdSel = [];
tcgaColls = ["tcga_blca","tcga_brca","tcga_cesc","tcga_coad","tcga_esca","tcga_gbm","tcga_hnsc","tcga_kich","tcga_kirc","tcga_kirp","tcga_lgg","tcga_lihc","tcga_luad","tcga_lusc","tcga_ov","tcga_prad","tcga_read","tcga_sarc","tcga_stad","tcga_thca","tcga_ucec"];

filterObj.collection_id=tcgaColls;


     function mkFiltText(){
         var curKeys=Object.keys(filterObj).sort();
         oStringA = new Array();
         for (i=0;i<curKeys.length;i++){
             var curKey = curKeys[i];
             if ((curKey === 'collection_id') && (filterObj[curKey]===tcgaColls)){
                 continue;
             }
             if (curKey === 'age_at_diagnosis_btw'){
                 var nstr = 'age: '+filterObj[curKey][0].toString()+"-"+filterObj[curKey][1].toString();

             }
             else{
                 var disp= curKey;
                 var oArray= filterObj[curKey].sort().map(item => item.toString());
             var nstr=disp+": "
             nstr += oArray.join(", &ensp; ");

             }
              oStringA.push(nstr);
         }
         if (oStringA.length>0){
            var oString=oStringA.join("; &nbsp; ");
            document.getElementById("search_def").innerHTML=oString;
         }
         else{
             document.getElementById("search_def").innerHTML="All";
         }
         //alert(oString);
     }

     function showMoreGraphs() {
         $('.more-graphs').hide();
         $('.less-graphs').show();
         $('.related-graphs').animate({height: '400px'}, 800);
            // alert('here');


     }

     function showLessGraphs() {
         $('.less-graphs').hide();
         $('.more-graphs').show();
         $('.related-graphs').animate({height: '200px'}, 800);


     }

function mkSlider(divName,inpDiv,displaySet,header,attributeName,isInt) {
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
            updateSliderSelection(inpDiv,displaySet,header,attributeName,isInt);
        }
    });
}








function editProjectsTable(tableId,scopeId){
    var project_scope=document.getElementById(scopeId).selectedOptions[0].value;

    tableElem = document.getElementById(tableId);
    countElems = $(tableElem).find('.projects_table_num_cohort');
    //countElems.forEach( function(element) { element.innerHTML='0'});
    for (i=0;i<countElems.length;i++){
        countElems[i].innerHTML='0';
    }

    projKeys = Object.keys(originalDataCounts.collection_id);
    for (i=0;i<projKeys.length;i++){
        idStr = projKeys[i]
        countStr = originalDataCounts.collection_id[idStr].toString();
        patientElemId = 'patient_col_'+idStr;
        if (document.getElementById(patientElemId)){
            if ( (project_scope ==='All') || (project_scope===idStr))
            {
                document.getElementById(patientElemId).innerHTML = countStr
            }
        }

    }

}


function createProjectsTable(tableId){
    tableElem=document.getElementById(tableId);
     //var newInnerHTML='<tr><th>Project Name</th><th>Total # of Patients</th><th># of Patients(this cohort)</th></tr>';
    var newInnerHTML='';
     //projectH = Object.keys(originalDataCounts.collection_id).sort();
    projectH = tcgaColls;
     nonePos = projectH.indexOf('None');
     /* if (nonePos > -1) {
         projectH.splice(nonePos, 1);
     }*/

     for (i=0;i< projectH.length;i++){
         var idStr=projectH[i];
         var patientIdStr = 'patient_col_'+idStr;
         if (originalDataCounts.collection_id.hasOwnProperty(idStr)) {
             var numPatientsStr = originalDataCounts.collection_id[idStr].toString();
         }
         else{
             var numPatientsStr = "0";
         }
         var description='NA';
         var newProjectRow='<tr id="project_row_'+idStr+'" class="text_head" onclick="(toggleProj(this, \''+idStr+'\'))"><td>'+idStr+'</td><td>'+numPatientsStr+'</td><td id="'+patientIdStr+'" class="projects_table_num_cohort">'+numPatientsStr+'</td> </tr>';
         newInnerHTML+=newProjectRow;

     }
     tableElem.innerHTML=newInnerHTML;
}

function resetTables(projectId,studyId, seriesId){

    projRows=$('#'+projectId).find(".selected_grey");
    for (i=0;i<projRows.length;i++){
        projRow = projRows[i];
        $(projRow).removeClass("selected_grey");
    }
    tableElem = document.getElementById(studyId);
    //var newInnerHTML = '<tr><th>Project Name</th><th>Patient Id</th><th>Study Id</th><th>Study Description</th></tr>';
    tableElem.innerHTML = '';

    tableElem= document.getElementById(seriesId);
    //var newInnerHTML = '<tr> <th>Study Id</th><th>Series Id</th><th>Modality</th><th>Body Part Examined</th> </tr>';
    tableElem.innerHTML = '';
}



function toggleProj(projRow,projectId){
    num_cohort= parseInt($(projRow).find(".projects_table_num_cohort")[0].innerHTML)
    if (num_cohort ===0){
        alert('no patients for this project in the selected cohort')
        return;
    }
    if (projRow.classList.contains("selected_grey")){
        $(projRow).removeClass("selected_grey");
        projPos = projIdSel.indexOf(projectId)
        if (projPos>-1){
            projIdSel.splice(projPos,1);
        }
        removeStudiesAndSeries(projectId, "studies_table")

    }
    else{
        $(projRow).addClass("selected_grey");
        projIdSel.push(projectId);
        addStudyOrSeries([projectId],[], "studies_table");
    }
}


function toggleStudy(studyRow,studyId,projectId){
    if (studyRow.classList.contains("selected_grey")){
        $(studyRow).removeClass("selected_grey");
         removeSeries(studyRow.id, "series_table");
    }
    else{
        $(studyRow).addClass("selected_grey");
        addStudyOrSeries([projectId],[studyId], "series_table", false);
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


function addStudyOrSeries(projectIdArr,studyIdArr,tableId,refresh){

    curFilterObj = JSON.parse(JSON.stringify(filterObj));
    curFilterObj.collection_id = projectIdArr;
    var isSeries = false;
    if (studyIdArr.length>0){
        curFilterObj.StudyInstanceUID= studyIdArr;
        isSeries = true;
    }

    filterStr = JSON.stringify(curFilterObj);
    fields = ["collection_id", "PatientID","StudyInstanceUID", "StudyDescription", "StudyDate"];
    collapse_on='StudyInstanceUID'
    if (isSeries){
        fields = ["collection_id", "PatientID","StudyInstanceUID","SeriesInstanceUID","Modality","BodyPartExamined", "SeriesNumber"];
        collapse_on='SeriesInstanceUID'
    }
    fieldStr = JSON.stringify(fields);
    let url = '/idc/filtered/?counts_only=False&collapse_on='+collapse_on+'&with_clinical=False&filters=' + filterStr+'&fields='+fieldStr;
    url=encodeURI(url);

    $.ajax({
                url: url,
                dataType: 'json',
                type: 'get',
                contentType: 'application/x-www-form-urlencoded',
                success: function(data){
                    for (i=0;i<data['docs'].length;i++){
                        curData=data['docs'][i]
                        var projectId = curData.collection_id;
                        var patientId = curData.PatientID;
                        var studyId = curData.StudyInstanceUID;
                        var fetchUrl='/projects/chc-tcia/locations/us-central1/datasets/'+projectId.replace('_','-')+'/dicomStores/'+projectId.replace('_','-')+'/study/'+studyId;
                        var hrefTxt='<a href="'+fetchUrl+'" target="_blank">'+studyId+'</a>';
                        var pclass='project_'+projectId;
                        if (isSeries){
                            var seriesId = curData.SeriesInstanceUID;
                            var bodyPartExamined = curData.BodyPartExamined;
                            var modality = curData.Modality;
                            var rowId='series_'+seriesId.replace(/\./g,'-')
                            var studyClass = 'study_'+studyId.replace(/\./g,'-');
                            var newHtml='<tr id="'+rowId+'" class="'+pclass+' '+studyClass+' text_head"><td class="col1">'+hrefTxt+'</td><td class="col2">'+seriesId+'</td><td class="col1">'+modality+'</td><td class="col1">'+bodyPartExamined+'</td></tr>'

                        }
                        else {

                            var studyDescription = curData.StudyDescription;
                            //var studyDate = curData.StudyDate;
                            var rowId='study_'+studyId.replace(/\./g,'-');
                            var newHtml='<tr id="'+rowId+'" class="'+pclass+' text_head" onclick="(toggleStudy(this,\''+studyId+'\',\''+projectId+'\'))"><td class="col1">'+projectId+'</td><td class="col1">'+patientId+'</td><td class="col2">'+hrefTxt+'</td><td class="col1">'+studyDescription+'</td></tr>'

                        }
                        //var rowId='study_'+projectId+'_'+patientIndex[patientId].toString()+"_"+studyIndex[studyId].toString();


                        document.getElementById(tableId).innerHTML+=newHtml;
                    }

                },
                error: function(  ){
                    console.log( "problem getting data" );
                }
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
    plotCategoricalData('modality','modality_chart','Modality',originalDataCounts['Modality'],'Modality');
    plotCategoricalData('body_part','body_part_examined_chart', 'BodyPartExamined', originalDataCounts['BodyPartExamined'],'BodyPartExamined');

    plotCategoricalData( 'disease','disease_code_chart','Disease Code',clinicalDataCounts['disease_code'],'disease_code');
    plotCategoricalData( 'vital_status','vital_status_chart','Vital Status',clinicalDataCounts['vital_status'],'vital_status');
    plotCategoricalData('gender' ,'gender_chart','Gender',clinicalDataCounts['gender'],'gender');
    aHeader=[['* to 10','0 to 10'],['10 to 20','11 to 20'],['20 to 30','21 to 30'],['30 to 40','31 to 40'],['40 to 50','41 to 50'],['50 to 60','51 to 60'],['60 to 70','61 to 70'],['70 to 80','71 to 80'],['80 to *','81+'],['None','None']]
    resolveRelatedPlotsCatWCountsRng( clinicalDataCounts['age'],"age_chart","Age", aHeader);
    //resolveRelatedPlotsCatWCountsRng( clinicalDataCounts['bmi'],"bmi_chart","Body Mass Index");
    plotCategoricalData( 'race','race_chart','Race',clinicalDataCounts['race'],'race');
    plotCategoricalData( 'ethnicity',"ethnicity_chart","Ethnicity",clinicalDataCounts['ethnicity'],"ethnicity");



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
    //document.getElementById('selected_project').innerHTML=project_scope;
    if (project_scope ==='All'){
        /*if (filterObj.hasOwnProperty('collection_id')){
            delete filterObj['collection_id']
        }*/
        filterObj['collection_id']=tcgaColls;
    }
    else{
        filterObj['collection_id']=[project_scope];

    }
    mkFiltText();
    fetchCountData(false);

}






function updateSliderSelection(inpDiv,displaySet,header,attributeName,isInt){
    var val = document.getElementById(inpDiv).value;
    var newText="&emsp;&emsp;"+header+": " + val;
    var attributeVals = new Array();
    valArr=val.split("-")
    if (isInt) {
        attributeVals = [parseInt(valArr[0]),parseInt(valArr[1])];
    }
    else {
        attributeVals = [parseInt(valArr[0]),parseInt(valArr[1])];
    }
    filterObj[attributeName] = attributeVals;
    //document.getElementById(displaySet).innerHTML=newText;
    mkFiltText();
    fetchCountData(false);

}

function updateFilterSelection(checkBoxDiv, displaySet, header, attributeName, isImageAttr,isRangeAttr){
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
        delete filterObj[attributeName];
    }
    else {
        filterObj[attributeName] = attributeVals;
    }
    //document.getElementById(displaySet).innerHTML=newText;
    mkFiltText();
    fetchCountData(false);

}


function fetchCountData(refresh){
    var url='';
    if (Object.keys(filterObj).length===0){
        url = '/idc/filtered/?counts_only=True';
    }
    else {
        url = '/idc/filtered/?counts_only=True&filters=' + JSON.stringify(filterObj);
    }
    url=encodeURI(url);

    $.ajax({
                url: url,
                dataType: 'json',
                type: 'get',
                contentType: 'application/x-www-form-urlencoded',
                success: function(data){
                    clinicalDataCounts=data['clinical'];
                    originalDataCounts=data['facets'];

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
                         mkSlider('age_slide', 'inp_age_slide','age_set','Age','age_at_diagnosis_btw', true);
                    }
                    else{
                       editProjectsTable('projects_table','project_scope');
                       resetTables('projects_table','studies_table','series_table');
                    }
                    resolveAllPlots();


                },
                error: function(  ){
                    console.log( "problem getting data" );
                }
            });
}


function constructClinicalFilterOptions(){

    //projectA=projectA.sort();
    projectElem=document.getElementById("project_scope");
    //projList= Object.keys(originalDataCounts["collection_id"]).sort()
    projList = tcgaColls;
    for (i=0;i<projList.length;i++){
        nm=projList[i]
        if (nm !=='None') {

            opt = document.createElement("option");
            opt.value = nm;
            opt.innerHTML = nm;

            projectElem.appendChild(opt);
        }
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


function plotCategoricalData(elem, plotId,lbl, dataDic,filterA) {

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
        if ( dataDic.hasOwnProperty(dataVal) && (!filterObj.hasOwnProperty(filterA) || filterObj[filterA].indexOf(dataVal)>-1)){
            dataCount[i] = dataDic[dataVal];
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
Plotly.newPlot(plotId,pdata,plotLayout,{displayModeBar: false});

document.getElementById(plotId).on('plotly_click',function(data){
    alert('here');
    });


}

function resolveRelatedPlotsCatWCountsRng(plotData, plotId,lbl,pHeader){

    //pHeader=[[],[],[],[],[]]
    //pHeader = plotDataA.map(function(val,index){return val[0]});
    //pCounts = plotDataA.map(function(val,index){return val[1]});
    phA = new Array();
    ctA = new Array();

    for (i=0;i<pHeader.length;i++){
        var key = pHeader[i][0];
        var nm = pHeader[i][1];
        var ct = 0;
        if (plotData.hasOwnProperty(key)){
            ct = plotData[key];
        }
        phA.push(nm)
        ctA.push(ct)
    }

     var pdata =[
    {
        x:phA,
        y: ctA,
        type: 'bar'
    }
];

plotLayout.title=lbl
Plotly.newPlot(plotId,pdata,plotLayout,{displayModeBar: false});

document.getElementById(plotId).on('plotly_click',function(data){
    alert('here');
    });


}

function resolveRelatedPlotsCatWCounts(plotDataFacetCountDic, plotId,lbl, filterLbl){

    pHeader = Object.keys(plotDataFacetCountDic).sort();
    nonePos = pHeader.indexOf('None');
    if (nonePos>-1) {
        pHeader.splice(nonePos, 1);
        pHeader.push('None');
    }

    pCounts = new Array();
    for (i=0;i<pHeader.length;i++){
        src=pHeader[i];
        if ( (plotDataFacetCountDic.hasOwnProperty(src) && (!filterObj.hasOwnProperty(filterLbl) || filterObj[filterLbl].indexOf(src)>0))  ){
           cnt=plotDataFacetCountDic[src];
        }
        else{
            cnt=0;
        }
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
Plotly.newPlot(plotId,pdata,plotLayout,{displayModeBar: false});
document.getElementById(plotId).on('plotly_click',function(data){
    alert('here');
    });


}




function removeChildren(elem){
    while(elem.firstChild){
        elem.removeChild(elem.firstChild);
    }
}


