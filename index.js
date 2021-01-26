const axios = require('axios');
const express = require('express');
const moment = require('moment');

const app = express();

module.exports = app;

const sendError = (res, message) => res.send({
  frames: [
    {
      text: message,
      icon: 'stop'
    }
  ]
});

app.get('/', (req, res) => {
  const { id } = req.query;

  // Bus stop ID is a required parameter so check it's existance.
  if (!id) {
    sendError(res, 'Missing bus stop ID');
    return;
  }

  // Attempt to retrieve arrival data from the Föli API.
  axios.get(`http://data.foli.fi/siri/sm/${id}`)
    .then(response => {
      const now = moment();
      const arrivals = response.data.result.filter(arrival => arrival.expectedarrivaltime >= now.unix());

      if (arrivals.length > 0) {
        res.send({
          frames: arrivals.slice(0, 5).map(arrival => {
            const time = moment.unix(arrival.expectedarrivaltime);
            const line = arrival.lineref;
            const display = arrival.destinationdisplay;
            const difference = time.diff(now, 'minutes');

            return {
              text: `${difference} min - ${line} / ${display}`,
              icon: 'föli'
            };
          })
        });
      } else {
        res.send({
          frames: [{
            text: 'No arrivals',
            icon: 'föli'
          }]
        });
      }
    })
    .catch(() => sendError(res, 'Unable to connect to Föli API'));
});
