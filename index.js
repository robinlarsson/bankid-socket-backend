const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const BankId = require('bankid')
const nJwt = require('njwt');

const signingKey = 'SUPER_SECRET_KEY'; 
const bankid = new BankId({ refreshInterval: 2000 })

io.on('connection', function(socket) {
    console.log('connected')
    socket.on('authenticateAndCollect', function(pnr) {
        bankid
            .authenticateAndCollect('127.0.0.1', pnr)
            .then((res) => {
                // Generate a token for this user
                const claims = {
                    pnr: pnr
                }
                const jwt = nJwt.create(claims, signingKey);
                socket.emit('success', jwt.compact())
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
