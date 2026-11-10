const field = (key, label, min, max, step, unit = '') => ({ key, label, min, max, step, unit });
const preset = (description, params) => ({ description, params });

export const cases = [
  {
    id: 'detencion', title: 'Detención de emergencia',
    question: '¿Qué distancia recorre la cabina antes de detenerse?',
    model: 'Durante la reacción: v=v₀. Durante el frenado: x′=v, v′=−(a_f−a_p)−γv. Inicio del frenado: x(0)=0, v(0)=v₀. El cálculo termina en v=0.',
    assumptions: 'Modelo unidimensional. Parámetros y distancia disponible sintéticos. a_p representa una contribución longitudinal que se opone al frenado. La contribución γv es una ampliación del caso constante.',
    fields: [
      field('v0', 'Velocidad inicial', .1, 20, .1, 'm/s'),
      field('reaction', 'Tiempo de reacción', 0, 12, .1, 's'),
      field('brake', 'Acción de frenado', .1, 12, .001, 'm/s²'),
      field('slope', 'Contribución opuesta', 0, 11.99, .001, 'm/s²'),
      field('drag', 'Arrastre lineal γ', 0, 1, .01, 's⁻¹'),
      field('steps', 'Pasos de integración temporal', 4, 256, 1),
      field('available', 'Distancia disponible hipotética', 1, 10000, 1, 'm')
    ],
    scenarios: {
      normal: preset('Frenado constante. Se valida con una solución cuadrática de la posición.', { v0: 5, reaction: .5, brake: 1.35, slope: .15, drag: 0, steps: 40, available: 25 }),
      estres: preset('Mayor velocidad, mayor reacción y frenado dependiente de la velocidad. Malla más gruesa.', { v0: 8, reaction: 1.3, brake: .96, slope: .16, drag: .12, steps: 10, available: 25 }),
      mal: preset('Subexperimento de cancelación: dos contribuciones casi iguales hacen sensible la desaceleración neta.', { v0: 2, reaction: .8, brake: 1.005, slope: 1, drag: 0, steps: 25, available: 25 })
    }
  },
  {
    id: 'deterioro', title: 'Deterioro y mantenimiento',
    question: '¿Cuándo alcanza el indicador el umbral hipotético de inspección?',
    model: 'D(t)=D₀+αt+βt², con t en días. Calibración sintética: z=[D₀,100α,10000β,sesgo]. Resolver A z=b, con A=I−(1−ε)uuᵀ, u=(½,½,½,½)ᵀ y b=A z*. El umbral se obtiene con D(t)−D_umbral=0.',
    assumptions: 'Indicador adimensional y monotónico. Parámetros, sesgo de calibración y umbral sintéticos. A representa una matriz de información regularizada, con tres contrastes bien medidos y un modo común con peso ε. El umbral usa el modelo base conocido para aislar el error de raíces del error de calibración.',
    fields: [
      field('d0', 'Deterioro inicial', .01, .9, .001),
      field('alpha', 'Tasa lineal α', .00001, .05, .00001, 'día⁻¹'),
      field('beta', 'Tasa cuadrática β', 0, .002, .000001, 'día⁻²'),
      field('threshold', 'Umbral de inspección', .05, 2, .001),
      field('epsilon', 'Peso del modo débil ε', .00000001, 1, .00000001),
      field('delay', 'Retraso hipotético tras el umbral', 0, 100, 1, 'días'),
      field('maxIter', 'Máximo de iteraciones lineales', 10, 1000, 1)
    ],
    scenarios: {
      normal: preset('Deterioro gradual y calibración bien identificada.', { d0: .15, alpha: .003, beta: .000035, threshold: .7, epsilon: .55, delay: 7, maxIter: 140 }),
      estres: preset('Tasas de deterioro mayores y retraso de inspección más prolongado.', { d0: .21, alpha: .006, beta: .000065, threshold: .7, epsilon: .16, delay: 18, maxIter: 140 }),
      mal: preset('Subexperimento de calibración: un modo de los coeficientes tiene escasa información (ε=10⁻⁷).', { d0: .15, alpha: .003, beta: .000035, threshold: .7, epsilon: 1e-7, delay: 7, maxIter: 140 })
    }
  },
  {
    id: 'viento', title: 'Oscilaciones por viento',
    question: '¿Cómo cambia la trayectoria ante fuerza periódica y amortiguamiento?',
    model: 'x′=v, m v′=F₀ cos(ωt)−cv−kx, con x(0)=x₀ y v(0)=v₀. Exposición acumulada J=∫x(t)²dt (m²·s).',
    assumptions: 'Oscilador lineal de un grado de libertad, en régimen subamortiguado. Fuerza, masa efectiva, rigidez, amortiguamiento y estado inicial sintéticos. J es un indicador de exposición, no una energía.',
    fields: [
      field('mass', 'Masa efectiva', 100, 5000, 1, 'kg'),
      field('stiffness', 'Rigidez', 100, 10000, 1, 'N/m'),
      field('damping', 'Amortiguamiento', .1, 2000, .1, 'N·s/m'),
      field('force', 'Amplitud de fuerza', 0, 2000, .1, 'N'),
      field('omega', 'Frecuencia angular', .01, 8, .001, 'rad/s'),
      field('x0', 'Desplazamiento inicial', -2, 2, .01, 'm'),
      field('v0', 'Velocidad inicial', -3, 3, .01, 'm/s'),
      field('duration', 'Horizonte temporal', 1, 60, .5, 's'),
      field('steps', 'Pasos temporales', 4, 512, 1)
    ],
    scenarios: {
      normal: preset('Vibración libre subamortiguada, F₀=0, para validar RK2/RK4.', { mass: 1000, stiffness: 1600, damping: 300, force: 0, omega: .9, x0: .3, v0: 0, duration: 16, steps: 96 }),
      estres: preset('Excitación periódica y amortiguamiento reducido; malla más gruesa.', { mass: 1000, stiffness: 1600, damping: 150, force: 260, omega: 1.15, x0: .3, v0: 0, duration: 22, steps: 44 }),
      mal: preset('Subexperimento de sensibilidad del modelo: frecuencia próxima a la natural y amortiguamiento muy bajo.', { mass: 1000, stiffness: 1000, damping: 2, force: 10, omega: 1.002, x0: 0, v0: 0, duration: 40, steps: 160 })
    }
  },
  {
    id: 'sensores', title: 'Reconstrucción de sensores',
    question: '¿Cómo afecta el ruido y la distribución de nodos al rellenar registros faltantes?',
    model: 'Señal sintética y(t)=sin(t), 0≤t≤6 s. Nodos tᵢ=6(i/(n−1))ᵖ. Ruido de medición determinista yᵢ=sin(tᵢ)+σ cos(2,3 i). Pruebas: puntos medios de los intervalos, excluidos del ajuste.',
    assumptions: 'Señal adimensional y tiempos conocidos. Nodos, nivel de ruido y puntos ocultos sintéticos. El spline es cúbico natural (segunda derivada nula en los extremos). Se interpola dentro del dominio.',
    fields: [
      field('nodes', 'Número de nodos', 4, 14, 1),
      field('power', 'Exponente de distribución p', .6, 3, .1),
      field('noise', 'Amplitud de ruido σ', 0, .2, .0001)
    ],
    scenarios: {
      normal: preset('Nodos uniformes y mediciones limpias.', { nodes: 7, power: 1, noise: 0 }),
      estres: preset('Ruido de medición y más nodos, todavía uniformes.', { nodes: 11, power: 1, noise: .025 }),
      mal: preset('Subexperimento de interpolación: concentración de nodos al comienzo y grandes huecos al final.', { nodes: 12, power: 2.5, noise: .0002 })
    }
  }
];

