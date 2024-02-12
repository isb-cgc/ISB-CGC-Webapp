/**
 *
 * Copyright 2020, Institute for Systems Biology
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
    baseUrl: STATIC_FILES_URL+'js/',
    paths: {
        jquery: 'libs/jquery-3.5.1',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security/script',
        underscore: 'libs/underscore-min',
        assetscore: 'libs/assets.core',
        assetsresponsive: 'libs/assets.responsive',
        tablesorter:'libs/jquery.tablesorter.min'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'tablesorter': ['jquery'],
        'underscore': {exports: '_'}
    }
});

// Set up common JS UI actions which span most views
require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'underscore',
    'utils',
    'assetscore',
    'assetsresponsive',
    'tablesorter'
], function($, jqueryui, bootstrap, session_security, _, utils) {


});

// Return an object for consts/methods used by most views
define(['jquery', 'utils'], function($, utils) {
    const FLOAT_SLIDERS = ["Sphericity_quant"];

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

    var parseFilterObj = function () {
        var hasTcgaCol = false;
        if ((window.filterObj.hasOwnProperty('Program')) && (window.filterObj.Program.indexOf('TCGA') > -1)) {
            hasTcgaCol = true;
        }
        collObj = new Array();
        filtObj = new Object();
        for (ckey in window.filterObj) {
            if (ckey === 'Program') {
                for (ind = 0; ind < window.filterObj[ckey].length; ind++) {
                    program = window.filterObj[ckey][ind];
                    if (program in window.projSets) {
                        if (!('Program.' + program in window.filterObj)) {
                            collObj = collObj.concat(window.projSets[program]);
                        }
                    } else {
                        collObj.push(program);
                    }
                }
            } else if (ckey.startsWith('Program.')) {
                for (ind = 0; ind < window.filterObj[ckey].length; ind++) {
                    collObj.push(window.filterObj[ckey][ind]);
                }
            } else if (!(ckey).startsWith('tcga_clinical') || hasTcgaCol) {
                nmA = ckey.split('.');
                nm = nmA[nmA.length - 1];
                if (nm.endsWith('_rng')) {
                    if (window.filterObj[ckey].type === 'none') {
                        nm = nm.replace('_rng', '');
                    } else {
                        nm = nm.replace('_rng', '_' + window.filterObj[ckey].type);
                    }
                    if (('rng' in window.filterObj[ckey]) && ('none' in window.filterObj[ckey])) {
                        if (Array.isArray(window.filterObj[ckey]['rng'][0])) {
                            filtObj[nm] = [...window.filterObj[ckey]['rng']];
                            filtObj[nm].push('None');
                        } else {
                            filtObj[nm] = [window.filterObj[ckey]['rng'], 'None']
                        }
                    } else if ('rng' in window.filterObj[ckey]) {
                        filtObj[nm] = window.filterObj[ckey]['rng']
                    } else if ('none' in window.filterObj[ckey]) {
                        noneKey = nm.replace('_rng', '');
                        filtObj[noneKey] = ['None'];
                    }
                } else {
                    filtObj[nm] = window.filterObj[ckey];
                }
            }
        }
        if (collObj.length > 0) {
            filtObj['collection_id'] = collObj.sort();
        }
        return filtObj;
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

    const checkOtherSets = function(nm){
       var found = false;
       var selnm=-1;
       var filtArr = mapFiltObj(window.filterObj)[0]['filters']

       for (var i=0;i<window.filterSet.length;i++){
           diff = true;
           if ((i!=nm) && (window.filterSet[i]['enabled'])) {
               cset = window.filterSet[i].filterObj
               csetArr = mapFiltObj(cset)[0]['filters'];

               if (filtArr.length==csetArr.length){
                   diff=false;
                   for (var j=0; j<filtArr.length;j++){
                       var filt1=filtArr[j];
                       var filt2 = csetArr[j];
                       if ((filt1['id'] != filt2['id']) || (filt1['op'] != filt2['op'])){
                           diff = true;
                           break;
                       }
                       else{
                           for (var k=0; k<filt1['values'].length;k++){
                               if (filt1['values'][k]!=filt2['values'][k]){
                                   diff = true;
                                   break;
                               }
                           }
                       }
                       if (diff){
                           break;
                       }
                   }
               }

           }
           if (!(diff)){
               selnm=i
               break;
              }
       }
       return selnm;
   }




    const mapFiltObj = function(filterObj){
        var filtmp=[]
        filtmp[0]={}
        filtmp[0]['filters'] = new Array();

        var pfiltdic={'id':120, 'op':"OR", 'values':[]}
        for (var nkey in filterObj){
            if (nkey.startsWith('Program')){
              pfiltdic['values']=[...pfiltdic['values'],...filterObj[nkey]]

            }
            else{
              var filtdic={}
              var attSet = attMap[nkey];
              var id= attSet['id'];
              var filt = filterObj[nkey]
              if (Array.isArray(filt)){
                filtdic['values']=[...filt].sort();
                filtdic['id']=id;
                filtdic['op']="OR";
              }
              else{
                filtdic['values']=[...filt['values']].sort();
                filtdic['id']=id;
                filtdic['op']=filt['op'];
              }
              filtmp[0]['filters'].push(filtdic);
        }
        }

        if (pfiltdic['values'].length>0){
            pfiltdic['values'].sort();
           filtmp[0]['filters'].push(pfiltdic)
        }

        filtmp[0]['filters'].sort(function(a,b){
            return a['id']-b['id'];
        })

        return filtmp
    }



    var handleFilterSelectionUpdate = function(filterElem, mkFilt, doUpdate) {
        var updateDone = false;
        var updateWait = false;
        checkFilters(filterElem);
        if (mkFilt) {
            mkFiltText();
        }

        if (doUpdate){
            if ((window.filterSet.length>1)){
               var selnm=checkOtherSets(window.filterSetNum)
                if (selnm>-1){
                    window.filterSet[window.filterSetNum].filterObj=JSON.parse(JSON.stringify(filterObjOld));
                    updateDone=true;
                    //window.filterSetNum=selnm;
                    changeFilterSet(selnm, true);
                }
                else if (window.cartSize>0) {
                    updateWait=true;
                    if (window.choiceMade) {
                        processUserChoice();
                    }
                    else {

                    $('#filter-option-modal').addClass('filtermoddisp');
                    $('#filter-option-modal').removeClass('filternotmoddisp');
                    }
                   //window.filterSet[window.filterSetNum].filterObj=JSON.parse(JSON.stringify(filterObjOld));
                    //createNewFilterSet(filterObj, true);
                }
            }
            else if (window.cartSize>0) {
                updateWait = true;
                if (window.choiceMade) {
                   window.processUserChoice();
                } else {

                $('#filter-option-modal').addClass('filtermoddisp');
                $('#filter-option-modal').removeClass('filternotmoddisp');
                 }
                    //window.filterSet[window.filterSetNum].filterObj=JSON.parse(JSON.stringify(filterObjOld));
                    //createNewFilterSet(filterObj,true);
                }
            if (!updateWait) {
                filterObjOld = JSON.parse(JSON.stringify(filterObj));
            }
            if (!updateDone && !updateWait) {
                window.updateFacetsData(true);
            }

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



    return {
        update_bq_filters: update_bq_filters,
        update_filter_url: update_filter_url,
        parseFilterObj: parseFilterObj,
        findFilterCats: findFilterCats,
        parseFilterForCounts:parseFilterForCounts,
        handleFilterSelectionUpdate:handleFilterSelectionUpdate,
        mkFiltText:mkFiltText,
        FLOAT_SLIDERS:FLOAT_SLIDERS,
        updateFilterSelections:updateFilterSelections,
        checkFilters:checkFilters,
        checkOthersets: checkOtherSets,
        mapFiltObj:mapFiltObj
    }

});
