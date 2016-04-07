"""

Copyright 2015, Institute for Systems Biology

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

"""

from django.contrib import admin

from projects.models import Study, Project, User_Data_Tables, User_Feature_Definitions


class Project_Admin(admin.ModelAdmin):
    list_display = (
        'name',
        'active',
        'last_date_saved',
        'owner',
        'is_public'
    )
    exclude = ('shared',)

class Study_Admin(admin.ModelAdmin):
    list_display = (
        'name',
        'active',
        'last_date_saved',
        'owner',
        'project',
        'extends'
    )

class UserDataTable_Admin(admin.ModelAdmin):
    list_display = (
        'study',
        'google_project',
        'google_bucket',
    )

admin.site.register(Project, Project_Admin)
admin.site.register(Study, Study_Admin)
admin.site.register(User_Data_Tables, UserDataTable_Admin)