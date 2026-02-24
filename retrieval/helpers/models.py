from pydantic import BaseModel

class ChatThread(BaseModel):
    id: str
    userEmail: str
    name: str
    userName: str
    createdAt: str
    type: str

class ChatMessage(BaseModel):
    id: str
    userEmail: str
    userName: str
    createdAt: str
    type: str
    content: str
    role: str
    threadId: str
    context: str
     
class Response(BaseModel):
    Message: str
    
class ChatHistoryContext(BaseModel):
    role: str
    content: str