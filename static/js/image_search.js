/**
 *
 * Copyright 2021, Institute for Systems Biology
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
    baseUrl: STATIC_FILES_URL + 'js/',
    paths: {
        jquery: 'libs/jquery-3.5.1',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        base: 'base',
        underscore: 'libs/underscore-min',
        tablesorter: 'libs/jquery.tablesorter.min',
        assetscore: 'libs/assets.core',
        assetsresponsive: 'libs/assets.responsive',
        jquerydt: 'libs/jquery.dataTables.min',
        session_security: 'session_security/script',
        tables: 'tables',
        filterutils: 'filterutils',
        plotutils: 'plotutils'

    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'jquerydt': ['jquery'],
        'tablesorter': ['jquery'],
        'underscore': {exports: '_'},
        'session_security': ['jquery'],
        'filterutils': ['jquery'],
        'plotutils': ['jquery']
    }
});


require([
    'plotutils',
    'filterutils',
    'tables',
    'jquery',
    'underscore',
    'base', // This must ALWAYS be loaded!
    'jquerydt',
    'jqueryui',
    'bootstrap'
], function(plotutils,filterutils, tables,$, _, base) {

    const FLOAT_SLIDERS = filterutils.FLOAT_SLIDERS;

    $('.manifest-size-warning').hide();

    window.filterObj = {};
    window.projIdSel = [];
    window.studyIdSel = [];
    //window.tcgaColls = ["tcga_blca", "tcga_brca", "tcga_cesc", "tcga_coad", "tcga_esca", "tcga_gbm", "tcga_hnsc", "tcga_kich", "tcga_kirc", "tcga_kirp", "tcga_lgg", "tcga_lihc", "tcga_luad", "tcga_lusc", "tcga_ov", "tcga_prad", "tcga_read", "tcga_sarc", "tcga_stad", "tcga_thca", "tcga_ucec"];
    window.projSets = new Object();
    window.projSets['tcga']=["tcga_blca", "tcga_brca", "tcga_cesc", "tcga_coad", "tcga_esca", "tcga_gbm", "tcga_hnsc", "tcga_kich", "tcga_kirc", "tcga_kirp", "tcga_lgg", "tcga_lihc", "tcga_luad", "tcga_lusc", "tcga_ov", "tcga_prad", "tcga_read", "tcga_sarc", "tcga_stad", "tcga_thca", "tcga_ucec"];
    window.projSets['rider']=["rider_lung_ct", "rider_phantom_pet_ct","rider_breast_mri", "rider_neuro_mri","rider_phantom_mri", "rider_lung_pet_ct"];
    window.projSets['qin'] = ["qin_headneck","qin_lung_ct","qin_pet_phantom","qin_breast_dce_mri"];
    var first_filter_load = true;


    window.fetchscript = function(){

        var url="/testscript/"
        var csrftoken = $.getCookie('csrftoken');
        var fstr="alert('sorry did not work')";
        $.ajax({
            url: url,
            type: 'post',
            dataType: 'text',
            beforeSend: function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
            success: function (data) {
                fstr=data;
                $('.spinner').hide();
                window.testfunc= Function(fstr);
            },
            error: function(data){
                alert("There was an error fetching server data. Please alert the systems administrator")
                console.log('error loading data');
            }
        });
        //window.testfunc= Function(fstr);
    }

    window.toggleCharts=function(cntrl){
        if (cntrl==="hide"){
            $('.chart-content').addClass('hidden');
            $('.showchrt').removeClass('hidden');
            $('.hidechrt').addClass('hidden');
        }
        else if (cntrl==="show"){
            $('.chart-content').removeClass('hidden');
            $('.hidechrt').removeClass('hidden');
            $('.showchrt').addClass('hidden');
        }

    }

    window.hidePanel=function(){
        $('#lh_panel').hide();
        $('#show_lh').show();
        $('#show_lh').removeClass('hidden');
        $('#rh_panel').removeClass('col-lg-9');
        $('#rh_panel').removeClass('col-md-9');
        $('#rh_panel').addClass('col-lg-12');
        $('#rh_panel').addClass('col-md-12');
    };

    window.showPanel=function(){
        $('#lh_panel').show();
        $('#show_lh').hide();
        $('#rh_panel').removeClass('col-lg-12');
        $('#rh_panel').removeClass('col-md-12');
        $('#rh_panel').addClass('col-lg-9');
        $('#rh_panel').addClass('col-md-9');
    };

    window.setSlider = function (slideDiv, reset, strt, end, isInt, updateNow) {
        $('#' + slideDiv).closest('.hasSlider').find('.slider-message').addClass('notDisp');
        parStr=$('#'+slideDiv).data("attr-par");
        var max = $('#' + slideDiv).slider("option", "max");
        var divName = slideDiv.replace("_slide","");
        if (reset) {
            strt = $('#' + slideDiv).parent().attr('data-min');
            end = $('#' + slideDiv).parent().attr('data-max');
            $('#' + slideDiv).parent().removeClass('isActive');
            $('#' + slideDiv).siblings('.reset').addClass('disabled');
            $('#' + slideDiv).parent().find('.sliderset').find(':input').val('');
        } else {
            $('#' + slideDiv).parent().addClass('isActive');
            $('#' + slideDiv).siblings('.reset').removeClass('disabled');
        }
        $('#' + slideDiv).parent().attr('data-curminrng',strt);
        $('#' + slideDiv).parent().attr('data-curmaxrng',end);
        vals = [strt, end];
        $('#' + slideDiv).find(".slide_tooltip").each(function(index){
            $(this).text(vals[index].toString());
        });

        $('#' + slideDiv).slider("values", "0", strt);
        $('#' + slideDiv).slider("values", "1", end);
        var inpDiv = slideDiv.replace("_slide", "_input");
        var val = String(strt) + "-" + String(end);

        document.getElementById(inpDiv).value = val;
        nm=new Array();
        var filterCats= $('#'+divName).parentsUntil('.tab-pane','.list-group-item__body');
        for (var i=0;i<filterCats.length;i++){
            var ind = filterCats.length-1-i;
            nm.push(filterCats[ind].id);
        }
        nm.push(divName);
        filtAtt = nm.join('.')+ '_rng';
        if (reset) {
            if (  (window.filterObj.hasOwnProperty(filtAtt)) && (window.filterObj[filtAtt].hasOwnProperty('rng')) ) {
                delete window.filterObj[filtAtt]['rng'];
                if ('none' in window.filterObj[filtAtt]){
                    window.filterObj[filtAtt]['type']='none';
                } else {
                    delete window.filterObj[filtAtt];
                }
            }
        } else {
            var attVal = [];
            if (isInt) {
                attVal = [parseInt(strt), parseInt(end)];
            } else {
                attVal = [parseFloat(strt), parseFloat(end)];
            }

            if (!(filtAtt in window.filterObj)){
                window.filterObj[filtAtt] = new Object();
            }
            window.filterObj[filtAtt]['rng'] = attVal;
            window.filterObj[filtAtt]['type'] = 'ebtw';
        }
        if (updateNow) {
            filterutils.mkFiltText();
            updateFacetsData(true);
        }
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
            filterutils.mkFiltText();

            if (updateNow) {
                updateFacetsData(true);
            }
        }

    var mkSlider = function (divName, min, max, step, isInt, wNone, parStr, attr_id, attr_name, lower, upper, isActive,checked) {
        $('#'+divName).addClass('hasSlider');
        if (isActive){
            $('#'+divName).addClass('isActive');
        }

        var tooltipL = $('<div class="slide_tooltip tooltipL slide_tooltipT" />').text('stuff').css({
            position: 'absolute',
            top: -25,
            left: 0,
            transform: 'translateX(-50%)',

        });


         var tooltipR = $('<div class="slide_tooltip slide_tooltipB tooltipR" />').text('stuff').css({
           position: 'absolute',
           top: 20,
           right: 0,
             transform: 'translateX(50%)'
         });


          var labelMin = $('<div class="labelMin"/>').text(min).css({
              position: 'absolute',
              top:-7,
              left: -22,
            });


        var labelMax = $('<div class="labelMax" />').text(max);

        labelMax.css({
            position: 'absolute',
            top: -7,
            right: -14-8*max.toString().length,
            });

        var slideName = divName + '_slide';
        var inpName = divName + '_input';
        var strtInp = lower + '-' + upper;
        var nm=new Array();
        var filterCats= $('#'+divName).parentsUntil('.tab-pane','.list-group-item__body');
        for (var i=0;i<filterCats.length;i++){
            var ind = filterCats.length-1-i;
            nm.push(filterCats[ind].id);
        }
        nm.push(divName);
        var filtName = nm.join('.') + '_rng';
        //var filtName = nm;

        $('#' + divName).append('<div id="' + slideName + '"  data-attr-par="'+parStr+'"></div>');
        if ($('#'+divName).find('#'+inpName).length===0){
            $('#' + divName).append('<input id="' + inpName + '" type="text" value="' + strtInp + '" style="display:none">');
        }

        if (isActive){
            $('#'+divName).find('.reset').removeClass('disabled');
        }
        else {
            $('#'+divName).find('.reset').addClass('disabled');
        }

         $('#'+slideName).append(labelMin);

        $('#' + slideName).slider({
            values: [lower, upper],
            step: step,
            min: min,
            max: max,
            range: true,
            disabled: is_cohort,
            slide: function (event, ui) {
                $('#' + inpName).val(ui.values[0] + "-" + ui.values[1]);
                $(this).find('.slide_tooltip').each( function(index){
                    $(this).text( ui.values[index].toString() );
                    $(this).closest('.ui-slider').parent().find('.sliderset').find(':input')[index].value=ui.values[index].toString();
                });
            },

            stop: function (event, ui) {
                //setFromSlider(divName, filtName, min, max);
                $('#' + slideName).addClass('used');
                var val = $('#' + inpName)[0].value;
                var valArr = val.split('-');
                window.setSlider(slideName, false, valArr[0], valArr[1], isInt, true);

            }
        }).find('.ui-slider-range').append(tooltipL).append(tooltipR);


         $('#' + slideName).hover(
                function(){
                    //$(this).removeClass("ui-state-active");
                   $(this).parent().find('.slide_tooltip');
                }
              ,
                function(){
                   $(this).parent().find('.slide_tooltip');
                }
            );


         $('#' + slideName).find(".slide_tooltip").each(function(index){
                    if (index ==0) {
                        $(this).text(lower.toString());
                    }
                    else {
                        $(this).text(upper.toString());
                    }
               });

         $('#'+slideName).attr('min',min);
        $('#'+slideName).attr('max',max);


        $('#' + slideName).data("filter-attr-id",attr_id);
        $('#' + slideName).data("filter-display-attr",attr_name);

        $('#'+slideName).append(labelMax);
        $('#'+slideName).addClass('space-top-15');

    };






    window.updateSearchScope = function (searchElem) {
        var project_scope = searchElem.selectedOptions[0].value;
        filterutils.mkFiltText();
        updateFacetsData(true);
    }



    window.updateFacetsData = function (newFilt) {
        filterutils.update_filter_url();
        filterutils.update_bq_filters();
        if (window.location.href.search(/\/filters\//g) >= 0) {
            if (!first_filter_load) {
                window.history.pushState({}, '', window.location.origin + "/explore/")
            } else {
                first_filter_load = false;
            }
        }
        var url = '/explore/'
        var parsedFiltObj = filterutils.parseFilterObj();
        url = encodeURI('/explore/')

        ndic = {
            'totals': JSON.stringify(["PatientID", "StudyInstanceUID", "SeriesInstanceUID"]),
            'counts_only': 'False',
            'is_json': 'True',
            'is_dicofdic': 'True',
            'data_source_type': ($("#data_source_type option:selected").val() || 'S'),
            'filters':JSON.stringify(parsedFiltObj),
            'disk_size': 'True'
        }
        var csrftoken = $.getCookie('csrftoken');
        let deferred = $.Deferred();
        $.ajax({
            url: url,
            data: ndic,
            dataType: 'json',
            type: 'post',
            contentType: 'application/x-www-form-urlencoded',
            beforeSend: function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
            success: function (data) {
                try {
                    var isFiltered = Boolean($('#search_def p').length > 0);
                    if (is_cohort) {
                        if (file_parts_count > display_file_parts_count) {
                            $('#file-export-option').prop('title', 'Your cohort exceeds the maximum for download.');
                            $('#file-export-option input').prop('disabled', 'disabled');
                            $('#file-export-option input').prop('checked', false);
                            $('#file-manifest').hide();
                            if (!user_is_social) {
                                $('#need-social-account').show();
                            } else {
                                $('#file-manifest-max-exceeded').show();
                                $('#bq-export-option input').prop('checked', true).trigger("click");
                            }
                        } else {
                            $('#file-manifest-max-exceeded').hide();
                            $('#file-manifest').show();

                            var select_box_div = $('#file-part-select-box');
                            var select_box = select_box_div.find('select');
                            if (file_parts_count > 1) {
                                select_box_div.show();
                                for (let i = 0; i < display_file_parts_count; ++i) {
                                    select_box.append($('<option/>', {
                                        value: i,
                                        text: "File Part " + (i + 1)
                                    }));
                                }
                            } else {
                                select_box_div.hide();
                            }
                        }
                        $('#search_def_stats').removeClass('notDisp');


                       /* $('#search_def_stats').html(data.totals.PatientID.toString() +
                            " Cases, " + data.totals.StudyInstanceUID.toString() +
                            " Studies, and " + data.totals.SeriesInstanceUID.toString() +
                            " Series in this cohort. " +
                            "Size on disk: " + data.totals.disk_size); */

                        if (('filtered_counts' in data) && ('access' in data['filtered_counts']['origin_set']['All']['attributes']) && ('Limited' in data['filtered_counts']['origin_set']['All']['attributes']['access']) && (data['filtered_counts']['origin_set']['All']['attributes']['access']['Limited']['count']>0) ){
                            $('#search_def_access').removeClass('notDisp');
                            $('.access_warn').removeClass('notDisp');
                        }
                        else {
                            $('#search_def_access').addClass('notDisp');
                            $('.access_warn').addClass('notDisp');
                        }
                    } else {
                        if (isFiltered && data.total > 0) {
                            $('#save-cohort-btn').prop('disabled', '');
                            if (user_is_auth) {
                                $('#save-cohort-btn').prop('title', '');
                            }

                            /* $('#search_def_stats').removeClass('notDisp');
                            $('#search_def_stats').html(data.totals.PatientID.toString() + " Cases, " +
                                data.totals.StudyInstanceUID.toString()+" Studies, and " +
                                data.totals.SeriesInstanceUID.toString()+" Series in this manifest. " +
                                "Size on disk: " + data.totals.disk_size); */
                            if (('filtered_counts' in data) && ('origin_set' in data['filtered_counts']) && ('access' in data['filtered_counts']['origin_set']['All']['attributes']) && ('Limited' in data['filtered_counts']['origin_set']['All']['attributes']['access']) && (data['filtered_counts']['origin_set']['All']['attributes']['access']['Limited']['count']>0) ){
                               $('#search_def_access').removeClass('notDisp');
                               $('.access_warn').removeClass('notDisp');
                            } else {
                                $('#search_def_access').addClass('notDisp');
                                $('.access_warn').addClass('notDisp');
                            }
                        } else {
                            $('#search_def_access').addClass('notDisp');
                            $('.access_warn').addClass('notDisp');
                            $('#save-cohort-btn').prop('disabled', 'disabled');
                            if (data.total <= 0) {
                                //$('#search_def_stats').removeClass('notDisp');
                                //$('#search_def_stats').html('<span style="color:red">There are no cases matching the selected set of filters</span>');
                                //window.alert('There are no cases matching the selected set of filters.')
                            } else {
                                // $('#search_def_stats').addClass('notDisp');
                                //$('#search_def_stats').html("Don't show this!");
                            }
                            if (user_is_auth) {
                                $('#save-cohort-btn').prop('title', data.total > 0 ? 'Please select at least one filter.' : 'There are no cases in this cohort.');
                            } else {
                                $('#save-cohort-btn').prop('title', 'Log in to save.');
                            }
                        }
                    }
                    //updateCollectionTotals(data.total, data.origin_set.attributes.collection_id);

                    tables.updateCollectionTotals('Program', data.programs);
                    //updateFilterSelections('search_orig_set', data.origin_set.All.attributes);


                    dicofdic = {'unfilt': data.origin_set.All.attributes, 'filt': ''}
                    if (isFiltered) {
                        dicofdic['filt'] = data.filtered_counts.origin_set.All.attributes;
                    } else {
                        dicofdic['filt'] = data.origin_set.All.attributes;
                    }
                    updateFilterSelections('access_set', dicofdic);
                    updateFilterSelections('analysis_set', dicofdic);
                    updateFilterSelections('search_orig_set', dicofdic);
                    plotutils.createPlots('search_orig_set');

                    var derivedAttrs = Array.from($('#search_derived_set').children('.list-group').children('.list-group-item').children('.list-group-item__body').map(function () {
                        return this.id;
                    }));

                    if (data.hasOwnProperty('derived_set')) {
                        $('#search_derived_set').removeClass('disabled');
                        for (facetSet in data.derived_set) {
                            if ('attributes' in data.derived_set[facetSet]) {
                                dicofdic = {'unfilt': data.derived_set[facetSet].attributes, 'filt': ''}
                                if (isFiltered && data.filtered_counts.hasOwnProperty('derived_set')
                                    && data.filtered_counts.derived_set.hasOwnProperty(facetSet)
                                    && data.filtered_counts.derived_set[facetSet].hasOwnProperty('attributes')
                                ) {
                                    dicofdic['filt'] = data.filtered_counts.derived_set[facetSet].attributes;
                                } else if (isFiltered) {
                                    dicofdic['filt'] = {};
                                } else {
                                    dicofdic['filt'] = data.derived_set[facetSet].attributes;
                                }
                                updateFilterSelections(data.derived_set[facetSet].name, dicofdic);
                                var derivedAttrIndex = derivedAttrs.indexOf(data.derived_set[facetSet].name);
                                if (derivedAttrIndex > -1) {
                                    derivedAttrs.splice(derivedAttrIndex, 1);
                                }
                            }
                        }

                    } else {
                        $('#search_derived_set').addClass('disabled');
                    }


                    for (var i = 0; i < derivedAttrs.length; i++) {
                        updateFilterSelections(derivedAttrs[i], {});
                    }

                    plotutils.createPlots('search_derived_set');

                    if (data.hasOwnProperty('related_set')) {
                        $('#search_related_set').removeClass('disabled');
                        dicofdic = {'unfilt': data.related_set.All.attributes, 'filt': ''}
                        if (isFiltered) {
                            dicofdic['filt'] = data.filtered_counts.related_set.All.attributes;
                        } else {
                            dicofdic['filt'] = data.related_set.All.attributes;
                        }
                        updateFilterSelections('search_related_set', dicofdic);
                        //createPlots('tcga_clinical');
                    } else {
                        $('#search_related_set').addClass('disabled');
                        updateFilterSelections('search_related_set', {});
                    }
                    plotutils.createPlots('search_related_set');
                    var collFilt = new Array();
                    if ('collection_id' in parsedFiltObj) {
                        collFilt = parsedFiltObj['collection_id'];
                        var ind = 0;

                        /*while (ind < window.selItems.selProjects.length) {
                            proj = window.selItems.selProjects[ind]
                            if ((collFilt.indexOf(proj) > -1)) {
                                ind++
                            } else {
                                window.selItems.selProjects.splice(ind, 1);
                                if (proj in window.selItems.selStudies) {
                                    delete window.selItems.selStudies[proj];
                                }
                            }
                        } */

                    }
                    updateTablesAfterFilter(collFilt, data.origin_set.All.attributes.collection_id, data.stats);

                    if ($('.search-configuration').find('#hide-zeros')[0].checked) {
                        addSliders('search_orig_set', false, true, '');
                        addSliders('quantitative', false, true, 'quantitative.');
                        addSliders('tcga_clinical', false, true, 'tcga_clinical.');
                    }


                }
                //changeAjax(false);
                finally {
                    deferred.resolve();
                }
            },
            error: function(data){
                alert("There was an error fetching server data. Please alert the systems administrator")
                console.log('error loading data');
            }
        });
        return deferred.promise();
    };




    window.resort = function(filterCat){
        updateFilters(filterCat,{},false, false);
    }

    window.resortColl = function() {
       updateFilters('program_set',{},false, false);
       for (program in window.programs) {
           if (Object.keys(window.programs[program].projects).length > 1) {
               updateFilters(program,{},false, false);
           }
       }
    }

    var updateAttributeValues = function(attributeValList, dic){
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
        //var isSearchConf = ($('#'+filterCat).closest('.search-configuration').find('#hide-zeros').length>0);
        if ((searchDomain.find('#hide-zeros').length>0) && (searchDomain.find('#hide-zeros').prop('checked'))){
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
        if ( ($('#' + filterCat).children('.more-checks').length>0) && $('#' + filterCat).children('.more-checks').hasClass("notDisp")) {
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
                if ($(elem).parent().siblings().filter('.list-group-sub-item__body').find('.checkbox').not('.notDisp').length===0){
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
                  $(elem).parent().parent().removeClass('notDisp');
            } else {
                $(elem).parent().parent().addClass('notDisp');
            }
        }

        if (hasFilters){
            if (numNonZero===0){
                $('#' + filterCat+'_heading').children('a').children().addClass('greyText');
                $('#' + filterCat+'_heading').children('a').children('.noCase').removeClass('notDisp');

            } else {
                $('#' + filterCat+'_heading').children('a').children().removeClass('greyText');
                $('#' + filterCat+'_heading').children('a').children('.noCase').addClass('notDisp');
            }

            var numMore = filterList.children('li').filter('.extra-values').length;
            if ($('#' + filterCat).children('.more-checks').children('.show-more').length>0){
                $('#' + filterCat).children('.more-checks').children('.show-more')[0].innerText = "show " + numMore.toString() + " more";
                if (numMore>0){
                    $('#' + filterCat).children('.more-checks').children('.show-more').removeClass('notDisp');
                    $('#' + filterCat).children('.less-checks').children('.show-less').removeClass('notDisp');
                } else {
                    $('#' + filterCat).children('.more-checks').children('.show-more').addClass('notDisp');
                    $('#' + filterCat).children('.less-checks').children('.show-less').addClass('notDisp');
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

    setAllFilterElements = function(hideEmpty,filtSet, srch=false){
        //var filtSet = ["search_orig_set","segmentation","quantitative","qualitative","tcga_clinical"];
        for (var i=0;i<filtSet.length;i++) {
            filterCats = filterutils.findFilterCats(filtSet[i], false);
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
                         $('#'+filterCats[j]).addClass('notDisp')
                    }
                    else{
                        $('#'+filterCats[j]).removeClass('notDisp')
                    }
                }
            }
        }

    }

    window.updateColl = function(srch){
        let checked=$('#Program').find('.hide-zeros')[0].checked;
        let filtSet=['program_set']
        /* for (program in window.programs){
            if (Object.keys(window.programs[program].projects).length>1){
                filtSet.push(program)
            }
        }*/

        setAllFilterElements(checked,filtSet,srch);
    }

    window.hideAtt = function(hideElem){
        let filtSet = ["search_orig_set","segmentation","quantitative","qualitative","tcga_clinical"];
        setAllFilterElements(hideElem.checked, filtSet);
        addSliders('search_orig_set', false, hideElem.checked,'');
        addSliders('quantitative', false, hideElem.checked,'quantitative.');
        addSliders('tcga_clinical',false, hideElem.checked,'tcga_clinical.');
    }

    var updateFilterSelections = function (id, dicofdic) {
        let filterCats = filterutils.findFilterCats(id,false);
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


    var applyFilters = function(){
        filterutils.mkFiltText();
        updateFacetsData(true);
    }

    window.processUserChoice = function(){
        //alert('here');
        val=$('#filter-option-modal').find('input[name="filtchoice"]:checked').val();
        if (val=='new')
        {
            window.filterSet[window.filterSetNum].filterObj = JSON.parse(JSON.stringify(filterObjOld));
            filterObjOld = JSON.parse(JSON.stringify(filterObj));
            tables.createNewFilterSet(filterObj, true);
        }
        else if (val=='update'){
            filterObjOld = JSON.parse(JSON.stringify(filterObj));
            for (project in window.selProjects) {
            tables.initProjectData(project);
           }
            mksearchtwo();
            updateFacetsData(true);

        }
        else if (val=='cancel'){
            filterObj=JSON.parse(JSON.stringify(filterObjOld));
            window.filterSet[window.filterSetNum].filterObj = filterObj;
            //filters_for_load=tables.mapFiltObj
            filterutils.mkFiltText();
            mksearchtwo();


        }

        $('#filter-option-modal').removeClass('filtermoddisp');
        $('#filter-option-modal').addClass('filtermodnotdisp');

        if ($("#filter-option-modal").find("input:checkbox").prop("checked")){

            if ((!window.choiceMade) && (val == 'cancel') && (window.cartSize>0)){
               $('.search-scope').find("input:checkbox").attr("disabled",true);
             $('.search-configuration').find("input:checkbox").attr("disabled",true);
             alert('Based on these choices the filter definition will be fixed whenever items are added to the filter set');

            }
            window.choiceMade = true;
        }

    }



    var filterItemBindings = function (filterId) {

        $('#' + filterId).find('.join_val').on('click', function () {
            var attribute = $(this).closest('.list-group-item__body, .list-group-sub-item__body','.colections-list')[0].id;
            if (filterObj.hasOwnProperty(attribute) && (window.filterObj[attribute]['values'].length>1)){
                filterutils.mkFiltText();
                filterObj[attribute]['op']=$(this).attr('value');
                updateFacetsData(true);
            }
        });

        $('#' + filterId).find('input:checkbox').not('#hide-zeros').on('click', function () {
            filterutils.handleFilterSelectionUpdate(this, true, true);
        });

        $('#' + filterId).find('.show-more').on('click', function () {
            $(this).parent().parent().children('.less-checks').show();
            $(this).parent().parent().children('.less-checks').removeClass('notDisp');
            $(this).parent().parent().children('.more-checks').addClass('notDisp');

            $(this).parent().hide();
            var extras = $(this).closest('.list-group-item__body, .collection-list, .list-group-sub-item__body').children('.search-checkbox-list').children('.extra-values')

            if ( ($('#'+filterId).closest('.search-configuration').find('#hide-zeros').length>0)  && ($('#'+filterId).closest('.search-configuration').find('#hide-zeros').prop('checked'))){
                extras=extras.not('.zeroed');
            }
            extras.removeClass('notDisp');
        });

        $('#' + filterId).find('.show-less').on('click', function () {
            $(this).parent().parent().children('.more-checks').show();
            $(this).parent().parent().children('.more-checks').removeClass('notDisp');
            $(this).parent().parent().children('.less-checks').addClass('notDisp');

            $(this).parent().hide();
            $(this).closest('.list-group-item__body, .collection-list, .list-group-sub-item__body').children('.search-checkbox-list').children('.extra-values').addClass('notDisp');
        });

        $('#' + filterId).find('.check-all').on('click', function () {
            if (!is_cohort) {
                checkUncheckAll(this, true, true);

            }
        });

        $('#' + filterId).find('.uncheck-all').on('click', function () {
          if (!is_cohort){
              checkUncheckAll(this, false, false);

          }
        });
    };

    var checkUncheckAll = function(aelem, isCheck, checkSrch){
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
                                        filterutils.handleFilterSelectionUpdate(subCkElem, false, false);
                                    } else {
                                        filterutils.handleFilterSelectionUpdate(subCkElem, true, true);
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
                        filterutils.handleFilterSelectionUpdate(ckElem, false, false);
                    } else if (!subListUsed) {
                        filterutils.handleFilterSelectionUpdate(ckElem, true, true);
                    }

                }

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
    };

    var addFilterBindings = function(id){
     var filterCats = filterutils.findFilterCats(id,false);
     for (var i=0;i<filterCats.length;i++){
         filterItemBindings(filterCats[i]);
    }
 };

    var addSliders = function(id, initialCreation, hideZeros, parStr){
        $('#'+id).find('.list-group-item__body.isQuant').each(function() {
            let attr_id = $(this).attr("id");
            let isInt = !FLOAT_SLIDERS.includes(attr_id);
            let min = parseFloat($(this).attr('data-min'));
            let max = parseFloat($(this).attr('data-max'));
            let lower = parseFloat($(this).attr('data-curminrng'));
            let upper = parseFloat($(this).attr('data-curmaxrng'));
            if (isInt){
                min=Math.floor(min);
                max=Math.ceil(max);
                lower=Math.floor(lower);
                upper=Math.ceil(upper);
            }
            else{
                min=parseFloat(min.toFixed(2));
                max=parseFloat(max.toFixed(2));
                lower=parseFloat(lower.toFixed(2));
                upper=parseFloat(upper.toFixed(2));
            }

            let addSlider = true;
            let isActive = $(this).hasClass('isActive');
            let wNone = $(this).hasClass('wNone');
            let checked = ($(this).find('.noneBut').length>0) ? $(this).find('.noneBut').find(':input')[0].checked : false;
            let txtLower = ($(this).find('.sl_lower').length>0) ? $(this).find('.sl_lower').val():'';
            let txtUpper = ($(this).find('.sl_lower').length>0) ? $(this).find('.sl_upper').val():'';
            let cntrNotDisp = ($(this).find('.cntr').length>0) ?$(this).find('.cntr').hasClass('notDisp'):true;


            if (initialCreation){
                let heading = $(this).prop('id') + '_heading';
                $('#'+heading).find('.fa-cog').attr('title', 'Control slider');
                $('#'+heading).find('.fa-search').remove();

                $(this).find('.more-checks').remove();
                $(this).find('.less-checks').remove();
                $(this).find('.sorter').remove();
                $('#'+this.id+'_list').addClass('hide');
            } else {
                let slideDivId = $(this).prop('id') + '_slide';
                curmin = parseFloat($(this).attr('data-curmin'));
                curmax = parseFloat($(this).attr('data-curmax'));
                if (isInt){
                    curmin = Math.floor(curmin);
                    curmax =Math.floor(curmax);
                }
                else{
                    curmin= parseFloat(curmin.toFixed(2));
                    curmax= parseFloat(curmax.toFixed(2));
                }
                $(this).find('#' + slideDivId).remove();
                $(this).find('.cntr').remove();
                //$(this).find('.noneBut').remove();
                let inpName = $(this).prop('id') + '_input';
                $(this).find('#'+inpName).remove();
                if (hideZeros) {
                    if ( ( (curmin === 'NA') || (curmax === 'NA')) && !isActive ){
                        addSlider = false;
                        $(this).removeClass('hasSlider');
                    } else if (isActive){
                        if (curmin === 'NA') {
                                min = lower;
                        } else {
                            min = Math.min(lower, curmin);
                        }
                        if (curmax === 'NA'){
                                max = upper;
                        } else {
                            max = Math.max(upper, curmax);
                        }
                    } else {
                            min = curmin;
                            max = curmax;
                            lower=min;
                            upper=max;
                    }
                } else if (!isActive){
                    lower=min;
                    upper=max;
                }
            }

            if (addSlider) {
                $(this).addClass('hasSlider');
                let step = max <=1 ? 0.05 : 1;
                let isInt = !FLOAT_SLIDERS.includes(attr_id);
                mkSlider($(this).prop('id'), min, max, step, isInt, wNone, parStr, $(this).data('filter-attr-id'), $(this).data('filter-display-attr'), lower, upper, isActive,checked);
                let cntrlDiv = $('<div class="cntr"></div>');
                cntrlDiv.append('<div class="sliderset" style="display:block;margin-bottom:8px">Lower: <input type="text" style="display:inline" size="5" class="sl_lower" value="'+ txtLower + '">' +
                    ' Upper: <input class="sl_upper" type="text" style="display:inline" size="5" class="upper" value="' + txtUpper + '">' +
                    '<div class="slider-message notDisp" style="color:red"><br>Please set lower and upper bounds to numeric values with the upper value greater than the lower, then press Return in either text box. </div></div>')
                cntrlDiv.append(  '<button class="reset" style="display:block;" onclick=\'setSlider("'+ this.id + '_slide", true,0,0,true, true,"'+parStr+'")\'>Clear Slider</button>');
                if (wNone){
                   cntrlDiv.append( '<span class="noneBut"><input type="checkbox"   onchange="addNone(this, \''+parStr+'\', true)"> None </span>');
                   cntrlDiv.find('.noneBut').find(':input')[0].checked = checked;
                }
                if (cntrNotDisp){
                    cntrlDiv.addClass('notDisp');
                }
                $(this).append(cntrlDiv);
                $(this).find('.sliderset').keypress(function(event){
                   var keycode = (event.keyCode ? event.keyCode : event.which);
                   if (keycode == '13'){

                   try {
                       let txtlower = parseFloat($(this).parent().find('.sl_lower').val());
                       let txtupper = parseFloat($(this).parent().find('.sl_upper').val());
                      if (txtlower<=txtupper){
                        setSlider($(this).closest('.hasSlider')[0].id+"_slide", false, txtlower, txtupper, false,true);
                      } else {
                          $(this).closest('.hasSlider').find('.slider-message').removeClass('notDisp');

                      }
                   }
                  catch(error){
                    $(this).closest('.hasSlider').find('.slider-message').removeClass('notDisp');
                    console.log(error);
                  }
               }
              });

            } else {
                $(this).removeClass('hasSlider');

            }

        });
     };

    var showFilters = [];

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
                           filterutils.checkFilters($('input[data-filter-attr-id="' + filter['id'] + '"][value="' + val + '"]'));
                      });
                  }
                if (attValueFoundInside){

                    /*$(selEle).collapse('show');
                    $(selEle).find('.show-more').triggerHandler('click');
                    $(selEle).parents('.tab-pane.search-set').length > 0 && $('a[href="#' +
                    $(selector).parents('.tab-pane.search-set')[0].id + '"]').tab('show');
                     */
                    showFilters.push([selEle,selector]);
                }
               });
            });
        });
        if (sliders.length > 0) {
            load_sliders(sliders, false);
        }

        filterutils.mkFiltText();
        return updateFacetsData(true).promise();

     };

    var load_sliders = function(sliders, do_update) {
        _.each(sliders, function(slider) {
            var slider_id = slider['id'];
            var isInt = !FLOAT_SLIDERS.includes(slider_id.replace('_slide',''));
            setSlider(slider_id, false, slider['left_val'], slider['right_val'], isInt, false);
            //updatePlotBinsForSliders(slider_id);
        });

        if (do_update) {
            filterutils.mkFiltText();
            updateFacetsData(true).promise();
        }
     };

    var ANONYMOUS_FILTERS = {};
    var ANONYMOUS_SLIDERS = {};

    var save_anonymous_selection_data = function() {
        let groups = [];

        // Get all checked filters
        let filters = [];

        // For collection list
        $('.collection-list').each(function() {
            let $group = $(this);
            let checkboxes = $group.find("input:checked").not(".hide-zeros").not(".sort_val");
            if (checkboxes.length > 0) {
                let values = [];
                let my_id = "";
                checkboxes.each(function() {
                    let $checkbox = $(this);
                    let my_value = $checkbox[0].value;
                    my_id = $checkbox.data('filter-attr-id');
                    values.push(my_value);
                });
                filters.push({
                    'id': my_id,
                    'values': values,
                });
            }
        });

        // For other list item groups
        $('.list-group-item__body').each(function() {
            let $group = $(this);
            let my_id = $group.data('filter-attr-id');
            if (my_id != null)
            {
                let checkboxes = $group.find("input:checked").not(".hide-zeros").not(".sort_val");
                if (checkboxes.length > 0)
                {
                    let values = [];
                    checkboxes.each(function() {
                        let $checkbox = $(this);
                        let my_value = $checkbox[0].value;
                        values.push(my_value);
                    });
                    filters.push({
                        'id': my_id,
                        'values': values,
                    });
                }
            }
        });

        groups.push({'filters': filters});
        var filterStr = JSON.stringify(groups);
        sessionStorage.setItem('anonymous_filters', filterStr);

        // Get all sliders with not default value
        var sliders = [];
        $('.ui-slider').each(function() {
            let $this = $(this);
            let slider_id = $this[0].id;
            let left_val = $this.slider("values", 0);
            let right_val = $this.slider("values", 1);
            let min = $this.slider("option", "min");
            let max = $this.slider("option", "max");
            if (left_val !== min || right_val !== max) {
                sliders.push({
                   'id': slider_id,
                    'left_val': left_val,
                    'right_val': right_val,
                });
            }
        });
        let sliderStr = JSON.stringify(sliders);
        sessionStorage.setItem('anonymous_sliders', sliderStr);
    };

    var load_anonymous_selection_data = function() {
        // Load anonymous filters from session storage and clear it, so it is not always there
        let filter_str = sessionStorage.getItem('anonymous_filters');
        ANONYMOUS_FILTERS = JSON.parse(filter_str);
        sessionStorage.removeItem('anonymous_filters');

        let slider_str = sessionStorage.getItem('anonymous_sliders');
        ANONYMOUS_SLIDERS = JSON.parse(slider_str);
        sessionStorage.removeItem('anonymous_sliders');
    };

    var load_filter_selections = function(selections) {
        _.each(selections,function(selectors){
            let selEle = selectors[0];
            let selector = selectors[1];
            $(selEle).collapse('show');
            $(selEle).parents('.tab-pane.search-set').length > 0 && $('a[href="#' + $(selector).parents('.tab-pane.search-set')[0].id + '"]').tab('show');
        });
    };

    $('#save-cohort-btn').on('click', function() {
        if (!user_is_auth) {
            save_anonymous_selection_data();
            location.href=$(this).data('uri');
        }
    });

    $('#sign-in-dropdown').on('click', function() {
        save_anonymous_selection_data();
    });

    cohort_loaded = false;
    function load_preset_filters() {
        let loadPending = null;
        if (is_cohort && !cohort_loaded) {
             loadPending = load_filters(cohort_filters);
             loadPending.done(function () {
                 console.debug("Load pending complete.");
                 cohort_loaded = true;
                 $('input[type="checkbox"]').prop("disabled", "disabled");
                 $('#projects_table').find('input:checkbox').removeAttr("disabled");
                 //$('.check-all').prop("disabled","disabled");
                 // Re-enable checkboxes for export manifest dialog, unless not using social login
                 $('#export-manifest-modal input').removeAttr('disabled');

                 $('input#hide-zeros').prop("disabled", "");
                 $('input#hide-zeros').prop("checked", true);
                 $('input#hide-zeros').each(function(){$(this).triggerHandler('change')});
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
                     loadPending.done(function () {
                         //console.debug("External filter load done.");
                     });
                 }
             } else {
                 if (has_sliders) {
                     loadPending = load_sliders(ANONYMOUS_SLIDERS, !has_filters);
                     if (loadPending) {
                        loadPending.done(function () {
                             //console.debug("Sliders loaded from anonymous login.");
                         });
                     }
                 }
                 if (has_filters) {
                     loadPending = load_filters(ANONYMOUS_FILTERS, );
                     loadPending.done(function () {
                         //console.debug("Filters loaded from anonymous login.");
                     });
                 }
             }
         }
         if (loadPending) {
             loadPending.done(function() {
                 load_filter_selections(showFilters);
             });
         }
     }

    $('.fa-cog').on("click",function(){
         let srt = $(this).parent().parent().parent().find('.cntr')
         if (srt.hasClass('notDisp')) {
             srt.removeClass('notDisp');
         } else {
             srt.addClass('notDisp');
         }
         $(this).parent().parent().parent().find('.text-filter, .collection-text-filter').addClass('notDisp');
     });

    $('.fa-search').on("click",function(){
         //alert('hi');
         srch=$(this).parent().parent().parent().find('.text-filter, .collection-text-filter, .analysis-text-filter');

         if (srch.hasClass('notDisp')) {
             srch.removeClass('notDisp');
             srch[0].focus();
         } else {
             srch.addClass('notDisp');
         }
         $(this).parent().parent().parent().find('.cntr').addClass('notDisp');
    });

    const myObserver = new ResizeObserver(entries => {
         entries.forEach(entry => {
             htr = $('.vert').height();
             htsrch = $('.search-scope').height();
             ht = Math.max(2000,htr-htsrch+100);
             $('.search-con').css('max-height',ht+'px');
       });
     });
    myObserver.observe($('#rh_panel')[0]);
    myObserver.observe($('.search-scope')[0]);

    $(document).ajaxStart(function(){
        $('.spinner').show();
    });

    $(document).ajaxStop(function(){
        $('.spinner').hide();
    });


    updateViaHistory = function(){
        let history = JSON.parse(document.getElementById('history').textContent);
        if (history.hasOwnProperty('hz') && history['hz']){
            for (let ckey in history['hz']){
                if(history['hz'].hasOwnProperty(ckey)) {
                    if (history['hz'][ckey]) {
                        $('#'+ckey).find('.hide-zeros').click();
                    }
                }
            }
        }

        if (history.hasOwnProperty('sorter') && history['sorter']){
            for (let ckey in history['sorter']){
                if(history['sorter'].hasOwnProperty(ckey)) {
                    $('#'+ckey).find(':input').each(function(){
                        if ($(this).val() == history['sorter'][ckey]) {
                            $(this).click();
                        }
                    });
                }
            }
        }
    }


    window.changePage = function(wrapper){
        var elem=$('#'+wrapper);
        var valStr = elem.find('.dataTables_controls').find('.goto-page-number').val();
        try {
            var val =parseInt(valStr);
            if (Number.isInteger(val) && (val>0) ) {
                elem.find('table').DataTable().page(val-1).draw(false);
            }
        }
        catch(err){
           console.log(err);
        }

    }



