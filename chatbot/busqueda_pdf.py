import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import threading
import numpy as np
import faiss
import requests
from groq import Groq
import pandas as pd
import sqlite3
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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

groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
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
    with _lock:
        nuevas_filas = _procesar_pdf(path, archivo)
        data = pd.concat([data[data["archivo"] != archivo], nuevas_filas], ignore_index=True)
        _guardar_db(data)
        index = _construir_indice(data)
        return len(nuevas_filas)


def eliminar_documento(archivo):
    global data, index
    with _lock:
        if archivo not in set(data["archivo"]):
            return False
        data = data[data["archivo"] != archivo].reset_index(drop=True)
        _guardar_db(data)
        index = _construir_indice(data)
        ruta = os.path.join(DOCS_FOLDER, archivo)
        if os.path.exists(ruta):
            os.remove(ruta)
        return True


_inicializar_estado()


# ==============================
# BÚSQUEDA Y RESPUESTA
# ==============================

def buscar_y_responder(query, k=7):
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
        if dist < UMBRAL_RELEVANCIA:
            idx = indices[0][i]
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _verificar_secreto(x_internal_secret: str = Header(default=None)):
    if not INTERNAL_SECRET or x_internal_secret != INTERNAL_SECRET:
        raise HTTPException(status_code=401, detail="No autorizado")


class BusquedaRequest(BaseModel):
    query: str
    k: int = 5


@app.post("/buscar")
def buscar(request: BusquedaRequest):
    return buscar_y_responder(request.query, k=request.k)


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
    contenido = await file.read()
    with open(destino, "wb") as f:
        f.write(contenido)

    try:
        fragmentos = agregar_documento(destino, nombre)
    except Exception as e:
        if os.path.exists(destino):
            os.remove(destino)
        raise HTTPException(status_code=500, detail=f"Error al procesar el PDF: {e}")

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
