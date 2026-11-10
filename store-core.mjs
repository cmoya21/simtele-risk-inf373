import { cases, run } from './math.mjs';

export const VERSION = '1.0.0';
const json = value => JSON.stringify(value ?? null);
const real = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
const TOLERANCE = 1e-10;

function compare(a, b) {
  let matched = true;
  let maxDelta = 0;
  let maxScaledDelta = 0;
  function visit(x, y) {
    if (typeof x === 'number' && typeof y === 'number') {
      const delta = Math.abs(x-y);
      const scaled = delta / Math.max(1, Math.abs(x), Math.abs(y));
      maxDelta = Math.max(maxDelta, delta);
      maxScaledDelta = Math.max(maxScaledDelta, scaled);
      matched &&= scaled <= TOLERANCE;
    } else if (x && y && typeof x === 'object' && typeof y === 'object') {
      const keys = Object.keys(x);
      matched &&= Array.isArray(x) === Array.isArray(y) &&
        keys.length === Object.keys(y).length && keys.every(key => Object.hasOwn(y,key));
      for (const key of keys) visit(x[key],y[key]);
    } else {
      matched &&= x === y;
    }
  }
  visit(a,b);
  return {matched,maxDelta,maxScaledDelta,tolerance:TOLERANCE};
}

export function createSqliteStore(db, schema, newId) {
  db.exec(schema);
  const insertCase = db.prepare('INSERT OR IGNORE INTO caso_estudio VALUES (?,?,?)');
  for (const item of cases) insertCase.run(item.id,item.title,VERSION);
  const addScenario = db.prepare('INSERT OR IGNORE INTO escenario(caso_id,tipo,parametros_json,fuente_datos) VALUES (?,?,?,?)');
  const scenario = db.prepare('SELECT id FROM escenario WHERE caso_id=? AND tipo=? AND parametros_json=?');
  const addRun = db.prepare('INSERT INTO simulacion VALUES (?,?,?,?,?,?,?,?,?)');
  const addMethod = db.prepare(`INSERT INTO ejecucion_metodo
    (simulacion_id,metodo,tolerancia,paso,max_iter,convergio,tiempo_ms,configuracion_json) VALUES (?,?,?,?,?,?,?,?)`);
  const addRow = db.prepare('INSERT INTO iteracion_resultado VALUES (?,?,?,?,?,?,?)');
  const addSummary = db.prepare('INSERT INTO resultado_resumen VALUES (?,?,?,?,?)');
  const queryRun = db.prepare('SELECT * FROM simulacion WHERE id=?');
  const queryList = db.prepare(`SELECT s.id,s.fecha AS createdAt,e.caso_id AS caseId,e.tipo AS scenarioId,
     c.nombre AS title,(SELECT count(*) FROM ejecucion_metodo m WHERE m.simulacion_id=s.id) AS methodCount
     FROM simulacion s JOIN escenario e ON e.id=s.escenario_id JOIN caso_estudio c ON c.id=e.caso_id
     ORDER BY s.fecha DESC,s.rowid DESC`);

  function save(result, parent=null, verification=null) {
    const id = newId();
    const createdAt = new Date().toISOString();
    const params = json(result.params);
    db.exec('BEGIN IMMEDIATE');
    try {
      addScenario.run(result.caseId,result.scenarioId,params,'Datos sintéticos y supuestos académicos');
      const key = scenario.get(result.caseId,result.scenarioId,params).id;
      const status = result.methods.every(m => m.converged) ? 'calculada' : 'con_metodos_no_convergentes';
      addRun.run(id,key,createdAt,'Carlos Angel Moya Choque y Dante Pabel Churata Apaza',status,VERSION,json(result),parent,
        verification ? json(verification) : null);
      for (const method of result.methods) {
        const settings = method.settings ?? {};
        const methodId = addMethod.run(id,method.name,real(settings.tolerance ?? settings.tol),
          real(settings.step ?? settings.h),real(settings.maxIter),Number(Boolean(method.converged)),
          real(method.timeMs),json(settings)).lastInsertRowid;
        for (const [i,row] of method.iterations.entries()) {
          addRow.run(methodId,i,json(row.x ?? row.value),real(row.residual),real(row.errorAbs),
            real(row.errorRel),json(row));
        }
        addSummary.run(methodId,json(method.reference),json(method.value),
          json({abs:method.errorAbs,rel:method.errorRel,pct:method.errorPct,residual:method.residual}),
          method.interpretation ?? result.numericalConclusion ?? '');
      }
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    return {id,createdAt,result,...(verification ? {verification} : {})};
  }

  function open(id) {
    const row = queryRun.get(id);
    if (!row) return null;
    return {id,createdAt:row.fecha,result:JSON.parse(row.resultado_json),
      ...(row.verificacion_json ? {verification:JSON.parse(row.verificacion_json)} : {})};
  }
  return {
    close: () => db.close(),
    list(q='') {
      const needle=q.toLocaleLowerCase('es').normalize('NFD').replace(/\p{Diacritic}/gu,'');
      return queryList.all().filter(item =>
        Object.values(item).join(' ').toLocaleLowerCase('es').normalize('NFD')
          .replace(/\p{Diacritic}/gu,'').includes(needle));
    },
    open,
    execute(caseId,scenarioId,overrides) {
      return save(run(caseId,scenarioId,overrides));
    },
    repeat(id) {
      const old = open(id);
      if (!old) return null;
      const {caseId,scenarioId,params} = old.result;
      const fresh = run(caseId,scenarioId,params);
      return save(fresh,id,compare(old.result,fresh));
    }
  };
}