const dot = (u, v) => u.reduce((s, x, i) => s + x * v[i], 0);
const norm = v => Math.hypot(...v);
const maxAbs = v => Math.max(...v.map(Math.abs));
const sub = (u, v) => u.map((x, i) => x - v[i]);
const matVec = (A, x) => A.map(row => dot(row, x));
const sequence = (n, f) => Array.from({ length: n }, (_, i) => f(i));
const format = x => Number(x.toPrecision(5)).toLocaleString('es-BO', { maximumFractionDigits: 12 });
const byGrid = (f, a, b, n = 160) => sequence(n + 1, i => {
  const t = a + (b - a) * i / n;
  return [t, f(t)];
});
const chart = (title, xLabel, yLabel, series) => ({ title, xLabel, yLabel, series });
const series = (label, points) => ({ label, points });

function error(x, exact) {
  const errorAbs = Array.isArray(x) ? norm(sub(x, exact)) : Math.abs(x - exact);
  const denominator = Array.isArray(exact) ? norm(exact) : Math.abs(exact);
  const errorRel = denominator > 0 ? errorAbs / denominator : null;
  return { errorAbs, errorRel, errorPct: errorRel === null ? null : 100 * errorRel };
}

function row(n, x, exact, residual, extra = {}) {
  return { n, x, residual, ...error(x, exact), ...extra };
}

function method(name, value, reference, residual, converged, iterations, settings) {
  return { name, value, reference, ...error(value, reference), residual, converged, iterations, settings };
}

function sensitivity(label, deltaInput, deltaOutput, referenceInput, referenceOutput, extra = {}) {
  const amplification = referenceInput && referenceOutput && deltaInput
    ? (deltaOutput / Math.abs(referenceOutput)) / (deltaInput / Math.abs(referenceInput))
    : null;
  return { label, deltaInput, deltaOutput, amplification, ...extra };
}

function positiveRoot(f, derivative, exact, end, unit, residualUnit = 'adimensional') {
  const tolerance = 1e-11;
  const maxIter = 120;
  const tolX = tolerance * end;
  const tolF = tolerance * Math.abs(f(0));
  const methods = [];
  for (const name of ['Bisección', 'Newton-Raphson', 'Secante']) {
    let a = 0, b = end, x0 = 0, x1 = end / 2;
    const settings = { quantity: 'Instante de cruce', unit, residualUnit, tolerance, tolX, tolF, maxIter,
      interval: [0, end], seeds: name === 'Bisección' ? null : name === 'Secante' ? [x0, x1] : [x1],
      stop: 'Residuo ≤ tolerancia de f, o cambio/semiancho ≤ tolerancia de t con residuo ≤ 10× tolerancia de f.' };
    const iterations = [];
    let value = x1, converged = false;
    for (let i = 1; i <= maxIter; i++) {
      let x, gap;
      if (name === 'Bisección') {
        x = a + (b - a) / 2;
        gap = (b - a) / 2;
      } else if (name === 'Newton-Raphson') {
        const d = derivative(x1);
        if (!Number.isFinite(d) || d === 0) break;
        x = x1 - f(x1) / d;
        gap = Math.abs(x - x1);
      } else {
        const d = f(x1) - f(x0);
        if (!Number.isFinite(d) || d === 0) break;
        x = x1 - f(x1) * (x1 - x0) / d;
        gap = Math.abs(x - x1);
      }
      const residual = Math.abs(f(x));
      if (!Number.isFinite(x) || !Number.isFinite(residual)) break;
      value = x;
      iterations.push(row(i, x, exact, residual, { cambio_o_semiancho: gap }));
      if (residual <= tolF || (gap <= tolX && residual <= 10 * tolF)) { converged = true; break; }
      if (name === 'Bisección') {
        if (Math.sign(f(a)) === Math.sign(f(x))) a = x;
        else b = x;
      } else [x0, x1] = [x1, x];
    }
    methods.push(method(name, value, exact, Math.abs(f(value)), converged, iterations, settings));
  }
  return methods;
}

