import { cases, run } from './math.mjs';
import { browserApi } from './store-browser.mjs';

const scenarioLabels = { normal: 'Normal', estres: 'Estrés', mal: 'Mal condicionado' };
const caseDesign = {
  detencion: { name: 'Detención', title: 'Detención de emergencia', icon: 'stop', bg: '#e4efdf', fg: '#305e3b', methods: 'RK2 / RK4 · Integración · Raíces', quantity: 'Distancia de frenado' },
  deterioro: { name: 'Deterioro', title: 'Deterioro y mantenimiento', icon: 'gear', bg: '#f7ebdb', fg: '#925333', methods: 'Sistemas lineales · Raíces', quantity: 'Tiempo hasta el umbral' },
  viento: { name: 'Oscilaciones', title: 'Oscilaciones por viento', icon: 'wind', bg: '#e1ecec', fg: '#27606a', methods: 'RK2 / RK4 · Integración', quantity: 'Magnitud de oscilación' },
  sensores: { name: 'Sensores', title: 'Reconstrucción de sensores', icon: 'signal', bg: '#eeebf3', fg: '#644d82', methods: 'Lagrange · Newton · Spline cúbico', quantity: 'Error en puntos ocultos' }
};
const paths = {
  overview: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  compare: '<path d="M4 20h16M7 16V9m5 7V4m5 12V7"/>',
  history: '<path d="M3 11a9 9 0 1 1 2 7M3 6v5h5m4-4v5l3 2"/>',
  stop: '<circle cx="12" cy="12" r="8.5"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
  gear: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.7"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/>',
  wind: '<path d="M3 8h13a2.5 2.5 0 1 0-2.5-2.5M3 12h16a2 2 0 1 1-2 2M3 16h8a2 2 0 1 1-2 2"/>',
  signal: '<path d="M3 17c3 0 4-11 7-11s3 10 6 10 3-8 5-8"/><circle cx="3" cy="17" r="1.25" fill="currentColor"/><circle cx="10" cy="6" r="1.25" fill="currentColor"/><circle cx="16" cy="16" r="1.25" fill="currentColor"/>',
  play: '<path d="m8 5 12 7-12 7z" fill="currentColor" stroke="none"/>',
  save: '<path d="M5 4h12l3 3v13H4V4zM8 4v6h8V4M8 20v-6h8v6"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 15v5h16v-5"/>'
};
const main = document.querySelector('#main');
const navigation = document.querySelector('#navigation');
const menuToggle = document.querySelector('#menu-toggle');
const toast = document.querySelector('#toast');
const breadcrumb = document.querySelector('#breadcrumb');
const caseMap = new Map(cases.map(info => [info.id, info]));
const colors = ['#23654a','#ac532c','#245889','#795595','#966513','#507d89','#994e70'];
let toastTimer, renderVersion = 0, currentResult, currentOverrides, tracePage = 0, traceMethod = 0;
let comparison;

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
}
function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? ''}</svg>`;
}
function number(value, digits = 6) {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return '[ ' + value.map(item => number(item, digits)).join(' · ') + ' ]';
  if (typeof value !== 'number') return String(value);
  if (!Number.isFinite(value)) return '—';
  if (value && (Math.abs(value) < .001 || Math.abs(value) >= 1e6)) return value.toExponential(digits > 4 ? 3 : 1);
  return new Intl.NumberFormat('es-BO', { maximumSignificantDigits: digits, useGrouping: false }).format(value);
}
function val(value, digits) { return esc(number(value, digits)); }
function prettify(key) {
  return key.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' ').replace(/^./, c => c.toUpperCase());
}
function notify(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4500);
}
function navigateItems(active) {
  const link = (id, name, symbol) => `<a class="nav-link" href="#${id}" ${active === id ? 'aria-current="page"' : ''}>${icon(symbol)}${name}</a>`;
  navigation.innerHTML = `<div class="nav-label">LABORATORIO</div>${link('inicio','Panel general','overview')}${link('comparar','Comparar escenarios','compare')}${link('historial','Historial','history')}
    <div class="nav-label">CASOS DE ESTUDIO</div>${cases.map(c => link(c.id, caseDesign[c.id].name, caseDesign[c.id].icon)).join('')}`;
}
function caseIcon(id) {
  const design = caseDesign[id];
  return `<span class="case-symbol" style="--icon-bg:${design.bg};--icon-ink:${design.fg}">${icon(design.icon)}</span>`;
}
function titleBlock(eyebrow, title, text, action = '') {
  return `<div class="page-heading"><div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1><p>${esc(text)}</p></div>${action}</div>`;
}

const heroArt = `<svg class="hero-art" viewBox="0 0 670 340" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs><pattern id="hero-grid" width="35" height="35" patternUnits="userSpaceOnUse"><path d="M0 35V0h35" fill="none" stroke="#93b7a6" stroke-opacity=".13"/></pattern><linearGradient id="hero-fade"><stop stop-color="#15332e"/><stop offset=".42" stop-color="#15332e" stop-opacity="0"/></linearGradient></defs>
  <rect width="670" height="340" fill="url(#hero-grid)"/>
  <g fill="none" stroke="#6f9b83" stroke-opacity=".37">
    <path d="M-30 289c89-51 140-104 218-79s93 62 155 45 107-119 186-128 128 37 180 73"/>
    <path d="M-30 309c89-51 140-104 218-79s93 62 155 45 107-119 186-128 128 37 180 73"/>
    <path d="M-30 329c89-51 140-104 218-79s93 62 155 45 107-119 186-128 128 37 180 73"/>
    <path d="M-30 349c89-51 140-104 218-79s93 62 155 45 107-119 186-128 128 37 180 73"/>
  </g>
  <path d="M109 119Q379 166 698 23" fill="none" stroke="#bce2aa" stroke-width="2"/>
  <path d="M109 126Q379 173 698 30" fill="none" stroke="#7caf96" stroke-width="1"/>
  <g transform="translate(449 110) rotate(-11)" stroke-linejoin="round">
    <path d="M0-4v25m-7-24h14" stroke="#c9edb6" stroke-width="2" fill="none"/>
    <path d="M-41 32q0-13 13-13h56q13 0 13 13v42q0 8-8 8h-66q-8 0-8-8z" fill="#c9edb6" stroke="#d7f1c9" stroke-width="2"/>
    <path d="M-32 31h64v31h-64zM0 31v31" fill="#214638" stroke="#42735a" stroke-width="2"/>
    <path d="M-29 70h58" stroke="#558a69" stroke-width="2"/>
  </g>
  <circle cx="449" cy="109" r="5" fill="#e6b779"/><circle cx="449" cy="109" r="13" fill="none" stroke="#e6b779" stroke-opacity=".6"/>
  <path d="M477 103h92l18-18h36" fill="none" stroke="#abbead" stroke-dasharray="3 5"/>
  <text x="551" y="77" fill="#c8dfd2" font-size="11" letter-spacing="2" font-family="monospace">CABINA</text>
  <path d="M570 251v45h61" fill="none" stroke="#8cab99" stroke-width="1"/>
  <text x="620" y="285" fill="#9db9aa" font-size="12" font-family="monospace">t</text>
  <text x="580" y="256" fill="#9db9aa" font-size="12" font-family="monospace">x</text>
  <rect width="670" height="340" fill="url(#hero-fade)"/>
