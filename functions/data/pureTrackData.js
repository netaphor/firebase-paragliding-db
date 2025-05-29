const coords = [
    'T1748534563,L46.20923,G12.81322,A268,C0,S0.51,V-1.19,O7,D0A07C4,U0,H,RMeduno OGNFNT FNT,BMichael Brandl,NMichael Brandl,f0,o0,g268,60,K0-0A07C4',
    'T1748534576,L46.21483,G12.8171,A616,C150,S7.2,V-2.39,O7,D114C97,U0,H,RMeduno OGNFNT FNT,BHoldrio,NHoldrio,f1,o1,g456,62,K0-114C97',
    'T1748534574,L46.23102,G12.80005,A1105,C229,S6.17,V1.6,O7,D114971,U0,H,RMeduno OGNFNT FNT,BBerggeier,NBerggeier,f1,o1,g862,62,K0-114971',
    'T1748534575,L46.23183,G12.80285,A1045,C238,S7.2,V0.5,O7,D113CA8,U0,H,Q,I22,RMeduno OGFLR FLR,BFred,NFred,f1,o1,g948,h1,z2,r0.6436,62,K0-113CA8',
    'T1748534578,L46.22788,G12.80778,A911,C310,S10.29,V2.01,O7,D114A22,U0,H,Q,I17,RMeduno OGFLR FLR,BChristoph,NChristoph,f1,o1,g793,h3,z4,62,K0-114A22',
    'T1748534578,L46.2289,G12.80898,A1062,C334,S8.23,V3.12,O7,D114A2C,U0,H,Q,I2,Rfvgogn OGFLR FLR,BFelix F.,NFelix F.,f1,o1,g876,h1,z3,r0.9615,62,K0-114A2C',
    'T1748534576,L46.23017,G12.80862,A1117,C302,S9.26,V-1.1,O7,D11263C,U0,H,Q,I14.8,RMeduno OGFLR FLR,BMichael,NMichael,f1,o1,g967,h10,z19,r0.9756,62,K0-11263C',
    'T1748534575,L46.23205,G12.79832,A971,C243,S10.8,V0.2,O7,D113E66,U0,H,Q,I30.5,RMeduno OGFLR FLR,BJahn Blum,NJahn Blum,f1,o1,g926,h2,z4,62,K0-113E66',
    'T1748534577,L46.23403,G12.79843,A1102,C217,S3.09,V1.41,O7,D1139D2,U0,H,Q,I23,RMeduno OGFLR FLR,BLukas Mysli,NLukas Mysli,f1,o1,g1068,h2,z3,62,K0-1139D2',
    'T1748534575,L46.23443,G12.79853,A1126,C224,S5.66,V-0.4,O7,D113C96,U0,H,Q,I16.2,RMeduno OGFLR FLR,BArno,NArno,f1,o1,g1068,h1,z2,62,K0-113C96',
    'T1748534555,L46.2322,G12.8005,A990,C267,S8.23,V0.3,O7,D201754,U0,H,RNAVITER2 OGNAVI FNT,f1,o1,g912,62,K0-201754',
    'T1748534573,L46.23363,G12.80057,A1222,C273,S7.72,V-0.8,O7,D1153BB,U0,H,Q,I26.2,RMeduno OGFLR FLR,BMartin Schmöller,NMartin Schmöller,f1,o1,g1020,h2,z4,62,K0-1153BB',
    'T1748534566,L46.23438,G12.80107,A1093,C241,S0.51,V0,O7,D2006F8,U0,H,Q,I22.8,RMeduno OGFLR FLR,f0,o0,g1074,h2,z4,60,K0-2006F8',
    'T1748534559,L46.23405,G12.80117,A1089,C287,S7.2,V0,O7,D110607,U0,H,RMeduno OGNFNT FNT,BStefan,NStefan,ePEZ,f1,o1,g1074,62,K0-110607',
    'T1748534577,L46.23398,G12.80178,A1094,C163,S4.63,V-0.1,O7,D11582D,U0,H,Q,I25.2,RMeduno OGFLR FLR,BAndiH,NAndiH,f1,o1,g1079,h1,z2,62,K0-11582D',
    'T1748534551,L46.2344,G12.80135,A1094,C0,S0,V0,O7,D200BBD,U0,H,Q,I8,RMeduno OGFLR FLR,f0,o0,g1074,60,K0-200BBD',
    'T1748534569,L46.23435,G12.80148,A1092,C224,S0,V-0.1,O7,D1154E2,U0,H,Q,I9.2,RMeduno OGFLR FLR,BPzChri,NPzChri,f0,o0,g1074,h2,z3,60,K0-1154E2',
    'T1748534574,L46.23223,G12.80243,A1052,C15,S11.32,V0.2,O7,D113462,U0,H,Rfvgogn OGNFNT FNT,BBeppo,NBeppo,f1,o1,g933,r0.8333,62,K0-113462',
    'T1748534575,L46.23213,G12.80342,A1122,C294,S8.74,V1.51,O7,D1124FB,U0,H,Q,I21.2,RMeduno OGFLR FLR,BStefan Schneider,NStefan Schneider,f1,o1,g968,h1,z2,62,K0-1124FB',
    'T1748534573,L46.23293,G12.80377,A1109,C148,S4.63,V-0.4,O7,D1148F3,U0,H,RMeduno OGNFNT FNT,BJavier Mesa,NJavier Mesa,f1,o1,g1012,62,K0-1148F3',
    'T1748534578,L46.23213,G12.80463,A1100,C348,S12.86,V-1.5,O7,D111BE2,U0,H,Q,I4,Rfvgogn OGFLR FLR,BStoa,NStoa,f1,o1,g988,h1,z2,62,K0-111BE2',
    'T1748534578,L46.22303,G12.81747,A958,C0,S11.32,V-2.01,O7,D113C03,U0,H,Q,I16.8,RMeduno OGFLR FLR,BTom,NTom,f1,o1,g805,h2,z3,62,K0-113C03',
    'T1748534578,L46.22373,G12.81872,A1080,C307,S10.29,V-1.3,O7,D0A052B,U0,H,Q,I28.5,RMeduno OGFLR FLR,BCindy,NCindy,f1,o1,g870,62,K0-0A052B',
    'T1748534577,L46.2293,G12.8108,A1209,C241,S5.14,V-1.4,O7,D0A050E,U0,H,Q,I21.8,RMeduno OGFLR FLR,BKirschi,NKirschi,f1,o1,g958,62,K0-0A050E'
  ];

