const express = require('express')
const {makeCall, getCalls, getRecordings, voice, secondQuestion, thirdQuestion, lastQuestion, getQuestions, saveQuestions} = require('../controllers/callController')
const check_details = require('../controllers/cronController')

const router = express.Router()

router.post('/makecall', makeCall)
router.get('/getcalls', getCalls)
router.get('/getrecordings', getRecordings)
router.get('/cron', check_details)
router.all('/voice', voice)
router.all('/second-question', secondQuestion)
router.all('/third-question', thirdQuestion)
router.all('/last-question', lastQuestion)
router.get('/questions', getQuestions)
router.put('/questions/:id', saveQuestions)

module.exports = router