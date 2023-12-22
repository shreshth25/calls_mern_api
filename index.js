require('dotenv').config()
const express = require('express')
const router = require('./routes/call')
require('./config/database')
const cors = require('cors')
const app =  express()
const PORT = 8000
var cron = require('node-cron');
const check_details = require('./controllers/cronController')

cron.schedule('* * * * *', () => {
    check_details()
});

app.use(cors())
app.use(express.json())
app.use('/downloads', express.static('downloads'))
app.use("/api/", router)
app.use("/cron", check_details)

app.listen(PORT, ()=>{
    console.log( `Listing to the port ${PORT}`)
})