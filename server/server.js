 // Cody recommended doing this
// Makes it so the .env file is read locally to get API key
// but on heroku if the NODE_ENV config var is set to production, app will look there

/// This is how to access the api key:
/// process.env.TRAIL_API_KEY

/// You will need to make a .env file with a TrailAPI key
/// (the .env files just needs one line: TRAIL_API_KEY: your_key_here)
/// the 'dotenv' module loads it from there, unless you are on Heroku, where you set it to an environment variable and set NODE_ENV to be 'production'
if(process.env.NODE_ENV !== 'production'){
  require('dotenv').config();
}

var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var path = require('path');
var userControllers = require('./controllers/userControllers.js');
var trailController = require('./controllers/TrailController.js');
var geocodeController = require('./controllers/GeocodeController.js');

var app = express();

// create and connect to database
var mongoose = require('mongoose');

var mongoURI = process.env.MONGOLAB_URI || 'mongodb://localhost/hikexpertdb';
console.log(mongoURI);
mongoose.connect(mongoURI);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection.error'));
db.once('open', function() {
  console.log("Mongoose connection open");
});

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

var port = process.env.PORT || 4000;

app.use(express.static(path.join(__dirname, '../client')));

app.post('/signin', userControllers.signin);
app.post('/signup', userControllers.signup);
app.get('/signedin', userControllers.checkAuth);
app.get('/getUser', userControllers.getUser);
/// trailPost function in services.js updates the trails arrays with these endpoints:
app.post('/hasDone', userControllers.hasDone);
app.post('/wantToDo', userControllers.wantToDo);
app.post('/moveTrails', userControllers.moveTrails);
app.put('/friends/add', userControllers.addFriend);
app.get('/friends/all', userControllers.getFriends);

// Handle trailAPI requests:
app.post('/api/trails', trailController.getTrails);
// Handle geocode API requests
app.post('/api/coords', geocodeController.getCoords);

exports.port = port;

var server = app.listen(port, function(){
  console.log("Listening on port: "+ port)
});

// Socket Connection

// Placeholder
var zz = {}
function userLocs(data){
  if( zz[data.user] ){
    zz[data.user].push([data.lat,data.long]);
  }else{
    zz[data.user]=[[data.lat,data.long]];
  }
  zz.length >= 100 && ( zz.splice(0,10) );
  io.emit('coords',zz)
};

var io=require('socket.io')(server);
io.on('connection', function(socket){
  console.log('*** Client has Connected');  
  
  socket.on('coords', function syncCoords(data) {
    // console.log(data);
    // socket.emit('coords', data);
    userLocs(data);
  });
  
  socket.on('disconnect', function(){
    console.log('!!! User has Disconnected')
  })
});

exports.io = io;

