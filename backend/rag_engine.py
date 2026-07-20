import os
import logging
from typing import List
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
from langchain_community.document_loaders import TextLoader, DirectoryLoader

logger = logging.getLogger("sdlc-rag")

class CodeRAG:
    def __init__(self, persist_directory: str = "./faiss_index"):
        self.persist_directory = persist_directory
        self.embeddings = None
        self.vector_store = None
        
        api_key = os.getenv("OPENAI_API_KEY", "")
        if not api_key:
            api_key = "sk-dummy-key-for-initialization"

        try:
            self.embeddings = OpenAIEmbeddings(openai_api_key=api_key)
        except Exception as e:
            logger.warning(f"Could not initialize OpenAIEmbeddings: {e}")
            self.embeddings = None

        if os.path.exists(persist_directory) and self.embeddings:
            try:
                self.vector_store = FAISS.load_local(
                    persist_directory, 
                    self.embeddings,
                    allow_dangerous_deserialization=True
                )
                logger.info(f"Loaded existing vector store from {persist_directory}")
            except Exception as e:
                logger.error(f"Error loading vector store: {e}")


    def index_directory(self, directory_path: str):
        """Indexes all text/code files in the given directory."""
        logger.info(f"Indexing directory: {directory_path}")
        
        # Define loaders for different file types
        loaders = [
            DirectoryLoader(directory_path, glob="**/*.py", loader_cls=TextLoader, exclude=["**/node_modules/**", "**/__pycache__/**", "**/.git/**"]),
            DirectoryLoader(directory_path, glob="**/*.js", loader_cls=TextLoader, exclude=["**/node_modules/**", "**/__pycache__/**", "**/.git/**"]),
            DirectoryLoader(directory_path, glob="**/*.jsx", loader_cls=TextLoader, exclude=["**/node_modules/**", "**/__pycache__/**", "**/.git/**"]),
            DirectoryLoader(directory_path, glob="**/*.md", loader_cls=TextLoader, exclude=["**/node_modules/**", "**/__pycache__/**", "**/.git/**"]),
        ]
        
        documents = []
        for loader in loaders:
            try:
                documents.extend(loader.load())
            except Exception as e:
                logger.warning(f"Error loading files with loader: {e}")

        if not documents:
            logger.warning("No documents found to index.")
            return

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=100
        )
        texts = text_splitter.split_documents(documents)
        
        if self.vector_store:
            self.vector_store.add_documents(texts)
        else:
            self.vector_store = FAISS.from_documents(
                documents=texts,
                embedding=self.embeddings
            )
        
        self.vector_store.save_local(self.persist_directory)
        logger.info(f"Successfully indexed {len(texts)} chunks.")

    def query(self, query_text: str, k: int = 5) -> List[Document]:
        """Queries the vector store for relevant documents."""
        if not self.vector_store:
            logger.warning("Vector store not initialized. Index something first.")
            return []
        
        return self.vector_store.similarity_search(query_text, k=k)

    def get_context(self, query_text: str) -> str:
        """Returns a concatenated string of relevant code chunks."""
        docs = self.query(query_text)
        if not docs:
            return "No relevant code context found."
        
        context = ""
        for doc in docs:
            context += f"\n--- File: {doc.metadata.get('source', 'Unknown')} ---\n"
            context += doc.page_content + "\n"
        return context
