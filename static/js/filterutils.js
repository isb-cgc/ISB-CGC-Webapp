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
        jquery: 'libs/jquery-3.7.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        base: 'base',
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
    'base',
    'assetscore',
    'assetsresponsive',
    'tablesorter'
], function($, jqueryui, bootstrap, session_security, _, base) {


});

// Return an object for consts/methods used by most views
define(['jquery', 'base'], function($, base) {


    var ANONYMOUS_FILTERS = {};
    var showFilters = [];
    var first_filter_load = true;

    const update_bq_filters = function() {
        let filters = parseFilterObj();
        if (Object.keys(filters).length <= 0) {
            $('.bq-string-copy').attr("disabled","disabled");
            $('.bq-string-display').attr("disabled","disabled");
            $('.bq-string-display').attr("title","Select a filter to enable this feature.");
            $('.bq-string').html("");
            $('#export-manifest-form input[name="filters"]').val("");
        } else {
            $('.bq-string-copy').removeAttr("disabled");
            $('.bq-string-display').removeAttr("disabled");
            $('.bq-string-display').attr("title","Click to display this filter as a BQ string.");
            $('.bq-string-display').attr('filter-params', JSON.stringify(filters));
            $('.bq-string-copy').attr('filter-params', JSON.stringify(filters));
            $('#export-manifest-form input[name="filters"]').val(JSON.stringify(filters));
        }
    };

    var update_filter_url = function() {
        let filters = parseFilterObj();
        if (Object.keys(filters).length <= 0) {
            $('.filter-placeholder').show();
            $('.get-filter-uri').attr("disabled","disabled");
            $('#export-manifest').attr("disabled","disabled");
            $('#export-manifest').attr("data-no-filters", "true");
            if(!$('#export-manifest').attr('data-pending-manifest')) {
                $('#export-manifest').attr("title", "Select a filter to enable this feature.");
            }
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
            $('.filter-placeholder').hide();
            $('.get-filter-uri').removeAttr("disabled");
            $('#export-manifest').removeAttr("data-no-filters");
            if(!$('#export-manifest').attr('data-pending-manifest')) {
                $('#export-manifest').removeAttr("disabled");
                $('#export-manifest').attr("title", "Export these search results as a manifest for downloading.");
            }
            $('.copy-url').removeAttr("disabled");
            $('.get-filter-uri').attr("title","Click to display this filter set's query URL.");
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


    window.clear_filters = function(){
      $('#program_set').find('.search-checkbox-list').find('input:checkbox').prop('checked', false);
      $('#program_set').find('.search-checkbox-list').find('input:checkbox').prop('indeterminate', false);
      $('#analysis_set').find('.search-checkbox-list').find('input:checkbox').prop('checked', false);
        $('#search_orig_set').find('.search-checkbox-list').find('input:checkbox').prop('checked', false);

    }
    window.load_filters = function(filters) {
         var sliders = [];
        _.each(filters, function(group){
            _.each(group['filters'], function(filter) {
                let selector = 'div.list-group-item__body[data-filter-attr-id="' +
                    filter['id'] + '"], ' + 'div.list-group-sub-item__body[data-filter-attr-id="' +
                    filter['id'] + '"]';
                $(selector).parents('.collection-list').collapse('show');

                $(selector).each(function(index, selEle) {
                    let attValueFoundInside = false;
                    if ($(selEle).children('.ui-slider').length > 0) {
                        attValueFoundInside = true;
                        let pushSliders = false;
                        let left_val = 0;
                        let right_val = 0;
                        if (filter['values'].indexOf('None')>-1) {
                            var ckbx=$(selEle).find('.noneBut').children('input:checkbox')[0];
                            ckbx.checked=true;
                            var parStr=$(selEle).children('.ui-slider').data('attr-par');
                            addNone(ckbx, parStr, false);
                            if (filter['values'].length>1){
                                pushSliders=true;
                                var ind = (filter['values'].indexOf('None')+1)%2
                                var vals=JSON.parse(filter['values'][ind]);
                                left_val=vals[0];
                                right_val=vals[1];
                            }
                        } else {
                            pushSliders=true;
                            left_val=filter['values'][0].indexOf(".") >= 0 ? parseFloat(filter['values'][0]) : parseInt(filter['values'][0]);
                            right_val=filter['values'][1].indexOf(".") >= 0 ? parseFloat(filter['values'][1]) : parseInt(filter['values'][1]);
                        }

                        if (pushSliders) {
                            sliders.push({
                                'id': $('div.list-group-item__body[data-filter-attr-id="' + filter['id'] + '"]').children('.ui-slider')[0].id,
                                'left_val': left_val,
                                'right_val': right_val,
                            });
                        }
                     } else {
                       _.each(filter['values'], function (val) {
                           if (filter.hasOwnProperty('op')) {
                               if($(selEle).find('.join_val').length>0) {
                                   $(selEle).find('.join_val').filter('input[value=' + filter['op'].toUpperCase() + ']').prop("checked", true);
                               } else {
                                   (filter['op'] !== 'OR' && filter['op'] !== 'BTW') && base.showJsMessage(
                                       "warning",
                                       "Invalid operator seen for attribute '"+$(selEle).attr('id')+"'; default of OR used instead.",
                                       true
                                   );
                               }
                           }
                           if ($(selEle).find('input[data-filter-attr-id="' + filter['id'] + '"][value="' + val + '"]').length>0) {
                               attValueFoundInside = true;
                           }
                           $('input[data-filter-attr-id="' + filter['id'] + '"][value="' + val + '"]').prop("checked", true);
                           checkFilters($('input[data-filter-attr-id="' + filter['id'] + '"][value="' + val + '"]'));
                      });
                  }
                if (attValueFoundInside){
                    showFilters.push([selEle,selector]);
                }
               });
            });
        });
        if (sliders.length > 0) {
            load_sliders(sliders, false);
        }

        //mkFiltText();
        //return updateFacetsData(true).promise();
        return handleFilterSelectionUpdate(null, true, true)

     };

    const load_preset_filters = function() {
        let loadPending = null;
        if (is_cohort && !cohort_loaded) {
             loadPending = load_filters(cohort_filters);
             loadPending.then(function () {
                 console.debug("Load pending complete.");
                 cohort_loaded = true;
                 $('input[type="checkbox"]').prop("disabled", "disabled");
                 $('#projects_table').find('input:checkbox').removeAttr("disabled");
                 //$('.check-all').prop("disabled","disabled");
                 // Re-enable checkboxes for export manifest dialog, unless not using social login
                 $('#export-manifest-modal input').removeAttr('disabled');

                 $('input.hide-zeros').prop("disabled", "");
                 $('input.hide-zeros').prop("checked", true);
                 $('input.hide-zeros').each(function(){$(this).triggerHandler('change')});
                 $('div.ui-slider').siblings('button').prop("disabled", true);
                 $('.noneBut').find('input:checkbox').prop("disabled",true);
             });
         } else {
             // Anonymously selected filters have precedence over filters for load.
             // check for localStorage key of saved filters from a login
             load_anonymous_selection_data();
             let has_sliders = (ANONYMOUS_SLIDERS !== null && ANONYMOUS_SLIDERS.length > 0);
             let has_filters = (ANONYMOUS_FILTERS !== null && ANONYMOUS_FILTERS[0]['filters'].length > 0);

             if (!(has_filters || has_sliders)) {
                 // No anonymous filters seen--check for filter URI
                if (filters_for_load && Object.keys(filters_for_load).length > 0) {
                     loadPending = load_filters(filters_for_load, );
                     loadPending.then(function () {
                         //console.debug("External filter load done.");
                     });
                 }
             } else {
                 if (has_sliders) {
                     loadPending = load_sliders(ANONYMOUS_SLIDERS, !has_filters);
                     if (loadPending) {
                        loadPending.then(function () {
                             //console.debug("Sliders loaded from anonymous login.");
                         });
                     }
                 }
                 if (has_filters) {
                     loadPending = load_filters(ANONYMOUS_FILTERS, );
                     loadPending.then(function () {
                         //console.debug("Filters loaded from anonymous login.");
                     });
                 }
             }
         }
         if (loadPending) {
             loadPending.then(function() {
                 load_filter_selections(showFilters);
             });
         }
         return loadPending;
     }

      const load_anonymous_selection_data = function() {
        // Load anonymous filters from session storage and clear it, so it is not always there
        let filter_str = sessionStorage.getItem('anonymous_filters');
        ANONYMOUS_FILTERS = JSON.parse(filter_str);
        sessionStorage.removeItem('anonymous_filters');

        let slider_str = sessionStorage.getItem('anonymous_sliders');
        ANONYMOUS_SLIDERS = JSON.parse(slider_str);
        sessionStorage.removeItem('anonymous_sliders');
    };

    const load_filter_selections = function(selections) {
        _.each(selections,function(selectors){
            let selEle = selectors[0];
            let selector = selectors[1];
            $(selEle).collapse('show');
            $(selEle).parents('.tab-pane.search-set').length > 0 && $('a[href="#' + $(selector).parents('.tab-pane.search-set')[0].id + '"]').tab('show');
        });
    };


    window.addNone = function(elem, parStr, updateNow) {
            var id = parStr+$(elem).closest('.list-group-item__body')[0].id+"_rng";

            if (elem.checked){
                if (!(id in window.filterObj)) {
                    window.filterObj[id] = new Array();
                    window.filterObj[id]['type']='none';
                }
                window.filterObj[id]['none'] = true;
                //$(elem).parent().parent().addClass('isActive');
            }

            else {
                if ((id in window.filterObj) && ('none' in window.filterObj[id])){
                    delete window.filterObj[id]['none'];
                    if (!('rng' in window.filterObj[id])){
                        delete window.filterObj[id];
                        //$(elem).parent().parent().removeClass('isActive');
                    }
                }
            }

            var slideNm = $(elem).parent()[0].id+"_slide";
            mkFiltText();

            if (updateNow) {
                updateFacetsData(true);
            }
        }
        
        const updateCollectionTotals = function(listId, progDic){
        var reformDic = new Object();
        reformDic[listId] = new Object();
        for (item in progDic){
            if ((item !=='All') && (item !=='None') && (item in window.programs) && (Object.keys(progDic[item]['projects']).length>0)){
                if ( Object.keys(window.programs[item]['projects']).length===1) {
                    nitem=Object.keys(progDic[item]['projects'])[0];
                    reformDic[listId][nitem]=new Object();
                    reformDic[listId][nitem]['count'] = progDic[item]['val'];
                } else {
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
        updateColl(false);
    }

    const parseFilterObj = function () {
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
    const findFilterCats = function (id, wCheckBox) {
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

    const parseFilterForCounts = function (id) {
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
     const checkFilters = function(filterElem) {
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

    window.updateColl = function(srch){
        let checked=$('#Program').find('.hide-zeros')[0].checked;
        let filtSet=['program_set']
        setAllFilterElements(checked,filtSet,srch);
    }

    const updateFilterSelections = function (id, dicofdic) {
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


    window.resetFilters = function(){
        $('input:checkbox').not('.hide-zeros').not('.tbl-sel').prop('checked',false);
        $('input:checkbox').not('.hide-zeros').not('.tbl-sel').prop('indeterminate',false);
        $('.ui-slider').each(function(){
            setSlider(this.id,true,0,0,true, false);
        })
        $('#search_def_warn').hide();
        window.filterObj= {};
        window.handleFilterSelectionUpdate(null, true, true);
    }


    window.handleFilterSelectionUpdate = function(filterElem, mkFilt, doUpdate) {
        var promise =  null
        if (!(filterElem ===null)) {
            checkFilters(filterElem);
        }

        var isFiltered = false;
        //var isFiltered = Boolean($('#search_def p').length > 0);

        if (mkFilt) {

            isFiltered = mkFiltText();
            update_filter_url();
            update_bq_filters();
          if (window.location.href.search(/\/filters\//g) >= 0) {
             if (!first_filter_load) {
                window.history.pushState({}, '', window.location.origin + "/explore/")
            } else {
                first_filter_load = false;
            }
        }


        }

        if (doUpdate){
            var projArr=[]
            var mxstudies = 0;
            var mxseries = 0;

            for (var projid in window.projstudymp) {
                for (var studyid in window.projstudymp[projid]) {
                    if ( studyid in window.glblcart) {
                    projArr.push(projid);
                    mxstudies += window.selProjects[projid]['mxstudies'];
                    mxseries += window.selProjects[projid]['mxseries'];
                    break;
                   }
                }
            }

            var serverdata = [updateFacetsData(true)];
            if (projArr.length>0)
            {
                serverdata.push(updateProjStudyMp(projArr, mxstudies, mxseries))
            }


            //$.when.apply(undefined, serverdata).then(function(ret)
            promise = Promise.all(serverdata).then(function(ret)
            {
                var collFilt = ret[0][0];
                var collectionData = ret[0][1];
                var collectionStats = ret[0][2];
                var totals = ret[0][3];
                var numStudiesRet = totals.StudyInstanceUID;



                createPlots('search_orig_set');
               createPlots('search_derived_set');
               createPlots('tcga_clinical');

                if ($('.search-configuration').find('.hide-zeros')[0].checked) {
                        addSliders('search_orig_set', false, true, '');
                        addSliders('quantitative', false, true, 'quantitative.');
                        addSliders('tcga_clinical', false, true, 'tcga_clinical.');
                    }
                updateTablesAfterFilter(collFilt, collectionData, collectionStats);
                updateTableCounts(1)
            });


        }
        return promise
    };

    const mkFiltText = function () {

        var isfiltered = true;
        var buttxt = '<button class="btn filter-type clear-filters" role="button" title="Clear the current filter set."><i class="fa fa-rotate-left"></i></a> </button>';
        var infotxt = '<i class="fa-solid fa-info-circle cohort-summary"></i>';
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
            document.getElementById("search_def").innerHTML = '<p>' + buttxt + oString /*+ infotxt*/ +'</p>';
            document.getElementById('filt_txt').value=oString;
            $('#search_def').removeClass('is-hidden');

            $('.clear-filters').on('click', function () {
                window.resetFilters();
           });
            isfiltered = true;

        } else {
            document.getElementById("search_def").innerHTML = '<span class="placeholder">&nbsp;</span>';
            $('#search_def').addClass('is-hidden');
            document.getElementById('filt_txt').value="";
            isfiltered = false;
        }
        return(isfiltered)

    };

    const checkUncheckAll = function(aelem, isCheck, checkSrch){
        //$('#' + filterId).find('.checkbox').find('input').prop('checked', true);
                var filterElems = new Object();
                filterElems = $(aelem).parentsUntil('.list-group-item, #program_set').filter('.list-group-item__body, .list-group-sub-item__body, #Program').children('ul').children();
                for (var ind = 0; ind < filterElems.length; ind++) {
                    var ckElem = new Object();
                    if ($(filterElems[ind]).children().filter('.list-group-item__heading').length > 0) {
                        ckElem = $(filterElems[ind]).children().filter('.list-group-item__heading').children().filter('input:checkbox')[0];
                    } else {
                        ckElem = $(filterElems[ind]).children().filter('label').children().filter('input:checkbox')[0];
                    }
                    var subListUsed=false
                    if (checkSrch) {
                        subListElem = $(ckElem).parent().parent().children('.list-group-sub-item__body')
                        if (subListElem.length > 0) {
                            subListUsed = true
                            subFilterElems = subListElem.find('ul').find('.checkbox')
                            for (var subInd = 0; subInd < subFilterElems.length; subInd++) {
                                subFilterElem = subFilterElems[subInd];
                                if (!$(subFilterElem).hasClass('filtByVal')) {
                                    subCkElem = $(subFilterElem).find('input:checkbox')[0];
                                    subCkElem.checked = isCheck;
                                    if ((subInd < subFilterElems.length - 1) || (ind < filterElems.length - 1)) {
                                        handleFilterSelectionUpdate(subCkElem, false, false);
                                    } else {
                                        handleFilterSelectionUpdate(subCkElem, true, true);
                                    }
                                }

                            }

                        } else if (!$(ckElem).parent().parent().hasClass('filtByVal')) {
                            ckElem.checked = isCheck;
                        }
                    } else {
                        ckElem.checked = isCheck;
                    }

                    //$(filterElem).prop('checked') = true;
                    if ((ind < filterElems.length - 1) && (!subListUsed)){
                        handleFilterSelectionUpdate(ckElem, false, false);
                    } else if (!subListUsed) {
                        handleFilterSelectionUpdate(ckElem, true, true);
                    }

                }

    }

    const updateAttributeValues = function(attributeValList, dic){
        var allValues = attributeValList.children('li').children().children('input:checkbox');
        for (var i = 0; i < allValues.length; i++) {
            var elem = allValues.get(i);
            var val = $(elem)[0].value;
            var spans = $(elem).parent().find('span');
            var cntUf=0;
            if (dic.hasOwnProperty('unfilt') && dic['unfilt'].hasOwnProperty(val)) {
                cntUf = dic['unfilt'][val].count
            } else {
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

    window.updateFilters = function (filterCat, dic, dataFetched, srch) {
        var numAttrAvail = 0;
        var numCnts=0;
        var headerCnt = $('#'+filterCat).filter('.collection_name').siblings().filter('.case_count');
        if (headerCnt.length>0){
            numCnts = headerCnt[0].innerHTML;
        }

        var showZeros = true;
        var searchDomain = $('#'+filterCat).closest('.search-configuration, #program_set, #analysis_set');

        if ((searchDomain.find('.hide-zeros').length>0) && (searchDomain.find('.hide-zeros').prop('checked'))){
            showZeros = false;
        }
        var textFilt=false;
        var textFiltVal='';
        if ($('#'+filterCat).children('.text-filter').length>0) {
            textFiltVal = $('#'+filterCat).children('.text-filter')[0].value;
        } else if ($('#'+filterCat).find('.collection_value').length>0){
            textFiltVal = $('#collection_search')[0].value;
        }

        if (!(textFiltVal==='')){
            textFilt=true;
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
            } else {
                $('#'+filterCat).attr('data-curmin','NA');
                $('#'+filterCat).attr('data-curmax','NA');
            }
         }
        var filterList=$('#'+filterCat).children('ul');
        if (dataFetched){
            updateAttributeValues(filterList, dic);
        }

        var sorter= $('#'+filterCat).children('.sorter').find(":radio").filter(':checked');

        if ($('#'+filterCat).find('.collection_value').length>0){
            sorter= $('#Program').children('.sorter').find(":radio").filter(':checked');
        }

        if (sorter.length>0){
             if (sorter.val()==="alpha"){
                 const reRng= /^\d*\.?\d+\s+[Tt]o\s+\d*\.?\d+$/;

                 filterList.children('li').sort(
                    function (a,b){
                     var valA=$(a).children().children('.value').text().trim();
                     var valB=$(b).children().children('.value').text().trim();

                     if ( ($(a).children().children('input:checkbox')[0].checked || $(a).children().children('input:checkbox')[0].indeterminate) && !($(b).children().children('input:checkbox')[0].checked || $(b).children().children('input:checkbox')[0].indeterminate)){
                         return -1;
                     }
                     else if ( ($(b).children().children('input:checkbox')[0].checked || $(b).children().children('input:checkbox')[0].indeterminate) && !($(a).children().children('input:checkbox')[0].checked || $(a).children().children('input:checkbox')[0].indeterminate)){
                         return 1;
                     }

                     else if (reRng.test(valB) && reRng.test(valA)){
                         if ( parseFloat(valB.toLowerCase().split('to')[0].trim()) <  parseFloat(valA.toLowerCase().split('to')[0].trim())){
                             return 1;
                         }
                         else{
                             return -1;
                         }
                     }

                     else if (valB < valA){
                         return 1;
                     } else {
                         return -1;
                     }

                    }).appendTo(filterList);
             }
             else if (sorter.val()==="num"){
                 filterList.children('li').sort(
                    function (a,b){
                        if ( ($(a).children().children('input:checkbox')[0].checked || $(a).children().children('input:checkbox')[0].indeterminate) && !($(b).children().children('input:checkbox')[0].checked || $(b).children().children('input:checkbox')[0].indeterminate)){
                         return -1;
                         }
                         else if ( ($(b).children().children('input:checkbox')[0].checked || $(b).children().children('input:checkbox')[0].indeterminate) && !($(a).children().children('input:checkbox')[0].checked || $(a).children().children('input:checkbox')[0].indeterminate)){
                            return 1;
                         } else {

                            return (parseFloat($(a).children().children('.case_count').text()) < parseFloat($(b).children().children('.case_count').text()) ? 1 : -1)
                           }
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
        if ( ($('#' + filterCat).children('.more-checks').length>0) && $('#' + filterCat).children('.more-checks').hasClass("is-hidden")) {
            showExtras = true;
        }
        //var allUnchecked = ((checkedFilters.length == 0) ? true : false)

        var numNonZero = 0;
        numCnts = 0;
        for (var i = 0; i < allFilters.length; i++) {

            var elem = allFilters.get(i);
            var val = $(elem).data('filterDisplayVal');
            var filtByVal = false;

            if ($(elem).siblings().filter('a').length===0) {
                if (textFilt && !(val.toLowerCase().includes(textFiltVal.toLowerCase()))) {
                    filtByVal = true;
                    $(elem).parent().parent().addClass('filtByVal');

                } else {
                    $(elem).parent().parent().removeClass('filtByVal');
                    if (srch){
                        let ctrl = $(elem).closest('.list-group-item').find('.list-group-item__heading').find('a');
                        if (ctrl.attr('aria-expanded')==='false'){
                            ctrl.click();
                        }
                    }
                }
            }
            let checked = $(elem).prop('checked');
            let spans = $(elem).parent().find('span');
            //var lbl = spans.get(0).innerHTML;
            let cntUf = parseInt(spans.filter('.case_count')[0].innerHTML);

            let isZero = true;
            if ( (cntUf>0) || checked)  {
                if (cntUf>0){
                    numNonZero++;
                }
                $(elem).parent().parent().removeClass('zeroed');
                isZero = false;
            } else {
                $(elem).parent().parent().addClass('zeroed');
                isZero = true;
            }
            let allChildrenHidden = false;
            if ( $(elem).parent().siblings().filter('.list-group-sub-item__body').length>0 ){
                if ($(elem).parent().siblings().filter('.list-group-sub-item__body').find('.checkbox').not('.is-hidden').length===0){
                    allChildrenHidden = true;
                }
            }
            let thisAttrAvail = (( ( !isZero || showZeros) && !filtByVal  && !allChildrenHidden) || checked) ? true:false;
            if  ( thisAttrAvail){
                  numAttrAvail++;
                  numCnts+=cntUf;
            }

            if ( (numAttrAvail>5) && thisAttrAvail  ) {
                $(elem).parent().parent().addClass('extra-values');
            } else {
                $(elem).parent().parent().removeClass('extra-values');
            }

            if ( thisAttrAvail && (showExtras || (numAttrAvail<6)) ) {
                  $(elem).parent().parent().removeClass('is-hidden');
            } else {
                $(elem).parent().parent().addClass('is-hidden');
            }
        }

        if (hasFilters){
            if (numNonZero===0){
                $('#' + filterCat+'_heading').children('a').children().addClass('greyText');
                $('#' + filterCat+'_heading').children('a').children('.noCase').removeClass('is-hidden');

            } else {
                $('#' + filterCat+'_heading').children('a').children().removeClass('greyText');
                $('#' + filterCat+'_heading').children('a').children('.noCase').addClass('is-hidden');
            }

            var numMore = filterList.children('li').filter('.extra-values').length;
            if ($('#' + filterCat).children('.more-checks').children('.show-more').length>0){
                $('#' + filterCat).children('.more-checks').children('.show-more')[0].innerText = "show " + numMore.toString() + " more";
                if (numMore>0){
                    $('#' + filterCat).children('.more-checks').children('.show-more').removeClass('is-hidden');
                    $('#' + filterCat).children('.less-checks').children('.show-less').removeClass('is-hidden');
                } else {
                    $('#' + filterCat).children('.more-checks').children('.show-more').addClass('is-hidden');
                    $('#' + filterCat).children('.less-checks').children('.show-less').addClass('is-hidden');
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
        return [numAttrAvail, numCnts];
    }

    const setAllFilterElements = function(hideEmpty,filtSet, srch=false){
        //var filtSet = ["search_orig_set","segmentation","quantitative","qualitative","tcga_clinical"];
        for (var i=0;i<filtSet.length;i++) {
            filterCats = findFilterCats(filtSet[i], false);
            let resetParentVal=false;
            progInd = filterCats.indexOf('Program');
            if (progInd>-1){
                filterCats.splice(progInd,1);
                filterCats.push('Program');
                resetParentVal=true;
            }

            for (var j = 0; j < filterCats.length; j++) {
                let ret = updateFilters(filterCats[j],{},false,srch);
                if (resetParentVal && !(filterCats[j]==='Program')){
                    parentVal=$('#'+filterCats[j]).siblings().filter('.list-group-item__heading').find('.case_count');
                    parentVal[0].innerHTML=ret[1];
                    if (ret[0]===0){
                         $('#'+filterCats[j]).addClass('is-hidden')
                    }
                    else{
                        $('#'+filterCats[j]).removeClass('is-hidden')
                    }
                }
            }
        }

    }




    return {
        update_bq_filters: update_bq_filters,
        update_filter_url: update_filter_url,
        updateCollectionTotals: updateCollectionTotals,
        parseFilterObj: parseFilterObj,
        findFilterCats: findFilterCats,
        parseFilterForCounts:parseFilterForCounts,
        mkFiltText:mkFiltText,
        updateFilterSelections:updateFilterSelections,
        checkFilters:checkFilters,
        load_preset_filters:load_preset_filters,
        setAllFilterElements: setAllFilterElements,
        checkUncheckAll: checkUncheckAll
    }

});
