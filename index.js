const { format: formatDate, formatDistance, fromUnixTime, getUnixTime } = require('date-fns');
const express = require('express');
const fetch = require('node-fetch');

const app = express();

module.exports = app;

const sendError = (res, message) => res.send({
  frames: [{
    text: message,
    icon: 'stop'
  }]
});

app.get('/', (req, res) => {
  const { format, id } = req.query;

  // Bus stop ID is a required parameter so check it's existance.
  if (!id) {
    sendError(res, 'Missing bus stop ID');
    return;
  }

  const renderArrivalTime = (expectedArrivalTime, now) => {
    switch (format) {
      case 'Distance':
        return formatDistance(expectedArrivalTime, now);

      case '12 hour clock':
        return formatDate(expectedArrivalTime, 'hh:mma');

      case '24 hour clock':
      default:
        return formatDate(expectedArrivalTime, 'HH:mm');
    }
  };

  // Attempt to retrieve arrival data from the Föli API.
  fetch(`http://data.foli.fi/siri/sm/${id}`)
    .then(response => response.json())
    .then(response => {
      const now = Date.now();
      const unixNow = getUnixTime(now);
      const arrivals = response.result.filter(arrival => arrival.expectedarrivaltime >= unixNow);

      if (arrivals.length > 0) {
        res.send({
          frames: arrivals.slice(0, 5).map(arrival => ({
            text: `${renderArrivalTime(fromUnixTime(arrival.expectedarrivaltime), now)} - ${arrival.lineref} / ${arrival.destinationdisplay}`,
            icon: 'föli'
          }))
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
