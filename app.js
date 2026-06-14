/*
se almacenan los elementos html que serán manipulados
desde javaScript.
*/

const inputImagen = document.getElementById("inputImagen");
const mensajeValidacion = document.getElementById("mensajeValidacion");
const textoEstadoImagen = document.getElementById("textoEstadoImagen");

const seccionOriginal = document.getElementById("seccionOriginal");
const seccionSeleccionRecorte = document.getElementById("seccionSeleccionRecorte");
const seccionRecorte = document.getElementById("seccionRecorte");
const seccionFiltros = document.getElementById("seccionFiltros");
const seccionResultados = document.getElementById("seccionResultados");

const canvasOriginal = document.getElementById("canvasOriginal");
const ctxOriginal = canvasOriginal.getContext("2d", { willReadFrequently: true });

const canvasSelector = document.getElementById("canvasSelector");
const ctxSelector = canvasSelector.getContext("2d", { willReadFrequently: true });

const canvasRecorte = document.getElementById("canvasRecorte");
const canvasRecorteFinal = document.getElementById("canvasRecorteFinal");
const canvasRecorteResultado = document.getElementById("canvasRecorteResultado");
const canvasResultado = document.getElementById("canvasResultado");

const botonConfirmarRecorte = document.getElementById("botonConfirmarRecorte");
const textoCoordenadas = document.getElementById("textoCoordenadas");

const contenedorMatrizRecorte = document.getElementById("contenedorMatrizRecorte");
const contenedorMatrizOriginalResultado = document.getElementById("contenedorMatrizOriginalResultado");
const contenedorMatrizFiltrada = document.getElementById("contenedorMatrizFiltrada");

const contenedorMatricesIntermedias = document.getElementById("contenedorMatricesIntermedias");
const tituloIntermedia1 = document.getElementById("tituloIntermedia1");
const tituloIntermedia2 = document.getElementById("tituloIntermedia2");
const tituloIntermedia3 = document.getElementById("tituloIntermedia3");
const contenedorIntermedia1 = document.getElementById("contenedorIntermedia1");
const contenedorIntermedia2 = document.getElementById("contenedorIntermedia2");
const contenedorIntermedia3 = document.getElementById("contenedorIntermedia3");
const bloqueIntermedia3 = document.getElementById("bloqueIntermedia3");

const tituloResultadoActual = document.getElementById("tituloResultadoActual");
const botonDescargar = document.getElementById("botonDescargar");
const botonesFiltro = document.querySelectorAll(".boton-filtro");

/*
variables almacenan la imagen cargada, la imagen de
trabajo y la posicion del recorte
*/

let imagenOriginal = null;
let canvasTrabajo = null;
let ctxTrabajo = null;

let matrizRecorteActual = null;
let canvasRecortadoActual = null;

let posicionRecorte = { x: 0, y: 0 };
let arrastrando = false;

const TAMANIO_RECORTE = 15;

/*
se conectan los eventos de botones, mouse y touch con sus
funciones correspondientes
*/

inputImagen.addEventListener("change", cargarImagen);

botonConfirmarRecorte.addEventListener("click", confirmarRecorteSeleccionado);

botonDescargar.addEventListener("click", () => {
  descargarImagen("canvasResultado");
});

botonesFiltro.forEach((boton) => {
  boton.addEventListener("click", () => {
    if (!matrizRecorteActual) return;

    botonesFiltro.forEach((b) => b.classList.remove("activo"));
    boton.classList.add("activo");

    procesarFiltroSeleccionado(boton.dataset.filtro);
  });
});

canvasSelector.addEventListener("mousedown", iniciarArrastre);
canvasSelector.addEventListener("mousemove", moverRecorte);
window.addEventListener("mouseup", finalizarArrastre);
canvasSelector.addEventListener("click", moverRecortePorClick);

canvasSelector.addEventListener("touchstart", iniciarArrastreTouch, { passive: false });
canvasSelector.addEventListener("touchmove", moverRecorteTouch, { passive: false });
window.addEventListener("touchend", finalizarArrastre);

/*
-
CARGA DE IMAGEN
-
recibe la imagen seleccionada por el usuario,
la dibuja en el canvas original y crea una copia interna
de trabajo.
*/

