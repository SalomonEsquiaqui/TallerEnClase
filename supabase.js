// supabase.js — enlace sencillo con Supabase
// 1) En index.html, ANTES de script.js, agrega estas dos líneas:
//    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//    <script src="supabase.js"></script>

const SUPABASE_URL = 'https://mtqqjahhufvezyxwvyfi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10cXFqYWhodWZ2ZXp5eHd2eWZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NTg5ODcsImV4cCI6MjEwNjQzNDk4N30.VOkogNNRbs2wXYhTIrLYKKWKqrRe9fXyEssEzrl99eU'; // Dashboard > Project Settings > API > anon public

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- Funciones listas para usar desde script.js ----------

// D2: listar equipos
async function getEquipos() {
  const { data, error } = await db.from('equipo').select('*').order('id_equipo');
  if (error) throw error;
  return data;
}

// Proceso 1.0: registrar solicitud (crea el usuario si no existe)
async function crearSolicitud({ ident, nombre, tipo, equipo, f1, f2 }) {
  const u = await db.from('usuario')
    .upsert({ id_usuario: ident, nombre: nombre || ident, tipo_usuario: tipo });
  if (u.error) throw u.error;
  const { data, error } = await db.from('solicitud')
    .insert({ id_usuario: ident, id_equipo: equipo, fecha_prestamo: f1, fecha_devolucion: f2 })
    .select().single();
  if (error) throw error;
  return data;
}

async function getSolicitudes() {
  const { data, error } = await db.from('solicitud').select('*').order('id_solicitud');
  if (error) throw error;
  return data;
}

// Proceso 2.0: aprobar (verifica vencidos y disponibilidad)
async function aprobarSolicitud(s) {
  const hoy = new Date().toISOString().slice(0, 10);
  const venc = await db.from('v_prestamos_vencidos').select('id_usuario').eq('id_usuario', s.id_usuario);
  if (venc.data && venc.data.length) throw new Error('El usuario tiene préstamos vencidos');
  const eq = await db.from('equipo').select('estado').eq('id_equipo', s.id_equipo).single();
  if (eq.data.estado !== 'DISPONIBLE') throw new Error('Equipo no disponible');
  await db.from('solicitud').update({ estado: 'APROBADA' }).eq('id_solicitud', s.id_solicitud);
  await db.from('equipo').update({ estado: 'PRESTADO' }).eq('id_equipo', s.id_equipo);
  const { data, error } = await db.from('prestamo').insert({ id_solicitud: s.id_solicitud }).select().single();
  if (error) throw error;
  return data; // data.id_prestamo = comprobante
}

// Proceso 3.0: devolución (con o sin daño)
async function registrarDevolucion(s, conDano, descripcion = 'Daño reportado') {
  const p = await db.from('prestamo')
    .update({ fecha_devolucion_real: new Date().toISOString(), estado_devolucion: conDano ? 'CON_DANO' : 'BUEN_ESTADO' })
    .eq('id_solicitud', s.id_solicitud).select().single();
  await db.from('equipo').update({ estado: conDano ? 'EN_MANTENIMIENTO' : 'DISPONIBLE' }).eq('id_equipo', s.id_equipo);
  if (conDano) await db.from('novedad_mantenimiento').insert({
    id_prestamo: p.data.id_prestamo, id_equipo: s.id_equipo, descripcion,
    fecha_reporte: new Date().toISOString().slice(0, 10) });
}

// Proceso 4.0: equipo reparado
async function marcarReparado(id_equipo) {
  await db.from('novedad_mantenimiento').update({ fecha_reparado: new Date().toISOString().slice(0, 10) })
    .eq('id_equipo', id_equipo).is('fecha_reparado', null);
  await db.from('equipo').update({ estado: 'DISPONIBLE' }).eq('id_equipo', id_equipo);
}

// Proceso 5.0: informes
const informeVencidos = () => db.from('v_prestamos_vencidos').select('*');
const informeMasUsados = () => db.from('v_equipos_mas_usados').select('*');
const informeMantenimiento = () => db.from('v_equipos_en_mantenimiento').select('*');
