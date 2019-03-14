const app = require('express')()
const session = require('express-session')
const http = require('http').Server(app)
const io = require('socket.io')(http)
const BankId = require('bankid')
const nJwt = require('njwt')
const cors = require('cors')
const sharedsession = require('express-socket.io-session')
const signingKey = 'SUPER_SECRET_KEY'
const bankid = new BankId({ refreshInterval: 2000 })
const sessionHolder = session({
    // key: 'token',
    secret: 'mySecretIsMyPassion',
    resave: true,
    saveUninitialized: true,
    cookie: {
        expires: 600000,
    },
})

app.use(cors())
app.use(sessionHolder)
io.use(sharedsession(sessionHolder))

const message = 'BankID'

io.on('connection', function(socket) {
    console.log(`Socket ${socket.id} connected.`)
    socket.on('authenticate', function(pnr) {
        bankid
            .authenticate('127.0.0.1', pnr)
            .then((response) => {
                socket.emit('orderRef', response.orderRef)
            })
            .catch((response) => {
                socket.emit('failure', { details: response.details })
            })
    })

    socket.on('checkAlreadyCollectedBankIDStatus', (orderRef) => {
        console.log('session: ', socket.handshake.session.orderRef)
        if (socket.handshake.session.orderRef === orderRef) {
            const token = socket.handshake.session.token
            socket.emit('success', { token })
            delete socket.handshake.session.orderRef
            delete socket.handshake.session.token
            socket.handshake.session.save()
            done()
        }
    })

    socket.on('collect', function(orderRef) {
        const timer = setInterval(() => {
            console.log('orderRef: ', orderRef)
            const done = () => clearInterval(timer)

            bankid
                .collect(orderRef)
                .then((response) => {
                    if (response.status === 'complete') {
                        // Generate a token for this user
                        const claims = {
                            pnr: response.personalNumber,
                        }
                        const jwt = nJwt.create(claims, signingKey)
                        const token = jwt.compact()
                        console.log('CONNECTED: ', socket.connected, token)
                        // if (socket.connected) {
                        socket.volatile.emit('success', { token })
                        /*} else {
                            console.log(token, orderRef)
                            socket.handshake.session.orderRef = orderRef
                            socket.handshake.session.token = token
                            socket.handshake.session.save()
                        }*/
                        // console.log(response.completionData)
                        done()
                    } else if (response.status === 'failed') {
                        throw new Error(response.hintCode)
                    }
                })
                .catch((err) => {
                    console.error(err)
                    done()
                })
        }, 2000)
    })
})

app.get('/secret', function(req, response, next) {
    response.setHeader('Content-Type', 'application/json')

    if (!req.headers.authorization) {
        return response.status(403).json({ error: 'No credentials' })
    }

    token = req.headers.authorization.split(' ')[1]

    nJwt.verify(token, signingKey, function(err, verifiedJwt) {
        if (err) {
            console.log(err) // Token has expired, has been tampered with, etc
            return response.status(403).json({ error: 'Invalid credentials' })
        } else {
            const pnr = verifiedJwt.body.pnr
            console.log(pnr) // Will contain the header and body
            return response.status(200).json({ pnr: pnr })
        }
    })
})

http.listen(5000, function() {
    console.log('listening on *:5000')
})
