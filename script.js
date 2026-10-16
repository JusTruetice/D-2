(()=>{'use strict';
/* ===== CONFIG: everything you may want to customise ===== */
const CFG={
  music:'./assets/La Seine and I by Matthieu Chedid and Vanessa Paradis.mp3',          // put your audio file here (or use the 🎵 button to pick one)
  musicVolume:.55,
  size:1, speed:1, snow:1,           // character size, skating speed, snow amount
  heartSecs:7, togetherSecs:12,      // heart drawing time, skating-together time
  girl:{coat:'#ff7a9a',scarf:'#fff1f5',hair:'#5a3326',skin:'#ffd9c2',dress:true,long:true,hat:null},
  boy:{coat:'#3d7bff',scarf:'#ffd166',hair:'#1f1a2b',skin:'#f3c9a8',dress:false,long:false,hat:'#e9f4ff'},
  rink:{skyT:[11,26,58],skyTN:[3,7,18],skyB:[24,48,92],skyBN:[8,16,40],iceA:[128,184,220],iceAN:[40,80,128],iceB:[84,136,182],iceBN:[22,48,92]},
  text:{
    l1:'"Sometimes, one person coming into your life ...',
    l2:'is enough to make you see the whole world differently.”.',
    start:'დავიწყოთ ❄️',
    q:'წამოხვალ ჩემთან ერთად ამ დეითზეც, რომ ჩვენი თავგადასავალი გავაგრძელოთ?',
    yes:'კი! ⛸️', no:'არა',
    bye:'მაშინ მოედანზე შევხვდებით. ❄️', bye2:'გავაგრძელოთ ჩვენი თავგადასავალი...',
    declined:'თავიდან სცადე უარი არ მიიღება! ❄️',
    replay:'თავიდან ↺',
    hint:'გაცურე ისრებით, WASD-ით ან თითის გასმით ⛸️'
  }
};
/* ===== prologue texts (envelope → letter → chapter title) ===== */
const PRE={e1:'შენთვის რაღაც მაქვს დამალული...',e2:'ოღონდ ჯერ უნდა გახსნა. 💌',openBtn:'გახსენი წერილი',
  c1:'გახსოვს ჩვენი პირველი შეხვედრა?',c2:'მგონი, შემდეგი თავის დროც მოვიდა...',showBtn:'მაჩვენე ✨',
  t1:'ჩვენი პატარა ისტორია',t2:'თავი II — უხერხულობის დაძლევაში',t3:'გავხადოთ ორით-ორი?!...',goBtn:'გავაგრძელოთ ❄️'};
const PRELUDE=['envelope','letter','title','intro'];
/* ===== helpers ===== */
const $=s=>document.querySelector(s),TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,ease=t=>{t=clamp(t);return t*t*(3-2*t)};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t),rgb=a=>`rgb(${a.map(Math.round)})`;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const cv=$('#c'),ctx=cv.getContext('2d'),audio=$('#bgm'),R=CFG.rink;
for(const [id,k] of [['l1','l1'],['l2','l2'],['start','start'],['q','q'],['yes','yes'],['no','no'],['bye','bye'],['bye2','bye2'],['rep','replay'],['hint','hint']])$('#'+id).textContent=CFG.text[k];
const show=(id,on=true)=>$(id).classList.toggle('show',on);
for(const k in PRE)$('#'+k).textContent=PRE[k];

/* ===== world state ===== */
let W,H,DPR,m,Hc,u,RK,hu,hy,hc;
let S={name:'envelope',t:0},clock=0,G,B,trails=[],hG=[],hB=[],flakes=[],sparks=[],stars=[],scratch=[];
let night=0,heartA=0,cam=1,dim=0,hold=0,waving=false,PS=1,pairA=0,rinkA=0,snow=0,snowT=.1,storm=0,orbA=Math.PI/2,locked=false,dodges=0,trailAcc=0;
let joy={on:0,x:0,y:0},started=false,vol=0,volT=0,raf=0,lastDodge=0;
const K=new Set(),MAXP=Math.round(460*CFG.snow*(RM?.4:1));

function glowSprite(c,r=32){const o=document.createElement('canvas');o.width=o.height=r*2;const x=o.getContext('2d'),g=x.createRadialGradient(r,r,0,r,r,r);g.addColorStop(0,`rgba(${c},1)`);g.addColorStop(.4,`rgba(${c},.4)`);g.addColorStop(1,`rgba(${c},0)`);x.fillStyle=g;x.fillRect(0,0,r*2,r*2);return o}
const SNOW=glowSprite('255,255,255'),GLOW=glowSprite('127,227,255');

function resize(){
  DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;
  m=Math.min(W,H);Hc=clamp(m*.13,46,88)*CFG.size;u=Hc/62;
  RK={x:W/2,y:H*.63,rx:W*.46,ry:H*.28};
  hu=Math.min(W*.58/32,H*.36/29);hy=RK.y-2*hu;hc={x:RK.x,y:hy+2.5*hu};
}
const heartPt=t=>({x:RK.x+16*Math.sin(t)**3*hu,y:hy-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))*hu});
const mk=(cfg,face)=>({x:0,y:0,vx:0,vy:0,face,lean:0,cfg});

