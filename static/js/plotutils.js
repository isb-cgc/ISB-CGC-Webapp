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
        session_security: 'session_security/script',
        underscore: 'libs/underscore-min',
        assetscore: 'libs/assets.core',
        assetsresponsive: 'libs/assets.responsive',
        tablesorter:'libs/jquery.tablesorter.min',
        filterutils:'filterutils',
        sliderutils:'sliderutils'

    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'tablesorter': ['jquery'],
        'underscore': {exports: '_'},
        'filteryutils':['jquery'],
        'sliderutils': ['jquery']

    }
});

// Set up common JS UI actions which span most views
require([
    'sliderutils',
    'filterutils',
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'underscore',
    'base',
    'assetscore',
    'assetsresponsive',
    'tablesorter'
], function(sliderutils,filterutils, $, jqueryui, bootstrap, session_security, _, base) {


});

// Return an object for consts/methods used by most views
define(['sliderutils','filterutils','jquery', 'base'], function(sliderutils,filterutils, $, base) {

    const FLOAT_SLIDERS = sliderutils.FLOAT_SLIDERS;
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

    window.loadit = function(){
        alert('load plot');
    }

    window.toggleCharts=function(cntrl){
        if (cntrl==="hide"){
            $('.chart-content').addClass('is-hidden');
            $('.showchrt').removeClass('is-hidden');
            $('.hidechrt').addClass('is-hidden');
            $('.tooltip_filter_info').hide();
        }
        else if (cntrl==="show"){
            $('.chart-content').removeClass('is-hidden');
            $('.hidechrt').removeClass('is-hidden');
            $('.showchrt').addClass('is-hidden');
            $('.tooltip_filter_info').show();
        }
    }

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


    window.updatePlots = function (selectElem) {
        createPlots('search_orig_set');
        createPlots('search_derived_set');
        createPlots('search_related_set');
    }

    window.createPlots = function (id) {

        var isPie = true;
        var ptIndx = document.getElementById("plot_type").selectedIndex;
        if (ptIndx === 1) {
            isPie = false;
        }
        var showLbl = document.getElementById("plot_label").checked

        var filterCats = filterutils.findFilterCats(id,true);
        for (var i = 0; i < filterCats.length; i++) {
            filterCat = filterCats[i];
            filterData = filterutils.parseFilterForCounts(filterCat);
            plotId = filterCat + "_chart";
            var lbl='';
            lbl = $('#' + filterCat + '_heading').children('a').children('.attDisp')[0].innerText;
            plotCategoricalData(plotId, lbl, filterData, isPie, showLbl);
        }
    }

    var manageUpdateFromPlot = function(plotId, label) {
        var listId = plotId.replace('_chart','_list');
        var filterId = plotId.replace('_chart','');
        let isInt = !FLOAT_SLIDERS.includes(filterId);
        var isSlider = $('#'+filterId).hasClass('hasSlider') ? true : false;
        if (isSlider) {
            var maxx =parseFloat($('#' + filterId).attr('data-max'));
            var minx=parseFloat($('#' + filterId).attr('data-min'));

            if (isInt){
                maxx=Math.ceil(maxx);
                minx=Math.floor(minx);
            }
            else{
                maxx=parseFloat(maxx.toFixed(2));
                minx=parseFloat(minx.toFixed(2));
            }
            var parStr = $('#'+filterId).find('#'+filterId+'_slide').data('attr-par');

            if ((label ==='None') && $('#'+filterId).hasClass('wNone')){
                butElem = $('#'+filterId).find('.noneBut').children('input')[0];
                butElem.checked=true
                imagesearch.setSlider(filterId+"_slide", true, minx, maxx, isInt, false);
                window.addNone(butElem,parStr,true);
            } else {
                if ($('#'+filterId).hasClass('wNone')){
                    butElem = $('#'+filterId).find('.noneBut').children('input')[0];
                    butElem.checked=false;
                    window.addNone(butElem,parStr,false);
                }

                var selArr = label.split(' To ');
                var strt = parseFloat((selArr[0] === '*') ? '0' : selArr[0]);
                var end = parseFloat((selArr[1] === '*') ? maxx : selArr[1]);
                if (isInt){
                    strt = Math.floor(strt);
                    end = Math.floor(end);
                }
                else{
                    strt = parseFloat(strt.toFixed(2));
                    end = parseFloat(end.toFixed(2));
                }
                imagesearch.setSlider(filterId+"_slide", false, strt, end, isInt,true);
            }
        } else {
            var inputList = $('#' + listId).find(':input');
            for (var i = 0; i < inputList.length; i++) {
                var curLabel = $(inputList[i]).parent().children()[1].innerHTML;
                if (label === curLabel) {
                    inputList[i].checked = true;
                } else {
                    inputList[i].checked = false;
                }

                if (i < inputList.length - 1) {
                    filterutils.handleFilterSelectionUpdate(inputList[i], false, false);
                } else {
                    filterutils.handleFilterSelectionUpdate(inputList[i], true, true);
                }
            }
        }
    }

    var plotCategoricalData = function (plotId, lbl, plotData, isPie, showLbl) {
        var width = 150;
        var height = 150;
        var shifty = 48;
        var xshift=width/2+20;
        var margin = 0;
        var radius = Math.min(width, height) / 2 - margin;
        var radiusB = 1.1*radius;
        var mx =0;
        var mn =0;

        var filterId=plotId.replace("_chart","");
        if ( $('#'+filterId).attr('max') ) {
            //var mn = $('#' + slideId).data('min');
            var mx = $('#' + filterId).attr('max');
        }

        // append the svg object to the div called 'my_dataviz'
        var svg = d3.select("#"+plotId)
         .select("svg")
         .attr("width", width)
         .attr("height", height).style("text-anchor","middle");

      /*  var svg = d3.select("#"+plotId)
         .select("svg")
            .attr("viewBox",`0 0 290 340`).style("text-anchor","middle"); */

        var Tooltip = $("#"+plotId + " div.chart-tooltip").length > 0
            ? d3.select("#"+plotId + " div.chart-tooltip")
            : d3.select("#"+plotId)
                .append("div")
                .attr("class", "chart-tooltip")
                .style("top", "180px")
                .style("left", "0px");

        svg.selectAll("*").remove();

        titlePart = svg.append("text")
            .attr("text-anchor","middle")
            .attr("font-size", "16px")
            .attr("fill","#2A537A");
        var title0="";
        var title1="";
        var title2="";

        if (lbl.includes('Quarter')){
            var titA = lbl.split('Quarter');
            title1=titA[0]+' Quarter';
            title2=titA[1];
        } else if (lbl.includes('Background')){
            var titA = lbl.split('Activity');
            var titB = titA[1].split('(');
            title0 = titA[0];
            title1= 'Activity '+titB[0];
            title2= '('+titB[1];
        } else if (lbl.includes('(')){
           var titA = lbl.split('(');
           title1=titA[0];
           title2='('+titA[1];
         }
        else if (lbl.includes('Max Total Pixel')){
            var titA = lbl.split('Pixel')
            title1=titA[0]+'Pixel'
            title2=titA[1]
        }
        else{
          title2=lbl;
         }

         titlePart.append("tspan").attr("x",xshift).attr("y",0).attr("dx",0).attr("dy",0).text(title0);
         titlePart.append("tspan").attr("x", xshift).attr("y", 0).attr("dx", 0).attr("dy", 20).text(title1);
        titlePart.append("tspan").attr("x", xshift).attr("y", 0).attr("dx", 0).attr("dy", 40).text(title2);

        var pieg=svg.append("g").attr("transform", "translate(" + (width / 2 +20)  + "," + (height / 2 + shifty) + ")");
        var data = new Object;
        var nonZeroLabels= new Array();
        //spcing = 1.0/parseFloat(plotData.dataCnt.length);
        var tot=0;

        for (i=0;i<plotData.dataCnt.length;i++) {
           var pkey = plotData.dataLabel[i];
           var cnt = plotData.dataCnt[i];
           data[pkey]=cnt;
           tot+=cnt;
           if (cnt>0){
               nonZeroLabels.push(pkey);
           }
           //rng.push(parseFloat(i)*parseFloat(spcing));
        }
        $('#'+plotId).data('total',tot.toString());

       // set the color scale
       var color = d3.scaleOrdinal()
        .domain(nonZeroLabels)
        .range(d3.schemeCategory10);

       // don't color last pie slice the same as first
       var colorPie = function(lbl){
         var col="";
           if ( (nonZeroLabels.length>1) & (lbl === nonZeroLabels[nonZeroLabels.length-1]) && (color(nonZeroLabels[0])===color(lbl))  ){
                    col=color(nonZeroLabels[5]);
           } else {
               col=color(lbl);
           }
           return col;
       }

       // Compute the position of each group on the pie:
      var pie = d3.pie().value(function(d) {return d.value; }).sort(null);
      var data_ready = pie(d3.entries(data));

     // Build the pie chart: Basically, each part of the pie is a path that we build using the arc function.
      pieg
      .selectAll('whatever')
      .data(data_ready)
      .enter()
      .append('path')
      .attr('d', d3.arc()
      .innerRadius(0)
      .outerRadius(radius)
      )
      .attr('fill', function(d){ return(
        colorPie(d.data.key)  )
       })
      .attr("stroke", "black")
      .attr("data-tooltip", function(d){
          let perc = (parseInt((parseFloat(d.data.value)/parseFloat($('#'+plotId).data('total')))*100)).toString()+"%";
          let val = d.data.key.replace('* To',mn.toString()+' To').replace('To *', 'To '+mx.toString());
          let count = d.data.value;

          return '<div>' + val + '<br />' + count + ' (' + perc + ')</div>';
      })
      .attr('data-tooltip-color', function(d){
          return colorPie(d.data.key);
      })
      .style("stroke-width", "0px")
      .style("opacity", 0.7)
          .on("mouseover", function(d){
              Tooltip.style("opacity", 1);
          })
          .on("mousemove",function(d){
              let node = $(d3.select(this).node());
            Tooltip
                .html(node.data('tooltip'));
            $(Tooltip.node()).children("div").css("border-color", node.data('tooltip-color'))
            d3.select(this).attr('d', d3.arc()
           .innerRadius(0)
           .outerRadius(radiusB)
           );

        })
         .on("mouseleave",function(d){
             Tooltip.style("opacity", 0);
            d3.select(this).attr('d', d3.arc()
           .innerRadius(0)
           .outerRadius(radius)
           );
         })
        .on("click",function(d){
            if (!is_cohort) {
                manageUpdateFromPlot(plotId, d.data.key);
            }
        });

        var txtbx=pieg.append("text").attr("x","0px").attr("y","10px").attr('text-anchor','start');
        txtbx.append("tspan").attr("x","0px").attr("y","0px").attr("dy",0);
        txtbx.append("tspan").attr("x","0px").attr("y","0px").attr("dy",20);
        txtbx.append("tspan").attr("x","0px").attr("y","0px").attr("dy",40);
        txtbx.attr("opacity",0);

        if (tot===0) {
            txtbx.attr('text-anchor','middle');
            tspans=txtbx.node().childNodes;
            tspans[0].textContent = "No Data Available";
            txtbx.attr("opacity",1);
        }
    }


    return {


    };
});
