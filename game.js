var canvas=document.getElementById("gameCanvas");
var ctx=canvas.getContext("2d");
var W,H;
function resize(){W=canvas.width=window.innerWidth;H=canvas.height=window.innerHeight}
resize();window.addEventListener("resize",resize);

var playerImg=new Image();playerImg.src="images/player.png";
var towerImg=new Image();towerImg.src="images/tower.jpg";
var enemyImgs=[];
var gondolaImg=new Image();gondolaImg.src="images/gondola.png";
["images/witch.png","images/thugs.png","images/dragon.png"].forEach(function(s){
  var img=new Image();img.src=s;enemyImgs.push(img);
});

var TOTAL=20;
document.getElementById("totalFloors").textContent=TOTAL;

var score,lives,camY,running,animId,t;
var jumping,jumpTarget,jumpFrame;
var nextPlatIdx,invincible,cleared;
var plats,items,enemies,parts;

// プレイヤー
var P={x:0,y:0,w:48,h:76,vx:0,vy:0,onG:true,face:1,bob:0,sx:0,sy:0};

var JUMP_DUR=24;
var PLAT_GAP=75;
var PLAT_W=110;
var INV_TIME=90; // 無敵フレーム数（長めに）
var ENEMY_STAY=70;
var ENEMY_GONE=200;

function genPlats(){
  plats=[];items=[];enemies=[];
  // 0段目：スタート
  plats.push({x:W*0.15,y:H-80,w:PLAT_W+20,h:16,goal:false});
  for(var i=1;i<=TOTAL;i++){
    var nx;
    if(i%2===1) nx=W*0.55+Math.random()*(W*0.3-PLAT_W);
    else nx=W*0.05+Math.random()*(W*0.3);
    nx=Math.max(10,Math.min(W-PLAT_W-10,nx));
    var prev=plats[i-1];
    var isGoal=(i===TOTAL);
    plats.push({x:nx,y:prev.y-PLAT_GAP,w:isGoal?PLAT_W+40:PLAT_W+Math.random()*15,h:16,goal:isGoal});
    // アイテム
    if(!isGoal&&Math.random()<0.5){
      items.push({x:nx+PLAT_W/2,y:prev.y-PLAT_GAP-22,r:14,type:Math.random()<0.6?"star":"heart",got:false,pulse:Math.random()*6.28,ang:0});
    }
    // 敵：3段おき、3段目以降、ゴール以外
    if(i>=3&&i%3===0&&!isGoal){
      enemies.push({
        pi:i, type:Math.floor(Math.random()*3),
        x:nx+PLAT_W/2, y:prev.y-PLAT_GAP-35,
        w:45, phase:Math.random()*6.28,
        timer:Math.floor(Math.random()*ENEMY_STAY),
        vis:true, fadeIn:0, fadeOut:0
      });
    }
  }
}

function spawnParts(x,y,c){for(var i=0;i<8;i++)parts.push({x:x,y:y,vx:(Math.random()-.5)*6,vy:(Math.random()-.5)*6-2,r:3+Math.random()*4,c:c,life:30})}
function showFloat(x,wy,txt){
  var sy=wy-camY;if(sy<-50||sy>H+50)return;
  var el=document.createElement("div");el.className="float-text";el.textContent=txt;
  el.style.left=x+"px";el.style.top=sy+"px";
  document.body.appendChild(el);setTimeout(function(){el.remove()},800);
}
function flashRed(){var el=document.createElement("div");el.className="dmg-flash";document.body.appendChild(el);setTimeout(function(){el.remove()},400)}
function updateLife(){document.getElementById("lifeDisplay").textContent="\u2764\uFE0F".repeat(Math.max(0,lives))}
function updateFloor(){document.getElementById("floorDisplay").textContent=Math.max(0,nextPlatIdx-1)}

function doJump(){
  if(jumping||!P.onG||cleared||!running)return;
  if(nextPlatIdx>TOTAL||nextPlatIdx>=plats.length)return;
  var tgt=plats[nextPlatIdx];
  jumpTarget={x:tgt.x+tgt.w/2-P.w/2, y:tgt.y-P.h};
  P.face=(jumpTarget.x>P.x)?1:-1;
  P.sx=P.x; P.sy=P.y; // ジャンプ開始位置を保存
  jumping=true; jumpFrame=0; P.onG=false;
}

function landOnPlat(idx){
  var p=plats[idx];
  if(!p)return;
  P.x=p.x+p.w/2-P.w/2;
  P.y=p.y-P.h;
  P.vy=0;P.vx=0;P.onG=true;
  jumping=false;jumpTarget=null;
}

