require([
    'jquery',
    'base',
    'jqueryui',
    'bootstrap',
    'session_security',
    'tablesorter'
], function ($, base) {

    var $tabs = $('#comparison-tabs')

    $.ajax({
        type: 'GET',
        url: 'cohort/get_compares',
        success: function(compares) {
            $.each(compares, function(i, compare) {
                $tabs.append(
                    '<li role="presentation" class="active">\n' +
                    '     <a href="#label-comp-tab" id="comp-tab" role="tab" data-toggle="tab"\n' +
                    '         data-toggle-type="comparison">Label\n' +
                    '          Comparison</a>\n' +
                    '      <div class="dropdown">\n' +
                    '          <a class="dropdown-toggle comparison-drop" id="dropdown-label" role="button"\n' +
                    '             data-toggle="dropdown"><i\n' +
                    '                  class="fa fa-caret-down"></i></a>\n' +
                    '          <ul class="dropdown-menu">\n' +
                    '              <li role="menuitem"><a data-toggle="modal" role="button" data-target="">Edit details</a>\n' +
                    '              </li>\n' +
                    '              <li role="menuitem"><a data-toggle="modal" role="button" data-target="">Delete</a></li>\n' +
                    '          </ul>\n' +
                    '      </div>\n' +
                    '  </li>'
                )
            });
        }
    });

    // const sidebar = document.querySelector('.sidebar');
    // const mainContent = document.querySelector('.comp-body-content');
    // document.querySelector('#sidebar-but').onclick = function () {
    //     sidebar.classList.toggle('sidebar_small');
    //     mainContent.classList.toggle('comp-body-content_large')
    // }

    $(document).ready(function () {

    $('#sidebarCollapse').on('click', function () {
        $('#sidebar').toggleClass('active');
    });

});

});