//export { coords };



//   Parameters

// lat_distance, long_distance: distance of bounding box, for debugging
// lat1, long1, lat2, long2: bounding box corners used, for debugging
// data: the data points returned. Details below.
// time: time taken to process the request in ms
// success: boolean, true or false.
// http_code: the http_code returned
// Data Rows Specification
// The array of data is a list of comma separated lines. Each item is identified by it's first letter/digit, and is case sensitive. Most values are not guaranteed to exist except the timestamp, lat/long and key.

// 'T': Timestamp Epoch Unix Timestamp
// 'L': lat
// 'G': long
// 'K': key - PureTrack key, to uniquely identify this object in PureTrack. If matching an aircraft, it is prefixed with Y- plus rego. If matches a PureTrack target, prefixed wtih X- or Z-. For unknown items, prefixed with source type ID number and tracker_uid e.g. a FLARM target will be 0-ABC123.
// 'A': alt_gps - meters, altitude returned by most devices. ADSB calculated from local pressure. See also 't' for standard pressure altitude from ADSB.
// 'P': pressure - the current latest 6 hour pressure for nearest location, used to calibrate ADSB altitude.
// 'C': course in degrees 0-360
// 'S': speed in m/s
// 'V': v_speed in m/s
// 'O': object_type see list of types https://puretrack.io/types.json
// 'Z': timezone - not used at the moment (Timestamp returned is Unixtime).
// 'D': tracker_uid - The ID of the original tracker. In the case of FLARM FlarmID or ADSB ICAO hex code.
// 'H': stealth - If this item is stealth or not from flarm.
// 'Q': no_tracking - If this item is stealth or not from flarm
// 'I': signal_quality
// 'R': receiver_name
// 'U': source_type_id - ID of source of this point. List below of source IDs
// 'J': target_id - The PureTrack target ID. A 'target' matches an item to a map marker and other user configured options.
// 'B': label - Label, either returned from the tracking service, or added from what the user has configured via the target
// 'N': name - actual name of a pilot if provided
// 'E': rego - If an aircraft, the full rego e.g. ZK-GOP
// 'M': model - Aircraft model.
// 's': speed_calc - not used
// 'd': dist_calc - not used
// 'v': v_speed_calc - not used
// 'f': flying - not used
// 'x': ignore - not used
// 'g': gl - Ground level at this point
// 'i': tracker_id - Internal puretrack ID
// 'e': comp - not used?
// 'c': colour - Colour selected by user to use on map. Generated randomly if not provided.
// 'a': aircraft_id
// 'j': target_key
// 'k': inreach_id
// 'l': spot_id
// 'h': accuracy_horizontal
// 'z': accuracy_vertical
// 'u': username - Username provided by some services e.g. Skylines, Flymaster etc
// 'm': callsign - callsign of aircraft, usually from ADSB
// 'n': comp_name - Contest name
// 'b': comp_class - Name of the contest class
// 'q': comp_class_id - ID of the contest class
// 't': alt_standard - standard pressure altitude in meters
// 'r': thermal_climb_rate - m/s. calculated thermal climb rate from start of climb to current location.
// 'p': phone - user's phone number
// 'F': ffvl_key - if the target has an FFVL key
// '!': random - If the item is a randomly generated ID from FLARM
// '1': take_off_id - location of take off
// '2': landing_id - location of landing
// '3': voltage_int - internal device battery voltage
// '4': voltage_ext - external device voltage
// '5': satellites - number of sats
// '6': state - current state of map marker
// '7': set_state - not used yet
// '8': on_ground - if the map marker is on the ground (generally from ADSB)
// '^': send_ogn_hex - if the map marker is forwarded to OGN using this hex
// Source IDs
// 0 = flarm
// 1 = spot
// 2 = particle
// 3 = overland
// 4 = spotnz
// 5 = inreachnz
// 6 = btraced
// 7 = api
// 8 = mt600-l-gnz
// 9 = inreach
// 10 = igc
// 11 = pi
// 12 = adsb
// 13 = igcdroid
// 14 = navigator
// 16 = puretrack
// 17 = teltonika
// 18 = celltracker
// 19 = mt600
// 20 = mt600-l
// 21 = api
// 22 = fr24
// 23 = xcontest
// 24 = skylines
// 25 = flymaster
// 26 = livegliding
// 27 = ADSBExchange
// 28 = adsb.lol
// 29 = adsb.fi
// 30 = SportsTrackLive
// 31 = FFVL Tracking
// 32 = Zoleo
// 33 = Total Vario
// 34 = Tracker App
// 35 = OGN ICAO
// 36 = XC Guide
// 37 = Bircom
// 38 = JimiIoT
// 39 = XCMania
// 40 = Traccar
// 41 = SKYTRAXX
// 42 = Gaggle
// 43 = Wingman
// 44 = Schar
// 45 = airplanes.live
// 46 = ADSB