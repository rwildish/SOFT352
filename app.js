
var mongojs = require("mongojs");
var db = mongojs('mongodb://ryanWildish:Spartan9227.@ds129706.mlab.com:29706/mygame', ['users']);

var express = require('express');
var app = express();
var server = require('http').Server(app);
//var profiler = require('v8-profiler');
//var fs = require('fs');

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/Client/index.html');
});
app.use('/Client', express.static(__dirname + '/Client'));

server.listen(process.env.PORT || 2000);

var SOCKET_LIST = {};
//var PLAYER_LIST = {};

var Entity = function(parameters){
  var self = {
    x:250,
    y:250,
    speedX:0,
    speedY:0,
    id:"",
    map:'map',
  }
  if(parameters){
    if(parameters.x)
      self.x = parameters.x;
    if(parameters.y)
      self.y = parameters.y;
    if(parameters.map)
      self.map = parameters.map;
    if(parameters.id)
      self.id = parameters.id;
  }
  self.update = function(){
    self.updatePosition();
  }
  self.updatePosition = function(){
    self.x += self.speedX;
    self.y += self.speedY;
  }
  self.getDistance = function(pt){
    return Math.sqrt(Math.pow(self.x-pt.x,2) + Math.pow(self.y-pt.y,2));
  }
  return self;
}

var Player = function(parameters){
  var self = Entity(parameters);
  //self.id = id;
  self.number = "" + Math.floor(10 * Math.random());
  self.username = parameters.username;
  self.pressingRight = false;
  self.pressingLeft = false;
  self.pressingUp = false;
  self.pressingDown = false;
  self.pressingMouse1 = false;
  self.mouseAngle = 0;
  self.maxSpeed = 10;
  self.hp = 5;
  self.maxHp = 5;
  self.score = 0;

  var super_update = self.update;
  self.update = function(){
    self.updateSpeed();
    super_update();

    if(self.pressingMouse1){
      self.shootBullet(self.mouseAngle);
      self.pressingMouse1 = false;

    }
  }
self.shootBullet = function(angle){
  var b = Bullet({
    parent:self.id,
    angle:angle,
    x:self.x,
    y:self.y,
    map:self.map,
  });
}


  self.updateSpeed = function(){
    if(self.pressingRight)
      self.speedX = self.maxSpeed;
    else if(self.pressingLeft)
      self.speedX = -self.maxSpeed;
    else
      self.speedX = 0;

    if(self.pressingUp)
      self.speedY = -self.maxSpeed;
    else if(self.pressingDown)
      self.speedY = self.maxSpeed;
    else
      self.speedY = 0;
  }


  self.getInitPackage = function(){
    return{
      id:self.id,
      x:self.x,
      y:self.y,
      number:self.number,
      hp:self.hp,
      maxHp:self.maxHp,
      score:self.score,
      map:self.map,
    };
  }

  self.getUpdatePackage = function(){
    return{
      id:self.id,
      x:self.x,
      y:self.y,
      hp:self.hp,
      score:self.score,
      map:self.map,
      //number:self.number,
    };
  }
  Player.list[self.id] = self;

  initPackage.player.push(self.getInitPackage());
  return self;
}
Player.list = {};
Player.onConnect = function(socket,username){
  var map = 'map';
  if(Math.random() < 0.5)
    map = 'map2';
  var player = Player({
    username:username,
    id:socket.id,
    map:map,
  });
  //PLAYER_LIST[socket.id] = player;

  socket.on('keyPress',function(data){
    if(data.inputId === 'left')
      player.pressingLeft = data.state;
    else if(data.inputId === 'right')
      player.pressingRight = data.state;
    else if(data.inputId === 'up')
      player.pressingUp = data.state;
    else if(data.inputId === 'down')
      player.pressingDown = data.state;
    else if(data.inputId === 'shoot')
      player.pressingMouse1 = data.state;
      else if(data.inputId === 'mouseAngle')
        player.mouseAngle = data.state;
      });

      socket.on('changeMap', function(data){
        if(player.map === 'map')
          player.map = 'map2';
        else
          player.map = 'map';
      });

      socket.on('sendMsgToServer',function(data){
        for(var i in SOCKET_LIST){
          SOCKET_LIST[i].emit('addToChat',player.username + ': ' + data);
        }
      });

      socket.on('sendPmToServer',function(data){
        var pmReceiver = null;
        for(var i in Player.list)
          if(Player.list[i].username === data.username)
            pmReceiver = SOCKET_LIST[i];
        if(pmReceiver === null){
          socket.emit('addToChat','The player ' + data.username + ' is not online');
        } else{
          pmReceiver.emit('addToChat','From ' + player.username + ': ' + data.message);
          socket.emit('addToChat','To ' + data.username + ': ' + data.message);
        }
      });

      socket.emit('init',{
        identity:socket.id,
        player:Player.getInitialPackage(),
        bullet:Bullet.getInitialPackage(),
      });
}
Player.getInitialPackage = function(){
  var players = [];
  for(var i in Player.list)
    players.push(Player.list[i].getInitPackage());
  return players;
}
Player.onDisconnect = function(socket){
  delete Player.list[socket.id];
  removePackage.player.push(socket.id);
}
Player.update = function(){
  var pack = [];
  for(var i in Player.list){
    var player = Player.list[i];
    player.update();
    pack.push(player.getUpdatePackage());
  }
  return pack;
}

