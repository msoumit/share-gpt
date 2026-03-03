from pydantic import BaseModel
from pydantic import Field
from typing import Any, List, Optional

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
    context: str = ""
    citations: List["Citation"] = Field(default_factory=list)
    guardrail: Optional["Guardrail"] = None

class Citation(BaseModel):
    title: str
    sourceUrl: str
    chunkId: str

class Guardrail(BaseModel):
    verdict: str
    confidence: float
    issues: List[Any] = Field(default_factory=list)
    notes: Optional[str] = None
     
class Response(BaseModel):
    Message: str
    
class ChatHistoryContext(BaseModel):
    role: str
    content: str