/**
 * carga una imagen desde el input file y prepara el entorno inicial.
 * Recibe el evento del input y no devuelve valor.
 */
function cargarImagen(evento) {
  const archivo = evento.target.files[0];
  reiniciarInterfaz();

  if (!archivo) return;

  const tiposPermitidos = ["image/jpeg", "image/jpg"];
  if (!tiposPermitidos.includes(archivo.type)) {
    mostrarMensaje("Solo se permiten archivos JPG o JPEG.", "error");
    return;
  }

  const lector = new FileReader();

  lector.onload = function (e) {
    const imagen = new Image();

    imagen.onload = function () {
      if (imagen.width < TAMANIO_RECORTE || imagen.height < TAMANIO_RECORTE) {
        mostrarMensaje("La imagen debe tener como mínimo 15×15 píxeles.", "error");
        return;
      }

      imagenOriginal = imagen;

      /*
        se dibuja la imagen original en el canvas visible del paso 2.
        este canvas conserva la imagen subida por el usuario.
      */
      canvasOriginal.width = imagen.width;
      canvasOriginal.height = imagen.height;
      ctxOriginal.clearRect(0, 0, canvasOriginal.width, canvasOriginal.height);
      ctxOriginal.drawImage(imagenOriginal, 0, 0);

      /*
        Se crea un canvas interno de trabajo.
        Este canvas no se muestra directamente al usuario,
        pero es el que usará el paso 3 en adelante.
      */
      canvasTrabajo = document.createElement("canvas");
      canvasTrabajo.width = imagen.width;
      canvasTrabajo.height = imagen.height;
      ctxTrabajo = canvasTrabajo.getContext("2d", { willReadFrequently: true });
      ctxTrabajo.drawImage(imagenOriginal, 0, 0);

      seccionOriginal.classList.remove("oculto");

      const datos = ctxTrabajo.getImageData(0, 0, canvasTrabajo.width, canvasTrabajo.height).data;
      const esGris = verificarEscalaGrises(datos, canvasTrabajo.width, canvasTrabajo.height);

      if (esGris) {
        mostrarMensaje("La imagen está en escala de grises. Puedes continuar al recorte.", "exito");
        textoEstadoImagen.textContent = "La imagen cargada cumple la condición de escala de grises. Puedes continuar al recorte.";
        prepararSelectorRecorte();
      } else {
        /*
          el enunciado pide rechazar la imagen si no esta en blanco y negro
        */
        mostrarMensaje("La imagen no está en escala de grises. Carga una imagen en blanco y negro.", "error");
        textoEstadoImagen.textContent = "La imagen no cumple la condición de escala de grises, por lo que fue rechazada.";
      }
    };

    imagen.src = e.target.result;
  };

  lector.readAsDataURL(archivo);
}

/*
-
VALIDACION DE ESCALA DE GRISES
-
la funcion analiza si la imagen cumple la condicion de blanco y negro
*/

/**
 * Verifica si una imagen está en escala de grises.
 * Recibe el arreglo RGBA, el ancho y el alto.
 * Devuelve true si la imagen está en grises y false si no lo está.
 */
function verificarEscalaGrises(datos, ancho, alto) {
  const tolerancia = 5;

  for (let i = 0; i < ancho * alto * 4; i += 4) {
    const r = datos[i];
    const g = datos[i + 1];
    const b = datos[i + 2];

    if (Math.abs(r - g) > tolerancia || Math.abs(r - b) > tolerancia || Math.abs(g - b) > tolerancia) {
      return false;
    }
  }

  return true;
}

/*
-
SELECCIÓN MANUAL DEL RECORTE 15x15
-
ahora que tenemos la imagen de trabajo, le decimos al usuario que escoja
*/

/**
prepara selector de recorte
 */
function prepararSelectorRecorte() {
  if (!canvasTrabajo) return;

  seccionSeleccionRecorte.classList.remove("oculto");

  canvasSelector.width = canvasTrabajo.width;
  canvasSelector.height = canvasTrabajo.height;

  posicionRecorte = {
    x: Math.floor((canvasTrabajo.width - TAMANIO_RECORTE) / 2),
    y: Math.floor((canvasTrabajo.height - TAMANIO_RECORTE) / 2)
  };

  actualizarSelectorYVistaPrevia();
}

