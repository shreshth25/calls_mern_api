const Recording = require("../models/Recording");
const axios = require('axios');
const fs = require('fs');
const AWS = require('aws-sdk');

const textToSpeech = require('@google-cloud/text-to-speech');
const fs1 = require('fs').promises;

AWS.config.update({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: 'ap-southeast-2',
});

const s3BucketName = 'shreshthbansaltranscriberecordings';
const audioUploadPath = 'uploads/';

const downloadRecording = async (recording_id) => {
    try {
        const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
        const CALL_TOKEN = process.env.CALL_TOKEN
        const response = await axios.get(`https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Recordings/${recording_id}`, {
            headers: {
                'Authorization': `Basic ${CALL_TOKEN}`
            },
            responseType: 'stream',
        });

        const audioFilePath = `${audioUploadPath}${recording_id}.mp3`;
        const fileStream = fs.createWriteStream(audioFilePath);
        response.data.pipe(fileStream);

        await new Promise((resolve, reject) => {
            fileStream.on('finish', resolve);
            fileStream.on('error', reject);
        });

        console.log('Recording downloaded successfully.');
        return audioFilePath;
    } catch (error) {
        console.error('Error downloading recording:', error.message);
        throw error;
    }
};

const uploadToS3 = async (audioFilePath, recording_id) => {
    const s3 = new AWS.S3();

    const params = {
        Bucket: s3BucketName,
        Key: `${recording_id}.mp3`,
        Body: fs.createReadStream(audioFilePath)
    };

    return new Promise((resolve, reject) => {
        s3.upload(params, (err, data) => {
            if (err) {
                console.error('Error uploading file to S3:', err);
                reject(err);
            } else {
                console.log('File uploaded successfully to S3. S3 Object URL:', data.Location);
                resolve(data.Location);
            }
        });
    });
};

const startTranscriptionJob = async (audioFilePath, recording_id) => {
    const transcribeService = new AWS.TranscribeService();

    const transcribeParams = {
        LanguageCode: 'en-US',
        Media: { MediaFileUri: `s3://${s3BucketName}/${recording_id}.mp3` },
        TranscriptionJobName: recording_id,
        OutputBucketName: s3BucketName,
    };

    return new Promise((resolve, reject) => {
        transcribeService.startTranscriptionJob(transcribeParams, (err, data) => {
            if (err) {
                console.error('Error starting transcription job:', err);
                reject(err);
            } else {
                console.log('Transcription job started successfully:', data);
                resolve(data);
            }
        });
    });
};

const updateRecordingStatus = async (recording_id) => {
    const updatedRecording = await Recording.findOneAndUpdate(
        { 'sid': recording_id },
        { $set: { is_audio_uploaded: 'SUCCESS' } },
        { new: true }
    );

    if (updatedRecording) {
        console.log('Record updated in the database:', updatedRecording);
    } else {
        console.log('Record not found for update.');
    }
};

const processRecording = async (recording_id) => {
    try {
        const audioFilePath = await downloadRecording(recording_id);
        await uploadToS3(audioFilePath, recording_id);
        await startTranscriptionJob(audioFilePath, recording_id);
        await updateRecordingStatus(recording_id);
    } catch (error) {
        console.error('Error processing recording:', error.message);
    }
};

const checkTranscriptionStatus = async (recording_id) => {
  console.log(recording_id);
  // Add logic to check transcription status and save transcription in MongoDB
  try {
    // Example: Fetch transcription job details from AWS Transcribe
    const transcribeService = new AWS.TranscribeService();
    const transcriptionJob = await transcribeService.getTranscriptionJob({
      TranscriptionJobName: recording_id
    }).promise();

    // Example: Check if transcription is complete
    if (transcriptionJob.TranscriptionJob.TranscriptionJobStatus === 'COMPLETED') {
      const transcriptFileUri = transcriptionJob.TranscriptionJob.Transcript.TranscriptFileUri;

      // Download the transcript JSON file
      const transcriptResponse = await axios.get(transcriptFileUri);
      const transcriptText = transcriptResponse.data.results.transcripts[0].transcript;
      const updatedRecording = await Recording.findOneAndUpdate(
        { 'sid': recording_id },
        { $set: { transciption: transcriptText} },
        { new: true }
    );
      console.log(`Transcription for recording ${recording_id} completed. Transcription saved.`);
    } else {
      console.log(`Transcription for recording ${recording_id} still in progress or failed.`);
    }
  } catch (error) {
    console.error(`Error checking transcription status for recording ${recording_id}:`, error);
  }
};


const saveTranscriptionAudio = async (recording_id) => {
  const data = await Recording.findOne({'sid': recording_id})


  // Create an instance of Polly
  const polly = new AWS.Polly();

  // Text to be converted to speech
  const textToSpeech = data['transciption']

  // Set the parameters for the Polly.synthesizeSpeech operation
  const params = {
    Text: textToSpeech,
    OutputFormat: 'mp3',
    VoiceId: 'Joanna', // You can choose a different voice ID, e.g., 'Matthew'
  };

  // Perform the synthesizeSpeech operation
  polly.synthesizeSpeech(params, (err, data) => {
    if (err) {
      console.error('Error converting text to speech:', err);
      return
    } else {
      // Save the speech as an MP3 file
      fs.writeFileSync(`downloads/${recording_id}.mp3`, data.AudioStream);
      console.log('Text converted to speech. MP3 file saved as output.mp3.');
      
    }
  });

  const updatedRecording = await Recording.findOneAndUpdate(
    { 'sid': recording_id },
    { $set: { status: 'SUCCESS' } },
    { new: true }
);

};

const saveTranscriptionAudioGoogle = async (recording_id) => {
  try {
    const data = await Recording.findOne({'sid': recording_id});

    // Text to be converted to speech
    const textToSpeechContent  = data['transciption'];

    // Create a TextToSpeechClient
    const textToSpeechClient = new textToSpeech.TextToSpeechClient();

    // Set the Text-to-Speech request parameters
    const request = {
      input: { text: textToSpeechContent },
      voice: { languageCode: 'en-US', name: 'en-US-Wavenet-J', ssmlGender: 'FEMALE' }, // You can choose a different voice
      audioConfig: { audioEncoding: 'MP3' },
    };

    // Perform the text-to-speech conversion
    const [response] = await textToSpeechClient.synthesizeSpeech(request);

    // Save the speech as an MP3 file
    await fs1.writeFile(`downloads/${recording_id}.mp3`, response.audioContent, 'binary');

    console.log('Text converted to speech. MP3 file saved as output.mp3.');

    // Update the recording status to 'SUCCESS'
    const updatedRecording = await Recording.findOneAndUpdate(
      { 'sid': recording_id },
      { $set: { status: 'SUCCESS' } },
      { new: true }
    );
  } catch (error) {
    console.error('Error converting text to speech:', error);
  }
};

const check_details = async (res, resp) => {
  console.log("API STARTED")
  const recordings = await Recording.find({ 'status': 'IN_PROGRESS' });

  for (const recording of recordings) {
    if (recording['is_audio_uploaded'] === 'IN_PROGRESS') {
      await processRecording(recording['sid']);
    } 
    else {
      console.log(`Already uploaded to System ${recording['sid']}`);
      if(recording['transciption']=='')
      {
        await checkTranscriptionStatus(recording['sid']);        
      } 
      console.log("here")
      const rec = await Recording.findOne({'sid':recording['sid']})
      if(recording['transciption']!='')
      {
        await saveTranscriptionAudioGoogle(recording['sid'])
      }
    }
  }
  resp.json({"message":"Code Updated"})
};

module.exports = check_details;
