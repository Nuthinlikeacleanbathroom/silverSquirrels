var User = require('../db/models/user.js');
var Q = require('q');
var jwt = require('jwt-simple');

module.exports = {
  signin: function(req, res, next) {
    var username = req.body.username;
    var password = req.body.password;
    var findUser = Q.nbind(User.findOne, User);
    
    findUser({username: username})
      .then(function(user) {
        if(!user) {
          next(new Error('User does not exist!'));
        } else {
          return user.comparePassword(password)
            .then(function(foundUser) {
              if(foundUser) {
                var token = jwt.encode(user, 'superskrull');
                res.json({token: token});
              } else {
                return next(new Error('No User!'));
              }
            });
        }
      })
      .fail(function(error) {
        next(error);
      });
  },
  
  signup: function(req, res, next) {
    var username = req.body.username;
    var password = req.body.password;
    var create;
    var newUser;
    
    var findOne = Q.nbind(User.findOne, User);
    
    // check to see if user already exists
    findOne({username: username})
      .then(function(user) {
        if(user) {
          next(new Error('User already exists!'));
        } else {
          // create a new user
          create = Q.nbind(User.create, User);
          newUser = {
            username: username,
            password: password
          };
        }
        return create(newUser);
      })
      .then(function(user) {
        // create token to send back for authorization
        var token = jwt.encode(user, 'superskrull');
        res.json({token: token});
      })
      .fail(function(error) {
        next(error);
      });
  },

  checkAuth: function(req, res, next) {
    // check user authentication
    // grab token from header
    var token = req.headers['x-access-token'];
    if(!token) {
      next(new Error('No token!'));
    } else {
      // decode token
      var user = jwt.decode(token, 'superskrull');
    // check if user is in database
    var findUser = Q.nbind(User.findOne, User);
    findUser({username: user.username})
      .then(function(foundUser) {
        if(foundUser) {
          res.send(200);
        } else {
          res.send(401);
        }
      })
      .fail(function(error) {
        next(error);
      });
    }
  },

  getUser: function(req, res, next){
    // check user authentication
    // grab token from header
    var token = req.headers['x-access-token'];
    if(!token) {
      next(new Error('No token!'));
    } else {
      // decode token
      var user = jwt.decode(token, 'superskrull');
    // check if user is in database
    
    var findUser = Q.nbind(User.findOne, User);
    findUser({username: user.username})
      .then(function(foundUser) {
        if(foundUser) {
          res.send({
            username: foundUser.username,
            haveDone: foundUser.haveDone,
            wantToDo: foundUser.wantToDo
          });
        } else {
          res.send(401);
        }
      })
      .fail(function(error) {
        next(error);
      });
    }
  },

  hasDone : function (req, res, next) {
    var trailName = req.body.trailName;
    var token = req.headers['x-access-token'];
    if(!token) {
      next(new Error('No token'));
    } else {
      var user = jwt.decode(token, 'superskrull');
      User.findOne({ username : user.username}).exec(function (err, foundUser){
        if(err){
          next(new Error('Failed to find user!'));
        }
        foundUser.haveDone.addToSet(trailName);
        foundUser.save();
        res.sendStatus(202, 'yo');
      });

    }
  },

  wantToDo : function (req, res, next) {
    var trailName = req.body.trailName;
    var token = req.headers['x-access-token'];
    if(!token) {
      next(new Error('No token'));
    } else {
      var user = jwt.decode(token, 'superskrull');
      User.findOne({ username : user.username}).exec(function (err, foundUser){
        if(err){
          next(new Error('Failed to find user!'));
        }
        // "addToSet" is a mongo thing, like push but does not allow repeats        
        foundUser.wantToDo.addToSet(trailName);
        foundUser.save();
        res.sendStatus(202, 'yo');
      });

    }
  },

  moveTrails : function (req, res, next) {
    console.log('moveTrails called!!')
    var trailName = req.body.trailName;
    var token = req.headers['x-access-token'];
    if(!token) {
      next(new Error('No token'));
    } else {
      var user = jwt.decode(token, 'superskrull');
      User.findOne({ username : user.username}).exec(function (err, foundUser){
        if(err){
          next(new Error('Failed to find user!'));
        }
        // "pull" removes item from mongo array       
        foundUser.wantToDo.pull(trailName);
        // add to set adds an item to mongo array, does not allow repeats
        foundUser.haveDone.addToSet(trailName);
        foundUser.save();
        res.sendStatus(202, 'yo');
      });

    }
  },

  addFriend: function(req, res, next) {
    var token = req.headers['x-access-token'];
    if(!token) {
      next(new Error('No token'));
    } else {
      var user = jwt.decode(token, 'superskrull');
      User.findOne({ username: user.username }).exec(function(err, foundUser) {
        if(err){
          next(new Error('Failed to find user!'));
        }
        User.findOne({ username: req.body.newFriend }).exec(function(err, newFriend) {
          if(err) {
            next(new Error('addFriend failed'));
          }
          if(newFriend) {
            foundUser.friends.addToSet(newFriend);
            foundUser.save();
            res.sendStatus(204);
          } else {
            res.sendStatus(404);
          }
        });
      });
    }
  },
  
  getFriends: function(req, res, next) {
    var token = req.headers['x-access-token'];
    if(!token) {
      next(new Error('No token'));
    } else {
      var user = jwt.decode(token, 'superskrull');
      User.findOne({ username: user.username })
      .populate('friends', 'username haveDone wantToDo')
      .exec(function(err, foundUser) {
        if(err){
          next(new Error('Failed to find user!'));
        }
        res.json({
          friends: foundUser.friends
        });
      });
    }
  },

  updateLocation: function (data) {
    User.findOne({username: data.user})
      .then(function(results) {
        results.location.lat = data.location.lat;
        results.location.long = data.location.long;
        
        if (!results.trail.length) {
          results.trail.push(results.location);
        }
        
        var last = results.trail[results.trail.length - 1];
        
        var distance = Math.sqrt(Math.pow((last.lat - data.location.lat), 2) 
          + Math.pow((last.long - data.location.long), 2));
        
        if (distance > .0001) {
          results.trail.push(results.location);
        }
        results.save()
          .catch(function errHandler (err) {
            console.log('There was an error saving the new location.', err);
          });
      })
      .catch(function errHandler (err) {
        console.log('There was an error querying the database:', err);
      });
  }
};