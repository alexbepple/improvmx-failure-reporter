const got = require('got')
const r = require('ramda')
const dff = require('date-fns/fp')

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

exports.handler = async function (event) {
  console.log(JSON.stringify(event, null, 2))

  const recentFailures = await getRecentFailuresAsOf(dff.parseISO(event.time))
  console.log(JSON.stringify(recentFailures, null, 2))
}
