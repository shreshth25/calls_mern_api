const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);
const axios = require('axios');
const fs = require('fs');
const mongoose = require("mongoose");
const Recording = require("../models/Recording");
const twilio = require('twilio');
const Question = require("../models/Questions");
const twimlURL = 'https://api.shreshthbansal.cloud/api'

const makeCall = async (req, resp) => {
    console.log(req.body)
    const number = req.body.number
    const name = req.body.name

    client.calls.create({
        record: true,
        url: twimlURL+'/voice',
        to: "+91" + number,
        from: "+17047614402",
    })
        .then(call => {
            console.log(call.sid);
            mongoose
            resp.json({"status": 'success', "CallID": call.sid});
        })
        .catch(error => {
            console.error('Error creating call:', error);
            resp.json({"status": 'error', "CallID": ""});
        });
}

const voice = async (req, resp)=>{
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Please answer the following questions.');

    const question = await Question.findOne({'question_id':1})

    twiml.say(question['question']);
    twiml.gather({
        input: 'speech',
        speechTimeout: 2,
        timeout: 8, // Adjust the timeout as needed
        action: twimlURL+'/second-question', // Fix the action URL
    });

    resp.type('text/xml');
    resp.send(twiml.toString());
};

const secondQuestion = async (req, resp)=>{
  console.log(req.body)
  const userSpeech = req.body.SpeechResult;
  console.log('Speech result for Question 1:', userSpeech);

  // After gathering the response for the first question, initiate the second question
  const twiml = new twilio.twiml.VoiceResponse();
  const question = await Question.findOne({'question_id':2})

  twiml.say(question['question']);
  twiml.gather({
      input: 'speech',
      speechTimeout: 2,
      timeout: 8, // Adjust the timeout as needed
      action: twimlURL+'/third-question', // Fix the action URL
  });

    resp.type('text/xml');
    resp.send(twiml.toString());
}

const thirdQuestion = async (req, resp)=>{
  const userSpeech = req.body.SpeechResult;
  console.log('Speech result for Question 1:', userSpeech);

  // After gathering the response for the first question, initiate the second question
  const twiml = new twilio.twiml.VoiceResponse();


  const question = await Question.findOne({'question_id':3})

  twiml.say(question['question']);
  twiml.gather({
      input: 'speech',
      speechTimeout: 2,
      timeout: 8, // Adjust the timeout as needed
      action: twimlURL+'/last-question', // Fix the action URL
  });

    resp.type('text/xml');
    resp.send(twiml.toString());
}


const lastQuestion = (req, resp)=>{
  const userSpeech = req.body.SpeechResult;
  console.log('Speech result for Question 2:', userSpeech);
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say('Thanks for the response Have a Good Day');
  twiml.hangup();
  resp.type('text/xml');
  resp.send(twiml.toString());
}

const getCalls = async (req, resp) => {
  console.log("ds")
    try {
        const calls = await client.calls.list();
    
        // Process the list of calls
        const callsList = []
        calls.forEach(call => {
          callsList.push(call)
        });
        resp.json({"data":callsList})
      } catch (error) {
        console.error('Error fetching calls:', error);
      }
}

const getRecordings = async (req, resp) => {
    try {
        const recordings = await client.recordings.list();
        for (const recording of recordings) {
            const existingRecord = await Recording.findOne({ sid: recording.sid });

            if (!existingRecord) {
              const record = new Recording({
                accountSid: recording.accountSid,
                callSid: recording.callSid,
                sid: recording.sid,
                duration: recording.duration,
                mediaUrl: recording.mediaUrl
              });
      
              await record.save();
              console.log(`Recording ${recording.sid} saved to the database.`);
            }
          }
        const recordingsList = await Recording.find({}).sort({ createdAt: -1 })
        resp.json({"data": recordingsList});
    } catch (error) {
        console.error('Error fetching recordings:', error);
        resp.status(500).json({"error": "Internal Server Error"});
    }
};

const getQuestions = async (req, resp) => {
  try {
      const questions = await Question.find()
      resp.json({"data": questions});
  } catch (error) {
      console.error('Error fetching questions:', error);
      resp.status(500).json({"error": "Internal Server Error"});
  }
};


const saveQuestions = async (req, resp) => {
  console.log(1)
  try {
    const itemId = req.params.id;
    const { question } = req.body;
    console.log(itemId, question)
    const updatedItem = await Question.findOneAndUpdate(
      { 'question_id': itemId },
      { $set: { question } },
      { new: true }
    );
    console.log(updatedItem)
    resp.json(updatedItem);
  } catch (error) {
    console.log(error)
    resp.status(500).json({ error: 'Internal Server Error' });
  }
};


module.exports = {makeCall, getCalls, getRecordings, voice, secondQuestion, thirdQuestion, lastQuestion, getQuestions, saveQuestions};
