from django.http import HttpResponse
from django.template import loader
from models import Config

def offline_view(request):
    offline_message = Config.objects.get(key='offline').message
    context = {
			'message':offline_message
    }
    return HttpResponse(loader.render_to_string('offline.html', context), status=503)
