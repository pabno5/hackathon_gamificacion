import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import numpy as np
import faiss
from groq import Groq
import pandas as pd
import sqlite3
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import uuid
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer


# ==============================
# CONFIGURACIÓN
# ==============================

DOCS_FOLDER = "./documentos"
DB_PATH = "documentos.db"
GROQ_MODEL = "llama-3.1-8b-instant"
EMBED_MODEL_NAME = "all-MiniLM-L6-v2"
UMBRAL_RELEVANCIA = 1.5

groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
embed_model = SentenceTransformer(EMBED_MODEL_NAME)


# ==============================
# FUNCIONES AUXILIARES
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

Resumen concreto:"""
    try:
        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.1
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return fragmento[:200]


def cargar_o_generar_resumenes():
    if os.path.exists(DB_PATH):
        conn = sqlite3.connect(DB_PATH)
        data = pd.read_sql('SELECT * FROM documentos', conn)
        conn.close()
        return data

    print("Generando base de conocimiento desde los PDFs...")
    all_fragments = []
    for filename in os.listdir(DOCS_FOLDER):
        if filename.lower().endswith(".pdf"):
            path = os.path.join(DOCS_FOLDER, filename)
            print(f"  Procesando: {filename}")
            all_fragments.extend(extraer_texto_pdf(path))

    summaries = [resumir_fragmento(f) for f in all_fragments]

    df = pd.DataFrame({
        "id": [str(uuid.uuid4()) for _ in range(len(all_fragments))],
        "fragmento": all_fragments,
        "resumen": summaries
    })

    conn = sqlite3.connect(DB_PATH)
    df.to_sql('documentos', conn, if_exists='replace', index=False)
    conn.close()
    return df


# ==============================
# EMBEDDINGS + FAISS
# ==============================

print("Cargando datos...")
data = cargar_o_generar_resumenes()

print("Generando embeddings...")
embedded_docs = embed_model.encode(data["resumen"].tolist(), show_progress_bar=False)
embedded_docs = np.array(embedded_docs, dtype="float32")

index = faiss.IndexFlatL2(embedded_docs.shape[1])
index.add(embedded_docs)
print(f"Índice listo. {len(data)} fragmentos indexados.")


# ==============================
# BÚSQUEDA Y RESPUESTA
# ==============================

def buscar_y_responder(query, k=7):
    embedding_query = embed_model.encode([f"Clínica oftalmología: {query}"])
    embedding_query = np.array(embedding_query, dtype="float32")
    distances, indices = index.search(embedding_query, k)

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
    contextos = "\n\n".join([
        f"Información {i+1}: {r['resumen']}"
        for i, r in enumerate(resultados_relevantes[:3])
    ])

    prompt = f"""Eres el asistente virtual de Clínica Cárdenas Visión, especialista en oftalmología y optometría.

Consulta del usuario: "{query}"

Información encontrada en los documentos de la clínica:
{contextos}

INSTRUCCIONES:
1. Responde ÚNICAMENTE con la información proporcionada arriba
2. Sé específico y concreto — menciona pasos, procedimientos, requisitos exactos
3. Si hay procedimientos específicos, enuméralos claramente
4. NO inventes información que no esté en los documentos
5. Si la información es insuficiente, indica que deben contactar a la clínica directamente
6. Responde en español, de manera amable y profesional

Respuesta:"""

    try:
        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.1
        )
        respuesta_final = response.choices[0].message.content.strip()
    except Exception:
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
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)


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
