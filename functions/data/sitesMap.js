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
            turnPoint: "AFB", 
            pureTrack: {
                topRight: {
                    lat: 50.847746,
                    long: 0.186209
                },
                bottomLeft: {
                    lat: 50.811059,
                    long: 0.093837
                }   
            }
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
            turnPoint: "DIT", 
            pureTrack: {
                topRight: {
                    lat: 50.909249,
                    long: -0.104857
                },
                bottomLeft: {
                    lat: 50.897312, 
                    long: -0.137679
                }   
            }
        },
        firle: {
            label: "Firle",
            lat: "50.834125",
            long: "0.086120367",
            directions:["N","NNE","NNW", "NW"],
            turnPoint: "FIB", 
            pureTrack: {
                topRight: {
                    lat: 50.853915,  
                    long: 0.114169,
                },
                bottomLeft: {
                    lat: 50.827048, 
                    long: 0.048076
                }   
            }
        },
        highAndOver: {
            label: "High and Over",
            lat: "50.788195",
            long: "0.14061213",
            directions:["E","ENE","ESE"],
            turnPoint: "AFB", 
            pureTrack: {
                topRight: {
                    lat: 50.798838,
                    long: 0.180790
                },
                bottomLeft: {
                    lat: 50.776618,
                    long: 0.124786
                }   
            }
        },
        newhaven: {
            label: "Newhaven",
            lat: "50.782348",
            long: "0.049073696",
            directions:["SSW","S","SSE"],
            turnPoint: "SEA", 
            pureTrack: {
                topRight: {
                    lat: 50.813231,
                    long: 0.101453
                },
                bottomLeft: {
                    lat: 50.773951,
                    long: -0.127543
                }   
            }
        },
        beachyHead: {
            label: "Beachy Head",
            lat: "50.50.740020",
            long: "0.25347054",
            directions:["SE"],
            turnPoint: "SEA", 
            pureTrack: {
                topRight: {
                    lat: 50.773092,  
                    long: 0.303424
                },
                bottomLeft: {
                    lat: 50.717695,
                    long: 0.136740
                }   
            }
        }
    }
}