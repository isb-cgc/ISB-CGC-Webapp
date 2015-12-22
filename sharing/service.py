from django.core.mail import send_mail
from google.appengine.api import mail
from django.core.validators import validate_email
from django.template.loader import get_template
from django.contrib.auth.models import User
from django.conf import settings
from django.template.context import Context
from django.core.urlresolvers import reverse

from urllib import urlencode

def create_share(request, item, emails, type, share_user=None):
    if not share_user:
        share_user = request.user

    for email in emails:
        # Skip any empty emails or sharing with yourself
        if not email or request.user.email == email:
            continue

        # Check for an existing item
        sharedAlready = item.shared.all().filter(email=email)

        if sharedAlready.count() > 0:
            sharedAlready = sharedAlready.first()
            # Mark as active
            sharedAlready.active = True
            sharedAlready.save()

            # We don't need to do any more for this email address
            continue

        # Else, check for if our email matches a user
        user = User.objects.all().filter(email=email)
        redeemed = False
        template = 'sharing/email_new_user_share.html'
        template_txt = 'sharing/email_new_user_share.txt'

        if user.count() > 0:
            # If the email matches a user, we are going to mark it as redeemed immediately for them
            user = user[0]
            redeemed = True
            template = 'sharing/email_existing_user_share.html'
            template_txt = 'sharing/email_existing_user_share.txt'
        else:
            user = None
            validate_email(email)

        sharedResource = item.shared.create(email=email,matched_user=user,redeemed=redeemed)
        sharedResource.save()

        email_template = get_template(template)
        email_text_template = get_template(template_txt)
        ctx = Context({
            'shared_by': share_user,
            'item': item,
            'type': type,
            'shared_url': request.build_absolute_uri(
                    reverse('sharing_add', kwargs={
                        'sharing_id': sharedResource.id
                    })) + '?' + urlencode({'key':sharedResource.share_key}),
        })

        message = mail.EmailMessage()

        message.subject = 'You Were Added on a ' + type
        message.body = email_text_template.render(ctx)
        message.html = email_template.render(ctx)
        message.sender = 'noreply@' + settings.PROJECT_NAME + '.appspotmail.com'
        message.to = email

        message.send()