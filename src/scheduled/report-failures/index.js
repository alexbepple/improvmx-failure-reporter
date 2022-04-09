const got = require('got')
const r = require('ramda')
const dff = require('date-fns/fp')
const util = require('util')
const { encryptForAlex } = require('./pgp-alex')
const { sendFailuresReport } = require('./send-report')
const { fetchAllFailures, itemT } = require('./improvmx')

async function getRecentFailuresAsOf(date) {
  const isRecent = dff.isAfter(dff.subHours(25)(date))
  return fetchAllFailures()
    .then(r.filter(x => isRecent(new Date(x.created))))
    .then(r.reject(itemT.hasBeenDeliveredInTheEnd))
}
exports.getRecentFailuresAsOf = getRecentFailuresAsOf // for testing

const simplifyEvent = r.pick(['status', 'local', 'created', 'message'])

const simplifyLogItem = r.pipe(
  r.pick(['subject', 'sender', 'hostname', 'recipient', 'events']),
  r.over(r.lensProp('events'))(r.map(simplifyEvent))
)

const getUniqueSenderAddresses = r.pipe(r.map(itemT.getSenderAddress), r.uniq)
const summarizeItems = r.pipe(
  r.groupBy(itemT.getSubject),
  r.map(xx => `${itemT.getSubject(r.head(xx))} | ${r.join(', ')(getUniqueSenderAddresses(xx))}`),
  r.values,
  r.sortBy(r.identity),
  r.join('\n---\n'),
)

const createEmail = (summary, details) => `
Summary
=======
${summary}
`

const logItems2EmailBody = r.pipe(
  r.map(simplifyLogItem),
  r.converge(createEmail, [
    summarizeItems,
    _ => util.inspect(_, { depth: 3 }),
  ])
)
exports.logItems2EmailBody = logItems2EmailBody

const log = x => console.log(JSON.stringify(x, null, 2))

exports.handler = async function (event) {
  log(event)

  const recentFailures = await getRecentFailuresAsOf(dff.parseISO(event.time))
  log(recentFailures)

  log(await sendFailuresReport(await encryptForAlex(logItems2EmailBody(recentFailures))))
}