</svg>`;

function showHome() {
  main.innerHTML = `<section class="hero" aria-labelledby="home-title">${heroArt}<div class="hero-copy">
    <div class="eyebrow">DESAFÍO INTEGRADOR · INF 373</div>
    <h1 id="home-title">SIMTELE<span>-RISK</span></h1>
    <p>Simula un sistema de transporte por cable, compara métodos numéricos y verifica cómo cambia la solución ante una perturbación.</p>
    <div class="hero-meta" style="margin-top:14px"><b>Carlos Angel Moya Choque y Dante Pabel Churata Apaza</b><span class="meta-divider"></span> Desarrollo de Software</div><div class="hero-actions"><a class="button accent" href="#detencion">${icon('play')} Iniciar experimento</a><a class="button ghost" href="#comparar">Comparar escenarios ↗</a></div>
  </div></section>
  <section class="section" aria-labelledby="cases-title"><div class="section-heading"><div><div class="eyebrow">ENTORNO DE SIMULACIÓN</div><h2 id="cases-title">Casos de estudio</h2></div><div class="hero-meta" style="color:var(--muted)">4 módulos <span class="meta-divider"></span> 12 escenarios</div></div>
  <div class="case-grid">${cases.map((c, i) => `<a href="#${c.id}" class="case-card">${caseIcon(c.id)}<div><div class="card-index">CASO 0${i + 1}</div><h3>${caseDesign[c.id].title}</h3><p>${esc(c.question)}</p><span class="case-methods">${caseDesign[c.id].methods}</span></div><span class="card-arrow" aria-hidden="true">↗</span></a>`).join('')}</div></section>`;
}

function rowQuality(result) {
  return result.methods.filter(method => method.converged !== false).length;
}
function mainMetric(result) {
  const ref = result.reference;
  if (result.caseId === 'detencion') return number(ref.detencion_total_m, 4) + ' m hasta detenerse';
  if (result.caseId === 'deterioro') return number(ref.umbral_dias, 4) + ' días hasta el umbral';
  if (result.caseId === 'viento') return number(ref.pico_m_malla_2048, 4) + ' m de pico |x|';
  const rmse = result.methods.map(m => m.value).filter(Number.isFinite);
  return rmse.length ? 'Mejor RMSE ' + number(Math.min(...rmse), 4) : 'Error en puntos ocultos';
}
function showComparison() {
  comparison ??= cases.map(c => ({ c, results: Object.keys(scenarioLabels).map(scenario => run(c.id, scenario)) }));
  main.innerHTML = `${titleBlock('12 EJECUCIONES DE REFERENCIA','Comparar escenarios','Compara las tres condiciones de cada caso con sus parámetros iniciales. Abre una ejecución para inspeccionar sus métodos y errores.')}
    <section class="panel"><h2>Condiciones iniciales</h2><div class="table-scroll"><table>
    <thead><tr><th scope="col">Caso de estudio</th>${Object.values(scenarioLabels).map(s => `<th scope="col">${s}</th>`).join('')}</tr></thead>
    <tbody>${comparison.map(({ c, results }) => `<tr><th scope="row">${caseDesign[c.id].title}</th>${results.map(result => `<td><a href="#${c.id}/${result.scenarioId}" class="overview-link">Ver experimento ↗</a><span class="small-line">${esc(mainMetric(result))}</span><span class="small-line">${rowQuality(result)} de ${result.methods.length} métodos con criterio cumplido</span></td>`).join('')}</tr>`).join('')}</tbody></table></div></section>
    <section class="section case-grid">${comparison.map(({c,results}) => `<article class="panel"><h3>${caseDesign[c.id].title}</h3>${results.map(result => `<details class="data-detail"><summary>${scenarioLabels[result.scenarioId]}</summary><p class="source-note">${esc(result.physicalConclusion)}</p></details>`).join('')}</article>`).join('')}</section>
    <p class="source-note">Una sensibilidad alta significa que cambios pequeños en las entradas pueden producir cambios grandes en la solución. La convergencia describe el comportamiento del algoritmo.</p>`;
}
function caseTemplate(c, scenarioId, params, record) {
  const design = caseDesign[c.id];
  const n = cases.indexOf(c) + 1;
  const verification = record?.verification;
  const savedNote = record ? `<p class="notice">Experimento guardado <strong>#${esc(String(record.id).slice(0,8))}</strong> · ${esc(dateLabel(record.createdAt))}</p>` : '';
  const verificationNote = verification ? `<p class="notice ${verification.matched ? '' : 'warn'}">${verification.matched ? 'Repetición verificada' : 'Diferencia fuera de tolerancia'}. Diferencia máxima ${val(verification.maxDelta)} · tolerancia ${val(verification.tolerance)}.</p>` : '';
  return `<div class="page-heading"><div class="case-heading">${caseIcon(c.id)}<div><div class="eyebrow">CASO 0${n} / 04</div><h1>${design.title}</h1><p>${esc(c.question)}</p></div></div><a href="#comparar" class="button">${icon('compare')} Comparar</a></div>
    ${savedNote}${verificationNote}
    <section class="panel model-panel"><div><h2>Modelo matemático</h2><p class="model-equation">${esc(c.model)}</p></div><div><h2>Supuestos y alcance</h2><p>${esc(c.assumptions)}</p><p class="source-note">Parámetros sintéticos definidos para el ejercicio académico.</p></div></section>
    <section class="section"><div class="section-heading"><div><div class="eyebrow">CONFIGURACIÓN</div><h2>Escenario del experimento</h2></div></div>
    <div class="scenario-group" role="group" aria-label="Escenario">${Object.entries(scenarioLabels).map(([id, label]) => `<button class="scenario-button" type="button" data-scenario="${id}" aria-pressed="${id === scenarioId}"><strong>${label}</strong><span>${esc(c.scenarios[id].description)}</span></button>`).join('')}</div>
    <p class="source-note">${esc(c.scenarios[scenarioId].description)}</p></section>
    <section class="section panel"><h2>Parámetros</h2><form id="parameters">
      <div class="parameters">${c.fields.map(f => `<label class="field" for="parameter-${esc(f.key)}"><div>${esc(f.label)} ${f.unit ? `<span>(${esc(f.unit)})</span>` : ''}</div>
        <input id="parameter-${esc(f.key)}" name="${esc(f.key)}" type="number" value="${esc(params[f.key])}" ${f.min == null ? '' : `min="${esc(f.min)}"`} ${f.max == null ? '' : `max="${esc(f.max)}"`} step="${['steps','maxIter','nodes'].includes(f.key) ? '1' : 'any'}" required>
        ${f.description ? `<small>${esc(f.description)}</small>` : ''}</label>`).join('')}</div>
      <div class="form-bar"><button class="button primary" type="submit">${icon('play')} Ejecutar simulación</button><button class="button" type="button" id="reset-params">Restaurar escenario</button><span class="form-status" id="form-status" role="status"></span></div>
    </form></section>
    <section class="section" id="results" aria-label="Resultados"></section>`;
}

