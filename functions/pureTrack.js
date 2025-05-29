// const latLongSiteMap = {
//     ddk:{
//         topRight: {
//             lat: 50.895905030402844,
//             long: -0.19795289700197616
//         },
//         bottomLeft: {
//             lat: 50.87892140372143,
//             long: -0.23958335473306613
//         }   
//     }
// }

require('dotenv').config({ path: '../.env' });
const pureTrackApiKey = process.env.PURETRACK_API_KEY;
const pureTrackEmail = process.env.PURETRACK_EMAIL;
const pureTrackPassword = process.env.PURETRACK_PASSWORD;

fetch("https://puretrack.io/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ key: pureTrackApiKey, email: pureTrackEmail, password: pureTrackPassword })
  })
  .then(response => response.json())
  .then(data => console.log(data));
  