const express = require('express')
const {makeCall, getCalls, getRecordings} = require('../controllers/callController')

const router = express.Router()

router.post('/makecall', makeCall)
router.get('/getcalls', getCalls)
router.get('/getrecordings', getRecordings)

module.exports = router