function showCase(caseId, scenarioId, record) {
  const c = caseMap.get(caseId);
  const params = record?.result.params ?? c.scenarios[scenarioId].params;
  main.innerHTML = caseTemplate(c, scenarioId, params, record);
  const form = document.querySelector('#parameters');
  const feedback = document.querySelector('#form-status');
  const setDirty = () => {
    feedback.classList.remove('error-message');
    feedback.textContent = 'Hay cambios pendientes de ejecutar.';
  };
  form.addEventListener('input', setDirty);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const overrides = Object.fromEntries(Array.from(new FormData(form), ([key, value]) => [key, Number(value)]));
    try {
      const result = run(caseId, scenarioId, overrides);
      showResults(result, overrides);
      feedback.classList.remove('error-message');
      feedback.textContent = 'Simulación actualizada.';
    } catch (error) {
      feedback.classList.add('error-message');
      feedback.textContent = error.message;
    }
  });
  document.querySelector('#reset-params').addEventListener('click', () => showCase(caseId, scenarioId));
  for (const button of main.querySelectorAll('[data-scenario]')) {
    button.addEventListener('click', () => {
      const route = `${caseId}/${button.dataset.scenario}`;
      if (location.hash.slice(1) === route) showCase(caseId, button.dataset.scenario);
      else location.hash = route;
    });
  }
  try {
    const result = record?.result ?? run(caseId, scenarioId);
    showResults(result, record ? result.params : {}, record);
  } catch (error) {
    feedback.classList.add('error-message');
    feedback.textContent = error.message;
  }
}

