const got = require('got')
const r = require('ramda')
const dff = require('date-fns/fp')
const util = require('util')

const omitUselessProps = r.omit([
  'created_raw',
  'forward',
  'id',
  'messageId',
  'saved',
  'transport',
  'url'
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
    .then(r.filter((x) => isRecent(dff.parseISO(x.created))))
}

const simplifyEvent = r.pick(['status', 'local', 'message'])

const logEntries2EmailBody = r.pipe(
  r.map(r.pipe(
    omitUselessProps,
    r.over(r.lensProp('events'))(r.map(simplifyEvent))
  )),
  _ => util.inspect(_, {depth: 3})
)

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
            TextPart: body,
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

  log(await sendEmail(logEntries2EmailBody(recentFailures)))
}
