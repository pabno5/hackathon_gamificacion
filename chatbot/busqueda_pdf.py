import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import numpy as np
import faiss
import ollama
import tempfile
from concurrent.futures import ThreadPoolExecutor
import pandas as pd
import sqlite3
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
import re
import uuid
from pypdf import PdfReader
from langchain_ollama import OllamaEmbeddings


# ==============================
# 🧩 CONFIGURACIÓN
# ==============================

PDF_PATH = "./documentos/Protocolos Call Center Salud Oftalmología.pdf"
DB_PATH = "documentos.db"
EMBED_MODEL = "mxbai-embed-large:latest"
OLLAMA_MODEL = "mistral"


# ==============================
# 📄 FUNCIONES AUXILIARES
# ==============================

def extraer_texto_pdf(pdf_path):
    """Extrae todo el texto de un PDF en bloques."""
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"No se encontró el PDF en la ruta: {pdf_path}")
    reader = PdfReader(pdf_path)
    texto = ""
    for page in reader.pages:
        texto += page.extract_text() + "\n"
    # dividir en fragmentos manejables
    chunks = [texto[i:i + 1000] for i in range(0, len(texto), 1000)]
    return chunks


def cargar_o_generar_resumenes():
    """Carga texto del PDF o genera la base si no existe."""
    if os.path.exists(DB_PATH):
        conn = sqlite3.connect(DB_PATH)
        data = pd.read_sql('SELECT * FROM documentos', conn)
        conn.close()
    else:
        print("📄 Generando base de conocimiento desde el PDF...")
        fragments = extraer_texto_pdf(PDF_PATH)

        def resumir_texto(fragmento):
            prompt = f"""
Eres un asistente experto en protocolos de call center de salud oftalmológica. 
Analiza el siguiente texto y crea un resumen conversacional que:

- EXPLIQUE el concepto principal en términos naturales
- MENCIONE el propósito o objetivo clave
- DESTAQUE información práctica relevante
- Use un lenguaje fluido y cotidiano
- Evite repeticiones y frases robóticas
- Sea útil para alguien que trabaja en el call center

Texto original:
{fragmento}

Ejemplos de estilo BUENO:
"Para las cirugías programadas, lo principal es que el equipo verifica las órdenes médicas y coordina toda la atención con el paciente, asegurándose de que todo esté listo para el procedimiento."

"Cuando un paciente llama con emergencias, el protocolo indica primero calmar a la persona, luego clasificar la urgencia según estos síntomas específicos, y finalmente derivar al especialista correspondiente."

"En la gestión de citas, hay que confirmar la asistencia 48 horas antes, verificar que traigan todos los estudios requeridos, y explicarles claramente los preparativos necesarios."

Ahora escribe tu resumen conversacional:
"""
            response = ollama.generate(model=OLLAMA_MODEL, prompt=prompt)
            return response["response"].strip()


        with ThreadPoolExecutor(max_workers=8) as executor:
            summaries = list(executor.map(resumir_texto, fragments))

        df = pd.DataFrame({
            "id": [str(uuid.uuid4()) for _ in range(len(fragments))],
            "fragmento": fragments,
            "resumen": summaries
        })

        conn = sqlite3.connect(DB_PATH)
        df.to_sql('documentos', conn, if_exists='replace', index=False)
        conn.close()
        data = df

    return data


# ==============================
# 🔍 EMBEDDINGS + FAISS
# ==============================

print("📚 Cargando datos...")
data = cargar_o_generar_resumenes()

embeddings = OllamaEmbeddings(model=EMBED_MODEL)

# Embeddings del resumen
embedded_docs = embeddings.embed_documents(data["resumen"].tolist())
embedded_docs = np.array(embedded_docs)

index = faiss.IndexFlatL2(embedded_docs.shape[1])
index.add(embedded_docs)

# ==============================
# 🔎 BÚSQUEDA MEJORADA
# ==============================

