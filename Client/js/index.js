var WIDTH = 500;
var HEIGHT = 500;
var socket = io();
//sign
var signDiv = document.getElementById('signDiv');
var signDivUsername = document.getElementById('signDiv-username');
var signDivSignIn = document.getElementById('signDiv-signIn');
var signDivSignUp = document.getElementById('signDiv-signUp');
var signDivPassword = document.getElementById('signDiv-password');

signDivSignIn.onclick = function(){
  socket.emit('signIn',{username:signDivUsername.value,password:signDivPassword.value});
}
signDivSignUp.onclick = function(){
  socket.emit('signUp',{username:signDivUsername.value,password:signDivPassword.value});
}

socket.on('signUpResponse',function(data){
  if(data.success){
    alert("Sign up successful!");
  } else
    alert("Sign up unsuccessful!");
});
socket.on('signInResponse',function(data){
  if(data.success){
    signDiv.style.display = 'none';
    gameDiv.style.display = 'inline-block';
  } else
    alert("Sign in unsuccessful!");
});

var chatText = document.getElementById('chat-text');
var chatInput = document.getElementById('chat-input');
var chatForm = document.getElementById('chat-form');

var canvas = document.getElementById("canvas").getContext("2d");
var canvasUI = document.getElementById("canvas-ui").getContext("2d");
var leaderboardScreen = document.getElementById("leaderboardScreen");
var leaderboardDiv = document.getElementById("leaderboardDiv");
canvasUI.font = '30px Arial';
leaderboardScreen.font = '30px Arial';

socket.on('addToChat',function(data){
  chatText.innerHTML += '<div>' + data + '</div>';
  chatText.scrollTop = chatText.scrollHeight;
});

socket.on('evalAnswer',function(data){
  console.log(data);
  chatText.innerHTML += '<div>' + data + '</div>';
  chatText.scrollTop = chatText.scrollHeight;
})

chatForm.onsubmit = function(e){
  e.preventDefault();
  if(chatInput.value[0] === '/')
    socket.emit('evalServer',chatInput.value.slice(1));
  else if(chatInput.value[0] === '@'){
    socket.emit('sendPmToServer',{
      username:chatInput.value.slice(1,chatInput.value.indexOf(':')),
      message:chatInput.value.slice(chatInput.value.indexOf(':') + 1),
    });
  } else
    socket.emit('sendMsgToServer', chatInput.value);
  chatInput.value = '';
}

function changeMap(){
  console.log('changeMap');
  socket.emit('changeMap');
}

function respawn(){
  console.log('respawn');
  isPlayerDead = false;
  leaderboardScreen.style.display = 'none';
  gameDiv.style.display = 'inline-block';
  socket.emit('respawnPlayer');
  console.log('emitted');
}

var images = {};
images.player = new Image();
images.player.src = '/Client/Image/friendly2.png';
images.enemy = new Image();
images.enemy.src = '/Client/Image/enemy.png';
images.bullet = new Image();
images.bullet.src = '/Client/Image/bullet.png';
images.map = {};
images.map['map'] = new Image();
images.map['map'].src = '/Client/Image/map.png';
images.map['map2'] = new Image();
images.map['map2'].src = '/Client/Image/map2.png';
images.health = new Image();
images.health.src = '/Client/Image/health.png';
images.score = new Image();
images.score.src = '/Client/Image/score.png';

var isPlayerDead = false;

var Player = function(initPackage){
  var self = {};
  self.id = initPackage.id;
  self.number = initPackage.number;
  self.x = initPackage.x;
  self.y = initPackage.y;
  self.hp = initPackage.hp;
  self.maxHp = initPackage.maxHp;
  self.score = initPackage.score;
  self.map = initPackage.map;

  self.draw = function(){
    if(Player.list[identity].map !== self.map)
      return;

    var playerInitX = self.x - Player.list[identity].x + WIDTH/2;
    var playerInitY = self.y - Player.list[identity].y + HEIGHT/2;

    var hpBar = 30 * self.hp / self.maxHp;
    canvas.fillStyle = 'red';
    canvas.fillRect(playerInitX - hpBar/2, playerInitY - 40, hpBar, 4);

    var width = images.player.width/30;
    var height = images.player.height/30;

    canvas.drawImage(images.player,0,0,images.player.width,
    images.player.height,playerInitX-width/2,playerInitY-height/2,width,height);

  }
  Player.list[self.id] = self;
  return self;
}
Player.list = {};

