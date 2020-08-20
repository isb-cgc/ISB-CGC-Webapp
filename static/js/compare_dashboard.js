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
require([
    'jquery',
    'base',
    'jqueryui',
    'bootstrap',
    'session_security'
], function ($, base) {


// $(function () {

    // const sidebar = document.querySelector('.sidebar');
    // const mainContent = document.querySelector('.comp-body-content');
    // document.querySelector('#sidebar-but').onclick = function () {
    //     sidebar.classList.toggle('sidebar_small');
    //     mainContent.classList.toggle('comp-body-content_large')
    // }


    // Data
    const gender_data = [
        // {name: 'cohort1', male: 10000, female: 3000, NA: 500},
        // {name: 'cohort2', male: 10800, female: 5500, NA: 1000}
        {name: 'Male', LUAE: 242, GBM: 366},
        {name: 'Female', LUAE: 280, GBM: 230},
        {name: 'None', LUAE: 63, GBM: 21}
    ];

    const vital_data = [
        {name: 'Alive', LUAE: 334, GBM: 103},
        {name: 'Dead', LUAE: 188, GBM: 491},
        {name: 'None', LUAE: 63, GBM: 23}
    ];

    const age_data = [
        {name: '0-9', LUAE: 0, GBM: 0},
        {name: '10-19', LUAE: 0, GBM: 6},
        {name: '20-29', LUAE: 0, GBM: 19},
        {name: '30-39', LUAE: 3, GBM: 42},
        {name: '40-49', LUAE: 30, GBM: 80},
        {name: '50-59', LUAE: 106, GBM: 161},
        {name: '60-69', LUAE: 170, GBM: 160},
        {name: '70-79', LUAE: 162, GBM: 104},
        {name: '80+', LUAE: 32, GBM: 24},
        {name: 'None', LUAE: 82, GBM: 21}
    ];


    //svg
    const gender_svg = d3.select('#gender-canvas');
    const vital_svg = d3.select('#vital-canvas');
    const age_svg = d3.select('#age-canvas');

    const gender_title = "Gender";
    const vital_title = "Vital Status";
    const age_title = "Age at Diagnosis";
    //


    // gender_svg.attr('width', 500)
    //     .attr('height', 300);
    //
    // const width = gender_svg.attr('width');
    // const height = gender_svg.attr('height');

    //
    const width = 580;
    const height = 350;

    // const width = $('#main-canvas').width();
    // const height = $('#main-canvas').height();

    // console.log(width);
    // console.log(height);


    // gender_svg.attr("width", '100%')
    //     .attr("height", '100%')
    //     .attr('viewBox', '0 0 '+Math.min(width,height)+' '+Math.min(width, height))
    //     .attr('preserveAspectRatio', 'xMinYMin')
    //     .append("g")
    //     .attr("transform", "translate("+ Math.min(width,height) / 2 + "," + Math.min(width,height) / 2 + ")");

    // console.log(gender_svg.attr('width'));

    const margin = ({top: 65, right: 15, bottom: 40, left: 40});
    const color = d3.scaleOrdinal().range(["#8a89a6", "#ff8c00"]);

    const render = (data, svg, chart_title) => {

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
            .padding(0.03);

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
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x0).tickSizeOuter(0))
            .call(g => g.select(".domain").remove());

        const yAxis = g => g
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(null, "s"))
            .call(g => g.select(".domain").remove())
            .call(g => g.select(".tick:last-of-type text").clone()
                .attr("x", 3)
                .attr("text-anchor", "start")
                .attr("font-weight", "bold")
                .text(tag));

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
            .call(xAxis);

        svg.append("g")
            .call(yAxis);

        svg.append("g")
            .call(legend);

        svg.append("text")
            .attr("x", margin.left - 20)
            .attr("y", 28)
            // .attr("text-anchor", "middle")
            .attr("fill", "#404040")
            .style("font-size", "24px")
            .style("font-weight", "300")
            .text(chart_title);

    };
    render(gender_data, gender_svg, gender_title);
    render(vital_data, vital_svg, vital_title);
    render(age_data, age_svg, age_title);

    var $tabs = $('#comparison-tabs')
    function addTab(compare, active) {
        $tabs.prepend(
        '<li role="presentation" ' +
            'cohort_id_1=' + compare.cohort_id1 +
            'cohort_id_2=' + compare.cohort_id2 +
            (active ? 'class="active"' : '') + '>\n' +
        '    <a href="#label-comp-tab" id="comp-tab" role="tab" data-toggle="tab"\n' +
        '       data-toggle-type="comparison">'+ compare.label +'</a>\n' +
        '    <div class="dropdown">\n' +
        '        <a class="dropdown-toggle comparison-drop" id="dropdown-label" role="button"\n' +
        '           data-toggle="dropdown"><i\n' +
        '                class="fa fa-caret-down"></i></a>\n' +
        '        <ul class="dropdown-menu">\n' +
        '            <li role="menuitem"><a data-toggle="modal" role="button" data-target="">Edit details</a>\n' +
        '            </li>\n' +
        '            <li role="menuitem"><a data-toggle="modal" role="button" data-target="">Delete</a></li>\n' +
        '        </ul>\n' +
        '    </div>\n' +
        '</li>'
        )
    }

    $(document).ready(function () {
        $.ajax({
            type: 'GET',
            dataType: 'json',
            url: BASE_URL + '/compare/get_compares',
            success: function(data) {
                console.log(data);
                $.each(JSON.parse(data), function(i, compares) {
                    addTab(JSON.parse(compares), false)
                });
            }
        });

        $('#sidebarCollapse').on('click', function () {
            $('#sidebar').toggleClass('active');
            // $('#main-canvas').toggleClass('active');
        });

        $('#save-but').on('click', function() {
            var $current_tab = $(".active")
            $.ajax({
                type: 'POST',
                url: BASE_URL + '/compare/save_compare',
                data: {
                    'cohort_id_1': $current_tab.attr('cohort_id_1'),
                    'cohort_id_2': $current_tab.attr('cohort_id_2')
                }
            });
        });
    });


});










