const axios = require('axios');
const moment = require('moment');

const sendError = (hook, message) => hook.res.json({
  frames: [
    {
      text: message,
      icon: 'stop'
    }
  ]
});

module.exports = hook => {
  // Specify response content type and character set.
  hook.res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // Bus stop ID is a required parameter so check it's existance.
  if (!hook.params.id) {
    sendError(hook, 'Missing bus stop ID');
    return;
  }

  // Attempt to retrieve arrival data from the Föli API.
  axios.get(`http://data.foli.fi/siri/sm/${hook.params.id}`)
    .then(response => {
      const now = moment();
      const arrivals = response.data.result.filter(arrival => arrival.expectedarrivaltime >= now.unix());

      if (arrivals.length > 0) {
        hook.res.json({
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
        hook.res.json({
          frames: [{
            text: 'No arrivals',
            icon: 'föli'
          }]
        });
      }
    })
    .catch(() => sendError(hook, 'Unable to connect to Föli API'));
};
