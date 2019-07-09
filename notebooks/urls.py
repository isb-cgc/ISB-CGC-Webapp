from django.conf.urls import url

from . import views

urlpatterns = [
    # url(r'^$',                              views.notebook_list, name='notebooks'),
    # url(r'^public$',                        views.notebook_list, name='notebooks_public'),
    url(r'^create_vm',                      views.notebook_vm_command, name='notebook_create_vm'),
    url(r'^start_vm',                       views.notebook_vm_command, name='notebook_start_vm'),
    url(r'^stop_vm',                        views.notebook_vm_command, name='notebook_stop_vm'),
    url(r'^delete_vm',                      views.notebook_vm_command, name='notebook_delete_vm'),
    url(r'^check_vm',                       views.notebook_vm_command, name='notebook_check_vm'),
    url(r'^run_browser',                    views.notebook_vm_command, name='notebook_run_browser'),

    # url(r'^create$',                        views.notebook, name='notebook_create'),
    # url(r'^(?P<notebook_id>\d+)/$',         views.notebook, name='notebook_detail'),
    # url(r'^(?P<notebook_id>\d+)/public$',   views.notebook, name='notebook_detail_public'),
    # url(r'^(?P<notebook_id>\d+)/edit$',     views.notebook, name='notebook_edit'),
    # url(r'^(?P<notebook_id>\d+)/delete$',   views.notebook, name='notebook_delete'),
    # url(r'^(?P<notebook_id>\d+)/copy$',     views.notebook, name='notebook_copy'),
    # url(r'^(?P<notebook_id>\d+)/add$',      views.notebook, name='notebook_add'),
    # url(r'^(?P<notebook_id>\d+)/remove$',   views.notebook, name='notebook_remove')

]
