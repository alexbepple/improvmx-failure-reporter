const got = require('got')
const r = require('ramda')
const dff = require('date-fns/fp')
const util = require('util')

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
exports.getRecentFailuresAsOf = getRecentFailuresAsOf

const simplifyEvent = r.pick(['status', 'local', 'created', 'message'])

const simplifyLogEntry = r.pipe(
  r.pick(['subject', 'sender', 'hostname', 'recipient', 'events']),
  r.over(r.lensProp('events'))(r.map(simplifyEvent))
)

const logEntries2EmailBody = r.pipe(
  r.map(simplifyLogEntry),
  _ => util.inspect(_, {depth: 3})
)
exports.logEntries2EmailBody = logEntries2EmailBody

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
