/**
 *
 * Copyright 2024, Institute for Systems Biology
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
        base: 'base',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security/script',
        underscore: 'libs/underscore-min',
        assetscore: 'libs/assets.core',
        assetsresponsive: 'libs/assets.responsive',
        tablesorter:'libs/jquery.tablesorter.min',
        filterutils:'filterutils',
        tippy: 'libs/tippy-bundle.umd.min',
        '@popperjs/core': 'libs/popper.min',
    },
    shim: {
        '@popperjs/core': {
          exports: "@popperjs/core"
        },
        'tippy': {
          exports: 'tippy',
            deps: ['@popperjs/core']
        },
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
        'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
        'tablesorter': ['jquery'],
        'underscore': {exports: '_'},
        'filterutils':['jquery']
    }
});

// Set up common JS UI actions which span most views
require([
    'filterutils',
    'jquery',
    'jqueryui',
    'tippy',
    'bootstrap',
    'session_security',
    'underscore',
    'base',
    'assetscore',
    'assetsresponsive',
    'tablesorter'
], function(filterutils, $, jqueryui, tippy, bootstrap, session_security, _, base) {


});

// Return an object for consts/methods used by most views
define(['filterutils','jquery', 'tippy', 'base' ], function(filterutils, $,  tippy, base) {
    var seriesTblOffset = 0;
    var seriesTblLimit = 0;
    var seriesTblStrt = 0;


    const getCartData = function(offset, limit, aggregate_level, results_level){
        let url = '/cart_data/';
        url = encodeURI(url);
        var ndic = {'filtergrp_list': JSON.stringify(window.filtergrp_list), 'partitions': JSON.stringify(window.partitions)}

        if (parseInt(offset)>0) {
            ndic['offset'] = offset;
        }
        if (parseInt(limit)>0){
          ndic['limit'] = limit;
        }
        if (aggregate_level.length>0){
          ndic['aggregate_level'] = aggregate_level;
        }
        if (results_level.length>0){
          ndic['results_level'] = results_level;
        }

        let csrftoken = $.getCookie('csrftoken');
        let deferred = $.Deferred();
        $.ajax({
            url: url,
            dataType: 'json',
            data: ndic,
            type: 'post',
            contentType: 'application/x-www-form-urlencoded',
            beforeSend: function (xhr) {
                xhr.setRequestHeader("X-CSRFToken", csrftoken);
            },
            success: function (data) {
                var dataset = data["docs"];
                deferred.resolve(
                 {
                     "data": dataset,
                     "recordsTotal": data["numFound"],
                     "recordsFiltered": data["numFound"]
                 });
            },
            error: function () {
                console.log("problem getting data");
                alert("There was an error fetching server data. Please alert the systems administrator");
            }
        });
        return deferred.promise();
    };


    const updateCartCounts =function(){

        var buttonContents = '<button class="btn filter-type clear-cart" role="button" title="Clear the current filter set."><i class="fa fa-rotate-left"></i></button>';

        if (Object.keys(window.proj_in_cart).length>0){
            var nmprojs = 0;
            var nmcases=0;
            var nmstudies=0;
            var nmseries =0;
            for (projid in window.proj_in_cart){
                nmprojs++;
                nmcases=nmcases+window.proj_in_cart[projid]['cases'];
                nmstudies=nmstudies+window.proj_in_cart[projid]['studies'];
                nmseries=nmseries+window.proj_in_cart[projid]['series'];
            }


            var content = buttonContents+'<span id ="#cart_stats">Cart contents: ' + nmseries.toString()+' series from '+nmprojs.toString()+
                ' collections / '+nmcases.toString()+' cases / '+nmstudies.toString()+' studies</span>';
            localStorage.setItem('manifestSeriesCount',nmseries);

            $('#cart_stats_holder').html(content) ;
            $('#cart_stats').removeClass('empty-cart');
            $('#export-manifest-cart').removeAttr('disabled');
            $('.cart-view').removeAttr('disabled');
            $('.clear-cart').removeAttr('disabled');
            $('.clear-cart').on('click', function(){
                 window.resetCart();
            });

        } else {
            $('#cart_stats_holder').html('<span id="#cart_stats">Your cart is currently empty</span>');
            $('#cart_stats').addClass('empty-cart');

            $('#export-manifest-cart').attr('disabled', 'disabled');
            $('.cart-view').attr('disabled', 'disabled');
            $('.clear-cart').attr('disabled', 'disabled');
        }

    }

    // remove all items from the cart. clear the glblcart, carHist, cartDetails
    window.resetCart = function(){
        window.cartHist = new Array();
        let cartSel = new Object();
        var parsedFiltObj = filterutils.parseFilterObj();
        cartSel['filter']= parsedFiltObj;
        cartSel['selections']= new Array();
        cartSel['partitions']= new Array();
        window.cartHist.push(cartSel);
        window.updatePartitionsFromScratch();
        var ret = formcartdata();
        window.partitions = ret[0];
        window.filtergrp_list = ret[1];
        var projs_to_clear = Object.keys(window.proj_in_cart);
        window.proj_in_cart= new Object();
        updateCartCounts();
        resetCartInTables(projs_to_clear);

         $('#cart_stats').addClass('empty-cart');
         $('#cart_stats').html("Your cart is currently empty.");
         $('#export-manifest-cart').attr('disabled','disabled');
         $('.cart-view').attr('disabled','disabled');
         $('.clear-cart').attr('disabled','disabled');
    }



    //as user makes selections in the tables, record the selections in the cartHist object. Make new partitions from the selections
    const updateCartSelections = function(newSel){

        var curInd = window.cartHist.length - 1;
        var selections = window.cartHist[curInd]['selections'];
        var selection = newSel['sel'];
        let started = Date.now();
        var newHistSel = new Array();
        for (var i=0;i<selections.length;i++) {
            var curselection = selections[i]['sel'];
            if (curselection.length >= selection.length) {
                var differenceFound = false;
                for (var j = 0; j < selection.length; j++) {
                    if (!(curselection[j] == selection[j])) {
                        differenceFound = true;
                        break;
                    }
                }
                if (differenceFound){
                    newHistSel.push(selections[i]);
                }
            } else{
                newHistSel.push(selections[i]);
            }
        }
        newHistSel.push(newSel);
        window.cartHist[curInd]['selections'] =  newHistSel;
        window.cartHist[curInd]['partitions'] = mkOrderedPartitions(window.cartHist[curInd]['selections']);


    }


    // make partitions from table selections
    const mkOrderedPartitions = function(selections){
        parts = new Array();
        possibleParts = new Array();
        for (var i=0;i<selections.length;i++){
            cursel = selections[i]['sel'];
            nxt = new Array();
            for (j=0; j< cursel.length;j++){
                nxt = [...nxt]
                nxt.push(cursel[j])
                possibleParts.push(nxt);
            }
        }

        for (var i=0;i<possibleParts.length;i++){
            nxtpart = possibleParts[i];
            var inserted = false;
            for (j =0; j< parts.length;j++){
               var eql = true;
               var lt = false;
               var curpart = parts[j];
               var numcmp = Math.min(nxtpart.length, curpart.length);
               for (k=0;k<numcmp;k++){
                   if (nxtpart[k]<curpart[k]){
                       lt = true;
                       eql = false
                       break;
                   }
                   else if (nxtpart[k]>curpart[k]){
                       eql = false;
                       break;
                   }
               }
               if (lt || (eql && (nxtpart.length<curpart.length))){
                   insertInd=j
                   parts.splice(insertInd, 0, nxtpart)
                   inserted = true;
                   break;
               } else if (eql && (nxtpart.length==curpart.length)){
                 inserted = true;
                 break;
               }
               if(inserted){
                   break;
               }
           }
           if (!inserted){
               parts.push(nxtpart);
           }
        }
        return parts;
    }

    // go from the explorer to the cart page with datastructure to be used in creating a series level view of the cart
     window.viewcart = function(){
        window.updatePartitionsFromScratch();
        var ret = formcartdata();
        var partitions = ret[0];
        var filterSets = ret[1];

        var mxNumSeries=0;
        var mxNumStudies=0;

        for (proj in window.proj_in_cart){
            mxNumSeries+= window.proj_in_cart[proj]['series'];
            mxNumStudies+= window.proj_in_cart[proj]['studies'];
        }

        if ($('#cart-view-elem').length>0) {
            document.getElementById("cart-view-elem").remove();
        }
        var csrftoken = $.getCookie('csrftoken');
        var form = document.createElement('form');
        form.id = "cart-view-elem";
        form.style.visibility = 'hidden'; // no user interaction is necessary
        form.method = 'POST'; // forms by default use GET query strings
        //form.action = '/explore/cart/';
        form.action = '/cart/';
        //form.append(csrftoken);
        var input = document.createElement('input');
        input.name = "csrfmiddlewaretoken";
        input.value =csrftoken;
        form.appendChild(input);
        var input = document.createElement('input');
        input.name = "carthist";
        input.value = JSON.stringify(window.cartHist);
        form.appendChild(input);
        var input = document.createElement('input');
        input.name = "filtergrp_list";
        input.value = JSON.stringify(filterSets);
        form.appendChild(input);
        var input = document.createElement('input');
        input.name = "partitions";
        input.value = JSON.stringify(partitions);
        form.appendChild(input);
        var input = document.createElement('input');
        input.name = "mxseries";
        input.value = mxNumSeries;
        form.appendChild(input);
        var input = document.createElement('input');
        input.name = "mxstudies";
        input.value = mxNumStudies;
        form.appendChild(input);
        var input = document.createElement('input');
        input.name = "proj_in_cart";
        input.value = JSON.stringify(window.proj_in_cart);
        form.appendChild(input);
        document.body.appendChild(form)
        form.submit();

    };

     window.updatePartitionsFromScratch = function(){
        window.partitions = new Array();

        for (var i=0;i<window.cartHist.length;i++){
           var cartHist=window.cartHist[i];
           updateGlobalPartitions(cartHist.partitions);
        }
        for (var i=0;i<window.cartHist.length;i++){
           var cartHist=window.cartHist[i];
           refilterGlobalPartitions(cartHist,i);
        }
        fixpartitions();
        var filtStrings = createFiltStrings();
        var solrStr = createSolrString(filtStrings);
        window.solrStr = solrStr;
        var ii=1;
    };

    //looking across the history of cart selections, create one set of exclusive partitions of the imaging data
    const updateGlobalPartitions = function(newparts){
        //var newparts = cartHist.partitions;
        for (var i=0;i<newparts.length;i++){
            var inserted = false;
            var nxtpart=newparts[i];
            var nxtlen = nxtpart.length;
            var basefilt = new Array();
            for (var j=0;j<window.partitions.length;j++){
                var eql = true;
                var lt = false;
                curpart = window.partitions[j]['id'];
                curpartlen = curpart.length;

                var numcmp = Math.min(nxtpart.length, curpart.length);
                for (k=0;k<numcmp;k++){
                   if (nxtpart[k]<curpart[k]){
                       lt = true;
                       eql = false
                       break;
                   }
                   else if (nxtpart[k]>curpart[k]){
                       eql = false;
                       break;
                   }
               }
                if (lt || (eql && (nxtpart.length<curpart.length))){
                   var insertInd=j;
                   inserted = true;
                   addNewPartition(nxtpart, insertInd, basefilt)
                   break;
               } else if (eql && (nxtpart.length==curpart.length)){
                 inserted = true;
                 break;
               } else if (eql && (nxtpart.length==curpart.length+1)){

                 if (window.partitions[j]['not'].indexOf(nxtpart[nxtpart.length-1])<0){
                    window.partitions[j]['not'].push(nxtpart[nxtpart.length-1]);
                 }

                 for (var filtprt=0;filtprt<window.partitions[j]['filt'].length;filtprt++){
                     var tmp = window.partitions[j]['filt'][filtprt];
                     basefilt.push([...tmp])
                 }
               }
              window.partitions[j]['not'].sort();
            }
            if (!inserted){
               addNewPartition(nxtpart, -1, basefilt);
           }
        }
    }

    // add a new partition. basefilt is the active filter when this partition is first encountered
    const addNewPartition= function(part, pos, basefilt) {
        newPart = new Object();
        newPart['not'] = new Array();
        newPart['id'] = [...part]
        newPart['filt'] = basefilt;
        newPart['null'] = true;
        if (pos > -1) {
           window.partitions.splice(pos, 0, newPart);
        } else {
            window.partitions.push(newPart);
        }
    }

    // update the filter array for each partition
    const refilterGlobalPartitions= function(cartHist,cartnum){
        var selections = cartHist['selections'];
        var checkedA = new Array()
        for (var i=0;i<selections.length;i++){
            var ind = selections.length-(1+i);
            var cursel = selections[ind];
            var curid = cursel['sel'];
            var added = cursel['added'];
            for (var j=0;j<window.partitions.length;j++){
                var part = window.partitions[j];
                var partid = part['id'];
                if ((checkedA.indexOf(j)<0) && (curid.length<=partid.length)) {
                    var filt = part['filt'];
                    //var nll = part['null'];
                    var eq = true;
                    for (var k=0; k<curid.length;k++){
                        if (!(curid[k]==partid[k])){
                            eq = false;
                            break;
                        }
                    }
                    if (eq){
                        checkedA.push(j);
                        if (added){
                            part['filt'].push([cartnum]);
                            part['null'] = false;
                        }
                        else if (!part['null']){
                            for (var k=0;k<part['filt'].length;k++){
                                part['filt'][k].push(cartnum);
                            }
                        }
                    }
                }
            }
        }
    };

    const fixpartitions = function(){
      var isempty = new Array();
      for (var i=0;i<window.cartHist.length;i++){
          if (Object.keys(window.cartHist[i].filter).length==0){
              isempty.push(true);
          } else {
              isempty.push(false);
          }
      }

      for (var i=0;i<window.partitions.length;i++){
          var nfilts = new Array();
          for (var j=0; j<window.partitions[i].filt.length;j++){
              var remv = false;
              for (var k=1;k<window.partitions[i].filt[j].length;k++){
                  var filt= window.partitions[i].filt[j][k]
                  if (isempty[filt]){
                      remv = true;
                      break;
                  }
              }
              if (!remv){
                  nfilts.push(window.partitions[i].filt[j])
              }
          }
          window.partitions[i].filt=nfilts;
          if (nfilts.length ==0){
              window.partitions[i].null = true;
          }
      }
    }
    const formcartdata = function(){
        var partitions = new Array();
            for (var i=0; i< window.partitions.length;i++) {
                if (!('null'in window.partitions[i]) || !(window.partitions[i]['null'])){
                    partitions.push(window.partitions[i])
                }
            }
            var filterSets = new Array();
            for (var i=0; i< window.cartHist.length;i++) {
               filterSets.push(window.cartHist[i]['filter'])
            }
        return [partitions, filterSets];
    }

    // creates an array of all used filter sets
    const createFiltStrings = function(){
        var filtStrings = new Array();
        var attA = [];
        for (var i=0;i<window.cartHist.length;i++){
            var filt= window.cartHist[i]['filter'];
            filtkeys = Object.keys(filt);
            var fstr=''
            for (var j=0;j<filtkeys.length;j++) {
                fkey = filtkeys[j];
                //if (!(fkey == "collection_id")){
                if (true){
                    var nstr = '(+' + fkey + ':(';
                   var attA = ('values' in filt[fkey] && (Array.isArray(filt[fkey]['values']))) ? filt[fkey]['values'] : filt[fkey];
                   var op = ('op' in filt[fkey]) ? filt[fkey]['op'] : 'OR';
                   attA = attA.map(x => '"' + x + '"')
                   nstr = nstr + attA.join(' ' + op + ' ') + '))';
                  fstr = fstr + nstr;
               }
            }
            filtStrings.push(fstr);
        }
        return(filtStrings);
    }

    // not really needed, but used to creating the solr string in on the client side
    const createSolrString = function(filtStringA){
        var solrStr=''
        var solrA=[]
        for (var i=0;i< window.partitions.length;i++){
            var curPart = window.partitions[i];
            if (!curPart['null']) {
                var curPartAttStrA = parsePartitionAttStrings(filtStringA, curPart);
                var curPartStr = parsePartitionStrings(curPart);
                for (var j = 0; j < curPartAttStrA.length; j++) {
                    if (curPartAttStrA[j].length > 0) {
                        solrA.push('(' + curPartStr + ')(' + curPartAttStrA[j] + ')')
                    } else{
                        solrA.push(curPartStr);
                    }
                }
            }
        }
        solrA = solrA.map(x => '('+x+')');
        var solrStr = solrA.join(' OR ')
        return solrStr
    }

    const parsePartitionAttStrings = function(filtStringA, partition){
        var attStrA =[];
        var filt2D = partition['filt'];
        for (var i=0; i<filt2D.length;i++){
            filtL=filt2D[i];
            var tmpA=[]
            for (var j=0;j<filtL.length;j++){
                var filtindex= filtL[j]
                filtStr=filtStringA[filtindex];
                if (filtStr.length>0){
                    if (j==0){
                        tmpA.push('('+filtStr+')')
                    }
                    else{
                        tmpA.push('NOT ('+filtStr+')')
                    }
                }
            }
            attStrA.push(tmpA.join(' AND '))
        }
        return attStrA;
    }
    const parsePartitionStrings = function(partition){
        var filts = ['collection_id', 'PatientID', 'StudyInstanceUID','SeriesInstanceUID']
        var id = partition['id']
        var partStr='';
        for (var i=0;i<id.length;i++){
            partStr+='(+'+filts[i]+':("'+id[i]+'"))';
        }
        var not= partition['not'];
        if (not.length>0){
            not= not.map(x => '"'+x+'"');
            var notStr= not.join(' OR ');
            partStr=partStr+' AND NOT ('+filts[id.length]+':('+notStr+'))';
        }
        return partStr
    }

    const updateCartTable = function() {

        var slimViewAbleModality=new Set(["SM"])
        if ($('.cart-wrapper').find('.dataTables_controls').length>0){
            var pageRows = parseInt($('.cart-wrapper').find('.dataTables_length select').val());
            var pageCur = parseInt($('.cart-wrapper').find('.dataTables_paginate').find('.current').text());
        } else {
            var pageRows = 10;
            var pageCur=1;
        }
        $('#cart-table').DataTable().destroy();
        try {
            $('#cart-table').DataTable({
                "iDisplayLength": pageRows,
                "displayStart": (pageCur - 1) * pageRows,
                "autoWidth": false,
                "dom": '<"dataTables_controls"ilp>rt<"bottom"><"clear">',
                "order": [[1, "asc"]],

                "createdRow": function (row, data, dataIndex) {
                    $(row).attr('id', 'series_' + data['SeriesInstanceUID'])
                    $(row).attr('data-studyid', data['StudyInstanceUID']);
                    $(row).attr('data-caseid', data['PatientID']);
                    $(row).attr('data-projectid', data['collection_id'][0]);
                    $(row).find('input').on('click', function (event) {
                        var collection_id = data['collection_id'][0];
                        var caseid = data['PatientID'];
                        var studyid = data['StudyInstanceUID'];
                        //var seriesid = data['SeriesInstanceUID'];
                        var numseries = data['cnt'];
                        if (!window.cartedits) {
                            let cartSel = new Object();
                            cartSel['filter'] = {};
                            cartSel['selections'] = new Array();
                            cartSel['partitions'] = new Array();
                            window.cartHist.push(cartSel);
                            window.cartedits = true;
                        }
                        var newSel = new Object();
                        newSel['added'] = false;
                        newSel['sel'] = [collection_id, caseid, studyid, seriesid];
                        //cartutils.updateCartSelections(newSel,false, null, 'cartpage');

                        window.updatePartitionsFromScratch();
                        var ret = cartutils.formcartdata();
                        window.partitions = ret[0];
                        window.filtergrp_list = ret[1];
                        window.seriesdel.push(seriesid);

                        window.cartDetails = window.cartDetails + 'Removed SeriesInstanceUID = "' + seriesid.toString() + '" from the cart\n\n';
                        sessionStorage.setItem("cartDetails", JSON.stringify(window.cartDetails));
                        updateCartTable();
                    });
                },

                "columnDefs": [],
                "columns": [
                    {
                        "type": "html", "orderable": false, "data": "collection_id", render: function (data) {
                            return data;
                        }
                    },

                    {
                        "type": "html", "orderable": false, "data": "PatientID", render: function (data) {
                            return data;
                        }
                    },


                    {
                        "type": "text", "orderable": true, data: 'StudyInstanceUID', render: function (data) {
                            return pretty_print_id(data) +
                                ' <a class="copy-this" role="button" content="' + data +
                                '"  title="Copy Study ID to the clipboard"><i class="fa-solid fa-copy"></i></a>';
                        }
                    },


                    {
                        "type": "text", "orderable": false, data: 'selcnt', render: function (data, type, row) {
                            return data;
                        }
                    },
                    {
                        "type": "html",
                        "orderable": false,
                        data: 'StudyInstanceUID',
                        render: function (data, type, row) {
                            var coll_id = "";
                            if (Array.isArray(row['collection_id'])) {
                                coll_id = row['collection_id'][0];
                            } else {
                                coll_id = row['collection_id']
                            }
                            let modality = row['Modality'];
                            let is_xc = (modality === "XC" || (Array.isArray(modality) && modality.includes("XC")));

                             if ((Array.isArray(modality) && modality.some(function (el) {
                                    return slimViewAbleModality.has(el)
                                }
                            )) || (slimViewAbleModality.has(row['Modality']))) {
                                return '<a href="' + SLIM_VIEWER_PATH + row['StudyInstanceUID'] + '/series/' + data +
                                    '" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-eye"></i>'
                            } else {
                                let v2_link = is_xc ? "" : OHIF_V2_PATH + data;
                                let v3_link = OHIF_V3_PATH + "=" + data;
                                let v2_element = '<li title="Not available for this modality."><a class="disabled" href="'
                                    + v2_link + '" target="_blank" rel="noopener noreferrer">OHIF v2</a></li>';
                                let default_viewer = is_xc ? v3_link : v2_link;
                                let volView_element = '<li title="VolView is disabled for this Study."><a class="disabled">VolView ' +
                                    '<i class="fa-solid fa-external-link external-link-icon" aria-hidden="true">' +
                                    '</a></li>';
                                let bucket = Array.isArray(row['aws_bucket']) ? row['aws_bucket'][0] : row['aws_bucket'];
                                if(!is_xc) {
                                    if(bucket.indexOf(",") < 0) {
                                        let volView_link = VOLVIEW_PATH + "=[" + row['crdc_series_uuid'].map(function (i) {
                                            return "s3://" + row['aws_bucket'] + "/" + i;
                                        }).join(",") + ']"';
                                        volView_element = '<li><a class="external-link" href="" url="'+volView_link+'" ' +
                                            'data-toggle="modal" data-target="#external-web-warning">VolView ' +
                                            '<i class="fa-solid fa-external-link external-link-icon" aria-hidden="true">' +
                                            '</a></li>';
                                    }
                                    v2_element = '<li><a href="'+v2_link+'" target="_blank" rel="noopener noreferrer">OHIF v2</a></li>';
                                }
                                return '<a href="' + default_viewer + '" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-eye"></i>' +
                                    '<div class="dropdown viewer-toggle">' +
                                    '<a class="dropdown-toggle btnGroupDropViewers" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true"><i class="fa-solid fa-caret-down"></i></a>' +
                                    '<ul class="dropdown-menu viewer-menu">' +
                                    v2_element +
                                    '<li><a href="'+v3_link+'" target="_blank" rel="noopener noreferrer">OHIF v3</a></li>' +
                                    volView_element +
                                    '</ul>' +
                                    '</div>';
                            }
                        }
                    }
                ],
                "processing": true,
                "serverSide": true,
                 "ajax": function (request, callback) {
                    let url = '/cart_data/';
                    url = encodeURI(url);
                    var ndic = {'filtergrp_list': JSON.stringify(window.filtergrp_list), 'partitions': JSON.stringify(window.partitions)}
                     try {
                         ndic['offset'] = parseInt(request.start);
                     }
                     catch (Exception){
                        print(Exception);
                     }

                    ndic['length'] = request.length;
                    ndic['limit'] = window.mxstudies;
                    ndic['mxseries'] = window.mxseries;

                    ndic['aggregate_level'] = 'StudyInstanceUID'
                    ndic['results_level'] = 'StudyInstanceUID'
                    var csrftoken = $.getCookie('csrftoken');
                    window.show_spinner();
                    $.ajax({
                        url: url,
                        dataType: 'json',
                        data: ndic,
                        type: 'post',
                        contentType: 'application/x-www-form-urlencoded',
                        beforeSend: function (xhr) {
                            xhr.setRequestHeader("X-CSRFToken", csrftoken);
                        },
                        success: function (data) {
                            console.log(" data received");
                            var dataset = data["docs"];
                            $('input[name="async_download"]').val(data['numFound'] > 65000 ? "True" : "False");
                             callback({
                                 "data": dataset,
                                 "recordsTotal": data['numFound'],
                                 "recordsFiltered": data['numFound']
                             });
                             var txt =$('#cart-table_info').text().replace('entries','studies');
                             $('#cart-table_info').text(txt);
                             window.hide_spinner();
                        },
                        error: function () {
                            console.log("problem getting data");
                            alert("There was an error fetching server data. Please alert the systems administrator");
                            window.hide_spinner();
                        }
                    });
                }
            });
        } catch(Exception){
            alert("The following error was reported when processing server data: "+ Exception +". Please alert the systems administrator");
            window.hide_spinner();
        }
    }

     const pretty_print_id = function (id) {
        var newId = id.slice(0, 8) + '...' + id.slice(id.length - 8, id.length);
        return newId;
    }

    return {
        mkOrderedPartitions: mkOrderedPartitions,
        formcartdata: formcartdata,
        updateCartSelections: updateCartSelections,
        getCartData: getCartData,
        updateCartTable: updateCartTable,
        updateCartCounts: updateCartCounts
    };
});
