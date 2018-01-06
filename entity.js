
var initPackage = {player:[],bullet:[]};
var removePackage = {player:[],bullet:[]};

Entity = function(parameters){
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
Entity.getFrameUpdateData = function(){
  var pack = {
    initPackage:{
      player:initPackage.player,
      bullet:initPackage.bullet,
    },
    removePackage:{
      player:removePackage.player,
      bullet:removePackage.bullet,
    },
    updatePackage:{
      player:Player.update(),
      bullet:Bullet.update(),
    }
  };
  initPackage.player = [];
  initPackage.bullet = [];
  removePackage.player = [];
  removePackage.bullet = [];
  return pack;
}

Player = function(parameters){
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
  self.maxSpeed = 5;
  self.hp = 5;
  self.maxHp = 5;
  self.score = 0;
  self.startTime = Date.now();
  self.lastSurvivalTime = 0;
  self.width = 1000/30;
  self.height = 1000/30;

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

    var mapWidth = 2560;
    var mapHeight = 1440;

    if(self.x < self.width/2)
      self.x = self.width/2;
    if(self.x > mapWidth - self.width/2)
      self.x = mapWidth - self.width/2;
    if(self.y < self.height/2)
      self.y = self.height/2;
    if(self.y > mapHeight - self.height/2)
      self.y = mapHeight - self.height/2;
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
      EmitSurvivalTime = function(data){
        var pmReceiver = SOCKET_LIST[data]
        pmReceiver.emit('addToChat','You survived for ' + Player.list[data].lastSurvivalTime + ' seconds');
        for(var i in SOCKET_LIST)
        {
          if(SOCKET_LIST[i] !== SOCKET_LIST[data])
          {
            //potential to check for players only on the same map
            SOCKET_LIST[i].emit('addToChat', Player.list[data].username + ' has died. They survived for ' + Player.list[data].lastSurvivalTime + ' seconds');
          }
        }
    }

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

Bullet = function(parameters){
  var self = Entity(parameters);
  self.id = Math.random();
  self.angle = parameters.angle;
  self.speedX = Math.cos(parameters.angle/180*Math.PI) * 5;
  self.speedY = Math.sin(parameters.angle/180*Math.PI) * 5;
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
        if(self.map === p.map && self.getDistance(p) < 18 && self.parent !== p.id)
        {
          p.hp -= 1;
          var shooter = Player.list[self.parent];
          if(p.hp <= 0){
            if(shooter)
              shooter.score += 10;
            p.hp = p.maxHp;
            p.lastSurvivalTime = (Date.now() - p.startTime)/1000;
            console.log("You survived for " + self.lastSurvivalTime + " seconds");
            p.startTime = Date.now();
            EmitSurvivalTime(p.id);
            var playerData = {username:p.username,score:p.score};
            globalSocketCall.emitScoreCall(p.username,p.score);
            p.score = 0;
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