function resetWorld(){
  G=mk(CFG.girl,1);B=mk(CFG.boy,-1);
  G.x=RK.x-RK.rx*.6;G.y=RK.y+RK.ry*.25;B.x=RK.x+RK.rx*.6;B.y=RK.y-RK.ry*.15;
  trails=[];hG=[];hB=[];night=0;heartA=0;cam=1;dim=0;hold=0;waving=false;PS=1;storm=0;locked=false;dodges=0;
  $('#no').style.transform='';['#inv','#btns','#q','#bye','#bye2','#rep','#hint'].forEach(s=>show(s,false));
}
function init(){
  resize();
  stars=Array.from({length:150},()=>({x:Math.random(),y:Math.random(),r:.4+Math.random()*1.1,sp:.8+Math.random()*2,tw:Math.random()*TAU}));
  scratch=Array.from({length:36},()=>({x:Math.random()*2-1,y:Math.random()*2-1,rx:.2+Math.random()*.5,ry:.05+Math.random()*.2,r:Math.random()*3,l:1+Math.random()*3}));
  flakes=Array.from({length:MAXP},(_,i)=>mkFlake(i,true));
  resetWorld();
  addEventListener('resize',resize);
  raf=requestAnimationFrame(frame);
}
function mkFlake(i,init){
  const L=i%10<6?0:i%10<9?1:2,lum=i%23===0,r=Math.random();
  return{L,lum,x:Math.random()*W,y:init?Math.random()*H:-20,r:[1.6,3,9][L]*(.7+r*.6)*(lum?1.7:1),vy:[28,50,110][L]*(.7+r*.6),dr:[8,14,22][L],ph:r*TAU,fr:.5+r,a:[.55,.7,.28][L]};
}

/* ===== state machine ===== */
function go(n){
  S={name:n,t:0};
  if(n==='title'){show('#card',false);show('#petals',false)}
  if(n==='intro')['#t1','#t2','#t3','#goBtn','#grain'].forEach(s=>show(s,false));
  if(n==='skating'){pairA=1;snowT=.03}
  if(n==='meeting'){S.g0={x:G.x,y:G.y};S.b0={x:B.x,y:B.y};hG=[];hB=[];heartA=1;show('#hint',false)}
  if(n==='together'){S.g0={x:G.x,y:G.y};S.b0={x:B.x,y:B.y};orbA=Math.PI/2}
  if(n==='goodbye'){S.cam0=cam;heartA=.9;snowT=1;storm=1;show('#inv',false);show('#q',false);show('#btns',false)}
  if(n==='declined'){snowT=.7;show('#btns',false);show('#q',false);$('#bye').textContent=CFG.text.declined;$('#bye2').textContent=''}
}
function startExperience(){
  if(started||S.name!=='intro')return;started=true;
  $('#intro').classList.add('gone');
  playMusic();go('skating');
}
function playMusic(){
  if(!audio.src||!audio.src.includes('assets')&&!audio.dataset.user)audio.src=CFG.music;
  vol=0;volT=CFG.musicVolume;audio.volume=0;
  const p=audio.play();if(p&&p.catch)p.catch(e=>console.info('Music not started:',e.message));
}
function resetExperience(){
  if(S.name!=='goodbye'&&S.name!=='declined')return;
  resetWorld();snow=0;playMusic();go('skating');
}

