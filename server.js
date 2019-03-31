var express = require("express");
var mongoose = require("mongoose");
var Article = require('./models/article');
var exphbs = require("express-handlebars");
const Handlebars = require('handlebars');


// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");


var PORT = 3000;

// Initialize Express
var app = express();

// Configure middleware

// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/', express.static('./views'));

app.engine(
    "handlebars",
    exphbs({
        defaultLayout: "main"
    })
);
app.set("view engine", "handlebars");

// Connect to the Mongo DB
// mongoose.connect("mongodb://localhost/unit18Populater", { useNewUrlParser: true });
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/news_scrape";
mongoose.connect(MONGODB_URI, { useNewUrlParser: true });
mongoose.set('useCreateIndex', true);

var NEWS_SITE = process.env.NEWS_SITE || 'https://slashdot.org/';

function createArticle(data) {
    return new Promise((resolve, reject) => {
        Article.create(data).then(function (createdArticle) {
            resolve(1);
        }).catch(function (err) {
            if (err.code === 11000) {
                resolve(0);
            } else {
                reject(err);
            }
        });
    });
}

// Routes
// add root
app.get("/", function (req, res) {
    // Grab every document in the Articles collection

    Article.find({}, function (err, data) {
        res.render('articles', {
            articles: data
        });
    });
});


// A GET route for scraping the echoJS website
app.get("/scrape", function (req, res) {
    // First, we grab the body of the html with axios
    axios.get(NEWS_SITE).then(function (response) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(response.data);

        var newArticles = [];
        $(`article`).each(function (i, element) {
            var titleElement = $(this).find('.story > span > a').first();
            var title = titleElement.text();
            var url = titleElement.attr('href');

            if (url && url.trim()) {

                var bodyElement = $(this).find('.body > div > i').first();

                newArticles.push({
                    headline: title,
                    url: !url.match(/^[https|http]/) ? `https:${url}` : '',
                    summary: bodyElement.text(),
                });
            }

        });

        if (newArticles.length > 0) {

            const articlePromises = newArticles.map(article => createArticle(article));

            Promise.all(articlePromises).then((results) => {
                const successCount = results.reduce((a, c) => a + c, 0);
                res.render('scrape', {
                    message: successCount > 0 ? `Created ${successCount} articles, and ${newArticles.length - successCount} articles already existing` : 'No new articles'
                });
            }).catch(err => {
                console.log(err);
            });


        } else {
            res.render('scrape', {
                message: 'No new articles'
            });
        }

    });
});

// Route for getting all Articles from the db
app.get("/articles", function (req, res) {
    // Grab every document in the Articles collection

    Article.find({}, function (err, data) {
        res.render('articles', {
            articles: data
        });
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    Article.findOne({ _id: req.params.id }, function (err, data) {
        res.json(data);
    });
});

app.post("/articles/:id/comments", function (req, res) {
    Article.findOneAndUpdate({ _id: req.params.id }, { $push: { comments: { body: req.body.comment, index: req.body.index } } }, { new: true }, function (err, data) {
        res.json(data);
    });
});

app.get("/articles/:articleId/comments/:commentId/delete", function (req, res) {
    Article.update({ _id: req.params.articleId }, { $pull: { comments: { _id: req.params.commentId } } }, function (err, data) {
        res.json(data);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles", function (req, res) {
    // Create a new note and pass the req.body to the entry

    Article.create(req.body).then(function (createdArticle) {
        res.json(createdArticle);
    }).catch(function (err) {
        if (err.code === 11000) {
            console.log('Already Created');
            res.send({
                message: 'Already Created'
            });
        } else {
            throw err
        }

    });
});

app.delete("/articles/:id", function (req, res) {
    Article.remove({ _id: req.params.id }, function (err, data) {
        if (err) {
            res.json(err);
        } else {
            res.json(data);
        }
    });
});

// Start the server
app.listen(PORT, function () {
    console.log("App running on port " + PORT + "!");
});
