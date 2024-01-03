const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);
const axios = require('axios');
const fs = require('fs');
const mongoose = require("mongoose");
const Recording = require("../models/Recording");


const makeCall = (req, resp) => {
    console.log(req.body)
    const number = req.body.number
    const name = req.body.name

    client.calls.create({
        record: true,
        twiml: `<Response>
        <Gather input="speech dtmf" timeout="20">
            <Say>Hi ${name}, Please say something in the next 20 seconds.</Say>
        </Gather>
        <Hangup/>
        </Response>`,
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


module.exports = {makeCall, getCalls, getRecordings};
