const got = require('got')

exports.sendFailuresReport = (body) => {
  return got
    .post('https://api.mailjet.com/v3.1/send', {
      username: process.env.MJ_APIKEY_PUBLIC,
      password: process.env.MJ_APIKEY_PRIVATE,
      responseType: 'json',
      json: {
        Messages: [
          {
            From: { Name: 'ImprovMX bot', Email: 'alex@bepple.de' },
            To: [{ Email: 'alex@bepple.de' }],
            Subject: 'ImprovMX failures for bepple.de',
            TextPart: body,
          },
        ],
      },
    })
    .then(x => x.body)
}
