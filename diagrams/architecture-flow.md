# ShareGPT Architecture Flow

```mermaid
flowchart LR
    %% ===== Ingestion path =====
    subgraph ING[Ingestion Path (Power Automate + FastAPI)]
        SP[SharePoint Document Library]
        PA[Power Automate Scheduled Flow]
        BLOB[Azure Blob Storage<br/>Staging Container]
        NG[ngrok Tunnel<br/>to Ingestion API]
        INGAPI[FastAPI Ingestion API<br/>POST /ingest]
        DI[Azure Document Intelligence<br/>Layout + Table Extraction]
        CHUNK[LangChain Chunking<br/>+ Azure OpenAI Embeddings]
        IDX[Azure AI Search Shared Index<br/>Hybrid Semantic + Vector]
    end

    SP --> PA
    PA -->|Upload files + set source_url metadata| BLOB
    PA -->|Call /ingest| NG --> INGAPI
    BLOB --> INGAPI
    INGAPI --> DI --> CHUNK --> IDX
    PA -.->|After ingestion success| BLOB

    %% ===== Retrieval path =====
    subgraph RET[Retrieval + Chat Path]
        USER[End User]
        SPFX[SPFx ShareGPT ChatBot]
        RETAPI[FastAPI Retrieval API<br/>POST /get-streamed-response]
        OAI[Azure OpenAI<br/>Chat + Embedding]
        GR[Guardrail Validator<br/>Claim Grounding]
        COSMOS[Azure Cosmos DB<br/>Threads + Messages]
    end

    USER --> SPFX --> RETAPI
    RETAPI -->|Hybrid search| IDX
    RETAPI -->|Generate answer| OAI
    RETAPI -->|Validate grounding| GR
    RETAPI -->|Persist chat state| COSMOS
    RETAPI -->|SSE: status, answer_delta, citation_delta, final| SPFX
    SPFX --> USER
```

