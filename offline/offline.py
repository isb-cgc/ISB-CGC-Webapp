from models import Config


def is_enabled():
  try:
    return Config.objects.get(key='offline').value
  except Config.DoesNotExist:
    set_defaults()


def set_defaults():
  option = Config.objects.create(
      key= 'offline', 
      value= False,
      message= 'The site is under maintenance. Please come back soon.'
      )
  return option.value