function knockback(){
  if(invincible>0)return;
  lives--;
  updateLife();
  flashRed();
  showFloat(P.x+P.w/2,P.y,"\uD83D\uDCA5");
  spawnParts(P.x+P.w/2,P.y+P.h/2-camY,"#FF4444");
  invincible=INV_TIME;
  if(lives<=0){
    gameOver();
    return;
  }
  // 1つ前の足場に戻す
  // nextPlatIdxは「次にジャンプする先」なので、今着地しようとした足場=nextPlatIdx
  // 1つ前 = nextPlatIdx-1
  var backTo=Math.max(0,nextPlatIdx-1);
  landOnPlat(backTo);
  // 次のジャンプ先は、今戻った足場の次 = backTo+1
  nextPlatIdx=backTo+1;
  updateFloor();
}

function gameClear(){
  cleared=true;running=false;
  document.getElementById("clearScore").textContent=score;
  showOverlay("clearPanel");
}

function gameOver(){
  running=false;
  document.getElementById("goScore").textContent=score;
  document.getElementById("goFloor").textContent=Math.max(0,nextPlatIdx-1);
  showOverlay("gameoverPanel");
}

function showOverlay(panelId){
  document.getElementById("startPanel").style.display="none";
  document.getElementById("clearPanel").style.display="none";
  document.getElementById("gameoverPanel").style.display="none";
  document.getElementById(panelId).style.display="block";
  document.getElementById("overlay").style.display="flex";
}

// === 描画関数 ===
function drawBG(){
  var hr=Math.min(1,(nextPlatIdx-1)/TOTAL);
  var sky=ctx.createLinearGradient(0,0,0,H);
  if(hr<.4){sky.addColorStop(0,"#87CEEB");sky.addColorStop(1,"#E8F5E9")}
  else if(hr<.8){sky.addColorStop(0,"#5C9CE6");sky.addColorStop(1,"#FFE0B2")}
  else{sky.addColorStop(0,"#FF8A65");sky.addColorStop(1,"#FFCC80")}
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  if(towerImg.complete&&towerImg.naturalWidth>0){
    var iw=W,ih=iw*(towerImg.naturalHeight/towerImg.naturalWidth);
    var par=camY*0.4,startY=-(par%ih)-ih;
    ctx.globalAlpha=0.5;
    for(var y=startY;y<H+ih;y+=ih)ctx.drawImage(towerImg,0,y,iw,ih);
    ctx.globalAlpha=1;
  }
}

function drawPlat(p,idx){
  var sy=p.y-camY;if(sy<-30||sy>H+30)return;
  var isNext=(idx===nextPlatIdx);
  var g=ctx.createLinearGradient(p.x,sy,p.x,sy+p.h);
  if(p.goal){
    // Draw gondola image instead of platform
    if(gondolaImg.complete&&gondolaImg.naturalWidth>0){
      var gAsp=gondolaImg.naturalHeight/gondolaImg.naturalWidth;
      var gW=p.w*1.6;var gH=gW*gAsp;
      ctx.save();
      var glowA=.5+Math.sin(t*.08)*.3;
      ctx.shadowColor="rgba(255,215,0,"+glowA+")";ctx.shadowBlur=25;
      ctx.drawImage(gondolaImg,p.x+p.w/2-gW/2,sy-gH+p.h+8,gW,gH);
      ctx.shadowBlur=0;ctx.restore();
    }
    ctx.fillStyle="#fff";ctx.font="bold 14px sans-serif";ctx.textAlign="center";
    ctx.fillText("GOAL!",p.x+p.w/2,sy-p.h-30);
    return;
  }else if(isNext){
    g.addColorStop(0,"#FFD700");g.addColorStop(.5,"#FFC107");g.addColorStop(1,"#FF9800");
  }else{
    g.addColorStop(0,"#C9A96E");g.addColorStop(.5,"#A0845C");g.addColorStop(1,"#7A6244");
  }
  ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(p.x,sy,p.w,p.h,6);ctx.fill();
  ctx.fillStyle="rgba(255,255,255,.3)";ctx.beginPath();ctx.roundRect(p.x+2,sy+1,p.w-4,p.h*.4,3);ctx.fill();
  if(isNext||p.goal){
    var glow=.4+Math.sin(t*.1)*.3;
    var col=p.goal?"rgba(255,100,200,":"rgba(255,215,0,";
    ctx.shadowColor=col+glow+")";ctx.shadowBlur=18;
    ctx.strokeStyle=col+"0.6)";ctx.lineWidth=2;
    ctx.beginPath();ctx.roundRect(p.x-2,sy-2,p.w+4,p.h+4,8);ctx.stroke();ctx.shadowBlur=0;
  }
  
}