var Bullet = function(initPackage){
  var self = {};
  self.id = initPackage.id;
  self.x = initPackage.x;
  self.y = initPackage.y;
  self.map = initPackage.map;

  self.draw = function(){
    if(Player.list[identity].map !== self.map)
      return;

    var width = images.bullet.width/10;
    var height = images.bullet.height/10;
    var bulletInitX = self.x - Player.list[identity].x + WIDTH/2;
    var bulletInitY = self.y - Player.list[identity].y + HEIGHT/2;
    canvas.drawImage(images.bullet,0,0,images.bullet.width,images.bullet.height,
    bulletInitX-width/2,bulletInitY-height/2,width,height);
  }

  Bullet.list[self.id] = self;
  return self;
}
Bullet.list = {};

var HealthPickUp = function(initPackage){
  var self = {};
  self.id = initPackage.id;
  self.x = initPackage.x;
  self.y = initPackage.y;
  self.map = initPackage.map;

  self.draw = function(){
    if(Player.list[identity].map !== self.map)
      return;

    var width = images.health.width/10;
    var height = images.health.height/10;
    var healthInitX = self.x - Player.list[identity].x + WIDTH/2;
    var healthInitY = self.y - Player.list[identity].y + HEIGHT/2;
    canvas.drawImage(images.health,0,0,images.health.width,images.health.height,
    healthInitX-width/2,healthInitY-height/2,width,height);
    //console.log('draw health pickup');
  }
  HealthPickUp.list[self.id] = self;
  //console.log('added pickup to health list');
  return self;
}
HealthPickUp.list = {};

var ScorePickUp = function(initPackage){
  var self = {};
  self.id = initPackage.id;
  self.x = initPackage.x;
  self.y = initPackage.y;
  self.map = initPackage.map;

  self.draw = function(){
    if(Player.list[identity].map !== self.map)
      return;

    var width = images.score.width/5;
    var height = images.score.height/5;
    var scoreInitX = self.x - Player.list[identity].x + WIDTH/2;
    var scoreInitY = self.y - Player.list[identity].y + HEIGHT/2;
    canvas.drawImage(images.score,0,0,images.score.width,images.score.height,
    scoreInitX-width/2,scoreInitY-height/2,width,height);
    console.log(self.x);
    console.log(self.y);
    console.log('draw score pickup');
  }
  ScorePickUp.list[self.id] = self;
  //console.log('added pickup to score list');
  return self;
}
ScorePickUp.list = {};

var identity = null;

socket.on('init', function(data){
  if(data.identity)
    identity = data.identity;
  for(var i = 0; i < data.player.length; i++)
    new Player(data.player[i]);

  for(var i = 0; i < data.bullet.length; i++)
    new Bullet(data.bullet[i]);

  for(var i = 0; i < data.healths.length; i++)
    new HealthPickUp(data.healths[i]);

  for(var i = 0; i < data.scores.length; i++)
    new ScorePickUp(data.scores[i]);
});

socket.on('update', function(data){
  for(var i = 0; i < data.player.length; i++){
    var pack = data.player[i];
    var updatedPlayer = Player.list[pack.id];
    if(updatedPlayer){
      if(pack.x !== undefined)
        updatedPlayer.x = pack.x;
      if(pack.y !== undefined)
        updatedPlayer.y = pack.y;
      if(pack.hp !== undefined)
        updatedPlayer.hp = pack.hp;
      if(pack.score !== undefined)
        updatedPlayer.score = pack.score;
      if(pack.map !== undefined)
        updatedPlayer.map = pack.map;
    }
  }
  for(var i = 0; i < data.bullet.length; i++){
    var pack = data.bullet[i];
    var updatedBullet = Bullet.list[data.bullet[i].id];
    if(updatedBullet){
      if(pack.x !== undefined)
        updatedBullet.x = pack.x;
      if(pack.y !== undefined)
        updatedBullet.y = pack.y;
    }
  }
  for(var i = 0; i < data.healths.length; i++){
    var pack = data.healths[i];
    var updatedHealthPack = HealthPickUp.list[data.healths[i].id];
    if(updatedHealthPack){
      //pickup doesn't work without this empty loop
    }
  }
  for(var i = 0; i < data.scores.length; i++)
  {
    var pack = data.scores[i];
    var updatedScorePack = ScorePickUp.list[data.scores[i].id];
    if(updatedScorePack){
      //pickup doesn't work without this empty loop
    }
  }
});

