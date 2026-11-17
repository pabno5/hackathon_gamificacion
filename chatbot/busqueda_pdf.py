import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import hmac
import threading
import time
from collections import defaultdict, deque
import numpy as np
import faiss
import requests
from groq import Groq
import pandas as pd
import sqlite3
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn
import uuid
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer

load_dotenv()

# ==============================
# CONFIGURACIÓN
# ==============================

DOCS_FOLDER = "./documentos"
DB_PATH = "documentos.db"

# LLM_PROVIDER: "groq" (nube, requiere GROQ_API_KEY) u "ollama" (local, requiere
# tener Ollama corriendo en la máquina). Útil para probar sin gastar cuota de Groq.
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "groq").lower()
GROQ_MODEL = "llama-3.3-70b-versatile"
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "mistral:latest")

EMBED_MODEL_NAME = "all-MiniLM-L6-v2"
UMBRAL_RELEVANCIA = 1.0
FRAGMENTOS_EN_CONTEXTO = 4
INTERNAL_SECRET = os.environ.get("CHATBOT_INTERNAL_SECRET")

# Límites del endpoint público /buscar. Cada consulta gasta cuota del LLM, así
# que sin tope cualquiera podía agotar la cuota (o inflar el costo) con un script.
MAX_QUERY_CHARS = 500
MAX_K = 10
RATE_LIMIT_MAX = int(os.environ.get("CHATBOT_RATE_LIMIT_MAX", "20"))       # consultas…
RATE_LIMIT_WINDOW = int(os.environ.get("CHATBOT_RATE_LIMIT_WINDOW", "60"))  # …por ventana (s) e IP
MAX_PDF_BYTES = 15 * 1024 * 1024

# El cliente de Groq solo se crea si se va a usar: con LLM_PROVIDER=ollama y sin
# GROQ_API_KEY el servicio no arrancaba.
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY")) if LLM_PROVIDER != "ollama" else None
embed_model = SentenceTransformer(EMBED_MODEL_NAME)

print(f"Proveedor de LLM: {LLM_PROVIDER} ({GROQ_MODEL if LLM_PROVIDER == 'groq' else OLLAMA_MODEL})")


def _chat(messages, max_tokens):
    """Envía una conversación al LLM activo (Groq u Ollama) y devuelve el texto de respuesta."""
    if LLM_PROVIDER == "ollama":
        resp = requests.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": messages,
                "stream": False,
                "options": {"temperature": 0.1, "num_predict": max_tokens},
            },
            timeout=180,
        )
        resp.raise_for_status()
        return resp.json()["message"]["content"].strip()

    response = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        max_tokens=max_tokens,
        temperature=0.1,
    )
    return response.choices[0].message.content.strip()

os.makedirs(DOCS_FOLDER, exist_ok=True)

# Estado en memoria (DataFrame + índice FAISS). Se reconstruye en cada
# alta/baja de documento para mantenerlo siempre consistente con la BD.
_lock = threading.Lock()
data: pd.DataFrame
index: faiss.IndexFlatL2


# ==============================
# EXTRACCIÓN Y RESUMEN
# ==============================

def extraer_texto_pdf(pdf_path):
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"No se encontró el PDF en la ruta: {pdf_path}")
    reader = PdfReader(pdf_path)
    texto = ""
    for page in reader.pages:
        extracted = page.extract_text()
        if extracted:
            texto += extracted + "\n"
    return [texto[i:i + 800] for i in range(0, len(texto), 800)]


def resumir_fragmento(fragmento):
    prompt = f"""Analiza el siguiente texto de una clínica oftalmológica y extrae la información más importante de manera CONCRETA y DIRECTA.

Texto original:
{fragmento}

Resumen CONCRETO (máximo 3-4 líneas):
- Extrae solo los puntos clave, procedimientos específicos, pasos a seguir
- Usa lenguaje claro y directo
- Evita explicaciones largas o lenguaje florido
- No agregues información que no esté en el texto original

Resumen concreto:"""
    try:
        return _chat([{"role": "user", "content": prompt}], max_tokens=150)
    except Exception as e:
        print(f"[ERROR resumir_fragmento] {type(e).__name__}: {e}")
        return fragmento[:200]


def _procesar_pdf(path, archivo):
    """Extrae, resume y devuelve un DataFrame con los fragmentos de un único PDF."""
    fragments = extraer_texto_pdf(path)
    summaries = [resumir_fragmento(f) for f in fragments]
    return pd.DataFrame({
        "id": [str(uuid.uuid4()) for _ in range(len(fragments))],
        "fragmento": fragments,
        "resumen": summaries,
        "archivo": [archivo] * len(fragments),
    })


