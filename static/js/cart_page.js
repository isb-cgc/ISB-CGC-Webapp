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
], function(cartutils, tables,$, tippy, _, base) {

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


     $(document).ready(function () {
         projcnts = JSON.parse(document.getElementById('projcnts').textContent);

         window.selProjects=[];
         window.projstudymp = {};
         for (var j=0;j<projcnts.length;j++){
             var row= projcnts[j]
             var  colid = row['val'];
             var mxstudies = row['unique_study'];
             var mxseries = row['unique_series']
             window.selProjects[colid]={'mxseries': mxseries, 'mxstudies': mxstudies}

         }
         window.pageid = Math.random().toString(36).substr(2, 8);
         ajaxtriggered = true;
         window.cartedits = false;
         window.cartHist = new Array();
         window.studymp = new Object();
         window.seriesdel = new Array();
         cartutils.updateLocalCartAfterSessionChng()
         cartutils.setCartHistWinFromLocal();
         window.updatePartitionsFromScratch();
        var ret =cartutils.formcartdata();
        window.partitions = ret[0];
        window.filtergrp_lst = ret[1];
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

          cartutils.updateCartTable();


    });


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
            cartutils.updateCartTable();
        }
    }

    $(document).ajaxStart(function(){
        $('.spinner').show();
    });

    $(document).ajaxStop(function(){
        $('.spinner').hide();
    });

    window.onbeforeunload = function(){
        //sessionStorage.setItem("cartHist", JSON.stringify(window.cartHist));
        cartutils.setLocalFromCartHistWin();

        //localStorage.setItem("cartDetails",JSON.stringify(window.cartDetails));
        //sessionStorage.setItem("glblcart", JSON.stringify(window.glblcart));
        localStorage.setItem("src", "cart_page");
        //localStorage.setItem("cartedits", window.cartedits.toString());
        //localStorage.setItem("studymp", JSON.stringify(window.studymp));
        //localStorage.setItem("seriesdel", JSON.stringify(window.seriesdel));

        //sessionStorage.setItem("cartDetails", windowcartDetails);

    }

});
