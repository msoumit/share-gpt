from dotenv import load_dotenv
import os
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

DEFAULT_CHUNK_SIZE = os.getenv("DEFAULT_CHUNK_SIZE")
DEFAULT_CHUNK_OVERLAP = os.getenv("DEFAULT_CHUNK_OVERLAP")

def create_text_splitter():
    return RecursiveCharacterTextSplitter(
        chunk_size=int(DEFAULT_CHUNK_SIZE),
        chunk_overlap=int(DEFAULT_CHUNK_OVERLAP),
        separators=["\n\n", "\n", " ", ""],
    )