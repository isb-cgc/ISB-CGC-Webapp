require.config({
    baseUrl: STATIC_FILES_URL+'js/',
    paths: {
        jquery: 'libs/jquery-3.7.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        underscore: 'libs/underscore-min',
        base: 'base',
        text: 'libs/require-text',
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'underscore': {exports: '_'},
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'underscore',
    'base',
], function($, jqueryui, bootstrap, _, base) {
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