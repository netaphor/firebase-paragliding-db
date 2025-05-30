// Static data for the UK flying sites, currently only southern sites
exports.sitesMap = {
    southern: {
        caburn:{
            label: "Mount Caburn",
            lat: "50.861577",
            long: "0.050928801",
            directions:["WSW", "SW", "SWS", "S"],
            turnPoint: "GDE", 
            pureTrack: {
                topRight: {
                    lat: 50.868367, 
                    long: 0.063661
                },
                bottomLeft: {
                    lat: 50.848305,
                    long: 0.010185
                }   
            }
        },
        boPeep: {
            label: "Bo Peep",
            lat: "50.820581",
            long: "0.12876213",
            directions:["NNE","NE","ENE"],
            turnPoint: "AFB"
        },
        devilsDyke: {
            label: "Devils Dyke",
            lat: "50.885079",
            long: "-0.21307468",
            directions:["WNW","NW","NNW","N"],
            turnPoint: "DDK",
            pureTrack: {
                topRight: {
                    lat: 50.909966, 
                    long: -0.193342
                },
                bottomLeft: {
                    lat: 50.876550,
                    long: -0.271435
                }   
            }
        },
        ditchling: {
            label: "Ditchling",
            lat: "50.86157750.903079",
            long: "-0.11699785",
            directions:["N","NNE","NNW"],
            turnPoint: "DIT"
        },
        firle: {
            label: "Firle",
            lat: "50.834125",
            long: "0.086120367",
            directions:["N","NNE","NNW", "NW"],
            turnPoint: "FIB"
        },
        highAndOver: {
            label: "High and Over",
            lat: "50.788195",
            long: "0.14061213",
            directions:["E","ENE","ESE"],
            turnPoint: "AFB"
        },
        newhaven: {
            label: "Newhaven",
            lat: "50.782348",
            long: "0.049073696",
            directions:["SSW","S","SSE"],
            turnPoint: "SEA"
        },
        beachyHead: {
            label: "Beachy Head",
            lat: "50.50.740020",
            long: "0.25347054",
            directions:["SE"],
            turnPoint: "SEA"
        }
    }
}