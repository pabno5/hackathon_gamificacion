import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import numpy as np
import faiss
import ollama
from concurrent.futures import ThreadPoolExecutor
import pandas as pd
import sqlite3
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # ← IMPORTAR CORS
from pydantic import BaseModel
import uvicorn
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
UMBRAL_RELEVANCIA = 1.5  # Distancia máxima para considerar un resultado relevante


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
# 🔎 BÚSQUEDA Y RESPUESTA MEJORADA
# ==============================

def buscar_y_responder(query, k=5):
    """
    Búsqueda semántica que devuelve UNA respuesta única.
    Primero busca en el PDF, si no encuentra info relevante, usa conocimiento general.
    """
    
    # 1. Búsqueda semántica
    embedding_query = embeddings.embed_query(f"Protocolo call center salud: {query}")
    embedding_query = np.array([embedding_query])
    distances, indices = index.search(embedding_query, k)
    
    # 2. Filtrar por relevancia
    resultados_relevantes = []
    for i, dist in enumerate(distances[0]):
        if dist < UMBRAL_RELEVANCIA:
            idx = indices[0][i]
            resultados_relevantes.append({
                'resumen': data.iloc[idx]['resumen'],
                'distancia': float(dist)
            })
    
    # 3. Generar respuesta única
    if resultados_relevantes:
        # HAY información relevante en el PDF
        contextos = "\n\n".join([f"- {r['resumen']}" for r in resultados_relevantes[:3]])
        
        prompt = f"""
Eres un asistente de call center de salud oftalmológica. Un usuario pregunta:
"{query}"

Basándote ÚNICAMENTE en esta información del manual:
{contextos}

Genera UNA respuesta clara y concisa que:
- Sea directa y específica (2-4 líneas máximo)
- Use lenguaje natural y fluido
- NO copies textualmente del documento
- Integre la información de forma coherente
- Si hay varios pasos, enuméralos brevemente

Respuesta:
"""
        
        fuente = "pdf"
        
    else:
        # NO hay información relevante, usar conocimiento general
        prompt = f"""
Eres un asistente de call center de salud oftalmológica. Un usuario pregunta:
"{query}"

No encontraste información específica en el manual de protocolos, así que responde basándote en:
- Mejores prácticas de atención al cliente en salud
- Procedimientos estándar de call centers médicos
- Tu conocimiento general sobre oftalmología

Genera UNA respuesta útil y profesional que:
- Sea práctica y aplicable
- Tenga 2-4 líneas
- Mencione que es una recomendación general (ya que no está en el manual)

Respuesta:
"""
        
        fuente = "conocimiento_general"
    
    # 4. Generar respuesta
    try:
        respuesta_llm = ollama.generate(
            model=OLLAMA_MODEL,
            prompt=prompt,
            options={'temperature': 0.4, 'num_predict': 200}
        )
        respuesta_final = respuesta_llm["response"].strip()
    except Exception as e:
        respuesta_final = "Lo siento, hubo un error al procesar tu consulta. ¿Podrías reformularla?"
        fuente = "error"
    
    return {
        "respuesta": respuesta_final,
        "fuente": fuente,
        "resultados_encontrados": len(resultados_relevantes),
        "detalles": resultados_relevantes if resultados_relevantes else []
    }


# ==============================
# 🚀 API FASTAPI CON CORS
# ==============================

app = FastAPI()

# ← CONFIGURAR CORS AQUÍ
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especifica los dominios exactos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BusquedaRequest(BaseModel):
    query: str
    k: int = 5


@app.post("/buscar")
def buscar(request: BusquedaRequest):
    resultado = buscar_y_responder(request.query, k=request.k)
    return resultado


@app.get("/")
def root():
    return {"message": "API de búsqueda en PDF funcionando correctamente"}


# ==============================
# 🧠 MODO CONSOLA
# ==============================

if __name__ == "__main__":
    import sys
    if "runserver" in sys.argv:
        print("🚀 Iniciando servidor en http://localhost:8000")
        print("📖 Documentación: http://localhost:8000/docs")
        uvicorn.run("busqueda_pdf:app", host="0.0.0.0", port=8000, reload=True)
    else:
        print("📘 Asistente sobre PDF listo. Escribe tu consulta o 'salir' para terminar.\n")
        while True:
            query = input("Tú: ").strip()
            if query.lower() in ["salir", "exit", "quit"]:
                print("👋 Hasta luego.")
                break

            resultado = buscar_y_responder(query)
            
            # Mostrar respuesta principal
            print(f"\n🤖 Asistente: {resultado['respuesta']}")
            
            # Indicador de fuente
            if resultado['fuente'] == 'pdf':
                print(f"   📄 [Basado en el manual - {resultado['resultados_encontrados']} referencias]")
            elif resultado['fuente'] == 'conocimiento_general':
                print(f"   💡 [Recomendación general - no encontrado en el manual]")
            
            print("-" * 60)
            
            # Opcional: ver detalles
            if resultado['detalles']:
                mostrar = input("\n¿Ver fragmentos del manual? (s/n): ").strip().lower()
                if mostrar == 's':
                    print("\n📋 Fragmentos relevantes:")
                    for i, det in enumerate(resultado['detalles'][:3], 1):
                        print(f"\n{i}. {det['resumen']}")
                        print(f"   (Relevancia: {det['distancia']:.3f})")
                    print("-" * 60 + "\n")