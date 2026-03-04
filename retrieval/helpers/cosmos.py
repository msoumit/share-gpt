from dotenv import load_dotenv
import os
from typing import List
from azure.cosmos import CosmosClient
from helpers.models import ChatThread, ChatMessage
from datetime import datetime, timezone
import uuid

load_dotenv()

COSMOS_ENDPOINT = os.getenv("AZURE_COSMOS_ENDPOINT")
COSMOS_KEY = os.getenv("AZURE_COSMOS_KEY")
COSMOS_DATABASE = os.getenv("AZURE_COSMOS_DATABASE")
COSMOS_CONTAINER = os.getenv("AZURE_COSMOS_CONTAINER")

cosmos_client = CosmosClient(COSMOS_ENDPOINT, COSMOS_KEY)
database = cosmos_client.get_database_client(COSMOS_DATABASE)
container = database.get_container_client(COSMOS_CONTAINER)

def read_chat_thread_items(user_email, type) -> List[ChatThread]:
    
    query = "SELECT * FROM c  WHERE c.type=@type ORDER BY c.createdAt DESC"
    parameters = [
        {"name": "@type", "value": type}
    ]
    items = container.query_items(
        query=query,
        parameters=parameters,
        partition_key=user_email,
        enable_cross_partition_query=False
    )

    threads = [ChatThread(**item) for item in items]
    
    return threads

def create_chat_thread_item(item: dict) -> ChatThread:

    user_email = item.get("userEmail")
    if not user_email:
        raise ValueError("userEmail is required")
    
    created = container.create_item(
        body=item
    )
    return ChatThread(**created)

def update_chat_thread_item(thread_id, user_email, name) -> ChatThread:
    
    item = container.read_item(
        item=thread_id,
        partition_key=user_email
    )
    
    item["name"] = name
    
    response = container.replace_item(item=thread_id, body=item)
    updated = ChatThread(**response)
    
    return updated

def delete_chat_thread_item(item_id, user_email) -> None:
    
    delete_chat_message_items(item_id, user_email)
    
    container.delete_item(
        item=item_id,
        partition_key=user_email
    )

def read_chat_message_items(user_email, id, type) -> List[ChatMessage]:
    
    query = "SELECT * FROM c  WHERE c.threadId = @id AND c.type=@type ORDER BY c.createdAt ASC"
    parameters = [
        {"name": "@id", "value": id},
        {"name": "@type", "value": type}
    ]
    items = container.query_items(
        query=query,
        parameters=parameters,
        partition_key=user_email,
        enable_cross_partition_query=False
    )

    messages = [ChatMessage(**item) for item in items]
    
    return messages

def create_chat_message_items(user_obj: dict, assistant_obj: dict, context: str) -> None:
    current_time_utc = datetime.now(timezone.utc).isoformat()[:-9] + 'Z'
    user_message_id = str(uuid.uuid4())
    user_obj["id"] = user_message_id
    user_obj["createdAt"] = current_time_utc
    user_obj["citations"] = []
    user_obj["guardrail"] = None
    container.create_item(body=user_obj)

    current_time_utc = datetime.now(timezone.utc).isoformat()[:-9] + 'Z'
    assistant_reply_id = str(uuid.uuid4())
    assistant_reply_data = {
        "id": assistant_reply_id,
        "userEmail": user_obj.get("userEmail"),
        "userName": user_obj.get("userName"),
        "createdAt": current_time_utc,
        "type": "CHAT_MESSAGE",
        "content": assistant_obj.get("answer"),
        "role": "assistant",
        "threadId": user_obj.get("threadId"),
        "context": context,
        "citations": assistant_obj.get("citations"),
        "guardrail": assistant_obj.get("guardrail")
    }
    container.create_item(body=assistant_reply_data)

def delete_chat_message_items(thread_id, user_email) -> None:
    
    query = "SELECT * FROM c  WHERE c.threadId = @threadId AND c.type = @type"
    parameters = [
        {"name": "@threadId", "value": thread_id},
        {"name": "@type", "value": "CHAT_MESSAGE"},
    ]
    items = container.query_items(
        query=query,
        parameters=parameters,
        partition_key=user_email,
        enable_cross_partition_query=False
    )
    
    messages = list(items)
    
    for message in messages:
        container.delete_item(
            item=message['id'],
            partition_key=user_email
        )


    
