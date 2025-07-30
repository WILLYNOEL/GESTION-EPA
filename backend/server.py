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
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors

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
    fournisseurs_collection = db.fournisseurs
    devis_collection = db.devis
    factures_collection = db.factures
    achats_collection = db.achats
    stock_collection = db.stock
    paiements_collection = db.paiements
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
    numero_rc: Optional[str] = None
    nif: Optional[str] = None
    email: Optional[EmailStr] = None
    telephone: Optional[str] = None
    adresse: Optional[str] = None
    devise: str = "FCFA"  # FCFA or EUR
    type_client: str = "standard"  # standard, revendeur, industriel, institution
    conditions_paiement: Optional[str] = None
    created_at: str = None
    updated_at: str = None

class Fournisseur(BaseModel):
    fournisseur_id: str = None
    nom: str
    numero_cc: Optional[str] = None
    numero_rc: Optional[str] = None
    email: Optional[EmailStr] = None
    telephone: Optional[str] = None
    adresse: Optional[str] = None
    devise: str = "FCFA"
    conditions_paiement: Optional[str] = None
    created_at: str = None
    updated_at: str = None

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
    date_devis: str = None
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
    mode_livraison: Optional[str] = None
    reference_commande: Optional[str] = None
    statut: str = "brouillon"  # brouillon, envoyé, accepté, refusé, converti
    created_at: str = None
    updated_at: str = None

class Facture(BaseModel):
    facture_id: str = None
    numero_facture: str = None
    date_facture: str = None
    devis_id: Optional[str] = None
    client_id: str
    client_nom: str
    articles: List[ArticleDevis]
    sous_total: float
    tva: float = 0.0
    total_ttc: float
    net_a_payer: float
    devise: str
    echeances: Optional[List[dict]] = None
    statut_paiement: str = "impayé"  # impayé, partiel, payé
    montant_paye: float = 0.0
    delai_livraison: Optional[str] = None
    conditions_paiement: Optional[str] = None
    mode_livraison: Optional[str] = None
    reference_commande: Optional[str] = None
    statut: str = "émise"  # émise, envoyée, payée, annulée
    created_at: str = None
    updated_at: str = None

class ArticleStock(BaseModel):
    article_id: str = None
    ref: str
    designation: str
    quantite_stock: float = 0.0
    stock_minimum: float = 0.0
    prix_achat_moyen: float = 0.0
    prix_vente: float = 0.0
    fournisseur_principal: Optional[str] = None
    emplacement: Optional[str] = None
    created_at: str = None
    updated_at: str = None

class MouvementStock(BaseModel):
    mouvement_id: str = None
    article_id: str
    type_mouvement: str  # entrée, sortie
    quantite: float
    prix_unitaire: float
    document_type: str  # devis, facture, achat, inventaire
    document_id: str
    motif: Optional[str] = None
    created_at: str = None

class Achat(BaseModel):
    achat_id: str = None
    numero_bon_commande: str = None
    date_commande: str = None
    fournisseur_id: str
    fournisseur_nom: str
    articles: List[ArticleDevis]
    sous_total: float
    tva: float = 0.0
    total_ttc: float
    statut: str = "commandé"  # commandé, reçu, facturé
    date_reception: Optional[str] = None
    numero_bl: Optional[str] = None
    created_at: str = None
    updated_at: str = None

class Paiement(BaseModel):
    paiement_id: str = None
    type_document: str  # facture, achat
    document_id: str
    client_id: Optional[str] = None
    fournisseur_id: Optional[str] = None
    montant: float
    devise: str
    mode_paiement: str  # espèce, virement, mobile_money
    reference_paiement: Optional[str] = None
    date_paiement: str = None
    statut: str = "validé"
    created_at: str = None

# Helper functions
def generate_id():
    return str(uuid.uuid4())

def generate_numero(prefix: str, client_nom: str = None, date_doc: date = None):
    """Generate document number in format PREFIX/CLIENT/DDMMYYYY/NNN"""
    if date_doc is None:
        date_doc = date.today()
    
    date_str = date_doc.strftime("%d%m%Y")
    
    if client_nom:
        client_clean = client_nom.upper()[:10].replace(" ", "")
        base_format = f"{prefix}/{client_clean}/{date_str}"
    else:
        base_format = f"{prefix}/{date_str}"
    
    # Get next sequence number
    if prefix == "DEV":
        collection = devis_collection
        query_field = "numero_devis"
    elif prefix == "FACT":
        collection = factures_collection
        query_field = "numero_facture"
    elif prefix == "BC":
        collection = achats_collection
        query_field = "numero_bon_commande"
    else:
        return f"{base_format}/001"
    
    # Count existing documents with same pattern
    pattern = f"{base_format}/"
    count = collection.count_documents({query_field: {"$regex": f"^{pattern}"}})
    
    sequence = str(count + 1).zfill(3)
    return f"{base_format}/{sequence}"

