const { default: mongoose } = require("mongoose");

const chatSchema = new mongoose.Schema({
    callSid : {type: String, require: true},
    messages: [{ role: String, content: String }],
})

const Chat = mongoose.model('Chat', chatSchema)


module.exports = Chat