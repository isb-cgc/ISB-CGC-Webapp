from django.contrib.auth.models import User

# Create user and save to the database
user = User.objects.create_user('mytestuser', email='test@systemsbiology.org', password='!ThisIsATerriblePassword9')
user.is_superuser=False
user.is_staff=False
user.save()