/* ===== movement ===== */
function setPos(e,x,y,dt){
  dt=dt||1/60;e.vx=lerp(e.vx,(x-e.x)/dt,.35);e.vy=lerp(e.vy,(y-e.y)/dt,.35);e.x=x;e.y=y;
  e.lean+=(clamp(e.vx/(.4*m),-1,1)-e.lean)*Math.min(1,dt*6);
}
function clampRink(e,k=.9){
  const nx=(e.x-RK.x)/(RK.rx*k),ny=(e.y-RK.y)/(RK.ry*k),d=nx*nx+ny*ny;
  if(d>1){const s=1/Math.sqrt(d);e.x=RK.x+nx*s*RK.rx*k;e.y=RK.y+ny*s*RK.ry*k;e.vx*=.6;e.vy*=.6}
}
function updatePlayer(dt){
  const dn=c=>K.has(c)?1:0;
  let ix=dn('ArrowRight')+dn('KeyD')-dn('ArrowLeft')-dn('KeyA')+joy.x,iy=dn('ArrowDown')+dn('KeyS')-dn('ArrowUp')-dn('KeyW')+joy.y;
  const l=Math.hypot(ix,iy);if(l>1){ix/=l;iy/=l}
  const acc=1.25*m*CFG.speed,max=.5*m*CFG.speed;
  G.vx+=ix*acc*dt;G.vy+=iy*acc*dt;const d=Math.exp(-.75*dt);G.vx*=d;G.vy*=d;
  const sp=Math.hypot(G.vx,G.vy);if(sp>max){G.vx*=max/sp;G.vy*=max/sp}
  G.x+=G.vx*dt;G.y+=G.vy*dt;clampRink(G);
  if(Math.abs(G.vx)>10)G.face=Math.sign(G.vx);
  G.lean+=(clamp(G.vx/max,-1,1)-G.lean)*Math.min(1,dt*6);
}
function updateBoy(dt){
  const dx=G.x-B.x,dy=G.y-B.y,dist=Math.hypot(dx,dy);
  const ang=Math.atan2(dy,dx)+.7*Math.sin(S.t*1.1)*Math.min(1,dist/(m*.4));
  const sp=clamp(dist*1.2,m*.12,m*.24*CFG.speed);
  const k=Math.min(1,dt*1.4);
  B.vx+=(Math.cos(ang)*sp-B.vx)*k;B.vy+=(Math.sin(ang)*sp-B.vy)*k;
  B.x+=B.vx*dt;B.y+=B.vy*dt;clampRink(B);
  if(Math.abs(B.vx)>10)B.face=Math.sign(B.vx);
  B.lean+=(clamp(B.vx/(.3*m),-1,1)-B.lean)*Math.min(1,dt*6);
  return dist;
}
const gapPx=()=>Hc*.95*PS;
function orbitStep(dt,w){
  orbA+=dt*.55*CFG.speed;
  const cx=RK.x+Math.cos(orbA)*RK.rx*.6,cy=RK.y-.05*RK.ry+Math.sin(orbA)*RK.ry*.5,hx=-Math.sin(orbA),g=gapPx();
  setPos(G,lerp(S.g0?.x??cx-g/2,cx-g/2,w),lerp(S.g0?.y??cy,cy+hx*g*.12,w),dt);
  setPos(B,lerp(S.b0?.x??cx+g/2,cx+g/2,w),lerp(S.b0?.y??cy,cy-hx*g*.12,w),dt);
  G.face=1;B.face=-1;
}
function addHeart(arr,p){const l=arr[arr.length-1];if(!l||Math.hypot(p.x-l.x,p.y-l.y)>2.5)arr.push({x:p.x,y:p.y})}

