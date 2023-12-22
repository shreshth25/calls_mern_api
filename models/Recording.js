const mongoose = require('mongoose')


const recSchema = new mongoose.Schema({
    accountSid: {
        type: String
    },
    callSid:{
        type: String
    },
    sid:{
        type: String
    },
    duration:{
        type: String
    },
    mediaUrl:{
        type: String
    },
    transciption:{
        type: String,
        default:""
    },
    status: {
        type: String,
        default: "IN_PROGRESS"
    },
    is_audio_uploaded: {
        type: String,
        default: "IN_PROGRESS"
    }
}, {timestamps:true})

const Recording = mongoose.model('recording', recSchema)


module.exports = Recording