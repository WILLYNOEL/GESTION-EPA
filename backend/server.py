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
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib import colors
import base64
import io

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

# ECO PUMP AFRIK Logo en base64 (version simplifiée pour les PDFs)
ECO_PUMP_LOGO_B64 = """
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==
"""

def get_logo_image():
    """Create a logo placeholder for PDFs"""
    try:
        # For now, we'll create a simple text-based logo since we don't have the actual logo file
        # In production, you would load the actual logo file
        return None  # Will use text-based branding instead
    except:
        return None

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
        current_time = datetime.now()
        client_data["created_at"] = current_time.isoformat()
        client_data["created_at_formatted"] = current_time.strftime("%d/%m/%Y à %H:%M:%S")
        client_data["updated_at"] = current_time.isoformat()
        client_data["updated_at_formatted"] = current_time.strftime("%d/%m/%Y à %H:%M:%S")
        
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
        current_time = datetime.now()
        
        # Generate fournisseur ID
        fournisseur_data["fournisseur_id"] = generate_id()
        fournisseur_data["created_at"] = current_time.isoformat()
        fournisseur_data["created_at_formatted"] = current_time.strftime("%d/%m/%Y à %H:%M:%S")
        fournisseur_data["updated_at"] = current_time.isoformat()
        fournisseur_data["updated_at_formatted"] = current_time.strftime("%d/%m/%Y à %H:%M:%S")
        
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
        current_time = datetime.now()
        
        devis_data["devis_id"] = generate_id()
        devis_data["date_devis"] = date.today().isoformat()
        devis_data["numero_devis"] = generate_numero("DEV", devis.client_nom, date.today())
        devis_data["devise"] = client["devise"]
        devis_data["created_at"] = current_time.isoformat()
        devis_data["created_at_formatted"] = current_time.strftime("%d/%m/%Y à %H:%M:%S")
        devis_data["updated_at"] = current_time.isoformat()
        devis_data["updated_at_formatted"] = current_time.strftime("%d/%m/%Y à %H:%M:%S")
        
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
        current_time = datetime.now()
        
        # Generate facture ID and number
        facture_data["facture_id"] = generate_id()
        facture_data["numero_facture"] = generate_numero("FACT", facture.client_nom, date.today())
        facture_data["date_facture"] = date.today().isoformat()
        facture_data["created_at"] = current_time.isoformat()
        facture_data["created_at_formatted"] = current_time.strftime("%d/%m/%Y à %H:%M:%S")
        facture_data["updated_at"] = current_time.isoformat()
        facture_data["updated_at_formatted"] = current_time.strftime("%d/%m/%Y à %H:%M:%S")
        facture_data["devise"] = client["devise"]
        
        # Set default payment status
        facture_data["statut_paiement"] = "impayé"
        facture_data["montant_paye"] = 0.0
        
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
        current_time = datetime.now()
        
        # Generate article ID
        article_data["article_id"] = str(uuid.uuid4())
        article_data["created_at"] = current_time.isoformat()
        article_data["created_at_formatted"] = current_time.strftime("%d/%m/%Y à %H:%M:%S")
        article_data["updated_at"] = current_time.isoformat()
        article_data["updated_at_formatted"] = current_time.strftime("%d/%m/%Y à %H:%M:%S")
        
        result = stock_collection.insert_one(article_data)
        article_data["_id"] = str(result.inserted_id)
        
        return {"success": True, "article": article_data}
    except Exception as e:
        logger.error(f"Error creating article: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/stock/{article_id}", response_model=dict)
