const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const BankId = require('bankid')

const bankid = new BankId({ refreshInterval: 2000 })

io.on('connection', function(socket) {
    console.log('connected')
    socket.on('authenticateAndCollect', function(pnr) {
        console.log('pnr: ' + pnr)
        bankid
            .authenticateAndCollect('127.0.0.1', pnr)
            .then((response) => {
                socket.emit('success')
                console.log(response.completionData)
            })
            .catch((response) => {
                socket.emit('failure', { details: response.details })
            })
    })
})

http.listen(5000, function() {
    console.log('listening on *:5000')
})
