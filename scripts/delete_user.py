from django.contrib.auth.models import User

# Create user and save to the database
user = User.objects.get(username='mytestuser')
user.delete()
