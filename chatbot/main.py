import os
import chromadb
from sentence_transformers import SentenceTransformer
from chromadb.utils import embedding_functions
from pypdf import PdfReader

# =========================================================
# 1️⃣ CONFIGURACIÓN BÁSICA
# =========================================================

# API Key de Hugging Face
os.environ["HF_TOKEN"] = "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"

# Inicializa el modelo de embeddings multilingüe de Google
print("Cargando modelo de embeddings...")
model = SentenceTransformer("google/embeddinggemma-300m", token=os.environ["HF_TOKEN"])

# Cliente persistente de Chroma (guarda los embeddings en disco)
client = chromadb.PersistentClient(path="./almacenamiento-chroma/")

# Crea o carga la colección
collection = client.get_or_create_collection(
    name="documentos_secretario",
    embedding_function=embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="google/embeddinggemma-300m"
    )
)

# =========================================================
# 2️⃣ CARGA Y PROCESA LOS PDF
# =========================================================

pdf_paths = [
    "./documentos/Apartado de la linea de frente.pdf",
    # puedes agregar otro PDF aquí, por ejemplo:
    # "./documentos/Manual Administrativo.pdf"
]

def extract_text_from_pdf(path):
    reader = PdfReader(path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

print("Extrayendo texto de los PDFs...")
documents = []
doc_ids = []

for idx, pdf_path in enumerate(pdf_paths):
    if not os.path.exists(pdf_path):
        print(f"⚠️ No se encontró el archivo: {pdf_path}")
        continue
    
    content = extract_text_from_pdf(pdf_path)
    
    # Dividimos en fragmentos para mejorar las búsquedas semánticas
    chunks = [content[i:i+1000] for i in range(0, len(content), 1000)]
    
    for i, chunk in enumerate(chunks):
        doc_id = f"doc_{idx}_chunk_{i}"
        documents.append(chunk)
        doc_ids.append(doc_id)

# =========================================================
# 3️⃣ ALMACENA LOS EMBEDDINGS EN CHROMA
# =========================================================

print(f"Agregando {len(documents)} fragmentos al vector store...")
collection.add(documents=documents, ids=doc_ids)

print("✅ Base de conocimiento cargada correctamente.")

# =========================================================
# 4️⃣ CONSULTAS SEMÁNTICAS
# =========================================================

def consultar(query, n_results=3):
    print(f"\n🧾 Consulta: {query}")
    resultados = collection.query(query_texts=[query], n_results=n_results)
    
    for i, (texto, distancia) in enumerate(zip(resultados['documents'][0], resultados['distances'][0])):
        print(f"\n{i+1}. Distancia: {distancia:.4f}")
        print(texto[:500], "...\n")

# =========================================================
# 5️⃣ EJEMPLOS DE CONSULTAS (ROL: Secretario General)
# =========================================================

print("\nListo para consultas. Ejemplos:\n")

consultar("¿Qué responsabilidades tiene el secretario general según el documento?")
consultar("¿Qué procedimientos o lineamientos establece la empresa en el documento?")
consultar("¿Qué temas se tratan en el apartado de la línea de frente?")