def buscar_por_contenido(query, k=5):
    """Búsqueda mejorada con contexto conversacional"""
    
    # Enriquecer la consulta para mejor matching semántico
    prompt_enriquecido = f"""
Consulta del usuario: "{query}"

Reformula esta consulta considerando sinónimos y conceptos relacionados 
con protocolos de call center en salud oftalmológica, gestión de pacientes, 
coordinación médica, y procedimientos operativos.

Reformulación:
"""
    
    try:
        respuesta_reformulacion = ollama.generate(
            model=OLLAMA_MODEL, 
            prompt=prompt_enriquecido,
            options={'temperature': 0.3}
        )
        query_mejorada = respuesta_reformulacion["response"].strip()
    except:
        query_mejorada = query

    # Búsqueda semántica
    embedding_query = embeddings.embed_query(f"Protocolo call center salud: {query_mejorada}")
    embedding_query = np.array([embedding_query])
    distances, indices = index.search(embedding_query, k)

    resultados = data.iloc[indices[0]]
    return resultados, query_mejorada


def generar_respuesta_conversacional(query, resultados):
    """Genera una respuesta natural integrando los resultados"""
    
    contextos = "\n\n".join([f"Contexto {i+1}: {row['resumen']}" 
                            for i, (_, row) in enumerate(resultados.iterrows())])
    
    prompt_respuesta = f"""
Eres un asistente especializado en protocolos de call center de salud oftalmológica.
El usuario pregunta: "{query}"

Usa la siguiente información del manual para responder de forma breve y clara.
- Explica solo lo necesario.
- No repitas frases del texto.
- Evita lenguaje formal o técnico.
- Da una respuesta simple y fácil de entender (máximo 3 líneas).

Contextos relevantes:
{contextos}

Respuesta corta:
"""
    
    try:
        respuesta = ollama.generate(
            model=OLLAMA_MODEL, 
            prompt=prompt_respuesta,
            options={'temperature': 0.3}
        )
        return respuesta["response"].strip()
    except Exception as e:
        # Fallback: devolver los resúmenes originales
        return "\n".join([f"• {row['resumen']}" for _, row in resultados.iterrows()])


# ==============================
# 🚀 API FASTAPI
# ==============================

app = FastAPI()

class BusquedaRequest(BaseModel):
    query: str
    k: int = 7


@app.post("/buscar")
def buscar(request: BusquedaRequest):
    resultados, query_mejorada = buscar_por_contenido(request.query, k=request.k)
    respuesta_conversacional = generar_respuesta_conversacional(request.query, resultados)
    
    return {
        "respuesta": respuesta_conversacional,
        "query_mejorada": query_mejorada,
        "resultados_detallados": resultados[["id", "resumen"]].to_dict(orient="records")
    }


# ==============================
# 🧠 MODO CONSOLA MEJORADO
# ==============================

if __name__ == "__main__":
    import sys
    if "runserver" in sys.argv:
        uvicorn.run("busqueda_pdf:app", host="0.0.0.0", port=8000, reload=True)
    else:
        print("📘 Asistente sobre PDF listo. Escribe tu consulta o 'salir' para terminar.\n")
        while True:
            query = input("Tú: ").strip()
            if query.lower() in ["salir", "exit", "quit"]:
                print("👋 Hasta luego.")
                break

            resultados, query_mejorada = buscar_por_contenido(query)
            respuesta = generar_respuesta_conversacional(query, resultados)
            
            print(f"\n🤖 Asistente: {respuesta}\n")
            print("-" * 60)
            
            # Opcional: mostrar detalles de búsqueda
            mostrar_detalles = input("\n¿Ver detalles de búsqueda? (s/n): ").strip().lower()
            if mostrar_detalles == 's':
                print(f"\n🔍 Query mejorada: {query_mejorada}")
                print("\n📋 Fragmentos relevantes encontrados:")
                for i, (_, row) in enumerate(resultados.iterrows()):
                    print(f"{i+1}. {row['resumen']}")
                print("-" * 60 + "\n")