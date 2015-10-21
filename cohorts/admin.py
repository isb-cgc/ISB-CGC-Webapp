# from search.models import SavedSearch
# from django.contrib import admin
# from django.contrib.auth.models import User


# class SavedSearchAdmin(admin.ModelAdmin):
#     list_display = (
#         'id',
#         'name',
#         # 'search_url',
#         # 'datatypes',
#         'last_date_saved',
#         # 'user_id_id',
#         'saved_by'
#     )
#
#     def saved_by(self, obj):
#         return User.objects.get(pk=obj.user_id).username
#
#
# admin.site.register(SavedSearch, SavedSearchAdmin)