function update(dt){
  S.t+=dt;clock+=dt;const T=S.t;
  switch(S.name){
  case'envelope':
    if(T>.3)show('#envWrap');if(T>1.3)show('#e1');if(T>2.9)show('#e2');if(T>4.3)show('#openBtn');break;
  case'letter':{
    const e=$('#envBtn').classList;
    e.toggle('glow',T>0);e.toggle('nosal',T>.7);e.toggle('open',T>1.3);e.toggle('rise',T>2.3);
    ['#e1','#e2','#openBtn'].forEach(s=>show(s,false));
    if(T>3.6)show('#envWrap',false);
    if(T>3.8){show('#card');show('#petals')}if(T>5)show('#c1');if(T>7.4)show('#c2');if(T>9.6)show('#showBtn');break}
  case'title':
    dim=.35*ease(T/2.5);show('#grain');if(T>.8)show('#t1');if(T>2.4)show('#t2');if(T>4.6)show('#t3');if(T>6.2)show('#goBtn');break;
  case'intro':dim=Math.max(0,dim-dt*.4);
    if(T>.9)show('#l1');if(T>3.3)show('#l2');if(T>5.4)show('#start');break;
  case'skating':
    rinkA=clamp(T/1.6);if(T>1.5)show('#hint');if(T>10)show('#hint',false);
    updatePlayer(dt);const d=updateBoy(dt);
    if((d<m*.17&&T>2.5)||T>28)go('meeting');break;
  case'meeting':{
    const a=1.5,d=CFG.heartSecs,p=2.4,s=ease((T-a)/d);
    const hg=heartPt(Math.PI+Math.PI*s),hb=heartPt(TAU+Math.PI*s);
    if(T<a){const w=ease(T/a);setPos(G,lerp(S.g0.x,hg.x,w),lerp(S.g0.y,hg.y,w),dt);setPos(B,lerp(S.b0.x,hb.x,w),lerp(S.b0.y,hb.y,w),dt)}
    else if(T<a+d){setPos(G,hg.x,hg.y,dt);setPos(B,hb.x,hb.y,dt);addHeart(hG,hg);addHeart(hB,hb)}
    else{
      if(T<a+d+.05){hG.push(heartPt(TAU));hB.push(heartPt(Math.PI*3))}
      const w=ease((T-a-d)/p),g=gapPx();
      setPos(G,lerp(heartPt(TAU).x,hc.x-g/2,w),lerp(heartPt(TAU).y,hc.y,w),dt);
      setPos(B,lerp(heartPt(Math.PI*3).x,hc.x+g/2,w),lerp(heartPt(Math.PI*3).y,hc.y,w),dt);
    }
    G.face=1;B.face=-1;if(T>a+d+p+.5)go('together');break}
  case'together':
    night=clamp(T/CFG.togetherSecs);snowT=.1+.75*night;heartA=lerp(1,.35,night);
    hold=ease((T-.8)/1.6);orbitStep(dt,ease(T/2));
    if(T>CFG.togetherSecs)go('invitation');break;
  case'invitation':
    night=1;snowT=.85;hold=1;orbitStep(dt,1);
    cam=lerp(1,.62,ease(T/3.5));dim=.4*ease(T/3.5);
    if(T>1.8){show('#inv');show('#q')}if(T>3)show('#btns');break;
  case'declined':
    orbitStep(dt,1);dim=lerp(.4,.55,ease(T/3));show('#bye');if(T>2.5)show('#rep');volT=.15;break;
  case'goodbye':goodbye(dt,T);break;
  }
  trailAcc+=dt;if(trailAcc>.025){trailAcc=0;if(pairA>.3&&rinkA>.5)for(const e of[G,B])if(Math.hypot(e.vx,e.vy)>25)trails.push({x:e.x,y:e.y,t:clock,id:e===B?1:0});}
  while(trails.length&&clock-trails[0].t>1.4)trails.shift();
  snow+=(snowT-snow)*Math.min(1,dt*.6);
}
function goodbye(dt,T){
  night=1;hold=1;cam=lerp(S.cam0,1,ease(T/2.2));
  dim=T<9?lerp(.4,.2,ease(T/2)):lerp(.2,.62,ease((T-9)/4));
  waving=T>6.5&&T<10;heartA=T>13?.6+.15*Math.sin(clock*2):.9;
  let cx=RK.x,cy=RK.y,pa=0;
  if(T<1.2){pa=1-T/1.2;orbitStep(dt,1)}
  else if(T>=1.6){
    const e=ease((T-1.6)/4.9),e2=ease((T-10)/3.5);
    PS=.5+.7*e-.5*e2;pa=clamp((T-1.6)/.8)*(1-e2);
    cx=RK.x-(1-e)*.2*W+Math.sin(e*Math.PI*1.4)*.12*W*(1-e)+e2*.55*W+(T>6.5?Math.sin(clock*.8)*3:0);
    cy=RK.y-.12*RK.ry+e*.5*RK.ry-e2*.2*RK.ry;
    const g=gapPx();setPos(G,cx-g/2,cy,dt);setPos(B,cx+g/2,cy,dt);
    const f=T>6.5&&T<10?0:1;G.face=B.face=f;
  }
  pairA=pa;
  if(T>10)volT=0;
  if(T>13.2){show('#bye');if(T>14.5)show('#bye2')}if(T>16)show('#rep');
}