/*
actualiza el canvas del selector y el zoom del recorte
 */
function actualizarSelectorYVistaPrevia() {
  if (!canvasTrabajo) return;

  ctxSelector.clearRect(0, 0, canvasSelector.width, canvasSelector.height);
  ctxSelector.drawImage(canvasTrabajo, 0, 0);

  /*
    se resalta el area que el usuario esta escogiendo
  */
  ctxSelector.save();
  ctxSelector.fillStyle = "rgba(0, 0, 0, 0.18)";
  ctxSelector.fillRect(0, 0, canvasSelector.width, canvasSelector.height);
  ctxSelector.clearRect(posicionRecorte.x, posicionRecorte.y, TAMANIO_RECORTE, TAMANIO_RECORTE);

  /*
    se dibuja el borde del recorte seleccionado
  */
  ctxSelector.strokeStyle = "#f49ac2";
  ctxSelector.lineWidth = 2;
  ctxSelector.strokeRect(posicionRecorte.x, posicionRecorte.y, TAMANIO_RECORTE, TAMANIO_RECORTE);
  ctxSelector.restore();

  textoCoordenadas.textContent = `x = ${posicionRecorte.x}, y = ${posicionRecorte.y}`;

  const recorteTemporal = recortarArea(canvasTrabajo, posicionRecorte.x, posicionRecorte.y, TAMANIO_RECORTE);
  const ctxTemporal = recorteTemporal.getContext("2d", { willReadFrequently: true });
  const matrizTemporal = obtenerMatrizGrises(ctxTemporal, TAMANIO_RECORTE, TAMANIO_RECORTE);

  matrizACanvas(matrizTemporal, canvasRecorte);
}

/*
inicia el arrastre del recorte
 */
function iniciarArrastre() {
  arrastrando = true;
}

/*
finaliza el arrastre del recorte
 */
function finalizarArrastre() {
  arrastrando = false;
}

/*
para mover el recorte arrastrando el mouse
 */
function moverRecorte(evento) {
  if (!arrastrando) return;
  actualizarPosicionRecorteDesdeEvento(evento);
}

/*
para mover el recorte con un clic
 */
function moverRecortePorClick(evento) {
  actualizarPosicionRecorteDesdeEvento(evento);
}

/*
para movimiento del recorte con tactil
 */
function iniciarArrastreTouch(evento) {
  evento.preventDefault();
  arrastrando = true;
}

function moverRecorteTouch(evento) {
  if (!arrastrando) return;
  evento.preventDefault();
  actualizarPosicionRecorteDesdeEvento(evento.touches[0]);
}

/*
actualización de posición de recorte por evento mouse/touch, sin retorno
 */
function actualizarPosicionRecorteDesdeEvento(evento) {
  const rect = canvasSelector.getBoundingClientRect();
  const escalaX = canvasSelector.width / rect.width;
  const escalaY = canvasSelector.height / rect.height;

  const xReal = Math.floor((evento.clientX - rect.left) * escalaX);
  const yReal = Math.floor((evento.clientY - rect.top) * escalaY);

  let nuevoX = xReal - Math.floor(TAMANIO_RECORTE / 2);
  let nuevoY = yReal - Math.floor(TAMANIO_RECORTE / 2);

  nuevoX = Math.max(0, Math.min(canvasSelector.width - TAMANIO_RECORTE, nuevoX));
  nuevoY = Math.max(0, Math.min(canvasSelector.height - TAMANIO_RECORTE, nuevoY));

  posicionRecorte.x = nuevoX;
  posicionRecorte.y = nuevoY;

  actualizarSelectorYVistaPrevia();
}

/*
confirmación de recorte y preparación de matriz 15x15, sin parámetros ni retorno
 */