# ==============================
# PERSISTENCIA (SQLite)
# ==============================

def _esquema_vigente(conn):
    cols = {row[1] for row in conn.execute("PRAGMA table_info(documentos)").fetchall()}
    return {"id", "fragmento", "resumen", "archivo"}.issubset(cols)


def _guardar_db(df):
    conn = sqlite3.connect(DB_PATH)
    df.to_sql("documentos", conn, if_exists="replace", index=False)
    conn.close()


def _cargar_db():
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql("SELECT * FROM documentos", conn)
    conn.close()
    return df


def _generar_estado_desde_carpeta():
    print("Generando base de conocimiento desde los PDFs...")
    partes = []
    for filename in sorted(os.listdir(DOCS_FOLDER)):
        if filename.lower().endswith(".pdf"):
            print(f"  Procesando: {filename}")
            partes.append(_procesar_pdf(os.path.join(DOCS_FOLDER, filename), filename))
    if partes:
        return pd.concat(partes, ignore_index=True)
    return pd.DataFrame(columns=["id", "fragmento", "resumen", "archivo"])


def _cargar_o_generar():
    if os.path.exists(DB_PATH):
        conn = sqlite3.connect(DB_PATH)
        try:
            esquema_ok = _esquema_vigente(conn)
        finally:
            conn.close()
        if esquema_ok:
            return _cargar_db()
        print("Esquema de documentos.db desactualizado, regenerando…")

    df = _generar_estado_desde_carpeta()
    _guardar_db(df)
    return df


def _construir_indice(df):
    if len(df) == 0:
        return faiss.IndexFlatL2(embed_model.get_sentence_embedding_dimension())
    embedded = embed_model.encode(df["resumen"].tolist(), show_progress_bar=False)
    embedded = np.array(embedded, dtype="float32")
    idx = faiss.IndexFlatL2(embedded.shape[1])
    idx.add(embedded)
    return idx


def _inicializar_estado():
    global data, index
    data = _cargar_o_generar()
    index = _construir_indice(data)
    print(f"Índice listo. {len(data)} fragmentos indexados.")


# ==============================
# GESTIÓN DE DOCUMENTOS (admin)
# ==============================

def listar_documentos():
    if len(data) == 0:
        return []
    resumen = data.groupby("archivo").size().reset_index(name="fragmentos")
    return resumen.to_dict(orient="records")


def agregar_documento(path, archivo):
    """Procesa un PDF nuevo y lo incorpora al índice en caliente (reemplaza si ya existía)."""
    global data, index
    # Resumir con el LLM tarda minutos: se hace FUERA del lock para no bloquear
    # las búsquedas ni otras altas mientras tanto.
    nuevas_filas = _procesar_pdf(path, archivo)
    with _lock:
        nuevo_data = pd.concat([data[data["archivo"] != archivo], nuevas_filas], ignore_index=True)
        nuevo_index = _construir_indice(nuevo_data)
        _guardar_db(nuevo_data)
        # Se reemplazan juntos: una búsqueda nunca ve un índice que no corresponde a `data`.
        data, index = nuevo_data, nuevo_index
        return len(nuevas_filas)


def eliminar_documento(archivo):
    global data, index
    with _lock:
        if archivo not in set(data["archivo"]):
            return False
        nuevo_data = data[data["archivo"] != archivo].reset_index(drop=True)
        nuevo_index = _construir_indice(nuevo_data)
        _guardar_db(nuevo_data)
        data, index = nuevo_data, nuevo_index
        ruta = os.path.join(DOCS_FOLDER, archivo)
        if os.path.exists(ruta):
            os.remove(ruta)
        return True


_inicializar_estado()


# ==============================
# BÚSQUEDA Y RESPUESTA
# ==============================

