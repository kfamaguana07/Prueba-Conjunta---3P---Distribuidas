// Configuración del dashboard. Ajustá la URL del ms-audit según tu entorno.
const AUDIT_API = window.AUDIT_API || 'http://localhost:3002';
const SSE_URL = `${AUDIT_API}/sse/audit`;

const els = {
  status: document.getElementById('sse-status'),
  tbody: document.getElementById('audit-tbody'),
  fEntidad: document.getElementById('f-entidad'),
  fAccion: document.getElementById('f-accion'),
  fUsuario: document.getElementById('f-usuario'),
  fDesde: document.getElementById('f-desde'),
  fHasta: document.getElementById('f-hasta'),
  btnApply: document.getElementById('btn-apply'),
  btnClear: document.getElementById('btn-clear'),
  btnPrev: document.getElementById('btn-prev'),
  btnNext: document.getElementById('btn-next'),
  pagerInfo: document.getElementById('pager-info'),
  detail: document.getElementById('audit-detail'),
  detailJson: document.getElementById('audit-detail-json'),
  btnCloseDetail: document.getElementById('btn-close-detail'),
};

let page = 1;
let total = 0;
const pageSize = 20;
let reconnectTimer = null;

function setStatus(state, label) {
  els.status.dataset.state = state;
  els.status.querySelector('.label').textContent = label;
}

function buildQuery() {
  const params = new URLSearchParams();
  if (els.fEntidad.value) params.set('entidad', els.fEntidad.value);
  if (els.fAccion.value) params.set('accion', els.fAccion.value);
  if (els.fUsuario.value.trim()) {
    const v = els.fUsuario.value.trim();
    if (v.includes('@')) params.set('usuarioEmail', v);
    else params.set('usuarioId', v);
  }
  if (els.fDesde.value) params.set('desde', new Date(els.fDesde.value).toISOString());
  if (els.fHasta.value) params.set('hasta', new Date(els.fHasta.value).toISOString());
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  return params;
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'medium' });
}

function accionClass(accion) {
  return `accion-${accion.toLowerCase()}`;
}

function renderRows(items) {
  els.tbody.innerHTML = '';
  if (!items.length) {
    els.tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#999">Sin eventos</td></tr>';
    return;
  }
  for (const e of items) {
    const tr = document.createElement('tr');
    tr.dataset.json = JSON.stringify(e, null, 2);
    tr.innerHTML = `
      <td>${fmtDate(e.timestamp)}</td>
      <td><span class="pill entidad">${e.entidad}</span></td>
      <td><span class="pill ${accionClass(e.accion)}">${e.accion}</span></td>
      <td>${e.servicio}</td>
      <td>${e.usuarioEmail || e.usuarioId || '—'}</td>
      <td><button class="btn-ghost" style="padding:4px 10px">Ver JSON</button></td>
    `;
    tr.addEventListener('click', () => showDetail(tr.dataset.json));
    els.tbody.appendChild(tr);
  }
}

function updatePager() {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  els.pagerInfo.textContent = `${from}-${to} de ${total}`;
  els.btnPrev.disabled = page <= 1;
  els.btnNext.disabled = page * pageSize >= total;
}

async function fetchAudit() {
  const params = buildQuery();
  try {
    const res = await fetch(`${AUDIT_API}/audit?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    total = data.total;
    renderRows(data.items);
    updatePager();
  } catch (err) {
    console.error('fetchAudit error', err);
    els.tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#C2410C">Error al cargar: ${err.message}</td></tr>`;
  }
}

function showDetail(json) {
  els.detailJson.textContent = json;
  els.detail.hidden = false;
}
function hideDetail() {
  els.detail.hidden = true;
}

function connectSSE() {
  setStatus('connecting', 'Conectando…');
  let es;
  try {
    es = new EventSource(SSE_URL);
  } catch {
    setStatus('disconnected', 'SSE no soportado');
    scheduleReconnect();
    return;
  }
  es.onopen = () => setStatus('connected', 'Conectado');
  es.onmessage = () => {
    // SSE solo es trigger: re-fetch vía REST para mantener consistencia
    fetchAudit();
  };
  es.onerror = () => {
    setStatus('disconnected', 'Desconectado');
    es.close();
    scheduleReconnect();
  };
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connectSSE, 5000);
}

// Eventos de UI
els.btnApply.addEventListener('click', () => { page = 1; fetchAudit(); });
els.btnClear.addEventListener('click', () => {
  els.fEntidad.value = '';
  els.fAccion.value = '';
  els.fUsuario.value = '';
  els.fDesde.value = '';
  els.fHasta.value = '';
  page = 1;
  fetchAudit();
});
els.btnPrev.addEventListener('click', () => { if (page > 1) { page--; fetchAudit(); } });
els.btnNext.addEventListener('click', () => { if (page * pageSize < total) { page++; fetchAudit(); } });
els.btnCloseDetail.addEventListener('click', hideDetail);

// Init
fetchAudit();
connectSSE();
setInterval(fetchAudit, 30000);