function chartSvg(chart, index, hidden = new Set()) {
  const series = chart.series.map(s => ({
    ...s, points: s.points.map(p => Array.isArray(p) ? p : [p.x, p.y])
  }));
  const points = series.flatMap((s,i) => hidden.has(i) ? [] : s.points).filter(p => p.every(Number.isFinite));
  if (!points.length) return `<figure class="panel chart-panel"><figcaption>${esc(chart.title)}</figcaption><p class="empty">No hay datos graficables en esta ejecución.</p></figure>`;
  let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity;
  for (const [x,y] of points) {
    xmin = Math.min(xmin, x); xmax = Math.max(xmax, x);
    ymin = Math.min(ymin, y); ymax = Math.max(ymax, y);
  }
  if (xmin === xmax) { xmin -= .5; xmax += .5; }
  const pad = (ymax - ymin || Math.abs(ymax) || 1) * .08;
  ymin -= pad; ymax += pad;
  const x0 = 68, y0 = 28, w = 428, h = 166;
  const X = x => x0 + (x-xmin) * w/(xmax-xmin);
  const Y = y => y0 + h - (y-ymin) * h/(ymax-ymin);
  const gridX = Array.from({length:5}, (_, i) => {
    const x = x0 + i*w/4;
    return `<line class="grid" x1="${x}" x2="${x}" y1="${y0}" y2="${y0+h}"/><text x="${x}" y="${y0+h+17}" text-anchor="middle">${val(xmin+i*(xmax-xmin)/4, 3)}</text>`;
  }).join('');
  const gridY = Array.from({length:5}, (_, i) => {
    const y = y0 + i*h/4;
    return `<line class="grid" x1="${x0}" x2="${x0+w}" y1="${y}" y2="${y}"/><text x="${x0-8}" y="${y+4}" text-anchor="end">${val(ymax-i*(ymax-ymin)/4, 3)}</text>`;
  }).join('');
  const lines = series.map((s, i) => {
    if (hidden.has(i)) return "";
    const color = colors[i % colors.length];
    let pen = false;
    let path = '';
    const dots = [];
    for (const [x,y] of s.points) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) { pen = false; continue; }
      const px = X(x).toFixed(2), py = Y(y).toFixed(2);
      path += `${pen ? 'L' : 'M'}${px} ${py}`;
      pen = true;
      if (s.points.length <= 36 || (s.scatter || s.markersOnly)) dots.push(`<circle cx="${px}" cy="${py}" r="3" fill="${color}"><title>${esc(s.label)} · (${val(x)}, ${val(y)})</title></circle>`);
    }
    return `<g aria-label="${esc(s.label)}">${(s.scatter || s.markersOnly) ? '' : `<path d="${path}" fill="none" stroke="${color}" stroke-width="2.2" ${i === 0 ? '' : i % 2 ? 'stroke-dasharray="5 3"' : ''} stroke-linejoin="round"/>`}${dots.join('')}</g>`;
  }).join('');
  return `<figure class="panel chart-panel" data-chart="${index}"><figcaption id="chart-${index}">${esc(chart.title)}</figcaption>
    <svg viewBox="0 0 520 240" class="chart-svg" role="img" aria-labelledby="chart-${index}">
      <title>${esc(chart.title)}</title>${gridX}${gridY}<path class="axis" fill="none" d="M${x0} ${y0}V${y0+h}H${x0+w}"/>${lines}
      <text x="${x0}" y="14">${esc(chart.yLabel)}</text><text x="${x0+w/2}" y="231" text-anchor="middle">${esc(chart.xLabel)}</text>
    </svg><ul class="chart-legend">${series.map((s,i) => `<li><button type="button" class="series-toggle" data-series="${i}" aria-pressed="${!hidden.has(i)}" title="Mostrar u ocultar ${esc(s.label)}"><i style="--series:${colors[i%colors.length]}"></i>${esc(s.label)}</button></li>`).join('')}</ul></figure>`;
}
function detailsMarkup(details) {
  if (details === null || details === undefined) return '';
  if (Array.isArray(details)) return `<pre>${esc(JSON.stringify(details, null, 2))}</pre>`;
  if (typeof details === 'object') return `<dl class="detail-list">${Object.entries(details).map(([key, value]) => `<div><dt>${esc(prettify(key))}</dt><dd>${detailsMarkup(value)}</dd></div>`).join('')}</dl>`;
  return val(details);
}
function methodTable(methods, caseId) {
  return `<div class="table-scroll"><table><thead><tr><th scope="col">Método</th><th scope="col">Aproximación</th><th scope="col">Referencia</th><th scope="col">Error abs.</th><th scope="col">Error rel.</th><th scope="col">Error %</th><th scope="col">Residuo</th><th scope="col">Estado</th></tr></thead><tbody>
    ${methods.map((method, i) => `<tr><td><button class="method-button" type="button" data-method="${i}">${esc(method.name)}</button>${method.settings?.quantity ? `<span class="small-line">${esc(method.settings?.quantity)}${method.settings?.unit ? ` (${esc(method.settings?.unit)})` : ''}</span>` : ''}</td>
      ${[method.value,method.reference,method.errorAbs,method.errorRel,method.errorPct,method.residual].map(v => `<td class="numeric">${val(v)}</td>`).join('')}
      <td><span class="marker ${method.converged === false ? 'warn' : ''}">${method.converged === false ? 'Criterio no alcanzado' : 'Criterio cumplido'}</span><span class="small-line">${method.iterations.length} registros</span></td></tr>`).join('')}
    </tbody></table></div><p class="source-note">— indica que la métrica no aplica o no está definida.  </p>`;
}
function sensitivityTable(sensitivity) {
  return `<div class="table-scroll"><table><thead><tr><th scope="col">Perturbación</th><th scope="col">Cambio en entrada</th><th scope="col">Cambio en salida</th><th scope="col">Amplificación</th></tr></thead>
    <tbody>${sensitivity.map(s => `<tr><th scope="row">${esc(s.label)}</th><td class="numeric">${val(s.deltaInput)} ${esc(s.inputUnit)}</td><td class="numeric">${val(s.deltaOutput)} ${esc(s.outputUnit)}</td><td class="numeric">${val(s.amplification)}${s.norma ? `<span class="small-line">${esc(s.norma)}</span>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
}

function showResults(result, overrides, record) {
  currentResult = result;
  currentOverrides = overrides;
  tracePage = 0; traceMethod = 0;
  const section = document.querySelector('#results');
  section.innerHTML = `<div class="result-head"><div><div class="eyebrow">${scenarioLabels[result.scenarioId]}</div><h2>Resultados</h2><span class="small-line">${caseDesign[result.caseId].title}${record?.verification?.matched ? ' · Repetición verificada' : ''}</span></div><div class="action-bar">
    <button class="button" id="export-result" type="button">${icon('download')} Exportar datos</button>
    ${record ? `<button class="button primary" type="button" id="repeat-current">${icon('play')} Relanzar y verificar</button>` : `<button class="button primary" type="button" id="save-result">${icon('save')} Guardar experimento</button>`}
    </div></div>
    <div class="chart-grid">${result.charts.map((chart,i) => chartSvg(chart,i)).join('')}</div>
    <section class="panel table-panel"><h3>Comparación de métodos</h3>${methodTable(result.methods, result.caseId)}</section>
    <section class="panel table-panel" id="trace-section"><h3>Iteraciones y refinamiento</h3><div class="action-bar method-tools"><label for="trace-method">Método <select id="trace-method">${result.methods.map((m,i) => `<option value="${i}">${esc(m.name)}</option>`).join('')}</select></label></div><div id="trace"></div></section>
    <section class="panel table-panel"><h3>Sensibilidad a perturbaciones</h3>${sensitivityTable(result.sensitivity)}</section>
    <div class="section conclusion-grid"><article class="panel conclusion"><div class="eyebrow">ANÁLISIS DE MÉTODOS</div><h3>Conclusión numérica</h3><p>${esc(result.numericalConclusion)}</p></article>
    <article class="panel conclusion physical"><div class="eyebrow">INTERPRETACIÓN DEL MODELO</div><h3>Conclusión del problema</h3><p>${esc(result.physicalConclusion)}</p></article></div>
    <details class="panel data-detail"><summary>Referencia y evidencia del modelo</summary>${detailsMarkup({referencia: result.reference, ...result.details})}</details>`;
  const hiddenSeries = result.charts.map(() => new Set());
  section.querySelector('.chart-grid').addEventListener('click', event => {
    const button = event.target.closest('[data-series]');
    if (!button) return;
    const figure = button.closest('[data-chart]');
    const index = Number(figure.dataset.chart);
    const series = Number(button.dataset.series);
    const hidden = hiddenSeries[index];
    if (hidden.has(series)) hidden.delete(series);
    else if (hidden.size < result.charts[index].series.length - 1) hidden.add(series);
    else return;
    figure.outerHTML = chartSvg(result.charts[index], index, hidden);
    section.querySelector('[data-chart="' + index + '"] [data-series="' + series + '"]').focus({preventScroll:true});
  });
  const chooser = document.querySelector('#trace-method');
  chooser.addEventListener('change', () => { traceMethod = Number(chooser.value); tracePage = 0; showTrace(); });
  for (const button of section.querySelectorAll('[data-method]')) button.addEventListener('click', () => {
    traceMethod = Number(button.dataset.method); chooser.value = traceMethod; tracePage = 0; showTrace(); chooser.focus();
  });
  document.querySelector('#export-result').addEventListener('click', () => exportResult(record ?? result));
  document.querySelector('#save-result')?.addEventListener('click', saveResult);
  document.querySelector('#repeat-current')?.addEventListener('click', event => repeatRecord(record.id, event.currentTarget));
  showTrace();
}
function showTrace() {
  const method = currentResult.methods[traceMethod];
  const perPage = 12;
  const count = method.iterations.length;
  const start = tracePage * perPage;
  const last = Math.min(count, start + perPage);
  const trace = document.querySelector('#trace');
  trace.innerHTML = `${Object.keys(method.settings ?? {}).length ? `<details class="data-detail"><summary>Configuración y criterio de parada</summary>${detailsMarkup(method.settings)}</details>` : ''}
    <div class="table-scroll data-detail"><table><thead><tr><th scope="col">Registro</th><th scope="col">Aproximación</th><th scope="col">Residuo</th><th scope="col">Error abs.</th><th scope="col">Error rel.</th><th scope="col">Datos del paso</th></tr></thead>
    <tbody>${method.iterations.slice(start,last).map(({n,x,residual,errorAbs,errorRel,...rest}) => `<tr><td>${val(n)}</td><td class="numeric">${val(x)}</td><td class="numeric">${val(residual)}</td><td class="numeric">${val(errorAbs)}</td><td class="numeric">${val(errorRel)}</td><td>${Object.entries(rest).map(([key,value]) => `${esc(prettify(key))} ${val(value)}`).join(' · ') || '—'}</td></tr>`).join('')}</tbody></table></div>
    <div class="action-bar pager"><span>${count ? start+1 : 0}–${last} de ${count}</span><button class="button compact" id="trace-prev" type="button" ${tracePage ? '' : 'disabled'}>Anterior</button><button class="button compact" id="trace-next" type="button" ${last >= count ? 'disabled' : ''}>Siguiente</button></div>`;
  for (const [key, delta] of [['prev',-1],['next',1]]) document.querySelector('#trace-' + key).addEventListener('click', () => {
    tracePage += delta; showTrace();
    const active = document.querySelector('#trace-' + key);
    (active.disabled ? document.querySelector('#trace-method') : active).focus();
  });
}
function exportResult(value) {
  const result = value.result ?? value;
  const file = new Blob([JSON.stringify(value, null, 2)], {type:'application/json'});
  const link = document.createElement('a');
  const url = URL.createObjectURL(file);
  link.href = url;
  link.download = `SIMTELE-${result.caseId}-${result.scenarioId}${value.id ? '-' + value.id : ''}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const api = browserApi;
async function saveResult(event) {
  const button = event.currentTarget;
  const snapshot = currentResult;
  button.disabled = true;
  try {
    const record = await api('', {caseId:snapshot.caseId, scenarioId:snapshot.scenarioId, overrides:currentOverrides});
    notify(`Experimento #${String(record.id).slice(0,8)} guardado en el historial.`);
    if (button.isConnected && currentResult === snapshot) {
      const link = document.createElement('a');
      link.className = 'button';
      link.href = `#registro/${record.id}`;
      link.textContent = `Abrir guardado #${String(record.id).slice(0,8)}`;
      button.replaceWith(link);
    }
  } catch (error) { notify(error.message); button.disabled = false; }
}
function dateLabel(date) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.valueOf()) ? String(date ?? '—') : new Intl.DateTimeFormat('es-BO', {
    dateStyle:'medium', timeStyle:'short', timeZone:'America/La_Paz'
  }).format(parsed);
}
async function showHistory(version) {
  main.innerHTML = `${titleBlock('SQLITE · ESTE NAVEGADOR','Historial de experimentos','Los experimentos se guardan en SQLite dentro de este navegador. Abre uno o relánzalo para comparar sus resultados.')}
    <form class="history-search" id="history-search"><input name="q" type="search" aria-label="Buscar en historial" placeholder="Caso, escenario o número" maxlength="100"><button class="button primary" type="submit">Buscar</button></form><section class="panel" id="history-results" aria-live="polite"><p class="loading">Consultando historial…</p></section>`;
  const form = document.querySelector('#history-search');
  const container = document.querySelector('#history-results');
  let searchVersion = 0;
  async function load(q) {
    const ticket = ++searchVersion;
    container.innerHTML = '<p class="loading">Consultando historial…</p>';
    try {
      const normalized = q.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
      const rows = await api('?q=' + encodeURIComponent(normalized === 'mal condicionado' ? 'mal' : normalized));
      if (version !== renderVersion || searchVersion !== ticket) return;
      if (!rows.length) {
        container.innerHTML = q ? '<p class="empty">No se encontraron experimentos con esa búsqueda.</p>' : '<p class="empty">Todavía no hay experimentos guardados. Ejecuta un caso y usa Guardar experimento.</p><a class="button" href="#detencion">Ir a Detención ↗</a>';
        return;
      }
      container.innerHTML = `<h2>Experimentos guardados</h2><div class="table-scroll"><table><thead><tr><th scope="col">N.º</th><th scope="col">Caso</th><th scope="col">Escenario</th><th scope="col">Fecha · La Paz</th><th scope="col">Métodos</th><th scope="col">Acciones</th></tr></thead>
      <tbody>${rows.map(record => `<tr><td>#${esc(String(record.id).slice(0,8))}</td><td>${esc(caseDesign[record.caseId]?.name ?? record.caseId)}</td><td>${esc(scenarioLabels[record.scenarioId] ?? record.scenarioId)}</td><td>${esc(dateLabel(record.createdAt))}</td><td>${esc(record.methodCount)}</td><td><div class="history-actions"><a class="button compact" href="#registro/${esc(record.id)}">Abrir</a><button type="button" class="button compact" data-repeat="${esc(record.id)}">Relanzar</button></div></td></tr>`).join('')}</tbody></table></div>`;
      for (const button of container.querySelectorAll('[data-repeat]')) button.addEventListener('click', () => repeatRecord(button.dataset.repeat,button));
    } catch (error) {
      if (version === renderVersion && searchVersion === ticket) container.innerHTML = `<p class="notice warn">${esc(error.message)}</p>`;
    }
  }
  form.addEventListener('submit', event => { event.preventDefault(); load(form.elements.q.value.trim()); });
  await load('');
}
let repeatedRecord;
async function repeatRecord(id, button) {
  button.disabled = true;
  const version = renderVersion;
  try {
    const record = await api('/' + encodeURIComponent(id) + '/repetir', {});
    if (version !== renderVersion) {
      notify(`Repetición guardada como #${String(record.id).slice(0,8)}.`);
      return;
    }
    repeatedRecord = record;
    location.hash = 'registro/' + record.id;
  } catch (error) { notify(error.message); button.disabled = false; }
}