socket.on('remove', function(data){
  for( var i = 0; i < data.player.length; i++)
    delete Player.list[data.player[i]];
  for( var i = 0; i < data.bullet.length; i++)
    delete Bullet.list[data.bullet[i]];
  for( var i = 0; i < data.healths.length; i++)
    delete HealthPickUp.list[data.healths[i]];
  for( var i = 0; i < data.scores.length; i++)
    delete ScorePickUp.list[data.scores[i]];
});

socket.on('showLeaderboard', function(score){
  gameDiv.style.display = 'none';
  leaderboardScreen.style.display = 'inline-block';
  socket.emit('getLeaderboard');
});

socket.on('noLeaderboard',function(){
  leaderboardDiv.innerHTML += '<div>' + "The leaderboard is not available at this time" + '</div>';
});

socket.on('leaderboardListFound',function(list){
  for(var i in list)
  {
    leaderboardDiv.innerHTML += '<div>' + list[i].username + ":   " + list[i].score + '</div>';
  }
});

socket.on('updatePlayerDead', function(){
  isPlayerDead = true;
});

setInterval(function(){
  if(!identity)
    return;
  canvas.clearRect(0,0,500,500);
  drawMap();
  drawScore();
  for(var i in Player.list)
    Player.list[i].draw();
  for(var i in Bullet.list)
    Bullet.list[i].draw();
  for(var i in HealthPickUp.list){
    //console.log('asked to draw health');
    HealthPickUp.list[i].draw();
  }
  for(var i in ScorePickUp.list){
    //console.log('asked to draw score');
    ScorePickUp.list[i].draw();
  }
},1000/60);

function drawMap(){
  var player = Player.list[identity];
  var mapX = WIDTH/2 - player.x;
  var mapY = HEIGHT/2 - player.y;
  canvas.drawImage(images.map[player.map],mapX,mapY);
}

function drawScore(){
  if(lastScore === Player.list[identity].score)
    return;
  lastScore = Player.list[identity].score;
  canvasUI.clearRect(0,0,500,500);
  canvasUI.fillStyle = 'blue';
  canvasUI.fillText(Player.list[identity].score, 10, 30);
}
var lastScore = null;

document.onkeydown = function(event) {
  if(isPlayerDead === false){
    if(event.keyCode === 68) //d
      socket.emit('keyPress',{inputId:'right', state:true});
    else if(event.keyCode === 83) //s
      socket.emit('keyPress',{inputId:'down', state:true});
    else if(event.keyCode === 65) //a
      socket.emit('keyPress',{inputId:'left', state:true});
    else if(event.keyCode === 87) //w
    socket.emit('keyPress',{inputId:'up', state:true});
    else if(event.keyCode === 32){
      if(canFire === true){
        canFire = false;
        socket.emit('keyPress',{inputId:'tripleShoot',state:true});
        myTimer = setInterval(changeCanFire, 1500);
      }
    }
  }
}

document.onkeyup = function(event) {
if(event.keyCode === 68) //d
  socket.emit('keyPress',{inputId:'right', state:false});
else if(event.keyCode === 83) //s
  socket.emit('keyPress',{inputId:'down', state:false});
else if(event.keyCode === 65) //a
  socket.emit('keyPress',{inputId:'left', state:false});
else if(event.keyCode === 87) //w
  socket.emit('keyPress',{inputId:'up', state:false});
else if(event.keyCode === 32) //w
  socket.emit('keyPress',{inputId:'tripleShoot', state:false});
}

var canFire = true;

function changeCanFire(){
canFire = true;
clearInterval(myTimer);
}

var myTimer = setInterval(changeCanFire, 1);

document.oncontextmenu = function (event){
  event.preventDefault();
}

document.onmousedown = function(event){
  if(canFire === true){
    canFire = false;
    socket.emit('keyPress',{inputId:'shoot',state:true});

    myTimer = setInterval(changeCanFire, 500);
    return;
    }
  }

document.onmouseup = function(event){
  socket.emit('keyPress',{inputId:'shoot',state:false});
  socket.emit('keyPress',{inputId:'tripleShoot',state:false});
}

document.onmousemove = function(event){
  var x = -250 + event.clientX - 8;
  var y = -250 + event.clientY - 8;
  var angle = Math.atan2(y,x) / Math.PI * 180;
  socket.emit('keyPress',{inputId:'mouseAngle',state:angle});
}
