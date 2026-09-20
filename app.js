import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.167.1/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.167.1/examples/jsm/controls/OrbitControls.js';

const $=id=>document.getElementById(id);
const state={coords:null,profile:null,heading:0,tilt:0,full3d:false};
const palette=[0x48dfca,0xe9b66d,0xd77b59,0x8a78d4,0x526e8a,0x91c987];
const fallbackProfile={source:'Conceptual fallback',name:'Conceptual local cutaway',meta:'Public geology was unavailable, so these layers are illustrative only.',layers:[{name:'Surface soil / fill',material:'Unverified local cover',thickness:3},{name:'Weathered zone',material:'Conceptual transition',thickness:12},{name:'Bedrock',material:'Professional survey required',thickness:40}]};

const renderer=new THREE.WebGLRenderer({canvas:$('scene'),alpha:true,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight); renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
const cam=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.1,500); cam.position.set(11,8,15);
const controls=new OrbitControls(cam,renderer.domElement); controls.enableDamping=true; controls.target.set(0,-2,0); controls.minDistance=8; controls.maxDistance=35; controls.enabled=false;
scene.add(new THREE.HemisphereLight(0xcaf5ff,0x25160f,2.25));
const sun=new THREE.DirectionalLight(0xffffff,3.1); sun.position.set(9,14,10); sun.castShadow=true; scene.add(sun);
const rim=new THREE.DirectionalLight(0x52dfff,1.7); rim.position.set(-10,3,-8); scene.add(rim);
const model=new THREE.Group(); model.rotation.y=-.32; scene.add(model);
const labels=document.createElement('div'); labels.className='threeLabels'; document.body.appendChild(labels);

