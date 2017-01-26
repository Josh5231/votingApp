var express = require("express");
var app = express();
var session = require("express-session");
var bodyParser = require('body-parser');

var mongo = require("mongodb").MongoClient;
var mongoURL = process.env.MONGOLAB_URI;

var routes = require("./routes.js");

var port = process.env.PORT || 8080;

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: process.env.SES_SECRET,
    resave: false,
    saveUninitialized: true
}));

app.use('/static', express.static("build/static") );

app.use('/favicon.ico', express.static("build") );

app.use("/",routes);

app.listen(port,(err)=>{
    if(err){ throw err; }
    console.log("App running on port:"+port);
});

