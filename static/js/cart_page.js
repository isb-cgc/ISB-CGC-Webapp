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

     const updateCartTable = function(studyidarr, seriesidarr, offset) {
         var nonViewAbleModality= new Set(["PR","SEG","RTSTRUCT","RTPLAN","RWV", "XC"])
        var slimViewAbleModality=new Set(["SM"])
        if ($('.cart-wrapper').find('.dataTables_controls').length>0){
            var pageRows = parseInt($('.cart-wrapper').find('.dataTables_length select').val());
            var pageCur = parseInt($('.cart-wrapper').find('.dataTables_paginate').find('.current').text());
        }
        else {
            var pageRows = 10;
            var pageCur=1;
        }
        $('#cart-table').DataTable().destroy();
        try {
            $('#cart-table').DataTable({
                "iDisplayLength": pageRows,
                "displayStart":(pageCur-1)*pageRows,
                "autoWidth": false,
                "dom": '<"dataTables_controls"ilp>rt<"bottom"><"clear">',
                "order": [[1, "asc"]],

                "createdRow": function (row, data, dataIndex) {
                    $(row).attr('id', 'series_' + data['SeriesInstanceUID'])
                    $(row).attr('data-studyid', data['StudyInstanceUID']);
                    $(row).attr('data-caseid', data['PatientID']);
                    $(row).attr('data-projectid', data['collection_id'][0]);
                    $(row).find('input').on('click', function(event){
                        var collection_id = data['collection_id'][0];
                        var caseid = data['PatientID'];
                        var studyid = data['StudyInstanceUID'];
                        var seriesid = data['SeriesInstanceUID'];

                        if (!window.cartedits){
                            let cartSel = new Object();
                        cartSel['filter']= {};
                        cartSel['selections']= new Array();
                        cartSel['partitions']= new Array();
                        window.cartHist.push(cartSel);
                        window.cartedits =true;
                        }
                        var newSel = new Object();
                        newSel['added'] = false;
                        newSel['sel'] = [collection_id, caseid, studyid, seriesid];
                       //window.cartHist[curInd]['selections'].push(newSel);
                        cartutils.updateCartSelections(newSel);

                        window.updatePartitionsFromScratch();
                        var ret =cartutils.formcartdata();
                        window.partitions = ret[0];
                        window.filtergrp_lst = ret[1];
                        window.seriesdel.push(seriesid);

                        window.cartDetails = window.cartDetails+'Removed SeriesInstanceUID = "'+seriesid.toString()+'" from the cart\n\n';
                        updateCartTable([studyid], [seriesid]);
                     });
                    },

                "columnDefs": [],
                "columns": [
                    {
                        "type": "html", "orderable": false, "data": "PatientID", render: function (data) {
                            return '<input type="checkbox">';
                        }
                    },
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
                                ' <a class="copy-this-table" role="button" content="' + data +
                                '"  title="Copy Study ID to the clipboard"><i class="fa-solid fa-copy"></i></a>';
                        }
                    },


                    {
                        "type": "text", "orderable": true, data: 'SeriesInstanceUID', render: function (data) {
                            return pretty_print_id(data) +
                                ' <a class="copy-this-table" role="button" content="' + data +
                                '"  title="Copy Series ID to the clipboard"><i class="fa-solid fa-copy"></i></a>';
                        }
                    },
                    {
                    "type": "html",
                    "orderable": false,
                    data: 'SeriesInstanceUID',
                    render: function (data, type, row) {
                        var coll_id="";
                        if (Array.isArray(row['collection_id'])){
                            coll_id=row['collection_id'][0];
                        } else {
                            coll_id=row['collection_id']
                        }
                         if ( (Array.isArray(row['Modality']) && row['Modality'].some(function(el){
                            return nonViewAbleModality.has(el)
                        }) ) || nonViewAbleModality.has(row['Modality']) )   {
                            let tooltip = (
                                row['Modality'] === "XC" || (Array.isArray(row['Modality']) && row['Modality'].includes("XC"))
                            ) ? "not-viewable" : "no-viewer-tooltip";
                            return `<a href="/" onclick="return false;"><i class="fa-solid fa-eye-slash ${tooltip}"></i>`;
                        } else if (  ( Array.isArray(row['Modality']) && row['Modality'].some(function(el){
                            return slimViewAbleModality.has(el)}
                        ) ) || (slimViewAbleModality.has(row['Modality']))) {
                            return '<a href="' + SLIM_VIEWER_PATH + row['StudyInstanceUID'] + '/series/' + data +
                                '" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-eye"></i>'
                        } else {
                            let v2_link = '<a href="' + OHIF_V2_PATH + row['StudyInstanceUID'] + '?SeriesInstanceUID=' +
                                data + '" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-eye"></i>';
                            let v3_link = OHIF_V3_PATH + "=" + row['StudyInstanceUID'] + '&SeriesInstanceUID=' + data;
                            let volView_link = VOLVIEW_PATH + "=[s3://" + row['aws_bucket'] + '/'+row['crdc_series_uuid']+']"';
                            return v2_link +
                                '<div class="dropdown viewer-toggle">' +
                                '<a id="btnGroupDropViewers" class="dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true"><i class="fa-solid fa-caret-down"></i></a>' +
                                '<ul class="dropdown-menu viewer-menu" aria-labelledby="btnGroupDropViewers">' +
                                '<li><a href="'+v3_link+'" target="_blank" rel="noopener noreferrer">OHIF v3</a></li>' +
                                '<li><a href="'+volView_link+'" target="_blank" rel="noopener noreferrer">VolView</a></li>' +
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
                    var ndic = {'filtergrp_lst': JSON.stringify(window.filtergrp_lst), 'partitions': JSON.stringify(window.partitions)}
                    ndic['offset'] = request.start
                    ndic['limit'] = request.length+1;
                    ndic['studyidarr'] = JSON.stringify(studyidarr);
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
                            if ("studymp" in data){
                                var mp = data["studymp"]

                                for (var studyid in data["studymp"]) {
                                   window.studymp[studyid] = data["studymp"][studyid];
                                }
                            }
                             callback({
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
                }
            })
        }
        catch(Exception){
            alert("The following error was reported when processing server data: "+ Exception +". Please alert the systems administrator");
        }


    }

     const pretty_print_id = function (id) {
        var newId = id.slice(0, 8) + '...' + id.slice(id.length - 8, id.length);
        return newId;
    }

    window.resetCartPageView = function(){
        window.cartHist = new Array();
        window.updatePartitionsFromScratch();
        var ret =cartutils.formcartdata();
        window.partitions = ret[0];
        window.filtergrp_lst = ret[1];
        updateCartTable([],[]);
        sessionStorage.setItem("cartcleared", "true")
        history.back();
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
        ajaxtriggered= true;
        window.cartedits=false;
        window.cartHist = new Array();
        window.studymp = new Object();
        window.seriesdel = new Array();
        if ("cartHist" in sessionStorage){
            window.cartHist= JSON.parse(sessionStorage.getItem("cartHist"));
           }
        if ("cartDetails" in sessionStorage) {
                window.cartDetails = JSON.parse(sessionStorage.getItem("cartDetails"));
            }
        window.updatePartitionsFromScratch();
        var ret =cartutils.formcartdata();
        window.partitions = ret[0];
        window.filtergrp_lst = ret[1];
        updateCartTable([],[]);
    });


    window.onpageshow = function (){

        //alert('show');
        if (!ajaxtriggered) {
            window.cartedits = false;
            window.cartHist = new Array();
            if ("cartHist" in sessionStorage) {
                window.cartHist = JSON.parse(sessionStorage.getItem("cartHist"));
            }
            if ("cartDetails" in sessionStorage) {
                window.cartDetails = JSON.parse(sessionStorage.getItem("cartDetails"));
            }
            window.updatePartitionsFromScratch();
            var ret = cartutils.formcartdata();
            window.partitions = ret[0];
            window.filtergrp_lst = ret[1];
            updateCartTable([],[]);
        }
    }

    $(document).ajaxStart(function(){
        $('.spinner').show();
    });

    $(document).ajaxStop(function(){
        $('.spinner').hide();
    });

    window.onbeforeunload = function(){
        sessionStorage.setItem("cartHist", JSON.stringify(window.cartHist));
        //sessionStorage.setItem("glblcart", JSON.stringify(window.glblcart));
        sessionStorage.setItem("src", "cart_page");
        sessionStorage.setItem("cartedits", window.cartedits.toString());
        sessionStorage.setItem("studymp", JSON.stringify(window.studymp));
        sessionStorage.setItem("seriesdel", JSON.stringify(window.seriesdel));

        //sessionStorage.setItem("cartDetails", windowcartDetails);

    }

});
