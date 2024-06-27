const express = require ('express')
const pool = require('./database')
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv')
const cors = require('cors'); 

const app = express()
dotenv.config()

// middleware
app.use(express.json())
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors());

// routes
app.get('/test', (req, res) => {
    res.status(200).send('<h1>OK</h1>')
})

app.use('/api/v1/user', require('./routes/userRoutes'))
app.use('/api/v1/file', require('./routes/fileRoutes'))

pool.query('SELECT 1').then(() => {
    console.log('mysql ok')
    // listen
    app.listen(process.env.PORT || 8080, () => {
        console.log('server is running')
    })
}).catch(err => {
    console.log(err)
})