function clearModel(){while(model.children.length){const o=model.children.pop();o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose()} labels.innerHTML=''}
function makeText(text,color){const c=document.createElement('canvas');c.width=512;c.height=96;const x=c.getContext('2d');x.fillStyle='rgba(3,14,24,.82)';x.roundRect(4,4,504,88,18);x.fill();x.strokeStyle=color;x.lineWidth=3;x.stroke();x.fillStyle='#eefaff';x.font='700 28px system-ui';x.fillText(text.slice(0,30),24,58);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false});const s=new THREE.Sprite(m);s.scale.set(4.7,.88,1);return s}
function buildModel(profile){
 clearModel(); const data=profile?.layers?.length?profile.layers:fallbackProfile.layers; const maxDepth=+$('depth').value; const total=data.reduce((a,l)=>a+(+l.thickness||10),0); let top=2.4;
 // translucent ground plane with excavation opening
 const ground=new THREE.Mesh(new THREE.BoxGeometry(15,.35,11),new THREE.MeshStandardMaterial({color:0x314b3b,roughness:.95,transparent:true,opacity:.78}));ground.position.y=top+.18;ground.receiveShadow=true;model.add(ground);
 const ring=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(11,.08,8)),new THREE.LineBasicMaterial({color:0x9ff4ff,transparent:true,opacity:.9}));ring.position.y=top+.42;model.add(ring);
 data.forEach((l,i)=>{
   const h=Math.max(1,(+l.thickness||10)/total*10*(maxDepth/55));
   const geo=new THREE.BoxGeometry(10,h,7.2,1,1,1); const mat=new THREE.MeshStandardMaterial({color:palette[i%palette.length],roughness:.68,metalness:.04,transparent:true,opacity:.84});
   const mesh=new THREE.Mesh(geo,mat);mesh.position.y=top-h/2-.15;mesh.castShadow=true;mesh.receiveShadow=true;model.add(mesh);
   const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:0xd8fbff,transparent:true,opacity:.62}));edge.position.copy(mesh.position);model.add(edge);
   const slice=new THREE.Mesh(new THREE.PlaneGeometry(9.65,h*.88),new THREE.MeshBasicMaterial({color:palette[i%palette.length],transparent:true,opacity:.28,side:THREE.DoubleSide}));slice.position.set(0,mesh.position.y,3.64);model.add(slice);
   const tag=makeText(`${i+1}. ${l.name}`,'#7ce1ff');tag.position.set(6.7,mesh.position.y,2.4);model.add(tag); top-=h+.12;
 });
 const base=new THREE.Mesh(new THREE.CylinderGeometry(.28,.38,13,24),new THREE.MeshStandardMaterial({color:0xffcf5a,emissive:0x5a3b00}));base.position.set(-5.8,-3.5,4);model.add(base);
 cam.position.set(12,8,16);controls.target.set(0,-2.2,0);controls.update();
}
function animate(){requestAnimationFrame(animate);if(!state.full3d){const target=-.32+(state.heading*Math.PI/180)*.035;model.rotation.y+=(target-model.rotation.y)*.035;model.rotation.x+=(((state.tilt-45)*Math.PI/180)*.025-model.rotation.x)*.03}else controls.update();renderer.render(scene,cam)}
animate();
function status(t,k=''){$('statusPill').textContent=t;$('statusPill').className=`pill ${k}`}
function normalize(j){const root=j?.success?.data??j?.success??j?.data??j;const rows=Array.isArray(root)?root:(root?.features||[]);const p=rows[0]?.properties??rows[0]??{};const lith=p.lith||p.lithology||p.unit_name||p.name||p.strat_name;if(!lith)return null;const names=String(lith).split(/[;,/]/).map(x=>x.trim()).filter(Boolean).slice(0,5);return{source:'Macrostrat public API',name:p.unit_name||p.name||names[0],meta:[p.age||p.interval_name,`Mapped lithology: ${lith}`].filter(Boolean).join(' · '),layers:(names.length?names:[String(lith)]).map((n,i)=>({name:n,material:i?'Conceptual continuation':'Mapped surface geology',thickness:[5,11,18,27,35][i]}))}}
async function profile(lat,lon){for(const u of [`https://macrostrat.org/api/v2/geologic_units/map?lat=${lat}&lng=${lon}`,`https://macrostrat.org/api/v2/geologic_units/map?lat=${lat}&lon=${lon}`,`https://macrostrat.org/api/v2/mobile/map_query_v2?lat=${lat}&lng=${lon}`]){try{const r=await fetch(u);if(r.ok){const p=normalize(await r.json());if(p)return p}}catch(e){console.warn(e)}}return fallbackProfile}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function panel(p){state.profile=p;$('unitName').textContent=p.name;$('unitMeta').textContent=`${p.meta} · Source: ${p.source}`;$('layers').innerHTML=p.layers.map((l,i)=>`<div class="layer"><span class="swatch" style="background:#${palette[i%palette.length].toString(16).padStart(6,'0')}"></span><span><b>${esc(l.name)}</b><small>${esc(l.material)}</small></span><strong>${l.thickness} m</strong></div>`).join('');buildModel(p);$('panel').classList.remove('hidden')}
async function scan(c){state.coords=c;const{latitude,longitude,accuracy}=c;$('lat').textContent=latitude.toFixed(5);$('lon').textContent=longitude.toFixed(5);$('accuracy').textContent=`±${Math.round(accuracy||0)} m`;status('Building 3D cutaway…');const p=await profile(latitude,longitude);panel(p);status(p===fallbackProfile?'3D fallback active':'3D geology active','live')}
function locate(){return new Promise((ok,no)=>navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>ok(p.coords),no,{enableHighAccuracy:true,timeout:15000,maximumAge:10000}):no(new Error('Geolocation unsupported')))}
function orient(e){const h=e.webkitCompassHeading??(360-(e.alpha??0));state.heading=h;state.tilt=e.beta??0;$('heading').textContent=`${Math.round(h)}°`}
async function start(){try{status('Requesting permissions…');$('camera').srcObject=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});if(typeof DeviceOrientationEvent?.requestPermission==='function'&&await DeviceOrientationEvent.requestPermission()!=='granted')throw Error('Orientation permission denied');addEventListener('deviceorientation',orient,true);await scan(await locate());$('startBtn').disabled=true}catch(e){status('Permission error','error');$('unitName').textContent='Unable to start';$('unitMeta').textContent=`${e.message}. Use the HTTPS GitHub Pages link and allow camera and location.`}}
function toggle3d(){state.full3d=!state.full3d;document.body.classList.toggle('full3d',state.full3d);controls.enabled=state.full3d;$('viewBtn').textContent=state.full3d?'Return to AR':'3D full view';$('viewBadge').textContent=state.full3d?'INTERACTIVE 3D VIEW':'3D CUTAWAY ACTIVE'}
$('startBtn').onclick=start;$('rescanBtn').onclick=async()=>{try{await scan(await locate())}catch{status('Location unavailable','error')}};$('demoBtn').onclick=()=>scan({latitude:40.7608,longitude:-111.8910,accuracy:0});$('viewBtn').onclick=toggle3d;$('resetBtn').onclick=()=>{cam.position.set(12,8,16);controls.target.set(0,-2,0);controls.update()};$('closePanel').onclick=()=>$('panel').classList.add('hidden');$('depth').oninput=e=>{$('depthValue').textContent=`${e.target.value} m`;buildModel(state.profile||fallbackProfile)};
addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});buildModel(fallbackProfile);if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn));
