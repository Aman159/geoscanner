import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.167.1/build/three.module.js';

const $ = (id) => document.getElementById(id);
const state = { coords:null, profile:null, heading:0, tilt:0, started:false };
const colors = [0x42d6c7,0xe4ad61,0xcf6b48,0x7869bc,0x405a75,0x8ac17b];
const fallbackProfile = {
  source:'Conceptual fallback', name:'Regional subsurface model unavailable', meta:'Public geology service did not return a mapped unit for this coordinate.',
  layers:[
    {name:'Surface soil / fill',material:'Unverified local cover',thickness:3},
    {name:'Weathered zone',material:'Conceptual transition',thickness:12},
    {name:'Bedrock',material:'Use a geological survey for identification',thickness:40}
  ]
};

const renderer = new THREE.WebGLRenderer({canvas:$('scene'),alpha:true,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera3d = new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.1,500);
camera3d.position.set(0,7,14); camera3d.lookAt(0,-2,0);
scene.add(new THREE.HemisphereLight(0xaeeeff,0x291b12,2.4));
const key = new THREE.DirectionalLight(0xffffff,3); key.position.set(5,8,8); scene.add(key);
const model = new THREE.Group(); model.position.y=-1.4; scene.add(model);
const grid = new THREE.GridHelper(16,16,0x67e8f9,0x1d5261); grid.position.y=1.35; grid.material.transparent=true; grid.material.opacity=.35; model.add(grid);

function buildModel(profile){
  [...model.children].filter(x=>x!==grid).forEach(x=>{model.remove(x);x.geometry?.dispose();x.material?.dispose()});
  const maxDepth=Number($('depth').value); const input=profile.layers || fallbackProfile.layers;
  const total=input.reduce((s,l)=>s+(Number(l.thickness)||10),0); let y=1.2;
  input.forEach((layer,i)=>{
    const h=Math.max(.65,(Number(layer.thickness)||10)/total*8.8*(maxDepth/55));
    const geo=new THREE.BoxGeometry(10,h,8);
    const mat=new THREE.MeshStandardMaterial({color:colors[i%colors.length],transparent:true,opacity:.72,roughness:.72,metalness:.08});
    const mesh=new THREE.Mesh(geo,mat); mesh.position.y=y-h/2; mesh.rotation.y=.10; model.add(mesh);
    const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:0xb9f4ff,transparent:true,opacity:.45})); edges.position.copy(mesh.position); edges.rotation.copy(mesh.rotation); model.add(edges);
    y-=h+.08;
  });
}

function animate(){requestAnimationFrame(animate);model.rotation.y += ((state.heading*Math.PI/180)*.14-model.rotation.y)*.025;model.rotation.x += ((state.tilt*Math.PI/180)*.08-model.rotation.x)*.025;renderer.render(scene,camera3d)}
animate(); buildModel(fallbackProfile);

function setStatus(text,kind=''){ $('statusPill').textContent=text; $('statusPill').className=`pill ${kind}`; }
function normalizeMacrostrat(json){
  const root=json?.success?.data ?? json?.success ?? json?.data ?? json;
  const rows=Array.isArray(root)?root:(Array.isArray(root?.features)?root.features:[]);
  const props=rows[0]?.properties ?? rows[0] ?? {};
  const lith=props.lith || props.lithology || props.unit_name || props.name || props.strat_name;
  if(!lith) return null;
  const age=props.age || props.interval_name || [props.b_age,props.t_age].filter(Boolean).join('–');
  const base=String(lith).split(/[;,/]/).map(s=>s.trim()).filter(Boolean).slice(0,4);
  const names=base.length?base:[String(lith)];
  return {source:'Macrostrat public API',name:props.unit_name||props.name||names[0],meta:[age&&`Mapped age: ${age}`,`Mapped lithology: ${lith}`].filter(Boolean).join(' · '),layers:names.map((n,i)=>({name:n,material:i===0?'Mapped surface unit':'Conceptual continuation',thickness:[6,14,22,35][i]||20}))};
}
async function getProfile(lat,lon){
  const urls=[
    `https://macrostrat.org/api/v2/geologic_units/map?lat=${lat}&lng=${lon}`,
    `https://macrostrat.org/api/v2/geologic_units/map?lat=${lat}&lon=${lon}`,
    `https://macrostrat.org/api/v2/mobile/map_query_v2?lat=${lat}&lng=${lon}`
  ];
  for(const url of urls){try{const r=await fetch(url,{headers:{Accept:'application/json'}});if(!r.ok)continue;const p=normalizeMacrostrat(await r.json());if(p)return p}catch(e){console.warn('Geology endpoint failed',e)}}
  return fallbackProfile;
}
function renderPanel(p){state.profile=p;$('unitName').textContent=p.name;$('unitMeta').textContent=`${p.meta} · Source: ${p.source}`;$('layers').innerHTML=p.layers.map((l,i)=>`<div class="layer"><span class="swatch" style="background:#${colors[i%colors.length].toString(16).padStart(6,'0')}"></span><span><b>${escapeHtml(l.name)}</b><small>${escapeHtml(l.material||'')}</small></span><strong>${l.thickness} m</strong></div>`).join('');buildModel(p);$('panel').classList.remove('hidden')}
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
async function scan(coords){state.coords=coords;const {latitude:lat,longitude:lon,accuracy}=coords;$('lat').textContent=lat.toFixed(5);$('lon').textContent=lon.toFixed(5);$('accuracy').textContent=`±${Math.round(accuracy||0)} m`;setStatus('Loading geology…');const p=await getProfile(lat,lon);renderPanel(p);setStatus(p===fallbackProfile?'Fallback model':'Public data loaded','live')}
function locate(){return new Promise((resolve,reject)=>navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>resolve(p.coords),reject,{enableHighAccuracy:true,timeout:15000,maximumAge:10000}):reject(new Error('Geolocation unsupported')))}
async function start(){
  try{setStatus('Requesting permissions…');const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});$('camera').srcObject=stream;
    if(typeof DeviceOrientationEvent?.requestPermission==='function'){const result=await DeviceOrientationEvent.requestPermission();if(result!=='granted')throw new Error('Orientation permission denied')}
    addEventListener('deviceorientation',onOrientation,true);const coords=await locate();state.started=true;await scan(coords);$('startBtn').disabled=true;
  }catch(e){console.error(e);setStatus('Permission/data error','error');$('unitName').textContent='Unable to start';$('unitMeta').textContent=`${e.message}. Camera and precise location require HTTPS and user permission.`;$('panel').classList.remove('hidden')}
}
function onOrientation(e){const compass=e.webkitCompassHeading ?? (360-(e.alpha??0)); state.heading=compass;state.tilt=e.beta??0;$('heading').textContent=`${Math.round(compass)}°`}
$('startBtn').addEventListener('click',start);
$('rescanBtn').addEventListener('click',async()=>{try{await scan(await locate())}catch(e){setStatus('Location unavailable','error')}});
$('demoBtn').addEventListener('click',()=>scan({latitude:40.7608,longitude:-111.8910,accuracy:0}));
$('closePanel').addEventListener('click',()=>$('panel').classList.add('hidden'));
$('depth').addEventListener('input',e=>{$('depthValue').textContent=`${e.target.value} m`;buildModel(state.profile||fallbackProfile)});
addEventListener('resize',()=>{camera3d.aspect=innerWidth/innerHeight;camera3d.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn));