function drawEnemy(e){
  if(!e.vis&&e.fadeOut<=0)return;
  var sy=e.y-camY;if(sy<-60||sy>H+60)return;
  var img=enemyImgs[e.type];if(!img||!img.complete)return;
  var bob=Math.sin(t*0.06+e.phase)*4;
  var wobX=Math.sin(t*0.04+e.phase)*12;
  var asp=img.naturalHeight/img.naturalWidth;
  var dw=e.w*1.3,dh=dw*asp;
  var alpha=1,scale=1;
  if(e.fadeIn>0){alpha=1-e.fadeIn/15;scale=0.5+0.5*alpha}
  if(e.fadeOut>0){alpha=e.fadeOut/15;scale=0.5+0.5*alpha}
  ctx.save();ctx.globalAlpha=Math.max(0,alpha);
  ctx.translate(e.x+wobX,sy+bob);ctx.scale(scale,scale);
  ctx.drawImage(img,-dw/2,-dh/2,dw,dh);
  ctx.restore();
}

function drawItem(it){
  if(it.got)return;var sy=it.y-camY;if(sy<-30||sy>H+30)return;
  it.pulse+=.06;var sc=1+Math.sin(it.pulse)*.15;
  ctx.save();ctx.translate(it.x,sy);ctx.scale(sc,sc);
  ctx.shadowColor=it.type==="star"?"rgba(255,215,0,.8)":"rgba(255,100,150,.8)";ctx.shadowBlur=15;
  if(it.type==="star"){
    it.ang+=.02;ctx.rotate(it.ang);ctx.beginPath();
    for(var i=0;i<10;i++){var ri=i%2===0?it.r:it.r*.42,a=(i/10)*Math.PI*2-Math.PI/2;
      i===0?ctx.moveTo(Math.cos(a)*ri,Math.sin(a)*ri):ctx.lineTo(Math.cos(a)*ri,Math.sin(a)*ri)}
    ctx.closePath();ctx.fillStyle="#FFD700";ctx.fill();ctx.strokeStyle="#FFA000";ctx.lineWidth=2;ctx.stroke();
  }else{
    var s=it.r*.9;ctx.beginPath();ctx.moveTo(0,s*.4);
    ctx.bezierCurveTo(-s,-s*.3,-s*.5,-s,0,-s*.5);ctx.bezierCurveTo(s*.5,-s,s,-s*.3,0,s*.4);
    ctx.closePath();ctx.fillStyle="#FF6B8A";ctx.fill();ctx.strokeStyle="#E74C6F";ctx.lineWidth=2;ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer(){
  var sx=P.x,sy=P.y-camY,bob=P.onG?Math.sin(P.bob)*2:0;
  ctx.save();ctx.translate(sx+P.w/2,sy+P.h/2);
  if(invincible>0&&Math.floor(invincible/4)%2===0){ctx.restore();return}
  if(P.onG){ctx.fillStyle="rgba(0,0,0,.15)";ctx.beginPath();ctx.ellipse(0,P.h/2+3,P.w*.4,4,0,0,Math.PI*2);ctx.fill()}
  if(playerImg.complete&&playerImg.naturalWidth>0){
    var asp=playerImg.naturalHeight/playerImg.naturalWidth,dw=P.w*1.6,dh=dw*asp;
    ctx.scale(P.face,1);ctx.drawImage(playerImg,-dw/2,-dh/2+bob,dw,dh);
  }else{ctx.font=P.w+"px serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("\uD83D\uDC78",0,bob)}
  ctx.restore();
}

// === メインループ ===
function loop(){
  if(!running)return;
  t++;
  if(invincible>0)invincible--;

  // --- ジャンプ中 ---
  if(jumping&&jumpTarget){
    jumpFrame++;
    var prog=jumpFrame/JUMP_DUR;
    if(prog>=1){
      // 着地完了
      P.x=jumpTarget.x;P.y=jumpTarget.y;
      P.vy=0;P.vx=0;P.onG=true;
      jumping=false;jumpTarget=null;

      // 着地した足場 = nextPlatIdx
      var landedIdx=nextPlatIdx;
      var landedPlat=plats[landedIdx];

      // 敵チェック（無敵中はスキップ）
      if(invincible<=0){
        var hit=false;
        for(var i=0;i<enemies.length;i++){
          if(enemies[i].pi===landedIdx&&enemies[i].vis){hit=true;break}
        }
        if(hit){
          // knockbackを呼ぶ（この中でreturnされるのでここで終わり）
          knockback();
          animId=requestAnimationFrame(loop);
          return;
        }
      }

      // 安全に着地 → 次へ進む
      nextPlatIdx++;
      updateFloor();

      // ゴール判定
      if(landedPlat&&landedPlat.goal){
        gameClear();
        return;
      }
    }else{
      // ジャンプ中の放物線
      P.x=P.sx+(jumpTarget.x-P.sx)*prog;
      var arcH=80+Math.abs(jumpTarget.x-P.sx)*0.15;
      P.y=P.sy+(jumpTarget.y-P.sy)*prog-arcH*Math.sin(prog*Math.PI);
    }
  }else if(!P.onG){
    P.vy+=0.25;P.y+=P.vy;
  }else{
    P.bob+=0.1;
  }

  // --- 敵の出現/消滅 ---
  for(var i=0;i<enemies.length;i++){
    var e=enemies[i];
    e.timer++;
    if(e.fadeIn>0)e.fadeIn--;
    if(e.fadeOut>0)e.fadeOut--;
    if(e.vis){
      if(e.timer>=ENEMY_STAY){e.vis=false;e.timer=0;e.fadeOut=15}
    }else{
      if(e.timer>=ENEMY_GONE){e.vis=true;e.timer=0;e.fadeIn=15}
    }
  }

  // --- カメラ ---
  var tgtCam=P.y-H*0.45;
  if(tgtCam<camY)camY+=(tgtCam-camY)*0.08;

  // --- アイテム ---
  for(var i=0;i<items.length;i++){
    var it=items[i];if(it.got)continue;
    var dx=P.x+P.w/2-it.x,dy=P.y+P.h/2-it.y;
    if(Math.sqrt(dx*dx+dy*dy)<P.w/2+it.r+10){
      it.got=true;score++;
      document.getElementById("scoreDisplay").textContent=score;
      spawnParts(it.x,it.y-camY,it.type==="star"?"#FFD700":"#FF6B8A");
      showFloat(it.x,it.y,it.type==="star"?"\u2B50+1":"\u2764\uFE0F+1");
    }
  }

  // --- パーティクル ---
  parts=parts.filter(function(p){p.x+=p.vx;p.y+=p.vy;p.vy+=.1;p.life--;p.r*=.94;return p.life>0});

  // --- 落下リスポーン ---
  if(!jumping&&P.y-camY>H+100){
    var ci=Math.max(0,nextPlatIdx-1);
    landOnPlat(ci);
  }

  // === 描画 ===
  ctx.clearRect(0,0,W,H);
  drawBG();
  for(var i=0;i<plats.length;i++){var sy=plats[i].y-camY;if(sy>-30&&sy<H+30)drawPlat(plats[i],i)}
  for(var i=0;i<items.length;i++)drawItem(items[i]);
  for(var i=0;i<enemies.length;i++)drawEnemy(enemies[i]);
  for(var i=0;i<parts.length;i++){var p=parts[i];ctx.globalAlpha=p.life/30;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=p.c;ctx.fill()}
  ctx.globalAlpha=1;
  drawPlayer();

  animId=requestAnimationFrame(loop);
}

function start(){
  score=0;lives=3;camY=0;t=0;nextPlatIdx=1;jumping=false;jumpTarget=null;invincible=0;cleared=false;
  parts=[];
  genPlats();
  landOnPlat(0);
  document.getElementById("scoreDisplay").textContent="0";
  updateFloor();updateLife();
  document.getElementById("overlay").style.display="none";
  running=true;
  loop();
}

canvas.addEventListener("touchstart",function(e){e.preventDefault();doJump()},{passive:false});
canvas.addEventListener("mousedown",function(){doJump()});
document.addEventListener("keydown",function(e){if(e.key===" "||e.key==="ArrowUp"){e.preventDefault();doJump()}});
document.getElementById("startBtn").addEventListener("click",start);
document.getElementById("retryBtn").addEventListener("click",start);
document.getElementById("retryBtn2").addEventListener("click",start);
resize();

towerImg.onload=function(){
  var sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,"#87CEEB");sky.addColorStop(1,"#E8F5E9");
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  var iw=W,ih=iw*(towerImg.naturalHeight/towerImg.naturalWidth);
  ctx.globalAlpha=0.5;for(var y=-ih;y<H+ih;y+=ih)ctx.drawImage(towerImg,0,y,iw,ih);ctx.globalAlpha=1;
};