function quadrature(f, a, b, exact, unit, start = 4) {
  function composite(n, simpson) {
    const h = (b - a) / n;
    let sum = f(a) + f(b);
    for (let i = 1; i < n; i++) sum += (simpson ? i % 2 ? 4 : 2 : 2) * f(a + i * h);
    return sum * h / (simpson ? 3 : 2);
  }
  const tol = 1e-8 * Math.max(1, Math.abs(exact));
  const methods = [];
  for (const name of ['Trapecio compuesto', 'Simpson 1/3 compuesto', 'Romberg']) {
    const iterations = [], table = [];
    let last = null;
    for (let k = 0; k < 8; k++) {
      const n = start * 2 ** k;
      let value = composite(n, name === 'Simpson 1/3 compuesto');
      if (name === 'Romberg') {
        const r = [value];
        for (let j = 1; j <= k; j++) r.push(r[j - 1] + (r[j - 1] - table[k - 1][j - 1]) / (4 ** j - 1));
        table.push(r);
        value = r[k];
      }
      const delta = last === null ? null : Math.abs(value - last);
      iterations.push(row(k + 1, value, exact, delta, { subintervalos: n, paso: (b - a) / n }));
      last = value;
    }
    const r = iterations.at(-1);
    methods.push(method(name, r.x, exact, r.residual, r.residual <= tol, iterations, {
      quantity: 'Integral acumulada', unit, tolerance: tol, step: r.paso, maxIter: 8,
      stop: 'Ocho niveles de refinamiento; se verifica |Qₖ−Qₖ₋₁| ≤ tolerancia. Residual = cambio entre niveles.'
    }));
  }
  return methods;
}

function stabilityMagnitude(h, eigenvalue, order) {
  const [real, imag] = eigenvalue.map(value => h * value);
  let a = 1, b = 0, re = 1, im = 0;
  for (let j = 1; j <= order; j++) {
    [a, b] = [(a * real - b * imag) / j, (a * imag + b * real) / j];
    re += a;
    im += b;
  }
  return Math.hypot(re, im);
}

function rungeKutta(f, reference, initial, end, steps, eigenvalue) {
  const h = end / steps;
  return ['RK2 (punto medio)', 'RK4 clásico'].map((name, index) => {
    let state = initial;
    const iterations = [row(0, initial[0], reference(0)[0], 0, { t: 0, velocidad: initial[1], error_velocidad: 0, defecto_velocidad: 0 })];
    const axpy = (x, k, scale) => x.map((v, i) => v + scale * k[i]);
    for (let i = 0; i < steps; i++) {
      const t = i * h, k1 = f(t, state), k2 = f(t + h / 2, axpy(state, k1, h / 2));
      let next;
      if (index === 0) next = axpy(state, k2, h);
      else {
        const k3 = f(t + h / 2, axpy(state, k2, h / 2));
        const k4 = f(t + h, axpy(state, k3, h));
        next = state.map((v, j) => v + h * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]) / 6);
      }
      const finalRate = f(t + h, next), exact = reference(t + h);
      const defect = next.map((x, j) => Math.abs(x - state[j] - h * (k1[j] + finalRate[j]) / 2));
      iterations.push(row(i + 1, next[0], exact[0], defect[0], {
        t: t + h, velocidad: next[1], error_velocidad: Math.abs(next[1] - exact[1]), defecto_velocidad: defect[1]
      }));
      state = next;
    }
    const last = iterations.at(-1);
    const peakError = Math.max(...iterations.map(r => r.errorAbs));
    const peakReference = Math.max(...iterations.map(r => Math.abs(reference(r.t)[0])));
    const stability = stabilityMagnitude(h, eigenvalue, index === 0 ? 2 : 4);
    const reasonable = peakError <= Math.max(.001, peakReference * .1);
    return method(name, last.x, reference(end)[0], last.residual, reasonable, iterations, {
      quantity: 'Posición al final del intervalo', unit: 'm', step: h, maxIter: steps, tolerance: Math.max(.001, peakReference * .1),
      stop: 'Malla fija hasta el horizonte. Indicador: error máximo de x ≤ 10% del máximo |x de referencia| (piso 1 mm). Residual = defecto cinemático de trapecio del último paso.',
      maxErrorPosition: peakError, maxErrorVelocity: Math.max(...iterations.map(r => r.error_velocidad)),
      factorEstabilidadHomogenea: stability
    });
  });
}

