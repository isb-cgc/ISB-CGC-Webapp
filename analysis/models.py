from django.db import models

class AnalysisManager(models.Manager):
    content = None

# TODO: notice that this list must be synchronized with PlotFactory.js on the names of plot types
class Analysis(models.Model):
    objects = AnalysisManager()
    @classmethod
    def get_types(self):
        types = [{'name' : 'Bar Chart',
                  'description' : "Used to plot a single categorical feature for one or more cohorts.",
                  'image' : 'img/barchart.png'},
                 {'name' : 'Histogram',
                  'description' : "Used to plot a single numerical feature for one or more cohorts.",
                  'image' : 'img/histogram.png'},
                 {'name' : 'Scatter Plot',
                  'description' : "Used to plot two numerical features for one or more cohorts. Can also color code points by a single categorical feature.",
                  'image' : 'img/scatterplot.png'},
                 {'name' : 'Violin Plot',
                  'description' : "Used to plot a categorical feature on the x-axis versus a numerical feature on the y-axis. Points in the plot can be colored by another categorical feature.",
                  'image' : 'img/violinplot.png'},
                 # {'name' : 'Violin Plot with axis swap',
                 #  'description' : "Used to plot a categorical feature on the y-axis versus a numerical feature on the x-axis. Points in the plot can be colored by another categorical feature.",
                 #  'image' : 'img/violinplot.png'},
                 {'name' : 'Cubby Hole Plot',
                  'description' : "Used to plot two categorical features. Boxes are colored by their related p-values.",
                  'image' : 'img/cubbyhole.png'},
                 {'name' : 'SeqPeek',
                  'description' : "This visualization shows where somatic mutations have been observed on a linear representation of a specific protein.  Each horizontal strip represents the protein, with data from different tumor types (aka cohorts or studies) shown stacked one on top of the other. </p>",
                  'image': 'img/seqpeak.png'},
                 {'name': 'OncoPrint',
                  'description': "Used to plot multiple genomic alteration (somatic mutation) events across a set of samples by heatmap. OncoPrint is developed and provided by cBioPortal.",
                  'image': 'img/oncoprint.png'},
                 # {'name': 'OncoGrid',
                 #  'description': "Used to view multiple genomic alteration (somatic mutation) events, clinical data, available files across a set of cases by interactive heatmap. OncoGrid library is developed at Ontario Institute for Cancer Research (OICR).",
                 #  'image': 'img/oncogrid.png'}
                 ]

        return types

    @classmethod
    def get_types_list(self):
        return [x['name'] for x in self.get_types()]
