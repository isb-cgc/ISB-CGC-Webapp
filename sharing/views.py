from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseRedirect, JsonResponse
from django.core.urlresolvers import reverse
from sharing.models import Shared_Resource

def sharing_add(request, sharing_id=0):
    template = 'sharing/sharing_detail.html'
    shared = Shared_Resource.objects.get(id=sharing_id, share_key=request.GET['key'])

    if request.user.is_authenticated():
        if shared.redeemed and shared.matched_user_id != request.user.id:
            raise Exception('This invitation has already been redeemed by a different user')

        shared.redeemed = True
        shared.matched_user = request.user
        shared.save()

        # We've redeemed, we'll just redirect to the resource below

    type = None
    resource = None
    redirect_page = ''
    redirect_id_key = ''
    title = ''

    if shared.project_set.count() > 0:
        type = 'projects'
        title = 'Project'
        redirect_page = 'project_detail'
        redirect_id_key = 'project_id'
        resource = shared.project_set.all().first()
    #elif resc._set.count() > 0:

    if not resource:
        raise Exception('We were not able to find the resource that was shared with you')

    if request.user.is_authenticated():
        return HttpResponseRedirect(reverse(redirect_page, kwargs={
            redirect_id_key: resource.id
        }))
    else:
        context = {
            'type': type,
            'title': title,
            'resource': resource,
            'shared': shared
        }
        return render(request, template, context)

@login_required
def sharing_remove(request, sharing_id=0):
    resc = request.user.shared_resource_set.get(id=sharing_id)
    resc.active = False
    resc.save()

    return JsonResponse({
        'status': 'success'
    })