function confirmarRecorteSeleccionado() {
  if (!canvasTrabajo) return;

  canvasRecortadoActual = recortarArea(
    canvasTrabajo,
    posicionRecorte.x,
    posicionRecorte.y,
    TAMANIO_RECORTE
  );

  const ctxTemporal = canvasRecortadoActual.getContext("2d", { willReadFrequently: true });
  matrizRecorteActual = obtenerMatrizGrises(ctxTemporal, TAMANIO_RECORTE, TAMANIO_RECORTE);

  /*
    renderizado de recorte en vistas previas y panel de resultados
  */
  matrizACanvas(matrizRecorteActual, canvasRecorteFinal);
  matrizACanvas(matrizRecorteActual, canvasRecorteResultado);

  /*
    se muestran las matrices correspondientes
  */
  mostrarMatriz(matrizRecorteActual, "contenedorMatrizRecorte");
  mostrarMatriz(matrizRecorteActual, "contenedorMatrizOriginalResultado");

  seccionRecorte.classList.remove("oculto");
  seccionFiltros.classList.remove("oculto");
  seccionResultados.classList.remove("oculto");

  tituloResultadoActual.textContent = "Selecciona un filtro para procesar el recorte elegido.";
  contenedorMatrizFiltrada.innerHTML = "";
  ocultarMatricesIntermedias();
}

/*
extracción de área cuadrada desde canvas fuente (x, y, tamaño), devuelve nuevo canvas recortado
 */
function recortarArea(canvas, inicioX, inicioY, tamanio) {
  const canvasRecortado = document.createElement("canvas");
  const ctxTemporal = canvasRecortado.getContext("2d", { willReadFrequently: true });

  canvasRecortado.width = tamanio;
  canvasRecortado.height = tamanio;

  ctxTemporal.drawImage(
    canvas,
    inicioX,
    inicioY,
    tamanio,
    tamanio,
    0,
    0,
    tamanio,
    tamanio
  );

  return canvasRecortado;
}

/*
-
DIGITALIZACION Y MATRICES
-
mapeo de píxeles a matriz de intensidades con renderizado en tabla
*/

/*
obtención de matriz 2D de intensidades desde canvas (ancho/alto), devuelve matriz de enteros
 */
function obtenerMatrizGrises(ctx, ancho, alto) {
  const datos = ctx.getImageData(0, 0, ancho, alto).data;
  const matriz = [];

  for (let y = 0; y < alto; y++) {
    const fila = [];

    for (let x = 0; x < ancho; x++) {
      const indice = (y * ancho + x) * 4;
      fila.push(datos[indice]);
    }

    matriz.push(fila);
  }

  return matriz;
}

/*
renderizado de matriz en tabla HTML por ID de contenedor, sin retorno
 */
function mostrarMatriz(matriz, idContenedor) {
  const contenedor = document.getElementById(idContenedor);
  contenedor.innerHTML = "";

  const tabla = document.createElement("table");
  tabla.className = "tabla-matriz";

  matriz.forEach((fila) => {
    const tr = document.createElement("tr");

    fila.forEach((valor) => {
      const td = document.createElement("td");
      td.textContent = Number.isInteger(valor) ? valor : Math.round(valor);
      tr.appendChild(td);
    });

    tabla.appendChild(tr);
  });

  contenedor.appendChild(tabla);
}

/*
-
FILTROS
-
filtros de media y mediana
*/

/*
aplica el filtro de media 3x3 a una matriz
recibe una matriz 2D y devuelve una nueva matriz filtrada
 */
function aplicarFiltroMedia(matriz) {
  const filas = matriz.length;
  const columnas = matriz[0].length;
  const resultado = copiarMatriz(matriz);

  for (let y = 1; y < filas - 1; y++) {
    for (let x = 1; x < columnas - 1; x++) {
      let suma = 0;

      /*
        se suman los 9 valores del alrededor 3x3 del píxel central
      */
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          suma += matriz[y + j][x + i];
        }
      }

      /*
        se calcula el promedio, se redondea y se ajusta a modulo 256
        si fuera necesario
      */
      let promedio = suma / 9;
      promedio = Math.round(promedio);
      promedio = ((promedio % 256) + 256) % 256;

      resultado[y][x] = promedio;
    }
  }

  return resultado;
}

/*
aplica el filtro de mediana 3x3 a una matriz
recibe una matriz 2D y devuelve una nueva matriz filtrada
 */