def calculate_tva(montant: float, taux_tva: float = 0.18):
    """Calculate TVA (18% by default)"""
    return montant * taux_tva

# API Routes
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "ECO PUMP AFRIK API"}

# ========================================
# CLIENTS ENDPOINTS
# ========================================
@app.post("/api/clients", response_model=dict)
async def create_client(client: Client):
    try:
        client_data = client.dict()
        client_data["client_id"] = generate_id()
        client_data["created_at"] = datetime.now().isoformat()
        client_data["updated_at"] = datetime.now().isoformat()
        
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
async def update_client(client_id: str, client_update: dict):
    try:
        client_update["updated_at"] = datetime.now().isoformat()
        
        result = clients_collection.update_one(
            {"client_id": client_id},
            {"$set": client_update}
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
        # Check if client has devis or factures
        devis_count = devis_collection.count_documents({"client_id": client_id})
        factures_count = factures_collection.count_documents({"client_id": client_id})
        
        if devis_count > 0 or factures_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Impossible de supprimer le client: {devis_count} devis et {factures_count} factures associé(s)"
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

# ========================================
# FOURNISSEURS ENDPOINTS
# ========================================
@app.post("/api/fournisseurs", response_model=dict)
async def create_fournisseur(fournisseur: Fournisseur):
    try:
        fournisseur_data = fournisseur.dict()
        fournisseur_data["fournisseur_id"] = generate_id()
        fournisseur_data["created_at"] = datetime.now().isoformat()
        fournisseur_data["updated_at"] = datetime.now().isoformat()
        
        result = fournisseurs_collection.insert_one(fournisseur_data)
        
        if result.inserted_id:
            fournisseur_data["_id"] = str(result.inserted_id)
            return {"success": True, "fournisseur": fournisseur_data}
        else:
            raise HTTPException(status_code=500, detail="Erreur lors de la création du fournisseur")
    except Exception as e:
        logger.error(f"Error creating fournisseur: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/fournisseurs", response_model=dict)
async def get_fournisseurs():
    try:
        fournisseurs = list(fournisseurs_collection.find({}))
        for fournisseur in fournisseurs:
            fournisseur["_id"] = str(fournisseur["_id"])
        return {"fournisseurs": fournisseurs}
    except Exception as e:
        logger.error(f"Error fetching fournisseurs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# DEVIS ENDPOINTS
# ========================================
@app.post("/api/devis", response_model=dict)
async def create_devis(devis: Devis):
    try:
        # Get client info
        client = clients_collection.find_one({"client_id": devis.client_id})
        if not client:
            raise HTTPException(status_code=404, detail="Client non trouvé")
        
        devis_data = devis.dict()
        devis_data["devis_id"] = generate_id()
        devis_data["date_devis"] = date.today().isoformat()
        devis_data["numero_devis"] = generate_numero("DEV", devis.client_nom, date.today())
        devis_data["devise"] = client["devise"]
        devis_data["created_at"] = datetime.now().isoformat()
        devis_data["updated_at"] = datetime.now().isoformat()
        
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

@app.post("/api/devis/{devis_id}/convert-to-facture", response_model=dict)
async def convert_devis_to_facture(devis_id: str):
    try:
        # Get devis
        devis = devis_collection.find_one({"devis_id": devis_id})
        if not devis:
            raise HTTPException(status_code=404, detail="Devis non trouvé")
        
        # Create facture from devis
        facture_data = {
            "facture_id": generate_id(),
            "numero_facture": generate_numero("FACT", devis["client_nom"], date.today()),
            "date_facture": date.today().isoformat(),
            "devis_id": devis_id,
            "client_id": devis["client_id"],
            "client_nom": devis["client_nom"],
            "articles": devis["articles"],
            "sous_total": devis["sous_total"],
            "tva": devis["tva"],
            "total_ttc": devis["total_ttc"],
            "net_a_payer": devis["net_a_payer"],
            "devise": devis["devise"],
            "delai_livraison": devis.get("delai_livraison"),
            "conditions_paiement": devis.get("conditions_paiement"),
            "mode_livraison": devis.get("mode_livraison"),
            "reference_commande": devis.get("reference_commande"),
            "statut": "émise",
            "statut_paiement": "impayé",
            "montant_paye": 0.0,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        result = factures_collection.insert_one(facture_data)
        
        if result.inserted_id:
            # Update devis status
            devis_collection.update_one(
                {"devis_id": devis_id},
                {"$set": {"statut": "converti", "updated_at": datetime.now().isoformat()}}
            )
            
            facture_data["_id"] = str(result.inserted_id)
            return {"success": True, "facture": facture_data}
        else:
            raise HTTPException(status_code=500, detail="Erreur lors de la conversion")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error converting devis to facture: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# FACTURES ENDPOINTS
# ========================================
@app.post("/api/factures", response_model=dict)
async def create_facture(facture: Facture):
    try:
        # Get client info
        client = clients_collection.find_one({"client_id": facture.client_id})
        if not client:
            raise HTTPException(status_code=404, detail="Client non trouvé")
        
        facture_data = facture.dict()
        facture_data["facture_id"] = generate_id()
        facture_data["date_facture"] = date.today().isoformat()
        facture_data["numero_facture"] = generate_numero("FACT", facture.client_nom, date.today())
        facture_data["devise"] = client["devise"]
        facture_data["created_at"] = datetime.now().isoformat()
        facture_data["updated_at"] = datetime.now().isoformat()
        
        result = factures_collection.insert_one(facture_data)
        
        if result.inserted_id:
            facture_data["_id"] = str(result.inserted_id)
            return {"success": True, "facture": facture_data}
        else:
            raise HTTPException(status_code=500, detail="Erreur lors de la création de la facture")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating facture: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/factures", response_model=dict)
async def get_factures():
    try:
        factures = list(factures_collection.find({}).sort("created_at", -1))
        for f in factures:
            f["_id"] = str(f["_id"])
        return {"factures": factures}
    except Exception as e:
        logger.error(f"Error fetching factures: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# STOCK ENDPOINTS
# ========================================
@app.get("/api/stock", response_model=dict)
async def get_stock():
    try:
        articles = list(stock_collection.find({}))
        for article in articles:
            article["_id"] = str(article["_id"])
        return {"articles": articles}
    except Exception as e:
        logger.error(f"Error fetching stock: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/stock", response_model=dict)
async def create_article_stock(article: ArticleStock):
    try:
        article_data = article.dict()
        article_data["article_id"] = generate_id()
        article_data["created_at"] = datetime.now().isoformat()
        article_data["updated_at"] = datetime.now().isoformat()
        
        result = stock_collection.insert_one(article_data)
        
        if result.inserted_id:
            article_data["_id"] = str(result.inserted_id)
            return {"success": True, "article": article_data}
        else:
            raise HTTPException(status_code=500, detail="Erreur lors de la création de l'article")
    except Exception as e:
        logger.error(f"Error creating article: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stock/alerts", response_model=dict)
async def get_stock_alerts():
    try:
        # Find articles with stock below minimum
        alerts = list(stock_collection.find({
            "$expr": {"$lt": ["$quantite_stock", "$stock_minimum"]}
        }))
        
        for alert in alerts:
            alert["_id"] = str(alert["_id"])
        
        return {"alerts": alerts}
    except Exception as e:
        logger.error(f"Error fetching stock alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# PAIEMENTS ENDPOINTS
# ========================================
@app.post("/api/paiements", response_model=dict)
async def create_paiement(paiement: Paiement):
    try:
        paiement_data = paiement.dict()
        paiement_data["paiement_id"] = generate_id()
        paiement_data["date_paiement"] = date.today().isoformat()
        paiement_data["created_at"] = datetime.now().isoformat()
        
        result = paiements_collection.insert_one(paiement_data)
        
        if result.inserted_id:
            # Update facture payment status if it's a facture payment
            if paiement.type_document == "facture":
                # Get current facture
                facture = factures_collection.find_one({"facture_id": paiement.document_id})
                if facture:
                    new_montant_paye = facture.get("montant_paye", 0) + paiement.montant
                    
                    if new_montant_paye >= facture["total_ttc"]:
                        statut_paiement = "payé"
                    else:
                        statut_paiement = "partiel"
                    
                    factures_collection.update_one(
                        {"facture_id": paiement.document_id},
                        {"$set": {
                            "montant_paye": new_montant_paye,
                            "statut_paiement": statut_paiement,
                            "updated_at": datetime.now().isoformat()
                        }}
                    )
            
            paiement_data["_id"] = str(result.inserted_id)
            return {"success": True, "paiement": paiement_data}
        else:
            raise HTTPException(status_code=500, detail="Erreur lors de l'enregistrement du paiement")
    except Exception as e:
        logger.error(f"Error creating paiement: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/paiements", response_model=dict)
async def get_paiements():
    try:
        paiements = list(paiements_collection.find({}).sort("created_at", -1))
        for p in paiements:
            p["_id"] = str(p["_id"])
        return {"paiements": paiements}
    except Exception as e:
        logger.error(f"Error fetching paiements: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# DASHBOARD STATS
# ========================================
@app.get("/api/dashboard/stats", response_model=dict)
async def get_dashboard_stats():
    try:
        current_month_start = datetime.now().replace(day=1)
        
        stats = {
            "total_clients": clients_collection.count_documents({}),
            "total_fournisseurs": fournisseurs_collection.count_documents({}),
            "total_devis": devis_collection.count_documents({}),
            "total_factures": factures_collection.count_documents({}),
            "devis_ce_mois": devis_collection.count_documents({
                "created_at": {"$gte": current_month_start.isoformat()}
            }),
            "factures_ce_mois": factures_collection.count_documents({
                "created_at": {"$gte": current_month_start.isoformat()}
            }),
            "montant_devis_mois": 0,
            "montant_factures_mois": 0,
            "montant_a_encaisser": 0,
            "clients_fcfa": clients_collection.count_documents({"devise": "FCFA"}),
            "clients_eur": clients_collection.count_documents({"devise": "EUR"}),
            "stock_alerts": stock_collection.count_documents({
                "$expr": {"$lt": ["$quantite_stock", "$stock_minimum"]}
            })
        }
        
        # Calculate monthly amounts
        devis_pipeline = [
            {"$match": {"created_at": {"$gte": current_month_start.isoformat()}}},
            {"$group": {"_id": None, "total": {"$sum": "$total_ttc"}}}
        ]
        devis_result = list(devis_collection.aggregate(devis_pipeline))
        if devis_result:
            stats["montant_devis_mois"] = devis_result[0]["total"]
        
        factures_pipeline = [
            {"$match": {"created_at": {"$gte": current_month_start.isoformat()}}},
            {"$group": {"_id": None, "total": {"$sum": "$total_ttc"}}}
        ]
        factures_result = list(factures_collection.aggregate(factures_pipeline))
        if factures_result:
            stats["montant_factures_mois"] = factures_result[0]["total"]
        
        # Calculate amount to collect (unpaid factures)
        encaissement_pipeline = [
            {"$match": {"statut_paiement": {"$in": ["impayé", "partiel"]}}},
            {"$group": {"_id": None, "total": {"$sum": {"$subtract": ["$total_ttc", "$montant_paye"]}}}}
        ]
        encaissement_result = list(factures_collection.aggregate(encaissement_pipeline))
        if encaissement_result:
            stats["montant_a_encaisser"] = encaissement_result[0]["total"]
        
        return {"stats": stats}
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# SEARCH ENDPOINTS
# ========================================
@app.get("/api/search", response_model=dict)
async def search_documents(q: str):
    try:
        results = {
            "clients": [],
            "devis": [],
            "factures": []
        }
        
        # Search clients
        clients = list(clients_collection.find({
            "$or": [
                {"nom": {"$regex": q, "$options": "i"}},
                {"numero_cc": {"$regex": q, "$options": "i"}},
                {"email": {"$regex": q, "$options": "i"}}
            ]
        }).limit(10))
        
        for client in clients:
            client["_id"] = str(client["_id"])
        results["clients"] = clients
        
        # Search devis
        devis = list(devis_collection.find({
            "$or": [
                {"numero_devis": {"$regex": q, "$options": "i"}},
                {"client_nom": {"$regex": q, "$options": "i"}}
            ]
        }).limit(10))
        
        for d in devis:
            d["_id"] = str(d["_id"])
        results["devis"] = devis
        
        # Search factures
        factures = list(factures_collection.find({
            "$or": [
                {"numero_facture": {"$regex": q, "$options": "i"}},
                {"client_nom": {"$regex": q, "$options": "i"}}
            ]
        }).limit(10))
        
        for f in factures:
            f["_id"] = str(f["_id"])
        results["factures"] = factures
        
        return {"results": results}
    except Exception as e:
        logger.error(f"Error searching: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)