function braking(p) {
  if (!(p.brake > p.slope)) throw new RangeError('El frenado debe superar la contribución opuesta.');
  const { v0, reaction, drag, steps, available } = p;
  const a = p.brake - p.slope;
  const timeAt = net => drag === 0 ? v0 / net : Math.log1p(drag * v0 / net) / drag;
  const tStop = timeAt(a);
  function exactAt(t) {
    if (drag === 0) return [v0 * t - a * t * t / 2, v0 - a * t];
    const z = drag * t;
    const oneMinus = -Math.expm1(-z);
    // Series for z − (1−e⁻ᶻ), avoiding subtractive cancellation near zero.
    const remainder = Math.abs(z) < 1e-3 ? z * z * (1 / 2 - z / 6 + z * z / 24 - z ** 3 / 120) : z - oneMinus;
    return [v0 * oneMinus / drag - a * remainder / (drag * drag), v0 * Math.exp(-z) - a * oneMinus / drag];
  }
  const distance = exactAt(tStop)[0], reactionDistance = v0 * reaction;
  const exact = t => exactAt(t);
  const ode = rungeKutta((t, [x, v]) => [v, -a - drag * v], exact, [0, v0], tStop, steps, [-drag, 0]);
  let bound = 1;
  while (exact(bound)[1] > 0) bound *= 2;
  const roots = positiveRoot(t => exact(t)[1], t => -a - drag * exact(t)[1], tStop, bound, 's', 'm/s');
  const integrals = quadrature(t => exact(t)[1], 0, tStop, distance, 'm');
  const delta = Math.min(p.brake * 1e-4, a * .1);
  const perturbedStop = timeAt(a + delta);
  const condition = p.brake * v0 / (tStop * a * (a + drag * v0));
  const total = reactionDistance + distance, margin = available - total;
  const r2 = ode[0].settings.maxErrorPosition, r4 = ode[1].settings.maxErrorPosition;
  return {
    reference: { frenado_s: tStop, detencion_total_s: reaction + tStop, frenado_m: distance, reaccion_m: reactionDistance, detencion_total_m: total, margen_m: margin },
    methods: [...ode, ...roots, ...integrals],
    charts: [
      chart('Posición desde la alerta', 'Tiempo desde la alerta (s)', 'Distancia (m)', [
        series('Referencia', [[0, 0], [reaction, reactionDistance], ...byGrid(t => reactionDistance + exact(t)[0], 0, tStop).map(([t, x]) => [t + reaction, x])]),
        ...ode.map(m => series(m.name, [[0, 0], ...m.iterations.map(r => [r.t + reaction, reactionDistance + r.x])])),
        series('Distancia disponible', [[0, available], [reaction + tStop, available]])
      ]),
      chart('Evolución de la velocidad', 'Tiempo desde la alerta (s)', 'Velocidad (m/s)', [
        series('Referencia', [[0, v0], ...byGrid(t => exact(t)[1], 0, tStop).map(([t, v]) => [t + reaction, v])]),
        ...ode.map(m => series(m.name, [[0, v0], ...m.iterations.map(r => [r.t + reaction, r.velocidad])]))
      ]),
      chart('Error temporal de posición', 'Tiempo de frenado (s)', 'Error absoluto (m)', ode.map(m => series(m.name, m.iterations.map(r => [r.t, r.errorAbs])))),
      chart('Refinamiento de la integral', 'Nivel de refinamiento', 'Error absoluto (m)', integrals.map(m => series(m.name, m.iterations.map(r => [r.n, r.errorAbs]))))
    ],
    sensitivity: [sensitivity('Acción de frenado → tiempo de frenado', delta, Math.abs(perturbedStop - tStop), p.brake, tStop, { inputUnit: 'm/s²', outputUnit: 's' })],
    numericalConclusion: `Error máximo de posición: RK2 ${format(r2)} m, RK4 ${format(r4)} m. ${drag === 0 ? 'Con desaceleración constante, los esquemas y las cuadraturas reproducen los polinomios de referencia salvo redondeo.' : 'Con arrastre, RK4 reduce el error temporal; Simpson y Romberg extrapolan el error dominante de trapecio.'} El tiempo tiene sensibilidad relativa local κ≈${format(condition)} respecto de a_f. Las raíces usan la velocidad continua; RK e integración se comparan con el mismo tiempo de parada exacto para aislar sus errores.`,
    physicalConclusion: `La cabina recorre ${format(total)} m en ${format(reaction + tStop)} s, incluyendo ${format(reactionDistance)} m durante la reacción. ${margin >= 0 ? 'Quedan ' + format(margin) + ' m de margen' : 'Faltan ' + format(-margin) + ' m'} en la distancia supuesta. Velocidad inicial, reacción y desaceleración neta cambian ese margen. El indicador es hipotético y no incorpora respuesta de frenos reales, adherencia, pasajeros ni geometría de línea.`,
    details: { desaceleracion_neta_m_s2: a, condicion_relativa_del_tiempo_respecto_a_freno: condition,
      referencia: 'v(t)=(v₀+a/γ)e^(−γt)−a/γ. Se integra analíticamente para x y se resuelve t*=log(1+γv₀/a)/γ; para γ=0 se usan las fórmulas polinómicas.' }
  };
}

