from django.db import models

class AnalysisManager(models.Manager):
    content = None

# TODO: notice that this list must be synchronized with PlotFactory.js on the names of plot types
class Analysis(models.Model):
    objects = AnalysisManager()

    @classmethod
    def get_types(self):
        types = [{'name' : 'Bar Chart',                  'description' : "This is a short description", 'image' : 'img/histogram.png'},
                 {'name' : 'Histogram',                  'description' : "This is a short description", 'image' : 'img/histogram.png'},
                 {'name' : 'Scatter Plot',               'description' : "This is a short description", 'image' : 'img/histogram.png'},
                 {'name' : 'Violin Plot',                'description' : "This is a short description", 'image' : 'img/histogram.png'},
                 {'name' : 'Violin Plot with axis swap', 'description' : "This is a short description", 'image' : 'img/histogram.png'},
                 {'name' : 'Cubby Hole Plot',            'description' : "This is a short description", 'image' : 'img/histogram.png'},
                 {'name' : 'SeqPeek',                    'description' : "This visualization shows where somatic mutations have been observed on a linear representation of a specific protein.  Each horizontal strip represents the protein, with data from different tumor types (aka cohorts or studies) shown stacked one on top of the other. </p>",
                                                         'image': 'img/histogram.png'}]


        return types