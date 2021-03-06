
var mongojs = require("mongojs");
db = mongojs('mongodb://ryanWildish:Spartan9227.@ds129706.mlab.com:29706/mygame', ['users']);

require('./entity');

var express = require('express');
var app = express();
var server = require('http').Server(app);
//var profiler = require('v8-profiler');
//var fs = require('fs');

SOCKET_LIST = {};

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

var io = require('socket.io')(server, {});
io.sockets.on('connection', function(socket){
    console.log('socket connection');
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

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
      Player.onDisconnect(socket);
      delete SOCKET_LIST[socket.id];
    });

    socket.on('evalServer',function(data){
      var res = eval(data);
      socket.emit('evalAnswer',res);
    });

    socket.on('getLeaderboard',function(){
      getLeaderboard(function(res){
        if(res)
        {
          var list = [];
          var sortedList = [];
          var highest = -1;
          var highestName = "No scores found";
          var highestj = -1;

          for(var i in res)
          {
            highestName = res[i].username;
            highest = res[i].score;
            list.push({username:highestName,score:highest});
          }

          highest = -1;
          highestName = "No scores found";

          for(var i in list)
          {
            for(var j in list)
            {
              if(list[j].score > highest){
                highest = list[j].score;
                console.log(j);
                highestName = list[j].username;
                highestj = j;
              }
            }
            sortedList.push({username:highestName,score:highest});
            list[highestj].score = -2;
            highest = -1;
            highestName = "No scores found";
          }
          socket.emit('leaderboardListFound', sortedList);
        }
        else{
          socket.emit('noLeaderboard');
        }
      });
    })
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

setInterval(function() {
    console.log('spawning score pickup');
    var map = 'map';
    if(Math.random() < 0.5)
      map = 'map2';
    var s = ScorePickUp({
      x:(2560 * Math.random()),
      y:(1440 * Math.random()),
      map:map,
    });
    //console.log('try to spawn score pickup');
} ,15000);

setInterval(function() {
    console.log('spawning health pickup');
    var map = 'map';
    if(Math.random() < 0.5)
      map = 'map2';
    var h = HealthPickUp({
      x:(2560 * Math.random()),
      y:(1440 * Math.random()),
      map:map,
    });
    //console.log('try to spawn health pickup');
} ,15000);

function getLeaderboard(cb){
  console.log('getLeaderboard');
  var leaderboard = db.collection('leaderboard');
  leaderboard.find({}).toArray(function(err,leaders){
  cb(leaders);
  });
}

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
