require.config({
    baseUrl: STATIC_FILES_URL+'js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        bootstrap: 'libs/bootstrap.min',
        jqueryui: 'libs/jquery-ui.min',
        session_security: 'session_security',
        underscore: 'libs/underscore-min',
        base: 'base',
        text: 'libs/require-text',
    },
    shim: {
        'bootstrap': ['jquery'],
        'jqueryui': ['jquery'],
        'session_security': ['jquery'],
        'underscore': {exports: '_'},
    }
});

require([
    'jquery',
    'jqueryui',
    'bootstrap',
    'session_security',
    'underscore',
    'base'
], function($, jqueryui, bootstrap, session_security, _, base) {
    'use strict';

    // Resets forms in modals on cancel. Suppressed warning when leaving page with dirty forms
 //   $('.modal').on('hide.bs.modal', function() {
  //      var forms = $(this).find('form');
 //       if(forms.length)
 //           _.each(forms, function (form) {
 //               form.reset();
 //           });
 //   }).find('form').on('submit', function (e) {
 //       e.preventDefault();
//        e.stopPropagation();

 //       var $this = $(this),
 //           fields = $this.serialize();

 //       $this.find('.btn').addClass('btn-disabled').attr('disabled', true);
 //       $.ajax({
 //           url: $this.attr('action'),
 //           data: fields,
  //          method: 'POST'
 //       }).then(function () {
 //           $this.closest('.modal').modal('hide');
 //           if($this.data('redirect')) {
 //               window.location = $this.data('redirect');
 //           } else {
 //               window.location.reload();
 //           }
 //       }, function () {
 //           $this.find('.error-messages').append(
 //               $('<p>')
 //                   .addClass('alert alert-danger')
 //                   .text('There was an error deleting that project. Please reload and try again, or try again later.')
 //           );
 //       })
 //       .always(function () {
  //          $this.find('.btn').removeClass('btn-disabled').attr('disabled', false);
  //      });
 //   });

    $('.modal').on('hide.bs.modal', function() {
        var forms = $(this).find('form');
        if (forms.length) {
            _.each(forms, function (form) {
                form.reset();
            });
        }
      })


    var do_submission = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.debug($.getCookie)
        var name = $('#edit-program-name-field').val();
        var desc = $('#edit-program-desc-field').val();

        var unallowed_name = name.match(base.whitelist);
        var unallowed_desc = desc.match(base.whitelist);

        if (unallowed_name || unallowed_desc) {
            var unallowed_all = ""
            if (unallowed_name) {
                unallowed_all += unallowed_name.join(", ");
            }
            if (unallowed_name && unallowed_desc) {
                unallowed_all += ", "
            }
            if (unallowed_desc) {
                unallowed_all += unallowed_desc.join(", ");
            }
            base.showJsMessage('danger',
                "These characters are invalid: " + unallowed_all, true,'#edit-program-js-messages');
            return false;
        } else {
            $('#edit-program-js-messages').empty();
        }

        $(this).find('.btn-primary').addClass('btn-disabled').attr('disabled', true);
        var $this = $(this);

         console.debug("off to ajax")
        var csrftoken = $.getCookie('csrftoken');
        $.ajax({
            type        :'POST',
            url         : $(this).attr('action'),
            dataType    :'json',
            data        : $(this).serialize(),
            beforeSend  : function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
            success : function (data) {
                console.debug("back from ajax 1")
                if(data.status && data.status == 'error') {
                    if(data.result && data.result.msg) {
                        base.showJsMessage('error',data.result.msg,true,'#edit-program-js-messages');
                    }
                } else if(data.status && data.status == 'success') {
                    if(data.result && data.result.msg) {
                        base.setReloadMsg('info',data.result.msg);
                    }
                    console.debug("back from ajax")
                    $this.closest('.modal').modal('hide');
                    if($this.data('redirect')) {
                        window.location = $this.data('redirect');
                    } else {
                        window.location.reload();
                    }
                }
            },
            error: function (err) {
                $this.closest('.modal').modal('hide');
                base.showJsMessage('error',err,true);
            },
        }).always(function () {
            $this.find('.btn-primary').removeClass('btn-disabled').attr('disabled', false);
        });
        // We don't want this form submission to automatically trigger a reload
        return false;
    }

    // Share with user click
    $('#edit-program').on('submit', function(e) {
         return (do_submission(e));
      })

});