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

const { Configuration, OpenAIApi } = require("openai");
const config = new Configuration({
	apiKey: process.env.OPEN_AI_TOKEN,
});
const openai = new OpenAIApi(config);

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
    const userSpeech = req.body.SpeechResult;
    const twiml = new twilio.twiml.VoiceResponse();
    const question = "Hi how may i assist you today? you can ask me any questions Or you can press 1 to terminate the call"

    twiml.say(question);
    twiml.gather({
        input: 'dtmf speech',
        speechTimeout: 3,
        numDigits: 1,
        speechModel: 'phone_call',
        language: 'en-IN',
        timeout: 6, // Adjust the timeout as needed
        action: twimlURL+'/second-question', // Fix the action URL
    });
    twiml.say("We didn't receive the response ending the call for now");
    resp.type('text/xml');
    resp.send(twiml.toString());
};

const secondQuestion = async (req, resp)=>{
  const twiml = new twilio.twiml.VoiceResponse();
  console.log(req.body)
  if(!req.body)
  {
    twiml.say("We didn't receive the response ending the call for now");
    resp.type('text/xml');
    resp.send(twiml.toString());
    return
  }
  if(req.body && req.body.Digits && req.body.Digits=='1')
  {
    twiml.say("Thank for contacting us");
    resp.type('text/xml');
    resp.send(twiml.toString());
    return
  }
  const userSpeech = req.body.SpeechResult;
  console.log("User Speech: " + userSpeech)
  const ai_response = await generateOpenAICompletion(userSpeech);  
  console.log(ai_response)
  const completeResponse = `${ai_response} You can ask me the next question or just press 1 to terminate the call`;

  twiml.say(completeResponse);
  twiml.gather({
      input: 'dtmf speech',
      speechTimeout: 3,
      numDigits: 1,
      speechModel: 'phone_call',
      language: 'en-IN',
      timeout: 6, // Adjust the timeout as needed
      action: twimlURL+'/second-question', // Fix the action URL
  });
  twiml.say("We didn't receive the response ending the call for now");

    resp.type('text/xml');
    resp.send(twiml.toString());
}

const thirdQuestion = async (req, resp)=>{
  const userSpeech = req.body.SpeechResult;
  console.log('Speech result for Question 1:', userSpeech);

  // After gathering the response for the first question, initiate the second question
  const twiml = new twilio.twiml.VoiceResponse();


  const ai_response = await generateOpenAICompletion(userSpeech);
  
  twiml.say(ai_response);
  twiml.gather({
      input: 'speech',
      speechTimeout: 4,
      timeout: 6, // Adjust the timeout as needed
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


const generateOpenAICompletion = async (prompt) => {
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{role: 'user', content: prompt}],
    });

      return response.data.choices[0].message.content;
  } catch (error) {
      console.error('Error generating OpenAI completion:', error);
  }
};

module.exports = {makeCall, getCalls, getRecordings, voice, secondQuestion, thirdQuestion, lastQuestion, getQuestions, saveQuestions};
