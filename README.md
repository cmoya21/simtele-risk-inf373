# SIMTELE-RISK

Laboratorio de métodos numéricos para **INF 373**.

**Carlos Angel Moya Choque y Dante Pabel Churata Apaza**  
Docente: Lic. Brigida Alexandra Carvajal Blanco  
Universidad Mayor de San Andrés · Carrera de Informática

La aplicación incluye cuatro casos con tres escenarios cada uno: detención de emergencia, deterioro mecánico, oscilaciones por viento y reconstrucción de sensores. Los datos son sintéticos. Cada caso compara métodos y muestra la referencia, los errores, las iteraciones y la sensibilidad a los parámetros.

## Aplicación e historial

Este repositorio publica la aplicación desde la raíz de la rama main. En la web se ejecuta SQLite mediante sql.js 1.14.2 y se guarda el archivo de base de datos en IndexedDB. El historial pertenece al navegador y al origen donde se guardó.

Para comprobarlo, cambia un parámetro, guarda el experimento y vuelve a abrir el sitio en el mismo navegador. En Historial, abre el registro y pulsa Relanzar. La aplicación comprueba si la nueva salida coincide con la guardada.

## Código completo y ejecución local

[Descarga el proyecto fuente](SIMTELE-RISK-Codigo.zip) con el servidor Node, las pruebas, el esquema SQL y las instrucciones. La versión local usa SQLite en un archivo de disco. Los dos entornos comparten el motor numérico y la lógica que guarda y compara experimentos.

```text
node server.mjs
node --test tests/*.test.mjs
node scripts/preparar-pages.mjs
```

Se requiere Node.js 24 o superior para ejecutar el servidor local. El [historial Git original](SIMTELE-RISK-historial.bundle) se puede recuperar con:

```text
git clone SIMTELE-RISK-historial.bundle SIMTELE-RISK
```

[Esquema de la base de datos](schema.sql) · [Licencia de sql.js](LICENSE-sql.js.txt)
