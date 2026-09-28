/* Lightweight Panda-inspired seven-axis illustration, sized for this chassis.
 * Analytic, fixed-side elbow poses are supplied by RISE_MISSION; no IK branch search.
 */
const RISE_PANDA = (() => {
  const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]);
  const mul=(a,k)=>a.map(v=>v*k),unit=a=>mul(a,1/(Math.hypot(...a)||1));
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const lerp=(a,b,f)=>add(a,mul(sub(b,a),f));
  function draw(ctx,state,project,yaw){
    const faces=[],c=Math.cos(yaw),s=Math.sin(yaw),view=[c+s,c-s,.64];
    function triangle(a,b,c,color){
      const normal=unit(cross(sub(b,a),sub(c,a)));
      if(normal.reduce((v,n,k)=>v+n*view[k],0)<0)return;
      const light=.58+.42*Math.max(0,-normal[0]*.3-normal[1]*.4+normal[2]*.866);
      const rgb=color.map(v=>Math.round(v*light));
      faces.push({points:[a,b,c].map(project),depth:[a,b,c].reduce((d,p)=>d+p.reduce((v,x,j)=>v+x*view[j],0),0),color:`rgb(${rgb.join(',')})`});
    }
    function shell(a,b,radius,color,profile=[[0,.65],[.08,1],[.82,.88],[1,.55]]){
      const axis=unit(sub(b,a)),ref=Math.abs(axis[2])>.9?[0,1,0]:[0,0,1];
      const u=unit(cross(axis,ref)),v=cross(axis,u),rings=[];
      for(const [f,r] of profile){
        const center=lerp(a,b,f);
        rings.push(Array.from({length:16},(_,i)=>add(center,add(mul(u,Math.cos(i*Math.PI/8)*r*radius),mul(v,Math.sin(i*Math.PI/8)*r*radius)))));
      }
      for(let j=0;j<rings.length-1;j++)for(let i=0;i<16;i++){
        const k=(i+1)%16;triangle(rings[j][i],rings[j][k],rings[j+1][i],color);triangle(rings[j][k],rings[j+1][k],rings[j+1][i],color);
      }
      for(let i=0;i<16;i++){let k=(i+1)%16;triangle(a,rings[0][k],rings[0][i],color);triangle(b,rings.at(-1)[i],rings.at(-1)[k],color);}
    }
    function joint(p,axis,r=3.5){
      const a=unit(axis);shell(add(p,mul(a,-2)),add(p,mul(a,2)),r,[47,61,65],[[0,.8],[.15,1],[.85,1],[1,.8]]);
      shell(add(p,mul(a,2)),add(p,mul(a,2.45)),r*.65,[165,180,175],[[0,1],[1,1]]);
    }
    const {shoulder,elbow,wrist,palm,hand,toolDirection,jawSide}=state;
    const upper=sub(elbow,shoulder),lower=sub(wrist,elbow),bendAxis=cross(upper,lower);
    const white=[218,228,224],cool=[192,211,205];
    shell(state.armBase,shoulder,4.1,white);
    shell(shoulder,elbow,3.7,white,[[0,.7],[.16,1],[.7,.85],[1,.65]]);
    shell(elbow,wrist,3.15,cool,[[0,.8],[.12,1],[.82,.78],[1,.6]]);
    shell(wrist,palm,2.5,white);
    // Shoulder yaw/pitch, upper-arm roll, elbow, forearm roll, wrist pitch/roll.
    joint(add(state.armBase,[0,0,2]),[0,0,1],4.3);
    joint(shoulder,bendAxis,3.7);
    joint(lerp(shoulder,elbow,.3),upper,3.65);
    joint(elbow,bendAxis,4);
    joint(lerp(elbow,wrist,.7),lower,3.1);
    joint(wrist,jawSide,3.25);
    joint(palm,toolDirection,2.7);
    const offset=(p,gap)=>add(p,mul(jawSide,gap));
    shell(offset(palm,-state.jawHalfGap),offset(palm,state.jawHalfGap),1.65,[126,146,144]);
    for(const [i,sign] of [-1,1].entries()){
      shell(offset(palm,sign*state.jawHalfGap),offset(hand,sign*state.jawHalfGap),.9,[218,225,217],[[0,1],[1,1]]);
      shell(offset(hand,sign*state.jawHalfGap),state.fingertips[i],.95,[58,74,72],[[0,1],[1,1]]);
    }
    faces.sort((a,b)=>a.depth-b.depth);
    for(const f of faces){ctx.beginPath();f.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=f.color;ctx.fill();ctx.strokeStyle=f.color;ctx.lineWidth=.3;ctx.stroke();}
  }
  return {draw};
})();
