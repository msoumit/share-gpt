import os
from dotenv import load_dotenv
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential

load_dotenv()

DI_ENDPOINT = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT")
DI_KEY = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_KEY")
DI_MODEL = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_MODEL")

di_client = DocumentIntelligenceClient(
    endpoint=DI_ENDPOINT,
    credential=AzureKeyCredential(DI_KEY),
)

def analyze_layout(file_bytes: bytes, content_type: str):
    """Run Azure DI prebuilt-layout and return result.as_dict()."""
    poller = di_client.begin_analyze_document(
        model_id=DI_MODEL,
        body=file_bytes,
        content_type=content_type,
    )
    result = poller.result()
    return result.as_dict()

