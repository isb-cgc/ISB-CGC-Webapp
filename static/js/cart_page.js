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
        jquery: 'libs/jquery-3.7.1.min',
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
        cartutils: 'cartutils',
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
        'jquerydt': ['jquery'],
        'tablesorter': ['jquery'],
        'underscore': {exports: '_'},
        'session_security': ['jquery'],
        'cartutils': ['jquery'],
        'exportmanifest':['jquery']
    }
});


require([
    'cartutils',
    'tables',
    'jquery',
    'tippy',
    'underscore',
    'base', // This must ALWAYS be loaded!
    'jquerydt',
    'jqueryui',
    'bootstrap'
], function(cartutils, tables, $, tippy, _, base) {

     var ajaxtriggered = false;





    window.resetCartPageView = function(){
        window.cartHist = new Array();
        window.updatePartitionsFromScratch();
        let ret =cartutils.formcartdata();
        window.partitions = ret[0];
        window.filtergrp_lst = ret[1];
        //cartutils.updateCartTable([],[]);
        window.glblcart = new Object();
        //window.cartPgLocator = new Array();
        //window.seriesTalley = new Array();

        localStorage.removeItem("cartHist")
        window.location = window.location.protocol+'//'+window.location.host+'/explore/';
        //history.back();
    }

    tippy.delegate('#cart-table', {
        content: 'Copied!',
        theme: 'blue',
        placement: 'right',
        arrow: true,
        interactive: true, // This is required for any table tooltip to show at the appropriate spot!
        target: '.copy-this-table',
        onShow(instance) {
            setTimeout(function() {
                instance.hide();
            }, 1000);
        },
        trigger: "click",
        maxWidth: 85
    });

    setCartDetailsModal = function(){
        var contentArray= [];
        for (var i=0;i< window.cartHist.length;i++){
            var cartDetail = window.cartHist[i];
            var filter = JSON.stringify(cartDetail.filter);
            var selections = cartDetail.selections;
            if (selections.length>0){
                contentArray.push('Set filter definition set to: '+filter);
                for (var j=0;j<selections.length;j++){
                    var selectext=""
                    var selec = selections[j]
                    if (selec.sel.length ==4){
                        if (selec.added) {
                            selectext += "<li>Added the series " +selec.sel[3] +" from collection " + selec.sel[0] +", case "+selec.sel[1]+", study "+selec.sel[2];
                        }
                        else{
                           selectext += "<li>Removed the series " +selec.sel[3] +" from collection " + selec.sel[0] +", case "+selec.sel[1]+", study "+selec.sel[2];
                        }

                    }
                    else {
                        if (selec.added) {
                            selectext += "<li>Added series matching the filter from collection " + selec.sel[0]
                        } else {
                            selectext += "<li>Removed series matching the filter from collection " + selec.sel[0]
                        }
                        if (selec.sel.length > 1) {
                            selectext += ", case " + selec.sel[1]
                        }
                        if (selec.sel.length > 2) {
                            selectext += ", study " + selec.sel[2]
                        }
                    }

                 contentArray.push(selectext);
                }
            }
        }
        content="<ol>"+contentArray.join('\n')+"</ol>";
        $('#cart-description-modal').find('.modal-body').html(content);


    }

    /*
    $('#export-manifest-cart').on('click', function(){
        cartutils.getCartData(0,window.mxseries,"StudyInstanceUID", "SeriesInstanceUID")
    })
    */

/*
     $('#download-s5cmd').on('click', function(e) {
        exportmanifest.download_manifest("s5cmd", $(this), e)
    });
*/
     $(document).ready(function () {

         let navelem = $("a[href='/explore/']");
         navelem.addClass('navexplore');
         if (document.referrer.includes('explore')){
             navelem.attr('href', 'javascript:window.history.back()')
         }


         window.mxseries = parseInt(JSON.parse(document.getElementById('mxseries').textContent));
         window.mxstudies = parseInt(JSON.parse(document.getElementById('mxstudies').textContent));
         window.cartHist = JSON.parse(document.getElementById('carthist').textContent);

         setCartDetailsModal();

         window.updatePartitionsFromScratch();
         var ret =cartutils.formcartdata();
         window.partitions = ret[0];
         window.filtergrp_lst = ret[1];

         window.pageid = Math.random().toString(36).substr(2, 8);
         ajaxtriggered = true;

        // localStorage no longer used in keeping cart data
        /*
        if (!(localStorage.getItem('cartNumStudies')==null)){
           window.numStudies = parseInt(localStorage.getItem('cartNumStudies'));
        }
        else{
            window.numStudies = 0;
        }
        if (!(localStorage.getItem('cartNumSeries')==null)){
           window.numStudies = parseInt(localStorage.getItem('cartNumSeries'));
        }
        else{
            window.numSeries = 0;
        }
        window.numSeries = parseInt(localStorage.getItem('cartNumSeries'));
         */

        cartutils.updateCartTable();


    });

/*
    window.onpageshow = function (){

        //alert('show');
        if (!ajaxtriggered) {
            window.cartedits = false;
            window.cartHist = new Array();
            cartutils.setCartHistWinFromLocal()
            if ("cartDetails" in sessionStorage) {
                window.cartDetails = JSON.parse(sessionStorage.getItem("cartDetails"));
            }
            window.updatePartitionsFromScratch();
            var ret = cartutils.formcartdata();
            window.partitions = ret[0];
            window.filtergrp_lst = ret[1];
           // cartutils.updateCartTable();
        }
    }
*/
    $(document).ajaxStart(function(){
        $('.spinner').show();
    });

    $(document).ajaxStop(function(){
        $('.spinner').hide();
    });



});
