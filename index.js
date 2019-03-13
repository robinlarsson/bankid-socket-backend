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
            .then((res) => {
                socket.emit('success')
                console.log(res.completionData)
            })
            .catch((res) => {
                console.log(res.details)
            })
    })
})

http.listen(5000, function() {
    console.log('listening on *:5000')
})
