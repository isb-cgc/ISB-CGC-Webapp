!(function() {
	vq.data = _.isUndefined(vq.data) ? {} : vq.data;
	vq.data.genome = _.isUndefined(vq.data.genome) ? {} : vq.data.genome;

vq.data.genome.chrom_keys
 = ["1","2","3","4","5","6","7","8","9","10",
"11","12","13","14","15","16","17","18","19","20","21","22","X","Y"];

vq.data.genome.chrom_attr = {
    '1' :{ "length": 247249719 },
    '10' : { "length": 135374737 },
    '11': { "length": 134452384 },
    '12': {
        "length": 132349534
    },'13': {
        "length": 114142980
    },'14':  {
        "length": 106368585
    },'15':  {
        "length": 100338915
    },'16':  {
        "length": 88827254
    },'17':  {
        "length": 78774742
    },'18':  {
        "length": 76117153
    },'19': {
        "length": 63811651
    },'2':  {
        "length": 242951149            },'20':    {
        "length": 62435964
    },'21':     {
        "length": 46944323
    },'22':    {
        "length": 49691432
    },'3':    {
        "length": 199501827            },'4':    {
        "length": 191273063            },'5':    {
        "length": 180857866            },'6':    {
        "length": 170899992            },'7':    {
        "length": 158821424            },'8':    {
        "length": 146274826            },'9':    {
        "length": 140273252            },'M':    {
        "length": 16571            },'X':    {
        "length": 154913754            },'Y':    {
        "length": 57772954            }
};
vq.data.genome.cytoband = [
    {
        "chr": "1",        "end": 2300000,
       "label":"p36.33","type":"gneg",
        "start": 0,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 5300000,
       "label":"p36.32","type":"gpos25",
        "start": 2300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "1",
        "end": 7100000,
       "label":"p36.31","type":"gneg",
        "start": 5300000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 9200000,
       "label":"p36.23","type":"gpos25",
        "start": 7100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "1",
        "end": 12600000,
       "label":"p36.22","type":"gneg",
        "start": 9200000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 16100000,
       "label":"p36.21","type":"gpos50",
        "start": 12600000,
        "value": "#c8c8c8"
    },
    {
        "chr": "1",
        "end": 20300000,
       "label":"p36.13","type":"gneg",
        "start": 16100000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 23800000,
       "label":"p36.12","type":"gpos25",
        "start": 20300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "1",
        "end": 27800000,
       "label":"p36.11","type":"gneg",
        "start": 23800000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 30000000,
       "label":"p35.3","type":"gpos25",
        "start": 27800000,
        "value": "#c8c8c8"
    },
    {
        "chr": "1",
        "end": 32200000,
       "label":"p35.2","type":"gneg",
        "start": 30000000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 34400000,
       "label":"p35.1","type":"gpos25",
        "start": 32200000,
        "value": "#c8c8c8"
    },
    {
        "chr": "1",
        "end": 39600000,
       "label":"p34.3","type":"gneg",
        "start": 34400000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 43900000,
       "label":"p34.2","type":"gpos25",
        "start": 39600000,
        "value": "#c8c8c8"
    },
    {
        "chr": "1",
        "end": 46500000,
       "label":"p34.1","type":"gneg",
        "start": 43900000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 51300000,
       "label":"p33","type":"gpos75",
        "start": 46500000,
        "value": "#828282"
    },
    {
        "chr": "1",
        "end": 56200000,
       "label":"p32.3","type":"gneg",
        "start": 51300000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 58700000,
       "label":"p32.2","type":"gpos50",
        "start": 56200000,
        "value": "#c8c8c8"
    },
    {
        "chr": "1",
        "end": 60900000,
       "label":"p32.1","type":"gneg",
        "start": 58700000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 68700000,
       "label":"p31.3","type":"gpos50",
        "start": 60900000,
        "value": "#c8c8c8"
    },
    {
        "chr": "1",
        "end": 69500000,
       "label":"p31.2","type":"gneg",
        "start": 68700000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 84700000,
       "label":"p31.1","type":"gpos100",
        "start": 69500000,
        "value": "#000"
    },
    {
        "chr": "1",
        "end": 88100000,
       "label":"p22.3","type":"gneg",
        "start": 84700000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 92000000,
       "label":"p22.2","type":"gpos75",
        "start": 88100000,
        "value": "#828282"
    },
    {
        "chr": "1",
        "end": 94500000,
       "label":"p22.1","type":"gneg",
        "start": 92000000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 99400000,
       "label":"p21.3","type":"gpos75",
        "start": 94500000,
        "value": "#828282"
    },
    {
        "chr": "1",
        "end": 102000000,
       "label":"p21.2","type":"gneg",
        "start": 99400000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 107000000,
       "label":"p21.1","type":"gpos100",
        "start": 102000000,
        "value": "#000"
    },
    {
        "chr": "1",
        "end": 111600000,
       "label":"p13.3","type":"gneg",
        "start": 107000000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 115900000,
       "label":"p13.2","type":"gpos50",
        "start": 111600000,
        "value": "#c8c8c8"
    },
    {
        "chr": "1",
        "end": 117600000,
       "label":"p13.1","type":"gneg",
        "start": 115900000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 120700000,
       "label":"p12","type":"gpos50",
        "start": 117600000,
        "value": "#c8c8c8"
    },
    {
        "chr": "1",
        "end": 121100000,
       "label":"p11.2","type":"gneg",
        "start": 120700000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 124300000,
       "label":"p11.1","type":"acen",
        "start": 121100000,
        "value": "#d92f27"
    },
    {
        "chr": "1",
        "end": 128000000,
       "label":"q11","type":"acen",
        "start": 124300000,
        "value": "#d92f27"
    },
    {
        "chr": "1",
        "end": 142400000,
       "label":"q12","type":"gvar",
        "start": 128000000,
        "value": "#dcdcdc"
    },
    {
        "chr": "1",
        "end": 148000000,
       "label":"q21.1","type":"gneg",
        "start": 142400000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 149600000,
       "label":"q21.2","type":"gpos50",
        "start": 148000000,
        "value": "#c8c8c8"
    },
    {
        "chr": "1",
        "end": 153300000,
       "label":"q21.3","type":"gneg",
        "start": 149600000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 154800000,
       "label":"q22","type":"gpos50",
        "start": 153300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "1",
        "end": 157300000,
       "label":"q23.1","type":"gneg",
        "start": 154800000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 158800000,
       "label":"q23.2","type":"gpos50",
        "start": 157300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "1",
        "end": 163800000,
       "label":"q23.3","type":"gneg",
        "start": 158800000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 165500000,
       "label":"q24.1","type":"gpos50",
        "start": 163800000,
        "value": "#c8c8c8"
    },
    {
        "chr": "1",
        "end": 169100000,
       "label":"q24.2","type":"gneg",
        "start": 165500000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 171200000,
       "label":"q24.3","type":"gpos75",
        "start": 169100000,
        "value": "#828282"
    },
    {
        "chr": "1",
        "end": 174300000,
       "label":"q25.1","type":"gneg",
        "start": 171200000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 178600000,
       "label":"q25.2","type":"gpos50",
        "start": 174300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "1",
        "end": 184000000,
       "label":"q25.3","type":"gneg",
        "start": 178600000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 189000000,
       "label":"q31.1","type":"gpos100",
        "start": 184000000,
        "value": "#000"
    },
    {
        "chr": "1",
        "end": 192100000,
       "label":"q31.2","type":"gneg",
        "start": 189000000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 197500000,
       "label":"q31.3","type":"gpos100",
        "start": 192100000,
        "value": "#000"
    },
    {
        "chr": "1",
        "end": 205300000,
       "label":"q32.1","type":"gneg",
        "start": 197500000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 209500000,
       "label":"q32.2","type":"gpos25",
        "start": 205300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "1",
        "end": 212100000,
       "label":"q32.3","type":"gneg",
        "start": 209500000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 222100000,
       "label":"q41","type":"gpos100",
        "start": 212100000,
        "value": "#000"
    },
    {
        "chr": "1",
        "end": 222700000,
       "label":"q42.11","type":"gneg",
        "start": 222100000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 225100000,
       "label":"q42.12","type":"gpos25",
        "start": 222700000,
        "value": "#c8c8c8"
    },
    {
        "chr": "1",
        "end": 228800000,
       "label":"q42.13","type":"gneg",
        "start": 225100000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 232700000,
       "label":"q42.2","type":"gpos50",
        "start": 228800000,
        "value": "#c8c8c8"
    },
    {
        "chr": "1",
        "end": 234600000,
       "label":"q42.3","type":"gneg",
        "start": 232700000,
        "value": "#ffffff"
    },
    {
        "chr": "1",
        "end": 241700000,
       "label":"q43","type":"gpos75",
        "start": 234600000,
        "value": "#828282"
    },
    {
        "chr": "1",
        "end": 247249719,
       "label":"q44","type":"gneg",
        "start": 241700000,
        "value": "#ffffff"
    },
    {
        "chr": "10",
        "end": 3000000,
       "label":"p15.3","type":"gneg",
        "start": 0,
        "value": "#ffffff"
    },
    {
        "chr": "10",
        "end": 3800000,
       "label":"p15.2","type":"gpos25",
        "start": 3000000,
        "value": "#c8c8c8"
    },
    {
        "chr": "10",
        "end": 6700000,
       "label":"p15.1","type":"gneg",
        "start": 3800000,
        "value": "#ffffff"
    },
    {
        "chr": "10",
        "end": 12300000,
       "label":"p14","type":"gpos75",
        "start": 6700000,
        "value": "#828282"
    },
    {
        "chr": "10",
        "end": 17300000,
       "label":"p13","type":"gneg",
        "start": 12300000,
        "value": "#ffffff"
    },
    {
        "chr": "10",
        "end": 19900000,
       "label":"p12.33","type":"gpos75",
        "start": 17300000,
        "value": "#828282"
    },
    {
        "chr": "10",
        "end": 20500000,
       "label":"p12.32","type":"gneg",
        "start": 19900000,
        "value": "#ffffff"
    },
    {
        "chr": "10",
        "end": 22800000,
       "label":"p12.31","type":"gpos75",
        "start": 20500000,
        "value": "#828282"
    },
    {
        "chr": "10",
        "end": 24100000,
       "label":"p12.2","type":"gneg",
        "start": 22800000,
        "value": "#ffffff"
    },
    {
        "chr": "10",
        "end": 28300000,
       "label":"p12.1","type":"gpos50",
        "start": 24100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "10",
        "end": 31400000,
       "label":"p11.23","type":"gneg",
        "start": 28300000,
        "value": "#ffffff"
    },
    {
        "chr": "10",
        "end": 34500000,
       "label":"p11.22","type":"gpos25",
        "start": 31400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "10",
        "end": 38800000,
       "label":"p11.21","type":"gneg",
        "start": 34500000,
        "value": "#ffffff"
    },
    {
        "chr": "10",
        "end": 40300000,
       "label":"p11.1","type":"acen",
        "start": 38800000,
        "value": "#d92f27"
    },
    {
        "chr": "10",
        "end": 42100000,
       "label":"q11.1","type":"acen",
        "start": 40300000,
        "value": "#d92f27"
    },
    {
        "chr": "10",
        "end": 46100000,
       "label":"q11.21","type":"gneg",
        "start": 42100000,
        "value": "#ffffff"
    },
    {
        "chr": "10",
        "end": 50100000,
       "label":"q11.22","type":"gpos25",
        "start": 46100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "10",
        "end": 53300000,
       "label":"q11.23","type":"gneg",
        "start": 50100000,
        "value": "#ffffff"
    },
    {
        "chr": "10",
        "end": 61200000,
       "label":"q21.1","type":"gpos100",
        "start": 53300000,
        "value": "#000"
    },
    {
        "chr": "10",
        "end": 64800000,
       "label":"q21.2","type":"gneg",
        "start": 61200000,
        "value": "#ffffff"
    },
    {
        "chr": "10",
        "end": 71300000,
       "label":"q21.3","type":"gpos100",
        "start": 64800000,
        "value": "#000"
    },
    {
        "chr": "10",
        "end": 74600000,
       "label":"q22.1","type":"gneg",
        "start": 71300000,
        "value": "#ffffff"
    },
    {
        "chr": "10",
        "end": 77400000,
       "label":"q22.2","type":"gpos50",
        "start": 74600000,
        "value": "#c8c8c8"
    },
    {
        "chr": "10",
        "end": 82000000,
       "label":"q22.3","type":"gneg",
        "start": 77400000,
        "value": "#ffffff"
    },
    {
        "chr": "10",
        "end": 87900000,
       "label":"q23.1","type":"gpos100",
        "start": 82000000,
        "value": "#000"
    },
    {
        "chr": "10",
        "end": 89600000,
       "label":"q23.2","type":"gneg",
        "start": 87900000,
        "value": "#ffffff"
    },
    {
        "chr": "10",
        "end": 92900000,
       "label":"q23.31","type":"gpos75",
        "start": 89600000,
        "value": "#828282"
    },
    {
        "chr": "10",
        "end": 94200000,
       "label":"q23.32","type":"gneg",
        "start": 92900000,
        "value": "#ffffff"
    },
    {
        "chr": "10",
        "end": 98000000,
       "label":"q23.33","type":"gpos50",
        "start": 94200000,
        "value": "#c8c8c8"
    },
    {
        "chr": "10",
        "end": 99400000,
       "label":"q24.1","type":"gneg",
        "start": 98000000,
        "value": "#ffffff"
    },
    {
        "chr": "10",
        "end": 102000000,
       "label":"q24.2","type":"gpos50",
        "start": 99400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "10",
        "end": 103000000,
       "label":"q24.31","type":"gneg",
        "start": 102000000,
        "value": "#ffffff"
    },
    {
        "chr": "10",
        "end": 104900000,
       "label":"q24.32","type":"gpos25",
        "start": 103000000,
        "value": "#c8c8c8"
    },
    {
        "chr": "10",
        "end": 105700000,
       "label":"q24.33","type":"gneg",
        "start": 104900000,
        "value": "#ffffff"
    },
    {
        "chr": "10",
        "end": 111800000,
       "label":"q25.1","type":"gpos100",
        "start": 105700000,
        "value": "#000"
    },
    {
        "chr": "10",
        "end": 114900000,
       "label":"q25.2","type":"gneg",
        "start": 111800000,
        "value": "#ffffff"
    },
    {
        "chr": "10",
        "end": 119100000,
       "label":"q25.3","type":"gpos75",
        "start": 114900000,
        "value": "#828282"
    },
    {
        "chr": "10",
        "end": 121700000,
       "label":"q26.11","type":"gneg",
        "start": 119100000,
        "value": "#ffffff"
    },
    {
        "chr": "10",
        "end": 123100000,
       "label":"q26.12","type":"gpos50",
        "start": 121700000,
        "value": "#c8c8c8"
    },
    {
        "chr": "10",
        "end": 127400000,
       "label":"q26.13","type":"gneg",
        "start": 123100000,
        "value": "#ffffff"
    },
    {
        "chr": "10",
        "end": 130500000,
       "label":"q26.2","type":"gpos50",
        "start": 127400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "10",
        "end": 135374737,
       "label":"q26.3","type":"gneg",
        "start": 130500000,
        "value": "#ffffff"
    },
    {
        "chr": "11",
        "end": 2800000,
       "label":"p15.5","type":"gneg",
        "start": 0,
        "value": "#ffffff"
    },
    {
        "chr": "11",
        "end": 10700000,
       "label":"p15.4","type":"gpos50",
        "start": 2800000,
        "value": "#c8c8c8"
    },
    {
        "chr": "11",
        "end": 12600000,
       "label":"p15.3","type":"gneg",
        "start": 10700000,
        "value": "#ffffff"
    },
    {
        "chr": "11",
        "end": 16100000,
       "label":"p15.2","type":"gpos50",
        "start": 12600000,
        "value": "#c8c8c8"
    },
    {
        "chr": "11",
        "end": 21600000,
       "label":"p15.1","type":"gneg",
        "start": 16100000,
        "value": "#ffffff"
    },
    {
        "chr": "11",
        "end": 26000000,
       "label":"p14.3","type":"gpos100",
        "start": 21600000,
        "value": "#000"
    },
    {
        "chr": "11",
        "end": 27200000,
       "label":"p14.2","type":"gneg",
        "start": 26000000,
        "value": "#ffffff"
    },
    {
        "chr": "11",
        "end": 31000000,
       "label":"p14.1","type":"gpos75",
        "start": 27200000,
        "value": "#828282"
    },
    {
        "chr": "11",
        "end": 36400000,
       "label":"p13","type":"gneg",
        "start": 31000000,
        "value": "#ffffff"
    },
    {
        "chr": "11",
        "end": 43400000,
       "label":"p12","type":"gpos100",
        "start": 36400000,
        "value": "#000"
    },
    {
        "chr": "11",
        "end": 48800000,
       "label":"p11.2","type":"gneg",
        "start": 43400000,
        "value": "#ffffff"
    },
    {
        "chr": "11",
        "end": 51400000,
       "label":"p11.12","type":"gpos75",
        "start": 48800000,
        "value": "#828282"
    },
    {
        "chr": "11",
        "end": 52900000,
       "label":"p11.11","type":"acen",
        "start": 51400000,
        "value": "#d92f27"
    },
    {
        "chr": "11",
        "end": 56400000,
       "label":"q11","type":"acen",
        "start": 52900000,
        "value": "#d92f27"
    },
    {
        "chr": "11",
        "end": 59700000,
       "label":"q12.1","type":"gpos75",
        "start": 56400000,
        "value": "#828282"
    },
    {
        "chr": "11",
        "end": 61400000,
       "label":"q12.2","type":"gneg",
        "start": 59700000,
        "value": "#ffffff"
    },
    {
        "chr": "11",
        "end": 63100000,
       "label":"q12.3","type":"gpos25",
        "start": 61400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "11",
        "end": 67100000,
       "label":"q13.1","type":"gneg",
        "start": 63100000,
        "value": "#ffffff"
    },
    {
        "chr": "11",
        "end": 69200000,
       "label":"q13.2","type":"gpos25",
        "start": 67100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "11",
        "end": 70700000,
       "label":"q13.3","type":"gneg",
        "start": 69200000,
        "value": "#ffffff"
    },
    {
        "chr": "11",
        "end": 74900000,
       "label":"q13.4","type":"gpos50",
        "start": 70700000,
        "value": "#c8c8c8"
    },
    {
        "chr": "11",
        "end": 76700000,
       "label":"q13.5","type":"gneg",
        "start": 74900000,
        "value": "#ffffff"
    },
    {
        "chr": "11",
        "end": 85300000,
       "label":"q14.1","type":"gpos100",
        "start": 76700000,
        "value": "#000"
    },
    {
        "chr": "11",
        "end": 87900000,
       "label":"q14.2","type":"gneg",
        "start": 85300000,
        "value": "#ffffff"
    },
    {
        "chr": "11",
        "end": 92300000,
       "label":"q14.3","type":"gpos100",
        "start": 87900000,
        "value": "#000"
    },
    {
        "chr": "11",
        "end": 96700000,
       "label":"q21","type":"gneg",
        "start": 92300000,
        "value": "#ffffff"
    },
    {
        "chr": "11",
        "end": 101600000,
       "label":"q22.1","type":"gpos100",
        "start": 96700000,
        "value": "#000"
    },
    {
        "chr": "11",
        "end": 102400000,
       "label":"q22.2","type":"gneg",
        "start": 101600000,
        "value": "#ffffff"
    },
    {
        "chr": "11",
        "end": 110000000,
       "label":"q22.3","type":"gpos100",
        "start": 102400000,
        "value": "#000"
    },
    {
        "chr": "11",
        "end": 112800000,
       "label":"q23.1","type":"gneg",
        "start": 110000000,
        "value": "#ffffff"
    },
    {
        "chr": "11",
        "end": 115400000,
       "label":"q23.2","type":"gpos50",
        "start": 112800000,
        "value": "#c8c8c8"
    },
    {
        "chr": "11",
        "end": 120700000,
       "label":"q23.3","type":"gneg",
        "start": 115400000,
        "value": "#ffffff"
    },
    {
        "chr": "11",
        "end": 123500000,
       "label":"q24.1","type":"gpos50",
        "start": 120700000,
        "value": "#c8c8c8"
    },
    {
        "chr": "11",
        "end": 127400000,
       "label":"q24.2","type":"gneg",
        "start": 123500000,
        "value": "#ffffff"
    },
    {
        "chr": "11",
        "end": 130300000,
       "label":"q24.3","type":"gpos50",
        "start": 127400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "11",
        "end": 134452384,
       "label":"q25","type":"gneg",
        "start": 130300000,
        "value": "#ffffff"
    },
    {
        "chr": "12",
        "end": 3100000,
       "label":"p13.33","type":"gneg",
        "start": 0,
        "value": "#ffffff"
    },
    {
        "chr": "12",
        "end": 5300000,
       "label":"p13.32","type":"gpos25",
        "start": 3100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "12",
        "end": 10000000,
       "label":"p13.31","type":"gneg",
        "start": 5300000,
        "value": "#ffffff"
    },
    {
        "chr": "12",
        "end": 12600000,
       "label":"p13.2","type":"gpos75",
        "start": 10000000,
        "value": "#828282"
    },
    {
        "chr": "12",
        "end": 14800000,
       "label":"p13.1","type":"gneg",
        "start": 12600000,
        "value": "#ffffff"
    },
    {
        "chr": "12",
        "end": 19900000,
       "label":"p12.3","type":"gpos100",
        "start": 14800000,
        "value": "#000"
    },
    {
        "chr": "12",
        "end": 21200000,
       "label":"p12.2","type":"gneg",
        "start": 19900000,
        "value": "#ffffff"
    },
    {
        "chr": "12",
        "end": 26300000,
       "label":"p12.1","type":"gpos100",
        "start": 21200000,
        "value": "#000"
    },
    {
        "chr": "12",
        "end": 27700000,
       "label":"p11.23","type":"gneg",
        "start": 26300000,
        "value": "#ffffff"
    },
    {
        "chr": "12",
        "end": 30600000,
       "label":"p11.22","type":"gpos50",
        "start": 27700000,
        "value": "#c8c8c8"
    },
    {
        "chr": "12",
        "end": 33200000,
       "label":"p11.21","type":"gneg",
        "start": 30600000,
        "value": "#ffffff"
    },
    {
        "chr": "12",
        "end": 35400000,
       "label":"p11.1","type":"acen",
        "start": 33200000,
        "value": "#d92f27"
    },
    {
        "chr": "12",
        "end": 36500000,
       "label":"q11","type":"acen",
        "start": 35400000,
        "value": "#d92f27"
    },
    {
        "chr": "12",
        "end": 44600000,
       "label":"q12","type":"gpos100",
        "start": 36500000,
        "value": "#000"
    },
    {
        "chr": "12",
        "end": 47400000,
       "label":"q13.11","type":"gneg",
        "start": 44600000,
        "value": "#ffffff"
    },
    {
        "chr": "12",
        "end": 48400000,
       "label":"q13.12","type":"gpos25",
        "start": 47400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "12",
        "end": 53100000,
       "label":"q13.13","type":"gneg",
        "start": 48400000,
        "value": "#ffffff"
    },
    {
        "chr": "12",
        "end": 55200000,
       "label":"q13.2","type":"gpos25",
        "start": 53100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "12",
        "end": 56300000,
       "label":"q13.3","type":"gneg",
        "start": 55200000,
        "value": "#ffffff"
    },
    {
        "chr": "12",
        "end": 61400000,
       "label":"q14.1","type":"gpos75",
        "start": 56300000,
        "value": "#828282"
    },
    {
        "chr": "12",
        "end": 63400000,
       "label":"q14.2","type":"gneg",
        "start": 61400000,
        "value": "#ffffff"
    },
    {
        "chr": "12",
        "end": 66000000,
       "label":"q14.3","type":"gpos50",
        "start": 63400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "12",
        "end": 69800000,
       "label":"q15","type":"gneg",
        "start": 66000000,
        "value": "#ffffff"
    },
    {
        "chr": "12",
        "end": 74100000,
       "label":"q21.1","type":"gpos75",
        "start": 69800000,
        "value": "#828282"
    },
    {
        "chr": "12",
        "end": 78700000,
       "label":"q21.2","type":"gneg",
        "start": 74100000,
        "value": "#ffffff"
    },
    {
        "chr": "12",
        "end": 85100000,
       "label":"q21.31","type":"gpos100",
        "start": 78700000,
        "value": "#000"
    },
    {
        "chr": "12",
        "end": 87500000,
       "label":"q21.32","type":"gneg",
        "start": 85100000,
        "value": "#ffffff"
    },
    {
        "chr": "12",
        "end": 91200000,
       "label":"q21.33","type":"gpos100",
        "start": 87500000,
        "value": "#000"
    },
    {
        "chr": "12",
        "end": 94800000,
       "label":"q22","type":"gneg",
        "start": 91200000,
        "value": "#ffffff"
    },
    {
        "chr": "12",
        "end": 100000000,
       "label":"q23.1","type":"gpos75",
        "start": 94800000,
        "value": "#828282"
    },
    {
        "chr": "12",
        "end": 102400000,
       "label":"q23.2","type":"gneg",
        "start": 100000000,
        "value": "#ffffff"
    },
    {
        "chr": "12",
        "end": 107500000,
       "label":"q23.3","type":"gpos50",
        "start": 102400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "12",
        "end": 110200000,
       "label":"q24.11","type":"gneg",
        "start": 107500000,
        "value": "#ffffff"
    },
    {
        "chr": "12",
        "end": 110800000,
       "label":"q24.12","type":"gpos25",
        "start": 110200000,
        "value": "#c8c8c8"
    },
    {
        "chr": "12",
        "end": 112800000,
       "label":"q24.13","type":"gneg",
        "start": 110800000,
        "value": "#ffffff"
    },
    {
        "chr": "12",
        "end": 115300000,
       "label":"q24.21","type":"gpos50",
        "start": 112800000,
        "value": "#c8c8c8"
    },
    {
        "chr": "12",
        "end": 116700000,
       "label":"q24.22","type":"gneg",
        "start": 115300000,
        "value": "#ffffff"
    },
    {
        "chr": "12",
        "end": 119100000,
       "label":"q24.23","type":"gpos50",
        "start": 116700000,
        "value": "#c8c8c8"
    },
    {
        "chr": "12",
        "end": 124500000,
       "label":"q24.31","type":"gneg",
        "start": 119100000,
        "value": "#ffffff"
    },
    {
        "chr": "12",
        "end": 128700000,
       "label":"q24.32","type":"gpos50",
        "start": 124500000,
        "value": "#c8c8c8"
    },
    {
        "chr": "12",
        "end": 132349534,
       "label":"q24.33","type":"gneg",
        "start": 128700000,
        "value": "#ffffff"
    },
    {
        "chr": "13",
        "end": 3800000,
       "label":"p13","type":"gvar",
        "start": 0,
        "value": "#dcdcdc"
    },
    {
        "chr": "13",
        "end": 8300000,
       "label":"p12","type":"stalk",
        "start": 3800000,
        "value": "#467fa4"
    },
    {
        "chr": "13",
        "end": 13500000,
       "label":"p11.2","type":"gvar",
        "start": 8300000,
        "value": "#dcdcdc"
    },
    {
        "chr": "13",
        "end": 16000000,
       "label":"p11.1","type":"acen",
        "start": 13500000,
        "value": "#d92f27"
    },
    {
        "chr": "13",
        "end": 18400000,
       "label":"q11","type":"acen",
        "start": 16000000,
        "value": "#d92f27"
    },
    {
        "chr": "13",
        "end": 22200000,
       "label":"q12.11","type":"gneg",
        "start": 18400000,
        "value": "#ffffff"
    },
    {
        "chr": "13",
        "end": 24400000,
       "label":"q12.12","type":"gpos25",
        "start": 22200000,
        "value": "#c8c8c8"
    },
    {
        "chr": "13",
        "end": 26700000,
       "label":"q12.13","type":"gneg",
        "start": 24400000,
        "value": "#ffffff"
    },
    {
        "chr": "13",
        "end": 27800000,
       "label":"q12.2","type":"gpos25",
        "start": 26700000,
        "value": "#c8c8c8"
    },
    {
        "chr": "13",
        "end": 31100000,
       "label":"q12.3","type":"gneg",
        "start": 27800000,
        "value": "#ffffff"
    },
    {
        "chr": "13",
        "end": 32900000,
       "label":"q13.1","type":"gpos50",
        "start": 31100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "13",
        "end": 34700000,
       "label":"q13.2","type":"gneg",
        "start": 32900000,
        "value": "#ffffff"
    },
    {
        "chr": "13",
        "end": 39500000,
       "label":"q13.3","type":"gpos75",
        "start": 34700000,
        "value": "#828282"
    },
    {
        "chr": "13",
        "end": 44300000,
       "label":"q14.11","type":"gneg",
        "start": 39500000,
        "value": "#ffffff"
    },
    {
        "chr": "13",
        "end": 45900000,
       "label":"q14.12","type":"gpos25",
        "start": 44300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "13",
        "end": 46200000,
       "label":"q14.13","type":"gneg",
        "start": 45900000,
        "value": "#ffffff"
    },
    {
        "chr": "13",
        "end": 48900000,
       "label":"q14.2","type":"gpos50",
        "start": 46200000,
        "value": "#c8c8c8"
    },
    {
        "chr": "13",
        "end": 52200000,
       "label":"q14.3","type":"gneg",
        "start": 48900000,
        "value": "#ffffff"
    },
    {
        "chr": "13",
        "end": 57600000,
       "label":"q21.1","type":"gpos100",
        "start": 52200000,
        "value": "#000"
    },
    {
        "chr": "13",
        "end": 60500000,
       "label":"q21.2","type":"gneg",
        "start": 57600000,
        "value": "#ffffff"
    },
    {
        "chr": "13",
        "end": 64100000,
       "label":"q21.31","type":"gpos75",
        "start": 60500000,
        "value": "#828282"
    },
    {
        "chr": "13",
        "end": 67200000,
       "label":"q21.32","type":"gneg",
        "start": 64100000,
        "value": "#ffffff"
    },
    {
        "chr": "13",
        "end": 72100000,
       "label":"q21.33","type":"gpos100",
        "start": 67200000,
        "value": "#000"
    },
    {
        "chr": "13",
        "end": 74200000,
       "label":"q22.1","type":"gneg",
        "start": 72100000,
        "value": "#ffffff"
    },
    {
        "chr": "13",
        "end": 76000000,
       "label":"q22.2","type":"gpos50",
        "start": 74200000,
        "value": "#c8c8c8"
    },
    {
        "chr": "13",
        "end": 77800000,
       "label":"q22.3","type":"gneg",
        "start": 76000000,
        "value": "#ffffff"
    },
    {
        "chr": "13",
        "end": 86500000,
       "label":"q31.1","type":"gpos100",
        "start": 77800000,
        "value": "#000"
    },
    {
        "chr": "13",
        "end": 88800000,
       "label":"q31.2","type":"gneg",
        "start": 86500000,
        "value": "#ffffff"
    },
    {
        "chr": "13",
        "end": 93800000,
       "label":"q31.3","type":"gpos100",
        "start": 88800000,
        "value": "#000"
    },
    {
        "chr": "13",
        "end": 97000000,
       "label":"q32.1","type":"gneg",
        "start": 93800000,
        "value": "#ffffff"
    },
    {
        "chr": "13",
        "end": 98100000,
       "label":"q32.2","type":"gpos25",
        "start": 97000000,
        "value": "#c8c8c8"
    },
    {
        "chr": "13",
        "end": 100500000,
       "label":"q32.3","type":"gneg",
        "start": 98100000,
        "value": "#ffffff"
    },
    {
        "chr": "13",
        "end": 103700000,
       "label":"q33.1","type":"gpos100",
        "start": 100500000,
        "value": "#000"
    },
    {
        "chr": "13",
        "end": 105800000,
       "label":"q33.2","type":"gneg",
        "start": 103700000,
        "value": "#ffffff"
    },
    {
        "chr": "13",
        "end": 109100000,
       "label":"q33.3","type":"gpos100",
        "start": 105800000,
        "value": "#000"
    },
    {
        "chr": "13",
        "end": 114142980,
       "label":"q34","type":"gneg",
        "start": 109100000,
        "value": "#ffffff"
    },
    {
        "chr": "14",
        "end": 3100000,
       "label":"p13","type":"gvar",
        "start": 0,
        "value": "#dcdcdc"
    },
    {
        "chr": "14",
        "end": 6700000,
       "label":"p12","type":"stalk",
        "start": 3100000,
        "value": "#467fa4"
    },
    {
        "chr": "14",
        "end": 13600000,
       "label":"p11.2","type":"gvar",
        "start": 6700000,
        "value": "#dcdcdc"
    },
    {
        "chr": "14",
        "end": 15600000,
       "label":"p11.1","type":"acen",
        "start": 13600000,
        "value": "#d92f27"
    },
    {
        "chr": "14",
        "end": 19100000,
       "label":"q11.1","type":"acen",
        "start": 15600000,
        "value": "#d92f27"
    },
    {
        "chr": "14",
        "end": 23600000,
       "label":"q11.2","type":"gneg",
        "start": 19100000,
        "value": "#ffffff"
    },
    {
        "chr": "14",
        "end": 31800000,
       "label":"q12","type":"gpos100",
        "start": 23600000,
        "value": "#000"
    },
    {
        "chr": "14",
        "end": 34100000,
       "label":"q13.1","type":"gneg",
        "start": 31800000,
        "value": "#ffffff"
    },
    {
        "chr": "14",
        "end": 35600000,
       "label":"q13.2","type":"gpos50",
        "start": 34100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "14",
        "end": 36900000,
       "label":"q13.3","type":"gneg",
        "start": 35600000,
        "value": "#ffffff"
    },
    {
        "chr": "14",
        "end": 41000000,
       "label":"q21.1","type":"gpos100",
        "start": 36900000,
        "value": "#000"
    },
    {
        "chr": "14",
        "end": 43200000,
       "label":"q21.2","type":"gneg",
        "start": 41000000,
        "value": "#ffffff"
    },
    {
        "chr": "14",
        "end": 48300000,
       "label":"q21.3","type":"gpos100",
        "start": 43200000,
        "value": "#000"
    },
    {
        "chr": "14",
        "end": 52300000,
       "label":"q22.1","type":"gneg",
        "start": 48300000,
        "value": "#ffffff"
    },
    {
        "chr": "14",
        "end": 54400000,
       "label":"q22.2","type":"gpos25",
        "start": 52300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "14",
        "end": 55800000,
       "label":"q22.3","type":"gneg",
        "start": 54400000,
        "value": "#ffffff"
    },
    {
        "chr": "14",
        "end": 61200000,
       "label":"q23.1","type":"gpos75",
        "start": 55800000,
        "value": "#828282"
    },
    {
        "chr": "14",
        "end": 64000000,
       "label":"q23.2","type":"gneg",
        "start": 61200000,
        "value": "#ffffff"
    },
    {
        "chr": "14",
        "end": 67000000,
       "label":"q23.3","type":"gpos50",
        "start": 64000000,
        "value": "#c8c8c8"
    },
    {
        "chr": "14",
        "end": 69300000,
       "label":"q24.1","type":"gneg",
        "start": 67000000,
        "value": "#ffffff"
    },
    {
        "chr": "14",
        "end": 72900000,
       "label":"q24.2","type":"gpos50",
        "start": 69300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "14",
        "end": 78400000,
       "label":"q24.3","type":"gneg",
        "start": 72900000,
        "value": "#ffffff"
    },
    {
        "chr": "14",
        "end": 82600000,
       "label":"q31.1","type":"gpos100",
        "start": 78400000,
        "value": "#000"
    },
    {
        "chr": "14",
        "end": 84000000,
       "label":"q31.2","type":"gneg",
        "start": 82600000,
        "value": "#ffffff"
    },
    {
        "chr": "14",
        "end": 88900000,
       "label":"q31.3","type":"gpos100",
        "start": 84000000,
        "value": "#000"
    },
    {
        "chr": "14",
        "end": 90500000,
       "label":"q32.11","type":"gneg",
        "start": 88900000,
        "value": "#ffffff"
    },
    {
        "chr": "14",
        "end": 92800000,
       "label":"q32.12","type":"gpos25",
        "start": 90500000,
        "value": "#c8c8c8"
    },
    {
        "chr": "14",
        "end": 95400000,
       "label":"q32.13","type":"gneg",
        "start": 92800000,
        "value": "#ffffff"
    },
    {
        "chr": "14",
        "end": 100400000,
       "label":"q32.2","type":"gpos50",
        "start": 95400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "14",
        "end": 102200000,
       "label":"q32.31","type":"gneg",
        "start": 100400000,
        "value": "#ffffff"
    },
    {
        "chr": "14",
        "end": 103000000,
       "label":"q32.32","type":"gpos50",
        "start": 102200000,
        "value": "#c8c8c8"
    },
    {
        "chr": "14",
        "end": 106368585,
       "label":"q32.33","type":"gneg",
        "start": 103000000,
        "value": "#ffffff"
    },
    {
        "chr": "15",
        "end": 3500000,
       "label":"p13","type":"gvar",
        "start": 0,
        "value": "#dcdcdc"
    },
    {
        "chr": "15",
        "end": 7900000,
       "label":"p12","type":"stalk",
        "start": 3500000,
        "value": "#467fa4"
    },
    {
        "chr": "15",
        "end": 14100000,
       "label":"p11.2","type":"gvar",
        "start": 7900000,
        "value": "#dcdcdc"
    },
    {
        "chr": "15",
        "end": 17000000,
       "label":"p11.1","type":"acen",
        "start": 14100000,
        "value": "#d92f27"
    },
    {
        "chr": "15",
        "end": 18400000,
       "label":"q11.1","type":"acen",
        "start": 17000000,
        "value": "#d92f27"
    },
    {
        "chr": "15",
        "end": 23300000,
       "label":"q11.2","type":"gneg",
        "start": 18400000,
        "value": "#ffffff"
    },
    {
        "chr": "15",
        "end": 25700000,
       "label":"q12","type":"gpos50",
        "start": 23300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "15",
        "end": 28000000,
       "label":"q13.1","type":"gneg",
        "start": 25700000,
        "value": "#ffffff"
    },
    {
        "chr": "15",
        "end": 29000000,
       "label":"q13.2","type":"gpos50",
        "start": 28000000,
        "value": "#c8c8c8"
    },
    {
        "chr": "15",
        "end": 31400000,
       "label":"q13.3","type":"gneg",
        "start": 29000000,
        "value": "#ffffff"
    },
    {
        "chr": "15",
        "end": 37900000,
       "label":"q14","type":"gpos75",
        "start": 31400000,
        "value": "#828282"
    },
    {
        "chr": "15",
        "end": 40700000,
       "label":"q15.1","type":"gneg",
        "start": 37900000,
        "value": "#ffffff"
    },
    {
        "chr": "15",
        "end": 41400000,
       "label":"q15.2","type":"gpos25",
        "start": 40700000,
        "value": "#c8c8c8"
    },
    {
        "chr": "15",
        "end": 42700000,
       "label":"q15.3","type":"gneg",
        "start": 41400000,
        "value": "#ffffff"
    },
    {
        "chr": "15",
        "end": 47600000,
       "label":"q21.1","type":"gpos75",
        "start": 42700000,
        "value": "#828282"
    },
    {
        "chr": "15",
        "end": 51100000,
       "label":"q21.2","type":"gneg",
        "start": 47600000,
        "value": "#ffffff"
    },
    {
        "chr": "15",
        "end": 55800000,
       "label":"q21.3","type":"gpos75",
        "start": 51100000,
        "value": "#828282"
    },
    {
        "chr": "15",
        "end": 57100000,
       "label":"q22.1","type":"gneg",
        "start": 55800000,
        "value": "#ffffff"
    },
    {
        "chr": "15",
        "end": 61500000,
       "label":"q22.2","type":"gpos25",
        "start": 57100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "15",
        "end": 64900000,
       "label":"q22.31","type":"gneg",
        "start": 61500000,
        "value": "#ffffff"
    },
    {
        "chr": "15",
        "end": 65000000,
       "label":"q22.32","type":"gpos25",
        "start": 64900000,
        "value": "#c8c8c8"
    },
    {
        "chr": "15",
        "end": 65300000,
       "label":"q22.33","type":"gneg",
        "start": 65000000,
        "value": "#ffffff"
    },
    {
        "chr": "15",
        "end": 70400000,
       "label":"q23","type":"gpos25",
        "start": 65300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "15",
        "end": 73100000,
       "label":"q24.1","type":"gneg",
        "start": 70400000,
        "value": "#ffffff"
    },
    {
        "chr": "15",
        "end": 74400000,
       "label":"q24.2","type":"gpos25",
        "start": 73100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "15",
        "end": 76100000,
       "label":"q24.3","type":"gneg",
        "start": 74400000,
        "value": "#ffffff"
    },
    {
        "chr": "15",
        "end": 79500000,
       "label":"q25.1","type":"gpos50",
        "start": 76100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "15",
        "end": 83000000,
       "label":"q25.2","type":"gneg",
        "start": 79500000,
        "value": "#ffffff"
    },
    {
        "chr": "15",
        "end": 86900000,
       "label":"q25.3","type":"gpos50",
        "start": 83000000,
        "value": "#c8c8c8"
    },
    {
        "chr": "15",
        "end": 92100000,
       "label":"q26.1","type":"gneg",
        "start": 86900000,
        "value": "#ffffff"
    },
    {
        "chr": "15",
        "end": 96300000,
       "label":"q26.2","type":"gpos50",
        "start": 92100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "15",
        "end": 100338915,
       "label":"q26.3","type":"gneg",
        "start": 96300000,
        "value": "#ffffff"
    },
    {
        "chr": "16",
        "end": 6300000,
       "label":"p13.3","type":"gneg",
        "start": 0,
        "value": "#ffffff"
    },
    {
        "chr": "16",
        "end": 10300000,
       "label":"p13.2","type":"gpos50",
        "start": 6300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "16",
        "end": 12500000,
       "label":"p13.13","type":"gneg",
        "start": 10300000,
        "value": "#ffffff"
    },
    {
        "chr": "16",
        "end": 14700000,
       "label":"p13.12","type":"gpos50",
        "start": 12500000,
        "value": "#c8c8c8"
    },
    {
        "chr": "16",
        "end": 16700000,
       "label":"p13.11","type":"gneg",
        "start": 14700000,
        "value": "#ffffff"
    },
    {
        "chr": "16",
        "end": 20500000,
       "label":"p12.3","type":"gpos50",
        "start": 16700000,
        "value": "#c8c8c8"
    },
    {
        "chr": "16",
        "end": 21700000,
       "label":"p12.2","type":"gneg",
        "start": 20500000,
        "value": "#ffffff"
    },
    {
        "chr": "16",
        "end": 27600000,
       "label":"p12.1","type":"gpos50",
        "start": 21700000,
        "value": "#c8c8c8"
    },
    {
        "chr": "16",
        "end": 34400000,
       "label":"p11.2","type":"gneg",
        "start": 27600000,
        "value": "#ffffff"
    },
    {
        "chr": "16",
        "end": 38200000,
       "label":"p11.1","type":"acen",
        "start": 34400000,
        "value": "#d92f27"
    },
    {
        "chr": "16",
        "end": 40700000,
       "label":"q11.1","type":"acen",
        "start": 38200000,
        "value": "#d92f27"
    },
    {
        "chr": "16",
        "end": 45500000,
       "label":"q11.2","type":"gvar",
        "start": 40700000,
        "value": "#dcdcdc"
    },
    {
        "chr": "16",
        "end": 51200000,
       "label":"q12.1","type":"gneg",
        "start": 45500000,
        "value": "#ffffff"
    },
    {
        "chr": "16",
        "end": 54500000,
       "label":"q12.2","type":"gpos50",
        "start": 51200000,
        "value": "#c8c8c8"
    },
    {
        "chr": "16",
        "end": 56700000,
       "label":"q13","type":"gneg",
        "start": 54500000,
        "value": "#ffffff"
    },
    {
        "chr": "16",
        "end": 65200000,
       "label":"q21","type":"gpos100",
        "start": 56700000,
        "value": "#000"
    },
    {
        "chr": "16",
        "end": 69400000,
       "label":"q22.1","type":"gneg",
        "start": 65200000,
        "value": "#ffffff"
    },
    {
        "chr": "16",
        "end": 69800000,
       "label":"q22.2","type":"gpos50",
        "start": 69400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "16",
        "end": 73300000,
       "label":"q22.3","type":"gneg",
        "start": 69800000,
        "value": "#ffffff"
    },
    {
        "chr": "16",
        "end": 78200000,
       "label":"q23.1","type":"gpos75",
        "start": 73300000,
        "value": "#828282"
    },
    {
        "chr": "16",
        "end": 80500000,
       "label":"q23.2","type":"gneg",
        "start": 78200000,
        "value": "#ffffff"
    },
    {
        "chr": "16",
        "end": 82700000,
       "label":"q23.3","type":"gpos50",
        "start": 80500000,
        "value": "#c8c8c8"
    },
    {
        "chr": "16",
        "end": 85600000,
       "label":"q24.1","type":"gneg",
        "start": 82700000,
        "value": "#ffffff"
    },
    {
        "chr": "16",
        "end": 87200000,
       "label":"q24.2","type":"gpos25",
        "start": 85600000,
        "value": "#c8c8c8"
    },
    {
        "chr": "16",
        "end": 88827254,
       "label":"q24.3","type":"gneg",
        "start": 87200000,
        "value": "#ffffff"
    },
    {
        "chr": "17",
        "end": 3600000,
       "label":"p13.3","type":"gneg",
        "start": 0,
        "value": "#ffffff"
    },
    {
        "chr": "17",
        "end": 6800000,
       "label":"p13.2","type":"gpos50",
        "start": 3600000,
        "value": "#c8c8c8"
    },
    {
        "chr": "17",
        "end": 11200000,
       "label":"p13.1","type":"gneg",
        "start": 6800000,
        "value": "#ffffff"
    },
    {
        "chr": "17",
        "end": 15900000,
       "label":"p12","type":"gpos75",
        "start": 11200000,
        "value": "#828282"
    },
    {
        "chr": "17",
        "end": 22100000,
       "label":"p11.2","type":"gneg",
        "start": 15900000,
        "value": "#ffffff"
    },
    {
        "chr": "17",
        "end": 22200000,
       "label":"p11.1","type":"acen",
        "start": 22100000,
        "value": "#d92f27"
    },
    {
        "chr": "17",
        "end": 23200000,
       "label":"q11.1","type":"acen",
        "start": 22200000,
        "value": "#d92f27"
    },
    {
        "chr": "17",
        "end": 28800000,
       "label":"q11.2","type":"gneg",
        "start": 23200000,
        "value": "#ffffff"
    },
    {
        "chr": "17",
        "end": 35400000,
       "label":"q12","type":"gpos50",
        "start": 28800000,
        "value": "#c8c8c8"
    },
    {
        "chr": "17",
        "end": 35600000,
       "label":"q21.1","type":"gneg",
        "start": 35400000,
        "value": "#ffffff"
    },
    {
        "chr": "17",
        "end": 37800000,
       "label":"q21.2","type":"gpos25",
        "start": 35600000,
        "value": "#c8c8c8"
    },
    {
        "chr": "17",
        "end": 41900000,
       "label":"q21.31","type":"gneg",
        "start": 37800000,
        "value": "#ffffff"
    },
    {
        "chr": "17",
        "end": 44800000,
       "label":"q21.32","type":"gpos25",
        "start": 41900000,
        "value": "#c8c8c8"
    },
    {
        "chr": "17",
        "end": 47600000,
       "label":"q21.33","type":"gneg",
        "start": 44800000,
        "value": "#ffffff"
    },
    {
        "chr": "17",
        "end": 54900000,
       "label":"q22","type":"gpos75",
        "start": 47600000,
        "value": "#828282"
    },
    {
        "chr": "17",
        "end": 55600000,
       "label":"q23.1","type":"gneg",
        "start": 54900000,
        "value": "#ffffff"
    },
    {
        "chr": "17",
        "end": 58400000,
       "label":"q23.2","type":"gpos75",
        "start": 55600000,
        "value": "#828282"
    },
    {
        "chr": "17",
        "end": 59900000,
       "label":"q23.3","type":"gneg",
        "start": 58400000,
        "value": "#ffffff"
    },
    {
        "chr": "17",
        "end": 61600000,
       "label":"q24.1","type":"gpos50",
        "start": 59900000,
        "value": "#c8c8c8"
    },
    {
        "chr": "17",
        "end": 64600000,
       "label":"q24.2","type":"gneg",
        "start": 61600000,
        "value": "#ffffff"
    },
    {
        "chr": "17",
        "end": 68400000,
       "label":"q24.3","type":"gpos75",
        "start": 64600000,
        "value": "#828282"
    },
    {
        "chr": "17",
        "end": 72200000,
       "label":"q25.1","type":"gneg",
        "start": 68400000,
        "value": "#ffffff"
    },
    {
        "chr": "17",
        "end": 72900000,
       "label":"q25.2","type":"gpos25",
        "start": 72200000,
        "value": "#c8c8c8"
    },
    {
        "chr": "17",
        "end": 78774742,
       "label":"q25.3","type":"gneg",
        "start": 72900000,
        "value": "#ffffff"
    },
    {
        "chr": "18",
        "end": 2900000,
       "label":"p11.32","type":"gneg",
        "start": 0,
        "value": "#ffffff"
    },
    {
        "chr": "18",
        "end": 7200000,
       "label":"p11.31","type":"gpos50",
        "start": 2900000,
        "value": "#c8c8c8"
    },
    {
        "chr": "18",
        "end": 8500000,
       "label":"p11.23","type":"gneg",
        "start": 7200000,
        "value": "#ffffff"
    },
    {
        "chr": "18",
        "end": 10900000,
       "label":"p11.22","type":"gpos25",
        "start": 8500000,
        "value": "#c8c8c8"
    },
    {
        "chr": "18",
        "end": 15400000,
       "label":"p11.21","type":"gneg",
        "start": 10900000,
        "value": "#ffffff"
    },
    {
        "chr": "18",
        "end": 16100000,
       "label":"p11.1","type":"acen",
        "start": 15400000,
        "value": "#d92f27"
    },
    {
        "chr": "18",
        "end": 17300000,
       "label":"q11.1","type":"acen",
        "start": 16100000,
        "value": "#d92f27"
    },
    {
        "chr": "18",
        "end": 23300000,
       "label":"q11.2","type":"gneg",
        "start": 17300000,
        "value": "#ffffff"
    },
    {
        "chr": "18",
        "end": 31000000,
       "label":"q12.1","type":"gpos100",
        "start": 23300000,
        "value": "#000"
    },
    {
        "chr": "18",
        "end": 35500000,
       "label":"q12.2","type":"gneg",
        "start": 31000000,
        "value": "#ffffff"
    },
    {
        "chr": "18",
        "end": 41800000,
       "label":"q12.3","type":"gpos75",
        "start": 35500000,
        "value": "#828282"
    },
    {
        "chr": "18",
        "end": 46400000,
       "label":"q21.1","type":"gneg",
        "start": 41800000,
        "value": "#ffffff"
    },
    {
        "chr": "18",
        "end": 52000000,
       "label":"q21.2","type":"gpos75",
        "start": 46400000,
        "value": "#828282"
    },
    {
        "chr": "18",
        "end": 54400000,
       "label":"q21.31","type":"gneg",
        "start": 52000000,
        "value": "#ffffff"
    },
    {
        "chr": "18",
        "end": 57100000,
       "label":"q21.32","type":"gpos50",
        "start": 54400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "18",
        "end": 59800000,
       "label":"q21.33","type":"gneg",
        "start": 57100000,
        "value": "#ffffff"
    },
    {
        "chr": "18",
        "end": 64900000,
       "label":"q22.1","type":"gpos100",
        "start": 59800000,
        "value": "#000"
    },
    {
        "chr": "18",
        "end": 66900000,
       "label":"q22.2","type":"gneg",
        "start": 64900000,
        "value": "#ffffff"
    },
    {
        "chr": "18",
        "end": 71300000,
       "label":"q22.3","type":"gpos25",
        "start": 66900000,
        "value": "#c8c8c8"
    },
    {
        "chr": "18",
        "end": 76117153,
       "label":"q23","type":"gneg",
        "start": 71300000,
        "value": "#ffffff"
    },
    {
        "chr": "19",
        "end": 6900000,
       "label":"p13.3","type":"gneg",
        "start": 0,
        "value": "#ffffff"
    },
    {
        "chr": "19",
        "end": 12600000,
       "label":"p13.2","type":"gpos25",
        "start": 6900000,
        "value": "#c8c8c8"
    },
    {
        "chr": "19",
        "end": 13800000,
       "label":"p13.13","type":"gneg",
        "start": 12600000,
        "value": "#ffffff"
    },
    {
        "chr": "19",
        "end": 16100000,
       "label":"p13.12","type":"gpos25",
        "start": 13800000,
        "value": "#c8c8c8"
    },
    {
        "chr": "19",
        "end": 19800000,
       "label":"p13.11","type":"gneg",
        "start": 16100000,
        "value": "#ffffff"
    },
    {
        "chr": "19",
        "end": 26700000,
       "label":"p12","type":"gvar",
        "start": 19800000,
        "value": "#dcdcdc"
    },
    {
        "chr": "19",
        "end": 28500000,
       "label":"p11","type":"acen",
        "start": 26700000,
        "value": "#d92f27"
    },
    {
        "chr": "19",
        "end": 30200000,
       "label":"q11","type":"acen",
        "start": 28500000,
        "value": "#d92f27"
    },
    {
        "chr": "19",
        "end": 37100000,
       "label":"q12","type":"gvar",
        "start": 30200000,
        "value": "#dcdcdc"
    },
    {
        "chr": "19",
        "end": 40300000,
       "label":"q13.11","type":"gneg",
        "start": 37100000,
        "value": "#ffffff"
    },
    {
        "chr": "19",
        "end": 43000000,
       "label":"q13.12","type":"gpos25",
        "start": 40300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "19",
        "end": 43400000,
       "label":"q13.13","type":"gneg",
        "start": 43000000,
        "value": "#ffffff"
    },
    {
        "chr": "19",
        "end": 47800000,
       "label":"q13.2","type":"gpos25",
        "start": 43400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "19",
        "end": 50000000,
       "label":"q13.31","type":"gneg",
        "start": 47800000,
        "value": "#ffffff"
    },
    {
        "chr": "19",
        "end": 53800000,
       "label":"q13.32","type":"gpos25",
        "start": 50000000,
        "value": "#c8c8c8"
    },
    {
        "chr": "19",
        "end": 57600000,
       "label":"q13.33","type":"gneg",
        "start": 53800000,
        "value": "#ffffff"
    },
    {
        "chr": "19",
        "end": 59100000,
       "label":"q13.41","type":"gpos25",
        "start": 57600000,
        "value": "#c8c8c8"
    },
    {
        "chr": "19",
        "end": 61400000,
       "label":"q13.42","type":"gneg",
        "start": 59100000,
        "value": "#ffffff"
    },
    {
        "chr": "19",
        "end": 63811651,
       "label":"q13.43","type":"gpos25",
        "start": 61400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "2",
        "end": 4300000,
       "label":"p25.3","type":"gneg",
        "start": 0,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 7000000,
       "label":"p25.2","type":"gpos50",
        "start": 4300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "2",
        "end": 12800000,
       "label":"p25.1","type":"gneg",
        "start": 7000000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 17000000,
       "label":"p24.3","type":"gpos75",
        "start": 12800000,
        "value": "#828282"
    },
    {
        "chr": "2",
        "end": 19100000,
       "label":"p24.2","type":"gneg",
        "start": 17000000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 23900000,
       "label":"p24.1","type":"gpos75",
        "start": 19100000,
        "value": "#828282"
    },
    {
        "chr": "2",
        "end": 27700000,
       "label":"p23.3","type":"gneg",
        "start": 23900000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 29800000,
       "label":"p23.2","type":"gpos25",
        "start": 27700000,
        "value": "#c8c8c8"
    },
    {
        "chr": "2",
        "end": 31900000,
       "label":"p23.1","type":"gneg",
        "start": 29800000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 36400000,
       "label":"p22.3","type":"gpos75",
        "start": 31900000,
        "value": "#828282"
    },
    {
        "chr": "2",
        "end": 38400000,
       "label":"p22.2","type":"gneg",
        "start": 36400000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 41600000,
       "label":"p22.1","type":"gpos50",
        "start": 38400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "2",
        "end": 47600000,
       "label":"p21","type":"gneg",
        "start": 41600000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 52700000,
       "label":"p16.3","type":"gpos100",
        "start": 47600000,
        "value": "#000"
    },
    {
        "chr": "2",
        "end": 54800000,
       "label":"p16.2","type":"gneg",
        "start": 52700000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 61100000,
       "label":"p16.1","type":"gpos100",
        "start": 54800000,
        "value": "#000"
    },
    {
        "chr": "2",
        "end": 64000000,
       "label":"p15","type":"gneg",
        "start": 61100000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 70500000,
       "label":"p14","type":"gpos50",
        "start": 64000000,
        "value": "#c8c8c8"
    },
    {
        "chr": "2",
        "end": 72600000,
       "label":"p13.3","type":"gneg",
        "start": 70500000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 73900000,
       "label":"p13.2","type":"gpos50",
        "start": 72600000,
        "value": "#c8c8c8"
    },
    {
        "chr": "2",
        "end": 75400000,
       "label":"p13.1","type":"gneg",
        "start": 73900000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 83700000,
       "label":"p12","type":"gpos100",
        "start": 75400000,
        "value": "#000"
    },
    {
        "chr": "2",
        "end": 91000000,
       "label":"p11.2","type":"gneg",
        "start": 83700000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 93300000,
       "label":"p11.1","type":"acen",
        "start": 91000000,
        "value": "#d92f27"
    },
    {
        "chr": "2",
        "end": 95700000,
       "label":"q11.1","type":"acen",
        "start": 93300000,
        "value": "#d92f27"
    },
    {
        "chr": "2",
        "end": 102100000,
       "label":"q11.2","type":"gneg",
        "start": 95700000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 105300000,
       "label":"q12.1","type":"gpos50",
        "start": 102100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "2",
        "end": 106700000,
       "label":"q12.2","type":"gneg",
        "start": 105300000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 108600000,
       "label":"q12.3","type":"gpos25",
        "start": 106700000,
        "value": "#c8c8c8"
    },
    {
        "chr": "2",
        "end": 113800000,
       "label":"q13","type":"gneg",
        "start": 108600000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 118600000,
       "label":"q14.1","type":"gpos50",
        "start": 113800000,
        "value": "#c8c8c8"
    },
    {
        "chr": "2",
        "end": 122100000,
       "label":"q14.2","type":"gneg",
        "start": 118600000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 129600000,
       "label":"q14.3","type":"gpos50",
        "start": 122100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "2",
        "end": 132200000,
       "label":"q21.1","type":"gneg",
        "start": 129600000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 134800000,
       "label":"q21.2","type":"gpos25",
        "start": 132200000,
        "value": "#c8c8c8"
    },
    {
        "chr": "2",
        "end": 136600000,
       "label":"q21.3","type":"gneg",
        "start": 134800000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 142400000,
       "label":"q22.1","type":"gpos100",
        "start": 136600000,
        "value": "#000"
    },
    {
        "chr": "2",
        "end": 144700000,
       "label":"q22.2","type":"gneg",
        "start": 142400000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 148400000,
       "label":"q22.3","type":"gpos100",
        "start": 144700000,
        "value": "#000"
    },
    {
        "chr": "2",
        "end": 149600000,
       "label":"q23.1","type":"gneg",
        "start": 148400000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 150300000,
       "label":"q23.2","type":"gpos25",
        "start": 149600000,
        "value": "#c8c8c8"
    },
    {
        "chr": "2",
        "end": 154600000,
       "label":"q23.3","type":"gneg",
        "start": 150300000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 159600000,
       "label":"q24.1","type":"gpos75",
        "start": 154600000,
        "value": "#828282"
    },
    {
        "chr": "2",
        "end": 163500000,
       "label":"q24.2","type":"gneg",
        "start": 159600000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 169500000,
       "label":"q24.3","type":"gpos75",
        "start": 163500000,
        "value": "#828282"
    },
    {
        "chr": "2",
        "end": 177700000,
       "label":"q31.1","type":"gneg",
        "start": 169500000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 180400000,
       "label":"q31.2","type":"gpos50",
        "start": 177700000,
        "value": "#c8c8c8"
    },
    {
        "chr": "2",
        "end": 182700000,
       "label":"q31.3","type":"gneg",
        "start": 180400000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 189100000,
       "label":"q32.1","type":"gpos75",
        "start": 182700000,
        "value": "#828282"
    },
    {
        "chr": "2",
        "end": 191600000,
       "label":"q32.2","type":"gneg",
        "start": 189100000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 197100000,
       "label":"q32.3","type":"gpos75",
        "start": 191600000,
        "value": "#828282"
    },
    {
        "chr": "2",
        "end": 203500000,
       "label":"q33.1","type":"gneg",
        "start": 197100000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 205600000,
       "label":"q33.2","type":"gpos50",
        "start": 203500000,
        "value": "#c8c8c8"
    },
    {
        "chr": "2",
        "end": 209100000,
       "label":"q33.3","type":"gneg",
        "start": 205600000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 215100000,
       "label":"q34","type":"gpos100",
        "start": 209100000,
        "value": "#000"
    },
    {
        "chr": "2",
        "end": 221300000,
       "label":"q35","type":"gneg",
        "start": 215100000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 224900000,
       "label":"q36.1","type":"gpos75",
        "start": 221300000,
        "value": "#828282"
    },
    {
        "chr": "2",
        "end": 225800000,
       "label":"q36.2","type":"gneg",
        "start": 224900000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 230700000,
       "label":"q36.3","type":"gpos100",
        "start": 225800000,
        "value": "#000"
    },
    {
        "chr": "2",
        "end": 235300000,
       "label":"q37.1","type":"gneg",
        "start": 230700000,
        "value": "#ffffff"
    },
    {
        "chr": "2",
        "end": 237000000,
       "label":"q37.2","type":"gpos50",
        "start": 235300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "2",
        "end": 242951149,
       "label":"q37.3","type":"gneg",
        "start": 237000000,
        "value": "#ffffff"
    },
    {
        "chr": "20",
        "end": 5000000,
       "label":"p13","type":"gneg",
        "start": 0,
        "value": "#ffffff"
    },
    {
        "chr": "20",
        "end": 9000000,
       "label":"p12.3","type":"gpos75",
        "start": 5000000,
        "value": "#828282"
    },
    {
        "chr": "20",
        "end": 11900000,
       "label":"p12.2","type":"gneg",
        "start": 9000000,
        "value": "#ffffff"
    },
    {
        "chr": "20",
        "end": 17800000,
       "label":"p12.1","type":"gpos75",
        "start": 11900000,
        "value": "#828282"
    },
    {
        "chr": "20",
        "end": 21200000,
       "label":"p11.23","type":"gneg",
        "start": 17800000,
        "value": "#ffffff"
    },
    {
        "chr": "20",
        "end": 22300000,
       "label":"p11.22","type":"gpos25",
        "start": 21200000,
        "value": "#c8c8c8"
    },
    {
        "chr": "20",
        "end": 25700000,
       "label":"p11.21","type":"gneg",
        "start": 22300000,
        "value": "#ffffff"
    },
    {
        "chr": "20",
        "end": 27100000,
       "label":"p11.1","type":"acen",
        "start": 25700000,
        "value": "#d92f27"
    },
    {
        "chr": "20",
        "end": 28400000,
       "label":"q11.1","type":"acen",
        "start": 27100000,
        "value": "#d92f27"
    },
    {
        "chr": "20",
        "end": 31500000,
       "label":"q11.21","type":"gneg",
        "start": 28400000,
        "value": "#ffffff"
    },
    {
        "chr": "20",
        "end": 33900000,
       "label":"q11.22","type":"gpos25",
        "start": 31500000,
        "value": "#c8c8c8"
    },
    {
        "chr": "20",
        "end": 37100000,
       "label":"q11.23","type":"gneg",
        "start": 33900000,
        "value": "#ffffff"
    },
    {
        "chr": "20",
        "end": 41100000,
       "label":"q12","type":"gpos75",
        "start": 37100000,
        "value": "#828282"
    },
    {
        "chr": "20",
        "end": 41600000,
       "label":"q13.11","type":"gneg",
        "start": 41100000,
        "value": "#ffffff"
    },
    {
        "chr": "20",
        "end": 45800000,
       "label":"q13.12","type":"gpos25",
        "start": 41600000,
        "value": "#c8c8c8"
    },
    {
        "chr": "20",
        "end": 49200000,
       "label":"q13.13","type":"gneg",
        "start": 45800000,
        "value": "#ffffff"
    },
    {
        "chr": "20",
        "end": 54400000,
       "label":"q13.2","type":"gpos75",
        "start": 49200000,
        "value": "#828282"
    },
    {
        "chr": "20",
        "end": 55900000,
       "label":"q13.31","type":"gneg",
        "start": 54400000,
        "value": "#ffffff"
    },
    {
        "chr": "20",
        "end": 57900000,
       "label":"q13.32","type":"gpos50",
        "start": 55900000,
        "value": "#c8c8c8"
    },
    {
        "chr": "20",
        "end": 62435964,
       "label":"q13.33","type":"gneg",
        "start": 57900000,
        "value": "#ffffff"
    },
    {
        "chr": "21",
        "end": 2900000,
       "label":"p13","type":"gvar",
        "start": 0,
        "value": "#dcdcdc"
    },
    {
        "chr": "21",
        "end": 6300000,
       "label":"p12","type":"stalk",
        "start": 2900000,
        "value": "#467fa4"
    },
    {
        "chr": "21",
        "end": 10000000,
       "label":"p11.2","type":"gvar",
        "start": 6300000,
        "value": "#dcdcdc"
    },
    {
        "chr": "21",
        "end": 12300000,
       "label":"p11.1","type":"acen",
        "start": 10000000,
        "value": "#d92f27"
    },
    {
        "chr": "21",
        "end": 13200000,
       "label":"q11.1","type":"acen",
        "start": 12300000,
        "value": "#d92f27"
    },
    {
        "chr": "21",
        "end": 15300000,
       "label":"q11.2","type":"gneg",
        "start": 13200000,
        "value": "#ffffff"
    },
    {
        "chr": "21",
        "end": 22900000,
       "label":"q21.1","type":"gpos100",
        "start": 15300000,
        "value": "#000"
    },
    {
        "chr": "21",
        "end": 25800000,
       "label":"q21.2","type":"gneg",
        "start": 22900000,
        "value": "#ffffff"
    },
    {
        "chr": "21",
        "end": 30500000,
       "label":"q21.3","type":"gpos75",
        "start": 25800000,
        "value": "#828282"
    },
    {
        "chr": "21",
        "end": 34700000,
       "label":"q22.11","type":"gneg",
        "start": 30500000,
        "value": "#ffffff"
    },
    {
        "chr": "21",
        "end": 36700000,
       "label":"q22.12","type":"gpos50",
        "start": 34700000,
        "value": "#c8c8c8"
    },
    {
        "chr": "21",
        "end": 38600000,
       "label":"q22.13","type":"gneg",
        "start": 36700000,
        "value": "#ffffff"
    },
    {
        "chr": "21",
        "end": 41400000,
       "label":"q22.2","type":"gpos50",
        "start": 38600000,
        "value": "#c8c8c8"
    },
    {
        "chr": "21",
        "end": 46944323,
       "label":"q22.3","type":"gneg",
        "start": 41400000,
        "value": "#ffffff"
    },
    {
        "chr": "22",
        "end": 3000000,
       "label":"p13","type":"gvar",
        "start": 0,
        "value": "#dcdcdc"
    },
    {
        "chr": "22",
        "end": 6600000,
       "label":"p12","type":"stalk",
        "start": 3000000,
        "value": "#467fa4"
    },
    {
        "chr": "22",
        "end": 9600000,
       "label":"p11.2","type":"gvar",
        "start": 6600000,
        "value": "#dcdcdc"
    },
    {
        "chr": "22",
        "end": 11800000,
       "label":"p11.1","type":"acen",
        "start": 9600000,
        "value": "#d92f27"
    },
    {
        "chr": "22",
        "end": 16300000,
       "label":"q11.1","type":"acen",
        "start": 11800000,
        "value": "#d92f27"
    },
    {
        "chr": "22",
        "end": 20500000,
       "label":"q11.21","type":"gneg",
        "start": 16300000,
        "value": "#ffffff"
    },
    {
        "chr": "22",
        "end": 21800000,
       "label":"q11.22","type":"gpos25",
        "start": 20500000,
        "value": "#c8c8c8"
    },
    {
        "chr": "22",
        "end": 24300000,
       "label":"q11.23","type":"gneg",
        "start": 21800000,
        "value": "#ffffff"
    },
    {
        "chr": "22",
        "end": 27900000,
       "label":"q12.1","type":"gpos50",
        "start": 24300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "22",
        "end": 30500000,
       "label":"q12.2","type":"gneg",
        "start": 27900000,
        "value": "#ffffff"
    },
    {
        "chr": "22",
        "end": 35900000,
       "label":"q12.3","type":"gpos50",
        "start": 30500000,
        "value": "#c8c8c8"
    },
    {
        "chr": "22",
        "end": 39300000,
       "label":"q13.1","type":"gneg",
        "start": 35900000,
        "value": "#ffffff"
    },
    {
        "chr": "22",
        "end": 42600000,
       "label":"q13.2","type":"gpos50",
        "start": 39300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "22",
        "end": 47000000,
       "label":"q13.31","type":"gneg",
        "start": 42600000,
        "value": "#ffffff"
    },
    {
        "chr": "22",
        "end": 48200000,
       "label":"q13.32","type":"gpos50",
        "start": 47000000,
        "value": "#c8c8c8"
    },
    {
        "chr": "22",
        "end": 49691432,
       "label":"q13.33","type":"gneg",
        "start": 48200000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 3500000,
       "label":"p26.3","type":"gpos50",
        "start": 0,
        "value": "#c8c8c8"
    },
    {
        "chr": "3",
        "end": 5500000,
       "label":"p26.2","type":"gneg",
        "start": 3500000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 8700000,
       "label":"p26.1","type":"gpos50",
        "start": 5500000,
        "value": "#c8c8c8"
    },
    {
        "chr": "3",
        "end": 11500000,
       "label":"p25.3","type":"gneg",
        "start": 8700000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 12400000,
       "label":"p25.2","type":"gpos25",
        "start": 11500000,
        "value": "#c8c8c8"
    },
    {
        "chr": "3",
        "end": 14700000,
       "label":"p25.1","type":"gneg",
        "start": 12400000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 23800000,
       "label":"p24.3","type":"gpos100",
        "start": 14700000,
        "value": "#000"
    },
    {
        "chr": "3",
        "end": 26400000,
       "label":"p24.2","type":"gneg",
        "start": 23800000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 30800000,
       "label":"p24.1","type":"gpos75",
        "start": 26400000,
        "value": "#828282"
    },
    {
        "chr": "3",
        "end": 32100000,
       "label":"p23","type":"gneg",
        "start": 30800000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 36500000,
       "label":"p22.3","type":"gpos50",
        "start": 32100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "3",
        "end": 39300000,
       "label":"p22.2","type":"gneg",
        "start": 36500000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 43600000,
       "label":"p22.1","type":"gpos75",
        "start": 39300000,
        "value": "#828282"
    },
    {
        "chr": "3",
        "end": 44400000,
       "label":"p21.33","type":"gneg",
        "start": 43600000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 44700000,
       "label":"p21.32","type":"gpos50",
        "start": 44400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "3",
        "end": 51400000,
       "label":"p21.31","type":"gneg",
        "start": 44700000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 51700000,
       "label":"p21.2","type":"gpos25",
        "start": 51400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "3",
        "end": 54400000,
       "label":"p21.1","type":"gneg",
        "start": 51700000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 58500000,
       "label":"p14.3","type":"gpos50",
        "start": 54400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "3",
        "end": 63700000,
       "label":"p14.2","type":"gneg",
        "start": 58500000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 71800000,
       "label":"p14.1","type":"gpos50",
        "start": 63700000,
        "value": "#c8c8c8"
    },
    {
        "chr": "3",
        "end": 74200000,
       "label":"p13","type":"gneg",
        "start": 71800000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 81800000,
       "label":"p12.3","type":"gpos75",
        "start": 74200000,
        "value": "#828282"
    },
    {
        "chr": "3",
        "end": 83700000,
       "label":"p12.2","type":"gneg",
        "start": 81800000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 87200000,
       "label":"p12.1","type":"gpos75",
        "start": 83700000,
        "value": "#828282"
    },
    {
        "chr": "3",
        "end": 89400000,
       "label":"p11.2","type":"gneg",
        "start": 87200000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 91700000,
       "label":"p11.1","type":"acen",
        "start": 89400000,
        "value": "#d92f27"
    },
    {
        "chr": "3",
        "end": 93200000,
       "label":"q11.1","type":"acen",
        "start": 91700000,
        "value": "#d92f27"
    },
    {
        "chr": "3",
        "end": 99800000,
       "label":"q11.2","type":"gvar",
        "start": 93200000,
        "value": "#dcdcdc"
    },
    {
        "chr": "3",
        "end": 101500000,
       "label":"q12.1","type":"gneg",
        "start": 99800000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 102500000,
       "label":"q12.2","type":"gpos25",
        "start": 101500000,
        "value": "#c8c8c8"
    },
    {
        "chr": "3",
        "end": 104400000,
       "label":"q12.3","type":"gneg",
        "start": 102500000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 107800000,
       "label":"q13.11","type":"gpos75",
        "start": 104400000,
        "value": "#828282"
    },
    {
        "chr": "3",
        "end": 109500000,
       "label":"q13.12","type":"gneg",
        "start": 107800000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 112800000,
       "label":"q13.13","type":"gpos50",
        "start": 109500000,
        "value": "#c8c8c8"
    },
    {
        "chr": "3",
        "end": 115000000,
       "label":"q13.2","type":"gneg",
        "start": 112800000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 118800000,
       "label":"q13.31","type":"gpos75",
        "start": 115000000,
        "value": "#828282"
    },
    {
        "chr": "3",
        "end": 120500000,
       "label":"q13.32","type":"gneg",
        "start": 118800000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 123400000,
       "label":"q13.33","type":"gpos75",
        "start": 120500000,
        "value": "#828282"
    },
    {
        "chr": "3",
        "end": 125400000,
       "label":"q21.1","type":"gneg",
        "start": 123400000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 127700000,
       "label":"q21.2","type":"gpos25",
        "start": 125400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "3",
        "end": 131500000,
       "label":"q21.3","type":"gneg",
        "start": 127700000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 135700000,
       "label":"q22.1","type":"gpos25",
        "start": 131500000,
        "value": "#c8c8c8"
    },
    {
        "chr": "3",
        "end": 137400000,
       "label":"q22.2","type":"gneg",
        "start": 135700000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 140400000,
       "label":"q22.3","type":"gpos25",
        "start": 137400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "3",
        "end": 144400000,
       "label":"q23","type":"gneg",
        "start": 140400000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 150400000,
       "label":"q24","type":"gpos100",
        "start": 144400000,
        "value": "#000"
    },
    {
        "chr": "3",
        "end": 153500000,
       "label":"q25.1","type":"gneg",
        "start": 150400000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 156300000,
       "label":"q25.2","type":"gpos50",
        "start": 153500000,
        "value": "#c8c8c8"
    },
    {
        "chr": "3",
        "end": 158100000,
       "label":"q25.31","type":"gneg",
        "start": 156300000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 159900000,
       "label":"q25.32","type":"gpos50",
        "start": 158100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "3",
        "end": 161200000,
       "label":"q25.33","type":"gneg",
        "start": 159900000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 169200000,
       "label":"q26.1","type":"gpos100",
        "start": 161200000,
        "value": "#000"
    },
    {
        "chr": "3",
        "end": 172500000,
       "label":"q26.2","type":"gneg",
        "start": 169200000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 177300000,
       "label":"q26.31","type":"gpos75",
        "start": 172500000,
        "value": "#828282"
    },
    {
        "chr": "3",
        "end": 180600000,
       "label":"q26.32","type":"gneg",
        "start": 177300000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 184200000,
       "label":"q26.33","type":"gpos75",
        "start": 180600000,
        "value": "#828282"
    },
    {
        "chr": "3",
        "end": 186000000,
       "label":"q27.1","type":"gneg",
        "start": 184200000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 187500000,
       "label":"q27.2","type":"gpos25",
        "start": 186000000,
        "value": "#c8c8c8"
    },
    {
        "chr": "3",
        "end": 189400000,
       "label":"q27.3","type":"gneg",
        "start": 187500000,
        "value": "#ffffff"
    },
    {
        "chr": "3",
        "end": 193800000,
       "label":"q28","type":"gpos75",
        "start": 189400000,
        "value": "#828282"
    },
    {
        "chr": "3",
        "end": 199501827,
       "label":"q29","type":"gneg",
        "start": 193800000,
        "value": "#ffffff"
    },
    {
        "chr": "4",
        "end": 3100000,
       "label":"p16.3","type":"gneg",
        "start": 0,
        "value": "#ffffff"
    },
    {
        "chr": "4",
        "end": 5200000,
       "label":"p16.2","type":"gpos25",
        "start": 3100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "4",
        "end": 10900000,
       "label":"p16.1","type":"gneg",
        "start": 5200000,
        "value": "#ffffff"
    },
    {
        "chr": "4",
        "end": 15300000,
       "label":"p15.33","type":"gpos50",
        "start": 10900000,
        "value": "#c8c8c8"
    },
    {
        "chr": "4",
        "end": 18500000,
       "label":"p15.32","type":"gneg",
        "start": 15300000,
        "value": "#ffffff"
    },
    {
        "chr": "4",
        "end": 23100000,
       "label":"p15.31","type":"gpos75",
        "start": 18500000,
        "value": "#828282"
    },
    {
        "chr": "4",
        "end": 27900000,
       "label":"p15.2","type":"gneg",
        "start": 23100000,
        "value": "#ffffff"
    },
    {
        "chr": "4",
        "end": 35500000,
       "label":"p15.1","type":"gpos100",
        "start": 27900000,
        "value": "#000"
    },
    {
        "chr": "4",
        "end": 40900000,
       "label":"p14","type":"gneg",
        "start": 35500000,
        "value": "#ffffff"
    },
    {
        "chr": "4",
        "end": 45600000,
       "label":"p13","type":"gpos50",
        "start": 40900000,
        "value": "#c8c8c8"
    },
    {
        "chr": "4",
        "end": 48700000,
       "label":"p12","type":"gneg",
        "start": 45600000,
        "value": "#ffffff"
    },
    {
        "chr": "4",
        "end": 50700000,
       "label":"p11","type":"acen",
        "start": 48700000,
        "value": "#d92f27"
    },
    {
        "chr": "4",
        "end": 52400000,
       "label":"q11","type":"acen",
        "start": 50700000,
        "value": "#d92f27"
    },
    {
        "chr": "4",
        "end": 59200000,
       "label":"q12","type":"gneg",
        "start": 52400000,
        "value": "#ffffff"
    },
    {
        "chr": "4",
        "end": 66300000,
       "label":"q13.1","type":"gpos100",
        "start": 59200000,
        "value": "#000"
    },
    {
        "chr": "4",
        "end": 70400000,
       "label":"q13.2","type":"gneg",
        "start": 66300000,
        "value": "#ffffff"
    },
    {
        "chr": "4",
        "end": 76500000,
       "label":"q13.3","type":"gpos75",
        "start": 70400000,
        "value": "#828282"
    },
    {
        "chr": "4",
        "end": 79200000,
       "label":"q21.1","type":"gneg",
        "start": 76500000,
        "value": "#ffffff"
    },
    {
        "chr": "4",
        "end": 82600000,
       "label":"q21.21","type":"gpos50",
        "start": 79200000,
        "value": "#c8c8c8"
    },
    {
        "chr": "4",
        "end": 84300000,
       "label":"q21.22","type":"gneg",
        "start": 82600000,
        "value": "#ffffff"
    },
    {
        "chr": "4",
        "end": 87100000,
       "label":"q21.23","type":"gpos25",
        "start": 84300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "4",
        "end": 88200000,
       "label":"q21.3","type":"gneg",
        "start": 87100000,
        "value": "#ffffff"
    },
    {
        "chr": "4",
        "end": 94000000,
       "label":"q22.1","type":"gpos75",
        "start": 88200000,
        "value": "#828282"
    },
    {
        "chr": "4",
        "end": 95400000,
       "label":"q22.2","type":"gneg",
        "start": 94000000,
        "value": "#ffffff"
    },
    {
        "chr": "4",
        "end": 99100000,
       "label":"q22.3","type":"gpos75",
        "start": 95400000,
        "value": "#828282"
    },
    {
        "chr": "4",
        "end": 102500000,
       "label":"q23","type":"gneg",
        "start": 99100000,
        "value": "#ffffff"
    },
    {
        "chr": "4",
        "end": 107900000,
       "label":"q24","type":"gpos50",
        "start": 102500000,
        "value": "#c8c8c8"
    },
    {
        "chr": "4",
        "end": 114100000,
       "label":"q25","type":"gneg",
        "start": 107900000,
        "value": "#ffffff"
    },
    {
        "chr": "4",
        "end": 120600000,
       "label":"q26","type":"gpos75",
        "start": 114100000,
        "value": "#828282"
    },
    {
        "chr": "4",
        "end": 124000000,
       "label":"q27","type":"gneg",
        "start": 120600000,
        "value": "#ffffff"
    },
    {
        "chr": "4",
        "end": 129100000,
       "label":"q28.1","type":"gpos50",
        "start": 124000000,
        "value": "#c8c8c8"
    },
    {
        "chr": "4",
        "end": 131300000,
       "label":"q28.2","type":"gneg",
        "start": 129100000,
        "value": "#ffffff"
    },
    {
        "chr": "4",
        "end": 139500000,
       "label":"q28.3","type":"gpos100",
        "start": 131300000,
        "value": "#000"
    },
    {
        "chr": "4",
        "end": 141700000,
       "label":"q31.1","type":"gneg",
        "start": 139500000,
        "value": "#ffffff"
    },
    {
        "chr": "4",
        "end": 145000000,
       "label":"q31.21","type":"gpos25",
        "start": 141700000,
        "value": "#c8c8c8"
    },
    {
        "chr": "4",
        "end": 147700000,
       "label":"q31.22","type":"gneg",
        "start": 145000000,
        "value": "#ffffff"
    },
    {
        "chr": "4",
        "end": 151000000,
       "label":"q31.23","type":"gpos25",
        "start": 147700000,
        "value": "#c8c8c8"
    },
    {
        "chr": "4",
        "end": 155100000,
       "label":"q31.3","type":"gneg",
        "start": 151000000,
        "value": "#ffffff"
    },
    {
        "chr": "4",
        "end": 161500000,
       "label":"q32.1","type":"gpos100",
        "start": 155100000,
        "value": "#000"
    },
    {
        "chr": "4",
        "end": 164500000,
       "label":"q32.2","type":"gneg",
        "start": 161500000,
        "value": "#ffffff"
    },
    {
        "chr": "4",
        "end": 170400000,
       "label":"q32.3","type":"gpos100",
        "start": 164500000,
        "value": "#000"
    },
    {
        "chr": "4",
        "end": 172200000,
       "label":"q33","type":"gneg",
        "start": 170400000,
        "value": "#ffffff"
    },
    {
        "chr": "4",
        "end": 176600000,
       "label":"q34.1","type":"gpos75",
        "start": 172200000,
        "value": "#828282"
    },
    {
        "chr": "4",
        "end": 177800000,
       "label":"q34.2","type":"gneg",
        "start": 176600000,
        "value": "#ffffff"
    },
    {
        "chr": "4",
        "end": 182600000,
       "label":"q34.3","type":"gpos100",
        "start": 177800000,
        "value": "#000"
    },
    {
        "chr": "4",
        "end": 187300000,
       "label":"q35.1","type":"gneg",
        "start": 182600000,
        "value": "#ffffff"
    },
    {
        "chr": "4",
        "end": 191273063,
       "label":"q35.2","type":"gpos25",
        "start": 187300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "5",
        "end": 4400000,
       "label":"p15.33","type":"gneg",
        "start": 0,
        "value": "#ffffff"
    },
    {
        "chr": "5",
        "end": 6000000,
       "label":"p15.32","type":"gpos25",
        "start": 4400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "5",
        "end": 8200000,
       "label":"p15.31","type":"gneg",
        "start": 6000000,
        "value": "#ffffff"
    },
    {
        "chr": "5",
        "end": 15100000,
       "label":"p15.2","type":"gpos50",
        "start": 8200000,
        "value": "#c8c8c8"
    },
    {
        "chr": "5",
        "end": 18500000,
       "label":"p15.1","type":"gneg",
        "start": 15100000,
        "value": "#ffffff"
    },
    {
        "chr": "5",
        "end": 23300000,
       "label":"p14.3","type":"gpos100",
        "start": 18500000,
        "value": "#000"
    },
    {
        "chr": "5",
        "end": 24700000,
       "label":"p14.2","type":"gneg",
        "start": 23300000,
        "value": "#ffffff"
    },
    {
        "chr": "5",
        "end": 29300000,
       "label":"p14.1","type":"gpos100",
        "start": 24700000,
        "value": "#000"
    },
    {
        "chr": "5",
        "end": 34400000,
       "label":"p13.3","type":"gneg",
        "start": 29300000,
        "value": "#ffffff"
    },
    {
        "chr": "5",
        "end": 38500000,
       "label":"p13.2","type":"gpos25",
        "start": 34400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "5",
        "end": 42400000,
       "label":"p13.1","type":"gneg",
        "start": 38500000,
        "value": "#ffffff"
    },
    {
        "chr": "5",
        "end": 45800000,
       "label":"p12","type":"gpos50",
        "start": 42400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "5",
        "end": 47700000,
       "label":"p11","type":"acen",
        "start": 45800000,
        "value": "#d92f27"
    },
    {
        "chr": "5",
        "end": 50500000,
       "label":"q11.1","type":"acen",
        "start": 47700000,
        "value": "#d92f27"
    },
    {
        "chr": "5",
        "end": 58900000,
       "label":"q11.2","type":"gneg",
        "start": 50500000,
        "value": "#ffffff"
    },
    {
        "chr": "5",
        "end": 63000000,
       "label":"q12.1","type":"gpos75",
        "start": 58900000,
        "value": "#828282"
    },
    {
        "chr": "5",
        "end": 63700000,
       "label":"q12.2","type":"gneg",
        "start": 63000000,
        "value": "#ffffff"
    },
    {
        "chr": "5",
        "end": 66500000,
       "label":"q12.3","type":"gpos75",
        "start": 63700000,
        "value": "#828282"
    },
    {
        "chr": "5",
        "end": 68400000,
       "label":"q13.1","type":"gneg",
        "start": 66500000,
        "value": "#ffffff"
    },
    {
        "chr": "5",
        "end": 73300000,
       "label":"q13.2","type":"gpos50",
        "start": 68400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "5",
        "end": 76400000,
       "label":"q13.3","type":"gneg",
        "start": 73300000,
        "value": "#ffffff"
    },
    {
        "chr": "5",
        "end": 81300000,
       "label":"q14.1","type":"gpos50",
        "start": 76400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "5",
        "end": 82800000,
       "label":"q14.2","type":"gneg",
        "start": 81300000,
        "value": "#ffffff"
    },
    {
        "chr": "5",
        "end": 91900000,
       "label":"q14.3","type":"gpos100",
        "start": 82800000,
        "value": "#000"
    },
    {
        "chr": "5",
        "end": 97300000,
       "label":"q15","type":"gneg",
        "start": 91900000,
        "value": "#ffffff"
    },
    {
        "chr": "5",
        "end": 102800000,
       "label":"q21.1","type":"gpos100",
        "start": 97300000,
        "value": "#000"
    },
    {
        "chr": "5",
        "end": 104500000,
       "label":"q21.2","type":"gneg",
        "start": 102800000,
        "value": "#ffffff"
    },
    {
        "chr": "5",
        "end": 109600000,
       "label":"q21.3","type":"gpos100",
        "start": 104500000,
        "value": "#000"
    },
    {
        "chr": "5",
        "end": 111500000,
       "label":"q22.1","type":"gneg",
        "start": 109600000,
        "value": "#ffffff"
    },
    {
        "chr": "5",
        "end": 113100000,
       "label":"q22.2","type":"gpos50",
        "start": 111500000,
        "value": "#c8c8c8"
    },
    {
        "chr": "5",
        "end": 115200000,
       "label":"q22.3","type":"gneg",
        "start": 113100000,
        "value": "#ffffff"
    },
    {
        "chr": "5",
        "end": 121500000,
       "label":"q23.1","type":"gpos100",
        "start": 115200000,
        "value": "#000"
    },
    {
        "chr": "5",
        "end": 127300000,
       "label":"q23.2","type":"gneg",
        "start": 121500000,
        "value": "#ffffff"
    },
    {
        "chr": "5",
        "end": 130400000,
       "label":"q23.3","type":"gpos100",
        "start": 127300000,
        "value": "#000"
    },
    {
        "chr": "5",
        "end": 135400000,
       "label":"q31.1","type":"gneg",
        "start": 130400000,
        "value": "#ffffff"
    },
    {
        "chr": "5",
        "end": 139000000,
       "label":"q31.2","type":"gpos25",
        "start": 135400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "5",
        "end": 143100000,
       "label":"q31.3","type":"gneg",
        "start": 139000000,
        "value": "#ffffff"
    },
    {
        "chr": "5",
        "end": 147200000,
       "label":"q32","type":"gpos75",
        "start": 143100000,
        "value": "#828282"
    },
    {
        "chr": "5",
        "end": 152100000,
       "label":"q33.1","type":"gneg",
        "start": 147200000,
        "value": "#ffffff"
    },
    {
        "chr": "5",
        "end": 155600000,
       "label":"q33.2","type":"gpos50",
        "start": 152100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "5",
        "end": 159900000,
       "label":"q33.3","type":"gneg",
        "start": 155600000,
        "value": "#ffffff"
    },
    {
        "chr": "5",
        "end": 167400000,
       "label":"q34","type":"gpos100",
        "start": 159900000,
        "value": "#000"
    },
    {
        "chr": "5",
        "end": 172200000,
       "label":"q35.1","type":"gneg",
        "start": 167400000,
        "value": "#ffffff"
    },
    {
        "chr": "5",
        "end": 176500000,
       "label":"q35.2","type":"gpos25",
        "start": 172200000,
        "value": "#c8c8c8"
    },
    {
        "chr": "5",
        "end": 180857866,
       "label":"q35.3","type":"gneg",
        "start": 176500000,
        "value": "#ffffff"
    },
    {
        "chr": "6",
        "end": 2300000,
       "label":"p25.3","type":"gneg",
        "start": 0,
        "value": "#ffffff"
    },
    {
        "chr": "6",
        "end": 4100000,
       "label":"p25.2","type":"gpos25",
        "start": 2300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "6",
        "end": 7000000,
       "label":"p25.1","type":"gneg",
        "start": 4100000,
        "value": "#ffffff"
    },
    {
        "chr": "6",
        "end": 10600000,
       "label":"p24.3","type":"gpos50",
        "start": 7000000,
        "value": "#c8c8c8"
    },
    {
        "chr": "6",
        "end": 11200000,
       "label":"p24.2","type":"gneg",
        "start": 10600000,
        "value": "#ffffff"
    },
    {
        "chr": "6",
        "end": 13500000,
       "label":"p24.1","type":"gpos25",
        "start": 11200000,
        "value": "#c8c8c8"
    },
    {
        "chr": "6",
        "end": 15500000,
       "label":"p23","type":"gneg",
        "start": 13500000,
        "value": "#ffffff"
    },
    {
        "chr": "6",
        "end": 23500000,
       "label":"p22.3","type":"gpos75",
        "start": 15500000,
        "value": "#828282"
    },
    {
        "chr": "6",
        "end": 26100000,
       "label":"p22.2","type":"gneg",
        "start": 23500000,
        "value": "#ffffff"
    },
    {
        "chr": "6",
        "end": 29900000,
       "label":"p22.1","type":"gpos50",
        "start": 26100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "6",
        "end": 31900000,
       "label":"p21.33","type":"gneg",
        "start": 29900000,
        "value": "#ffffff"
    },
    {
        "chr": "6",
        "end": 33600000,
       "label":"p21.32","type":"gpos25",
        "start": 31900000,
        "value": "#c8c8c8"
    },
    {
        "chr": "6",
        "end": 36800000,
       "label":"p21.31","type":"gneg",
        "start": 33600000,
        "value": "#ffffff"
    },
    {
        "chr": "6",
        "end": 40600000,
       "label":"p21.2","type":"gpos25",
        "start": 36800000,
        "value": "#c8c8c8"
    },
    {
        "chr": "6",
        "end": 45200000,
       "label":"p21.1","type":"gneg",
        "start": 40600000,
        "value": "#ffffff"
    },
    {
        "chr": "6",
        "end": 51100000,
       "label":"p12.3","type":"gpos100",
        "start": 45200000,
        "value": "#000"
    },
    {
        "chr": "6",
        "end": 52600000,
       "label":"p12.2","type":"gneg",
        "start": 51100000,
        "value": "#ffffff"
    },
    {
        "chr": "6",
        "end": 57200000,
       "label":"p12.1","type":"gpos100",
        "start": 52600000,
        "value": "#000"
    },
    {
        "chr": "6",
        "end": 58400000,
       "label":"p11.2","type":"gneg",
        "start": 57200000,
        "value": "#ffffff"
    },
    {
        "chr": "6",
        "end": 60500000,
       "label":"p11.1","type":"acen",
        "start": 58400000,
        "value": "#d92f27"
    },
    {
        "chr": "6",
        "end": 63400000,
       "label":"q11.1","type":"acen",
        "start": 60500000,
        "value": "#d92f27"
    },
    {
        "chr": "6",
        "end": 63500000,
       "label":"q11.2","type":"gneg",
        "start": 63400000,
        "value": "#ffffff"
    },
    {
        "chr": "6",
        "end": 70000000,
       "label":"q12","type":"gpos100",
        "start": 63500000,
        "value": "#000"
    },
    {
        "chr": "6",
        "end": 75900000,
       "label":"q13","type":"gneg",
        "start": 70000000,
        "value": "#ffffff"
    },
    {
        "chr": "6",
        "end": 83900000,
       "label":"q14.1","type":"gpos50",
        "start": 75900000,
        "value": "#c8c8c8"
    },
    {
        "chr": "6",
        "end": 84700000,
       "label":"q14.2","type":"gneg",
        "start": 83900000,
        "value": "#ffffff"
    },
    {
        "chr": "6",
        "end": 87500000,
       "label":"q14.3","type":"gpos50",
        "start": 84700000,
        "value": "#c8c8c8"
    },
    {
        "chr": "6",
        "end": 92100000,
       "label":"q15","type":"gneg",
        "start": 87500000,
        "value": "#ffffff"
    },
    {
        "chr": "6",
        "end": 98700000,
       "label":"q16.1","type":"gpos100",
        "start": 92100000,
        "value": "#000"
    },
    {
        "chr": "6",
        "end": 99900000,
       "label":"q16.2","type":"gneg",
        "start": 98700000,
        "value": "#ffffff"
    },
    {
        "chr": "6",
        "end": 104800000,
       "label":"q16.3","type":"gpos100",
        "start": 99900000,
        "value": "#000"
    },
    {
        "chr": "6",
        "end": 113900000,
       "label":"q21","type":"gneg",
        "start": 104800000,
        "value": "#ffffff"
    },
    {
        "chr": "6",
        "end": 117100000,
       "label":"q22.1","type":"gpos75",
        "start": 113900000,
        "value": "#828282"
    },
    {
        "chr": "6",
        "end": 118600000,
       "label":"q22.2","type":"gneg",
        "start": 117100000,
        "value": "#ffffff"
    },
    {
        "chr": "6",
        "end": 126200000,
       "label":"q22.31","type":"gpos100",
        "start": 118600000,
        "value": "#000"
    },
    {
        "chr": "6",
        "end": 127300000,
       "label":"q22.32","type":"gneg",
        "start": 126200000,
        "value": "#ffffff"
    },
    {
        "chr": "6",
        "end": 130400000,
       "label":"q22.33","type":"gpos75",
        "start": 127300000,
        "value": "#828282"
    },
    {
        "chr": "6",
        "end": 131300000,
       "label":"q23.1","type":"gneg",
        "start": 130400000,
        "value": "#ffffff"
    },
    {
        "chr": "6",
        "end": 135200000,
       "label":"q23.2","type":"gpos50",
        "start": 131300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "6",
        "end": 139100000,
       "label":"q23.3","type":"gneg",
        "start": 135200000,
        "value": "#ffffff"
    },
    {
        "chr": "6",
        "end": 142900000,
       "label":"q24.1","type":"gpos75",
        "start": 139100000,
        "value": "#828282"
    },
    {
        "chr": "6",
        "end": 145700000,
       "label":"q24.2","type":"gneg",
        "start": 142900000,
        "value": "#ffffff"
    },
    {
        "chr": "6",
        "end": 149100000,
       "label":"q24.3","type":"gpos75",
        "start": 145700000,
        "value": "#828282"
    },
    {
        "chr": "6",
        "end": 152600000,
       "label":"q25.1","type":"gneg",
        "start": 149100000,
        "value": "#ffffff"
    },
    {
        "chr": "6",
        "end": 155600000,
       "label":"q25.2","type":"gpos50",
        "start": 152600000,
        "value": "#c8c8c8"
    },
    {
        "chr": "6",
        "end": 160900000,
       "label":"q25.3","type":"gneg",
        "start": 155600000,
        "value": "#ffffff"
    },
    {
        "chr": "6",
        "end": 164400000,
       "label":"q26","type":"gpos50",
        "start": 160900000,
        "value": "#c8c8c8"
    },
    {
        "chr": "6",
        "end": 170899992,
       "label":"q27","type":"gneg",
        "start": 164400000,
        "value": "#ffffff"
    },
    {
        "chr": "7",
        "end": 2100000,
       "label":"p22.3","type":"gneg",
        "start": 0,
        "value": "#ffffff"
    },
    {
        "chr": "7",
        "end": 4500000,
       "label":"p22.2","type":"gpos25",
        "start": 2100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "7",
        "end": 7200000,
       "label":"p22.1","type":"gneg",
        "start": 4500000,
        "value": "#ffffff"
    },
    {
        "chr": "7",
        "end": 13300000,
       "label":"p21.3","type":"gpos100",
        "start": 7200000,
        "value": "#000"
    },
    {
        "chr": "7",
        "end": 15200000,
       "label":"p21.2","type":"gneg",
        "start": 13300000,
        "value": "#ffffff"
    },
    {
        "chr": "7",
        "end": 19500000,
       "label":"p21.1","type":"gpos100",
        "start": 15200000,
        "value": "#000"
    },
    {
        "chr": "7",
        "end": 24900000,
       "label":"p15.3","type":"gneg",
        "start": 19500000,
        "value": "#ffffff"
    },
    {
        "chr": "7",
        "end": 28000000,
       "label":"p15.2","type":"gpos50",
        "start": 24900000,
        "value": "#c8c8c8"
    },
    {
        "chr": "7",
        "end": 31800000,
       "label":"p15.1","type":"gneg",
        "start": 28000000,
        "value": "#ffffff"
    },
    {
        "chr": "7",
        "end": 35600000,
       "label":"p14.3","type":"gpos75",
        "start": 31800000,
        "value": "#828282"
    },
    {
        "chr": "7",
        "end": 37500000,
       "label":"p14.2","type":"gneg",
        "start": 35600000,
        "value": "#ffffff"
    },
    {
        "chr": "7",
        "end": 43300000,
       "label":"p14.1","type":"gpos75",
        "start": 37500000,
        "value": "#828282"
    },
    {
        "chr": "7",
        "end": 46600000,
       "label":"p13","type":"gneg",
        "start": 43300000,
        "value": "#ffffff"
    },
    {
        "chr": "7",
        "end": 49800000,
       "label":"p12.3","type":"gpos75",
        "start": 46600000,
        "value": "#828282"
    },
    {
        "chr": "7",
        "end": 50900000,
       "label":"p12.2","type":"gneg",
        "start": 49800000,
        "value": "#ffffff"
    },
    {
        "chr": "7",
        "end": 53900000,
       "label":"p12.1","type":"gpos75",
        "start": 50900000,
        "value": "#828282"
    },
    {
        "chr": "7",
        "end": 57400000,
       "label":"p11.2","type":"gneg",
        "start": 53900000,
        "value": "#ffffff"
    },
    {
        "chr": "7",
        "end": 59100000,
       "label":"p11.1","type":"acen",
        "start": 57400000,
        "value": "#d92f27"
    },
    {
        "chr": "7",
        "end": 61100000,
       "label":"q11.1","type":"acen",
        "start": 59100000,
        "value": "#d92f27"
    },
    {
        "chr": "7",
        "end": 66100000,
       "label":"q11.21","type":"gneg",
        "start": 61100000,
        "value": "#ffffff"
    },
    {
        "chr": "7",
        "end": 71800000,
       "label":"q11.22","type":"gpos50",
        "start": 66100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "7",
        "end": 77400000,
       "label":"q11.23","type":"gneg",
        "start": 71800000,
        "value": "#ffffff"
    },
    {
        "chr": "7",
        "end": 86200000,
       "label":"q21.11","type":"gpos100",
        "start": 77400000,
        "value": "#000"
    },
    {
        "chr": "7",
        "end": 88000000,
       "label":"q21.12","type":"gneg",
        "start": 86200000,
        "value": "#ffffff"
    },
    {
        "chr": "7",
        "end": 90900000,
       "label":"q21.13","type":"gpos75",
        "start": 88000000,
        "value": "#828282"
    },
    {
        "chr": "7",
        "end": 92600000,
       "label":"q21.2","type":"gneg",
        "start": 90900000,
        "value": "#ffffff"
    },
    {
        "chr": "7",
        "end": 97900000,
       "label":"q21.3","type":"gpos75",
        "start": 92600000,
        "value": "#828282"
    },
    {
        "chr": "7",
        "end": 104400000,
       "label":"q22.1","type":"gneg",
        "start": 97900000,
        "value": "#ffffff"
    },
    {
        "chr": "7",
        "end": 105900000,
       "label":"q22.2","type":"gpos50",
        "start": 104400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "7",
        "end": 107200000,
       "label":"q22.3","type":"gneg",
        "start": 105900000,
        "value": "#ffffff"
    },
    {
        "chr": "7",
        "end": 114400000,
       "label":"q31.1","type":"gpos75",
        "start": 107200000,
        "value": "#828282"
    },
    {
        "chr": "7",
        "end": 117200000,
       "label":"q31.2","type":"gneg",
        "start": 114400000,
        "value": "#ffffff"
    },
    {
        "chr": "7",
        "end": 120900000,
       "label":"q31.31","type":"gpos75",
        "start": 117200000,
        "value": "#828282"
    },
    {
        "chr": "7",
        "end": 123600000,
       "label":"q31.32","type":"gneg",
        "start": 120900000,
        "value": "#ffffff"
    },
    {
        "chr": "7",
        "end": 126900000,
       "label":"q31.33","type":"gpos75",
        "start": 123600000,
        "value": "#828282"
    },
    {
        "chr": "7",
        "end": 129000000,
       "label":"q32.1","type":"gneg",
        "start": 126900000,
        "value": "#ffffff"
    },
    {
        "chr": "7",
        "end": 130100000,
       "label":"q32.2","type":"gpos25",
        "start": 129000000,
        "value": "#c8c8c8"
    },
    {
        "chr": "7",
        "end": 132400000,
       "label":"q32.3","type":"gneg",
        "start": 130100000,
        "value": "#ffffff"
    },
    {
        "chr": "7",
        "end": 137300000,
       "label":"q33","type":"gpos50",
        "start": 132400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "7",
        "end": 142800000,
       "label":"q34","type":"gneg",
        "start": 137300000,
        "value": "#ffffff"
    },
    {
        "chr": "7",
        "end": 147500000,
       "label":"q35","type":"gpos75",
        "start": 142800000,
        "value": "#828282"
    },
    {
        "chr": "7",
        "end": 152200000,
       "label":"q36.1","type":"gneg",
        "start": 147500000,
        "value": "#ffffff"
    },
    {
        "chr": "7",
        "end": 154700000,
       "label":"q36.2","type":"gpos25",
        "start": 152200000,
        "value": "#c8c8c8"
    },
    {
        "chr": "7",
        "end": 158821424,
       "label":"q36.3","type":"gneg",
        "start": 154700000,
        "value": "#ffffff"
    },
    {
        "chr": "8",
        "end": 2200000,
       "label":"p23.3","type":"gneg",
        "start": 0,
        "value": "#ffffff"
    },
    {
        "chr": "8",
        "end": 6200000,
       "label":"p23.2","type":"gpos75",
        "start": 2200000,
        "value": "#828282"
    },
    {
        "chr": "8",
        "end": 12700000,
       "label":"p23.1","type":"gneg",
        "start": 6200000,
        "value": "#ffffff"
    },
    {
        "chr": "8",
        "end": 19100000,
       "label":"p22","type":"gpos100",
        "start": 12700000,
        "value": "#000"
    },
    {
        "chr": "8",
        "end": 23400000,
       "label":"p21.3","type":"gneg",
        "start": 19100000,
        "value": "#ffffff"
    },
    {
        "chr": "8",
        "end": 27400000,
       "label":"p21.2","type":"gpos50",
        "start": 23400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "8",
        "end": 29700000,
       "label":"p21.1","type":"gneg",
        "start": 27400000,
        "value": "#ffffff"
    },
    {
        "chr": "8",
        "end": 38500000,
       "label":"p12","type":"gpos75",
        "start": 29700000,
        "value": "#828282"
    },
    {
        "chr": "8",
        "end": 39500000,
       "label":"p11.23","type":"gneg",
        "start": 38500000,
        "value": "#ffffff"
    },
    {
        "chr": "8",
        "end": 39900000,
       "label":"p11.22","type":"gpos25",
        "start": 39500000,
        "value": "#c8c8c8"
    },
    {
        "chr": "8",
        "end": 43200000,
       "label":"p11.21","type":"gneg",
        "start": 39900000,
        "value": "#ffffff"
    },
    {
        "chr": "8",
        "end": 45200000,
       "label":"p11.1","type":"acen",
        "start": 43200000,
        "value": "#d92f27"
    },
    {
        "chr": "8",
        "end": 48100000,
       "label":"q11.1","type":"acen",
        "start": 45200000,
        "value": "#d92f27"
    },
    {
        "chr": "8",
        "end": 50400000,
       "label":"q11.21","type":"gneg",
        "start": 48100000,
        "value": "#ffffff"
    },
    {
        "chr": "8",
        "end": 52800000,
       "label":"q11.22","type":"gpos75",
        "start": 50400000,
        "value": "#828282"
    },
    {
        "chr": "8",
        "end": 55600000,
       "label":"q11.23","type":"gneg",
        "start": 52800000,
        "value": "#ffffff"
    },
    {
        "chr": "8",
        "end": 61700000,
       "label":"q12.1","type":"gpos50",
        "start": 55600000,
        "value": "#c8c8c8"
    },
    {
        "chr": "8",
        "end": 62400000,
       "label":"q12.2","type":"gneg",
        "start": 61700000,
        "value": "#ffffff"
    },
    {
        "chr": "8",
        "end": 66100000,
       "label":"q12.3","type":"gpos50",
        "start": 62400000,
        "value": "#c8c8c8"
    },
    {
        "chr": "8",
        "end": 68100000,
       "label":"q13.1","type":"gneg",
        "start": 66100000,
        "value": "#ffffff"
    },
    {
        "chr": "8",
        "end": 70600000,
       "label":"q13.2","type":"gpos50",
        "start": 68100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "8",
        "end": 74000000,
       "label":"q13.3","type":"gneg",
        "start": 70600000,
        "value": "#ffffff"
    },
    {
        "chr": "8",
        "end": 78500000,
       "label":"q21.11","type":"gpos100",
        "start": 74000000,
        "value": "#000"
    },
    {
        "chr": "8",
        "end": 80300000,
       "label":"q21.12","type":"gneg",
        "start": 78500000,
        "value": "#ffffff"
    },
    {
        "chr": "8",
        "end": 84900000,
       "label":"q21.13","type":"gpos75",
        "start": 80300000,
        "value": "#828282"
    },
    {
        "chr": "8",
        "end": 87200000,
       "label":"q21.2","type":"gneg",
        "start": 84900000,
        "value": "#ffffff"
    },
    {
        "chr": "8",
        "end": 93500000,
       "label":"q21.3","type":"gpos100",
        "start": 87200000,
        "value": "#000"
    },
    {
        "chr": "8",
        "end": 99100000,
       "label":"q22.1","type":"gneg",
        "start": 93500000,
        "value": "#ffffff"
    },
    {
        "chr": "8",
        "end": 101600000,
       "label":"q22.2","type":"gpos25",
        "start": 99100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "8",
        "end": 106100000,
       "label":"q22.3","type":"gneg",
        "start": 101600000,
        "value": "#ffffff"
    },
    {
        "chr": "8",
        "end": 110600000,
       "label":"q23.1","type":"gpos75",
        "start": 106100000,
        "value": "#828282"
    },
    {
        "chr": "8",
        "end": 112200000,
       "label":"q23.2","type":"gneg",
        "start": 110600000,
        "value": "#ffffff"
    },
    {
        "chr": "8",
        "end": 117700000,
       "label":"q23.3","type":"gpos100",
        "start": 112200000,
        "value": "#000"
    },
    {
        "chr": "8",
        "end": 119200000,
       "label":"q24.11","type":"gneg",
        "start": 117700000,
        "value": "#ffffff"
    },
    {
        "chr": "8",
        "end": 122500000,
       "label":"q24.12","type":"gpos50",
        "start": 119200000,
        "value": "#c8c8c8"
    },
    {
        "chr": "8",
        "end": 127300000,
       "label":"q24.13","type":"gneg",
        "start": 122500000,
        "value": "#ffffff"
    },
    {
        "chr": "8",
        "end": 131500000,
       "label":"q24.21","type":"gpos50",
        "start": 127300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "8",
        "end": 136500000,
       "label":"q24.22","type":"gneg",
        "start": 131500000,
        "value": "#ffffff"
    },
    {
        "chr": "8",
        "end": 140000000,
       "label":"q24.23","type":"gpos75",
        "start": 136500000,
        "value": "#828282"
    },
    {
        "chr": "8",
        "end": 146274826,
       "label":"q24.3","type":"gneg",
        "start": 140000000,
        "value": "#ffffff"
    },
    {
        "chr": "9",
        "end": 2200000,
       "label":"p24.3","type":"gneg",
        "start": 0,
        "value": "#ffffff"
    },
    {
        "chr": "9",
        "end": 4600000,
       "label":"p24.2","type":"gpos25",
        "start": 2200000,
        "value": "#c8c8c8"
    },
    {
        "chr": "9",
        "end": 9000000,
       "label":"p24.1","type":"gneg",
        "start": 4600000,
        "value": "#ffffff"
    },
    {
        "chr": "9",
        "end": 14100000,
       "label":"p23","type":"gpos75",
        "start": 9000000,
        "value": "#828282"
    },
    {
        "chr": "9",
        "end": 16600000,
       "label":"p22.3","type":"gneg",
        "start": 14100000,
        "value": "#ffffff"
    },
    {
        "chr": "9",
        "end": 18500000,
       "label":"p22.2","type":"gpos25",
        "start": 16600000,
        "value": "#c8c8c8"
    },
    {
        "chr": "9",
        "end": 19900000,
       "label":"p22.1","type":"gneg",
        "start": 18500000,
        "value": "#ffffff"
    },
    {
        "chr": "9",
        "end": 25500000,
       "label":"p21.3","type":"gpos100",
        "start": 19900000,
        "value": "#000"
    },
    {
        "chr": "9",
        "end": 28100000,
       "label":"p21.2","type":"gneg",
        "start": 25500000,
        "value": "#ffffff"
    },
    {
        "chr": "9",
        "end": 32800000,
       "label":"p21.1","type":"gpos100",
        "start": 28100000,
        "value": "#000"
    },
    {
        "chr": "9",
        "end": 36300000,
       "label":"p13.3","type":"gneg",
        "start": 32800000,
        "value": "#ffffff"
    },
    {
        "chr": "9",
        "end": 38000000,
       "label":"p13.2","type":"gpos25",
        "start": 36300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "9",
        "end": 40200000,
       "label":"p13.1","type":"gneg",
        "start": 38000000,
        "value": "#ffffff"
    },
    {
        "chr": "9",
        "end": 42400000,
       "label":"p12","type":"gpos50",
        "start": 40200000,
        "value": "#c8c8c8"
    },
    {
        "chr": "9",
        "end": 46700000,
       "label":"p11.2","type":"gneg",
        "start": 42400000,
        "value": "#ffffff"
    },
    {
        "chr": "9",
        "end": 51800000,
       "label":"p11.1","type":"acen",
        "start": 46700000,
        "value": "#d92f27"
    },
    {
        "chr": "9",
        "end": 60300000,
       "label":"q11","type":"acen",
        "start": 51800000,
        "value": "#d92f27"
    },
    {
        "chr": "9",
        "end": 70000000,
       "label":"q12","type":"gvar",
        "start": 60300000,
        "value": "#dcdcdc"
    },
    {
        "chr": "9",
        "end": 70500000,
       "label":"q13","type":"gneg",
        "start": 70000000,
        "value": "#ffffff"
    },
    {
        "chr": "9",
        "end": 72700000,
       "label":"q21.11","type":"gpos25",
        "start": 70500000,
        "value": "#c8c8c8"
    },
    {
        "chr": "9",
        "end": 73100000,
       "label":"q21.12","type":"gneg",
        "start": 72700000,
        "value": "#ffffff"
    },
    {
        "chr": "9",
        "end": 79300000,
       "label":"q21.13","type":"gpos50",
        "start": 73100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "9",
        "end": 80300000,
       "label":"q21.2","type":"gneg",
        "start": 79300000,
        "value": "#ffffff"
    },
    {
        "chr": "9",
        "end": 83400000,
       "label":"q21.31","type":"gpos50",
        "start": 80300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "9",
        "end": 86100000,
       "label":"q21.32","type":"gneg",
        "start": 83400000,
        "value": "#ffffff"
    },
    {
        "chr": "9",
        "end": 89600000,
       "label":"q21.33","type":"gpos50",
        "start": 86100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "9",
        "end": 91000000,
       "label":"q22.1","type":"gneg",
        "start": 89600000,
        "value": "#ffffff"
    },
    {
        "chr": "9",
        "end": 93000000,
       "label":"q22.2","type":"gpos25",
        "start": 91000000,
        "value": "#c8c8c8"
    },
    {
        "chr": "9",
        "end": 95600000,
       "label":"q22.31","type":"gneg",
        "start": 93000000,
        "value": "#ffffff"
    },
    {
        "chr": "9",
        "end": 98200000,
       "label":"q22.32","type":"gpos25",
        "start": 95600000,
        "value": "#c8c8c8"
    },
    {
        "chr": "9",
        "end": 101600000,
       "label":"q22.33","type":"gneg",
        "start": 98200000,
        "value": "#ffffff"
    },
    {
        "chr": "9",
        "end": 107200000,
       "label":"q31.1","type":"gpos100",
        "start": 101600000,
        "value": "#000"
    },
    {
        "chr": "9",
        "end": 110300000,
       "label":"q31.2","type":"gneg",
        "start": 107200000,
        "value": "#ffffff"
    },
    {
        "chr": "9",
        "end": 113900000,
       "label":"q31.3","type":"gpos25",
        "start": 110300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "9",
        "end": 116700000,
       "label":"q32","type":"gneg",
        "start": 113900000,
        "value": "#ffffff"
    },
    {
        "chr": "9",
        "end": 122000000,
       "label":"q33.1","type":"gpos75",
        "start": 116700000,
        "value": "#828282"
    },
    {
        "chr": "9",
        "end": 125800000,
       "label":"q33.2","type":"gneg",
        "start": 122000000,
        "value": "#ffffff"
    },
    {
        "chr": "9",
        "end": 129300000,
       "label":"q33.3","type":"gpos25",
        "start": 125800000,
        "value": "#c8c8c8"
    },
    {
        "chr": "9",
        "end": 132500000,
       "label":"q34.11","type":"gneg",
        "start": 129300000,
        "value": "#ffffff"
    },
    {
        "chr": "9",
        "end": 132800000,
       "label":"q34.12","type":"gpos25",
        "start": 132500000,
        "value": "#c8c8c8"
    },
    {
        "chr": "9",
        "end": 134900000,
       "label":"q34.13","type":"gneg",
        "start": 132800000,
        "value": "#ffffff"
    },
    {
        "chr": "9",
        "end": 136600000,
       "label":"q34.2","type":"gpos25",
        "start": 134900000,
        "value": "#c8c8c8"
    },
    {
        "chr": "9",
        "end": 140273252,
       "label":"q34.3","type":"gneg",
        "start": 136600000,
        "value": "#ffffff"
    },
    {
        "chr": "X",
        "end": 4300000,
       "label":"p22.33","type":"gneg",
        "start": 0,
        "value": "#ffffff"
    },
    {
        "chr": "X",
        "end": 6000000,
       "label":"p22.32","type":"gpos50",
        "start": 4300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "X",
        "end": 9500000,
       "label":"p22.31","type":"gneg",
        "start": 6000000,
        "value": "#ffffff"
    },
    {
        "chr": "X",
        "end": 17100000,
       "label":"p22.2","type":"gpos50",
        "start": 9500000,
        "value": "#c8c8c8"
    },
    {
        "chr": "X",
        "end": 19200000,
       "label":"p22.13","type":"gneg",
        "start": 17100000,
        "value": "#ffffff"
    },
    {
        "chr": "X",
        "end": 21800000,
       "label":"p22.12","type":"gpos50",
        "start": 19200000,
        "value": "#c8c8c8"
    },
    {
        "chr": "X",
        "end": 24900000,
       "label":"p22.11","type":"gneg",
        "start": 21800000,
        "value": "#ffffff"
    },
    {
        "chr": "X",
        "end": 29400000,
       "label":"p21.3","type":"gpos100",
        "start": 24900000,
        "value": "#000"
    },
    {
        "chr": "X",
        "end": 31500000,
       "label":"p21.2","type":"gneg",
        "start": 29400000,
        "value": "#ffffff"
    },
    {
        "chr": "X",
        "end": 37500000,
       "label":"p21.1","type":"gpos100",
        "start": 31500000,
        "value": "#000"
    },
    {
        "chr": "X",
        "end": 42300000,
       "label":"p11.4","type":"gneg",
        "start": 37500000,
        "value": "#ffffff"
    },
    {
        "chr": "X",
        "end": 47300000,
       "label":"p11.3","type":"gpos75",
        "start": 42300000,
        "value": "#828282"
    },
    {
        "chr": "X",
        "end": 49700000,
       "label":"p11.23","type":"gneg",
        "start": 47300000,
        "value": "#ffffff"
    },
    {
        "chr": "X",
        "end": 54700000,
       "label":"p11.22","type":"gpos25",
        "start": 49700000,
        "value": "#c8c8c8"
    },
    {
        "chr": "X",
        "end": 56600000,
       "label":"p11.21","type":"gneg",
        "start": 54700000,
        "value": "#ffffff"
    },
    {
        "chr": "X",
        "end": 59500000,
       "label":"p11.1","type":"acen",
        "start": 56600000,
        "value": "#d92f27"
    },
    {
        "chr": "X",
        "end": 65000000,
       "label":"q11.1","type":"acen",
        "start": 59500000,
        "value": "#d92f27"
    },
    {
        "chr": "X",
        "end": 65100000,
       "label":"q11.2","type":"gneg",
        "start": 65000000,
        "value": "#ffffff"
    },
    {
        "chr": "X",
        "end": 67700000,
       "label":"q12","type":"gpos50",
        "start": 65100000,
        "value": "#c8c8c8"
    },
    {
        "chr": "X",
        "end": 72200000,
       "label":"q13.1","type":"gneg",
        "start": 67700000,
        "value": "#ffffff"
    },
    {
        "chr": "X",
        "end": 73800000,
       "label":"q13.2","type":"gpos50",
        "start": 72200000,
        "value": "#c8c8c8"
    },
    {
        "chr": "X",
        "end": 76000000,
       "label":"q13.3","type":"gneg",
        "start": 73800000,
        "value": "#ffffff"
    },
    {
        "chr": "X",
        "end": 84500000,
       "label":"q21.1","type":"gpos100",
        "start": 76000000,
        "value": "#000"
    },
    {
        "chr": "X",
        "end": 86200000,
       "label":"q21.2","type":"gneg",
        "start": 84500000,
        "value": "#ffffff"
    },
    {
        "chr": "X",
        "end": 91900000,
       "label":"q21.31","type":"gpos100",
        "start": 86200000,
        "value": "#000"
    },
    {
        "chr": "X",
        "end": 93500000,
       "label":"q21.32","type":"gneg",
        "start": 91900000,
        "value": "#ffffff"
    },
    {
        "chr": "X",
        "end": 98200000,
       "label":"q21.33","type":"gpos75",
        "start": 93500000,
        "value": "#828282"
    },
    {
        "chr": "X",
        "end": 102500000,
       "label":"q22.1","type":"gneg",
        "start": 98200000,
        "value": "#ffffff"
    },
    {
        "chr": "X",
        "end": 103600000,
       "label":"q22.2","type":"gpos50",
        "start": 102500000,
        "value": "#c8c8c8"
    },
    {
        "chr": "X",
        "end": 110500000,
       "label":"q22.3","type":"gneg",
        "start": 103600000,
        "value": "#ffffff"
    },
    {
        "chr": "X",
        "end": 116800000,
       "label":"q23","type":"gpos75",
        "start": 110500000,
        "value": "#828282"
    },
    {
        "chr": "X",
        "end": 120700000,
       "label":"q24","type":"gneg",
        "start": 116800000,
        "value": "#ffffff"
    },
    {
        "chr": "X",
        "end": 129800000,
       "label":"q25","type":"gpos100",
        "start": 120700000,
        "value": "#000"
    },
    {
        "chr": "X",
        "end": 130300000,
       "label":"q26.1","type":"gneg",
        "start": 129800000,
        "value": "#ffffff"
    },
    {
        "chr": "X",
        "end": 133500000,
       "label":"q26.2","type":"gpos25",
        "start": 130300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "X",
        "end": 137800000,
       "label":"q26.3","type":"gneg",
        "start": 133500000,
        "value": "#ffffff"
    },
    {
        "chr": "X",
        "end": 140100000,
       "label":"q27.1","type":"gpos75",
        "start": 137800000,
        "value": "#828282"
    },
    {
        "chr": "X",
        "end": 141900000,
       "label":"q27.2","type":"gneg",
        "start": 140100000,
        "value": "#ffffff"
    },
    {
        "chr": "X",
        "end": 146900000,
       "label":"q27.3","type":"gpos100",
        "start": 141900000,
        "value": "#000"
    },
    {
        "chr": "X",
        "end": 154913754,
       "label":"q28","type":"gneg",
        "start": 146900000,
        "value": "#ffffff"
    },
    {
        "chr": "Y",
        "end": 1700000,
       "label":"p11.32","type":"gneg",
        "start": 0,
        "value": "#ffffff"
    },
    {
        "chr": "Y",
        "end": 3300000,
       "label":"p11.31","type":"gpos50",
        "start": 1700000,
        "value": "#c8c8c8"
    },
    {
        "chr": "Y",
        "end": 11200000,
       "label":"p11.2","type":"gneg",
        "start": 3300000,
        "value": "#ffffff"
    },
    {
        "chr": "Y",
        "end": 11300000,
       "label":"p11.1","type":"acen",
        "start": 11200000,
        "value": "#d92f27"
    },
    {
        "chr": "Y",
        "end": 12500000,
       "label":"q11.1","type":"acen",
        "start": 11300000,
        "value": "#d92f27"
    },
    {
        "chr": "Y",
        "end": 14300000,
       "label":"q11.21","type":"gneg",
        "start": 12500000,
        "value": "#ffffff"
    },
    {
        "chr": "Y",
        "end": 19000000,
       "label":"q11.221","type":"gpos50",
        "start": 14300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "Y",
        "end": 21300000,
       "label":"q11.222","type":"gneg",
        "start": 19000000,
        "value": "#ffffff"
    },
    {
        "chr": "Y",
        "end": 25400000,
       "label":"q11.223","type":"gpos50",
        "start": 21300000,
        "value": "#c8c8c8"
    },
    {
        "chr": "Y",
        "end": 27200000,
       "label":"q11.23","type":"gneg",
        "start": 25400000,
        "value": "#ffffff"
    },
    {
        "chr": "Y",
        "end": 57772954,
       "label":"q12","type":"gvar",
        "start": 27200000,
        "value": "#dcdcdc"
    }
];
})(window);
