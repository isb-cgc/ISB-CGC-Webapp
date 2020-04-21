/**
 *
 * Copyright 2017, Institute for Systems Biology
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
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        underscore: 'libs/underscore-min',
        tokenfield: 'libs/bootstrap-tokenfield.min',
        base: 'base',
        bq_export: 'export_to_bq',
        imagesearch: 'image_search',
        gcs_export: 'export_to_gcs'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'tokenfield': ['jquery', 'jqueryui'],
        'underscore': {exports: '_'},
        'base': ['jquery', 'jqueryui', 'bootstrap', 'underscore'],
        'imagesearch': ['plotly']
    }
});

require([
    'jquery',
    'base',
    'underscore',
    'jqueryui',
    'bootstrap',
    'tokenfield',
    'bq_export',
    'gcs_export',
     'imagesearch',
], function ($, base, _, imagesearch) {

    // For manaaging filter changes
    var UPDATE_PENDING = false;
    var SUBSEQUENT_DELAY = 600;
    var update_displays_thread = null;
    var UPDATE_QUEUE = [];

    var SELECTED_FILTERS = {
        'all': {
            'HG19': {},
            'HG38': {}
        },
        'igv': {
            'HG19': {},
            'HG38': {}
        },
        'camic': {
            'HG19': {}
        },
        'dicom': {
            'HG19': {}
        },
        'pdf': {
            'HG19': {}
        }
    };
        
    var file_list_total = 0;

    // File selection storage object
    // The data-type/name input checkbox attritbutes in the form below must be reflected here in this map
    // to properly convey the checked list to IGV


    $('.dataTables_goto_page').on('click', '.goto-page-button', function () {
        var page_no_input = $(this).siblings('.goto-page-number').val();
        if (page_no_input == "")
            return;
        var page = parseInt(page_no_input);
        var max_page_no = parseInt($(this).siblings('.goto-page-number').attr('max'));
        if (page > 0 && page <= max_page_no) {
            changePage(this, page);
        }
        else {
            base.showJsMessage("warning",
                "Page number you have entered is invalid. Please enter a number between 1 and "+max_page_no, true);
            $('#placeholder').hide();
        }
    });

        $('.dataTables_goto_page').on('click', '.prev-page', function () {
             curPage = $(this).parent().data('curpage');
             if(curPage>1){
                 changePage(this,(curPage-1));
             }
        });

        $('.dataTables_goto_page').on('click', '.next-page', function () {
             curPage = $(this).parent().data('curpage');
             var max_page_no = parseInt($(this).parent().parent().find('.goto-page-number').attr('max'));
             if(curPage<max_page_no){
                 changePage(this,(curPage+1));
             }
        });

        $('.paginate_button_space').on('click', '.numeric_button',  function () {
             nextPage = parseInt($(this).text());
             changePage($(this).parent(),nextPage);
        });



    var changePage = function(paginateElem, pageNo){
         var fpp = $(paginateElem).parent().parent().find('.files-per-page-select').data('fpp');
         curIndex= fpp*(pageNo-1);
         $(paginateElem).parent().parent().find('.goto-page-number').val("");
         //$(paginateElem).parent().parent().find('.dataTables_goto_page').data('curpage',pageNo);
         var tableElem = $(paginateElem).parent().parent().parent().find('tbody');
         window.resetTableControls(tableElem, true, curIndex);
    }





    // change no of entries per page
    $('.table-panel').on('change', '.files-per-page', function () {
        var old_fpp = $(this).find('.files-per-page-select').data('fpp');
        var new_fpp = $(this).find('.files-per-page-select :selected').val();
        $(this).find('.files-per-page-select').data('fpp',new_fpp);
        var tableElem = $(this).parent().parent().find('tbody');
        var rowPos = tableElem.find('tr').map(function(){ return this.offsetTop}  );
         var curScrollPos = tableElem[0].scrollTop;
         var scrollPosInd = Array.from(rowPos.map(function(){return ((this<=curScrollPos)? 0:1 )  })).indexOf(1);

       //var curpage = $(this).parent().parent().find('.dataTables_goto_page').data('curpage');
       var new_page_no = parseInt( scrollPosInd/new_fpp ) + 1;
       $(this).parent().parent().find('.dataTables_goto_page').data('curpage',new_page_no);
       window.resetTableControls(tableElem, false, scrollPosInd);


    });

    /* $('.table-panel').on('click', '.goto-page-button', function () {
        var new_page_no = $(this).parent().find('.goto-page-number').val();
        $(this).parent().find('.goto-page-number')[0].innerHTML='';
        $(this).parent().find('.dataTables_goto_page').data('curpage',new_page_no);

    }); */










    // change column sorting
    $('.data-tab-content').on('click', '.sortable_table th:not(.sorting_disabled)', function () {
        var this_tab = $(this).parents('.data-tab').data('file-type');
        var column = $(this).attr("columnId");
        var order = $(this).is('.sorting, .sorting_desc') ? 0 : 1;
        tab_sort_column[this_tab] = [column, order];
        update_table(this_tab, false);
    });

    // Show more/less links on categories with >6 fiilters
   /* $('.data-tab-content').on('click', '.show-more', function() {
        $(this).parent().siblings('li.extra-values').show();
        $(this).parent().siblings('.less-checks').show();
        $(this).parent().hide();
    }); */
    $('.data-tab-content').on('click', '.show-less', function() {
        $(this).parent().siblings('li.extra-values').hide();
        $(this).parent().siblings('.more-checks').show();
        $(this).parent().hide();
    });

    $('.data-tab-content').on('change','.build', function(){
        var this_tab = $(this).parents('.data-tab').data('file-type');
        $('#'+this_tab+'-files').find('.filter-build-panel').hide();
        $('#'+this_tab+'-filter-panel-'+$(this).find(':selected').val()).show();

        if(this_tab == 'igv') {
            // Remove any selected files not from this build
            var new_build = $('#'+this_tab+'-files').find('.build :selected').val();
            var selCount = Object.keys(selIgvFiles.gcs_bam).length;
            for (var i in selIgvFiles.gcs_bam) {
                if (selIgvFiles.gcs_bam.hasOwnProperty(i)) {
                    if (selIgvFiles.gcs_bam[i].build !== new_build) {
                        delete selIgvFiles.gcs_bam[i];
                        $('.filelist-panel input[value="' + i + '"').prop('checked', false);
                    }
                }
            }
            if (Object.keys(selIgvFiles.gcs_bam).length !== selCount) {
                $('#selected-files-igv').tokenfield('setTokens', selIgvFiles.toTokens());
                update_on_selex_change();
            }
            $('#igv-form-build').attr("value",new_build);
            // Prevent users from selecting igv files during loading time
            $('.filelist-panel input.igv.accessible[type="checkbox"]').attr('disabled',true);
        }
        update_displays(this_tab);
    });

    function update_filters(checked) {
        var type_tab = checked.parents('.data-tab.active')[0];
        var active_tab = $(type_tab).data('file-type');
        var build = $('#'+active_tab+'-files').find('.build :selected').val();
        SELECTED_FILTERS[active_tab][build] = {};

        $(type_tab).find('div[data-filter-build="'+build+'"] input[type="checkbox"]:checked').each(function(){
            if(!SELECTED_FILTERS[active_tab][build][$(this).data('feature-name')]) {
                SELECTED_FILTERS[active_tab][build][$(this).data('feature-name')] = [];
            }
            SELECTED_FILTERS[active_tab][build][$(this).data('feature-name')].push($(this).data('value-name'));
        });
        tab_page[active_tab] = 1;
    }

    function enqueueUpdate(active_tab){
        UPDATE_QUEUE.push(function(){
            update_displays(active_tab);
        });
    }

    function dequeueUpdate(){
        if(UPDATE_QUEUE.length > 0) {
            UPDATE_QUEUE.shift()();
        }
    }

    function pagination(c, m) {
        var current = parseInt(c),
            last = m,
            delta = 2,
            left = current - delta,
            right = current + delta + 1,
            range = [],
            rangeWithDots = [],
            l;
        for (var i = 1; i <= last; i++) {
            if (i == 1 || i == last || i >= left && i < right) {
                range.push(i);
            }
        }
        for(var i in range){
            if (l) {
                if (range[i] - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (range[i] - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(range[i]);
            l = range[i];
        }
        return rangeWithDots;
    }

    var update_displays = function(active_tab) {
        // If a user has clicked more filters while an update was going out, queue up a future update and return
        if(UPDATE_PENDING) {
            // We only need to queue one update because our updates don't pull the filter set until they run
            if(UPDATE_QUEUE.length <= 0) {
                enqueueUpdate(active_tab);
            }
            return;
        }

        // If there's an update ready to fire and waiting for additional input, clear it...
        (update_displays_thread !== null) && clearTimeout(update_displays_thread);

        // ...and replace it with a new one
        update_displays_thread = setTimeout(function(){
            var build = $('#'+active_tab+'-files').find('.build :selected').val();
            var files_per_page = tab_files_per_page[active_tab];
            var url = ajax_update_url[active_tab] +
                '?files_per_page=' +files_per_page +
                (active_tab != 'camic' && active_tab != 'dicom'  ? '&build='+build : '') +
                '&sort_column='+ tab_sort_column[active_tab][0] +'&sort_order='+tab_sort_column[active_tab][1];
            if(tab_case_barcode[active_tab] && Object.keys(tab_case_barcode[active_tab][build]).length > 0){
                url += '&case_barcode='+ encodeURIComponent(tab_case_barcode[active_tab][build]);
            }
            if(SELECTED_FILTERS[active_tab] && Object.keys(SELECTED_FILTERS[active_tab][build]).length > 0) {
                url += '&filters=' + encodeURIComponent(JSON.stringify(SELECTED_FILTERS[active_tab][build]));
            }
            UPDATE_PENDING = true;
            $('#'+active_tab+'-files').find('.filelist-panel .spinner i').removeClass('hidden');
            $.ajax({
                type: 'GET',
                url: url,
                success: function(data) {
                    for(var i=0; i <  data.metadata_data_attr.length; i++){
                        var this_attr = data.metadata_data_attr[i];
                        for(var j=0; j < this_attr.values.length; j++) {
                            var this_val = this_attr.values[j];
                            $('#'+active_tab+'-'+data.build+'-'+this_attr.name+'-'+this_val.value).siblings('span.count').html('('+this_val.count+')');
                            $('#'+active_tab+'-'+data.build+'-'+this_attr.name+'-'+this_val.value).attr('data-count',this_val.count);
                        }
                    }
                    update_download_link(active_tab, data.total_file_count);
                    update_table_display(active_tab, data);
                },
                error: function() {

                }
            }).then(
                    function(){
                        UPDATE_PENDING = false;
                        dequeueUpdate();
                    }
                );
            },SUBSEQUENT_DELAY);
    };

    $('.data-tab-content').on('change','.filter-panel input[type="checkbox"]',function(){
        update_filters($(this));
        update_displays($('ul.nav-tabs-files li.active a').data('file-type'));
    });

    // Click events for 'Check All/Uncheck All' in filter categories
    $('.data-tab-content').on('click', '.check-all', function(){
        $(this).parent().parent().siblings('.checkbox').find('input').prop('checked',true);
        update_filters($($(this).parent().parent().siblings('.checkbox').find('input')[0]));
        update_displays($('ul.nav-tabs-files li.active a').data('file-type'));
    });
    $('.data-tab-content').on('click', '.uncheck-all', function(){
        $(this).parent().parent().siblings('.checkbox').find('input').prop('checked',false);
        update_filters($($(this).parent().parent().siblings('.checkbox').find('input')[0]));
        update_displays($('ul.nav-tabs-files li.active a').data('file-type'));
    });

    //browser_tab_load(cohort_id);

    $('.data-tab-content').on('click', '.download-btn', function() {
        var self=$(this);
        var msg = $('#download-in-prog');

        self.attr('disabled','disabled');
        msg.show();

        base.blockResubmit(function() {
            self.removeAttr('disabled');
            msg.hide();
        },$('.filelist-obtain .download-token').val(),"downloadToken");

        if($(this).parents('.data-tab').find('.build :selected').val() == 'HG38'
            && _.find(programs_this_cohort, function(prog){return prog == 'CCLE';})) {
            base.showJsMessage("warning",
                "You have exported a file list for a cohort which contains CCLE samples, with the build set to HG38.<br/>"+
                "Please note that there are no HG38 samples for CCLE, so that program will be absent from the export."
                , true
            );
        }
    });

    $('.data-tab-content').on('hover enter mouseover','.study-uid, .col-filename',function(e){
        $(this).find('.osmisis').show();
    });

    $('.data-tab-content').on('leave mouseout mouseleave','.study-uid, .col-filename',function(e){
        $(this).find('.osmisis').hide();
    });

    // When an export button is clicked, add the filters to that modal's form
    // Note that the export modals will always clear any 'filters' inputs applied to them when hidden/closed
    $('.container').on('click', 'button[data-target="#export-to-bq-modal"], button[data-target="#export-to-gcs-modal"]', function (e) {
        var target_form = $($($(this).data('target')).find('form')[0]);
        var this_tab = $(this).parents('.data-tab');
        var tab_type = this_tab.data('file-type');

        // Clear the previous parameter settings from the export form, and re-add the build
        var build = this_tab.find('.build :selected').val() || null;
        target_form.find('input[name="build"], input[name="filters"]').remove();
        target_form.append(
            '<input class="param" type="hidden" name="build" value="'+build+'" />'
        );
        target_form.append(
            '<input class="param" type="hidden" name="filters" value="" />'
        );

        var filter_param = {};
        switch(tab_type) {
            case "igv":
                filter_param = {"data_format": ["BAM"]};
                break;
            case "dicom":
                filter_param = {"data_type": ["Radiology image"]};
                break;
            case "camic":
                filter_param = {"data_type": ["Diagnostic image", "Tissue slide image"]};
                break;
            case "pdf":
                filter_param = {"data_format": ["PDF"]};
        }

        if(Object.keys(SELECTED_FILTERS[tab_type][build]).length > 0) {
            Object.assign(filter_param, SELECTED_FILTERS[tab_type][build]);
        }
        if(tab_case_barcode[tab_type] && Object.keys(tab_case_barcode[tab_type][build]).length > 0) {
            filter_param['case_barcode'] = tab_case_barcode[tab_type][build];
        }

        if(Object.keys(filter_param).length>0){
            target_form.find('input[name="filters"]').attr(
                'value',JSON.stringify(filter_param)
            );
        }
        else{
            target_form.find('input[name="filters"]').remove();
        }

        if(this_tab.find('.build :selected').val() == 'HG38' && _.find(programs_this_cohort, function(prog){return prog == 'CCLE';})) {
            base.showJsMessage(
                "warning",
                "You are exporting a file list for a cohort which contains CCLE samples, with the build set to HG38. "
                +"Please note that there are no HG38 samples for CCLE, so that program will be absent from the export.",
                false,
                $($(this).data('target')).find('.modal-js-messages')
            );
        }
    });

    function formatFileSize(bytes) {
        if(bytes == 0) return '0 B';
        var k = 1000,
            dm = 1,
            sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
            i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

});