async function route() {
  const version = ++renderVersion;
  const [page, arg] = (location.hash.slice(1) || 'inicio').split('/');
  navigation.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
  navigateItems(page === 'registro' ? 'historial' : page);
  breadcrumb.textContent = caseDesign[page]?.name ?? ({ inicio:'Panel general', comparar:'Comparar escenarios', historial:'Historial', registro:'Experimento guardado' })[page] ?? 'Panel general';
  main.setAttribute('aria-busy','true');
  try {
    if (page === 'comparar') showComparison();
    else if (page === 'historial') await showHistory(version);
    else if (page === 'registro' && /^[a-f0-9-]{36}$/.test(arg ?? '')) {
      main.innerHTML = '<p class="loading">Abriendo experimento guardado…</p>';
      const record = String(repeatedRecord?.id) === arg ? repeatedRecord : await api('/' + arg);
      repeatedRecord = null;
      if (version !== renderVersion) return;
      showCase(record.result.caseId,record.result.scenarioId,record);
    } else if (caseMap.has(page)) showCase(page, scenarioLabels[arg] ? arg : 'normal');
    else showHome();
  } catch (error) {
    if (version === renderVersion) main.innerHTML = `<p class="notice warn" role="alert">${esc(error.message)}</p><a class="button" href="#inicio">Volver al panel</a>`;
  } finally {
    if (version === renderVersion) main.removeAttribute('aria-busy');
  }
}
menuToggle.addEventListener('click', () => {
  const open = navigation.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
});
window.addEventListener('hashchange', () => {
  if (location.hash === '#main') return;
  window.scrollTo(0,0);
  route().then(() => main.focus({preventScroll:true}));
});
route();