function aplicarFiltroMediana(matriz) {
  const filas = matriz.length;
  const columnas = matriz[0].length;
  const resultado = copiarMatriz(matriz);

  for (let y = 1; y < filas - 1; y++) {
    for (let x = 1; x < columnas - 1; x++) {
      const vecinos = [];

      /*
        se almacenan los 9 valores de la matriz 3x3
      */
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          vecinos.push(matriz[y + j][x + i]);
        }
      }

      /*
        se ordenan los valores para hallar la mediana
      */
      vecinos.sort((a, b) => a - b);

      let mediana;

      if (vecinos.length % 2 !== 0) {
        mediana = vecinos[Math.floor(vecinos.length / 2)];
      } else {
        mediana = Math.round((vecinos[vecinos.length / 2 - 1] + vecinos[vecinos.length / 2]) / 2);
      }

      resultado[y][x] = mediana;
    }
  }

  return resultado;
}

/*
devuelve el valor de un vecino aplicando replicacion de borde
si la posicion se sale de la matriz se usa el pixel valido mas cercano
asi tambien se filtra el borde y no queda un marco sin procesar
 */
function obtenerVecino(matriz, y, x) {
  const filas = matriz.length;
  const columnas = matriz[0].length;

  const filaValida = limitarValor(y, 0, filas - 1);
  const columnaValida = limitarValor(x, 0, columnas - 1);

  return matriz[filaValida][columnaValida];
}

/*
aplica el filtro laplaciano 3x3 a una matriz
recibe una matriz 2D y devuelve la matriz filtrada (puede tener valores fuera de rango)
 */
function aplicarFiltroLaplaciano(matriz) {
  const filas = matriz.length;
  const columnas = matriz[0].length;
  const resultado = crearMatrizVacia(filas, columnas);

  /*
    mascara laplaciana con diagonales, suma de coeficientes cero
  */
  const mascara = [
    [1, 1, 1],
    [1, -8, 1],
    [1, 1, 1]
  ];

  /*
    se recorre toda la matriz, incluido el borde, usando replicacion
  */
  for (let y = 0; y < filas; y++) {
    for (let x = 0; x < columnas; x++) {
      let suma = 0;

      /*
        se multiplica cada vecino 3x3 por su peso en la mascara
      */
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          suma += obtenerVecino(matriz, y + j, x + i) * mascara[j + 1][i + 1];
        }
      }

      resultado[y][x] = suma;
    }
  }

  return resultado;
}

/*
aplica el filtro de sobel 3x3 a una matriz
recibe una matriz 2D y devuelve un objeto con las matrices gx, gy y magnitud
 */
function aplicarFiltroSobel(matriz) {
  const filas = matriz.length;
  const columnas = matriz[0].length;

  const matrizGx = crearMatrizVacia(filas, columnas);
  const matrizGy = crearMatrizVacia(filas, columnas);
  const magnitud = crearMatrizVacia(filas, columnas);

  /*
    mascaras de sobel para gradiente horizontal y vertical
  */
  const mascaraX = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
  ];

  const mascaraY = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1]
  ];

  /*
    se recorre toda la matriz, incluido el borde, usando replicacion
  */
  for (let y = 0; y < filas; y++) {
    for (let x = 0; x < columnas; x++) {
      let gx = 0;
      let gy = 0;

      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const valor = obtenerVecino(matriz, y + j, x + i);
          gx += valor * mascaraX[j + 1][i + 1];
          gy += valor * mascaraY[j + 1][i + 1];
        }
      }

      matrizGx[y][x] = gx;
      matrizGy[y][x] = gy;

      /*
        magnitud aproximada del gradiente: |gx| + |gy|
      */
      magnitud[y][x] = Math.abs(gx) + Math.abs(gy);
    }
  }

  return { matrizGx, matrizGy, magnitud };
}

/*
reescala una matriz al rango 0 a 255 usando la recta entre minimo y maximo
recibe una matriz 2D y devuelve una nueva matriz reescalada
 */