/* ===== drawing ===== */
function body(e,k){
  const c=e.cfg,f=e.face;ctx.lineCap='round';
  ctx.fillStyle='#e9f6ff';ctx.fillRect(-7*k,-6*k,6*k,5*k);ctx.fillRect(k,-6*k,6*k,5*k);
  ctx.strokeStyle='#dff6ff';ctx.lineWidth=1.6*k;ctx.beginPath();ctx.moveTo(-8*k,0);ctx.lineTo(0,0);ctx.moveTo(k,0);ctx.lineTo(8*k,0);ctx.stroke();
  ctx.fillStyle='#1c2a4a';ctx.fillRect(-5.5*k,-16*k,4.5*k,11*k);ctx.fillRect(k,-16*k,4.5*k,11*k);
  if(c.long){ctx.fillStyle=c.hair;ctx.beginPath();ctx.ellipse(0,-40*k,11*k,14*k,0,0,TAU);ctx.fill()}
  ctx.fillStyle=c.coat;ctx.beginPath();
  if(c.dress){ctx.moveTo(-8*k,-35*k);ctx.lineTo(8*k,-35*k);ctx.lineTo(12*k,-15*k);ctx.lineTo(-12*k,-15*k);ctx.closePath()}else ctx.roundRect(-9*k,-35*k,18*k,21*k,5*k);
  ctx.fill();
  ctx.fillStyle=c.scarf;ctx.beginPath();ctx.roundRect(-8*k,-38*k,16*k,5*k,2.5*k);ctx.fill();
  ctx.fillStyle=c.skin;ctx.beginPath();ctx.arc(0,-46*k,9*k,0,TAU);ctx.fill();
  ctx.fillStyle=c.hair;ctx.beginPath();ctx.arc(0,-47*k,9.6*k,Math.PI*1.04,Math.PI*1.96);ctx.fill();
  if(c.hat){ctx.fillStyle=c.hat;ctx.beginPath();ctx.arc(0,-48*k,9.8*k,Math.PI,TAU);ctx.fill();ctx.fillStyle=c.coat;ctx.fillRect(-9.8*k,-49*k,19.6*k,3.5*k);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,-58.5*k,3*k,0,TAU);ctx.fill()}
  const ex=f*2*k;ctx.fillStyle='#2a2038';
  for(const x of[-3.2,3.2]){ctx.beginPath();ctx.arc(x*k+ex,-45*k,k,0,TAU);ctx.fill()}
  ctx.fillStyle='rgba(255,120,150,.35)';
  for(const x of[-5.5,5.5]){ctx.beginPath();ctx.arc(x*k+ex,-42.5*k,1.6*k,0,TAU);ctx.fill()}
  ctx.strokeStyle='#2a2038';ctx.lineWidth=.9*k;ctx.beginPath();ctx.arc(ex,-43*k,2.4*k,.15*Math.PI,.85*Math.PI);ctx.stroke();
}
function arm(e,sx,sy,hx,hy,k){
  ctx.strokeStyle=e.cfg.coat;ctx.lineWidth=5*k;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(hx,hy);ctx.stroke();
  ctx.fillStyle=e.cfg.skin;ctx.beginPath();ctx.arc(hx,hy,2.8*k,0,TAU);ctx.fill();
}
function drawPair(){
  const A=pairA*rinkA;if(A<.01)return;const k=u*PS;
  for(const e of[G,B].sort((a,b)=>a.y-b.y)){
    ctx.save();ctx.globalAlpha=A;ctx.translate(e.x,e.y);
    ctx.fillStyle='rgba(20,50,90,.28)';ctx.beginPath();ctx.ellipse(0,k,12*k,3.5*k,0,0,TAU);ctx.fill();
    ctx.save();ctx.scale(1,-.35);ctx.globalAlpha=A*.16;body(e,k);ctx.restore();
    ctx.transform(1,0,-e.lean*.3,1,0,0);body(e,k);ctx.restore();
  }
  ctx.globalAlpha=A;
  const mx=(G.x+B.x)/2,my=(G.y+B.y)/2-22*k;
  for(const e of[G,B]){
    const s=e===G?1:-1,sy=e.y-31*k,ix=e.x+s*8*k,ox=e.x-s*8*k;
    if(waving)arm(e,ox,sy,ox-s*5*k+Math.sin(clock*11)*4*k,sy-15*k,k);else arm(e,ox,sy,ox-s*2*k,sy+15*k,k);
    arm(e,ix,sy,lerp(ix+s*2*k,mx,hold),lerp(sy+15*k,my,hold),k);
  }
  ctx.globalAlpha=1;
}
function drawSky(){
  const n=night,g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,rgb(mix(R.skyT,R.skyTN,n)));g.addColorStop(1,rgb(mix(R.skyB,R.skyBN,n)));
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  const pre=PRELUDE.includes(S.name),gA=pre?(S.name==='envelope'?clamp(S.t/2)*.75:.75):1,sA=S.name==='envelope'?clamp(S.t/2.5):1;
  const gl=ctx.createRadialGradient(W/2,H*.62,0,W/2,H*.62,m*.9);
  gl.addColorStop(0,`rgba(110,190,255,${.22*gA*(1-.4*n)})`);gl.addColorStop(1,'rgba(110,190,255,0)');
  ctx.fillStyle=gl;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#fff';
  for(const s of stars){ctx.globalAlpha=sA*(.45+.55*(RM?1:Math.sin(clock*s.sp+s.tw)));ctx.beginPath();ctx.arc(s.x*W,s.y*H,s.r,0,TAU);ctx.fill()}
  ctx.globalAlpha=1;
}
function drawRink(){
  if(rinkA<=0)return;const n=night;ctx.save();ctx.globalAlpha=rinkA;
  const g=ctx.createLinearGradient(0,RK.y-RK.ry,0,RK.y+RK.ry);
  g.addColorStop(0,rgb(mix(R.iceA,R.iceAN,n)));g.addColorStop(1,rgb(mix(R.iceB,R.iceBN,n)));
  ctx.beginPath();ctx.ellipse(RK.x,RK.y,RK.rx,RK.ry,0,0,TAU);ctx.fillStyle=g;ctx.fill();
  ctx.strokeStyle='rgba(220,245,255,.55)';ctx.lineWidth=4;ctx.stroke();
  ctx.save();ctx.clip();ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=1;
  for(const s of scratch){ctx.beginPath();ctx.ellipse(RK.x+s.x*RK.rx,RK.y+s.y*RK.ry,s.rx*RK.rx,s.ry*RK.ry,s.r,0,s.l);ctx.stroke()}
  const p=ctx.createRadialGradient(RK.x,RK.y,0,RK.x,RK.y,RK.rx);p.addColorStop(0,`rgba(150,215,255,${.12+.16*n})`);p.addColorStop(1,'rgba(150,215,255,0)');
  ctx.fillStyle=p;ctx.fillRect(0,0,W,H);ctx.restore();
  ctx.globalCompositeOperation='lighter';const sz=m*.09;
  for(let i=0;i<30;i++){const a=i/30*TAU,x=RK.x+Math.cos(a)*RK.rx*1.04,y=RK.y+Math.sin(a)*RK.ry*1.04;
    ctx.globalAlpha=rinkA*(.35+.65*n)*(.85+.15*Math.sin(clock*1.5+i));ctx.drawImage(GLOW,x-sz/2,y-sz/2,sz,sz)}
  ctx.restore();
}
function drawHeart(){
  if(heartA<.01)return;ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap=ctx.lineJoin='round';
  for(const arr of[hG,hB]){if(arr.length<2)continue;ctx.beginPath();arr.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    for(const[w,a,c]of[[12,.1,'110,210,255'],[6,.3,'140,225,255'],[2.2,.95,'255,255,255']]){ctx.lineWidth=w*Math.max(.7,u);ctx.strokeStyle=`rgba(${c},${a*heartA})`;ctx.stroke()}}
  ctx.restore();
}
function drawTrails(){
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
  for(let i=1;i<trails.length;i++){const a=trails[i-1],b=trails[i];if(a.id!==b.id)continue;const l=1-(clock-b.t)/1.4;if(l<=0)continue;
    ctx.strokeStyle=`rgba(${b.id?'190,170,255':'140,230,255'},${l*.55})`;ctx.lineWidth=(1+2*l)*Math.max(.8,u);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
  ctx.restore();
}
function drawSnow(dt){
  const n=Math.floor(MAXP*clamp(snow));
  for(let i=0;i<n;i++){const f=flakes[i];
    f.y+=f.vy*dt*(1+.5*storm);f.x+=(Math.sin(clock*f.fr+f.ph)*f.dr+8*storm)*dt;
    if(f.y>H+20||f.x>W+20){Object.assign(f,mkFlake(i,false));f.x=Math.random()*W}
    const s=f.r*(f.lum?3.2:2.4);ctx.globalAlpha=f.a*(f.lum?1:1);ctx.drawImage(f.lum?GLOW:SNOW,f.x-s/2,f.y-s/2,s,s)}
  ctx.globalAlpha=1;
}
function drawSparks(dt){
  for(let i=sparks.length-1;i>=0;i--){const p=sparks[i];p.l-=dt;if(p.l<=0){sparks.splice(i,1);continue}
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=60*dt;ctx.globalAlpha=clamp(p.l*1.5);ctx.drawImage(GLOW,p.x-8,p.y-8,16,16)}
  ctx.globalAlpha=1;
}
function render(dt){
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,W,H);drawSky();
  if(!PRELUDE.includes(S.name)){
    ctx.save();ctx.translate(RK.x,RK.y);ctx.scale(cam,cam);ctx.translate(-RK.x,-RK.y);
    drawRink();drawHeart();drawTrails();drawPair();ctx.restore();
  }
  if(dim>0){ctx.fillStyle=`rgba(2,5,14,${dim})`;ctx.fillRect(0,0,W,H)}
  drawSnow(dt);drawSparks(dt);
  if(joy.on){ctx.strokeStyle='rgba(159,230,255,.4)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(joy.x0,joy.y0,60,0,TAU);ctx.stroke();
    ctx.fillStyle='rgba(159,230,255,.35)';ctx.beginPath();ctx.arc(joy.x0+joy.x*60,joy.y0+joy.y*60,18,0,TAU);ctx.fill()}
}