function linearMethods(A, b, exact, maxIter) {
  const tolerance = 1e-12;
  const n = b.length;
  const residual = x => norm(sub(b, matVec(A, x)));
  const normB = norm(b);
  const stop = '‖b−Ax‖₂ / ‖b‖₂ ≤ 10⁻¹², o máximo de iteraciones. Error absoluto = ‖x−x*‖₂.';
  const settings = { quantity: 'Vector de calibración', unit: 'adimensional', tolerance, maxIter, stop };
  const methods = ['Jacobi', 'Gauss-Seidel'].map(name => {
    let x = Array(n).fill(0);
    const iterations = [row(0, x, exact, residual(x))];
    for (let i = 1; i <= maxIter; i++) {
      const next = [...x];
      for (let j = 0; j < n; j++) {
        let total = 0;
        for (let k = 0; k < n; k++) if (j !== k) total += A[j][k] * (name === 'Gauss-Seidel' ? next[k] : x[k]);
        next[j] = (b[j] - total) / A[j][j];
      }
      x = next;
      const r = residual(x);
      iterations.push(row(i, x, exact, r, { residual_relativo: r / normB }));
      if (r / normB <= tolerance) break;
    }
    const r = iterations.at(-1).residual;
    return method(name, x, exact, r, r / normB <= tolerance, iterations, settings);
  });

  // Pivoted Doolittle: store multipliers below the diagonal, U on and above it.
  const LU = A.map(r => [...r]), permutation = sequence(n, i => i);
  for (let k = 0; k < n - 1; k++) {
    let pivot = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(LU[i][k]) > Math.abs(LU[pivot][k])) pivot = i;
    [LU[k], LU[pivot]] = [LU[pivot], LU[k]];
    [permutation[k], permutation[pivot]] = [permutation[pivot], permutation[k]];
    for (let i = k + 1; i < n; i++) {
      LU[i][k] /= LU[k][k];
      for (let j = k + 1; j < n; j++) LU[i][j] -= LU[i][k] * LU[k][j];
    }
  }
  const y = permutation.map(i => b[i]);
  for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) y[i] -= LU[i][j] * y[j];
  const xLU = [...y];
  for (let i = n - 1; i >= 0; i--) {
    for (let j = i + 1; j < n; j++) xLU[i] -= LU[i][j] * xLU[j];
    xLU[i] /= LU[i][i];
  }
  const rLU = residual(xLU);
  methods.push(method('LU con pivoteo', xLU, exact, rLU, rLU / normB <= tolerance, [
    row(1, xLU, exact, rLU, { residual_relativo: rLU / normB })
  ], { ...settings, maxIter: 1, stop: 'Método directo: factorización PA=LU y dos sustituciones. Se verifica el residuo relativo al final.' }));

  let x = Array(n).fill(0), r = [...b], direction = [...b];
  const cg = [row(0, x, exact, normB, { residual_relativo: 1 })];
  for (let k = 1; k <= maxIter; k++) {
    const prod = matVec(A, direction), denominator = dot(direction, prod);
    if (!(denominator > 0)) break;
    const rr = dot(r, r), alpha = rr / denominator;
    x = x.map((v, j) => v + alpha * direction[j]);
    const newR = r.map((v, j) => v - alpha * prod[j]);
    const actualR = residual(x);
    cg.push(row(k, x, exact, actualR, { residual_relativo: actualR / normB, alpha }));
    if (actualR / normB <= tolerance) break;
    const beta = dot(newR, newR) / rr;
    direction = newR.map((v, j) => v + beta * direction[j]);
    r = newR;
  }
  const rCG = cg.at(-1).residual;
  methods.push(method('Gradiente conjugado', x, exact, rCG, rCG / normB <= tolerance, cg, settings));
  return { methods, LU, permutation };
}

function deterioration(p) {
  const { d0, alpha, beta, threshold, delay, epsilon, maxIter } = p;
  if (!(threshold > d0)) throw new RangeError('El umbral debe superar el indicador inicial.');
  const D = t => d0 + alpha * t + beta * t * t;
  const f = t => D(t) - threshold;
  const gap = threshold - d0;
  const tExact = g => 2 * g / (alpha + Math.sqrt(alpha * alpha + 4 * beta * g));
  const t = tExact(gap);
  const upperBound = 1.5 * Math.min(gap / alpha, beta > 0 ? Math.sqrt(gap / beta) : Infinity);
  const roots = positiveRoot(f, t => alpha + 2 * beta * t, t, upperBound, 'días');
  const rho = 1 - epsilon;
  const A = sequence(4, i => sequence(4, j => (i === j ? 1 : 0) - rho / 4));
  const exact = [d0, 100 * alpha, 10000 * beta, .02], b = matVec(A, exact);
  const linear = linearMethods(A, b, exact, maxIter);
  const deltaNorm = 1e-6 * norm(b);
  // Perturb the data in the unit eigenvector u with eigenvalue epsilon.
  const delta = sequence(4, () => deltaNorm / 2);
  const deltaSolution = delta.map(v => v / epsilon);
  const shift = threshold * 1e-4;
  const thresholdChange = tExact(gap + shift) - t;
  const atDelay = D(t + delay);
  const condition = 1 / epsilon;
  const errors = linear.methods.map(m => m.errorAbs);
  const stopped = linear.methods.filter(m => !m.converged).map(m => m.name);
  return {
    reference: { umbral_dias: t, deterioro_con_retraso: atDelay, exceso_por_retraso: atDelay - threshold, solucion_calibracion: exact, condicion_2: condition },
    methods: [...roots, ...linear.methods],
    charts: [
      chart('Indicador de deterioro y umbral', 'Tiempo (días)', 'Indicador', [
        series('D(t)', byGrid(D, 0, t + Math.max(7, delay))),
        series('Umbral', [[0, threshold], [t + Math.max(7, delay), threshold]])
      ]),
      chart('Error en el instante de inspección', 'Iteración', 'Error absoluto (días)', roots.map(m => series(m.name, m.iterations.map(r => [r.n, r.errorAbs])))),
      chart('Error del vector de calibración', 'Iteración', '‖z−z*‖₂', linear.methods.map(m => series(m.name, m.iterations.map(r => [r.n, r.errorAbs])))),
      chart('Residuo del sistema lineal', 'Iteración', '‖b−Az‖₂', linear.methods.map(m => series(m.name, m.iterations.map(r => [r.n, r.residual]))))
    ],
    sensitivity: [
      sensitivity('Umbral → día de inspección', shift, thresholdChange, threshold, t, { outputUnit: 'días' }),
      sensitivity('Vector b → calibración (modo débil u)', norm(delta), norm(deltaSolution), norm(b), norm(exact), { direccion: delta, cambio_vectorial: deltaSolution })
    ],
    numericalConclusion: `A es SPD (autovalores ε,1,1,1), estrictamente dominante por filas, con κ₂=${format(condition)}. Jacobi tiene radio espectral ${(3 * rho / (4 - rho)).toLocaleString('es-BO', { maximumSignificantDigits: 12 })} y Gauss-Seidel converge para SPD; llegar al máximo de pasos no contradice esa convergencia teórica. ${stopped.length ? 'No alcanzaron la tolerancia: ' + stopped.join(', ') + '. ' : ''}Errores LU y GC: ${format(errors[2])} y ${format(errors[3])}. El modo u amplifica el error absoluto de b por 1/ε. Para la raíz, bisección conserva el intervalo y Newton usa la derivada positiva; la secante solo usa evaluaciones de D.`,
    physicalConclusion: `La inspección hipotética se activa a los ${format(t)} días. Con un retraso de ${format(delay)} días, el indicador sube a ${format(atDelay)}, un exceso de ${format(atDelay - threshold)} respecto al umbral. Este resultado depende de α, β y del umbral supuesto; no fija una periodicidad real de mantenimiento.`,
    details: { matriz_A: A, vector_b: b, solucion_conocida_z: exact, autovalores: [epsilon, 1, 1, 1], radio_espectral_jacobi: 3 * rho / (4 - rho),
      matriz_LU_compacta: linear.LU, permutacion_filas_base_0: linear.permutation,
      referencia_raiz: 't*=2(D_umbral−D₀)/(α+√(α²+4β(D_umbral−D₀))). Es la raíz no negativa y también sirve cuando β=0.' }
  };
}

