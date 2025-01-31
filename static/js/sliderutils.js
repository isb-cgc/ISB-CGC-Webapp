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
define(['filterutils','jquery', 'base'], function(filterutils, $, base) {

    const FLOAT_SLIDERS = ["Sphericity_quant"];
    const ANONYMOUS_SLIDERS = {};

     const load_sliders = function(sliders, do_update) {
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

    window.setSlider = function (slideDiv, reset, strt, end, isInt, updateNow) {
        $('#' + slideDiv).closest('.hasSlider').find('.slider-message').addClass('is-hidden');
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
           handleFilterSelectionUpdate(null, true, true);
        }
     };

    const mkSlider = function (divName, min, max, step, isInt, wNone, parStr, attr_id, attr_name, lower, upper, isActive,checked) {
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

    window.addSliders = function(id, initialCreation, hideZeros, parStr){
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
            let cntrNotDisp = ($(this).find('.cntr').length>0) ?$(this).find('.cntr').hasClass('is-hidden'):true;

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
                    '<div class="slider-message is-hidden" style="color:red"><br>Please set lower and upper bounds to numeric values with the upper value greater than the lower, then press Return in either text box. </div></div>')
                cntrlDiv.append(  '<button class="reset" style="display:block;" onclick=\'setSlider("'+ this.id + '_slide", true,0,0,true, true,"'+parStr+'")\'>Clear Slider</button>');
                if (wNone){
                   cntrlDiv.append( '<span class="noneBut"><input type="checkbox"   onchange="addNone(this, \''+parStr+'\', true)"> None </span>');
                   cntrlDiv.find('.noneBut').find(':input')[0].checked = checked;
                }
                if (cntrNotDisp){
                    cntrlDiv.addClass('is-hidden');
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
                                  $(this).closest('.hasSlider').find('.slider-message').removeClass('is-hidden');
                            }
                        } catch(error){
                            $(this).closest('.hasSlider').find('.slider-message').removeClass('is-hidden');
                            console.log(error);
                        }
               }
              });
            } else {
                $(this).removeClass('hasSlider');
            }
        });
     };

    return {
        FLOAT_SLIDERS: FLOAT_SLIDERS
    }
});
