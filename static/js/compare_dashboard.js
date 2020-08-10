require([
    'jquery',
    'base',
    'jqueryui',
    'bootstrap',
    'session_security',
    'tablesorter'
], function ($, base) {


    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.comp-body-content');
    document.querySelector('#sidebar-but').onclick = function () {
        sidebar.classList.toggle('sidebar_small');
        mainContent.classList.toggle('comp-body-content_large')
    }

});