/* ===== main loop ===== */
let last=0;
function frame(ts){
  const dt=Math.min(.05,(ts-last)/1000||0);last=ts;
  update(dt);render(dt);
  vol+=(volT-vol)*Math.min(1,dt*(volT?1.2:.45));try{audio.volume=clamp(vol)}catch(e){}
  raf=requestAnimationFrame(frame);
}

/* ===== input ===== */
const hintOff=()=>show('#hint',false);
addEventListener('keydown',e=>{
  if(S.name==='skating'&&e.code.startsWith('Arrow'))e.preventDefault();
  K.add(e.code);if(S.name==='skating')hintOff();
});
addEventListener('keyup',e=>K.delete(e.code));addEventListener('blur',()=>K.clear());
cv.addEventListener('pointerdown',e=>{
  if(S.name!=='skating')return;cv.setPointerCapture(e.pointerId);
  joy={on:1,id:e.pointerId,x0:e.clientX,y0:e.clientY,x:0,y:0};hintOff();
});
cv.addEventListener('pointermove',e=>{
  if(!joy.on||e.pointerId!==joy.id)return;
  joy.x=clamp((e.clientX-joy.x0)/60,-1,1);joy.y=clamp((e.clientY-joy.y0)/60,-1,1);
});
const up=e=>{if(joy.on&&e.pointerId===joy.id)joy={on:0,x:0,y:0}};
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
cv.addEventListener('contextmenu',e=>e.preventDefault());

