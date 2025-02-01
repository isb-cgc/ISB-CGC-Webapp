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

    // we were maintaining a view of the cart in local storage. But its been too slow so we are aborting for now
    const setCartHistWinFromLocal = function () {
        var cartHistSet = false;
        if (('sessionid' in localStorage) && ('cartHist' in localStorage)){
            var sessionid = localStorage.getItem("sessionid")
            var cartHist = JSON.parse(localStorage.getItem("cartHist"));
            if (sessionid in cartHist) {
                window.cartHist = cartHist[sessionid];
                cartHistSet = true;
            }
        }
        return cartHistSet;
    }
    // we were maintaining a view of the cart in local storage. But its been too slow so we are aborting for now
    const setLocalFromCartHistWin = function(){
        if ('sessionid' in localStorage) {
            var sessionid = localStorage.getItem("sessionid")
            var cartObj = new Object();
            cartObj[sessionid] = window.cartHist;
            localStorage.setItem("cartHist", JSON.stringify(cartObj));
        }
    }

    const updateLocalCartAfterSessionChng = function(){
        var sessionid = null;
        var presessionid = null;
        var cartObj = new Object();
        var cartHist = [];

        if (('cartHist' in localStorage) && ('sessionid' in localStorage)) {
            var cartHistLcl = JSON.parse(localStorage.getItem("cartHist"));

            if (('presessionid' in localStorage) || ('sessionid' in localStorage)) {
                if ('presessionid' in localStorage) {
                    presessionid = localStorage.getItem('presessionid');
                    if (presessionid in cartHistLcl) {
                        cartHist = cartHistLcl[presessionid];
                    }
                }
                if ('sessionid' in localStorage) {
                    var sessionid = localStorage.getItem('sessionid');
                    if (sessionid in cartHistLcl) {
                        cartHist = [...cartHist, ...cartHistLcl[sessionid]];
                    }
                }
                if (cartHist.length > 0) {
                  cartObj[sessionid] = cartHist;
                  localStorage.setItem("cartHist", JSON.stringify(cartObj));
                } else{
                    localStorage.removeItem("cartHist");
                }
                localStorage.removeItem("presessionid")
            } else {
                localStorage.removeItem("cartHist")
            }
        }
    };

    // given a dic with studyid as keys, add or subtract series from the cart
    const updateGlobalCart = function(cartAdded, studymp, lvl){
        for (studyid in studymp){
           if (lvl=="series") {
               var seriesArr = studymp[studyid];
               for (var i=0; i<seriesArr.length;i++) {
                   var seriesid = seriesArr[i];
                   if (cartAdded) {
                       if (!(studyid in window.glblcart)) {
                           window.glblcart[studyid] = new Object();
                           window.glblcart[studyid]['all'] = false;
                           window.glblcart[studyid]['sel'] = new Set();
                       }
                       window.glblcart[studyid]['sel'].add(seriesid);
                       if (window.studymp[studyid]['val'].length == window.glblcart[studyid]['sel'].size) {
                           window.glblcart[studyid]['all'] = true;
                           window.glblcart[studyid]['sel'] = new Set();
                       }
                   } else {
                       if (studyid in window.glblcart) {
                           if (window.glblcart[studyid]['all']) {
                               window.glblcart[studyid]['all'] = false;
                               window.glblcart[studyid]['sel'] = new Set([...window.studymp[studyid]['val']]);
                           }
                            window.glblcart[studyid]['sel'].delete(seriesid);
                         if (window.glblcart[studyid]['sel'].size == 0) {
                             delete window.glblcart[studyid];
                         }
                    }
                  }
               }
           } else{
             if (cartAdded){
                 window.glblcart[studyid]=new Object();
                 window.glblcart[studyid]['all'] = true;
                 window.glblcart[studyid]['sel'] = new Set();
             } else {
                 if (studyid in window.glblcart){
                     delete(window.glblcart[studyid]);
                 }
             }
           }
        }
    };

    // calculate the tot # of projects, cases, studies, and series in the cart
    const getGlobalCounts = function(){
        // TODO: call Solr to get counts from facet based on partition
        tots=[0,0,0,0]
        for (projid in window.projstudymp){
            for (studyid in window.projstudymp[projid]){
                if (studyid in window.glblcart){
                    tots[0]++;
                    break;

                }
            }
        }
        for (caseid in window.casestudymp){
            for (studyid in window.casestudymp[caseid]) {
                if (studyid in window.glblcart) {
                    tots[1]++;
                    break;
                }
            }
        }
        tots[2] = Object.keys(window.glblcart).length;
        for (studyid in window.glblcart){
            if (window.glblcart[studyid]['all']){
                tots[3]=tots[3]+window.studymp[studyid]['cnt'];
            } else{
                tots[3]=tots[3]+window.glblcart[studyid]['sel'].size;
            }
        }
        return tots;
    };

    const getCartData = function(offset, limit, aggregate_level, results_level){
        let url = '/cart_data/';
        url = encodeURI(url);
        var ndic = {'filtergrp_list': JSON.stringify(window.filtergrp_lst), 'partitions': JSON.stringify(window.partitions)}

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

    const updateTableCountsAndGlobalCartCounts = function(){
        let started = Date.now();
        window.updateTableCounts();
        var gtotals = getGlobalCounts();
        var content = "Cart contents: " + gtotals[3]+" series from "+gtotals[0]+" collections / "+ gtotals[1]+" cases / "+gtotals[2]+ " studies";

        localStorage.setItem('cartNumStudies', gtotals[2]);
        localStorage.setItem('cartNumSeries', gtotals[3]);
        $('#cart_stats').html(content) ;
        if (gtotals[0]>0){
            $('#cart_stats').removeClass('empty-cart');
            $('#export-manifest-cart').removeAttr('disabled');
            $('.cart-view').removeAttr('disabled');
            $('.clear-cart').removeAttr('disabled');
        } else {
            $('#cart_stats').addClass('empty-cart');
            $('#cart_stats').html("Your cart is currently empty.");
            $('#export-manifest-cart').attr('disabled','disabled');
            $('.cart-view').attr('disabled','disabled');
            $('.clear-cart').attr('disabled','disabled');
        }
        let elapsed = (Date.now()-started)/1000;
        console.debug(`Elapsed time for updateTableCountsAndGlobalCartCounts: ${elapsed}s`);
    }

    // remove all items from the cart. clear the glblcart, carHist, cartDetails
    window.resetCart = function(){
        window.cart = new Object();
        window.glblcart = new Object();
        window.cartHist = new Array();
        window.cartStep = 1;
        window.partitions = new Array();
        let cartSel = new Object();
        var parsedFiltObj = filterutils.parseFilterObj();
        cartSel['filter']= parsedFiltObj;
        cartSel['selections']= new Array();
        cartSel['partitions']= new Array();
        window.cartHist.push(cartSel);
        setLocalFromCartHistWin();
        window.partitions = new Array();
        window.cartStep=0
        window.cartDetails = 'Current filter definition is '+JSON.stringify(parsedFiltObj)+'\n\n'
        window.cartStep++;

         window.updateTableCounts();
         $('#cart_stats').addClass('empty-cart');
         $('#cart_stats').html("Your cart is currently empty.");
         $('#export-manifest-cart').attr('disabled','disabled');
         $('.cart-view').attr('disabled','disabled');
         $('.clear-cart').attr('disabled','disabled');
    }

    $('.clear-cart').on('click', function(){
        window.resetCart();
    });

    //as user makes selections in the tables, record the selections in the cartHist object. Make new partitions from the selections
    const updateCartSelections = function(newSel, addingToCart,studymp,updateSource,completeObj){
        var curInd = window.cartHist.length - 1;
        var curPageid= window.cartHist[curInd]['pageid'];
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

        var projid = newSel['sel'][0];
        updateCartAndCartMetrics(addingToCart, projid, studymp, updateSource).then(function(){
            let elapsed = (Date.now()-started)/1000;
            console.debug(`Elapsed time for updateCartSelections: ${elapsed}s`);
            completeObj && completeObj.trigger('shopping-cart:update-complete');
        });
    }

    const updateCartAndCartMetrics = function(addingToCart,projid,studymp,updateSource){
        let deferred = $.Deferred();
        if (updateSource == 'project' && addingToCart){
            updateProjStudyMp(
                [projid], window.selProjects[projid]['mxstudies'], window.selProjects[projid]['mxseries'],
                0, window.selProjects[projid]['mxstudies']
            ).then(function(){
                updateGlobalCart(addingToCart, window.selProjects[projid].studymp, 'project');
                updateTableCountsAndGlobalCartCounts();
                deferred.resolve();
            })
        } else if (updateSource == "cartpage"){
            updateGlobalCart(addingToCart, studymp, 'series');
            deferred.resolve();
        } else {
            updateGlobalCart(addingToCart, studymp, updateSource);
            updateTableCountsAndGlobalCartCounts();
            deferred.resolve();
        }
        return deferred.promise();
    }

    //was used to track cart across mutiple tabs or page refresh. Its too slow!
    const refreshCartAndFiltersFromScratch = function(checkFilters){
        setCartHistWinFromLocal();
        window.updatePartitionsFromScratch();
        var ret =formcartdata();
        window.partitions = ret[0];
        window.filtergrp_lst = ret[1];
        window.glblcart = new Object();

        var projDone={}
        var serieslim=1;
        var studylim=1;
        for (var j=0; j<window.partitions.length;j++){
            var projid = window.partitions[j]['id'][0];
            if (!(projid in projDone)){
                projDone[projid]=1
                var dataset = window.selProjects[projid]
                serieslim+=parseInt(dataset.mxseries);
                studylim+=parseInt(dataset.mxstudies);
            }
        }

        Promise.resolve(getCartData('', studylim, 'StudyInstanceUID', 'StudyInstanceUID')).then(function (ret) {
            //var j = 1;
            load_filters = null;
            var projSet = new Set();
            var pgCnt = 0;

            for (var j = 0; j < ret['data'].length; j++) {
                var row = ret['data'][j];
                var studyid = row['StudyInstanceUID'];
                var patientid = row['PatientID'];
                var collection_id = row['collection_id'][0];
                var cnt = row['cnt']

                if (!(collection_id in projstudymp)) {
                    window.projstudymp[collection_id] = {}
                }
                window.glblcart[studyid] = {}
                //window.glblcart[studyid]['cnt']=parseInt(cnt);

                if ('val' in row) {
                    window.glblcart[studyid]['sel'] = new Set(row['val']);
                    newcnt = window.glblcart[studyid]['sel'].size;
                    if (row['val'].length < cnt) {
                        window.glblcart[studyid]['all'] = false;
                    } else {
                        window.glblcart[studyid]['all'] = true;
                    }
                } else {
                    window.glblcart[studyid]['all'] = true;
                    newcnt =cnt;
                }

                window.projstudymp[collection_id][studyid] = cnt;
                window.studymp[studyid] = {}
                window.studymp[studyid]['proj'] = collection_id;
                window.studymp[studyid]['PatientID'] = patientid;
                window.studymp[studyid]['cnt'] = cnt;
                window.studymp[studyid]['val'] = [];
            }

            if (checkFilters) {
                load_filters = filterutils.load_preset_filters();
            }
            if ((load_filters === null)  ){
                var projArr = [];
                var mxstudies = 0;
                var mxseries = 0;
                for (var projid in window.projstudymp) {
                    for (var studyid in window.projstudymp[projid]) {
                        if (studyid in window.glblcart) {
                            projArr.push(projid);
                            mxstudies += window.selProjects[projid]['mxstudies'];
                            mxseries += window.selProjects[projid]['mxseries'];
                            break;
                        }
                    }
                }
                if (projArr.length > 0) {
                    updateProjStudyMp(projArr, mxstudies, mxseries, 0 , mxstudies).then(function(){
                        updateTableCountsAndGlobalCartCounts();
                    });
                }
            }
        })
    }

    const removeSeriesFromTalley = function(seriesid,studyid,curind){
        //var curind = window.glblcart[studyid]['pos'];
        var pgLocInd = window.seriesTalley[curind]['pgind'];
        var splicelen = window.cartPgLocator - pgLocInd;
        window.cartPgLocator.splice(pgLocInd,splicelen);

        if (!(studyid in window.glblcart)){
           window.seriesTalley.splice(curind, 1)
        }
        for (var j=curind; j<window.seriesTalley.length+1;j++){
            window.seriesTalley[j]['talley'] = window.seriesTalley[j]['talley']-1
              var nxtind = Math.floor(window.seriesTalley[j]['talley']*0.1);
              for (var k=pgLocInd+1;k<nxtind+1;k++){
                  window.cartPgLocator.push(j);
                  pgLocInd=nxtind;
              }
        }
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

        var projS = new Set();
        for (var i=0;i<partitions.length;i++){
            projS.add(partitions[i].id[0]);
        }
        var mxNumSeries=0;
        var mxNumStudies=0;
        var projl = [...projS]
        for (var i=0;i<projl.length;i++){
            var proj = projl[i]
            mxNumSeries+= window.selProjects[proj].mxseries;
            mxNumStudies+= window.selProjects[proj].mxstudies;
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
        input.name = "stats";
        input.value = $('#cart_stats').text();
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

    const getCartSeriesDataPages = function(start, length){
         seriesTblLimit = length;
         seriesTblStrt = start
         var firstPage = Math.floor((start)*0.1);
         var lastPage = Math.min(Math.floor((length+start)*0.1),window.cartPgLocator.length-1);
         var prevPage = firstPage-1;
         var firstStudyIndex = window.cartPgLocator[firstPage];
         var lastStudyIndex = window.cartPgLocator[lastPage];
         var firstPgWhichStartsWithFirstStudy = window.seriesTalley[firstStudyIndex]['pgind']

         // seriesTblOffset is the number of series in the table just before the first study which is encountered on the first page in this selection
         if (firstPgWhichStartsWithFirstStudy>0) {
             var prevPageIndex = window.cartPgLocator[firstPgWhichStartsWithFirstStudy-1];
             seriesTblOffset = window.seriesTalley[prevPageIndex]['talley']
         } else {
             seriesTblOffset = 0;
         }

         // the ids of the studies in these pages
         var studyArr = [];
         for (var i=firstStudyIndex;i<lastStudyIndex+1;i++){
                 studyArr.push(window.seriesTalley[i]['studyid']);
         }

        var filterStr = JSON.stringify({'StudyInstanceUID': studyArr});
         var ndic = {'filters':filterStr, 'sort':'StudyInstanceUID'}
        let url = '/tables/series/';
         var csrftoken = $.getCookie('csrftoken');
         url = encodeURI(url);
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
                try {
                    console.log(" data received");
                    var numFound =0;
                    var dataset = new Array();
                    for (var i=0;i<data['res'].length;i++){
                        var isFound = false;
                        var row = data['res'][i];
                        var studyid = row['StudyInstanceUID'];
                        // we are getting all series for the study. Need to filter out series not in cart.
                        // Also some series may lie before or after the pages we need to return to the table
                        if (studyid in window.glblcart){
                            if (window.glblcart[studyid]['all']){
                                numFound++;
                                if (((numFound+seriesTblOffset)>seriesTblStrt) && ((numFound+seriesTblOffset)<=(seriesTblStrt+seriesTblLimit))){
                                    isFound = true;
                                }
                            } else {
                                var seriesid = row['SeriesInstanceUID'];
                                if (('sel' in window.glblcart[studyid]) && (window.glblcart[studyid]['sel'].has(seriesid))){
                                    numFound++;
                                    if (((numFound+seriesTblOffset)>seriesTblStrt) && ((numFound+seriesTblOffset)<=(seriesTblStrt+seriesTblLimit))){
                                      isFound = true;
                                  }
                                }
                            }
                        }
                        if (isFound){
                            dataset.push(row)
                        }
                    }
                }
                 catch(err){
                console.log('error processing data');
                alert("There was an error processing the server data. Please alert the systems administrator")
              }
            finally {
              deferred.resolve(dataset);
              }
            },
            error: function () {
                console.log("problem getting data");
                alert("There was an error fetching server data. Please alert the systems administrator");
            }
         });
          return deferred.promise();
    };

    const updateCartTable = function() {
        var nonViewAbleModality= new Set(["PR","SEG","RTSTRUCT","RTPLAN","RWV", "SR", "ANN"])
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
                        cartutils.updateCartSelections(newSel,false, null, 'cartpage');

                        window.updatePartitionsFromScratch();
                        var ret = cartutils.formcartdata();
                        window.partitions = ret[0];
                        window.filtergrp_lst = ret[1];
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
                                return nonViewAbleModality.has(el)
                            })) || nonViewAbleModality.has(modality)) {
                                let tooltip = "no-viewer-tooltip";
                                return `<a href="/" onclick="return false;"><i class="fa-solid fa-eye-slash ${tooltip}"></i>`;
                            } else if ((Array.isArray(modality) && modality.some(function (el) {
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
                    var ndic = {'filtergrp_list': JSON.stringify(window.filtergrp_lst), 'partitions': JSON.stringify(window.partitions)}
                     try {
                         ndic['offset'] = parseInt(request.start);
                     }
                     catch (Exception){
                        print(Exception);
                     }

                    ndic['length'] = request.length;
                    ndic['limit'] = window.mxstudies
                    ndic['mxseries'] = window.mxseries

                    ndic['aggregate_level'] = 'StudyInstanceUID'
                    ndic['results_level'] = 'StudyInstanceUID'
                    var csrftoken = $.getCookie('csrftoken');
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
                        },
                        error: function () {
                            console.log("problem getting data");
                            alert("There was an error fetching server data. Please alert the systems administrator");
                        }
                    });
                }
            });
        } catch(Exception){
            alert("The following error was reported when processing server data: "+ Exception +". Please alert the systems administrator");
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
        updateGlobalCart: updateGlobalCart,
        getGlobalCounts: getGlobalCounts,
        getCartData: getCartData,
        setCartHistWinFromLocal: setCartHistWinFromLocal,
        setLocalFromCartHistWin: setLocalFromCartHistWin,
        updateLocalCartAfterSessionChng: updateLocalCartAfterSessionChng,
        updateTableCountsAndGlobalCartCounts: updateTableCountsAndGlobalCartCounts,
        refreshCartAndFiltersFromScratch: refreshCartAndFiltersFromScratch,
        updateCartTable: updateCartTable
    };
});
