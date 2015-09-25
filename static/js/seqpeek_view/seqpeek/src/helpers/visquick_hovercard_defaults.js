define([

], function(

) {
    return {
        DEFAULT_BAR_PLOT_TRACK_CONFIG: {
            hovercard_content: {
                "key": function (d) {
                    return "value";
                }
            }
        },

        DEFAULT_SAMPLE_PLOT_TRACK_CONFIG: {
            hovercard_content: {
                "key": function (d) {
                    return "value";
                }
            }
        },

        DEFAULT_REGION_TRACK_CONFIG: {
            "Coordinates": function (d) {
                return d.start + " - " + d.end;
            },
            "Type": function (d) {
                return d.type;
            }
        },

        DEFAULT_PROTEIN_DOMAIN_TRACK_CONFIG: {
            hovercard_content: {
                "DB": function (d) {
                    return d.dbname;
                },
                "EVD": function (d) {
                    return d.evd;
                },
                "ID": function (d) {
                    return d.id;
                },
                "Name": function (d) {
                    return d.name;
                },
                "Status": function (d) {
                    return d.status;
                },
                "LOC": function (d) {
                    return d.start + " - " + d.end;
                }
            }
        }
    };
});
