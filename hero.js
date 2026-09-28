/* One continuous, illustrative delivery mission. Recorded demos remain independent. */
(() => {
  const canvas = document.querySelector('#hero-canvas');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const hero = document.querySelector('.hero');
  const motion = document.querySelector('#hero-motion');
  const progress = document.querySelector('#mission-progress');
  const phase = document.querySelector('#mission-phase');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const {sample, duration, bodyPoint, hallPanels} = RISE_MISSION;
  let width=0, height=0, scale=1, cx=0, cy=0, time=reduced.matches?1:0;
  let frame=0, last=0, visible=true, paused=reduced.matches, yaw=0, bodyFrame=null, sceneOffset=null, wheelFrame=null;
  const gold='#edbf82', mint='#b5e5d6';
  const add=(a,b)=>a.map((v,i)=>v+b[i]);
  const worldPoint=p=>{if(wheelFrame){const [x,y,a]=wheelFrame,c=Math.cos(a),s=Math.sin(a),dx=p[0]-x,dy=p[1]-y;p=[x+c*dx-s*dy,y+s*dx+c*dy,p[2]];}const q=bodyFrame?bodyPoint(p,bodyFrame.robot,bodyFrame.heading):p;return sceneOffset?add(q,sceneOffset):q;};
  function project(p) {
    const [x,y,z=0]=worldPoint(p);
    const c=Math.cos(yaw), s=Math.sin(yaw), rx=x*c-y*s, ry=x*s+y*c;
    return [cx+(rx-ry)*.85*scale,cy+((rx+ry)*.32-z)*scale];
  }
  let lightTheme=document.documentElement.dataset.theme==='light',objectPalette=false;
  const paletteCache=new Map();
  function ink(color,fill=false){
    if(!lightTheme||objectPalette||!color?.startsWith('#'))return color;
    const key=color+fill;if(paletteCache.has(key))return paletteCache.get(key);
    const hex=color.slice(1),rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));
    if(rgb.some(v=>!Number.isFinite(v)))return color;
    let alpha=hex.length===8?parseInt(hex.slice(6),16)/255:1;
    let result;
    if(fill){
      const l=(rgb[0]+rgb[1]+rgb[2])/3;
      result=l<145?rgb.map((v,i)=>Math.round(v*.12+[225,234,228][i]*.88)):rgb;
    }else{
      const warm=rgb[0]>rgb[2]*1.12&&rgb[0]>rgb[1]*1.04;
      result=warm?[143,104,51]:[61,100,87];alpha=Math.min(1,alpha*1.45);
    }
    const value=`rgba(${result.join(',')},${alpha})`;paletteCache.set(key,value);return value;
  }
  function path(points,color,fill=null,lineWidth=1,glow=0,dash=[]) {
    ctx.save();ctx.beginPath();
    points.forEach((p,i)=>{const [x,y]=project(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
    ctx.lineWidth=lineWidth*scale;ctx.strokeStyle=ink(color);ctx.lineJoin='round';ctx.lineCap='round';
    if(fill){ctx.closePath();ctx.fillStyle=ink(fill,true);ctx.fill();}
    ctx.shadowBlur=lightTheme?0:glow;ctx.shadowColor=color;ctx.setLineDash(dash);ctx.stroke();ctx.restore();
  }
  function dot(p,r,color,glow=0) {
    const [x,y]=project(p);ctx.save();ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=glow;
    ctx.beginPath();ctx.arc(x,y,r*scale,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function ring(p,r,color,lineWidth=1,glow=0) {
    path(Array.from({length:49},(_,i)=>[p[0]+Math.cos(i/48*Math.PI*2)*r,p[1]+Math.sin(i/48*Math.PI*2)*r,p[2]]),color,null,lineWidth,glow);
  }
  function box(x,y,z,w,d,h,color,fill,top=fill) {
    const faces=[
      [[x,y,z],[x+w,y,z],[x+w,y,z+h],[x,y,z+h]],
      [[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]],
      [[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]],
      [[x,y,z],[x,y+d,z],[x,y+d,z+h],[x,y,z+h]]
    ];
    const depth=face=>face.reduce((sum,p)=>{p=worldPoint(p);return sum+p[0]+p[1];},0);
    faces.sort((a,b)=>depth(a)-depth(b));
    faces.forEach(face=>path(face,color,fill));
    path([[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]],color,top);
  }
  function parcel(p) {
    const [x,y,z]=p;
    ctx.save();ctx.shadowBlur=16;ctx.shadowColor='#f0b96699';
    box(x-4,y-4,z-4,8,8,8,'#ffdb9c','#ad7140','#eac18a');ctx.restore();
    path([[x-4,y,z+4.4],[x+4,y,z+4.4]],'#ffe8b5',null,1,4);
  }
  function table(x,y,z,delivery=false) {
    [[-23,-18],[23,-18],[-23,18],[23,18]].forEach(([dx,dy])=>path([[x+dx,y+dy,z],[x+dx,y+dy,z+40]],'#7fa8a28a',null,1.6));
    box(x-27,y-22,z+39,54,44,4,'#9dc6bd99','#244048','#38575a');
    if(delivery)ring([x,y,z+43.5],19,'#a5cabb59');
  }
  function bottle(p,color='#a8c7bd',kind='water') {
    const [x,y,z]=p,r=kind==='can'?2.8:2.5;
    const circle=(h,radius)=>Array.from({length:25},(_,i)=>[x+Math.cos(i/24*Math.PI*2)*radius,y+Math.sin(i/24*Math.PI*2)*radius,z+h]);
    path(circle(-7,r),'#a1d0c28a',color,.5);
    for(let i=0;i<16;i++){
      const a=i*Math.PI/8,b=(i+1)*Math.PI/8;
      path([[x+Math.cos(a)*r,y+Math.sin(a)*r,z-7],[x+Math.cos(b)*r,y+Math.sin(b)*r,z-7],[x+Math.cos(b)*r,y+Math.sin(b)*r,z+3],[x+Math.cos(a)*r,y+Math.sin(a)*r,z+3]],color,color,.25);
    }
    path(circle(3,r),'#cef1e6',color,.5);
    if(kind!=='can'){
      path([[x-r,y,z+3],[x-1.2,y,z+6],[x+1.2,y,z+6],[x+r,y,z+3]],color,color,.5);
      path([[x-1.3,y,z+6],[x+1.3,y,z+6]],'#d6edf1',null,2);
    }
    path([[x-r,y+r*.5,z-1],[x+r,y+r*.5,z-1]],'#c5d8ce',null,2.2);
  }
  function refrigerator(state) {
    const z=160;sceneOffset=RISE_MISSION.fridge.offset;
    // Cool-lit cabinet, three stocked shelves, and a glass hinged front.
    box(-168,-78,z,66,43,104,'#7faaa39c','#203a3e','#38565a');
    path([[-163,-34,z+7],[-107,-34,z+7],[-107,-34,z+98],[-163,-34,z+98]],'#b8ded6a0','#10262c',1);
    for(const height of [24,46,70]){
      path([[-162,-70,z+height],[-108,-70,z+height],[-108,-34,z+height],[-162,-34,z+height]],'#a6d7d490','#2e4e5280',.7);
      for(let col=0;col<6;col++){
        const x=-157+col*9;
        const colors=['#a8c7bd','#668e96'];
        bottle([x,-60,z+height+8],colors[col%2],col%2?'can':'bottle');
        if(!(height===46&&col===3))bottle([x,-42,z+height+8],colors[col%2],col%3?'bottle':'can');
      }
    }
    // The selected water is distinguishable from the mixed drinks behind it.
    if(state.waterState==='fridge')bottle([-130,-42,214]);
    path([[-164,-33,z+9],[-164,-33,z+98]],'#c0f5e5',null,1.1,5);
    const a=state.fridgeAngle,edge=[-165+Math.cos(a)*60,-35+Math.sin(a)*60];
    path([[-165,-35,z+3],[edge[0],edge[1],z+3],[edge[0],edge[1],z+102],[-165,-35,z+102]],'#b5d8cfbb','#73b4c719',1.3);
    const hx=-165+Math.cos(a)*51,hy=-35+Math.sin(a)*51;
    path([[hx,hy,z+46],[hx,hy,z+64]],'#e3e8cd',null,2.2);
    path([[-159,-34,z+109],[-111,-34,z+109]],'#b9ead9',null,1.4,4);
    sceneOffset=null;
  }

  function slab(z,index,state) {
    const front=index===2?75:index===1?180:147;
    const active=1-Math.min(1,Math.abs(state.robot[2]-z)/150);
    ctx.save();ctx.beginPath();
    const polygons=[[[-225,-151,z],[215,-151,z],[215,front,z],[-225,front,z]]];
    polygons.forEach(poly=>{poly.forEach((p,i)=>{const [x,y]=project(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();});
    ctx.fillStyle=`rgba(68,108,112,${.035+active*.08})`;ctx.fill('evenodd');
    ctx.strokeStyle=`rgba(132,175,169,${.17+active*.15})`;ctx.lineWidth=.8*scale;ctx.stroke();ctx.restore();
    // Only the front lip is doubled; remove floor grids and unused room walls.
    path([[-225,front,z],[-225,front,z-5],[215,front,z-5],[215,front,z]],'#7eaaa22a','#304e501a',.7);
    path([[-225,front,z],[215,front,z],[215,-151,z]],`rgba(170,222,204,${.15+active*.24})`,null,1,active*3);
    const [lx,ly]=project([index===2?-170:-235,front+15,z]);ctx.font=`${Math.max(10,11*scale)}px Arial`;ctx.fillStyle=lightTheme?'#4d6c5d':'#8eaaa5';ctx.fillText(`${index+1}F`,lx,ly);
  }

  function doorway(state) {
    // Ground-floor passage, with a hinged leaf and a contact point for the arm.
    path([[8,-139,0],[8,-139,75],[8,28,75],[8,28,0]],'#83afa55d','#30554e12');
    path([[8,102,0],[8,102,75],[8,147,75],[8,147,0]],'#83afa55d','#30554e12');
    path([[8,28,0],[8,28,112],[8,102,112],[8,102,0]],'#b1d4c57a',null,1.7);
    const a=state.doorAngle, edge=[8+Math.sin(a)*74,28+Math.cos(a)*74,0];
    const pushing=state.pushingDoor;
    path([[8,28,0],[8,28,109],[edge[0],edge[1],109],edge],pushing?'#eec995c7':'#96c3b7a6','#426f6552',1.1,pushing?6:0);
    const handle=[8+Math.sin(a)*57,28+Math.cos(a)*57,45];dot(handle,2.5,gold,pushing?10:3);
    path([[handle[0],handle[1],45],[handle[0]+Math.sin(a)*7,handle[1]+Math.cos(a)*7,45]],gold,null,1.6);
  }
  function lift(state) {
    const riding=state.riding;
    // Two quiet rear rails replace the stack of overlapping shaft outlines.
    for(const x of [108,188])path([[x,-121,-3],[x,-121,409]],'#92b4ab3d',null,.8);
    if(riding)path([[188,-121,state.liftHeight],[188,-121,state.liftHeight+87]],'#c3e2bfd1',null,1.8,10);
    for(let i=0;i<3;i++){
      const z=i*160,gap=state.liftDoors[i]*36;
      const active=Math.abs(state.robot[2]-z)<70;
      path([[108,-31,z],[108,-31,z+112],[188,-31,z+112],[188,-31,z]],active?'#b4d5c57d':'#819f9838',null,1.1);
      // Opaque, understated door panels prevent lines behind them accumulating.
      if(gap<35.9){
        path([[110,-32,z],[147-gap,-32,z],[147-gap,-32,z+109],[110,-32,z+109]],active?'#94bcb56a':'#718e8633','#162b31d9',.8);
        path([[147+gap,-32,z],[186,-32,z],[186,-32,z+109],[147+gap,-32,z+109]],active?'#94bcb56a':'#718e8633','#162b31d9',.8);
      }
    }
    const z=state.liftHeight;
    path([[111,-118,z],[185,-118,z],[185,-33,z],[111,-33,z]],'#b8d5be82','#35554e6b',1.1);
    path([[111,-118,z],[111,-118,z+112],[185,-118,z+112],[185,-118,z]],'#a5c7b750',null,.9);
    // The top and bottom floors have one direction; the middle floor has both.
    for(const panel of hallPanels){
      const floorZ=(panel.floor-1)*160,dual=panel.buttons.length===2;
      const bottom=floorZ+(dual?28:34),top=floorZ+(dual?62:57);
      path([[94,-30,bottom],[108,-30,bottom],[108,-30,top],[94,-30,top]],'#8caea37d','#243d3df0',.8);
      for(const button of panel.buttons){
        const [x,y,z]=button.position;
        const called=panel.floor===state.calledFloor&&button.direction==='up';
        const face=Array.from({length:25},(_,i)=>[x+Math.cos(i/24*Math.PI*2)*4.4,y,z+Math.sin(i/24*Math.PI*2)*4.4]);
        path(face,called?gold:'#91b3a681',called?'#88734a':'#365449',.8,called?6:0);
        const d=button.direction==='up'?1:-1;
        path([[x-2.2,y,z-d],[x,y,z+1.6*d],[x+2.2,y,z-d]],called?'#fff0cd':'#c9d9c5',null,.9);
      }
    }
    // Narrow raised cabin panel; restrained inset buttons and aligned numerals.
    path([[184,-97,z+50],[184,-80,z+50],[184,-80,z+90],[184,-97,z+90]],'#8caaa565','#172c30',.65);
    path([[184,-95,z+89],[184,-82,z+89]],'#c2ddd29c',null,.7);
    for(let floor=1;floor<=3;floor++){
      const h=z+42+floor*12,selected=floor===state.selectedFloor;
      const face=Array.from({length:25},(_,i)=>[184,-88+Math.cos(i/24*Math.PI*2)*3.4,h+Math.sin(i/24*Math.PI*2)*3.4]);
      path(face,selected?gold:'#9bbcb080',selected?'#7a6949':'#29433f',.6,selected?4:0);
      const [tx,ty]=project([184,-88,h]);ctx.save();ctx.font=`${Math.max(5.5,6.5*scale)}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=lightTheme?'#294f3f':selected?'#ffebbd':'#d0e0d5';ctx.fillText(String(floor),tx,ty);ctx.restore();
    }
  }

  function wheel(x,y,z,angle,side) {
    // A cylinder in the XZ plane projects to a round wheel, not a block.
    const radius=7;
    const depth=at=>{const p=worldPoint([x,at,z]);return p[0]+p[1];};
    const near=depth(y-3)>depth(y+3)?y-3:y+3,far=near===y-3?y+3:y-3;
    const circle=(at,r)=>Array.from({length:33},(_,i)=>[x+Math.cos(i/32*Math.PI*2)*r,at,z+Math.sin(i/32*Math.PI*2)*r]);
    const point=(a,at,r=radius)=>[x+Math.cos(a)*r,at,z+Math.sin(a)*r];
    const visible=a=>{const p=worldPoint(point(a,y)),o=worldPoint([x,y,z]);return p[0]-o[0]+p[1]-o[1]+.64*(p[2]-o[2])>0;};
    path(circle(far,radius),'#6b897c','#16272b',.7);
    for(let i=0;i<32;i++){
      const a=i*Math.PI/16,b=(i+1)*Math.PI/16;
      if(visible((a+b)/2))path([point(a,far),point(b,far),point(b,near),point(a,near)],'#243b3c','#243b3c',.35);
    }
    for(let i=0;i<8;i++){
      const a=angle+i*Math.PI/4;
      if(visible(a))path([point(a,far,7.1),point(a,near,7.1)],i%2?'#67877c':'#b2c9b7',null,1.2);
    }
    path(circle(near,radius),'#a9c5b19c','#12242b',1);
    path(circle(near,4.5),'#8aafa07d','#34554e',.7);
    for(let i=0;i<3;i++)path([[x,near,z],point(angle+i*Math.PI*2/3,near,4.2)],'#d0ddc3',null,1);
    const a=angle+.5;
    path([[x,near,z],point(a,near,5.9),point(a+.65,near,5.9)],'#edbf82','#edbf82',.5);
    dot([x,near,z],1.4,'#d1dcc3');
  }

  function robot(state) {
    objectPalette=true;
    // Chassis, shoulder pedestal, basket, and wheels share the same yaw transform.
    bodyFrame=state;
    const wheels=state.wheels.map(w=>[w.x,w.y,Math.sign(w.y),w]);
    const depth=([x,y])=>{const p=worldPoint([x,y,7]);return p[0]+p[1];};
    wheels.sort((a,b)=>depth(a)-depth(b));
    const drawWheel=([x,y,side,w])=>{
      wheelFrame=[x,y,w.steering];wheel(x,y,7,w.roll,side);wheelFrame=null;
    };
    wheels.slice(0,2).forEach(drawWheel);
    box(-26,-14,9,52,28,9,'#adc5bc','#2b4248','#587171');
    // Two front lamps make the direction of the robot unambiguous as it turns.
    path([[-26,-12,14],[-26,12,14]],'#b8ead5',null,1.4,4);
    for(const y of [-11,11])dot([-26,y,14],1.7,'#d3f5dc',6);
    wheels.slice(2).forEach(drawWheel);
    box(-24,-9,18,17,18,2,'#a4c2b7','#435c5d','#89a69a');
    box(-4,-18,18,36,36,2,'#a8bcb293','#314c4d');
    path([[-4,-18,20],[-4,-18,36],[32,-18,36],[32,-18,20]],'#aac4b9b3','#63796c13');
    if(state.parcelState==='basket')parcel([14,0,24]);
    else{bodyFrame=null;parcel(state.parcel);bodyFrame=state;}
    if(state.waterState==='basket')bottle([14,9,27]);
    else if(state.waterState!=='fridge'){bodyFrame=null;bottle(state.water);bodyFrame=state;}
    path([[-4,18,20],[-4,18,36],[32,18,36],[32,18,20]],'#bed1bcbd','#71897909');
    path([[-4,-18,36],[32,-18,36],[32,18,36],[-4,18,36],[-4,-18,36]],'#d3dcca',null,1.4);
    for(let i=1;i<5;i++){
      path([[-4+i*7.2,18,20],[-4+i*7.2,18,36]],'#a1baae99',null,.7);
      path([[32,-18+i*7.2,20],[32,-18+i*7.2,36]],'#a1baae88',null,.7);
    }
    path([[-4,18,27],[32,18,27],[32,-18,27]],'#a1baae77',null,.7);
    bodyFrame=null;
    RISE_PANDA.draw(ctx,state,project,yaw);objectPalette=false;
  }

  function route(state) {
    const lower=[[-119,65,.5],[-30,65,.5],[32,65,.5],[99,65,.5],[147,6,.5],[147,-77,.5]];
    const upper=[[147,-77,320.5],[147,40,320.5],[-90,0,320.5]];
    if(state.missionTime>=10.5&&state.missionTime<31.5)path(lower,'#c4b18449',null,.9,0,[3,9]);
    if(state.missionTime>=92&&state.missionTime<99.7)path(upper,'#c4b18449',null,.9,0,[3,9]);
  }

  function atmosphere(state) {
    const [sx,sy]=project([0,0,-12]);
    const pool=ctx.createRadialGradient(sx,sy,10,sx,sy,290*scale);
    pool.addColorStop(0,'#74cbbb0d');pool.addColorStop(1,'#3c8a8b00');ctx.fillStyle=pool;ctx.fillRect(0,0,width,height);
  }

  function draw() {
    const state=sample(time);
    yaw=width>700?Math.sin(state.time*.12)*.018:0;
    ctx.clearRect(0,0,width,height);ctx.save();ctx.globalAlpha=state.opacity;
    atmosphere(state);
    // Architecture stays translucent, as in a cinematic cutaway of a building.
    for(let i=0;i<3;i++)slab(i*160,i,state);
    route(state);table(-174,65,0);table(-148,0,320,true);doorway(state);lift(state);refrigerator(state);
    robot(state); // Exactly one mobile manipulator throughout the entire sequence.
    if(state.delivered){
      const r=24+Math.min((state.missionTime-109)*18,55);
      ring([-148,0,363.5],r,`rgba(181,229,197,${.6*(1-(r-24)/55)*state.delivered})`,1.2,6);
      ring([-148,0,363.5],23,'#c3e1b9b0',1.2,6);
    }
    ctx.restore();
    phase.textContent=state.stage;
    progress.value=state.time;
    progress.style.setProperty('--progress',`${state.time/duration*100}%`);
  }
  function resize() {
    const rect=hero.getBoundingClientRect();width=rect.width;height=rect.height;
    const dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    const mobile=width<=700;
    scale=mobile?Math.min((width-20)/630,.9):Math.min(width/1320,(height-270)/570,1.25);
    cx=width*(mobile?.52:.66);cy=mobile?height-205:height-140;
    draw();
  }
  function tick(now) {
    frame=0;if(paused||!visible||document.hidden)return;
    if(!last)last=now;
    if(now-last>=32){time=(time+Math.min((now-last)/1000,.1))%duration;last=now;draw();}
    frame=requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);frame=0;last=0;
    motion.setAttribute('aria-pressed',String(paused));
    const label=paused?'Play background animation':'Pause background animation';
    motion.setAttribute('aria-label',label);motion.title=label;
    document.querySelector('#motion-symbol').setAttribute('d',paused?'M8 5l11 7-11 7Z':'M8 5v14M16 5v14');
    if(!paused&&visible&&!document.hidden)frame=requestAnimationFrame(tick);
  }
  motion.addEventListener('click',()=>{paused=!paused;sync();});
  progress.addEventListener('input',()=>{time=Number(progress.value);last=0;draw();});
  document.querySelector('#hero-replay').addEventListener('click',()=>{time=reduced.matches?1:0;paused=reduced.matches;draw();sync();});
  reduced.addEventListener('change',()=>{paused=reduced.matches;if(paused&&time<.8)time=1;draw();sync();});
  document.addEventListener('visibilitychange',sync);
  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:0}).observe(hero);
  progress.max=String(duration-.05);
  window.addEventListener('rise-theme-change',()=>{lightTheme=document.documentElement.dataset.theme==='light';draw();});
  resize();sync();
})();
