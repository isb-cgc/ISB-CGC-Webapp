




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
            curProject.active=true;
            curProject.patientsActive=0;

            projects.push(curProject);

        }
        else{

            curProject = projects[projectIndex[projectId]];
        }
        var curPatient = new Object();
        if (!(patientId in patientIndex)){
            curProject.patientsActive++;

            patientIndex[patientId]=curProject.patients.length;
            patientProject[patientId]=curProject.id
            curPatient.id=patientId;
            curPatient.active=true;
            curPatient.studiesActive=0;
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

            curProject.patients.push(curPatient);

        }
        else{
            curPatient = curProject.patients[patientIndex[patientId]];
        }
        var curStudy = new Object();

        if (!(studyId in studyIndex)){
             curPatient.studiesActive++;
             studyIndex[studyId]= curPatient.studies.length;
             studyPatient[studyId]=curPatient.id;
             curStudy.id=studyId;
             curStudy.active=true;
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
    diseaseCodeA=Object.keys(diseaseCodeH).sort();

    //ethnicityA=diseaseCodeH.keys().sort();
    diseaseElem=document.getElementById("disease_list");
    for (i=0;i<diseaseCodeA.length;i++){
        diseaseCode=diseaseCodeA[i];
        if (diseaseCode !=="none") {
            var opt = document.createElement("LI");
            opt.innerHTML = '<input type="checkbox" checked value="' + diseaseCode + '">' + diseaseCode;
            diseaseElem.appendChild(opt);
        }
    }
    //<li><input type="checkbox" checked value="na">NA</li>
    opt = document.createElement("LI");
    opt.innerHTML = '<input id="diseae_list_none" type="checkbox" checked value="None">NA';
    diseaseElem.appendChild(opt);

    raceA=Object.keys(raceH).sort();
    raceElem=document.getElementById("race_list");
    for (i=0;i<raceA.length;i++){
        race=raceA[i];
        if (race !=="none") {
            var opt = document.createElement("LI");
            opt.innerHTML = '<input type="checkbox" checked value="' + race + '">' + race;
            raceElem.appendChild(opt);
        }
    }
    opt = document.createElement("LI");
    opt.innerHTML = '<input id="race_list_none" type="checkbox" checked value="None">NA';
    raceElem.appendChild(opt);

    ethnicityA=Object.keys(ethnicityH).sort();
    ethnicityElem=document.getElementById("ethnicity_list");

    for (i=0;i<ethnicityA.length;i++){
        ethnicity=ethnicityA[i];
        if (ethnicity !=="none") {
            var opt = document.createElement("LI");
            opt.innerHTML = '<input type="checkbox" checked value="' + ethnicity + '">' + ethnicity;
            ethnicityElem.appendChild(opt);
        }
    }
    opt = document.createElement("LI");
    opt.innerHTML = '<input id="ethnicity_list_none" type="checkbox" checked value="none">NA';
    ethnicityElem.appendChild(opt);



}


function resolveOriginalDataPlots(elem, plotId,lbl){

var modalityList= document.getElementById(elem).getElementsByTagName("ul")[0].getElementsByTagName("input");

var modalityHeader=new Array();
var modalityValues = new Array();
var modalityValueMp=new Object();
var modalityCount=new Array();


for (i=0;i<modalityList.length;i++){

     var input =modalityList[i];
     var modalityH=input.innerHTML;
     var modality=input.value;
     modalityValueMp[modality]=i;
     modalityCount[i]=0;
     modalityHeader.push(modalityH);
     modalityValues.push(modality);

}
for(i=0;i<projects.length;i++){
    curProject=projects[i]
    for(j=0;j<curProject.patients.length;j++){
        curPatient=curProject.patients[j];
        if ( (curPatient.active) && (curPatient.studiesActive>0)) {
            var modalityFound = new Object();
            for (k = 0; k < curPatient.studies.length;k++){
                curStudy=curPatient.studies[k];
                if (curStudy.active){
                    modalityFound[curStudy[lbl]]=1
                }
            }
            modalityFoundList=Object.keys(modalityFound);
            for (k=0;k<modalityFoundList.length;k++) {
                modality = modalityFoundList[k]
                if (modalityValueMp.hasOwnProperty(modality)) {
                    modalityCount[modalityValueMp[modality]]++;
                }
            }
        }


   }

}

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
    labels: modalityValues,
    datasets: [
      {
        data:modalityCount
      }
    ]
  }
});




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
            if ((thisProject.active) && (thisProject.patientsActive>0)) {
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
            if ((thisPatient.active) && (thisPatient.studiesActive>0) ){
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
            if (thisStudy.active ){
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