const mongoose = require('mongoose');

var Schema = mongoose.Schema;

var articleSchema = new Schema({
    headline: String,
    url: {
        type: String,
        required: true,
        unique: true,
    },
    summary: String,
    comments: [{ body: String, date: {type: Date, default: Date.now} }],
    date: { type: Date, default: Date.now }, 
});

const Article = mongoose.model('Article', articleSchema);

module.exports = Article;