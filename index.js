const http = require('http');

const sendError = (hook, message = 'Unable to connect Föli API') => {
  hook.res.json({
    frames: [
      {
        text: message,
        icon: 'stop'
      }
    ]
  });
};

const formatTime = time => {
  const prefixWithZero = value => `${value < 10 ? '0' : ''}${value}`;
  const hours = time.getHours();
  const minutes = time.getMinutes();
  
  return `${prefixWithZero(hours)}:${prefixWithZero(minutes)}`;
};


module.exports = hook => {
  // Specify response content type and character set.
  hook.res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // Bus stop ID is a required parameter so check it's existance.
  if (!hook.params.id) {
    sendError(hook, 'Missing bus stop ID');
    return;
  }
  
  // Attempt to retrieve arrival data from the Föli API.
  http.get(
    `http://data.foli.fi/siri/sm/${hook.params.id}`,
    response => {
      const { statusCode } = response;
      const contentType = response.headers['content-type'];
      let rawData = '';

      // Check whether the API returned HTTP response 200 and some JSON.
      if (statusCode !== 200 || !/^(application|text)\/json/.test(contentType)) {
        sendError(hook);
        return;
      }

      // Read the entire response into local variable.
      response.setEncoding('utf8');
      response.on('data', chunk => { rawData += chunk; });
      response.on('end', () => {
        try {
          const parsedData = JSON.parse(rawData);
          const now = Date.now();
          const futureArrivals = parsedData.result.filter(arrival => arrival.expectedarrivaltime > now);
          
          if (futureArrivals.length > 0) {
            hook.res.json({
              frames: futureArrivals.result.slice(0, 5).map(arrival => {
                const time = new Date(arrival.expectedarrivaltime * 1000);
                const line = arrival.lineref;
                const display = arrival.destinationdisplay;
                
                return {
                  text: `${formatTime(time)} - ${line} - ${display}`,
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
        } catch (e) {
          sendError(hook);
        }
      });
    }
  ).on('error', () => sendError(hook));
};
