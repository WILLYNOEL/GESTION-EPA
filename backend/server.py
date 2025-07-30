from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date
import os
import uuid
from pymongo import MongoClient
from fastapi.responses import FileResponse
import tempfile
import logging
import json
from bson import ObjectId

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ECO PUMP AFRIK - Gestion Intelligente")

# CORS configuration for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'ecopump_afrik')

try:
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Collections
    clients_collection = db.clients
    devis_collection = db.devis
    factures_collection = db.factures
    settings_collection = db.settings
    
    logger.info(f"Connected to MongoDB: {MONGO_URL}/{DB_NAME}")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {e}")
    raise

# Pydantic models
class Client(BaseModel):
    client_id: str = None
    nom: str
    numero_cc: Optional[str] = None
    email: Optional[EmailStr] = None
    telephone: Optional[str] = None
    adresse: Optional[str] = None
    devise: str = "FCFA"  # FCFA or EUR
    type_client: str = "standard"  # standard, revendeur, industriel, institution
    created_at: datetime = None
    updated_at: datetime = None

class ClientUpdate(BaseModel):
    nom: Optional[str] = None
    numero_cc: Optional[str] = None
    email: Optional[EmailStr] = None
    telephone: Optional[str] = None
    adresse: Optional[str] = None
    devise: Optional[str] = None
    type_client: Optional[str] = None

class ArticleDevis(BaseModel):
    item: int
    ref: Optional[str] = None
    designation: str
    quantite: float
    prix_unitaire: float
    total: float

class Devis(BaseModel):
    devis_id: str = None
    numero_devis: str = None
    date_devis: date = None
    client_id: str
    client_nom: str
    articles: List[ArticleDevis]
    sous_total: float
    tva: float = 0.0
    total_ttc: float
    net_a_payer: float
    devise: str
    delai_livraison: Optional[str] = None
    conditions_paiement: Optional[str] = None
    statut: str = "brouillon"  # brouillon, envoyé, accepté, refusé, converti
    created_at: datetime = None
    updated_at: datetime = None

# Helper functions
def generate_client_id():
    return str(uuid.uuid4())

def generate_devis_number(client_nom: str, date_devis: date):
    """Generate devis number in format DEV/CLIENT/DDMMYYYY/NNN"""
    date_str = date_devis.strftime("%d%m%Y")
    client_clean = client_nom.upper()[:10].replace(" ", "")
    
    # Get next sequence number for this client and date
    today_devis_count = devis_collection.count_documents({
        "client_nom": client_nom,
        "date_devis": date_devis.isoformat()
    })
    
    sequence = str(today_devis_count + 1).zfill(3)
    return f"DEV/{client_clean}/{date_str}/{sequence}"

# API Routes

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "ECO PUMP AFRIK API"}

# Clients endpoints
@app.post("/api/clients", response_model=dict)
async def create_client(client: Client):
    try:
        client_data = client.dict()
        client_data["client_id"] = generate_client_id()
        client_data["created_at"] = datetime.now()
        client_data["updated_at"] = datetime.now()
        
        result = clients_collection.insert_one(client_data)
        
        if result.inserted_id:
            client_data["_id"] = str(result.inserted_id)
            return {"success": True, "client": client_data}
        else:
            raise HTTPException(status_code=500, detail="Erreur lors de la création du client")
    except Exception as e:
        logger.error(f"Error creating client: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/clients", response_model=dict)
async def get_clients():
    try:
        clients = list(clients_collection.find({}))
        # Convert ObjectId to string for JSON serialization
        for client in clients:
            client["_id"] = str(client["_id"])
        return {"clients": clients}
    except Exception as e:
        logger.error(f"Error fetching clients: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/clients/{client_id}", response_model=dict)
async def get_client(client_id: str):
    try:
        client = clients_collection.find_one({"client_id": client_id})
        if not client:
            raise HTTPException(status_code=404, detail="Client non trouvé")
        
        client["_id"] = str(client["_id"])
        return {"client": client}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching client: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/clients/{client_id}", response_model=dict)
async def update_client(client_id: str, client_update: ClientUpdate):
    try:
        update_data = {k: v for k, v in client_update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now()
        
        result = clients_collection.update_one(
            {"client_id": client_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Client non trouvé")
        
        updated_client = clients_collection.find_one({"client_id": client_id})
        updated_client["_id"] = str(updated_client["_id"])
        
        return {"success": True, "client": updated_client}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating client: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/clients/{client_id}", response_model=dict)
async def delete_client(client_id: str):
    try:
        # Check if client has devis
        devis_count = devis_collection.count_documents({"client_id": client_id})
        if devis_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Impossible de supprimer le client: {devis_count} devis associé(s)"
            )
        
        result = clients_collection.delete_one({"client_id": client_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Client non trouvé")
        
        return {"success": True, "message": "Client supprimé avec succès"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting client: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Devis endpoints
@app.post("/api/devis", response_model=dict)
async def create_devis(devis: Devis):
    try:
        # Get client info
        client = clients_collection.find_one({"client_id": devis.client_id})
        if not client:
            raise HTTPException(status_code=404, detail="Client non trouvé")
        
        devis_data = devis.dict()
        devis_data["devis_id"] = str(uuid.uuid4())
        devis_data["date_devis"] = date.today()
        devis_data["numero_devis"] = generate_devis_number(devis.client_nom, date.today())
        devis_data["devise"] = client["devise"]
        devis_data["created_at"] = datetime.now()
        devis_data["updated_at"] = datetime.now()
        
        result = devis_collection.insert_one(devis_data)
        
        if result.inserted_id:
            devis_data["_id"] = str(result.inserted_id)
            return {"success": True, "devis": devis_data}
        else:
            raise HTTPException(status_code=500, detail="Erreur lors de la création du devis")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating devis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/devis", response_model=dict)
async def get_devis():
    try:
        devis = list(devis_collection.find({}).sort("created_at", -1))
        for d in devis:
            d["_id"] = str(d["_id"])
        return {"devis": devis}
    except Exception as e:
        logger.error(f"Error fetching devis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/devis/{devis_id}", response_model=dict)
async def get_devis_by_id(devis_id: str):
    try:
        devis = devis_collection.find_one({"devis_id": devis_id})
        if not devis:
            raise HTTPException(status_code=404, detail="Devis non trouvé")
        
        devis["_id"] = str(devis["_id"])
        return {"devis": devis}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching devis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Dashboard stats
@app.get("/api/dashboard/stats", response_model=dict)
async def get_dashboard_stats():
    try:
        stats = {
            "total_clients": clients_collection.count_documents({}),
            "total_devis": devis_collection.count_documents({}),
            "devis_ce_mois": devis_collection.count_documents({
                "created_at": {"$gte": datetime.now().replace(day=1)}
            }),
            "montant_devis_mois": 0,
            "clients_fcfa": clients_collection.count_documents({"devise": "FCFA"}),
            "clients_eur": clients_collection.count_documents({"devise": "EUR"})
        }
        
        # Calculate monthly devis amount
        pipeline = [
            {"$match": {"created_at": {"$gte": datetime.now().replace(day=1)}}},
            {"$group": {"_id": None, "total": {"$sum": "$total_ttc"}}}
        ]
        result = list(devis_collection.aggregate(pipeline))
        if result:
            stats["montant_devis_mois"] = result[0]["total"]
        
        return {"stats": stats}
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)