// require.config({
//     baseUrl: STATIC_FILES_URL+'js/',
//     paths: {
//         jquery: 'libs/jquery-1.11.1.min',
//         bootstrap: 'libs/bootstrap.min',
//         jqueryui: 'libs/jquery-ui.min',
//         session_security: 'session_security/script',
//         underscore: 'libs/underscore-min',
//         base: 'base'
//     },
//     shim: {
//         'bootstrap': ['jquery'],
//         'jqueryui': ['jquery'],
//         'session_security': ['jquery'],
//         'underscore': {exports: '_'}
//     }
// });

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'underscore',
    'base'
], function($, jqueryui, bootstrap, session_security, _, base) {

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

    // Resets forms in modals on cancel. Suppressed warning when leaving page with dirty forms
    // Hides unallowed-chars warning
    $('.modal').on('hide.bs.modal', function() {
        $(this).find('.unallowed-chars-wb-alert').hide();
        var form = $(this).find('form')[0];
        if(form){
            form.reset();
        }
    });
});