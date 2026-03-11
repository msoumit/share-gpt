# ShareGPT Architecture Flow

%%{init: {"theme":"base","themeVariables":{
"primaryColor":"#0B3D91",
"primaryTextColor":"#ffffff",
"primaryBorderColor":"#0B3D91",
"lineColor":"#6FA8DC",
"secondaryColor":"#E8F1FF",
"tertiaryColor":"#F5F5F5"
}}}%%

flowchart LR

%% ===== Ingestion path =====
subgraph ING["Ingestion Path - Power Automate and FastAPI"]
    SP["SharePoint Document Library"]
    PA["Power Automate Scheduled Flow"]
    BLOB["Azure Blob Storage - Staging Container"]
    NG["ngrok Tunnel to Ingestion API"]
    INGAPI["FastAPI Ingestion API - POST /ingest"]
    DI["Azure Document Intelligence - Layout + Table Extraction"]
    CHUNK["LangChain Chunking + Azure OpenAI Embeddings"]
    IDX["Azure AI Search Shared Index - Hybrid Semantic + Vector"]
end

%% ===== Retrieval path =====
subgraph RET["Retrieval and Chat Path"]
    USER["End User"]
    SPFX["SPFx ShareGPT ChatBot"]
    RETAPI["FastAPI Retrieval API - POST /get-streamed-response"]
    OAI["Azure OpenAI - Chat + Embedding"]
    GR["Guardrail Validator - Claim Grounding"]
    COSMOS["Azure Cosmos DB - Threads + Messages"]
end

%% Connections
SP --> PA
PA -->|Upload files + metadata| BLOB
PA -->|Call /ingest| NG --> INGAPI
BLOB --> INGAPI
INGAPI --> DI --> CHUNK --> IDX

USER --> SPFX --> RETAPI
RETAPI -->|Hybrid search| IDX
RETAPI -->|Generate answer| OAI
RETAPI -->|Validate grounding| GR
RETAPI -->|Persist chat state| COSMOS
RETAPI -->|SSE stream| SPFX
SPFX --> USER

%% ===== Styling =====
classDef ingest fill:#D6EAF8,stroke:#1F618D,color:#000;
classDef ai fill:#E8DAEF,stroke:#7D3C98,color:#000;
classDef storage fill:#D5F5E3,stroke:#1E8449,color:#000;
classDef client fill:#FADBD8,stroke:#C0392B,color:#000;

class SP,PA,NG,INGAPI ingest
class DI,CHUNK,OAI,GR ai
class BLOB,IDX,COSMOS storage
class USER,SPFX client