def buscar_y_responder(query, k=7):
    # Instantánea coherente de (data, index): un alta/baja de documento en
    # paralelo los reemplaza a la vez, y leerlos por separado podía cruzar un
    # índice viejo con datos nuevos (IndexError → error 500).
    with _lock:
        data, index = globals()["data"], globals()["index"]

    if len(data) == 0:
        return {
            "respuesta": "Aún no hay documentos cargados. Por favor comuníquese directamente con Clínica Cárdenas Visión.",
            "fuente": "no_encontrado",
            "resultados_encontrados": 0
        }

    embedding_query = embed_model.encode([f"Clínica oftalmología: {query}"])
    embedding_query = np.array(embedding_query, dtype="float32")
    distances, indices = index.search(embedding_query, min(k, len(data)))

    resultados_relevantes = []
    for i, dist in enumerate(distances[0]):
        idx = indices[0][i]
        if idx < 0 or idx >= len(data):
            continue  # FAISS devuelve -1 cuando no hay más vecinos
        if dist < UMBRAL_RELEVANCIA:
            resultados_relevantes.append({
                'resumen': data.iloc[idx]['resumen'],
                'fragmento': data.iloc[idx]['fragmento'],
                'distancia': float(dist)
            })

    if not resultados_relevantes:
        return {
            "respuesta": "No encontré información específica sobre este tema en los documentos de la clínica. Por favor comuníquese directamente con Clínica Cárdenas Visión.",
            "fuente": "no_encontrado",
            "resultados_encontrados": 0
        }

    resultados_relevantes.sort(key=lambda x: x['distancia'])
    # Se usa el fragmento original (no el resumen) para responder: el resumen
    # ya pasó por un LLM y resumir de nuevo sobre un resumen amplifica el riesgo
    # de alucinación. El resumen solo se usa para la búsqueda semántica.
    contextos = "\n\n".join([
        f"Información {i+1}: {r['fragmento']}"
        for i, r in enumerate(resultados_relevantes[:FRAGMENTOS_EN_CONTEXTO])
    ])

    system_prompt = """Eres el asistente virtual de Clínica Cárdenas Visión, especialista en oftalmología y optometría.

Tu único tema es Clínica Cárdenas Visión: sus servicios, sedes, citas, especialistas y protocolos.

Reglas estrictas:
1. Responde ÚNICAMENTE con la información proporcionada en el contexto que te entrega el usuario.
2. NO inventes ni infieras datos, cifras, nombres, horarios o procedimientos que no estén explícitamente en el contexto.
3. Si la pregunta no tiene relación con la clínica (geografía, cultura general, otros temas), NIÉGATE a responderla aunque conozcas la respuesta por tu conocimiento general. Di que solo puedes ayudar con temas de la clínica. Nunca uses conocimiento general ajeno al contexto, bajo ninguna circunstancia.
4. Si el contexto no contiene la respuesta, o es ambiguo, dilo claramente e indica que deben contactar a la clínica directamente. No especules ni "rellenes" la respuesta.
5. Responde SOLO lo que se pregunta, de forma breve y directa: máximo 3-4 líneas o 4 puntos en una lista. No agregues datos del contexto que no se hayan pedido explícitamente, aunque estén disponibles.
6. Responde siempre en español, de manera amable y profesional."""

    user_prompt = f"""Consulta del usuario: "{query}"

Contexto extraído de los documentos de la clínica:
{contextos}

Responde a la consulta siguiendo estrictamente las reglas indicadas. Sé breve: ve directo a lo que se pregunta, sin agregar información adicional no solicitada."""

    try:
        respuesta_final = _chat([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ], max_tokens=250)
    except Exception as e:
        print(f"[ERROR LLM] {type(e).__name__}: {e}")
        respuesta_final = "Error al procesar la consulta. Por favor reformula tu pregunta o contáctenos directamente."

    return {
        "respuesta": respuesta_final,
        "fuente": "pdf",
        "resultados_encontrados": len(resultados_relevantes)
    }


# ==============================
# API FASTAPI
# ==============================

app = FastAPI(title="Chatbot Clínica Cárdenas Visión")

