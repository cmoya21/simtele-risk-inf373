import { createSqliteStore } from './store-core.mjs';

let runtime;
let history;

function getRuntime() {
  runtime ??= Promise.all([
    globalThis.initSqlJs({ locateFile: file => new URL(file,import.meta.url).href }),
    fetch(new URL('./schema.sql',import.meta.url)).then(response => {
      if (!response.ok) throw new Error('No se pudo cargar el esquema de SQLite.');
      return response.text();
    })
  ]);
  return runtime;
}

function openHistory() {
  history ??= new Promise((resolve,reject)=>{
    const request=indexedDB.open('simtele-risk-historial',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('archivos');
    request.onsuccess=()=>{
      const database=request.result;
      database.onversionchange=()=>{database.close();history=null;};
      resolve(database);
    };
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(new Error('Cierra las otras pestañas de SIMTELE-RISK y vuelve a abrir el historial.'));
  });
  return history;
}

// Match the small statement interface used by the Node SQLite store.
function sqliteAdapter(db) {
  return {
    exec: sql=>db.exec(sql),
    close: ()=>db.close(),
    prepare(sql) {
      const select=(args, first=false)=>{
        const statement=db.prepare(sql,args);
        try {
          const rows=[];
          while(statement.step()) {
            rows.push(statement.getAsObject());
            if(first) break;
          }
          return rows;
        } finally {statement.free();}
      };
      return {
        get: (...args)=>select(args,true)[0],
        all: (...args)=>select(args),
        run(...args) {
          db.run(sql,args);
          return {lastInsertRowid:db.exec('SELECT last_insert_rowid()')[0].values[0][0]};
        }
      };
    }
  };
}

async function useDatabase(write, action) {
  const [[SQL,schema],storage]=await Promise.all([getRuntime(),openHistory()]);
  // Hold the IndexedDB write transaction while loading, changing and saving
  // SQLite. This serializes writes even across tabs on the same origin.
  return new Promise((resolve,reject)=>{
    const transaction=storage.transaction('archivos',write?'readwrite':'readonly');
    const files=transaction.objectStore('archivos');
    let result, failure;
    transaction.oncomplete=()=>resolve(result);
    transaction.onabort=()=>reject(failure ?? transaction.error ?? new Error('No se pudo guardar el historial.'));
    const read=files.get('simtele.sqlite');
    read.onsuccess=()=>{
      let db;
      try {
        db=read.result ? new SQL.Database(read.result) : new SQL.Database();
        const store=createSqliteStore(sqliteAdapter(db),schema,()=>crypto.randomUUID());
        result=action(store);
        if(write) files.put(db.export(),'simtele.sqlite');
      } catch(error) {
        failure=error;
        transaction.abort();
      } finally {db?.close();}
    };
  });
}

export async function browserApi(path,body) {
  if(body===undefined && (path==='' || path.startsWith('?'))) {
    const query=new URLSearchParams(path).get('q')?.slice(0,100) ?? '';
    return useDatabase(false,store=>store.list(query));
  }
  if(path==='' && body!==undefined) {
    return useDatabase(true,store=>store.execute(body.caseId,body.scenarioId,body.overrides ?? {}));
  }
  const route=path.match(/^\/([0-9a-f-]{36})(\/repetir)?$/);
  if(!route) throw new Error('Ruta de historial desconocida.');
  const repeat=Boolean(route[2]);
  return useDatabase(repeat,store=>{
    const record=repeat ? store.repeat(route[1]) : store.open(route[1]);
    if(!record) throw new Error('Simulación no encontrada en el historial de este navegador.');
    return record;
  });
}
