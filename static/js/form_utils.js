require.config({
    baseUrl: STATIC_FILES_URL+'js/',
    paths: {
        jquery: 'libs/jquery-3.5.1',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        underscore: 'libs/underscore-min',
        base: 'base'
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'underscore': {exports: '_'}
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'underscore',
    'base'
], function($, jqueryui, bootstrap, _, base) {

    $('form.new-workbook input[type="submit"]').on('click',function(e){
        var form = $(this).parents('.new-workbook');
        var name = form.find('.new-workbook-name').val();
        var unallowed_chars_alert = $(this).parents('.new-workbook-modal').find('.unallowed-chars-wb-alert');
        unallowed_chars_alert.hide();

        // Do not allow white-space only names
        if(name.match(/^\s*$/)) {
            form.find('.new-workbook-name').prop('value','');
            e.preventDefault();
            return false;
        }

        var unallowed = name.match(base.blacklist);

        if(unallowed) {
            unallowed_chars_alert.find('.unallowed-chars-wb').text(unallowed.join(", "));
            unallowed_chars_alert.show();
            event.preventDefault();
            return false;
        }
    });
});