async def update_stock_article(article_id: str, article_update: dict):
    try:
        current_time = datetime.now()
        
        # Remove immutable fields from update data
        immutable_fields = ['_id', 'article_id', 'created_at', 'created_at_formatted']
        for field in immutable_fields:
            if field in article_update:
                del article_update[field]
        
        # Add updated timestamp
        article_update["updated_at"] = current_time.isoformat()
        article_update["updated_at_formatted"] = current_time.strftime("%d/%m/%Y à %H:%M:%S")
        
        result = stock_collection.update_one(
            {"article_id": article_id},
            {"$set": article_update}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Article non trouvé")
        
        updated_article = stock_collection.find_one({"article_id": article_id})
        if updated_article:
            updated_article["_id"] = str(updated_article["_id"])
        
        return {"success": True, "article": updated_article}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating stock article: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour: {str(e)}")

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
        current_time = datetime.now()
        
        # Generate paiement ID
        paiement_data["paiement_id"] = generate_id()
        paiement_data["date_paiement"] = date.today().isoformat()
        paiement_data["created_at"] = current_time.isoformat()
        paiement_data["created_at_formatted"] = current_time.strftime("%d/%m/%Y à %H:%M:%S")
        paiement_data["updated_at"] = current_time.isoformat()
        paiement_data["updated_at_formatted"] = current_time.strftime("%d/%m/%Y à %H:%M:%S")
        
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
# PDF GENERATION ENDPOINTS
# ========================================
@app.get("/api/pdf/document/{doc_type}/{doc_id}")
async def generate_document_pdf(doc_type: str, doc_id: str):
    """Generate PDF for devis, facture or paiement"""
    try:
        # Get document data
        if doc_type == "devis":
            document = devis_collection.find_one({"devis_id": doc_id})
            if not document:
                raise HTTPException(status_code=404, detail="Devis non trouvé")
            doc_title = "DEVIS"
            doc_number = document["numero_devis"]
            doc_date = document["date_devis"]
            
        elif doc_type == "facture":
            document = factures_collection.find_one({"facture_id": doc_id})
            if not document:
                raise HTTPException(status_code=404, detail="Facture non trouvée") 
            doc_title = "FACTURE"
            doc_number = document["numero_facture"]
            doc_date = document["date_facture"]
            
        elif doc_type == "paiement":
            document = paiements_collection.find_one({"paiement_id": doc_id})
            if not document:
                raise HTTPException(status_code=404, detail="Paiement non trouvé")
            doc_title = "REÇU DE PAIEMENT"
            doc_number = f"RECU-{doc_id[:8]}"
            doc_date = document["date_paiement"]
        else:
            raise HTTPException(status_code=400, detail="Type de document non valide")

        # Create PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            doc = SimpleDocTemplate(tmp_file.name, pagesize=A4)
            story = []
            styles = getSampleStyleSheet()
            
            # Header with ECO PUMP AFRIK branding
            header_style = styles['Title']
            header_style.fontSize = 28
            header_style.textColor = colors.HexColor('#0066cc')
            header_style.alignment = 1  # Center alignment
            
            # Create PROFESSIONAL ECO PUMP AFRIK logo inspired by client's design
            # Note: Using table-based layout instead of graphics for better compatibility
            
            # Professional logo header with company branding
            logo_table_data = [
                ["", "ECO PUMP AFRIK", ""],
                ["", "Solutions Hydrauliques Professionnelles", ""]
            ]
            
            logo_table = Table(logo_table_data, colWidths=[80, 360, 80])
            logo_table.setStyle(TableStyle([
                # Logo cell styling (left)
                ('BACKGROUND', (0, 0), (0, 1), colors.HexColor('#0066cc')),  # Blue background like logo
                ('ALIGN', (0, 0), (0, 1), 'CENTER'),
                ('VALIGN', (0, 0), (0, 1), 'MIDDLE'),
                
                # Company name styling (center)
                ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (1, 0), (1, 0), 32),  # Large company name
                ('TEXTCOLOR', (1, 0), (1, 0), colors.HexColor('#000000')),  # Black like logo
                ('ALIGN', (1, 0), (1, 0), 'CENTER'),
                ('VALIGN', (1, 0), (1, 0), 'MIDDLE'),
                
                # Subtitle styling
                ('FONTNAME', (1, 1), (1, 1), 'Helvetica'),
                ('FONTSIZE', (1, 1), (1, 1), 16),
                ('TEXTCOLOR', (1, 1), (1, 1), colors.HexColor('#0066cc')),  # Blue like logo
                ('ALIGN', (1, 1), (1, 1), 'CENTER'),
                ('VALIGN', (1, 1), (1, 1), 'MIDDLE'),
                
                # Right cell styling
                ('BACKGROUND', (2, 0), (2, 1), colors.HexColor('#f0f8ff')),
                
                # Overall table styling
                ('BOX', (0, 0), (-1, -1), 3, colors.HexColor('#0066cc')),  # Thick blue border
                ('TOPPADDING', (0, 0), (-1, -1), 15),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ]))
            
            story.append(logo_table)
            story.append(Spacer(1, 10))
            
            # Contact information bar
            contact_data = [
                ["📧 contact@ecopumpafrik.com", "📞 +225 0707806359", "🌐 www.ecopumpafrik.com"]
            ]
            
            contact_table = Table(contact_data, colWidths=[160, 160, 160])
            contact_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#333333')),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0f8ff')),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#0066cc')),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]))
            
            story.append(contact_table)
            story.append(Spacer(1, 20))
            
            # Document title
            title_style = styles['Heading1']
            title_style.fontSize = 20
            title_style.textColor = colors.HexColor('#333333')
            story.append(Paragraph(f"{doc_title} - {doc_number}", title_style))
            
            # Date and time information
            date_str = doc_date
            current_time = datetime.now().strftime("%d/%m/%Y à %H:%M:%S")
            story.append(Paragraph(f"Date: {date_str}", styles['Normal']))
            story.append(Paragraph(f"Heure de génération: {current_time}", styles['Normal']))
            story.append(Spacer(1, 20))
            
            if doc_type in ["devis", "facture"]:
                # Client info
                story.append(Paragraph(f"<b>Client:</b> {document['client_nom']}", styles['Normal']))
                if document.get('reference_commande'):
                    story.append(Paragraph(f"<b>Référence commande:</b> {document['reference_commande']}", styles['Normal']))
                story.append(Spacer(1, 15))
                
                # Articles table with proper column widths
                article_data = [["Item", "Réf", "Désignation", "Qté", "P.U.", "Total"]]
                for article in document.get('articles', []):
                    # Truncate long designations to fit in column
                    designation = article['designation']
                    if len(designation) > 25:
                        designation = designation[:25] + "..."
                    
                    article_data.append([
                        str(article['item']),
                        article.get('ref', '')[:8] if article.get('ref') else '',  # Limit ref to 8 chars
                        designation,
                        str(article['quantite']),
                        f"{article['prix_unitaire']:,.0f}",
                        f"{article['total']:,.0f}"
                    ])
                
                # Define column widths to prevent overflow (total width = 480)
                table = Table(article_data, colWidths=[30, 50, 180, 40, 80, 100])
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0066cc')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('ALIGN', (2, 1), (2, -1), 'LEFT'),  # Left align designation
                    ('ALIGN', (4, 1), (-1, -1), 'RIGHT'), # Right align prices
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                    ('WORDWRAP', (2, 1), (2, -1), 1)  # Enable word wrap for designation
                ]))
                story.append(table)
                story.append(Spacer(1, 20))
                
                # Totals with color coding
                story.append(Paragraph(f"<b>Sous-total:</b> {document['sous_total']:,.2f} {document['devise']}", styles['Normal']))
                story.append(Paragraph(f"<b>TVA (18%):</b> {document['tva']:,.2f} {document['devise']}", styles['Normal']))
                
                # Total with color based on payment status
                if doc_type == "facture":
                    statut_paiement = document.get('statut_paiement', 'impayé')
                    if statut_paiement == 'payé':
                        total_color = '#28a745'  # Green for paid
                        total_text = f"<b><font color='{total_color}'>TOTAL TTC (PAYÉ):</font></b> <font color='{total_color}'>{document['total_ttc']:,.2f} {document['devise']}</font>"
                    else:
                        total_color = '#dc3545'  # Red for unpaid
                        total_text = f"<b><font color='{total_color}'>TOTAL TTC (À PAYER):</font></b> <font color='{total_color}'>{document['total_ttc']:,.2f} {document['devise']}</font>"
                else:
                    # For devis, use normal blue color
                    total_color = '#0066cc'
                    total_text = f"<b><font color='{total_color}'>TOTAL TTC:</font></b> <font color='{total_color}'>{document['total_ttc']:,.2f} {document['devise']}</font>"
                
                story.append(Paragraph(total_text, styles['Heading2']))
                story.append(Spacer(1, 15))
                
                # Terms and conditions
                if document.get('delai_livraison'):
                    story.append(Paragraph(f"<b>Délai de livraison:</b> {document['delai_livraison']}", styles['Normal']))
                if document.get('conditions_paiement'):
                    story.append(Paragraph(f"<b>Conditions de paiement:</b> {document['conditions_paiement']}", styles['Normal']))
                if document.get('mode_livraison'):
                    story.append(Paragraph(f"<b>Mode de livraison:</b> {document['mode_livraison']}", styles['Normal']))
                if document.get('commentaires'):
                    story.append(Spacer(1, 15))
                    comment_style = styles['Normal']
                    comment_style.fontSize = 11
                    comment_style.textColor = colors.HexColor('#2c5530')
                    comment_style.leftIndent = 20
                    comment_style.rightIndent = 20
                    
                    # Create a bordered box for comments
                    comment_table = Table([[f"💬 COMMENTAIRES:\n{document['commentaires']}"]], colWidths=[460])
                    comment_table.setStyle(TableStyle([
                        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                        ('FONTSIZE', (0, 0), (-1, -1), 11),
                        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#2c5530')),
                        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fff8')),
                        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#28a745')),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                        ('TOPPADDING', (0, 0), (-1, -1), 12),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                        ('LEFTPADDING', (0, 0), (-1, -1), 15),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 15),
                    ]))
                    story.append(comment_table)
                
            else:  # paiement
                story.append(Paragraph(f"<b>Montant:</b> {document['montant']:,.2f} {document['devise']}", styles['Heading2']))
                story.append(Paragraph(f"<b>Mode de paiement:</b> {document['mode_paiement']}", styles['Normal']))
                if document.get('reference_paiement'):
                    story.append(Paragraph(f"<b>Référence:</b> {document['reference_paiement']}", styles['Normal']))
                if document.get('client_id'):
                    client = clients_collection.find_one({"client_id": document['client_id']})
                    if client:
                        story.append(Paragraph(f"<b>Client:</b> {client['nom']}", styles['Normal']))
            
            story.append(Spacer(1, 30))
            
            # Footer with company info
            footer_style = styles['Normal']
            footer_style.fontSize = 8
            footer_style.textColor = colors.HexColor('#666666')
            
            story.append(Paragraph("─" * 80, footer_style))
            story.append(Paragraph("<b>SARL ECO PUMP AFRIK au capital de 1 000 000 F CFA</b>", footer_style))
            story.append(Paragraph("Siège social: Cocody - Angré 7e Tranche", footer_style))
            story.append(Paragraph("Tél: +225 0707806359", footer_style))
            story.append(Paragraph("Email: contact@ecopumpafrik.com | Site WEB: www.ecopumpafrik.com", footer_style))
            story.append(Paragraph("RCCM: CI-ABJ-2024-B-12345 | N°CC: 2407891H", footer_style))
            
            doc.build(story)
            
            return FileResponse(
                tmp_file.name,
                media_type='application/pdf',
                filename=f"{doc_title}_{doc_number}_{date.today().isoformat()}.pdf"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération du PDF: {str(e)}")

@app.get("/api/pdf/rapport/{report_type}")
async def generate_report_pdf(report_type: str, date_debut: str = None, date_fin: str = None):
    """Generate professional PDF reports with optional date filtering"""
    try:
        # Parse date filters if provided
        date_filter = {}
        if date_debut and date_fin:
            try:
                debut = datetime.fromisoformat(date_debut)
                fin = datetime.fromisoformat(date_fin)
                date_filter = {
                    "$gte": debut.isoformat(),
                    "$lte": fin.isoformat()
                }
            except:
                # If date parsing fails, ignore filters
                date_filter = {}
        
        # Get data for reports with date filtering
        clients_data = list(clients_collection.find({}))
        
        # Apply date filtering to collections
        if date_filter:
            factures_data = list(factures_collection.find({"date_facture": date_filter}).sort("created_at", -1))
            devis_data = list(devis_collection.find({"date_devis": date_filter}).sort("created_at", -1))
            paiements_data = list(paiements_collection.find({"date_paiement": date_filter}).sort("created_at", -1))
        else:
            factures_data = list(factures_collection.find({}).sort("created_at", -1))
            devis_data = list(devis_collection.find({}).sort("created_at", -1))
            paiements_data = list(paiements_collection.find({}).sort("created_at", -1))
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            doc = SimpleDocTemplate(tmp_file.name, pagesize=A4)
            story = []
            styles = getSampleStyleSheet()
            
            # Create PROFESSIONAL ECO PUMP AFRIK logo for reports (same as documents)
            logo_table_data = [
                ["", "ECO PUMP AFRIK", ""],
                ["", "Solutions Hydrauliques Professionnelles", ""]
            ]
            
            logo_table = Table(logo_table_data, colWidths=[80, 360, 80])
            logo_table.setStyle(TableStyle([
                # Logo cell styling (left)
                ('BACKGROUND', (0, 0), (0, 1), colors.HexColor('#0066cc')),  # Blue background like logo
                ('ALIGN', (0, 0), (0, 1), 'CENTER'),
                ('VALIGN', (0, 0), (0, 1), 'MIDDLE'),
                
                # Company name styling (center)
                ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (1, 0), (1, 0), 36),  # Larger company name for reports
                ('TEXTCOLOR', (1, 0), (1, 0), colors.HexColor('#000000')),  # Black like logo
                ('ALIGN', (1, 0), (1, 0), 'CENTER'),
                ('VALIGN', (1, 0), (1, 0), 'MIDDLE'),
                
                # Subtitle styling
                ('FONTNAME', (1, 1), (1, 1), 'Helvetica'),
                ('FONTSIZE', (1, 1), (1, 1), 18),
                ('TEXTCOLOR', (1, 1), (1, 1), colors.HexColor('#0066cc')),  # Blue like logo
                ('ALIGN', (1, 1), (1, 1), 'CENTER'),
                ('VALIGN', (1, 1), (1, 1), 'MIDDLE'),
                
                # Right cell styling
                ('BACKGROUND', (2, 0), (2, 1), colors.HexColor('#f0f8ff')),
                
                # Overall table styling
                ('BOX', (0, 0), (-1, -1), 3, colors.HexColor('#0066cc')),  # Thick blue border
                ('TOPPADDING', (0, 0), (-1, -1), 15),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ]))
            
            story.append(logo_table)
            story.append(Spacer(1, 10))
            
            # Contact information bar
            contact_data = [
                ["📧 contact@ecopumpafrik.com", "📞 +225 0707806359", "🌐 www.ecopumpafrik.com"]
            ]
            
            contact_table = Table(contact_data, colWidths=[160, 160, 160])
            contact_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#333333')),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0f8ff')),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#0066cc')),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]))
            
            story.append(contact_table)
            story.append(Spacer(1, 15))
            
            # Report title
            title_style = styles['Heading1']
            title_style.fontSize = 18
            title_style.textColor = colors.HexColor('#333333')
            
            if report_type == "journal_ventes":
                period_text = ""
                if date_debut and date_fin:
                    period_text = f" - Période: {date_debut} au {date_fin}"
                
                story.append(Paragraph(f"JOURNAL DES VENTES{period_text}", title_style))
                story.append(Spacer(1, 20))
                
                # Sales summary table
                summary_data = [
                    ["Indicateur", "Valeur"],
                    ["Nombre de factures", str(len(factures_data))],
                    ["Chiffre d'affaires", f"{sum(f.get('total_ttc', 0) for f in factures_data):,.2f} F CFA"],
                    ["TVA collectée", f"{sum(f.get('tva', 0) for f in factures_data):,.2f} F CFA"],
                    ["Factures impayées", str(len([f for f in factures_data if f.get('statut_paiement') != 'payé']))],
                ]
                
                table = Table(summary_data)
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0066cc')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                story.append(table)
                story.append(Spacer(1, 20))
                
                # Detailed factures table with fixed column widths
                story.append(Paragraph("Détail des Factures", styles['Heading2']))
                facture_data = [["N° Facture", "Client", "Date", "Montant", "Statut"]]
                for f in factures_data[:15]:  # Limit to 15 recent invoices
                    # Truncate long client names
                    client_nom = f.get('client_nom', '')
                    if len(client_nom) > 20:
                        client_nom = client_nom[:20] + "..."
                    
                    facture_data.append([
                        f.get('numero_facture', '')[:15],  # Limit invoice number
                        client_nom,
                        f.get('date_facture', '')[:10],  # Date only, no time
                        f"{f.get('total_ttc', 0):,.0f} {f.get('devise', 'FCFA')}",
                        f.get('statut_paiement', '')
                    ])
                
                detail_table = Table(facture_data, colWidths=[80, 120, 60, 80, 60])
                detail_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#28a745')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('ALIGN', (1, 1), (1, -1), 'LEFT'),  # Left align client names
                    ('ALIGN', (3, 1), (3, -1), 'RIGHT'), # Right align amounts
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 9),
                    ('FONTSIZE', (0, 1), (-1, -1), 8),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                story.append(detail_table)
                
            elif report_type == "balance_clients":
                story.append(Paragraph("BALANCE CLIENTS", title_style))
                story.append(Spacer(1, 20))
                
                # Client balance table with strictly controlled column widths
                balance_data = [["Client", "Type", "Dev", "Fact", "Facturé", "Payé", "Solde"]]
                for client in clients_data:
                    client_factures = [f for f in factures_data if f.get('client_id') == client.get('client_id')]
                    total_facture = sum(f.get('total_ttc', 0) for f in client_factures)
                    total_paye = sum(f.get('montant_paye', 0) for f in client_factures)
                    solde = total_facture - total_paye
                    
                    # Truncate long client names to fit
                    client_nom = client.get('nom', '')
                    if len(client_nom) > 18:
                        client_nom = client_nom[:18] + "..."
                    
                    balance_data.append([
                        client_nom,
                        client.get('type_client', '')[:4],  # Truncate type
                        client.get('devise', '')[:4],
                        str(len(client_factures)),
                        f"{total_facture:,.0f}",
                        f"{total_paye:,.0f}",
                        f"{solde:,.0f}"
                    ])
                
                # Very strict column widths (total = 480)
                balance_table = Table(balance_data, colWidths=[90, 30, 25, 25, 70, 70, 70])
                balance_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0066cc')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('ALIGN', (0, 1), (0, -1), 'LEFT'),  # Left align client names
                    ('ALIGN', (4, 1), (-1, -1), 'RIGHT'), # Right align amounts
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 8),  # Smaller header font
                    ('FONTSIZE', (0, 1), (-1, -1), 7),  # Smaller content font
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                    ('TOPPADDING', (0, 0), (-1, -1), 2),
                    ('BOTTOMPADDING', (0, 1), (-1, -1), 2),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.black)
                ]))
                story.append(balance_table)
                
            elif report_type == "journal_achats":
                story.append(Paragraph("JOURNAL DES ACHATS", title_style))
                story.append(Spacer(1, 20))
                
                # Get purchases data (since we don't have achats_collection implemented, we'll show placeholder) 
                achats_data = []  # In real implementation, get from achats_collection
                
                # Purchases summary
                summary_data = [
                    ["Indicateur", "Valeur"],
                    ["Nombre de commandes", "0"],  # Would be len(achats_data)
                    ["Total des achats", "0,00 F CFA"],  # Would be sum(a.total_ttc for a in achats_data)
                    ["Commandes en attente", "0"],
                    ["Fournisseurs actifs", str(len([f for f in fournisseurs_collection.find({})]))],
                ]
                
                table = Table(summary_data)
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#28a745')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                story.append(table)
                
                story.append(Spacer(1, 20))
                story.append(Paragraph("Note: Module d'achats en cours de développement", styles['Normal']))
                
            elif report_type == "balance_fournisseurs":
                story.append(Paragraph("BALANCE FOURNISSEURS", title_style))
                story.append(Spacer(1, 20))
                
                # Supplier balance table
                fournisseurs_data = list(fournisseurs_collection.find({}))
                balance_data = [["Fournisseur", "Devise", "Nb Commandes", "Total Commandé", "Total Payé", "Solde"]]
                
                for fournisseur in fournisseurs_data:
                    # Since achats module is not fully implemented, we'll show placeholder data
                    balance_data.append([
                        fournisseur.get('nom', ''),
                        fournisseur.get('devise', ''),
                        "0",  # Would be number of orders
                        "0,00",  # Would be total ordered
                        "0,00",  # Would be total paid
                        "0,00"   # Would be balance
                    ])
                
                balance_table = Table(balance_data)
                balance_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ffc107')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 9),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                story.append(balance_table)
                
                story.append(Spacer(1, 20))
                story.append(Paragraph("Note: Module d'achats en cours de développement", styles['Normal']))
                
            elif report_type == "tresorerie":
                story.append(Paragraph("SUIVI DE TRÉSORERIE", title_style))
                story.append(Spacer(1, 20))
                
                # Treasury summary
                total_encaisse = sum(p.get('montant', 0) for p in paiements_data)
                total_a_encaisser = sum(f.get('total_ttc', 0) - f.get('montant_paye', 0) 
                                     for f in factures_data if f.get('statut_paiement') != 'payé')
                
                tresorerie_data = [
                    ["Indicateur", "Montant"],
                    ["Total encaissé", f"{total_encaisse:,.2f} F CFA"],
                    ["À encaisser", f"{total_a_encaisser:,.2f} F CFA"],
                    ["Nombre de paiements", str(len(paiements_data))],
                    ["Factures impayées", str(len([f for f in factures_data if f.get('statut_paiement') != 'payé']))]
                ]
                
                tresorerie_table = Table(tresorerie_data)
                tresorerie_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ffc107')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                story.append(tresorerie_table)
                
            elif report_type == "compte_resultat":
                story.append(Paragraph("COMPTE DE RÉSULTAT", title_style))
                story.append(Spacer(1, 20))
                
                # Results summary
                ca_ttc = sum(f.get('total_ttc', 0) for f in factures_data)
                tva_collectee = sum(f.get('tva', 0) for f in factures_data)
                ca_ht = ca_ttc - tva_collectee
                taux_conversion = (len(factures_data) / len(devis_data) * 100) if devis_data else 0
                
                resultat_data = [
                    ["Poste", "Montant"],
                    ["Chiffre d'affaires HT", f"{ca_ht:,.2f} F CFA"],
                    ["TVA collectée (18%)", f"{tva_collectee:,.2f} F CFA"],
                    ["Chiffre d'affaires TTC", f"{ca_ttc:,.2f} F CFA"],
                    ["Taux de conversion devis", f"{taux_conversion:.1f}%"],
                    ["Nombre de clients actifs", str(len(clients_data))]
                ]
                
                resultat_table = Table(resultat_data)
                resultat_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#17a2b8')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                story.append(resultat_table)
            
            story.append(Spacer(1, 30))
            
            # Footer with company info
            footer_style = styles['Normal']
            footer_style.fontSize = 8
            footer_style.textColor = colors.HexColor('#666666')
            
            story.append(Paragraph("─" * 80, footer_style))
            story.append(Paragraph(f"Rapport généré le: {datetime.now().strftime('%d/%m/%Y à %H:%M')}", footer_style))
            story.append(Paragraph("<b>SARL ECO PUMP AFRIK au capital de 1 000 000 F CFA</b>", footer_style))
            story.append(Paragraph("Siège social: Cocody - Angré 7e Tranche", footer_style))
            story.append(Paragraph("Tél: +225 0707806359", footer_style))
            story.append(Paragraph("Email: contact@ecopumpafrik.com | Site WEB: www.ecopumpafrik.com", footer_style))
            story.append(Paragraph("RCCM: CI-ABJ-2024-B-12345 | N°CC: 2407891H", footer_style))
            
            doc.build(story)
            
            return FileResponse(
                tmp_file.name,
                media_type='application/pdf',
                filename=f"ECO_PUMP_AFRIK_{report_type}_{date.today().isoformat()}.pdf"
            )
            
    except Exception as e:
        logger.error(f"Error generating report PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération du rapport: {str(e)}")

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