// Datos en memoria (ejemplo funcional: simula los almacenes del DFD)
let equipos = [
  {id:1,nombre:'Portátil Lenovo 01',estado:'DISPONIBLE'},
  {id:2,nombre:'Proyector Epson 02',estado:'DISPONIBLE'},
  {id:3,nombre:'Tableta Samsung 03',estado:'DISPONIBLE'},
  {id:4,nombre:'Portátil HP 04',estado:'EN_MANTENIMIENTO'}
];
let solicitudes = [], seq = 1;
const $ = s => document.querySelector(s);
const hoy = new Date().toISOString().slice(0,10);
$('#f1').value = hoy;

function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500)}
const nombreEq = id => equipos.find(e=>e.id==id).nombre;

function render(){
  $('#equipos').innerHTML = equipos.map(e=>`<li>${e.nombre}<span class="tag ${e.estado}">${e.estado.replace('_',' ')}</span></li>`).join('');
  $('#equipo').innerHTML = equipos.filter(e=>e.estado==='DISPONIBLE').map(e=>`<option value="${e.id}">${e.nombre}</option>`).join('');
  $('#solicitudes').innerHTML = solicitudes.length ? solicitudes.map(s=>`
    <li><span>#${s.id} · ${s.ident} (${s.tipo}) · ${nombreEq(s.equipo)} · ${s.f1} → ${s.f2}</span>
    <span class="acts"><span class="tag ${s.estado}">${s.estado}</span>${acciones(s)}</span></li>`).join('')
    : '<li>Aún no hay solicitudes 🙂</li>';
}
function acciones(s){
  if(s.estado==='PENDIENTE') return `<button class="ok" onclick="aprobar(${s.id})">Aprobar</button><button class="warn" onclick="rechazar(${s.id})">Rechazar</button>`;
  if(s.estado==='APROBADA') return `<button class="ok" onclick="devolver(${s.id},false)">Devolver OK</button><button class="warn" onclick="devolver(${s.id},true)">Con daño</button>`;
  return '';
}
$('#btnSolicitar').onclick = () => {
  const ident=$('#ident').value.trim(), f1=$('#f1').value, f2=$('#f2').value, eq=$('#equipo').value;
  if(!ident||!f1||!f2||!eq) return toast('Completa todos los campos');
  if(f2<f1) return toast('La devolución no puede ser antes del préstamo');
  solicitudes.push({id:seq++,ident,tipo:$('#tipo').value,equipo:+eq,f1,f2,estado:'PENDIENTE'});
  toast('Solicitud enviada ✔'); render();
};
window.aprobar = id => { // proceso 2.0: verifica usuario y disponibilidad
  const s=solicitudes.find(x=>x.id==id), e=equipos.find(x=>x.id==s.equipo);
  const vencido = solicitudes.some(x=>x.ident===s.ident && x.estado==='APROBADA' && x.f2<hoy);
  if(vencido) return toast('El usuario tiene préstamos vencidos');
  if(e.estado!=='DISPONIBLE') return toast('Equipo no disponible');
  s.estado='APROBADA'; e.estado='PRESTADO'; toast(`Comprobante #${s.id} generado 🧾`); render();
};
window.rechazar = id => { solicitudes.find(x=>x.id==id).estado='RECHAZADA'; toast('Solicitud rechazada'); render(); };
window.devolver = (id,dano) => { // proceso 3.0
  const s=solicitudes.find(x=>x.id==id), e=equipos.find(x=>x.id==s.equipo);
  s.estado='DEVUELTO'; e.estado = dano?'EN_MANTENIMIENTO':'DISPONIBLE';
  toast(dano?'Notificación enviada a mantenimiento 🔧':'Equipo disponible de nuevo'); render();
};
// mantenimiento: clic en equipo en mantenimiento = reparado (proceso 4.0)
$('#equipos').onclick = e => { const li=e.target.closest('li'); if(!li) return;
  const eq=equipos.find(x=>li.textContent.startsWith(x.nombre));
  if(eq && eq.estado==='EN_MANTENIMIENTO'){eq.estado='DISPONIBLE';toast('Reparado ✔ equipo disponible');render()} };

// cursor + fondo que reacciona
const dot=$('#dot'), ring=$('#ring'); let rx=0,ry=0,mx=0,my=0;
addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;dot.style.left=mx+'px';dot.style.top=my+'px';
  const px=(mx/innerWidth-.5), py=(my/innerHeight-.5);
  document.querySelectorAll('.blob').forEach((b,i)=>b.style.transform=`translate(${px*(i+1)*60}px,${py*(i+1)*60}px)`)});
(function loop(){rx+=(mx-rx)*.15;ry+=(my-ry)*.15;ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(loop)})();
document.addEventListener('mouseover',e=>ring.classList.toggle('hover',!!e.target.closest('button,input,select,li')));
// ripple en botones
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const r=document.createElement('span');
  const d=Math.max(b.offsetWidth,b.offsetHeight),rc=b.getBoundingClientRect();r.className='ripple';
  r.style.cssText=`width:${d}px;height:${d}px;left:${e.clientX-rc.left-d/2}px;top:${e.clientY-rc.top-d/2}px`;b.appendChild(r);setTimeout(()=>r.remove(),600)});
render();
