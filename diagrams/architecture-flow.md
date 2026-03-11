flowchart LR

%% ===== Ingestion path =====
subgraph ING["Ingestion Path - Power Automate and FastAPI"]
    SP["SharePoint Document Library"]
    PA["Power Automate Scheduled Flow"]
    BLOB["Azure Blob Storage<br/>Staging Container"]
    NG["ngrok Tunnel<br/>to Ingestion API"]
    INGAPI["FastAPI Ingestion API<br/>POST /ingest"]
    DI["Azure Document Intelligence<br/>Layout + Table Extraction"]
    CHUNK["LangChain Chunking<br/>+ Azure OpenAI Embeddings"]
    IDX["Azure AI Search Shared Index<br/>Hybrid Semantic + Vector"]
end

%% ===== Retrieval path =====
subgraph RET["Retrieval and Chat Path"]
    USER["End User"]
    SPFX["SPFx ShareGPT ChatBot"]
    RETAPI["FastAPI Retrieval API<br/>POST /get-streamed-response"]
    OAI["Azure OpenAI<br/>Chat + Embedding"]
    GR["Guardrail Validator<br/>Claim Grounding"]
    COSMOS["Azure Cosmos DB<br/>Threads + Messages"]
end

%% ===== Connections =====
SP --> PA
PA -->|Upload files + set source_url metadata| BLOB
PA -->|Call /ingest| NG
NG --> INGAPI
BLOB --> INGAPI
INGAPI --> DI
DI --> CHUNK
CHUNK --> IDX
PA -.->|After ingestion success| BLOB

USER --> SPFX
SPFX --> RETAPI
RETAPI -->|Hybrid search| IDX
RETAPI -->|Generate answer| OAI
RETAPI -->|Validate grounding| GR
RETAPI -->|Persist chat state| COSMOS
RETAPI -->|SSE: status, answer_delta, citation_delta, final| SPFX
SPFX --> USER

%% ===== Colors =====
classDef ingest fill:#D6EAF8,stroke:#1F618D,color:#000
classDef ai fill:#E8DAEF,stroke:#7D3C98,color:#000
classDef storage fill:#D5F5E3,stroke:#1E8449,color:#000
classDef client fill:#FADBD8,stroke:#C0392B,color:#000

class SP,PA,NG,INGAPI ingest
class DI,CHUNK,OAI,GR ai
class BLOB,IDX,COSMOS storage
class USER,SPFX client