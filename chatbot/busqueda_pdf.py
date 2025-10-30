import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import numpy as np
import faiss
import ollama
from concurrent.futures import ThreadPoolExecutor
import pandas as pd
import sqlite3
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import uuid
from pypdf import PdfReader
from langchain_ollama import OllamaEmbeddings


# ==============================
# 🧩 CONFIGURACIÓN
# ==============================

PDF_PATH = "./documentos/Organización Información Cárdenas Visión Boyacá.pdf"
DB_PATH = "documentos.db"
EMBED_MODEL = "embeddinggemma:latest"
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
    chunks = [texto[i:i + 800] for i in range(0, len(texto), 800)]
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
Analiza el siguiente texto de protocolos de call center de salud oftalmológica y extrae la información más importante de manera CONCRETA y DIRECTA.

Texto original:
{fragmento}

Resumen CONCRETO (máximo 3-4 líneas):
- Extrae solo los puntos clave, procedimientos específicos, pasos a seguir
- Usa lenguaje claro y directo
- Evita explicaciones largas o lenguaje florido
- Enfócate en lo que el agente del call center necesita SABER o HACER

Ejemplo de estilo CONCRETO:
"Verificar órdenes médicas antes de programar cirugía. Confirmar disponibilidad del quirófano. Contactar paciente 48h antes para confirmar asistencia."

"En emergencias: calmar al paciente, identificar síntomas críticos (dolor intenso, pérdida de visión), derivar inmediatamente al especialista."

Resumen concreto:
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

def buscar_y_responder(query, k=7):
    """
    Búsqueda semántica que devuelve respuestas concretas basadas estrictamente en el PDF.
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
                'fragmento': data.iloc[idx]['fragmento'],
                'distancia': float(dist)
            })
    
    # 3. Generar respuesta CONCRETA basada en la información encontrada
    if resultados_relevantes:
        # Ordenar por relevancia (menor distancia = más relevante)
        resultados_relevantes.sort(key=lambda x: x['distancia'])
        
        # Tomar los 2-3 más relevantes
        contextos = "\n\n".join([f"Información {i+1}: {r['resumen']}" for i, r in enumerate(resultados_relevantes[:3])])
        
        prompt = f"""
Eres un asistente especializado en protocolos de call center de salud oftalmológica.

Consulta del usuario: "{query}"

Información CONCRETA encontrada en los protocolos:
{contextos}

INSTRUCCIONES ESTRICTAS:
1. Responde ÚNICAMENTE con la información proporcionada para esta consulta  "{query}"
2. Sé específico y concreto - menciona pasos, procedimientos, requisitos exactos
3. Si hay procedimientos específicos, enuméralos claramente
4. NO inventes información que no esté en los protocolos
5. NO uses frases como "según el protocolo" o "de acuerdo al documento" - solo da la información directa
6. Si la información es insuficiente, di específicamente qué falta

Respuesta concreta:
"""
        
        fuente = "pdf"
        
    else:
        # NO hay información relevante - ser específico sobre lo que falta
        return {
            "respuesta": "No encontré información específica sobre este tema en los protocolos del call center de oftalmología. Por favor consulta con tu supervisor o revisa los manuales actualizados.",
            "fuente": "no_encontrado",
            "resultados_encontrados": 0,
            "detalles": []
        }
    
    # 4. Generar respuesta
    try:
        respuesta_llm = ollama.generate(
            model=OLLAMA_MODEL,
            prompt=prompt,
            options={'temperature': 0.1, 'num_predict': 200}  # Temperatura más baja = más consistente
        )
        respuesta_final = respuesta_llm["response"].strip()
        
        # Verificar que la respuesta no sea genérica
        palabras_vacias = ["lo siento", "no tengo", "no encuentro", "no está", "no aparece"]
        if any(palabra in respuesta_final.lower() for palabra in palabras_vacias):
            respuesta_final = "La información en los protocolos no es suficientemente específica para esta consulta. Se recomienda contactar al supervisor para procedimientos detallados."
            
    except Exception as e:
        respuesta_final = "Error al procesar la consulta. Por favor reformula tu pregunta."
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
                print(f"   📄 [Información basada en protocolos - {resultado['resultados_encontrados']} referencias encontradas]")
            elif resultado['fuente'] == 'no_encontrado':
                print(f"   ⚠️  [No encontrado en protocolos - consultar con supervisor]")
            
            print("-" * 60)
            
            # Opcional: ver detalles
            if resultado['detalles']:
                mostrar = input("\n¿Ver detalles técnicos? (s/n): ").strip().lower()
                if mostrar == 's':
                    print("\n📋 Fragmentos relevantes:")
                    for i, det in enumerate(resultado['detalles'][:3], 1):
                        print(f"\n{i}. {det['resumen']}")
                        print(f"   (Relevancia: {det['distancia']:.3f})")
                    print("-" * 60 + "\n")