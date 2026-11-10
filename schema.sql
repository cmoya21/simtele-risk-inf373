PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS caso_estudio (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  modelo_version TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS escenario (
  id INTEGER PRIMARY KEY,
  caso_id TEXT NOT NULL REFERENCES caso_estudio(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('normal','estres','mal')),
  parametros_json TEXT NOT NULL CHECK (json_valid(parametros_json)),
  fuente_datos TEXT NOT NULL,
  UNIQUE (caso_id, tipo, parametros_json)
);
CREATE TABLE IF NOT EXISTS simulacion (
  id TEXT PRIMARY KEY,
  escenario_id INTEGER NOT NULL REFERENCES escenario(id),
  fecha TEXT NOT NULL,
  usuario TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('calculada','con_metodos_no_convergentes')),
  version_motor TEXT NOT NULL,
  resultado_json TEXT NOT NULL CHECK (json_valid(resultado_json)),
  repeticion_de TEXT REFERENCES simulacion(id),
  verificacion_json TEXT CHECK (verificacion_json IS NULL OR json_valid(verificacion_json))
);
CREATE TABLE IF NOT EXISTS ejecucion_metodo (
  id INTEGER PRIMARY KEY,
  simulacion_id TEXT NOT NULL REFERENCES simulacion(id),
  metodo TEXT NOT NULL,
  tolerancia REAL,
  paso REAL,
  max_iter INTEGER,
  convergio INTEGER NOT NULL CHECK (convergio IN (0,1)),
  tiempo_ms REAL,
  configuracion_json TEXT NOT NULL CHECK (json_valid(configuracion_json))
);
CREATE TABLE IF NOT EXISTS iteracion_resultado (
  ejecucion_id INTEGER NOT NULL REFERENCES ejecucion_metodo(id),
  numero INTEGER NOT NULL,
  aproximacion_json TEXT NOT NULL CHECK (json_valid(aproximacion_json)),
  residual REAL,
  error_abs REAL,
  error_rel REAL,
  registro_json TEXT NOT NULL CHECK (json_valid(registro_json)),
  PRIMARY KEY (ejecucion_id, numero)
);
CREATE TABLE IF NOT EXISTS resultado_resumen (
  ejecucion_id INTEGER PRIMARY KEY REFERENCES ejecucion_metodo(id),
  referencia TEXT NOT NULL CHECK (json_valid(referencia)),
  valor_json TEXT NOT NULL CHECK (json_valid(valor_json)),
  metrica_error_json TEXT NOT NULL CHECK (json_valid(metrica_error_json)),
  interpretacion TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS simulacion_fecha ON simulacion(fecha DESC);
CREATE INDEX IF NOT EXISTS ejecucion_por_simulacion ON ejecucion_metodo(simulacion_id);
