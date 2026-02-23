from azure.storage.blob import BlobServiceClient
import os
import json
from dotenv import load_dotenv

load_dotenv()

AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
CONTAINER = os.getenv("AZURE_STORAGE_CONTAINER")

blob_client = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
container_client = blob_client.get_container_client(CONTAINER)

def get_blobs():
    blob_inputs = []

    # List all blobs inside container
    for blob in container_client.list_blobs():

        # Skip folders (if virtual directory exists)
        if blob.name.endswith("/"):
            continue

        blob_client = container_client.get_blob_client(blob.name)
        file_bytes = blob_client.download_blob().readall()

        blob_inputs.append({
            "filename": blob.name.split("/")[-1],
            "file_bytes": file_bytes,
            "source_url": blob_client.url
        })
    
    return blob_inputs