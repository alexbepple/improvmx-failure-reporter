const got = require('got')
const r = require('ramda')
const dff = require('date-fns/fp')
const util = require('util')

const omitUselessProps = r.omit([
  'created_raw',
  'forward',
  'messageId',
  'transport',
])

async function getRecentFailuresAsOf(date) {
  const isRecent = dff.isAfter(dff.subHours(25)(date))
  return got(
    'https://api.improvmx.com/v2/domains/bepple.de/logs?filter=failure',
    {
      username: 'api',
      password: process.env.IMPROVMX_KEY,
      responseType: 'json',
    }
  )
    .then((x) => x.body.logs)
    .then(
      r.pipe(
        r.filter((x) => isRecent(dff.parseISO(x.created))),
        r.map(omitUselessProps)
      )
    )
}

async function sendEmail(body) {
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
            TextPart: util.inspect(body),
          },
        ],
      },
    })
    .then((x) => x.body)
}

const log = (x) => console.log(JSON.stringify(x, null, 2))

exports.handler = async function (event) {
  log(event)

  const recentFailures = await getRecentFailuresAsOf(dff.parseISO(event.time))
  log(recentFailures)

  log(await sendEmail(recentFailures))
}