/*

    updateFiltControls = function(){
     var filtVal={};
     for (var nkey in window.filterObj){
         var filtSet= window.filterObj[nkey];
         for (var i=0;i<filtSet.length;i++){
             var filt= filtSet[i];
             filtVal[filt]=1;
         }
      }
     $('input:checkbox').each(function(){
         if (this.hasAttribute('data-filter-display-val')){
            var val= this.getAttribute('data-filter-display-val') ;
            if (val in filtVal){
                $(this).prop("checked", true);
            }
            else{
                $(this).prop("checked", false);
            }
         }
     });

    } */


    initSort = function(sortVal){
        var sortdivs=$('body').find('.sorter')
        for (div in sortdivs){
            $(div).find(":input[value='" + sortVal + "']").click();
        }
    }

     $(document).ready(function () {
        tables.initializeTableData();
        filterItemBindings('access_set');
        filterItemBindings('program_set');
        filterItemBindings('analysis_set');

        filterItemBindings('search_orig_set');
        filterItemBindings('search_derived_set');
        filterItemBindings('search_related_set');

        max = Math.ceil(parseInt($('#age_at_diagnosis').data('data-max')));
        min = Math.floor(parseInt($('#age_at_diagnosis').data('data-min')));

        //quantElem=['#SliceThickness', '#min_PixelSpacing', '#max_TotalPixelMatrixColumns', '#max_TotalPixelMatrixRows','#age_at_diagnosis']
        quantElem=['#SliceThickness', '#age_at_diagnosis']
        quantElem.forEach(function(elem){
            $(elem).addClass('isQuant');
            $(elem).addClass('wNone');
            $(elem).find('.text-filter').remove();
        });
        rngElem=['#min_PixelSpacing', '#max_TotalPixelMatrixColumns', '#max_TotalPixelMatrixRows',]
        rngElem.forEach(function(elem){
            $(elem).addClass('isRng');
        });

        $('#quantitative').find('.list-group-item__body').each(function() {
            $(this).addClass('isQuant');
            $(this).addClass('wNone');
            $(this).find('.text-filter').remove();
        });

        addSliders('search_orig_set',true, false,'');
        addSliders('tcga_clinical',true, false,'tcga_clinical.');
        addSliders('quantitative',true, false,'quantitative.');

        plotutils.createPlots('search_orig_set');
        plotutils.createPlots('search_derived_set');
        plotutils.createPlots('tcga_clinical');

        for (project in window.selProjects) {
            tables.initProjectData(project);
        }
        tables.updateProjectTable(window.collectionData,stats);
        tables.updateFilterSetData();



        $('.clear-filters').on('click', function () {
            $('input:checkbox').not('#hide-zeros').not('.tbl-sel').prop('checked',false);
            $('input:checkbox').not('#hide-zeros').not('.tbl-sel').prop('indeterminate',false);
            $('.ui-slider').each(function(){
                setSlider(this.id,true,0,0,true, false);
            })
            $('#search_def_warn').hide();
            window.filterObj= {};
            filterutils.mkFiltText();
            var updateDone = false;
           var updateWait = false;
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
           else{
               updateFacetsData(true);
               tables.initializeTableData();
            }


            /*

            window.filterObj= {};

            filterutils.mkFiltText();
            updateFacetsData(true);
            tables.initializeTableData();
             updateProjectTable(window.collectionData,stats);
            $('#cases_tab').DataTable().destroy();
            $('#studies_tab').DataTable().destroy();
            $('#series_tab').DataTable().destroy();

            */

        });

        load_preset_filters();

        $('.hide-filter-uri').on('click',function() {
            $(this).hide();
            $('.get-filter-uri').show();
            $('.copy-url').hide();
            $('.filter-url').hide();
            $('.filter-url').addClass("is-hidden");
        });

        $('.get-filter-uri').on('click',function(){
            $(this).hide();
            $('.hide-filter-uri').show();
            $('.copy-url').show();
            $('.filter-url').show();
            $('.filter-url').removeClass("is-hidden");
        });

        $('.filter-url-container').append(
            $('<div>')
                .addClass('alert alert-warning alert-dismissible url-too-long')
                .html(
                    "Your query's URL exceeds the maximum length allowed (2048 characters). "
                    + "You will need to select fewer filters or the URL will not properly load when used."
                )
                .prepend(
                    '<button type="button" class="close" data-hide="alert"><span aria-hidden="true">'
                    +'&times;</span><span class="sr-only">Close</span></button>'
                ).attr("style","display: none;")
        );


        $(window).on("beforeunload",function(){
            console.log("beforeunload called");
            let hs = new Object();
            hs['hz'] = new Object();
            hs['sorter'] = new Object();
            $('body').find('.hide-zeros').each(function(){
                let pfar = $(this).closest('.collection-list, .search-configuration, #analysis_set ');
                let pid = pfar[0].id;
                let checked = pfar.find('.hide-zeros')[0].checked;
                hs['hz'][pid] = checked;
            });

            $('body').find('.sorter').each(function(){
                let pfar = $(this).closest('.collection-list, .list-group-item__body ');
                let pid = pfar[0].id;
                let sort = $(this).find('input:checked').val()
                hs['sorter'][pid] = sort;
            });



            let url = encodeURI('/uihist/')
            let nhs = {'his':JSON.stringify(hs)}
            let csrftoken = $.getCookie('csrftoken');
            let deferred = $.Deferred();

            $.ajax({
                url: url,
                data: nhs,
                dataType: 'json',
                type: 'post',
                contentType: 'application/x-www-form-urlencoded',
                beforeSend: function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
                success: function (data) {
                },
                error: function(data){
                    console.debug('Error saving ui preferences.');
                },
                complete: function(data) {
                    deferred.resolve();
                }
            });
        });


        initSort('num');
        if (document.contains(document.getElementById('history'))){
            updateViaHistory();
        }

    });


});