function reescalarMatriz(matriz) {
  const filas = matriz.length;
  const columnas = matriz[0].length;
  const resultado = crearMatrizVacia(filas, columnas);

  const L = 256;

  /*
    se busca el valor minimo y maximo de la matriz filtrada
  */
  let minimo = matriz[0][0];
  let maximo = matriz[0][0];

  for (let y = 0; y < filas; y++) {
    for (let x = 0; x < columnas; x++) {
      if (matriz[y][x] < minimo) minimo = matriz[y][x];
      if (matriz[y][x] > maximo) maximo = matriz[y][x];
    }
  }

  /*
    si todos los valores son iguales se evita dividir entre cero
  */
  const rango = maximo - minimo;

  for (let y = 0; y < filas; y++) {
    for (let x = 0; x < columnas; x++) {
      let valor;

      if (rango === 0) {
        valor = 0;
      } else {
        valor = ((matriz[y][x] - minimo) / rango) * (L - 1);
      }

      resultado[y][x] = Math.round(valor);
    }
  }

  return resultado;
}

/*
-
PROCESAMIENTO DEL FILTRO SELECCIONADO
-
aqui se decide qué filtro aplicar según el boton
*/

/*
procesa el filtro elegido por el usuario y recibe el nombre del filtro y no devuelve valor
 */
function procesarFiltroSeleccionado(filtro) {
  if (!matrizRecorteActual) return;

  ocultarMatricesIntermedias();

  if (filtro === "media") {
    const matrizFiltrada = aplicarFiltroMedia(matrizRecorteActual);

    tituloResultadoActual.textContent = "Resultado del filtro de Media";
    mostrarMatriz(matrizFiltrada, "contenedorMatrizFiltrada");
    matrizACanvas(matrizFiltrada, canvasResultado);
  }

  if (filtro === "mediana") {
    const matrizFiltrada = aplicarFiltroMediana(matrizRecorteActual);

    tituloResultadoActual.textContent = "Resultado del filtro de Mediana";
    mostrarMatriz(matrizFiltrada, "contenedorMatrizFiltrada");
    matrizACanvas(matrizFiltrada, canvasResultado);
  }

  if (filtro === "laplaciano") {
    /*
      el laplaciano genera valores fuera de rango, por eso se reescala
    */
    const matrizFiltrada = aplicarFiltroLaplaciano(matrizRecorteActual);
    const matrizReescalada = reescalarMatriz(matrizFiltrada);

    tituloResultadoActual.textContent = "Resultado del filtro Laplaciano";
    mostrarMatriz(matrizReescalada, "contenedorMatrizFiltrada");
    matrizACanvas(matrizReescalada, canvasResultado);

    /*
      se muestran las matrices intermedias: filtrada y reescalada
    */
    mostrarMatricesIntermedias([
      { titulo: "Matriz filtrada (sin reescalar)", matriz: matrizFiltrada },
      { titulo: "Matriz reescalada", matriz: matrizReescalada }
    ]);
  }

  if (filtro === "sobel") {
    /*
      sobel calcula los gradientes gx y gy, luego la magnitud y se reescala
    */
    const { matrizGx, matrizGy, magnitud } = aplicarFiltroSobel(matrizRecorteActual);
    const matrizReescalada = reescalarMatriz(magnitud);

    tituloResultadoActual.textContent = "Resultado del filtro Sobel";
    mostrarMatriz(matrizReescalada, "contenedorMatrizFiltrada");
    matrizACanvas(matrizReescalada, canvasResultado);

    /*
      se muestran las matrices intermedias: gradiente x, gradiente y y magnitud
    */
    mostrarMatricesIntermedias([
      { titulo: "Gradiente Gx", matriz: matrizGx },
      { titulo: "Gradiente Gy", matriz: matrizGy },
      { titulo: "Magnitud |Gx| + |Gy|", matriz: magnitud }
    ]);
  }
}

/*
-
CONVERSION DE MATRIZ A IMAGEN Y DESCARGA
-
estas funciones permiten representar una matriz como imagen
y exportar el resultado final
*/

/*
dibuja una matriz de intensidades en un canvas
recibe la matriz y el canvas destino
 */