// Independent check of integral accuracy using an 8-point Gauss-Legendre rule.
function gaussIntegral(f, a, b, n) {
  const nodes = [.1834346424956498, .525532409916329, .7966664774136267, .9602898564975363];
  const weights = [.362683783378362, .3137066458778873, .2223810344533745, .1012285362903763];
  const h = (b - a) / n;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const center = a + (i + .5) * h;
    for (let j = 0; j < 4; j++) sum += weights[j] * (f(center - nodes[j] * h / 2) + f(center + nodes[j] * h / 2));
  }
  return sum * h / 2;
}

function wind(p) {
  const { mass: m, stiffness: k, damping: c, force, omega: w, x0, v0, duration, steps } = p;
  const w0 = Math.sqrt(k / m), d = c / (2 * m);
  if (!(d < w0)) throw new RangeError('Se requiere régimen subamortiguado: c < 2√(mk).');
  const wd = Math.sqrt(w0 ** 2 - d ** 2);
  const steadyAmp = omega => force / Math.hypot(k - m * omega ** 2, c * omega);
  const deltaK = k - m * w * w, q = c * w;
  const den2 = deltaK * deltaK + q * q;
  const A = force * deltaK / den2, B = force * q / den2;
  const C1 = x0 - A, C2 = (v0 - B * w + d * C1) / wd;
  function exact(t) {
    const co = Math.cos(wd * t), si = Math.sin(wd * t);
    const z = C1 * co + C2 * si, exp = Math.exp(-d * t);
    return [exp * z + A * Math.cos(w * t) + B * Math.sin(w * t),
      exp * (wd * (-C1 * si + C2 * co) - d * z) + w * (-A * Math.sin(w * t) + B * Math.cos(w * t))];
  }
  const ode = rungeKutta((t, [x, v]) => [v, (force * Math.cos(w * t) - c * v - k * x) / m], exact, [x0, v0], duration, steps, [-d, wd]);
  const energy = t => exact(t)[0] ** 2;
  const integral = gaussIntegral(energy, 0, duration, 256);
  const check = Math.abs(gaussIntegral(energy, 0, duration, 128) - integral);
  const integrals = quadrature(energy, 0, duration, integral, 'm²·s');
  const trajectory = byGrid(t => exact(t)[0], 0, duration, 2048);
  const peak = maxAbs(trajectory.map(r => r[1]));
  const wShift = w * 1e-4;
  const amp = steadyAmp(w);
  const cond = Math.abs(w * (-2 * m * w * deltaK + c * c * w) / den2);
  // Perturb the initial state exactly through the homogeneous solution.
  const deltaX = .001;
  const endGain = Math.exp(-d * duration) * (Math.cos(wd * duration) + d / wd * Math.sin(wd * duration));
  return {
    reference: { desplazamiento_final_m: exact(duration)[0], pico_m_malla_2048: peak, J_m2_s: integral, amplitud_estacionaria_m: amp, frecuencia_natural_rad_s: w0 },
    methods: [...ode, ...integrals],
    charts: [
      chart('Trayectoria de oscilación', 'Tiempo (s)', 'Desplazamiento (m)', [
        series('Solución cerrada', byGrid(t => exact(t)[0], 0, duration, 320)), ...ode.map(m => series(m.name, m.iterations.map(r => [r.t, r.x])))
      ]),
      chart('Error absoluto de la trayectoria', 'Tiempo (s)', 'Error absoluto (m)', ode.map(m => series(m.name, m.iterations.map(r => [r.t, r.errorAbs])))),
      chart('Refinamiento de la exposición J', 'Nivel de refinamiento', 'Error absoluto (m²·s)', integrals.map(m => series(m.name, m.iterations.map(r => [r.n, r.errorAbs]))))
    ],
    sensitivity: [
      sensitivity('Estado x₀ → posición final', deltaX, Math.abs(deltaX * endGain), x0, exact(duration)[0], { inputUnit: 'm', outputUnit: 'm', ganancia_absoluta: Math.abs(endGain) }),
      sensitivity('Frecuencia de fuerza → amplitud estacionaria', wShift, Math.abs(steadyAmp(w + wShift) - amp), w, amp, { inputUnit: 'rad/s', outputUnit: 'm' })
    ],
    numericalConclusion: `Errores máximos de posición: RK2 ${format(ode[0].settings.maxErrorPosition)} m y RK4 ${format(ode[1].settings.maxErrorPosition)} m. Factores |R(hλ)| del modo homogéneo: RK2 ${format(ode[0].settings.factorEstabilidadHomogenea)}, RK4 ${format(ode[1].settings.factorEstabilidadHomogenea)}. Si superan uno, el método amplifica perturbaciones de ese modo por paso. Las tres cuadraturas usan la misma x(t) cerrada para separar el error de integración del error RK. ${force ? 'La amplitud estacionaria tiene sensibilidad relativa local κω≈' + format(cond) + ' con respecto a ω.' : 'La amplitud forzada es nula; su sensibilidad relativa no está definida.'}`,
    physicalConclusion: `El máximo muestreado en los ${format(duration)} s es ${format(peak)} m y J=${format(integral)} m²·s. ${force ? 'La amplitud estacionaria teórica es ' + format(amp) + ' m; el transitorio puede dominar el intervalo simulado.' : 'Sin fuerza periódica, el amortiguamiento disipa la vibración libre.'} Rigidez y amortiguamiento controlan la respuesta. El oscilador lineal no establece límites operativos de viento.`,
    details: { w_natural: w0, w_amortiguada: wd, razon_de_amortiguamiento: d / w0, condicion_frecuencia_amplitud: force ? cond : null,
      referencia: 'x=e^(−dt)(C₁cos(ω_dt)+C₂sin(ω_dt))+Acos(ωt)+Bsin(ωt), con A=F₀(k−mω²)/Q y B=F₀cω/Q; Q=(k−mω²)²+(cω)². C₁=x₀−A, C₂=(v₀−Bω+dC₁)/ω_d.',
      cuadratura_independiente: 'Gauss-Legendre de 8 puntos por subintervalo, 128 y 256 subintervalos, sobre x(t)² cerrada.',
      discrepancia_referencia_J: check, muestra_del_pico: 'Máximo de |x(t)| en 2049 instantes uniformes; no es un máximo continuo certificado.' }
  };
}

