const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const BankId = require('bankid')
const nJwt = require('njwt')
const cors = require('cors')
const signingKey = 'SUPER_SECRET_KEY'
const bankid = new BankId()

app.use(cors())

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

    socket.on('collect', function(orderRef) {
        const timer = setInterval(() => {
            console.log('orderRef: ', orderRef, '; sockerId: ', socket.id)
            const done = () => clearInterval(timer)

            if (!socket.connected) {
                done()
                return
            }

            bankid
                .collect(orderRef)
                .then((response) => {
                    if (response.status === 'complete') {
                        done()
                        // Generate a token for this user
                        const claims = {
                            pnr: response.personalNumber,
                        }
                        const jwt = nJwt.create(claims, signingKey)
                        const token = jwt.compact()

                        socket.emit('success', { token })
                    } else if (response.status === 'failed') {
                        done()
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
            console.log('err: ', err) // Token has expired, has been tampered with, etc
            return response.status(403).json({ error: 'Invalid credentials' })
        } else {
            const pnr = verifiedJwt.body.pnr
            console.log('pnr: ', pnr) // Will contain the header and body
            return response.status(200).json({ pnr: pnr })
        }
    })
})

http.listen(5000, function() {
    console.log('listening on *:5000')
})
