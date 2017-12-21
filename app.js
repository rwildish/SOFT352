
var mongojs = require("mongojs");
var db = mongojs('mongodb://ryanWildish:Spartan9227.@ds129706.mlab.com:29706/mygame', ['users']);

var express = require('express');
var app = express();
var server = require('http').Server(app);

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/Client/index.html');
});
app.use('/Client', express.static(__dirname + '/Client'));

server.listen(2000);

var SOCKET_LIST = {};
//var PLAYER_LIST = {};

var Entity = function(){
  var self = {
    x:250,
    y:250,
    speedX:0,
    speedY:0,
    id:"",
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

var Player = function(id){
  var self = Entity();
  self.id = id;
  self.number = "" + Math.floor(10 * Math.random());
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

    }
  }
self.shootBullet = function(angle){
  var b = Bullet(self.id,angle);
  b.x = self.x;
  b.y = self.y;
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
    };
  }

  self.getUpdatePackage = function(){
    return{
      id:self.id,
      x:self.x,
      y:self.y,
      hp:self.hp,
      score:self.score,
      //number:self.number,
    };
  }
  Player.list[id] = self;

  initPackage.player.push(self.getInitPackage());
  return self;
}
Player.list = {};
Player.onConnect = function(socket){
  var player = Player(socket.id);
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

var Bullet = function(parent,angle){
  var self = Entity();
  self.id = Math.random();
  self.speedX = Math.cos(angle/180*Math.PI) * 10;
  self.speedY = Math.sin(angle/180*Math.PI) * 10;
  self.parent = parent;
  self.timer = 0;
  self.toRemove = false;

  var super_update = self.update;
  self.update = function(){
      if(self.timer++  > 100)
        self.toRemove = true;
      super_update();

      for(var i in Player.list){
        var p = Player.list[i];
        if(self.getDistance(p) < 32 && self.parent !== p.id)
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
/*var USERS = {
  //username:Password
  "bob":"pass",
}*/

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
          Player.onConnect(socket);
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

    socket.on('sendMsgToServer',function(data){
      var playerName = ("" + socket.id).slice(2,7);
      for(var i in SOCKET_LIST){
        SOCKET_LIST[i].emit('addToChat',playerName + ': ' + data);
      }
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
