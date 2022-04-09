const got = require('got')
const r = require('ramda')
const dff = require('date-fns/fp')
const util = require('util')
const { encryptForAlex } = require('./pgp-alex')

const fetchAllFailures = () => got(
  'https://api.improvmx.com/v3/domains/bepple.de/logs?filter=failure',
  {
    username: 'api',
    password: process.env.IMPROVMX_KEY,
    responseType: 'json'
  }
)

async function getRecentFailuresAsOf(date) {
  const isRecent = dff.isAfter(dff.subHours(25)(date))
  return fetchAllFailures()
    .then(x => x.body.logs)
    .then(r.filter(x => isRecent(new Date(x.created))))
}
exports.getRecentFailuresAsOf = getRecentFailuresAsOf // for testing

const simplifyEvent = r.pick(['status', 'local', 'created', 'message'])

const simplifyLogEntry = r.pipe(
  r.pick(['subject', 'sender', 'hostname', 'recipient', 'events']),
  r.over(r.lensProp('events'))(r.map(simplifyEvent))
)

const entryT = {
  getSubject: r.prop('subject'),
  getSenderEmail: x => x.sender.email,
}
const getUniqueSenderEmails = r.pipe(r.map(entryT.getSenderEmail), r.uniq)
const summarizeEntries = r.pipe(
  r.groupBy(entryT.getSubject),
  r.map(xx => `${entryT.getSubject(r.head(xx))} | ${r.join(', ')(getUniqueSenderEmails(xx))}`),
  r.values,
  r.sortBy(r.identity),
  r.join('\n---\n'),
)

const createEmail = (summary, details) => `
Summary
=======
${summary}
`

const logEntries2EmailBody = r.pipe(
  r.map(simplifyLogEntry),
  r.converge(createEmail, [
    summarizeEntries,
    _ => util.inspect(_, { depth: 3 }),
  ])
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
    .then(x => x.body)
}

const log = x => console.log(JSON.stringify(x, null, 2))

exports.handler = async function (event) {
  log(event)

  const recentFailures = await getRecentFailuresAsOf(dff.parseISO(event.time))
  log(recentFailures)

  log(await sendEmail(await encryptForAlex(logEntries2EmailBody(recentFailures))))
}