function lagrange(t, y) {
  return x => t.reduce((sum, ti, i) => {
    let term = y[i];
    for (let j = 0; j < t.length; j++) if (i !== j) term *= (x - t[j]) / (ti - t[j]);
    return sum + term;
  }, 0);
}

function newton(t, y) {
  const a = [...y];
  for (let j = 1; j < t.length; j++) for (let i = t.length - 1; i >= j; i--) a[i] = (a[i] - a[i - 1]) / (t[i] - t[i - j]);
  return x => {
    let v = a.at(-1);
    for (let j = a.length - 2; j >= 0; j--) v = a[j] + (x - t[j]) * v;
    return v;
  };
}

function naturalSpline(t, y) {
  const h = t.slice(1).map((v, i) => v - t[i]);
  const n = t.length;
  const b = sequence(n - 2, i => 2 * (h[i] + h[i + 1]));
  const rhs = sequence(n - 2, i => 6 * ((y[i + 2] - y[i + 1]) / h[i + 1] - (y[i + 1] - y[i]) / h[i]));
  for (let i = 1; i < n - 2; i++) {
    const factor = h[i] / b[i - 1];
    b[i] -= factor * h[i];
    rhs[i] -= factor * rhs[i - 1];
  }
  const M = Array(n).fill(0);
  for (let i = n - 3; i >= 0; i--) M[i + 1] = (rhs[i] - h[i + 1] * M[i + 2]) / b[i];
  return x => {
    let j = 0;
    while (j < n - 2 && x > t[j + 1]) j++;
    const a = (t[j + 1] - x) / h[j], b = (x - t[j]) / h[j];
    return a * y[j] + b * y[j + 1] + h[j] ** 2 * ((a ** 3 - a) * M[j] + (b ** 3 - b) * M[j + 1]) / 6;
  };
}