# CORS: en producción restringir a los orígenes de la landing (NF-01 / Fase 8.4).
# CHATBOT_CORS_ORIGINS = lista separada por comas; default = dev local.
_cors_env = os.environ.get("CHATBOT_CORS_ORIGINS", "")
_cors_origins = (
    [o.strip() for o in _cors_env.split(",") if o.strip()]
    if _cors_env
    else ["http://localhost:5173", "http://localhost:4173"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    # El chatbot público no usa cookies ni sesión: sin credenciales.
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)


def _verificar_secreto(x_internal_secret: str = Header(default=None)):
    # Comparación en tiempo constante; sin secreto configurado se rechaza todo.
    if not INTERNAL_SECRET or not x_internal_secret or not hmac.compare_digest(
        x_internal_secret.encode("utf-8"), INTERNAL_SECRET.encode("utf-8")
    ):
        raise HTTPException(status_code=401, detail="No autorizado")


# ---- Límite de consultas por IP (ventana deslizante, en memoria) ----
# Suficiente para una sola instancia.
# Detrás de un proxy (Railway) todas las peticiones llegan desde la IP del proxy:
# poner CHATBOT_TRUST_PROXY=true para leer la IP real de X-Forwarded-For. Sin
# proxy NO se confía en esa cabecera, porque el cliente puede inventarla y
# saltarse el límite.
TRUST_PROXY = os.environ.get("CHATBOT_TRUST_PROXY", "false").lower() == "true"
_rate_lock = threading.Lock()
_rate_hits = defaultdict(deque)


def _ip_cliente(request: Request) -> str:
    if TRUST_PROXY:
        reenviada = request.headers.get("x-forwarded-for")
        if reenviada:
            # El último valor lo añade el proxy más cercano; los anteriores los
            # puede haber escrito el propio cliente.
            return reenviada.split(",")[-1].strip()
    return request.client.host if request.client else "desconocida"


def _verificar_limite(request: Request):
    ahora = time.monotonic()
    ip = _ip_cliente(request)
    with _rate_lock:
        hits = _rate_hits[ip]
        while hits and ahora - hits[0] > RATE_LIMIT_WINDOW:
            hits.popleft()
        if len(hits) >= RATE_LIMIT_MAX:
            raise HTTPException(
                status_code=429,
                detail="Demasiadas consultas. Espera un momento e intenta de nuevo.",
            )
        hits.append(ahora)
        # Evitar que el mapa crezca sin límite con IPs que ya no consultan.
        if len(_rate_hits) > 10_000:
            for clave in [c for c, h in _rate_hits.items() if not h or ahora - h[-1] > RATE_LIMIT_WINDOW]:
                del _rate_hits[clave]


class BusquedaRequest(BaseModel):
    query: str = Field(min_length=1, max_length=MAX_QUERY_CHARS)
    k: int = Field(default=5, ge=1, le=MAX_K)


@app.post("/buscar")
def buscar(body: BusquedaRequest, request: Request):
    _verificar_limite(request)
    consulta = body.query.strip()
    if not consulta:
        raise HTTPException(status_code=422, detail="La consulta está vacía")
    return buscar_y_responder(consulta, k=body.k)


@app.get("/")
def root():
    return {"message": "Chatbot Clínica Cárdenas Visión — activo"}


# ==============================
# ADMINISTRACIÓN DE DOCUMENTOS
# Estos endpoints solo deben ser llamados server-to-server desde el backend
# (que ya valida rol admin), nunca directamente desde el navegador.
# ==============================

@app.get("/admin/documentos")
def admin_listar_documentos(x_internal_secret: str = Header(default=None)):
    _verificar_secreto(x_internal_secret)
    return {"documentos": listar_documentos()}


@app.post("/admin/documentos")
async def admin_subir_documento(file: UploadFile = File(...), x_internal_secret: str = Header(default=None)):
    _verificar_secreto(x_internal_secret)

    nombre = os.path.basename(file.filename or "")
    if not nombre.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos PDF")

    destino = os.path.join(DOCS_FOLDER, nombre)
    # Leer con tope: no cargar en memoria un archivo de tamaño arbitrario.
    contenido = await file.read(MAX_PDF_BYTES + 1)
    if len(contenido) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="El PDF supera el tamaño permitido (15 MB)")
    # La extensión la elige quien sube el archivo; se confirma la firma real.
    if not contenido.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="El archivo no es un PDF válido")
    with open(destino, "wb") as f:
        f.write(contenido)

    try:
        fragmentos = agregar_documento(destino, nombre)
    except Exception as e:
        if os.path.exists(destino):
            os.remove(destino)
        # El detalle técnico va al log, no a la respuesta.
        print(f"[ERROR subir_documento] {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="Error al procesar el PDF")

    return {"archivo": nombre, "fragmentos": fragmentos}


@app.delete("/admin/documentos/{archivo}")
def admin_eliminar_documento(archivo: str, x_internal_secret: str = Header(default=None)):
    _verificar_secreto(x_internal_secret)
    archivo = os.path.basename(archivo)
    if not eliminar_documento(archivo):
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return {"archivo": archivo, "eliminado": True}


# ==============================
# MODO CONSOLA
# ==============================

if __name__ == "__main__":
    import sys
    if "runserver" in sys.argv:
        print("Iniciando servidor en http://localhost:8000")
        uvicorn.run("busqueda_pdf:app", host="0.0.0.0", port=8000, reload=True)
    else:
        print("Asistente listo. Escribe tu consulta o 'salir' para terminar.\n")
        while True:
            query = input("Tú: ").strip()
            if query.lower() in ["salir", "exit", "quit"]:
                print("Hasta luego.")
                break
            resultado = buscar_y_responder(query)
            print(f"\nAsistente: {resultado['respuesta']}")
            if resultado['fuente'] == 'no_encontrado':
                print("   [No encontrado en documentos]")
            print("-" * 60)