function matrizACanvas(matriz, canvasElement) {
  const filas = matriz.length;
  const columnas = matriz[0].length;
  const ctx = canvasElement.getContext("2d");

  canvasElement.width = columnas;
  canvasElement.height = filas;

  const imagenDatos = ctx.createImageData(columnas, filas);

  for (let y = 0; y < filas; y++) {
    for (let x = 0; x < columnas; x++) {
      const indice = (y * columnas + x) * 4;
      const valor = limitarValor(Math.round(matriz[y][x]), 0, 255);

      imagenDatos.data[indice] = valor;
      imagenDatos.data[indice + 1] = valor;
      imagenDatos.data[indice + 2] = valor;
      imagenDatos.data[indice + 3] = 255;
    }
  }

  ctx.imageSmoothingEnabled = false;
  ctx.putImageData(imagenDatos, 0, 0);
}

/*
descarga el contenido de un canvas como png. recibe el id del canvas
 */
function descargarImagen(canvasId) {
  const canvas = document.getElementById(canvasId);
  const enlace = document.createElement("a");

  enlace.href = canvas.toDataURL("image/png");
  enlace.download = "imagen_filtrada.png";
  enlace.click();
}

/*
-
FUNCIONES DE APOYO DE INTERFAZ
-
Estas funciones ayudan a mostrar mensajes, reiniciar el
estado visual y limpiar resultados previos.
*/

function mostrarMensaje(texto, tipo) {
  mensajeValidacion.textContent = texto;
  mensajeValidacion.className = `mensaje ${tipo}`;
  mensajeValidacion.classList.remove("oculto");
}

function reiniciarInterfaz() {
  mensajeValidacion.textContent = "";
  mensajeValidacion.className = "mensaje oculto";

  seccionOriginal.classList.add("oculto");
  seccionSeleccionRecorte.classList.add("oculto");
  seccionRecorte.classList.add("oculto");
  seccionFiltros.classList.add("oculto");
  seccionResultados.classList.add("oculto");

  textoEstadoImagen.textContent = "Aún no se ha procesado ninguna imagen.";
  textoCoordenadas.textContent = "x = 0, y = 0";

  contenedorMatrizRecorte.innerHTML = "";
  contenedorMatrizOriginalResultado.innerHTML = "";
  contenedorMatrizFiltrada.innerHTML = "";
  contenedorIntermedia1.innerHTML = "";
  contenedorIntermedia2.innerHTML = "";
  contenedorIntermedia3.innerHTML = "";

  botonesFiltro.forEach((b) => b.classList.remove("activo"));

  imagenOriginal = null;
  canvasTrabajo = null;
  ctxTrabajo = null;
  matrizRecorteActual = null;
  canvasRecortadoActual = null;

  posicionRecorte = { x: 0, y: 0 };
  arrastrando = false;

  ocultarMatricesIntermedias();
}

function ocultarMatricesIntermedias() {
  contenedorMatricesIntermedias.classList.add("oculto");
  bloqueIntermedia3.classList.add("oculto");
  contenedorIntermedia1.innerHTML = "";
  contenedorIntermedia2.innerHTML = "";
  contenedorIntermedia3.innerHTML = "";
}

/*
muestra las matrices intermedias de los filtros de agudizamiento
recibe un arreglo de objetos { titulo, matriz } de 2 o 3 elementos
 */
function mostrarMatricesIntermedias(lista) {
  contenedorMatricesIntermedias.classList.remove("oculto");

  tituloIntermedia1.textContent = lista[0].titulo;
  mostrarMatriz(lista[0].matriz, "contenedorIntermedia1");

  tituloIntermedia2.textContent = lista[1].titulo;
  mostrarMatriz(lista[1].matriz, "contenedorIntermedia2");

  /*
    el tercer bloque solo se usa cuando hay tres matrices, como en sobel
  */
  if (lista.length > 2) {
    bloqueIntermedia3.classList.remove("oculto");
    tituloIntermedia3.textContent = lista[2].titulo;
    mostrarMatriz(lista[2].matriz, "contenedorIntermedia3");
  } else {
    bloqueIntermedia3.classList.add("oculto");
  }
}

/**
 * crea una copia independiente de una matriz.
 */
function copiarMatriz(matriz) {
  return matriz.map((fila) => [...fila]);
}

/**
 * crea una matriz vacía de tamaño filas x columnas.
 */
function crearMatrizVacia(filas, columnas, valorInicial = 0) {
  return Array.from({ length: filas }, () => Array(columnas).fill(valorInicial));
}

/**
 * limita un valor numérico dentro de un intervalo.
 */
function limitarValor(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}