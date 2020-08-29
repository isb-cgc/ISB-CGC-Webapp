//
// require.config({
//     baseUrl: STATIC_FILES_URL + 'js/',
//     paths: {
//         // jquery: 'libs/jquery-1.11.1.min',
//         // bootstrap: 'libs/bootstrap.min',
//         // jqueryui: 'libs/jquery-ui.min',
//         // session_security: 'session_security/script',
//         // underscore: 'libs/underscore-min',
//         // assetscore: 'libs/assets.core',
//         // assetsresponsive: 'libs/assets.responsive',
//         d3: 'libs/d3.min',
//         d3tip: 'libs/d3-tip',
//         science: 'libs/science.min',
//         stats: 'libs/science.stats.min',
//         vizhelpers: 'helpers/vis_helpers',
//         select2: 'libs/select2.min'
//     },
//     shim: {
//         // 'bootstrap': ['jquery'],
//         // 'jqueryui': ['jquery'],
//         // 'session_security': ['jquery'],
//         // 'assetscore': ['jquery', 'bootstrap', 'jqueryui'],
//         // 'assetsresponsive': ['jquery', 'bootstrap', 'jqueryui'],
//         'select2': ['jquery']
//     }
// });
//


// require.config({
//     baseUrl: STATIC_FILES_URL+'js/',
//     paths: {
//         jquery: 'libs/jquery-1.11.1.min',
//         bootstrap: 'libs/bootstrap.min',
//         jqueryui: 'libs/jquery-ui.min',
//         session_security: 'session_security/script',
//         underscore: 'libs/underscore-min',
//         tablesorter:'libs/jquery.tablesorter.min',
//         base: 'base'
//     },
//     shim: {
//         'bootstrap': ['jquery'],
//         'jqueryui': ['jquery'],
//         'session_security': ['jquery'],
//         'tablesorter': ['jquery'],
//         'base': ['jquery'],
//     }
// });


