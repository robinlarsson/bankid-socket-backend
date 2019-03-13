const BankId = require('bankid')

const bankid = new BankId({ refreshInterval: 2000 })
const pno = '197001011985'

bankid
    .authenticateAndCollect('127.0.0.1', pno)
    .then((res) => console.log(res.completionData))
    .catch(console.error)
