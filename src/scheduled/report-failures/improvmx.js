const got = require('got')
const r = require('ramda')

exports.fetchAllFailures = () =>
  got(
    'https://api.improvmx.com/v3/domains/bepple.de/logs?filter=failure',
    {
      username: 'api',
      password: process.env.IMPROVMX_KEY,
      responseType: 'json'
    }
  )
  .then(x => x.body.logs)

exports.itemT = {
  getSubject: r.prop('subject'),
  getSenderAddress: x => x.sender.email,
  hasBeenDeliveredInTheEnd: x => r.any(r.whereEq({status: 'DELIVERED'}))(x.events)
}