require([
    'jquery',
    'base',
    'jqueryui',
    'bootstrap',
    'session_security'
], function ($, base) {


    const survival_data = [
        {rate: 1, year: 0.010951403148528400, label: 'GBM'},
        {rate: 1, year: 0.03285420944558520, label: 'GBM'},
        {rate: 0.6501834973218500, year: 1.1800136892539400, label: 'GBM'},
        {rate: 0.4051506741231060, year: 1.7987679671457900, label: 'GBM'},
        {rate: 0.3060732678088450, year: 2.0177960301163600, label: 'GBM'},
        {rate: 0.2040488452058970, year: 3.5236139630390100, label: 'GBM'},
        {rate: 0.2040488452058970, year: 4.112251882272420, label: 'GBM'},
        {rate: 0.16323907616471800, year: 5.519507186858320, label: 'GBM'},
        {rate: 0.054413025388239200, year: 6.2559890485968500, label: 'GBM'},
        {rate: 1, year: 0.024640657084188900, label: 'LUAD'},
        {rate: 0.9555555555555560, year: 0.5913757700205340, label: 'LUAD'},
        {rate: 0.7544291961763230, year: 1.3305954825462000, label: 'LUAD'},
        {rate: 0.6199439916405430, year: 1.894592744695410, label: 'LUAD'},
        {rate: 0.6199439916405430, year: 2.0342231348391500, label: 'LUAD'},
        {rate: 0.5007239932481310, year: 4.91170431211499, label: 'LUAD'},
        {rate: 0.5007239932481310, year: 5.075975359342920, label: 'LUAD'},
        {rate: 0.5007239932481310, year: 7.5044490075290900, label: 'LUAD'}
    ];


    const gender_data = [
        {name: 'Male', LUAD: 242, GBM: 366},
        {name: 'Female', LUAD: 280, GBM: 230},
        {name: 'None', LUAD: 63, GBM: 21}
    ];

    const vital_data = [
        {name: 'Alive', LUAD: 334, GBM: 103},
        {name: 'Dead', LUAD: 188, GBM: 491},
        {name: 'None', LUAD: 63, GBM: 23}
    ];

    const age_data = [
        {name: '0-9', LUAD: 0, GBM: 0},
        {name: '10-19', LUAD: 0, GBM: 6},
        {name: '20-29', LUAD: 0, GBM: 19},
        {name: '30-39', LUAD: 3, GBM: 42},
        {name: '40-49', LUAD: 30, GBM: 80},
        {name: '50-59', LUAD: 106, GBM: 161},
        {name: '60-69', LUAD: 170, GBM: 160},
        {name: '70-79', LUAD: 162, GBM: 104},
        {name: '80+', LUAD: 32, GBM: 24},
        {name: 'None', LUAD: 82, GBM: 21}
    ];

    const sets = [
        {sets: ["S1"], figure: 44.91, label: "S1", size: 34.53},
        {sets: ["S2"], figure: 34.53, label: "S2", size: 34.53},
        {sets: ["S1", "S2"], figure: 6.05, label: "S1&S2", size: 6.05},
    ];


    //svg
    const gender_svg = d3.select('#gender-canvas');
    const vital_svg = d3.select('#vital-canvas');
    const age_svg = d3.select('#age-canvas');
    const survival_svg = d3.select('#surv-analysis');


    const width = 580;
    const height = 350;
    const margin = ({top: 65, right: 50, bottom: 40, left: 70});
    const color = d3.scaleOrdinal().range(["#8a89a6", "#ff8c00"]);


    const gender_title = "Gender";
    const vital_title = "Vital Status";
    const age_title = "Age at Diagnosis";
    const survival_title = "Survival Analysis";


    const line_chart = (data, svg, chart_title) => {
        const x = d3.scaleLinear()
            .domain([0, d3.max(data, function (d) {
                return d.year;
            })]).nice()
            .rangeRound([margin.left, width - margin.right]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, function (d) {
                return d.rate;
            })]).nice()
            .rangeRound([height - margin.bottom, margin.top]);

        const xAxis = g => g
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).tickSizeOuter(0));

        const yAxis = g => g
            .attr("class", "y-axis")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(null, "s").tickSize(-width + margin.left + margin.right))
            .call(g => g.select(".domain").remove())
            .call(g => g.select(".tick:last-of-type text").clone()
                .attr("transform", "rotate(-90)")
                .attr("x", 0 - (height - margin.top - margin.bottom) / 2)
                .attr("y", -(margin.left / 2) - 5)
                .attr("class", "label")
                .text("Survival Rate"))
            .selectAll("line").style("stroke", "#DCDCDC");

        const dataNest = d3.nest()
            .key(function (d) {
                return d.label;
            })
            .entries(data);

        // Define the line
        const survival_line = d3.line()
            .x(function (d) {
                return x(d.year);
            })
            .y(function (d) {
                return y(d.rate);
            });

        const survival_table = survival_data => {
            const table = $('#survival-table');
            table.find("tbody tr").remove();
            let s1_cases = 0;
            let s2_cases = 0;
            survival_data.forEach(function (obj) {
                if (obj.key.localeCompare("GBM") === 0) {
                    obj.values.forEach(function (item) {
                        s1_cases += item.rate * 100;
                    })
                } else {
                    obj.values.forEach(function (item) {
                        s2_cases += item.rate * 100;
                    })
                }
            });
            $('#survival-table tr:last').after(`<tr><td>${"Overall Survival Analysis"}</td><td>${Math.round(s1_cases)}</td><td>${Math.round(s2_cases)}</td></tr>`);
        };

        svg.append("g")
            .call(xAxis);

        svg.append("g")
            .call(yAxis);

        dataNest.forEach(function (d, i) {

            svg.append("path")
                .attr("class", "line-path")
                .style("stroke", function () { // Add the colours dynamically
                    return d.color = color(d.key);
                })
                .attr("id", 'tag' + d.key.replace(/\s+/g, '')) // assign an ID
                .attr("d", survival_line(d.values));

            //Add label to the curve
            svg.append("text")
                .attr("transform", "translate(" + x(dataNest[0].values[dataNest[0].values.length - 1].year) + "," + y(dataNest[0].values[dataNest[0].values.length - 1].rate) + ")")
                .attr("class", "legend")
                .style("fill", dataNest[0].color)
                .text("S1:" + dataNest[0].key);

            //Add label to the curve
            svg.append("text")
                .attr("transform", "translate(" + x(dataNest[dataNest.length - 1].values[dataNest[dataNest.length - 1].values.length - 1].year) + "," + y(dataNest[dataNest.length - 1].values[dataNest[dataNest.length - 1].values.length - 1].rate) + ")")
                .attr("class", "legend")
                .style("fill", dataNest[dataNest.length - 1].color)
                .text("S2:" + dataNest[dataNest.length - 1].key);

        });

        svg.append("text")
            .attr("class", "label")
            .attr("x", margin.left + (width - margin.left - margin.right) / 2)
            .attr("y", height - margin.bottom + 30)
            .attr("text-anchor", "middle")
            .attr("fill", "grey")
            .attr("font-size", 14)
            .text("Year");

        svg.append("text")
            .attr("x", margin.left - 25)
            .attr("y", margin.top / 2)
            .attr("class", "title")
            .text(chart_title);

        survival_table(dataNest);
    };

    const bar_chart = (data, svg, chart_title) => {
        const groupName = Object.keys(data[0])[0]; //name
        const tag = "Cases";
        const keys = Object.keys(data[0]);
        keys.splice(0, 1); //male,female,NA

        const x0 = d3.scaleBand()
            .domain(data.map(d => d[groupName]))
            .rangeRound([margin.left, width - margin.right])
            .paddingInner(.15);

        const x1 = d3.scaleBand()
            .domain(keys)
            .rangeRound([0, x0.bandwidth()])
            .paddingInner(0.03);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d3.max(keys, key => d[key]))]).nice()
            .rangeRound([height - margin.bottom, margin.top]);


        const legend = svg => {
            const g = svg
                .attr("transform", `translate(${width},0)`)
                .attr("text-anchor", "end")
                .attr("font-family", "sans-serif")
                .attr("font-size", 10)
                .selectAll("g")
                .data(color.domain().slice().reverse())
                .join("g")
                .attr("transform", (d, i) => `translate(0,${i * 23})`);

            g.append("rect")
                .attr("x", -20)
                .attr("width", 25)
                .attr("height", 25)
                .attr("fill", color);

            g.append("text")
                .attr("x", -24)
                .attr("y", 9.5)
                .attr("dy", "0.35em")
                .text(d => d);
        };

        const xAxis = g => g
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x0).tickSizeOuter(0));

        const yAxis = g => g
            .attr("class", "y-axis")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(null, "s")
                .tickSize(-width + margin.left + margin.right))
            .call(g => g.select(".domain").remove())
            .call(g => g.select(".tick:last-of-type text").clone()
                .attr("transform", "rotate(-90)")
                .attr("x", 0 - (height - margin.top - margin.bottom) / 2)
                .attr("y", -(margin.left / 2) - 5)
                .text(tag))
            .selectAll("line").style("stroke", "#DCDCDC");

        svg.append("g")
            .call(xAxis);

        svg.append("g")
            .call(yAxis);

        svg.append("g")
            .selectAll("g")
            .data(data)
            .join("g")
            .attr("transform", d => `translate(${x0(d[groupName])},0)`)
            .selectAll("rect")
            .data(d => keys.map(key => ({key, value: d[key]})))
            .join("rect")
            .attr("x", d => x1(d.key))
            .attr("y", d => y(d.value))
            .attr("width", x1.bandwidth())
            .attr("height", d => y(0) - y(d.value))
            .attr("fill", d => color(d.key));

        svg.append("g")
            .call(legend);

        svg.append("text")
            .attr("x", margin.left - 25)
            .attr("y", margin.top / 2)
            .attr("class", "title")
            .text(chart_title);
    };

    const gender_table = gender_data => {
        $('#gender-table').find("tbody tr").remove();
        gender_data.forEach(function (obj) {
            $('#gender-table tr:last').after("<tr><td>" + obj.name + "</td><td>" + obj.GBM + "</td><td>" + obj.LUAD + "</td></tr>");
        });
    };

    const vital_table = vital_data => {
        $('#vital-table').find("tbody tr").remove();
        vital_data.forEach(function (obj) {
            $('#vital-table tr:last').after("<tr><td>" + obj.name + "</td><td>" + obj.GBM + "</td><td>" + obj.LUAD + "</td></tr>");
        });
    };

    const age_table = age_data => {
        $('#age-table').find("tbody tr").remove();
        age_data.forEach(function (obj) {
            $('#age-table tr:last').after("<tr><td>" + obj.name + "</td><td>" + obj.GBM + "</td><td>" + obj.LUAD + "</td></tr>");
        });
    };

    const venn_diagram = sets => {
        const chart = venn.VennDiagram()
            .width(390)
            .height(320)
            .styled(false);

        const div = d3.select("#venn-diagram").datum(sets).call(chart);
        div.selectAll("text").style("fill", "#404040").style("font-size", "16px");
        div.selectAll(".venn-circle path")
            .style("fill-opacity", .8)
            .style("stroke-width", .5)
            .style("stroke-opacity", 1)
            .style("stroke", "#f8f8f8");

        const tooltip = d3.select("#venn-diagram").append("div")
            .attr("class", "venntooltip");

        div.selectAll("g")
            .on("mouseover", function (d) {
                venn.sortAreas(div, d);

                // Display a tooltip with the current size
                tooltip.transition().duration(20).style("opacity", 1);
                tooltip.text(d.label + ": " + d.figure + "%");

                // highlight the current path
                // highlight the current path
                const selection = d3.select(this).transition("tooltip").duration(400);
                selection.select("path")
                    .style("stroke-width", 3)
                    .style("fill-opacity", d.sets.length === 1 ? .8 : 0)
                    .style("stroke-opacity", 1);
            })

            .on("mousemove", function () {
                tooltip.style("left", (d3.event.pageX - 20) + "px")
                    .style("top", (d3.event.pageY - 300) + "px");
            })

            .on("mouseout", function (d, i) {
                tooltip.transition().duration(2000).style("opacity", 0);
                var selection = d3.select(this).transition("tooltip").duration(400);
                selection.select("path")
                    .style("stroke-width", 3)
                    .style("fill-opacity", d.sets.length === 1 ? .8 : 0)
                    .style("stroke-opacity", 1);
            });

    };

    bar_chart(gender_data, gender_svg, gender_title);
    gender_table(gender_data);
    bar_chart(vital_data, vital_svg, vital_title);
    vital_table(vital_data);
    bar_chart(age_data, age_svg, age_title);
    age_table(age_data);
    line_chart(survival_data, survival_svg, survival_title);
    venn_diagram(sets);

    $(document).ready(function () {
        $('#sidebarCollapse').on('click', function () {
            $('#sidebar').toggleClass('active');
        });

        $("tr:odd").css({
            "background-color": "#f8f8f8",
            "color": "#404040"
        });

        $("tr:even").css({
            "color": "#404040"
        });
    });


});










