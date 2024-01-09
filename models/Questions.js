const mongoose = require('mongoose')


const questionSchema = new mongoose.Schema({
    question: {
        type: String
    },
    question_id:{
        type: Number
    }
}, {timestamps:true})

const Question = mongoose.model('questions', questionSchema)


module.exports = Question