var Bullet = function(parameters){
  var self = Entity(parameters);
  self.id = Math.random();
  self.angle = parameters.angle;
  self.speedX = Math.cos(parameters.angle/180*Math.PI) * 10;
  self.speedY = Math.sin(parameters.angle/180*Math.PI) * 10;
  self.parent = parameters.parent;
  self.timer = 0;
  self.toRemove = false;

  var super_update = self.update;
  self.update = function(){
      if(self.timer++  > 100)
        self.toRemove = true;
      super_update();

      for(var i in Player.list){
        var p = Player.list[i];
        if(self.map === p.map && self.getDistance(p) < 32 && self.parent !== p.id)
        {
          p.hp -= 1;
          var shooter = Player.list[self.parent];
          if(p.hp <= 0){
            if(shooter)
              shooter.score += 10;
            p.hp = p.maxHp;
            p.x = Math.random() * 500;
            p.y = Math.random() * 500;
          }
          self.toRemove = true;
        }
      }
  }
  self.getInitPackage = function(){
    return{
      id:self.id,
      x:self.x,
      y:self.y,
      map:self.map,
    };
  }
  self.getUpdatePackage = function(){
    return{
      id:self.id,
      x:self.x,
      y:self.y,
    }
  }
  Bullet.list[self.id] = self;
  initPackage.bullet.push(self.getInitPackage());
  return self;
}
Bullet.list = {};

Bullet.update = function(){
  var pack = [];
  for(var i in Bullet.list){
    var bullet = Bullet.list[i];
    bullet.update();
    if(bullet.toRemove == true){
      delete Bullet.list[i];
      removePackage.bullet.push(bullet.id);
    } else
    pack.push(bullet.getUpdatePackage());
  }
  return pack;
}
Bullet.getInitialPackage = function(){
  var bullets = [];
  for(var i in Bullet.list)
    bullets.push(Bullet.list[i].getInitPackage());
  return bullets;
}
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
      delete SOCKET_LIST[socket.id];
      Player.onDisconnect(socket);
      //delete Player.list[socket.id];
    });



    socket.on('evalServer',function(data){
      var res = eval(data);
      socket.emit('evalAnswer',res);
    })


});

var initPackage = {player:[],bullet:[]};
var removePackage = {player:[],bullet:[]};


setInterval(function() {
  var pack = {
    player:Player.update(),
    bullet:Bullet.update(),
  }
  for(var i in SOCKET_LIST){
    var socket = SOCKET_LIST[i];
    socket.emit('init',initPackage);
    socket.emit('update', pack);
    socket.emit('remove', removePackage);
  }
  initPackage.player = [];
  initPackage.bullet = [];
  removePackage.player = [];
  removePackage.bullet = [];
} ,1000/25);

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
