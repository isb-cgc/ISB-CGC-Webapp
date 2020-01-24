function resolveAllPlots(){
    resolveOriginalDataPlots("modality","modality_chart","Modality");
        resolveOriginalDataPlots("body_part","body_part_examined_chart", "BodyPartExamined");
        resolveRelateDataPlotsCat("disease", "disease_code_chart","disease_code");
        resolveRelateDataPlotsCat("vital", "vital_statistics_chart","vital_status");
        resolveRelateDataPlotsCat("gender", "gender_chart","gender");
        resolveRelateDataPlotsRange("age", "age_chart","age");
        resolveRelateDataPlotsCat("race", "race_chart","race");
        resolveRelateDataPlotsCat("ethnicity", "ethnicity_chart","ethnicity");

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


function updateFilterSelection(checkBoxDiv, displaySet, header, attributeName, isStudyAttr,isRangeAttr){
    newText=header+": ";
    checkBoxElem=document.getElementById(checkBoxDiv);

    listItems=checkBoxElem.getElementsByTagName('li');
    numChecked=0;
    for (i=0;i<listItems.length;i++){
        checkBoxElem=listItems[i].getElementsByTagName('input')[0];
        if (checkBoxElem.checked){
            if (numChecked>0) {
                newText += ", " ;
            }
            newText+= listItems[i].innerText;

            numChecked++;
        }
    }
    if (numChecked === listItems.length){
        newText=header+": All";
    }
    document.getElementById(displaySet).innerHTML=newText;
    if ((!isStudyAttr) && (!isRangeAttr)){
        filterPatientsCat(attributeName,listItems);
         //resolveRelateDataPlotsCat("disease", "disease_code_chart","disease_code");
        resolveAllPlots();
    }

}

function filterPatientsCat(attribute,listItems){
    categorySet=new Object();
    for (i=0;i<listItems.length;i++){
        checkBoxElem=listItems[i].getElementsByTagName('input')[0];
        if (checkBoxElem.checked){
            categorySet[checkBoxElem.value]=1;
        }
    }

    for (i=0;i<projects.length;i++){
        curProject=projects[i];
        for (j=0;j<curProject.patients.length;j++){
            curPatient=curProject.patients[j];
            attributeValue=curPatient[attribute].toLowerCase();
            if  (categorySet.hasOwnProperty(attributeValue) && (curPatient.reasonsInActive.hasOwnProperty(attribute))){
                  delete curPatient.reasonsInActive[attribute];
                  if (Object.keys(curPatient.reasonsInActive).length===0){
                      curPatient.isActive=true;
                      curProject.numActivePatients++;
                      if (curProject.reasonsInActive.hasOwnProperty('noActivePatients')){
                          delete curProject.reasonsInActive['noActivePatients'];
                          if (Object.keys(curProject.reasonsInActive).length===0){
                              curProject.isActive=true;
                          }
                      }
                  }

            }
            else if (!categorySet.hasOwnProperty(attributeValue)){
                curPatient.reasonsInActive[attribute]=1;
                if(curPatient.isActive===true){
                    curPatient.isActive=false;
                    curProject.numActivePatients--;
                    if (curProject.numActivePatients===0){
                        curProject.reasonsInActive['noActivePatients']=1;
                        curProject.isActive=false;
                    }
                }
            }
        }
    }
}




function addPic(){
     //var destCtx=document.getElementById("dest").getContext('2d');

     //sourceD=document.getElementById("srcU").contentDocument;
     if (sourceD.readState !=="complete"){
          var len=document.getElementById("srcU").contentDocument.getElementById("root").getElementsByTagName("canvas").length;
        window.alert(len.toString());
     }
     //sourceC=document.getElementById("srcU").contentDocument.getElementsByClassName("cornerstone-canvass")[0];


     //destCtx.drawImage(sourceC,0,0);
}

function toggleSearch(n,set){
        var elemNm=new Array(3);
         elemNm[0]=set+"_orig";
         elemNm[1]=set+"_derived";
         elemNm[2]=set+"_related";
        for (var i=0;i<3;i++){
            if (n ==i){
                document.getElementById(elemNm[i]).style="display:inline-block;width:30%;border: thin solid black;background-color:dodgerblue";
                document.getElementById(elemNm[i]+"_set").style="display:inline-block;height:700px";
            }
            else{
                document.getElementById(elemNm[i]).style="display:inline-block;width:30%;border: thin solid black";
                document.getElementById(elemNm[i]+"_set").style="display:none;height:700px";

            }
        }

    }

function constructProjects(){


     projects = new Array();
     projectIndex = new Object();
     projectA = new Array();
     patientIndex = new Object();
     patientProject = new Object();
     studyIndex = new Object();
     studyPatient = new Object();
     seriesIndex = new Object();
     seriesStudy = new Object();

     diseaseCodeH = new Object();
     raceH = new Object();
     ethnicityH=new Object()



    for (i=0;i<cohortA.length;i++){
        var curCohortRow= cohortA[i];
        var projectId=curCohortRow.project;
        var patientId=curCohortRow.patientId;
        var studyId=curCohortRow.StudyInstanceUID;
        var seriesId=curCohortRow.SeriesInstanceUID;

        var curProject = new Object();
        if (!(projectId in projectIndex)){
            projectIndex[projectId]=projects.length;
            projectA.push(projectId);
            curProject.id=projectId;
            curProject.patients = new Array();
            curProject.isActive=true;
            curProject.numActivePatients=0;
            curProject.reasonsInActive=new Object();

            projects.push(curProject);

        }
        else{

            curProject = projects[projectIndex[projectId]];
        }
        var curPatient = new Object();
        if (!(patientId in patientIndex)){
            curProject.numActivePatients++;

            patientIndex[patientId]=curProject.patients.length;
            patientProject[patientId]=curProject.id
            curPatient.id=patientId;
            curPatient.isActive=true;
            curPatient.numActiveStudies=0;
            curPatient.reasonsInActive=new Object();
            curPatient.studies = new Array();
            curPatient.disease_code=curCohortRow.disease_code;
            diseaseCodeH[curPatient.disease_code.toLowerCase()]=1;
            curPatient.vital_status=curCohortRow.vital_status;

            curPatient.gender=curCohortRow.gender;
            curPatient.race=curCohortRow.race;
            raceH[curPatient.race.toLowerCase()]=1;
            curPatient.ethnicity=curCohortRow.ethnicity;
            ethnicityH[curPatient.ethnicity.toLowerCase()]=1;
            curPatient.bmi=curCohortRow.bmi;
            curPatient.age=curCohortRow.age;

            curProject.patients.push(curPatient);

        }
        else{
            curPatient = curProject.patients[patientIndex[patientId]];
        }
        var curStudy = new Object();

        if (!(studyId in studyIndex)){
             curPatient.numActiveStudies++;
             studyIndex[studyId]= curPatient.studies.length;
             studyPatient[studyId]=curPatient.id;
             curStudy.id=studyId;
             curStudy.isActive=true;
             curStudy.reasonsInActive=new Object();
             curStudy.series=new Array();
             curStudy.seg=false;
             curStudy.Modality=curCohortRow.Modality.toLowerCase();
            curStudy.BodyPartExamined=curCohortRow.BodyPartExamined.toLowerCase();
            curPatient.studies.push(curStudy);
        }
        else{
            curStudy=curPatient.studies[studyIndex[studyId]]
        }

        curStudy.series.push(seriesId);



    }

    projectA=projectA.sort();
    projectElem=document.getElementById("data_scope");
    for (i=0;i<projectA.length;i++){
        nm=projectA[i]

        opt=document.createElement("option");
        opt.value=nm;
        opt.innerHTML=nm;
        projectElem.appendChild(opt);
    }

    diseaseCodeA=Object.keys(diseaseCodeH).sort();

    //ethnicityA=diseaseCodeH.keys().sort();
    diseaseElem=document.getElementById("disease_list");
    removeChildren(diseaseElem);
    for (i=0;i<diseaseCodeA.length;i++){
        diseaseCode=diseaseCodeA[i];
        if (diseaseCode !=="none") {
            var opt = document.createElement("LI");
            opt.innerHTML = '<input type="checkbox" checked value="' + diseaseCode + '" onclick="updateFilterSelection(\'disease_list\', \'disease_code_set\',\'Disease Code\', \'disease_code\',false,false)">' + diseaseCode;
            diseaseElem.appendChild(opt);
        }
    }
    //<li><input type="checkbox" checked value="na">NA</li>
    opt = document.createElement("LI");
    opt.innerHTML = '<input type="checkbox" checked value="None" onclick="updateFilterSelection(\'disease_list\', \'disease_code_set\',\'Disease Code\', \'disease_code\',false,false)">NA';
    diseaseElem.appendChild(opt);

    raceA=Object.keys(raceH).sort();
    raceElem=document.getElementById("race_list");
    for (i=0;i<raceA.length;i++){
        race=raceA[i];
        if (race !=="none") {
            var opt = document.createElement("LI");
            opt.innerHTML = '<input type="checkbox" checked value="' + race + '"  onclick="updateFilterSelection(\'race_list\', \'race_set\',\'Race\', \'race\',\'false\',\'false\')">' + race;
            raceElem.appendChild(opt);
        }
    }
    opt = document.createElement("LI");
    opt.innerHTML = '<input id="race_list_none" type="checkbox" checked value="None" onclick="updateFilterSelection(0,\'race_list\', \'race_set\',\'Race\', \'race\',\'false\',\'false\')">NA';
    raceElem.appendChild(opt);

    ethnicityA=Object.keys(ethnicityH).sort();
    ethnicityElem=document.getElementById("ethnicity_list");

    for (i=0;i<ethnicityA.length;i++){
        ethnicity=ethnicityA[i];
        if (ethnicity !=="none") {
            var opt = document.createElement("LI");
            opt.innerHTML = '<input type="checkbox" checked value="' + ethnicity + '" onclick="updateFilterSelection(\'ethnicity_list\', \'ethnicity_set\',\'Ethnicity\',\'ethnicity\',\'false\',\'false\')">' + ethnicity;
            ethnicityElem.appendChild(opt);
        }
    }
    opt = document.createElement("LI");
    opt.innerHTML = '<input id="ethnicity_list_none" type="checkbox" checked value="none" onclick="updateFilterSelection(0,\'ethnicity_list\', \'ethnicity_set\',\'Ethnicity\',\'ethnicity\',\'false\',\'false\')">NA';
    ethnicityElem.appendChild(opt);



}


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
                        if (curStudy.isActive) {
                            dataFound[curStudy[lbl].toLowerCase()] = 1
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

/*
var ctx = document.getElementById(plotId);
var myChart = new Chart(ctx, {
  type: 'bar',
    title:lbl,
    options:{
      legend:{
          display:false
      },
        title:{
          display:true,
            text:lbl
        }
    },

  data: {
    labels: dataValues,
    datasets: [
      {
        data:dataCount
      }
    ]
  }
}); */

var pdata =[
    {
        x:dataValues,
        y: dataCount,
        type: 'bar'
    }
];

 var layout = {
            autosize:true,
            margin:40

        };
Plotly.newPlot(plotId,pdata,layout);


}



function resolveRelateDataPlotsCat(elem, plotId,lbl){

var dataList= document.getElementById(elem).getElementsByTagName("ul")[0].getElementsByTagName("input");

var dataHeaders=new Array();
var dataValues = new Array();
var dataValueMp=new Object();
var dataCount=new Array();


for (i=0;i<dataList.length;i++){

     var input =dataList[i];
     var dataHeader=input.innerHTML;
     dataHeaders.push(dataHeader);
     dataCount[i]=0;

     var dataVal=input.value;
     dataValueMp[dataVal]=i;
     dataValues.push(dataVal);
}
for(i=0;i<projects.length;i++){
    curProject=projects[i];
    if (curProject.isActive) {
        for (j = 0; j < curProject.patients.length; j++) {
            curPatient = curProject.patients[j];
            if (curPatient.isActive) {
                dataVal = curPatient[lbl].toLowerCase();
                if (dataValueMp.hasOwnProperty(dataVal)) {
                    dataCount[dataValueMp[dataVal]]++;
                }
            }

        }
    }
}

/* var ctx = document.getElementById(plotId);
var myChart = new Chart(ctx, {
  type: 'bar',
    title:lbl,
    options:{
      legend:{
          display:true
      },
        title:{
          display:true,
            text:lbl
        }
    },

  data: {
    labels: dataValues,
    datasets: [
      {
        data:dataCount
      }
    ]
  }
}); */

var pdata =[
    {
        x:dataValues,
        y: dataCount,
        type: 'bar'
    }
];

 var layout = {
            autosize:true,
             margin: {
    l: 30,
    r: 30,
    b: 60,
    t: 30,
    pad: 0
  },

        };
Plotly.newPlot(plotId,pdata,layout);

}


function resolveRelateDataPlotsRange(elem, plotId,lbl){

var dataList= document.getElementById(elem).getElementsByTagName("ul")[0].getElementsByTagName("input");


var dataHeaders=new Array();
var larray=document.getElementById(elem).getElementsByTagName("ul")[0].getElementsByTagName("li");
for (i=0;i<larray.length;i++){
    headval=larray[i].innerText;
    dataHeaders.push(headval);
}
var dataRanges = new Array();
var dataRangeMp=new Object();
var dataCount=new Array();
var dataValues = new Array();


for (i=0;i<dataList.length;i++){

     var input =dataList[i];
     //var dataHeader=input.innerHTML;
     //dataHeaders.push(dataHeader);
     dataCount[i]=0;

     var dataRange=input.value;
     //dataHeaders.push(dataRange);
     //dataValueMp[dataRange]=i;
     if (i<(dataList.length-2)){
         dataRangePair=dataRange.split(',').map(function(val,index){return parseFloat(val)});
         dataValues.push(dataRangePair);
     }
     else if (i==dataList.length-2){
         dataValues.push(parseFloat(dataRange));
     }
     else {
         dataValues.push(dataRange);
     }
}


for(i=0;i<projects.length;i++){
    curProject=projects[i];

    if (curProject.isActive){
        for(j=0;j<curProject.patients.length;j++) {
            curPatient = curProject.patients[j];
            if (curPatient.isActive) {
                dataVal = curPatient[lbl].toLowerCase();
                if (dataVal === "none") {
                    dataCount[dataValues.length - 1]++;
                } else if (!(isNaN(parseFloat(dataVal)))) {
                    dataValf = parseFloat(dataVal);
                    for (k = 0; k < dataValues.length - 2; k++) {
                        if ((dataValf >= dataValues[k][0]) && (dataValf < dataValues[k][1])) {
                            dataCount[k]++;
                            break;
                        }
                    }
                    if (dataValf >= dataValues[dataValues.length - 2]) {
                        dataCount[dataValues.length - 2]++;
                    }

                }
            }
        }

   }

}

/* var ctx = document.getElementById(plotId);
var myChart = new Chart(ctx, {
  type: 'bar',
    title:lbl,
    options:{
      legend:{
          display:true
      },
        title:{
          display:true,
            text:lbl
        }
    },

  data: {
    labels: dataValues,
    datasets: [
      {
        data:dataCount
      }
    ]
  }
}); */

var pdata =[
    {
        x:dataHeaders,
        y: dataCount,
        type: 'bar'
    }
];

 var layout = {
            autosize:true,
            margin: {
    l: 30,
    r: 30,
    b: 60,
    t: 30,
    pad: 0
  },

        };
Plotly.newPlot(plotId,pdata,layout);

}



function removeChildren(elem){
    while(elem.firstChild){
        elem.removeChild(elem.firstChild);
    }
}

 function updateSelections(level, chosenIds){
    var curProject = new Object();
    var curPatient = new Object();
    var curStudy = new Object();
    if (level<0) {
        var selectElem = document.getElementById("collection_select");
        removeChildren(selectElem);
        for (i=0;i<projectA.length;i++){
            var projId=projectA[i];
            var thisProject=projects[i];
            if ((thisProject.isActive) && (thisProject.numActivePatients>0)) {
                var opt = document.createElement("OPTION");
                opt.value = projId;
                opt.innerHTML = projId;

                if ((chosenIds.length>0) && (chosenIds[0]===projId) ){
                    opt.selected="true";
                }
                selectElem.appendChild(opt);
            }

        }

    }


     if (level<1){
        var projectSelectedIndex= document.getElementById("collection_select").selectedIndex;
        var projectId=document.getElementById("collection_select").options[projectSelectedIndex].value;
        curProject=projects[projectIndex[projectId]];
        var selectElem = document.getElementById("patient_select");
        removeChildren(selectElem);
        for (i=0;i<curProject.patients.length;i++){
            var thisPatient=curProject.patients[i];
            if ((thisPatient.isActive) && (thisPatient.numActiveStudies>0) ){
                var opt = document.createElement("OPTION");
                opt.value = thisPatient.id;
                opt.innerHTML = thisPatient.id;
                selectElem.appendChild(opt);
            }
        }
    }

     if (level<2){
        var patientSelectedIndex= document.getElementById("patient_select").selectedIndex;
        var patientId=document.getElementById("patient_select").options[patientSelectedIndex].value;
        var projectId=patientProject[patientId];
        curPatient=projects[projectIndex[projectId]].patients[patientIndex[patientId]];
        var selectElem = document.getElementById("study_select");
        removeChildren(selectElem);
        for (i=0;i<curPatient.studies.length;i++){
            var thisStudy=curPatient.studies[i];
            if (thisStudy.isActive ){
                var opt = document.createElement("OPTION");
                opt.value = thisStudy.id;
                opt.innerHTML = thisStudy.id;
                selectElem.appendChild(opt);
            }
        }
    }

     var studySelectedIndex = document.getElementById("study_select").selectedIndex;
     var studyId=document.getElementById("study_select").options[studySelectedIndex].value;
     var patientId=studyPatient[studyId];
     var projectId=patientProject[patientId];
     curStudy=projects[projectIndex[projectId]].patients[patientIndex[patientId]].studies[studyIndex[studyId]];
     var selectElem = document.getElementById("series_select");
     removeChildren(selectElem);
     for (i=0;i<curStudy.series.length;i++){
         var thisSeries=curStudy.series[i];
         var opt = document.createElement("OPTION");
         opt.value = thisSeries;
         opt.innerHTML = thisSeries;
         selectElem.appendChild(opt);
     }

}