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

    //
    // We always want to reset forms when we hide modals, since otherwise even on a successful AJAX
    // submission and reload Chrome asks us if we want to do the reload!
    //

    $('.modal').on('hide.bs.modal', function() {
        var forms = $(this).find('form');
        if (forms.length) {
            _.each(forms, function (form) {
                form.reset();
            });
        }
      })

    //
    // This handles issue #2006. When user edits name or description, we check that there are no
    // unallowed characters. Also used in the project editor dialog.
    //

    var do_submission = function(self, e, name_field, desc_field, msg_target) {
        e.preventDefault();
        e.stopPropagation();
        var $self = $(self);
        console.debug("rpcess " + self);

        var name = $(name_field).val();
        var desc = $(desc_field).val();
        console.debug("rpcessA " + name);
        console.debug("rpcessB " + desc);

        var unallowed_name = name.match(base.whitelist);
        var unallowed_desc = desc.match(base.whitelist);

        if (unallowed_name || unallowed_desc) {
            var unallowed_all = "";
            if (unallowed_name) {
                unallowed_all += unallowed_name.join(", ");
            }
            if (unallowed_name && unallowed_desc) {
                unallowed_all += ", ";
            }
            if (unallowed_desc) {
                unallowed_all += unallowed_desc.join(", ");
            }
            base.showJsMessage('danger',
                "These characters are invalid: " + unallowed_all, true, msg_target);
            return false;
        } else {
            $(msg_target).empty();
        }

        $self.find('.btn-primary').addClass('btn-disabled').attr('disabled', true);

        console.debug("off to ajax")
        var csrftoken = $.getCookie('csrftoken');
        $.ajax({
            type        :'POST',
            url         : $self.attr('action'),
            dataType    :'json',
            data        : $self.serialize(),
            beforeSend  : function(xhr){xhr.setRequestHeader("X-CSRFToken", csrftoken);},
            success : function (data) {
                if(data.status && data.status == 'error') {
                    if(data.result && data.result.msg) {
                        base.showJsMessage('error', data.result.msg, true, msg_target);
                    }
                } else if(data.status && data.status == 'success') {
                    if(data.result && data.result.msg) {
                        base.setReloadMsg('info',data.result.msg);
                    }
                    $self.closest('.modal').modal('hide');
                    if($self.data('redirect')) {
                        window.location = $self.data('redirect');
                    } else {
                        window.location.reload();
                    }
                }
            },
            error: function (err) {
                $self.closest('.modal').modal('hide');
                base.showJsMessage('error',err,true);
            },
        }).always(function () {
            $self.find('.btn-primary').removeClass('btn-disabled').attr('disabled', false);
        });
        // We don't want this form submission to automatically trigger a reload
        return false;
    }

    // Handles program edits checking and submission
    $('#edit-program').on('submit', function(e) {
         return (do_submission(this, e, '#edit-program-name-field', '#edit-program-desc-field', '#edit-program-js-messages'));
      })

    // Handles project edits checking and submission
    $('.project-edit-form').on('submit', function(e) {
         return (do_submission(this, e, '#edit-project-name-field', '#edit-project-desc-field', '#edit-project-js-messages'));
      })

});