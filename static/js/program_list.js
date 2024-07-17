/**
 *
 * Copyright 2017-2024, Institute for Systems Biology
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

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'underscore',
    'base',
], function($, jqueryui, bootstrap, session_security, _, base) {
    'use strict';

    $('.project').css('display', 'none').removeClass('hidden');
    $('.row-expand-button').on('click', function (e) {
        var $this = $(this),
            studies = $this.closest('table').find('.project');

        $this.toggleClass('is-expanded');
        studies.filter('[data-program-id="' + $this.closest('tr').data('program-id') + '"]')
            .fadeToggle(300);

    })

        // Resets forms in modals on cancel. Suppressed warning when leaving page with dirty forms
    $('.modal').on('hide.bs.modal', function() {
        var forms = $(this).find('form');
        if(forms.length)
            _.each(forms, function (form) {
                form.reset();
            });
    }).find('form').on('submit', function (e) {
        e.preventDefault();
        e.stopPropagation();

        var $this = $(this),
            fields = $this.serialize();

        $this.find('.btn').addClass('btn-disabled').attr('disabled', true);
        $.ajax({
            url: $this.attr('action'),
            data: fields,
            method: 'POST'
        }).then(function () {
            $this.closest('.modal').modal('hide');
            if($this.data('redirect')) {
                window.location = $this.data('redirect');
            } else {
                window.location.reload();
            }
        }, function () {
            base.showJsMessage('danger','There was an error deleting that project. Please reload and try again, or try again later.',true);
        })
        .always(function () {
            $this.find('.btn').removeClass('btn-disabled').attr('disabled', false);
        });
    });
});