function burst(x,y,n=16){for(let i=0;i<n;i++){const a=Math.random()*TAU,s=40+Math.random()*120;sparks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-60,l:.8+Math.random()*.6})}}
$('#start').addEventListener('click',startExperience);
$('#rep').addEventListener('click',resetExperience);
$('#yes').addEventListener('click',e=>{
  if(S.name!=='invitation'||locked)return;locked=true;burst(e.clientX,e.clientY,30);go('goodbye');
});
/* "არა" can never be pressed: it jumps away on approach, touch, click or Enter */
function dodge(){
  const no=$('#no'),y=$('#yes').getBoundingClientRect(),r=no.getBoundingClientRect(),ox=+no.dataset.ox||0,oy=+no.dataset.oy||0,bx=r.x-ox,by=r.y-oy;
  let nx,ny,t=0;
  do{nx=20+Math.random()*(innerWidth-r.width-40);ny=20+Math.random()*(innerHeight-r.height-40);t++}
  while(t<30&&nx<y.right+14&&nx+r.width>y.left-14&&ny<y.bottom+14&&ny+r.height>y.top-14);
  no.dataset.ox=nx-bx;no.dataset.oy=ny-by;no.style.transform=`translate(${nx-bx}px,${ny-by}px)`;
  burst(r.x+r.width/2,r.y+r.height/2,10);
}
$('#no').addEventListener('click',e=>{e.preventDefault();dodge()});
$('#no').addEventListener('pointerdown',e=>{e.preventDefault();dodge()});
document.addEventListener('pointermove',e=>{
  if(S.name!=='invitation'||locked||e.pointerType!=='mouse'||clock-lastDodge<.25)return;
  const r=$('#no').getBoundingClientRect(),cx=r.x+r.width/2,cy=r.y+r.height/2;
  if(Math.hypot(e.clientX-cx,e.clientY-cy)<110){lastDodge=clock;dodge()}
});
/* audio controls */
$('#mute').addEventListener('click',()=>{audio.muted=!audio.muted;$('#mute').textContent=audio.muted?'🔇':'🔊';$('#mute').setAttribute('aria-pressed',audio.muted);$('#mute').setAttribute('aria-label',audio.muted?'Unmute music':'Mute music')});
$('#pick').addEventListener('click',()=>$('#file').click());
$('#file').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;audio.src=URL.createObjectURL(f);audio.dataset.user=1;if(started){volT=CFG.musicVolume;audio.play().catch(()=>{})}});
/* prologue wiring: each handler is guarded by the scene state, so double taps can't skip or repeat scenes */
$('#envWrap').insertAdjacentHTML('beforeend',[[-8,66,26],[-3,12,18],[93,8,22],[101,58,28],[18,104,20],[76,106,24],[46,-16,16],[112,100,14]].map(([x,y,s],i)=>`<svg class="fl" style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;animation-delay:-${i*.7}s" viewBox="-10 -10 20 20" aria-hidden="true"><use href="#fl"/></svg>`).join(''));
$('#petals').innerHTML=Array.from({length:16},()=>`<i style="left:${Math.random()*100}%;--s:${8+Math.random()*7}px;--d:${8+Math.random()*6}s;--l:-${Math.random()*10}s;--x:${Math.random()*160-80}px"></i>`).join('');
function openEnvelope(){if(S.name!=='envelope')return;$('#envBtn').style.transform='';go('letter')}
$('#envBtn').addEventListener('click',openEnvelope);
$('#openBtn').addEventListener('click',openEnvelope);
$('#showBtn').addEventListener('click',()=>{if(S.name==='letter'&&S.t>9.6)go('title')});
$('#goBtn').addEventListener('click',()=>{if(S.name==='title'&&S.t>6.2)go('intro')});
document.addEventListener('pointermove',e=>{if(S.name!=='envelope'||RM)return;$('#envBtn').style.transform=`perspective(800px) rotateY(${(e.clientX/W-.5)*16}deg) rotateX(${-(e.clientY/H-.5)*12}deg)`});
addEventListener('pagehide',()=>cancelAnimationFrame(raf));
init();
})();
