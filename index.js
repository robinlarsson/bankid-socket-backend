const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const BankId = require('bankid')
const nJwt = require('njwt')
const cors = require('cors')

const signingKey = 'SUPER_SECRET_KEY'
const bankid = new BankId({ refreshInterval: 2000 })

app.use(cors())

io.on('connection', function(socket) {
    console.log('connected')
    socket.on('authenticateAndCollect', function(pnr) {
        bankid
            .authenticateAndCollect('127.0.0.1', pnr)
            .then((res) => {
                // Generate a token for this user
                const claims = {
                    pnr,
                }
                const jwt = nJwt.create(claims, signingKey)
                socket.emit('success', { token: jwt.compact() })
                console.log(res.completionData)
            })
            .catch((response) => {
                socket.emit('failure', { details: response.details })
            })
    })
})

app.get('/secret', function(req, res, next) {
    res.setHeader('Content-Type', 'application/json')

    if (!req.headers.authorization) {
        return res.status(403).json({ error: 'No credentials' })
    }

    token = req.headers.authorization.split(' ')[1]

    nJwt.verify(token, signingKey, function(err, verifiedJwt) {
        if (err) {
            console.log(err) // Token has expired, has been tampered with, etc
            return res.status(403).json({ error: 'Invalid credentials' })
        } else {
            const pnr = verifiedJwt.body.pnr
            console.log(pnr) // Will contain the header and body
            return res.status(200).json({ pnr: pnr })
        }
    })
})

http.listen(5000, function() {
    console.log('listening on *:5000')
})
