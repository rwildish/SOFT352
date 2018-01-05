
var mongojs = require("mongojs");
var db = mongojs('mongodb://ryanWildish:Spartan9227.@ds129706.mlab.com:29706/mygame', ['users']);

require('./entity');

var express = require('express');
var app = express();
var server = require('http').Server(app);
//var profiler = require('v8-profiler');
//var fs = require('fs');

SOCKET_LIST = {};
//var PLAYER_LIST = {};
globalSocketCall = function(user,pScore){};

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/Client/index.html');
});
app.use('/Client', express.static(__dirname + '/Client'));

server.listen(process.env.PORT || 2000);


function isValidPassword(data, cb){
  db.users.find({username:data.username,password:data.password},function(err,res){
    if(res.length > 0)
      cb(true);
    else
        cb(false);
  });
}
function isUsernameTaken(data, cb){
  db.users.find({username:data.username},function(err,res){
    if(res.length > 0)
      cb(true);
    else
        cb(false);
  });
}
function addUser(data, cb){
  db.users.insert({username:data.username,password:data.password},function(err){
    db.leaderboard.insert({username:data.username,score:0});
    cb();
  });
}
const isScoreHigher = function(data, cb){
  //var leaderboardPlacement = 0;
  console.log('isScoreHigher');
  //var user = db.collection('leaderboard');

  const leaderboard = db.collection('leaderboard');
  leaderboard.find({username:data.user}).toArray(function(err,leaders){
    //assert.equal(err,null);
    console.log('found user');
    cb(leaders);
  });
    //if(leaders === null)
      //cb(false);
    };
  /*if(path[0].username === data.user})
  {
    console.log('if');
    //var user = db.leaderboard.getIndexes({username:data.user});
    console.log(path[0]);
    console.log(path[0].score);
    if(data.pScore > path[0].score)
    {
      db.leaderboard.update({username:data.user},{score:data.pScore});
    }
    //cb();
  }
  else{
    console.log('else');
    db.leaderboard.insert({username:data.user,score:data.pScore});

  }*/
  /*for(var i in db.leaderboard)
  {
    if(data.score > db.leaderboard[i].score.value)
    {
      break;
    }
    else if(data.score === db.leaderboard[i].score.value)
    {
      leaderboardPlacement++;
      break;
    }
    else{
      leaderboardPlacement++;
    }
  }

  db.leaderboard.find({username:data.username},function(err,res){
    if(res.length > 0)
      cb(true);
    else
        cb(false);
  });*/
//}
function addScoreToLeaderboard(data, cb){
  db.leaderboard.insert({username:data.username,score:data.score},function(err){
    cb();
  });
}

var io = require('socket.io')(server, {});
io.sockets.on('connection', function(socket){
    console.log('socket connection');
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    socket.on('emitScore',function(data){
      isScoreHigher(data);
    });

    socket.on('signIn',function(data){
      isValidPassword(data,function(res){
        if(res){
          Player.onConnect(socket,data.username);
          socket.emit('signInResponse',{success:true});
        } else{
          socket.emit('signInResponse',{success:false});
        }
      });
   });

   socket.on('signUp',function(data){
     isUsernameTaken(data,function(res){
       if(res){
         socket.emit('signUpResponse',{success:false});
       } else{
         addUser(data, function(){
           socket.emit('signUpResponse',{success:true});
         });
       }
     });
  });

    socket.on('disconnect',function(){
      delete SOCKET_LIST[socket.id];
      Player.onDisconnect(socket);
      //delete Player.list[socket.id];
    });



    socket.on('evalServer',function(data){
      var res = eval(data);
      socket.emit('evalAnswer',res);
    })

    globalSocketCall.emitScoreCall = function(user,pScore){
      //socket.emit('emitScore',{username:user,score:pScore});
      var data = {user,pScore}
      isScoreHigher(data,function(res){
        if(res){
          console.log('inside res');
          if(data.pScore > res[0].score)
          {
            console.log('inside if');
            db.leaderboard.update({username:data.user},{username:data.user,score:data.pScore});
          }
        } /*else{
          console.log('inside else');
          db.leaderboard.insert({username:data.user,score:data.pScore});
        }*/
        console.log('exiting loop');
      });

    }
});



setInterval(function() {
  var packs = Entity.getFrameUpdateData();
  for(var i in SOCKET_LIST){
    var socket = SOCKET_LIST[i];
    socket.emit('init',packs.initPackage);
    socket.emit('update', packs.updatePackage);
    socket.emit('remove', packs.removePackage);
  }
} ,1000/60);

/* v8-profiler fails to install, likely incompatible with node.js v8.9.1 @ 30/12/2017- find alternative server profiler
setInterval(function(){
  var startProfiling = function(duration){
    profiler.startProfiling('1', true);
    SetTimeout(function(){
      var profile1 = profiler.stopProfiling('1');

      profile1.export(function(error, result){
        fs.writeFile('./profile.cpuprofile', result);
        profile1.delete();
        console.log("Profile saved.");
      });
    });
  }
},duration);
startProfiling(10000);
*/