function sensors(p) {
  const ts = sequence(p.nodes, i => 6 * (i / (p.nodes - 1)) ** p.power);
  const y = ts.map((t, i) => Math.sin(t) + p.noise * Math.cos(2.3 * i));
  const held = ts.slice(1).map((t, i) => (t + ts[i]) / 2);
  const actual = held.map(Math.sin);
  const baselineRMS = norm(actual) / Math.sqrt(held.length);
  const stepLengths = ts.slice(1).map((t, i) => t - ts[i]);
  const names = ['Lagrange', 'Newton (diferencias divididas)', 'Spline cúbico natural'];
  const builders = [lagrange, newton, naturalSpline];
  // Polynomial and spline are linear in their ordinates. The pointwise infinity
  // operator norm is the sum of the absolute cardinal weights.
  function worstAtHeld(build) {
    const bases = sequence(y.length, j => build(ts, sequence(y.length, k => j === k ? 1 : 0)));
    const weights = held.map(t => bases.map(f => f(t)));
    const sums = weights.map(v => v.reduce((s, x) => s + Math.abs(x), 0));
    const ix = sums.indexOf(Math.max(...sums));
    return { t: held[ix], gain: sums[ix], signs: weights[ix].map(v => Math.sign(v)) };
  }
  const size = 1e-5, sensitivityResults = [];
  const interpolation = builders.map((build, i) => {
    const curve = build(ts, y);
    const worst = worstAtHeld(build);
    const perturbed = build(ts, y.map((v, j) => v + size * worst.signs[j]));
    const change = Math.abs(perturbed(worst.t) - curve(worst.t));
    sensitivityResults.push({
      label: names[i] + ': perturbación de ordenadas → predicción oculta',
      deltaInput: size, deltaOutput: change, amplification: change / size,
      norma: 'Amplificación absoluta ∞→|·| en el punto oculto más sensible',
      tiempo_s: worst.t, constante_Lebesgue_en_prueba: worst.gain
    });
    const errors = held.map((t, j) => row(j + 1, curve(t), actual[j], null, { t, verdadero: actual[j] }));
    const value = Math.sqrt(errors.reduce((sum, r) => sum + r.errorAbs ** 2, 0) / held.length);
    const nodeDefect = maxAbs(ts.map((t, j) => curve(t) - y[j]));
    const tolerance = 1e-7;
    const settings = {
      quantity: 'RMSE en puntos ocultos', unit: 'adimensional', tolerance, maxIter: held.length,
      stop: 'Ajuste directo. Se verifica máximo |p(tᵢ)−yᵢ| ≤ 10⁻⁷ en nodos. Las filas se evalúan en puntos ocultos y no tienen residuo nodal.',
      maxHiddenError: Math.max(...errors.map(r => r.errorAbs)), relativeToSignalRMS: baselineRMS > 0 ? value / baselineRMS : null,
      maxNodalResidual: nodeDefect
    };
    const result = method(names[i], value, 0, nodeDefect, nodeDefect <= tolerance, errors, settings);
    result.errorRel = settings.relativeToSignalRMS;
    result.errorPct = baselineRMS > 0 ? 100 * settings.relativeToSignalRMS : null;
    return { curve, result };
  });
  const errL = interpolation[0].result.value, errN = interpolation[1].result.value, errS = interpolation[2].result.value;
  return {
    reference: { senal: 'sin(t)', nodos: ts, medidas: y, ocultos: held.map((t, i) => [t, actual[i]]), RMS_senal_en_prueba: baselineRMS },
    methods: interpolation.map(m => m.result),
    charts: [
      chart('Señal real, muestras e interpolantes', 'Tiempo (s)', 'Señal', [
        series('sin(t) de referencia', byGrid(Math.sin, 0, 6, 320)),
        ...interpolation.map((m, i) => series(names[i], byGrid(m.curve, 0, 6, 320))),
        { ...series('Nodos observados', ts.map((t, i) => [t, y[i]])), markersOnly: true },
        { ...series('Puntos ocultos', held.map((t, i) => [t, actual[i]])), markersOnly: true }
      ]),
      chart('Error en registros ocultos', 'Tiempo (s)', 'Error absoluto', interpolation.map((m, i) => series(names[i], m.result.iterations.map(r => [r.t, r.errorAbs]))))
    ],
    sensitivity: sensitivityResults,
    numericalConclusion: `RMSE oculto: Lagrange ${format(errL)}, Newton ${format(errN)}, spline ${format(errS)}. Lagrange y Newton representan el mismo polinomio en aritmética exacta; una discrepancia entre ellos mide redondeo. Ganancia absoluta máxima en la malla oculta: ${format(sensitivityResults[0].amplification)} para el polinomio y ${format(sensitivityResults[2].amplification)} para el spline. El residuo en nodos mide interpolación de las medidas, mientras que el RMSE oculto mide reconstrucción de la señal limpia.`,
    physicalConclusion: `Se probaron ${held.length} registros sin usarlos en el ajuste. Los huecos miden entre ${format(Math.min(...stepLengths))} y ${format(Math.max(...stepLengths))} s, con amplitud de ruido ${format(p.noise)}. Una estimación en un hueco puede distorsionarse aunque pase por las mediciones observadas; estos datos sintéticos no determinan la confiabilidad de sensores reales.`,
    details: { nodos: ts, medidas: y, prueba_oculta: held.map((t, i) => [t, actual[i]]), razon_h_max_h_min: Math.max(...stepLengths) / Math.min(...stepLengths),
      referencia: 'Valor exacto sin(t) en los puntos medios ocultos. Relativo global = RMSE / RMS de sin(t) en esos mismos puntos.',
      sensibilidad: 'Se suman los valores absolutos de los pesos cardinales en cada punto de prueba. El mayor valor es la norma de amplificación absoluta en esa malla. La perturbación ±10⁻⁵ se orienta según los signos de esos pesos.' }
  };
}

const dispatch = { detencion: braking, deterioro: deterioration, viento: wind, sensores: sensors };

export function run(caseId, scenarioId, overrides = {}) {
  const c = cases.find(c => c.id === caseId);
  if (!c || !Object.hasOwn(c.scenarios, scenarioId)) throw new RangeError('Caso o escenario desconocido.');
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) throw new TypeError('Parámetros inválidos.');
  const defaults = c.scenarios[scenarioId].params;
  for (const key of Object.keys(overrides)) if (!Object.hasOwn(defaults, key)) throw new RangeError('Parámetro desconocido: ' + key);
  const params = { ...defaults, ...overrides };
  for (const f of c.fields) {
    const x = params[f.key];
    if (typeof x !== 'number' || !Number.isFinite(x) || x < f.min || x > f.max || (f.step === 1 && !Number.isInteger(x))) {
      throw new RangeError(`${f.label}: usa un ${f.step === 1 ? 'entero' : 'número'} entre ${f.min} y ${f.max}.`);
    }
  }
  const result = dispatch[caseId](params);
  if (result.methods.some(m => !Number.isFinite(m.value) && !Array.isArray(m.value))) throw new RangeError('Los parámetros produjeron un resultado no finito.');
  return { caseId, scenarioId, params, ...result };
}
