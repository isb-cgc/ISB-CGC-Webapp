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
    'utils',
    'assetscore',
    'assetsresponsive',
    'tablesorter'
], function(filterutils, $, jqueryui, tippy, bootstrap, session_security, _, utils) {


});

// Return an object for consts/methods used by most views
define(['filterutils','jquery', 'tippy', 'utils' ], function(filterutils, $, tippy, utils) {


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

                       if (studyid in window.glblcart)
                       {
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
           }
         else{
             if (cartAdded){

                 window.glblcart[studyid]=new Object();
                 window.glblcart[studyid]['all'] = true;
                 window.glblcart[studyid]['sel'] = new Set();

             }
             else{
                 if (studyid in window.glblcart){
                     delete(window.glblcart[studyid]);
                 }
             }

        }
       }
    }

    //calculate the tot # of projects, cases, studies, and series in the cart
    const getGlobalCounts= function(){
        tots=[0,0,0,0]
        for (projid in window.projstudymp){
            for (studyid in window.projstudymp[projid]){
                if (studyid in window.glblcart){
                    tots[0]++;
                    break;;

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
            }
            else{
                tots[3]=tots[3]+window.glblcart[studyid]['sel'].size;
            }
        }
        return tots;
    }


// remove all items from the cart. clear the glblcart, carHist, cartDetails
    window.resetCart = function(){
        window.cart= new Object();
        window.glblcart = new Object();
        window.cartHist = new Array();

        window.cartStep=1;

        window.partitions= new Array();

        let cartSel = new Object();
        var parsedFiltObj = filterutils.parseFilterObj();;
        cartSel['filter']= parsedFiltObj;
        cartSel['selections']= new Array();
        cartSel['partitions']= new Array();
        window.cartHist.push(cartSel);
        //sesssionStorage.setItem("cartHist",JSON.stringify(window.cartHist));
        window.partitions = new Array();
        window.cartStep=0
        window.cartDetails = 'Current filter definition is '+JSON.stringify(parsedFiltObj)+'\n\n'
        window.cartStep++;

         window.updateTableCounts(1);
         var gtotals = [0,0,0,0];
            var content = gtotals[0].toString()+" Collections, "+gtotals[1]+" Cases, "+gtotals[2]+" Studies, and "+gtotals[3]+" Series in the cart"
            tippy('.cart-view', {
                           interactive: true,
                           allowHTML:true,
                          content: content
                        });
            $('#cart_stats').html(content) ;

          $('#cart_stats').addClass('notDisp');
          $('#export-manifest-cart').attr('disabled','disabled');
          $('#view-cart').attr('disabled','disabled');

    }

    // show the history of cart related selections (filters and cart buttons)
    $('.cart-modal-button').on('click', function(){
        detsArr = window.cartDetails.split('\n\n');
        var str='<ol type="1" class="nav navbar-nav navbar-left">';
        var ii=0;
        for (var i=0;i<detsArr.length;i++){
            if (detsArr[i].length>0) {
                str = str + '<li class="navbar-link navbar-item cartlist">' + ii.toString() + '. &nbsp;' + detsArr[i] + '</li>'
                 ii++;
            }
        }
        str=str+'</ol>'
        $('#cart_details').html(str);

            $('#cart-details-modal').modal('show');

    })

    //as user makes selections in the tables, record the selections in the cartHist object. Make new partitions from the selections
    const updateCartSelections = function(newSel){
        var curInd = window.cartHist.length - 1;
        var selections = window.cartHist[curInd]['selections'];
        var adding = newSel['added'];
        var selection = newSel['sel'];
        var selectionCancelled = false;
        var redundant = false;
        var newHistSel = new Array();
        for (var i=0;i<selections.length;i++) {
            var curselection = selections[i]['sel'];
            var curAdded = selections[i]['added'];

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

            }
            else{
                newHistSel.push(selections[i]);
            }

        }

        newHistSel.push(newSel);

        window.cartHist[curInd]['selections'] =  newHistSel;
        window.cartHist[curInd]['partitions'] = mkOrderedPartitions(window.cartHist[curInd]['selections']);
    }

    // make partitions from table selections
    mkOrderedPartitions = function(selections){
        parts=new Array();

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
               }
               else if (eql && (nxtpart.length==curpart.length)){
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
            input.name = "filtergrp_list";
            input.value = JSON.stringify(filterSets);
            form.appendChild(input);
            var input = document.createElement('input');
            input.name = "partitions";
            input.value = JSON.stringify(partitions);
            form.appendChild(input);
            document.body.appendChild(form)
            form.submit();

    };

     window.updatePartitionsFromScratch =function(){
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
    }

    //looking across the history of cart selections, create one set of exclusive partitions of the imaging data
    updateGlobalPartitions= function(newparts){
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
               }
                else if (eql && (nxtpart.length==curpart.length)){
                 inserted = true;
                 break;
               }

                else if (eql && (nxtpart.length==curpart.length+1)){

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
    addNewPartition= function(part, pos, basefilt) {
        newPart = new Object();
        newPart['not'] = new Array();
        newPart['id'] = [...part]
        newPart['filt'] = basefilt;
        newPart['null'] = true;
        if (pos > -1) {
           window.partitions.splice(pos, 0, newPart);
         }
        else{
            window.partitions.push(newPart);
        }
    }


    // update the filter array for each partition
    refilterGlobalPartitions= function(cartHist,cartnum){

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

    }

    const fixpartitions = function(){
      var isempty = new Array();
      for (var i=0;i<window.cartHist.length;i++){
          if (Object.keys(window.cartHist[i].filter).length==0){
              isempty.push(true);
          }
          else{
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
    createSolrString = function(filtStringA){
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
                    }
                    else{
                        solrA.push(curPartStr);
                    }
                }
            }
        }
        solrA = solrA.map(x => '('+x+')');
       var solrStr = solrA.join(' OR ')
        return solrStr
    }
    parsePartitionAttStrings = function(filtStringA, partition){
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
    parsePartitionStrings = function(partition){
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



    return {
       mkOrderedPartitions: mkOrderedPartitions,
        formcartdata: formcartdata,
        updateCartSelections: updateCartSelections,
        updateGlobalCart: updateGlobalCart,
        getGlobalCounts: getGlobalCounts


    };
});
