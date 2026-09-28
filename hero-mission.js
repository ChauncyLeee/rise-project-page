/* A continuous mission with chassis heading, articulated tool poses, and contacts. */
const RISE_MISSION = (() => {
  const duration=118,pi=Math.PI;
  const clamp=v=>Math.max(0,Math.min(1,v));
  const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
  const amount=(t,a,b)=>ease((t-a)/(b-a));
  const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  const add=(a,b)=>a.map((v,i)=>v+b[i]);
  const mul=(a,s)=>a.map(v=>v*s);
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const unit=a=>mul(a,1/(Math.hypot(...a)||1));
  const directionMix=(a,b,t)=>unit(mix(a,b,t));
  const arc=(a,b,h,t)=>{const p=mix(a,b,t);p[2]+=Math.sin(t*pi)*h;return p;};
  // The manipulator is at the local -X front; the basket is behind it.
  const bodyPoint=(p,origin,heading)=>{
    const a=heading-pi,c=Math.cos(a),s=Math.sin(a);
    return [origin[0]+p[0]*c-p[1]*s,origin[1]+p[0]*s+p[1]*c,origin[2]+p[2]];
  };
  const source=[-174,65,47],destination=[-148,0,367];
  const hallPanels=[
    {floor:1,buttons:[{direction:'up',position:[101,-30,45]}]},
    {floor:2,buttons:[{direction:'up',position:[101,-30,212]},{direction:'down',position:[101,-30,198]}]},
    {floor:3,buttons:[{direction:'down',position:[101,-30,365]}]}
  ];
  const callButton=hallPanels[0].buttons[0].position,cabinButton=[184,-88,66];
  const moves=[
    [10.5,13,[-119,65,0],[-36,65,0]],
    [15,18,[-36,65,0],[5,65,0]],
    [20,21.5,[5,65,0],[99,65,0]],
    [22.3,23.8,[99,65,0],[147,6,0]],
    [29.5,31.5,[147,6,0],[147,-77,0]],
    [37.3,43.3,[147,-77,0],[147,-77,320]],
    [44.3,46.3,[147,-77,320],[147,40,320]],
    [47.3,50.3,[147,40,320],[-90,0,320]]
  ];
  const look=(from,to)=>Math.atan2(to[1]-from[1],to[0]-from[0]);
  const doorStart=look([-36,65],[8,85]),doorEnd=look([5,65],[65,28]);
  const approachHall=look([99,65],[147,6]),faceHall=look([147,6],callButton);
  const faceCabin=look([147,-77],cabinButton),driveDelivery=look([147,40],[-90,0])+2*pi;
  function baseSample(seconds){
    const time=((seconds%60)+60)%60;
    let robot=[-119,65,0],travelDistance=0;
    for(const [start,end,from,to] of moves){
      const f=amount(time,start,end);if(time>=start)robot=mix(from,to,f);
      travelDistance+=Math.hypot(to[0]-from[0],to[1]-from[1])*f;
    }
    const doorAngle=amount(time,15,18)*pi/2;
    const doorHandle=[8+Math.sin(doorAngle)*57,28+Math.cos(doorAngle)*57,45];
    let heading=pi;
    const turns=[
      [8.7,10.5,pi,0],[13,14,0,doorStart],
      [19,20,doorEnd,0],[21.5,22.3,0,approachHall],
      [23.8,24.5,approachHall,faceHall],[27.3,28.2,faceHall,-pi/2],
      [31.5,32.5,-pi/2,faceCabin],[35.3,36.3,faceCabin,pi/2],
      [46.3,47.3,pi/2,driveDelivery],[50.3,51,driveDelivery,pi]
    ];
    for(const [start,end,from,to] of turns)if(time>=start)heading=from+(to-from)*amount(time,start,end);
    if(time>=15&&time<19)heading=look(robot,doorHandle);
    const local=p=>bodyPoint(p,robot,heading);
    const basket=local([14,0,24]),basketOver=local([14,0,74]),rest=local([-38,0,64]);
    const armBase=local([-17,0,20]);
    const sweep=(a,b,f)=>add(mix(a,b,f),[-Math.sin(heading)*30*Math.sin(f*pi),Math.cos(heading)*30*Math.sin(f*pi),0]);
    const shoulder=local([-13,0,42]),turret=local([-13,0,22]);
    const restDirection=[0,0,-1],down=[0,0,-1];
    let hand=rest,toolDirection=restDirection,parcel=[...source],parcelState='source';
    let jawHalfGap=1.3;
    if(time<2){hand=mix(rest,add(source,[0,0,24]),amount(time,.6,2));toolDirection=down;}
    else if(time<3){hand=mix(add(source,[0,0,24]),source,amount(time,2,3));toolDirection=down;}
    else if(time<4.4){parcel=mix(source,add(source,[0,0,29]),amount(time,3,4.4));hand=parcel;parcelState='gripper';toolDirection=down;}
    else if(time<5.7){parcel=sweep(add(source,[0,0,29]),basketOver,amount(time,4.4,5.7));hand=parcel;parcelState='gripper';toolDirection=down;}
    else if(time<7){parcel=mix(basketOver,basket,amount(time,5.7,7));hand=parcel;parcelState='gripper';toolDirection=down;}
    else if(time<52){
      parcel=basket;parcelState='basket';
      if(time<8.1){hand=mix(basket,basketOver,amount(time,7.5,8.1));toolDirection=down;}
      else if(time<8.7){hand=sweep(basketOver,rest,amount(time,8.1,8.7));toolDirection=directionMix(down,restDirection,amount(time,8.1,8.7));}
      if(time>=14&&time<15){hand=mix(rest,doorHandle,amount(time,14,15));toolDirection=directionMix(restDirection,[1,0,0],amount(time,14,15));}
      if(time>=15&&time<18){hand=doorHandle;toolDirection=[Math.cos(doorAngle),-Math.sin(doorAngle),0];}
      if(time>=18&&time<19){hand=mix(doorHandle,rest,amount(time,18,19));toolDirection=directionMix([0,-1,0],restDirection,amount(time,18,19));}
      const hallApproach=add(callButton,[0,8,0]);
      if(time>=24.5&&time<25.6)hand=mix(rest,hallApproach,amount(time,24.5,25.6));
      if(time>=25.6&&time<25.9)hand=mix(hallApproach,callButton,amount(time,25.6,25.9));
      if(time>=25.9&&time<26.2)hand=callButton;
      if(time>=26.2&&time<26.5)hand=mix(callButton,hallApproach,amount(time,26.2,26.5));
      if(time>=26.5&&time<27.3)hand=mix(hallApproach,rest,amount(time,26.5,27.3));
      if(time>=24.5&&time<26.5)toolDirection=directionMix(restDirection,[0,-1,0],amount(time,24.5,25.6));
      if(time>=26.5&&time<27.3)toolDirection=directionMix([0,-1,0],restDirection,amount(time,26.5,27.3));
      const cabinApproach=add(cabinButton,[-9,0,0]);
      if(time>=32.5&&time<33.5)hand=mix(rest,cabinApproach,amount(time,32.5,33.5));
      if(time>=33.5&&time<33.8)hand=mix(cabinApproach,cabinButton,amount(time,33.5,33.8));
      if(time>=33.8&&time<34.2)hand=cabinButton;
      if(time>=34.2&&time<34.5)hand=mix(cabinButton,cabinApproach,amount(time,34.2,34.5));
      if(time>=34.5&&time<35.3)hand=mix(cabinApproach,rest,amount(time,34.5,35.3));
      if(time>=32.5&&time<34.5)toolDirection=directionMix(restDirection,[1,0,0],amount(time,32.5,33.5));
      if(time>=34.5&&time<35.3)toolDirection=directionMix([1,0,0],restDirection,amount(time,34.5,35.3));
      if(time>=51&&time<51.5){hand=sweep(rest,basketOver,amount(time,51,51.5));toolDirection=directionMix(restDirection,down,amount(time,51,51.5));}
      if(time>=51.5){hand=mix(basketOver,basket,amount(time,51.5,52));toolDirection=down;}
    }else if(time<52.8){parcel=mix(basket,basketOver,amount(time,52,52.8));hand=parcel;parcelState='gripper';toolDirection=down;}
    else if(time<53.5){parcel=sweep(basketOver,add(destination,[0,0,27]),amount(time,52.8,53.5));hand=parcel;parcelState='gripper';toolDirection=down;}
    else if(time<54){parcel=mix(add(destination,[0,0,27]),destination,amount(time,53.5,54));hand=parcel;parcelState='gripper';toolDirection=down;}
    else{parcel=[...destination];parcelState='delivered';hand=mix(destination,rest,amount(time,54.5,56));toolDirection=directionMix(down,restDirection,amount(time,54.5,56));}
    // Empty jaws close completely for navigation, door pushing, and button presses.
    if(time<7)jawHalfGap=6-.7*amount(time,2.6,3);
    else if(time<7.5)jawHalfGap=5.3+.7*amount(time,7,7.5);
    else if(time<8.7)jawHalfGap=6-4.7*amount(time,8.1,8.7);
    else if(time>=50.8&&time<51.6)jawHalfGap=1.3+4.7*amount(time,50.8,51.5);
    else if(time>=51.6&&time<54)jawHalfGap=6-.7*amount(time,51.6,52);
    else if(time>=54&&time<54.5)jawHalfGap=5.3+.7*amount(time,54,54.5);
    else if(time>=54.5&&time<56)jawHalfGap=6-4.7*amount(time,54.5,56);
    // Shoulder yaw, shoulder pitch, elbow, forearm roll, and a pose-aware wrist.
    const wrist=add(hand,mul(toolDirection,-14)),palm=add(hand,mul(toolDirection,-7));
    const delta=wrist.map((v,i)=>v-shoulder[i]),distance=Math.hypot(...delta),direction=unit(delta);
    const pole=bodyPoint([0,1,1],[0,0,0],heading);
    const normal=unit(pole.map((v,i)=>v-dot(pole,direction)*direction[i]));
    const bend=Math.sqrt(Math.max(0,40*40-distance*distance/4));
    const elbow=shoulder.map((v,i)=>v+delta[i]/2+normal[i]*bend);
    const side=[-Math.sin(heading),Math.cos(heading),0];
    const jawSide=unit(side.map((v,i)=>v-dot(side,toolDirection)*toolDirection[i]));
    const tipGap=Math.max(0,jawHalfGap-1.3);
    const fingertips=[add(hand,mul(jawSide,-tipGap)),add(hand,mul(jawSide,tipGap))];
    const callContact=amount(time,25.6,25.9)*(1-amount(time,26.2,26.5));
    const floorContact=amount(time,33.5,33.8)*(1-amount(time,34.2,34.5));
    const stage=time<8.7?'Pick & stow':time<10.5?'Turn toward the door':time<23.8?'Open the door':time<26.5?'Call the elevator':time<29.5?'Wait for the elevator':time<32.5?'Enter & align':time<35.3?'Select floor 3':time<36.3?'Turn toward the exit':time<37.3?'Doors closing':time<43.3?'Travel to floor 3':time<44.3?'Arrived on floor 3':time<56?'Deliver':'Delivery complete';
    return {time,robot,heading,travelDistance,basket,armBase,hand,shoulder,turret,elbow,wrist,palm,toolDirection,jawSide,jawHalfGap,fingertips,parcel,parcelState,doorAngle,stage,
      callButton,cabinButton,callContact,floorContact,callRegistered:time>=25.9,floorSelected:time>=33.8,
      liftHeight:160*(1-amount(time,26.2,28.5))+320*amount(time,37.3,43.3),
      liftDoors:[amount(time,28.5,29.5)*(1-amount(time,36.3,37.3)),0,amount(time,43.3,44.3)],
      pushingDoor:time>=14&&time<19,riding:time>=37.3&&time<43.3,
      opacity:amount(time,0,.8)*(1-amount(time,58.8,60)),delivered:amount(time,54,55)};
  }
  const fridgeOffset=[100,80,0],F=p=>add(p,fridgeOffset);
  const fridge={offset:fridgeOffset,hinge:F([-165,-35,160]),width:60,water:F([-130,-42,214])};
  const waterGoal=[-148,13,370];
  const fridgeHandle=a=>F([-165+Math.cos(a)*51,-35+Math.sin(a)*51,215]);
  const fridgeStance=a=>F([-165+51*Math.cos(a)-50*Math.sin(a),-35+51*Math.sin(a)+50*Math.cos(a),160]);
  function solveArm(s){
    const local=p=>bodyPoint(p,s.robot,s.heading);
    s.armBase=local([-17,0,20]);s.shoulder=local([-13,0,42]);s.turret=local([-13,0,22]);
    s.wrist=add(s.hand,mul(s.toolDirection,-14));s.palm=add(s.hand,mul(s.toolDirection,-7));
    const delta=s.wrist.map((v,i)=>v-s.shoulder[i]),d=Math.hypot(...delta),dir=unit(delta);
    const swivel=pi*amount(s.time,55.5,57)*(1-amount(s.time,66,67));
    const pole=bodyPoint([Math.sin(swivel),Math.cos(swivel),1],[0,0,0],s.heading),normal=unit(pole.map((v,i)=>v-dot(pole,dir)*dir[i]));
    const bend=Math.sqrt(Math.max(0,1600-d*d/4));s.elbow=s.shoulder.map((v,i)=>v+delta[i]/2+normal[i]*bend);
    const ref=[Math.cos(s.heading),Math.sin(s.heading),1],dtool=s.toolDirection;
    s.jawSide=unit([ref[1]*dtool[2]-ref[2]*dtool[1],ref[2]*dtool[0]-ref[0]*dtool[2],ref[0]*dtool[1]-ref[1]*dtool[0]]);
    s.fingertips=[-1,1].map(sign=>add(s.hand,mul(s.jawSide,sign*Math.max(0,s.jawHalfGap-1.3))));
  }
  function missionSample(seconds){
    const time=((seconds%duration)+duration)%duration;
    let s=baseSample(time<44.3?time:time<92?51:Math.min(56,time-47.7));
    s.time=time;s.fridgeAngle=0;s.waterState='fridge';s.water=[...fridge.water];s.selectedFloor=time>=33.8?2:0;
    s.calledFloor=time>=25.9&&time<29.5?1:0;s.delivered=0;
    if(time<44.3){
      const shift=-s.robot[2]/2;
      for(const key of ['robot','hand','parcel','basket'])s[key]=add(s[key],[0,0,shift]);
      s.liftHeight=160*(1-amount(time,26.2,28.5))+160*amount(time,37.3,43.3);
      s.liftDoors[1]=s.liftDoors[2];s.liftDoors[2]=0;
      s.stage=s.stage.replace('floor 3','floor 2');
    }else if(time<92){
      const motion=[
        [44.3,46.3,[147,-77,160],[147,40,160]],
        [47.3,51,[147,40,160],fridgeStance(0)],
        [55.5,56,fridgeStance(pi/2),F([-215,60,160])],
        [56,56.5,F([-215,60,160]),F([-130,60,160])],
        [56.5,57,F([-130,60,160]),F([-130,15,160])],
        [66,66.35,F([-130,15,160]),F([-130,60,160])],
        [66.35,66.7,F([-130,60,160]),F([-215,60,160])],
        [66.7,67,F([-215,60,160]),fridgeStance(pi/2)],
        [72,75,fridgeStance(0),[147,6,160]],
        [79,81,[147,6,160],[147,-77,160]],
        [87,91,[147,-77,160],[147,-77,320]]
      ];
      let travel=baseSample(44.3).travelDistance;s.robot=[147,-77,160];
      for(const [a,b,p,q] of motion){const f=amount(time,a,b);if(time>=a)s.robot=mix(p,q,f);travel+=Math.hypot(q[0]-p[0],q[1]-p[1])*f*(a===66?-1:1);}
      const toFridge=look([147,40],fridgeStance(0)),toLift=look(fridgeStance(0),[147,6]);
      const hallHeading=look([147,6],[101,-30]),cabinHeading=look([147,-77],[184,-88]);
      s.heading=pi/2;
      for(const [a,b,p,q] of [[46.3,47.3,pi/2,toFridge],[51,52,toFridge,3*pi/2],[71,72,3*pi/2,toLift+2*pi],[75,76,toLift+2*pi,hallHeading+2*pi],[78,79,hallHeading+2*pi,3*pi/2],[81,82,3*pi/2,cabinHeading+2*pi],[85,86,cabinHeading+2*pi,5*pi/2]])if(time>=a)s.heading=p+(q-p)*amount(time,a,b);
      const opening=amount(time,53,55),closing=amount(time,68,70);
      if(time>=53&&time<55.5){s.robot=fridgeStance(opening*pi/2);s.heading=3*pi/2+opening*pi/2;}
      if(time>=55.5&&time<57)s.heading=2*pi-pi/2*amount(time,55.5,57);
      if(time>=66&&time<68)s.heading=3*pi/2+pi/2*amount(time,66,67);
      if(time>=68&&time<72){s.robot=fridgeStance((1-closing)*pi/2);s.heading=time<71?2*pi-closing*pi/2:s.heading;}
      travel+=Math.hypot(51,50)*pi/2*(opening+closing);
      const local=p=>bodyPoint(p,s.robot,s.heading),rest=local([-38,0,64]);
      s.basket=local([14,0,24]);s.parcel=s.basket;s.parcelState='basket';s.hand=rest;s.toolDirection=[0,0,-1];s.jawHalfGap=1.3;
      s.fridgeAngle=pi/2*amount(time,53,55)*(1-amount(time,68,70));
      const handle=fridgeHandle(s.fridgeAngle),openHandle=fridgeHandle(pi/2),closedHandle=fridgeHandle(0);
      const outward=[0,-1,0],down=[0,0,-1];
      const reach=(a,b,p,q,from=down,to=down)=>{s.hand=mix(p,q,amount(time,a,b));s.toolDirection=directionMix(from,to,amount(time,a,b));};
      if(time>=52&&time<53)reach(52,53,rest,closedHandle,down,outward);
      if(time>=53&&time<55){s.hand=handle;s.toolDirection=[Math.sin(s.fridgeAngle),-Math.cos(s.fridgeAngle),0];}
      if(time>=55&&time<55.5)reach(55,55.5,openHandle,rest,[1,0,0],down);
      const approach=F([-130,-24,214]),outside=F([-130,-16,214]),above=F([-130,-16,234]);
      const waterBasket=local([14,9,27]),waterOver=local([14,9,74]);
      if(time>=57&&time<58)reach(57,58,rest,approach,down,outward);
      if(time>=58&&time<59)reach(58,59,approach,fridge.water,outward,outward);
      if(time>=59&&time<60)reach(59,60,fridge.water,outside,outward,outward);
      if(time>=60&&time<61)reach(60,61,outside,above,outward,down);
      if(time>=61&&time<63){s.hand=arc(above,waterOver,5,amount(time,61,63));}
      if(time>=63&&time<64)reach(63,64,waterOver,waterBasket);
      if(time>=64&&time<64.5)s.hand=waterBasket;
      if(time>=64.5&&time<65.5)reach(64.5,65.5,waterBasket,waterOver);
      if(time>=65.5&&time<66)reach(65.5,66,waterOver,rest);
      if(time>=67&&time<68)reach(67,68,rest,openHandle,down,[1,0,0]);
      if(time>=68&&time<70){s.hand=handle;s.toolDirection=[Math.sin(s.fridgeAngle),-Math.cos(s.fridgeAngle),0];}
      if(time>=70&&time<71)reach(70,71,closedHandle,rest,outward,down);
      if(time>=57&&time<59)s.jawHalfGap=1.3+3*amount(time,57,58)-.5*amount(time,58.7,59);
      if(time>=59&&time<64){s.waterState='gripper';s.water=s.hand;s.jawHalfGap=3.8;}
      if(time>=64){s.waterState='basket';s.water=waterBasket;}
      if(time>=64&&time<66)s.jawHalfGap=3.8+.5*amount(time,64,64.5)-3*amount(time,65.5,66);
      function press(a,target,approach,normal){
        if(time<a||time>=a+3)return;
        const u=time-a;
        if(u<.8)reach(a,a+.8,rest,approach,down,normal);
        else if(u<1.1)reach(a+.8,a+1.1,approach,target,normal,normal);
        else if(u<1.5){s.hand=target;s.toolDirection=normal;}
        else if(u<1.8)reach(a+1.5,a+1.8,target,approach,normal,normal);
        else reach(a+1.8,a+3,approach,rest,normal,down);
      }
      s.callButton=[101,-30,212];s.cabinButton=[184,-88,238];
      press(76,s.callButton,[101,-22,212],[0,-1,0]);press(82,s.cabinButton,[175,-88,238],[1,0,0]);
      s.calledFloor=time>=77.1&&time<79?2:0;s.selectedFloor=time>=83.1?3:0;
      s.callRegistered=time>=77.1;s.floorSelected=time>=83.1;
      s.liftHeight=160+160*amount(time,87,91);
      s.liftDoors=[0,(1-amount(time,47,48))+amount(time,77.8,79)*(1-amount(time,86,87)),amount(time,91,92)];
      s.riding=time>=87&&time<91;s.pushingDoor=false;s.doorAngle=pi/2;
      s.travelDistance=travel;
      s.stage=time<47.3?'Arrived on floor 2':time<52?'Approach the refrigerator':time<56?'Open the refrigerator':time<59?'Grasp the water':time<66?'Stow the water':time<71?'Close the refrigerator':time<76?'Return to the elevator':time<79?'Call the elevator':time<82?'Enter & align':time<85?'Select floor 3':time<87?'Doors closing':time<91?'Travel to floor 3':'Arrived on floor 3';
    }else{
      s.heading+=2*pi;
      const local=p=>bodyPoint(p,s.robot,s.heading),rest=local([-38,0,64]);
      s.selectedFloor=3;s.liftHeight=320;s.liftDoors=[0,0,1];s.fridgeAngle=0;
      s.waterState='basket';s.water=local([14,9,27]);
      if(time>=103.7){
        const over=local([14,9,74]),basket=local([14,9,27]),targetOver=add(waterGoal,[0,0,27]);
        s.hand=rest;s.toolDirection=[0,0,-1];s.jawHalfGap=1.3;
        if(time<104.7)s.hand=arc(rest,over,6,amount(time,103.7,104.7));
        else if(time<105.7)s.hand=mix(over,basket,amount(time,104.7,105.7));
        else if(time<106.7)s.hand=mix(basket,over,amount(time,105.7,106.7));
        else if(time<108)s.hand=arc(over,targetOver,6,amount(time,106.7,108));
        else if(time<109)s.hand=mix(targetOver,waterGoal,amount(time,108,109));
        else if(time<109.5)s.hand=waterGoal;
        else if(time<110.3)s.hand=mix(waterGoal,targetOver,amount(time,109.5,110.3));
        else if(time<111)s.hand=mix(targetOver,rest,amount(time,110.3,111));
        if(time<105.7)s.jawHalfGap=1.3+3*amount(time,103.7,104.7)-.5*amount(time,105.3,105.7);
        else if(time<109)s.jawHalfGap=3.8;
        else s.jawHalfGap=3.8+.5*amount(time,109,109.5)-3*amount(time,110.3,111);
        if(time>=105.7&&time<109){s.waterState='gripper';s.water=s.hand;}
        if(time>=109){s.waterState='delivered';s.water=waterGoal;}
      }
      s.stage=time<99.7?'Approach the delivery table':time<103.7?'Deliver the parcel':time<111?'Deliver the water':'Delivery complete';s.delivered=amount(time,109,110);
    }
    s.opacity=amount(time,0,.8)*(1-amount(time,112.8,114));
    solveArm(s);return s;
  }
  // Give the two door-clearance detours time to complete without abrupt driving.
  const playbackTime=t=>t<=55.5?t:t<=57?55.5+(t-55.5)*3.5/1.5:t<=66?t+2:t<=67?68+(t-66)*3:t+4;
  function samplePose(seconds){
    const t=((seconds%duration)+duration)%duration;
    const logical=t<=55.5?t:t<=59?55.5+(t-55.5)*1.5/3.5:t<=68?t-2:t<=71?66+(t-68)/3:t-4;
    const state=missionSample(logical);state.missionTime=logical;state.time=t;return state;
  }
  // Four steering modules: derive each contact velocity in the chassis frame.
  // Wheel centers stay fixed to the chassis; steering and axle spin are separate.
  const wheelCenters=[[-18,-22],[18,-22],[-18,22],[18,22]],wheelDt=.02;
  let wheelMotion=null;
  function buildWheelMotion(){
    const count=Math.round(duration/wheelDt)+1,poses=[];
    for(let i=0;i<count;i++)poses.push(samplePose(Math.min(i*wheelDt,duration-.00001)));
    wheelMotion=wheelCenters.map(([x,y])=>{
      const velocity=[],angle=[],speed=[];let previous=0;
      for(let i=0;i<count;i++){
        const a=poses[Math.max(0,i-1)],b=poses[Math.min(count-1,i+1)],dt=(i===0||i===count-1)?wheelDt:2*wheelDt;
        const h=poses[i].heading-Math.PI,c=Math.cos(h),s=Math.sin(h);
        const dx=(b.robot[0]-a.robot[0])/dt,dy=(b.robot[1]-a.robot[1])/dt,omega=(b.heading-a.heading)/dt;
        const vx=c*dx+s*dy-omega*y,vy=-s*dx+c*dy+omega*x;
        velocity.push([vx,vy]);speed.push(Math.hypot(vx,vy));
        if(Math.hypot(vx,vy)<.03){angle.push(null);continue;}
        let target=Math.atan2(vy,vx);
        while(target-previous>Math.PI/2)target-=Math.PI;
        while(target-previous<-Math.PI/2)target+=Math.PI;
        angle.push(target);previous=target;
      }
      // Turn the steering modules while stopped, anticipating the next maneuver.
      let last=-1;
      for(let i=0;i<count;i++)if(angle[i]!==null){
        const from=last<0?angle[i]:angle[last],start=Math.max(last+1,i-25);
        for(let j=last+1;j<i;j++)angle[j]=from+(angle[i]-from)*ease((j-start)/Math.max(1,i-start));
        last=i;
      }
      for(let i=last+1;i<count;i++)angle[i]=last<0?0:angle[last];
      const smooth=angle.map((_,i)=>{
        let sum=0,weight=0;
        for(let k=-10;k<=10;k++){const w=11-Math.abs(k);sum+=angle[Math.max(0,Math.min(count-1,i+k))]*w;weight+=w;}
        return sum/weight;
      });
      const roll=[0];
      for(let i=1;i<count;i++){
        const velocityAlong=(j)=>velocity[j][0]*Math.cos(smooth[j])+velocity[j][1]*Math.sin(smooth[j]);
        roll.push(roll[i-1]-(velocityAlong(i-1)+velocityAlong(i))*wheelDt/14);
      }
      return {x,y,angle:smooth,roll};
    });
  }
  function sample(seconds){
    const state=samplePose(seconds);if(!wheelMotion)buildWheelMotion();
    const f=state.time/wheelDt,i=Math.floor(f),u=f-i;
    state.wheels=wheelMotion.map(w=>({x:w.x,y:w.y,steering:w.angle[i]+(w.angle[i+1]-w.angle[i])*u,roll:w.roll[i]+(w.roll[i+1]-w.roll[i])*u}));
    state.wheelAngles=[state.wheels[0].roll,state.wheels[2].roll];
    return state;
  }
  return {duration,sample,playbackTime,bodyPoint,hallPanels,fridge};
})();
