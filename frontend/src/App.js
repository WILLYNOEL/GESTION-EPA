import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { Badge } from './components/ui/badge';
import { Textarea } from './components/ui/textarea';
import { Alert, AlertDescription } from './components/ui/alert';
import { 
  Plus, Users, FileText, Euro, DollarSign, Eye, Edit, Trash2, Download, 
  Search, Package, CreditCard, TrendingUp, AlertTriangle, Building2,
  ShoppingCart, Receipt, BarChart3, FileCheck, ArrowRightLeft, Calendar,
  LogOut, Shield, Settings
} from 'lucide-react';
import Login from './Login';
import AdminUsers from './AdminUsers';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  // États d'authentification
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [devis, setDevis] = useState([]);
  const [factures, setFactures] = useState([]);
  const [stock, setStock] = useState([]);
  const [paiements, setPaiements] = useState([]);
  const [stats, setStats] = useState({});
  const [alerts, setAlerts] = useState([]);
  // Loading states
  const [loading, setLoading] = useState(false);
  
  // Rapport filters state
  const [rapportFilters, setRapportFilters] = useState({
    date_debut: '',
    date_fin: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({});
  
  // Filter states for each tab
  const [devisFilters, setDevisFilters] = useState({
    client_nom: '',
    numero_devis: '',
    date_debut: '',
    date_fin: '',
    devise: '',
    statut: ''
  });
  
  const [facturesFilters, setFacturesFilters] = useState({
    client_nom: '',
    numero_facture: '',
    date_debut: '',
    date_fin: '',
    statut_paiement: '',
    devise: '',
    montant_min: '',
    montant_max: ''
  });
  
  const [clientsFilters, setClientsFilters] = useState({
    nom: '',
    type_client: '',
    devise: '',
    ville: ''
  });
  
  const [stockFilters, setStockFilters] = useState({
    designation: '',
    ref: '',
    stock_bas: false,
    fournisseur: ''
  });
  
  // Client form state
  const [clientForm, setClientForm] = useState({
    nom: '',
    numero_cc: '',
    numero_rc: '',
    nif: '',
    email: '',
    telephone: '',
    adresse: '',
    devise: 'FCFA',
    type_client: 'standard',
    conditions_paiement: ''
  });
  
  // Fournisseur form state
  const [fournisseurForm, setFournisseurForm] = useState({
    nom: '',
    numero_cc: '',
    numero_rc: '',
    email: '',
    telephone: '',
    adresse: '',
    devise: 'FCFA',
    conditions_paiement: ''
  });
  
  // Devis form state
  const [devisForm, setDevisForm] = useState({
    client_id: '',
    client_nom: '',
    articles: [{ item: 1, ref: '', designation: '', quantite: 1, prix_unitaire: 0, total: 0 }],
    delai_livraison: '',
    conditions_paiement: '',
    mode_livraison: '',
    reference_commande: '',
    commentaires: ''
  });
  
  // Facture form state
  const [factureForm, setFactureForm] = useState({
    client_id: '',
    client_nom: '',
    articles: [{ item: 1, ref: '', designation: '', quantite: 1, prix_unitaire: 0, total: 0 }],
    delai_livraison: '',
    conditions_paiement: '',
    mode_livraison: '',
    reference_commande: '',
    commentaires: ''
  });
  
  // Paiement form state
  const [paiementForm, setPaiementForm] = useState({
    type_document: 'facture',
    document_id: '',
    client_id: '',
    montant: 0,
    devise: 'FCFA',
    mode_paiement: 'espèce',
    reference_paiement: ''
  });
  
  // Article stock form state
  const [stockForm, setStockForm] = useState({
    ref: '',
    designation: '',
    quantite_stock: 0,
    stock_minimum: 0,
    prix_achat_moyen: 0,
    prix_vente: 0,
    fournisseur_principal: '',
    emplacement: ''
  });
  
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isFournisseurDialogOpen, setIsFournisseurDialogOpen] = useState(false);
  const [isDevisDialogOpen, setIsDevisDialogOpen] = useState(false);
  const [isFactureDialogOpen, setIsFactureDialogOpen] = useState(false);
  const [isPaiementDialogOpen, setIsPaiementDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  // Display mode states - intelligent loading (don't show all data immediately)
  const [showClientsData, setShowClientsData] = useState(false);
  const [showFournisseursData, setShowFournisseursData] = useState(false);
  const [showDevisData, setShowDevisData] = useState(false);
  const [showFacturesData, setShowFacturesData] = useState(false);
  const [showPaiementsData, setShowPaiementsData] = useState(false);
  const [clientsSearch, setClientsSearch] = useState('');
  const [fournisseursSearch, setFournisseursSearch] = useState('');
  const [devisSearch, setDevisSearch] = useState('');
  const [facturesSearch, setFacturesSearch] = useState('');
  const [paiementsSearch, setPaiementsSearch] = useState('');

  // Search functions for intelligent loading
  const handleClientsSearch = () => {
    if (clientsSearch.trim() === '') {
      setShowClientsData(true); // Show all if empty search
    } else {
      // Filter clients based on search term
      setShowClientsData(true);
    }
  };

  const handleFournisseursSearch = () => {
    if (fournisseursSearch.trim() === '') {
      setShowFournisseursData(true);
    } else {
      setShowFournisseursData(true);
    }
  };

  const handleDevisSearch = () => {
    if (devisSearch.trim() === '') {
      setShowDevisData(true);
    } else {
      setShowDevisData(true);
    }
  };

  const handleFacturesSearch = () => {
    if (facturesSearch.trim() === '') {
      setShowFacturesData(true);
    } else {
      setShowFacturesData(true);
    }
  };

  const handlePaiementsSearch = () => {
    if (paiementsSearch.trim() === '') {
      setShowPaiementsData(true);
    } else {
      setShowPaiementsData(true);
    }
  };

  // Filtered data based on search terms
  const getFilteredClients = () => {
    if (!clientsSearch.trim()) return clients;
    return clients.filter(client => 
      client.nom.toLowerCase().includes(clientsSearch.toLowerCase()) ||
      (client.email && client.email.toLowerCase().includes(clientsSearch.toLowerCase())) ||
      (client.telephone && client.telephone.includes(clientsSearch))
    );
  };

  const getFilteredFournisseurs = () => {
    if (!fournisseursSearch.trim()) return fournisseurs;
    return fournisseurs.filter(fournisseur => 
      fournisseur.nom.toLowerCase().includes(fournisseursSearch.toLowerCase()) ||
      (fournisseur.email && fournisseur.email.toLowerCase().includes(fournisseursSearch.toLowerCase()))
    );
  };

  const getFilteredDevis = () => {
    if (!devisSearch.trim()) return devis;
    return devis.filter(d => 
      d.numero_devis.toLowerCase().includes(devisSearch.toLowerCase()) ||
      d.client_nom.toLowerCase().includes(devisSearch.toLowerCase())
    );
  };

  const getFilteredFactures = () => {
    if (!facturesSearch.trim()) return factures;
    return factures.filter(f => 
      f.numero_facture.toLowerCase().includes(facturesSearch.toLowerCase()) ||
      f.client_nom.toLowerCase().includes(facturesSearch.toLowerCase())
    );
  };

  const getFilteredPaiements = () => {
    if (!paiementsSearch.trim()) return paiements;
    return paiements.filter(p => {
      const client = clients.find(c => c.client_id === p.client_id);
      const facture = factures.find(f => f.facture_id === p.document_id);
      return (
        (client && client.nom.toLowerCase().includes(paiementsSearch.toLowerCase())) ||
        (facture && facture.numero_facture.toLowerCase().includes(paiementsSearch.toLowerCase())) ||
        p.mode_paiement.toLowerCase().includes(paiementsSearch.toLowerCase()) ||
        (p.reference_paiement && p.reference_paiement.toLowerCase().includes(paiementsSearch.toLowerCase()))
      );
    });
  };

  // Fetch data functions
  const fetchAll = async () => {
    try {
      const [
        clientsRes, fournisseursRes, devisRes, facturesRes, 
        stockRes, paiementsRes, statsRes, alertsRes
      ] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/clients`),
        axios.get(`${API_BASE_URL}/api/fournisseurs`),
        axios.get(`${API_BASE_URL}/api/devis`),
        axios.get(`${API_BASE_URL}/api/factures`),
        axios.get(`${API_BASE_URL}/api/stock`),
        axios.get(`${API_BASE_URL}/api/paiements`),
        axios.get(`${API_BASE_URL}/api/dashboard/stats`),
        axios.get(`${API_BASE_URL}/api/stock/alerts`)
      ]);

      if (clientsRes.status === 'fulfilled') setClients(clientsRes.value.data.clients || []);
      if (fournisseursRes.status === 'fulfilled') setFournisseurs(fournisseursRes.value.data.fournisseurs || []);
      if (devisRes.status === 'fulfilled') setDevis(devisRes.value.data.devis || []);
      if (facturesRes.status === 'fulfilled') setFactures(facturesRes.value.data.factures || []);
      if (stockRes.status === 'fulfilled') setStock(stockRes.value.data.articles || []);
      if (paiementsRes.status === 'fulfilled') setPaiements(paiementsRes.value.data.paiements || []);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.stats || {});
      if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value.data.alerts || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Advanced search functions for each entity type
  const handleAdvancedSearch = async (entityType, filters) => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const response = await axios.get(`${API_BASE_URL}/api/search/${entityType}?${params.toString()}`);
      
      if (response.data.success) {
        // Update the respective data array with filtered results
        switch (entityType) {
          case 'devis':
            setDevis(response.data.devis);
            break;
          case 'factures':
            setFactures(response.data.factures);
            break;
          case 'clients':
            setClients(response.data.clients);
            break;
          case 'stock':
            setStock(response.data.stock);
            break;
        }
        
        alert(`🔍 ${response.data.count} résultat(s) trouvé(s) pour ${entityType}`);
      }
    } catch (error) {
      console.error(`Error searching ${entityType}:`, error);
      alert(`❌ Erreur lors de la recherche: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Reset filters and reload data
  const handleResetFilters = async (entityType) => {
    try {
      setLoading(true);
      
      // Reset filter states
      switch (entityType) {
        case 'devis':
          setDevisFilters({
            client_nom: '', numero_devis: '', date_debut: '', date_fin: '', devise: '', statut: ''
          });
          await fetchAll();
          break;
        case 'factures':
          setFacturesFilters({
            client_nom: '', numero_facture: '', date_debut: '', date_fin: '', 
            statut_paiement: '', devise: '', montant_min: '', montant_max: ''
          });
          await fetchAll();
          break;
        case 'clients':
          setClientsFilters({
            nom: '', type_client: '', devise: '', ville: ''
          });
          await fetchAll();
          break;
        case 'stock':
          setStockFilters({
            designation: '', ref: '', stock_bas: false, fournisseur: ''
          });
          await fetchAll();
          break;
      }
      
      alert(`✅ Filtres remis à zéro pour ${entityType}`);
    } catch (error) {
      console.error(`Error resetting filters for ${entityType}:`, error);
    } finally {
      setLoading(false);
    }
  };

  // Client form handlers
  const handleClientSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingClient) {
        await axios.put(`${API_BASE_URL}/api/clients/${editingClient.client_id}`, clientForm);
      } else {
        await axios.post(`${API_BASE_URL}/api/clients`, clientForm);
      }
      
      resetClientForm();
      setIsClientDialogOpen(false);
      setEditingClient(null);
      fetchAll();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Erreur lors de la sauvegarde du client');
    } finally {
      setLoading(false);
    }
  };

  const resetClientForm = () => {
    setClientForm({
      nom: '', numero_cc: '', numero_rc: '', nif: '', email: '', 
      telephone: '', adresse: '', devise: 'FCFA', type_client: 'standard',
      conditions_paiement: ''
    });
  };

  const handleEditClient = (client) => {
    setClientForm({
      nom: client.nom,
      numero_cc: client.numero_cc || '',
      numero_rc: client.numero_rc || '',
      nif: client.nif || '',
      email: client.email || '',
      telephone: client.telephone || '',
      adresse: client.adresse || '',
      devise: client.devise,
      type_client: client.type_client,
      conditions_paiement: client.conditions_paiement || ''
    });
    setEditingClient(client);
    setIsClientDialogOpen(true);
  };

  const handleDeleteClient = async (clientId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      try {
        setLoading(true);
        await axios.delete(`${API_BASE_URL}/api/clients/${clientId}`);
        fetchAll();
        alert('Client supprimé avec succès');
      } catch (error) {
        console.error('Error deleting client:', error);
        alert('Erreur lors de la suppression du client: ' + (error.response?.data?.detail || error.message));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleViewDocument = async (type, id) => {
    try {
      setLoading(true);
      
      // Special handling for stock items - display info modal instead of PDF
      if (type === 'stock') {
        const article = stock.find(a => a.article_id === id);
        if (!article) {
          alert('❌ Article non trouvé');
          return;
        }
        
        // Create info window for stock item
        const infoWindow = window.open('', '_blank', 'width=600,height=700,scrollbars=yes');
        
        const stockHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>ECO PUMP AFRIK - Fiche Article</title>
            <meta charset="UTF-8">
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                background: #f8f9fa; 
                color: #333; 
                line-height: 1.6;
                padding: 30px;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                border-radius: 12px;
                padding: 40px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
              }
              .header {
                text-align: center;
                padding-bottom: 30px;
                border-bottom: 3px solid #0066cc;
                margin-bottom: 40px;
              }
              .header h1 {
                font-size: 28px;
                color: #0066cc;
                font-weight: bold;
                margin-bottom: 10px;
              }
              .header .subtitle {
                font-size: 14px;
                color: #666;
                margin-bottom: 20px;
              }
              .doc-title {
                font-size: 22px;
                color: #333;
                font-weight: bold;
                margin-bottom: 30px;
                text-align: center;
              }
              .info-section {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
                border-left: 4px solid #0066cc;
              }
              .info-section h3 {
                color: #0066cc;
                margin-bottom: 15px;
                font-size: 16px;
              }
              .info-section p {
                margin-bottom: 8px;
                font-size: 14px;
              }
              .stock-status {
                padding: 10px;
                border-radius: 8px;
                text-align: center;
                font-weight: bold;
                margin: 20px 0;
              }
              .stock-ok { background: #d4edda; color: #155724; }
              .stock-low { background: #fff3cd; color: #856404; }
              .stock-alert { background: #f8d7da; color: #721c24; }
              .actions {
                text-align: center;
                margin-top: 30px;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 8px;
              }
              .btn {
                display: inline-block;
                padding: 10px 20px;
                margin: 0 10px;
                border: none;
                border-radius: 20px;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                text-decoration: none;
              }
              .btn-primary {
                background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
                color: white;
                box-shadow: 0 5px 15px rgba(0,102,204,0.4);
              }
              .btn-secondary {
                background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
                color: white;
                box-shadow: 0 5px 15px rgba(108,117,125,0.4);
              }
              .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0,0,0,0.3);
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🏭 ECO PUMP AFRIK</h1>
                <div class="subtitle">Gestion Intelligente</div>
              </div>
              
              <div class="doc-title">📦 FICHE ARTICLE</div>
              
              <div class="info-section">
                <h3>🔍 INFORMATIONS GÉNÉRALES</h3>
                <p><strong>Référence:</strong> ${article.ref}</p>
                <p><strong>Désignation:</strong> ${article.designation}</p>
                <p><strong>Emplacement:</strong> ${article.emplacement || 'Non défini'}</p>
                <p><strong>Fournisseur principal:</strong> ${article.fournisseur_principal || 'Non défini'}</p>
              </div>
              
              <div class="info-section">
                <h3>📊 STOCK & PRIX</h3>
                <p><strong>Stock actuel:</strong> ${article.quantite_stock}</p>
                <p><strong>Stock minimum:</strong> ${article.stock_minimum}</p>
                <p><strong>Prix d'achat moyen:</strong> ${formatCurrency(article.prix_achat_moyen)}</p>
                <p><strong>Prix de vente:</strong> ${formatCurrency(article.prix_vente)}</p>
              </div>
              
              <div class="stock-status ${article.quantite_stock <= article.stock_minimum ? 
                (article.quantite_stock === 0 ? 'stock-alert' : 'stock-low') : 'stock-ok'}">
                ${article.quantite_stock <= article.stock_minimum ? 
                  (article.quantite_stock === 0 ? '⚠️ STOCK ÉPUISÉ' : '🔶 STOCK BAS') : 
                  '✅ STOCK OPTIMAL'}
              </div>
              
              <div class="info-section">
                <h3>📅 INFORMATIONS SYSTÈME</h3>
                <p><strong>Date de création:</strong> ${formatDate(article.created_at)}</p>
                <p><strong>Dernière mise à jour:</strong> ${formatDate(article.updated_at)}</p>
                <p><strong>ID Article:</strong> ${article.article_id}</p>
              </div>
              
              <div class="actions">
                <button onclick="window.print()" class="btn btn-primary">
                  🖨️ Imprimer
                </button>
                <button onclick="window.close()" class="btn btn-secondary">
                  ✖️ Fermer
                </button>
              </div>
            </div>
          </body>
          </html>
        `;
        
        infoWindow.document.write(stockHtml);
        infoWindow.document.close();
        
        setTimeout(() => {
          alert('✅ Fiche article affichée avec succès !');
        }, 500);
        
        return;
      }
      
      // Use the new PDF endpoint for document visualization (devis, facture, paiement)
      const response = await fetch(`${API_BASE_URL}/api/pdf/document/${type}/${id}`);
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      // Create blob from PDF response
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Open PDF in new window
      const newWindow = window.open(url, '_blank', 'width=900,height=1200,scrollbars=yes');
      
      if (!newWindow) {
        // Fallback: download if popup blocked
        const link = document.createElement('a');
        link.href = url;
        link.download = `${type}_${id}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        alert('✅ Document téléchargé (popup bloqué)');
      } else {
        newWindow.onload = () => {
          URL.revokeObjectURL(url);
        };
        alert('✅ Document PDF généré avec succès !');
      }
      
    } catch (error) {
      console.error('Error viewing document:', error);
      alert(`❌ Erreur lors de la visualisation: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocument = async (type, id) => {
    try {
      setLoading(true);
      
      // Use the new PDF endpoint for document download
      const response = await fetch(`${API_BASE_URL}/api/pdf/document/${type.replace('recu', 'paiement')}/${id}`);
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      // Create blob from PDF response
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      
      // Generate appropriate filename
      let filename = '';
      if (type === 'devis') {
        filename = `DEVIS_${id}_${new Date().toISOString().split('T')[0]}.pdf`;
      } else if (type === 'facture') {
        filename = `FACTURE_${id}_${new Date().toISOString().split('T')[0]}.pdf`;
      } else if (type === 'recu') {
        filename = `RECU_PAIEMENT_${id}_${new Date().toISOString().split('T')[0]}.pdf`;
      } else {
        filename = `DOCUMENT_${type}_${id}_${new Date().toISOString().split('T')[0]}.pdf`;
      }
      
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} PDF téléchargé avec succès !`);
      
    } catch (error) {
      console.error(`Error downloading ${type}:`, error);
      alert(`❌ Erreur lors du téléchargement: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (reportType) => {
    try {
      setLoading(true);
      
      // Map report types to backend endpoints
      let backendReportType = '';
      switch (reportType) {
        case 'Journal des Ventes':
          backendReportType = 'journal_ventes';
          break;
        case 'Journal des Achats':
          backendReportType = 'journal_achats';
          break;
        case 'Balance Clients':
          backendReportType = 'balance_clients';
          break;
        case 'Balance Fournisseurs':
          backendReportType = 'balance_fournisseurs';
          break;
        case 'Suivi de Trésorerie':
          backendReportType = 'tresorerie';
          break;
        case 'Compte de Résultat':
          backendReportType = 'compte_resultat';
          break;
        case 'Export Global PDF':
          backendReportType = 'compte_resultat'; // Default to compte_resultat for export
          break;
        default:
          backendReportType = 'compte_resultat';
      }
      
      // Use the new PDF endpoint for report generation with date filters
      let apiUrl = `${API_BASE_URL}/api/pdf/rapport/${backendReportType}`;
      
      // Add date filters if they are set
      const queryParams = [];
      if (rapportFilters.date_debut) {
        queryParams.push(`date_debut=${rapportFilters.date_debut}`);
      }
      if (rapportFilters.date_fin) {
        queryParams.push(`date_fin=${rapportFilters.date_fin}`);
      }
      
      if (queryParams.length > 0) {
        apiUrl += '?' + queryParams.join('&');
      }
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      // Create blob from PDF response
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Open PDF in new window
      const newWindow = window.open(url, '_blank', 'width=900,height=1200,scrollbars=yes');
      
      if (!newWindow) {
        // Fallback: download if popup blocked
        const link = document.createElement('a');
        link.href = url;
        link.download = `ECO_PUMP_AFRIK_${backendReportType}_${new Date().toISOString().split('T')[0]}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        alert('✅ Rapport PDF téléchargé (popup bloqué)');
      } else {
        newWindow.onload = () => {
          URL.revokeObjectURL(url);
        };
        alert(`✅ Rapport "${reportType}" généré avec succès !\n🎨 Rapport PDF professionnel avec design moderne ECO PUMP AFRIK\n📊 Données complètes et analyses détaillées`);
      }
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert(`❌ Erreur lors de la génération du rapport: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    handleGenerateReport('Export Global PDF');
  };

  const handleExportExcel = async () => {
    try {
      setLoading(true);
      
      // Create professional Excel-compatible CSV with ECO PUMP AFRIK branding
      const csvHeader = `ECO PUMP AFRIK - GESTION INTELLIGENTE
🏭 Export Données Complètes
Date d'export: ${new Date().toLocaleDateString('fr-FR')}
Adresse: Cocody - Angré 7e Tranche
Tel: +225 0707806359 / +225 0748576956
Email: ouanlo.ouattara@ecopumpafrik.com
Site Web: www.ecopumpafrik.com

═══════════════════════════════════════════════════════════════════════════════

RÉSUMÉ STATISTIQUES:
- Total Clients: ${stats.total_clients || 0}
- Total Devis: ${stats.total_devis || 0} 
- Total Factures: ${stats.total_factures || 0}
- Montant à Encaisser: ${formatCurrency(stats.montant_a_encaisser || 0)}

═══════════════════════════════════════════════════════════════════════════════

DONNÉES CLIENTS:`;

      const clientsData = clients.map(c => [
        c.nom,
        c.numero_cc || '',
        c.numero_rc || '',
        c.nif || '',
        c.email || '',
        c.telephone || '',
        c.adresse?.replace(/[\r\n]+/g, ' ') || '',
        c.devise,
        c.type_client,
        c.conditions_paiement || '',
        formatDate(c.created_at)
      ]);

      const devisData = devis.map(d => [
        d.numero_devis,
        d.client_nom,
        formatDate(d.date_devis),
        formatCurrency(d.total_ttc, d.devise),
        d.devise,
        d.statut,
        d.delai_livraison || '',
        d.conditions_paiement || '',
        d.reference_commande || ''
      ]);

      const facturesData = factures.map(f => [
        f.numero_facture,
        f.client_nom,
        formatDate(f.date_facture),
        formatCurrency(f.total_ttc, f.devise),
        f.devise,
        f.statut_paiement,
        formatCurrency(f.montant_paye || 0, f.devise),
        formatCurrency((f.total_ttc - (f.montant_paye || 0)), f.devise)
      ]);

      // Create CSV content with proper structure
      const csvContent = `${csvHeader}

Nom,Numéro CC,Numéro RC,NIF,Email,Téléphone,Adresse,Devise,Type Client,Conditions Paiement,Date Création
${clientsData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')}

═══════════════════════════════════════════════════════════════════════════════

DONNÉES DEVIS:
Numéro Devis,Client,Date,Montant,Devise,Statut,Délai Livraison,Conditions Paiement,Référence Commande
${devisData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')}

═══════════════════════════════════════════════════════════════════════════════

DONNÉES FACTURES:
Numéro Facture,Client,Date,Montant Total,Devise,Statut Paiement,Montant Payé,Solde Restant
${facturesData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')}

═══════════════════════════════════════════════════════════════════════════════

ANALYSE FINANCIÈRE:
Total Devis ce mois:, ${formatCurrency(stats.montant_devis_mois || 0)}
Total Factures ce mois:, ${formatCurrency(stats.montant_factures_mois || 0)}
Montant à Encaisser:, ${formatCurrency(stats.montant_a_encaisser || 0)}

═══════════════════════════════════════════════════════════════════════════════

Rapport généré le: ${new Date().toLocaleString('fr-FR')}
ECO PUMP AFRIK - Tous droits réservés`;

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ECO_PUMP_AFRIK_Export_Complet_${new Date().toISOString().split('T')[0]}.csv`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('✅ Export Excel complet téléchargé avec succès !\n🏭 ECO PUMP AFRIK - Données exportées avec logo et structure professionnelle');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert(`❌ Erreur lors de l'export: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditStock = (articleId) => {
    const article = stock.find(a => a.article_id === articleId);
    if (article) {
      setStockForm({
        ref: article.ref,
        designation: article.designation,
        quantite_stock: article.quantite_stock,
        stock_minimum: article.stock_minimum,
        prix_achat_moyen: article.prix_achat_moyen,
        prix_vente: article.prix_vente,
        fournisseur_principal: article.fournisseur_principal || '',
        emplacement: article.emplacement || ''
      });
      setIsStockDialogOpen(true);
    }
  };

  // Stock movement state
  const [stockMovementDialog, setStockMovementDialog] = useState({
    open: false,
    article: null,
    movement: '',
    reason: '',
    type: 'in' // 'in' for entry, 'out' for exit
  });

  const handleStockMovement = async (articleId) => {
    const article = stock.find(a => a.article_id === articleId);
    if (!article) return;
    
    setStockMovementDialog({
      open: true,
      article: article,
      movement: '',
      reason: '',
      type: 'in'
    });
  };

  // Duplicate detection and alphabetical sorting
  const detectDuplicateClients = () => {
    const duplicates = [];
    const seen = new Map();
    
    clients.forEach(client => {
      const key = client.nom.toLowerCase().trim();
      if (seen.has(key)) {
        duplicates.push({
          original: seen.get(key),
          duplicate: client,
          reason: 'Même nom'
        });
      } else {
        seen.set(key, client);
      }
    });
    
    return duplicates;
  };

  const detectDuplicateFournisseurs = () => {
    const duplicates = [];
    const seen = new Map();
    
    fournisseurs.forEach(fournisseur => {
      const key = fournisseur.nom.toLowerCase().trim();
      if (seen.has(key)) {
        duplicates.push({
          original: seen.get(key),
          duplicate: fournisseur,
          reason: 'Même nom'
        });
      } else {
        seen.set(key, fournisseur);
      }
    });
    
    return duplicates;
  };

  // Sort functions
  const getSortedClients = () => {
    return [...clients].sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
  };

  const getSortedFournisseurs = () => {
    return [...fournisseurs].sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
  };

  // Generate specialized lists with period filters  
  const handleGenerateList = async (listType) => {
    try {
      setLoading(true);
      
      // Build API URL with date filters
      let apiUrl = `${API_BASE_URL}/api/pdf/liste/${listType}`;
      
      // Add date filters if they are set
      const queryParams = [];
      if (rapportFilters.date_debut) {
        queryParams.push(`date_debut=${rapportFilters.date_debut}`);
      }
      if (rapportFilters.date_fin) {
        queryParams.push(`date_fin=${rapportFilters.date_fin}`);
      }
      
      if (queryParams.length > 0) {
        apiUrl += '?' + queryParams.join('&');
      }
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      // Create blob from PDF response
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Open PDF in new window
      const newWindow = window.open(url, '_blank', 'width=900,height=1200,scrollbars=yes');
      
      if (!newWindow) {
        // Fallback: download if popup blocked
        const link = document.createElement('a');
        link.href = url;
        const period = rapportFilters.date_debut && rapportFilters.date_fin ? 
          `_${rapportFilters.date_debut}_${rapportFilters.date_fin}` : '';
        link.download = `ECO_PUMP_AFRIK_${listType}${period}_${new Date().toISOString().split('T')[0]}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        alert('✅ Liste PDF téléchargée (popup bloqué)');
      } else {
        newWindow.onload = () => {
          URL.revokeObjectURL(url);
        };
        
        const periodText = rapportFilters.date_debut && rapportFilters.date_fin ? 
          `\n📅 Période: ${rapportFilters.date_debut} au ${rapportFilters.date_fin}` : 
          '\n📅 Toutes les dates';
        
        alert(`✅ Liste "${listType.replace('-', ' ')}" générée avec succès !${periodText}\n🎨 PDF professionnel avec logo ECO PUMP AFRIK`);
      }
      
    } catch (error) {
      console.error('Error generating list:', error);
      alert(`❌ Erreur lors de la génération de la liste: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStockMovementSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const { article, movement, type, reason } = stockMovementDialog;
      
      if (!movement || isNaN(movement) || parseFloat(movement) <= 0) {
        alert('Veuillez saisir une quantité valide');
        return;
      }
      
      const movementQuantity = parseFloat(movement);
      const newQuantity = type === 'in' ? 
        parseFloat(article.quantite_stock) + movementQuantity :
        parseFloat(article.quantite_stock) - movementQuantity;
      
      if (newQuantity < 0) {
        alert('❌ Impossible: Stock ne peut pas être négatif');
        return;
      }
      
      // Update stock quantity
      await axios.put(`${API_BASE_URL}/api/stock/${article.article_id}`, {
        quantite_stock: newQuantity
      });
      
      await fetchAll();
      
      const operationType = type === 'in' ? 'Entrée' : 'Sortie';
      const alertMsg = newQuantity <= article.stock_minimum ? 
        `⚠️ ALERTE: ${operationType} enregistrée ! Nouveau stock: ${newQuantity} (En dessous du minimum: ${article.stock_minimum})` :
        `✅ ${operationType} enregistrée avec succès ! Nouveau stock: ${newQuantity}`;
      
      alert(alertMsg + `\nMotif: ${reason || 'Non spécifié'}`);
      
      // Close dialog
      setStockMovementDialog({ open: false, article: null, movement: '', reason: '', type: 'in' });
    } catch (error) {
      console.error('Error updating stock:', error);
      alert(`❌ Erreur lors de la mise à jour du stock: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditFournisseur = (fournisseurId) => {
    const fournisseur = fournisseurs.find(f => f.fournisseur_id === fournisseurId);
    if (fournisseur) {
      setFournisseurForm({
        nom: fournisseur.nom,
        numero_cc: fournisseur.numero_cc || '',
        numero_rc: fournisseur.numero_rc || '',
        email: fournisseur.email || '',
        telephone: fournisseur.telephone || '',
        adresse: fournisseur.adresse || '',
        devise: fournisseur.devise,
        conditions_paiement: fournisseur.conditions_paiement || ''
      });
      setIsFournisseurDialogOpen(true);
    }
  };

  const handleDeleteFournisseur = async (fournisseurId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) {
      try {
        setLoading(true);
        await axios.delete(`${API_BASE_URL}/api/fournisseurs/${fournisseurId}`);
        fetchAll();
        alert('✅ Fournisseur supprimé avec succès');
      } catch (error) {
        console.error('Error deleting fournisseur:', error);
        alert(`❌ Erreur lors de la suppression: ${error.response?.data?.detail || error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const formatCurrency = (amount, currency = 'FCFA') => {
    const formatted = new Intl.NumberFormat('fr-FR').format(amount);
    return currency === 'EUR' ? `${formatted} €` : `${formatted} F CFA`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getStatutBadge = (statut) => {
    const variants = {
      'brouillon': 'secondary',
      'envoyé': 'default',
      'accepté': 'default',
      'converti': 'default',
      'émise': 'default',
      'payé': 'default',
      'impayé': 'destructive',
      'partiel': 'secondary'
    };
    return variants[statut] || 'secondary';
  };

  // Système d'alertes automatiques intelligentes
  const generateSmartAlerts = () => {
    const alertsArray = [];
    
    // Alertes Stock Bas
    if (alerts.length > 0) {
      alertsArray.push({
        type: 'warning',
        title: 'Stock Critique',
        message: `${alerts.length} article(s) en stock bas nécessitent votre attention`,
        action: () => setActiveTab('stock')
      });
    }
    
    // Alertes Factures Impayées
    const facturesImpayes = factures.filter(f => f.statut_paiement === 'impayé');
    if (facturesImpayes.length > 0) {
      alertsArray.push({
        type: 'error',
        title: 'Factures Impayées',
        message: `${facturesImpayes.length} facture(s) impayée(s) - ${formatCurrency(stats.montant_a_encaisser || 0)}`,
        action: () => setActiveTab('factures')
      });
    }
    
    // Alertes Devis en Attente
    const devisEnAttente = devis.filter(d => d.statut === 'envoyé');
    if (devisEnAttente.length > 0) {
      alertsArray.push({
        type: 'info',
        title: 'Devis en Attente',
        message: `${devisEnAttente.length} devis en attente de réponse client`,
        action: () => setActiveTab('devis')
      });
    }
    
    // Alertes Performance Mensuelle
    const currentMonth = new Date().getMonth();
    const thisMonthFactures = factures.filter(f => new Date(f.date_facture).getMonth() === currentMonth);
    if (thisMonthFactures.length > 5) {
      alertsArray.push({
        type: 'success',
        title: 'Performance Excellent',
        message: `🎉 ${thisMonthFactures.length} factures ce mois ! Excellent travail !`,
        action: () => setActiveTab('rapports')
      });
    }
    
    return alertsArray;
  };

  const smartAlerts = generateSmartAlerts();

  // Fournisseur form handlers
  const handleFournisseurSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post(`${API_BASE_URL}/api/fournisseurs`, fournisseurForm);
      setFournisseurForm({
        nom: '', numero_cc: '', numero_rc: '', email: '', 
        telephone: '', adresse: '', devise: 'FCFA', conditions_paiement: ''
      });
      setIsFournisseurDialogOpen(false);
      fetchAll();
    } catch (error) {
      console.error('Error saving fournisseur:', error);
      alert('Erreur lors de la sauvegarde du fournisseur');
    } finally {
      setLoading(false);
    }
  };

  // Convert devis to facture
  const convertDevisToFacture = async (devisId) => {
    if (window.confirm('Convertir ce devis en facture ?')) {
      try {
        setLoading(true);
        await axios.post(`${API_BASE_URL}/api/devis/${devisId}/convert-to-facture`);
        fetchAll();
        alert('Devis converti en facture avec succès !');
      } catch (error) {
        console.error('Error converting devis:', error);
        alert('Erreur lors de la conversion');
      } finally {
        setLoading(false);
      }
    }
  };

  // Article calculations
  const calculateArticleTotal = (quantite, prixUnitaire) => {
    return quantite * prixUnitaire;
  };

  const calculateDevisTotal = (articles) => {
    const sousTotal = articles.reduce((sum, article) => sum + article.total, 0);
    const tva = sousTotal * 0.18; // 18% TVA
    const totalTTC = sousTotal + tva;
    return { sousTotal, tva, totalTTC };
  };

  // Devis form handlers
  const handleDevisSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { sousTotal, tva, totalTTC } = calculateDevisTotal(devisForm.articles);
      
      const devisData = {
        ...devisForm,
        sous_total: sousTotal,
        tva: tva,
        total_ttc: totalTTC,
        net_a_payer: totalTTC,
        devise: clients.find(c => c.client_id === devisForm.client_id)?.devise || 'FCFA'
      };
      
      await axios.post(`${API_BASE_URL}/api/devis`, devisData);
      
      setDevisForm({
        client_id: '', client_nom: '',
        articles: [{ item: 1, ref: '', designation: '', quantite: 1, prix_unitaire: 0, total: 0 }],
        delai_livraison: '', conditions_paiement: '', mode_livraison: '', reference_commande: '',
        commentaires: ''
      });
      
      setIsDevisDialogOpen(false);
      fetchAll();
    } catch (error) {
      console.error('Error creating devis:', error);
      alert('Erreur lors de la création du devis');
    } finally {
      setLoading(false);
    }
  };

  // Facture form handlers
  const handleFactureSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { sousTotal, tva, totalTTC } = calculateDevisTotal(factureForm.articles);
      
      const factureData = {
        ...factureForm,
        sous_total: sousTotal,
        tva: tva,
        total_ttc: totalTTC,
        net_a_payer: totalTTC,
        statut_paiement: 'impayé',
        montant_paye: 0.0,
        devise: clients.find(c => c.client_id === factureForm.client_id)?.devise || 'FCFA'
      };
      
      await axios.post(`${API_BASE_URL}/api/factures`, factureData);
      
      setFactureForm({
        client_id: '', client_nom: '',
        articles: [{ item: 1, ref: '', designation: '', quantite: 1, prix_unitaire: 0, total: 0 }],
        delai_livraison: '', conditions_paiement: '', mode_livraison: '', reference_commande: '',
        commentaires: ''
      });
      
      setIsFactureDialogOpen(false);
      fetchAll();
    } catch (error) {
      console.error('Error creating facture:', error);
      alert('Erreur lors de la création de la facture');
    } finally {
      setLoading(false);
    }
  };

  // Paiement form handlers
  const handlePaiementSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post(`${API_BASE_URL}/api/paiements`, paiementForm);
      
      setPaiementForm({
        type_document: 'facture', document_id: '', client_id: '',
        montant: 0, devise: 'FCFA', mode_paiement: 'espèce', reference_paiement: ''
      });
      
      setIsPaiementDialogOpen(false);
      fetchAll();
    } catch (error) {
      console.error('Error creating paiement:', error);
      alert('Erreur lors de l\'enregistrement du paiement');
    } finally {
      setLoading(false);
    }
  };

  // Stock form handlers
  const handleStockSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post(`${API_BASE_URL}/api/stock`, stockForm);
      
      setStockForm({
        ref: '', designation: '', quantite_stock: 0, stock_minimum: 0,
        prix_achat_moyen: 0, prix_vente: 0, fournisseur_principal: '', emplacement: ''
      });
      
      setIsStockDialogOpen(false);
      fetchAll();
    } catch (error) {
      console.error('Error creating article:', error);
      alert('Erreur lors de la création de l\'article');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Professional Header */}
      <header className="bg-white shadow-lg border-b-4 border-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <Package className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">ECO PUMP AFRIK</h1>
                <p className="text-sm text-blue-600 font-medium">Solutions Hydrauliques Professionnelles</p>
              </div>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>{clients.length} clients</span>
              </div>
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>{factures.length} factures</span>
              </div>
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4" />
                <span>{stock.length} articles</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Modern Navigation Tabs */}
          <TabsList className="grid w-full grid-cols-8 lg:grid-cols-8 bg-white rounded-lg shadow-md p-1 border border-gray-200">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Tableau de Bord</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center space-x-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Clients</span>
            </TabsTrigger>
            <TabsTrigger value="fournisseurs" className="flex items-center space-x-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Fournisseurs</span>
            </TabsTrigger>
            <TabsTrigger value="devis" className="flex items-center space-x-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <FileCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Devis</span>
            </TabsTrigger>
            <TabsTrigger value="factures" className="flex items-center space-x-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Factures</span>
            </TabsTrigger>
            <TabsTrigger value="stock" className="flex items-center space-x-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Stock</span>
            </TabsTrigger>
            <TabsTrigger value="paiements" className="flex items-center space-x-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Paiements</span>
            </TabsTrigger>
            <TabsTrigger value="rapports" className="flex items-center space-x-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Rapports</span>
            </TabsTrigger>
          </TabsList>

          {/* Search Results */}
          {Object.keys(searchResults).length > 0 && searchQuery && (
            <Card>
              <CardHeader>
                <CardTitle>Résultats de recherche pour "{searchQuery}"</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {searchResults.clients && searchResults.clients.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Clients ({searchResults.clients.length})</h4>
                      {searchResults.clients.map(client => (
                        <p key={client.client_id} className="text-sm text-gray-600">
                          {client.nom} - {client.email}
                        </p>
                      ))}
                    </div>
                  )}
                  {searchResults.devis && searchResults.devis.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Devis ({searchResults.devis.length})</h4>
                      {searchResults.devis.map(devis => (
                        <p key={devis.devis_id} className="text-sm text-gray-600">
                          {devis.numero_devis} - {devis.client_nom}
                        </p>
                      ))}
                    </div>
                  )}
                  {searchResults.factures && searchResults.factures.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Factures ({searchResults.factures.length})</h4>
                      {searchResults.factures.map(facture => (
                        <p key={facture.facture_id} className="text-sm text-gray-600">
                          {facture.numero_facture} - {facture.client_nom}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Smart Alerts System */}
          {smartAlerts.length > 0 && (
            <div className="mb-6 space-y-3">
              {smartAlerts.map((alert, index) => (
                <Alert 
                  key={index} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    alert.type === 'error' ? 'border-red-200 bg-red-50' :
                    alert.type === 'warning' ? 'border-orange-200 bg-orange-50' :
                    alert.type === 'success' ? 'border-green-200 bg-green-50' :
                    'border-blue-200 bg-blue-50'
                  }`}
                  onClick={alert.action}
                >
                  <AlertTriangle className={`h-4 w-4 ${
                    alert.type === 'error' ? 'text-red-600' :
                    alert.type === 'warning' ? 'text-orange-600' :
                    alert.type === 'success' ? 'text-green-600' :
                    'text-blue-600'
                  }`} />
                  <div>
                    <AlertDescription className={`font-medium ${
                      alert.type === 'error' ? 'text-red-800' :
                      alert.type === 'warning' ? 'text-orange-800' :
                      alert.type === 'success' ? 'text-green-800' :
                      'text-blue-800'
                    }`}>
                      <span className="font-bold">{alert.title}:</span> {alert.message}
                    </AlertDescription>
                  </div>
                </Alert>
              ))}
            </div>
          )}

          {/* Dashboard Tab with enhanced design */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Alerts */}
            {alerts.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {alerts.length} article(s) en stock bas nécessitent votre attention.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-700">Total Clients</CardTitle>
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-700">{stats.total_clients || 0}</div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>FCFA: {stats.clients_fcfa || 0}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>EUR: {stats.clients_eur || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-700">Devis ce mois</CardTitle>
                  <div className="p-2 bg-green-100 rounded-full">
                    <FileText className="h-5 w-5 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-700">{stats.devis_ce_mois || 0}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    💰 Montant: <span className="font-semibold text-green-600">{formatCurrency(stats.montant_devis_mois || 0)}</span>
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-700">Factures ce mois</CardTitle>
                  <div className="p-2 bg-purple-100 rounded-full">
                    <Receipt className="h-5 w-5 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-700">{stats.factures_ce_mois || 0}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    💰 Montant: <span className="font-semibold text-purple-600">{formatCurrency(stats.montant_factures_mois || 0)}</span>
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-700">À Encaisser</CardTitle>
                  <div className="p-2 bg-orange-100 rounded-full">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-700">
                    {formatCurrency(stats.montant_a_encaisser || 0)}
                  </div>
                  <p className="text-xs text-orange-600 mt-2 font-medium">
                    ⏰ Factures impayées
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Secondary Stats with enhanced design */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-slate-50 to-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-700">Fournisseurs</CardTitle>
                  <div className="p-2 bg-slate-100 rounded-full">
                    <Building2 className="h-5 w-5 text-slate-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-700">{stats.total_fournisseurs || 0}</div>
                  <p className="text-xs text-muted-foreground mt-2">Partenaires actifs</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-red-50 to-white border-l-4 border-l-red-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-700">Alertes Stock</CardTitle>
                  <div className="p-2 bg-red-100 rounded-full">
                    <Package className="h-5 w-5 text-red-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">{stats.stock_alerts || 0}</div>
                  <p className="text-xs text-red-600 mt-2 font-medium">
                    {stats.stock_alerts > 0 ? '⚠️ Action requise' : '✅ Stock optimal'}
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-indigo-50 to-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-700">Total Documents</CardTitle>
                  <div className="p-2 bg-indigo-100 rounded-full">
                    <FileCheck className="h-5 w-5 text-indigo-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-indigo-700">
                    {(stats.total_devis || 0) + (stats.total_factures || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    📄 {stats.total_devis || 0} devis, 🧾 {stats.total_factures || 0} factures
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Activité Récente - Devis</CardTitle>
                  <CardDescription>Derniers devis créés</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {devis.slice(0, 5).map((d) => (
                      <div key={d.devis_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{d.numero_devis}</p>
                          <p className="text-xs text-muted-foreground">{d.client_nom}</p>
                          <p className="text-xs text-blue-600 font-medium">
                            📅 {d.created_at_formatted || formatDate(d.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatCurrency(d.total_ttc, d.devise)}</p>
                          <Badge variant={getStatutBadge(d.statut)} className="text-xs">{d.statut}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Activité Récente - Factures</CardTitle>
                  <CardDescription>Dernières factures émises</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {factures.slice(0, 5).map((f) => (
                      <div key={f.facture_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{f.numero_facture}</p>
                          <p className="text-xs text-muted-foreground">{f.client_nom}</p>
                          <p className="text-xs text-purple-600 font-medium">
                            📅 {f.created_at_formatted || formatDate(f.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatCurrency(f.total_ttc, f.devise)}</p>
                          <Badge variant={getStatutBadge(f.statut_paiement)} className="text-xs">
                            {f.statut_paiement}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Gestion des Clients</h2>
              <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingClient(null); resetClientForm(); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau Client
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>{editingClient ? 'Modifier le Client' : 'Nouveau Client'}</DialogTitle>
                    <DialogDescription>
                      Remplissez les informations complètes du client.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleClientSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="nom">Nom/Raison Sociale *</Label>
                        <Input
                          id="nom"
                          required
                          value={clientForm.nom}
                          onChange={(e) => setClientForm({ ...clientForm, nom: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="numero_cc">Numéro CC</Label>
                        <Input
                          id="numero_cc"
                          value={clientForm.numero_cc}
                          onChange={(e) => setClientForm({ ...clientForm, numero_cc: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="numero_rc">Numéro RC</Label>
                        <Input
                          id="numero_rc"
                          value={clientForm.numero_rc}
                          onChange={(e) => setClientForm({ ...clientForm, numero_rc: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="nif">NIF</Label>
                        <Input
                          id="nif"
                          value={clientForm.nif}
                          onChange={(e) => setClientForm({ ...clientForm, nif: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={clientForm.email}
                          onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="telephone">Téléphone</Label>
                        <Input
                          id="telephone"
                          value={clientForm.telephone}
                          onChange={(e) => setClientForm({ ...clientForm, telephone: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="adresse">Adresse</Label>
                      <Textarea
                        id="adresse"
                        value={clientForm.adresse}
                        onChange={(e) => setClientForm({ ...clientForm, adresse: e.target.value })}
                        rows={2}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="conditions_paiement">Conditions de paiement</Label>
                      <Input
                        id="conditions_paiement"
                        value={clientForm.conditions_paiement}
                        onChange={(e) => setClientForm({ ...clientForm, conditions_paiement: e.target.value })}
                        placeholder="Ex: 30 jours fin de mois"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="devise">Devise</Label>
                        <Select value={clientForm.devise} onValueChange={(value) => setClientForm({ ...clientForm, devise: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FCFA">FCFA (Local)</SelectItem>
                            <SelectItem value="EUR">EUR (International)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="type_client">Type Client</Label>
                        <Select value={clientForm.type_client} onValueChange={(value) => setClientForm({ ...clientForm, type_client: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="revendeur">Revendeur</SelectItem>
                            <SelectItem value="industriel">Industriel</SelectItem>
                            <SelectItem value="institution">Institution</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsClientDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Enregistrement...' : (editingClient ? 'Modifier' : 'Créer')}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Intelligent Search Interface */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="mr-2 h-5 w-5" />
                  Recherche de Clients Intelligente
                </CardTitle>
                <CardDescription>
                  Recherchez par nom, email ou téléphone pour afficher les clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Tapez le nom, email ou téléphone du client..."
                    value={clientsSearch}
                    onChange={(e) => setClientsSearch(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleClientsSearch}>
                    <Search className="mr-2 h-4 w-4" />
                    Rechercher
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setClientsSearch('');
                      setShowClientsData(true);
                    }}
                  >
                    Voir Tout ({clients.length})
                  </Button>
                  {showClientsData && (
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowClientsData(false)}
                    >
                      Masquer Tout
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Results Display */}
            {showClientsData && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Résultats ({getFilteredClients().length} client{getFilteredClients().length > 1 ? 's' : ''})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom/Raison Sociale</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Identifiants</TableHead>
                        <TableHead>Devise</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date Création</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredClients().map((client) => (
                        <TableRow key={client.client_id}>
                          <TableCell className="font-medium">
                            <div>
                              <p>{client.nom}</p>
                              {client.conditions_paiement && (
                                <p className="text-xs text-muted-foreground">
                                  Conditions: {client.conditions_paiement}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {client.telephone && <p className="text-sm">{client.telephone}</p>}
                              {client.email && <p className="text-xs text-muted-foreground">{client.email}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {client.numero_cc && <p className="text-xs">CC: {client.numero_cc}</p>}
                              {client.numero_rc && <p className="text-xs">RC: {client.numero_rc}</p>}
                              {client.nif && <p className="text-xs">NIF: {client.nif}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={client.devise === 'EUR' ? 'default' : 'secondary'}>
                              {client.devise}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{client.type_client}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(client.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button size="sm" variant="outline" onClick={() => handleEditClient(client)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleDeleteClient(client.client_id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Similar extensive implementations for other tabs would continue here... */}
          {/* Due to length constraints, I'll provide the framework with key tabs */}

          {/* Devis Tab with Convert to Facture functionality */}
          <TabsContent value="devis" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Gestion des Devis</h2>
              <Dialog open={isDevisDialogOpen} onOpenChange={setIsDevisDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau Devis
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nouveau Devis</DialogTitle>
                    <DialogDescription>
                      Créer un nouveau devis pour un client.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleDevisSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="client">Client *</Label>
                        <Select 
                          value={devisForm.client_id} 
                          onValueChange={(value) => {
                            const selectedClient = clients.find(c => c.client_id === value);
                            setDevisForm({ 
                              ...devisForm, 
                              client_id: value, 
                              client_nom: selectedClient?.nom || '' 
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un client" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.client_id} value={client.client_id}>
                                {client.nom} ({client.devise})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="reference_commande">Référence commande</Label>
                        <Input
                          id="reference_commande"
                          value={devisForm.reference_commande}
                          onChange={(e) => setDevisForm({ ...devisForm, reference_commande: e.target.value })}
                          placeholder="Ex: CMD2025001"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="delai_livraison">Délai de livraison</Label>
                        <Input
                          id="delai_livraison"
                          value={devisForm.delai_livraison}
                          onChange={(e) => setDevisForm({ ...devisForm, delai_livraison: e.target.value })}
                          placeholder="Ex: 15 jours"
                        />
                      </div>
                      <div>
                        <Label htmlFor="conditions_paiement">Conditions de paiement</Label>
                        <Select value={devisForm.conditions_paiement} onValueChange={(value) => setDevisForm({ ...devisForm, conditions_paiement: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner les conditions" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A définir entre nous">À définir entre nous</SelectItem>
                            <SelectItem value="60% à la commande, solde avant la livraison">60% à la commande, solde avant la livraison</SelectItem>
                            <SelectItem value="100% à la commande">100% à la commande</SelectItem>
                            <SelectItem value="30 Jours date facture">30 Jours date facture</SelectItem>
                            <SelectItem value="Paiement à la livraison">Paiement à la livraison</SelectItem>
                            <SelectItem value="50% à la commande, 50% à la livraison">50% à la commande, 50% à la livraison</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="devis_mode_livraison">Mode de livraison</Label>
                        <Select value={devisForm.mode_livraison} onValueChange={(value) => setDevisForm({ ...devisForm, mode_livraison: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner le mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ex-works">Ex-Works (départ usine)</SelectItem>
                            <SelectItem value="livraison-incluse">Livraison incluse</SelectItem>
                            <SelectItem value="franco-domicile">Franco domicile</SelectItem>
                            <SelectItem value="collecte-client">Collecte par le client</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="col-span-2">
                        <Label htmlFor="devis_commentaires">Commentaires/Notes</Label>
                        <textarea
                          id="devis_commentaires"
                          className="w-full p-2 border border-gray-300 rounded-md resize-vertical"
                          rows="3"
                          value={devisForm.commentaires || ''}
                          onChange={(e) => setDevisForm({ ...devisForm, commentaires: e.target.value })}
                          placeholder="Informations complémentaires, instructions spéciales, notes internes..."
                        />
                      </div>
                    </div>

                    {/* Articles section */}
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <Label>Articles</Label>
                        <Button 
                          type="button" 
                          onClick={() => {
                            const newArticle = {
                              item: devisForm.articles.length + 1,
                              ref: '',
                              designation: '',
                              quantite: 1,
                              prix_unitaire: 0,
                              total: 0
                            };
                            setDevisForm({
                              ...devisForm,
                              articles: [...devisForm.articles, newArticle]
                            });
                          }} 
                          size="sm" 
                          variant="outline"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Ajouter un article
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        {devisForm.articles.map((article, index) => (
                          <Card key={index} className="p-4">
                            <div className="grid grid-cols-6 gap-3 items-end">
                              <div>
                                <Label className="text-xs">REF</Label>
                                <Input
                                  value={article.ref}
                                  onChange={(e) => {
                                    const newArticles = [...devisForm.articles];
                                    newArticles[index].ref = e.target.value;
                                    setDevisForm({ ...devisForm, articles: newArticles });
                                  }}
                                  placeholder="Référence"
                                  className="text-sm"
                                />
                              </div>
                              <div className="col-span-2">
                                <Label className="text-xs">Désignation *</Label>
                                <Input
                                  required
                                  value={article.designation}
                                  onChange={(e) => {
                                    const newArticles = [...devisForm.articles];
                                    newArticles[index].designation = e.target.value;
                                    setDevisForm({ ...devisForm, articles: newArticles });
                                  }}
                                  placeholder="Description de l'article"
                                  className="text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Qté *</Label>
                                <Input
                                  required
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={article.quantite}
                                  onChange={(e) => {
                                    const newArticles = [...devisForm.articles];
                                    const qte = parseFloat(e.target.value) || 0;
                                    newArticles[index].quantite = qte;
                                    newArticles[index].total = qte * newArticles[index].prix_unitaire;
                                    setDevisForm({ ...devisForm, articles: newArticles });
                                  }}
                                  className="text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Prix U. *</Label>
                                <Input
                                  required
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={article.prix_unitaire}
                                  onChange={(e) => {
                                    const newArticles = [...devisForm.articles];
                                    const prix = parseFloat(e.target.value) || 0;
                                    newArticles[index].prix_unitaire = prix;
                                    newArticles[index].total = newArticles[index].quantite * prix;
                                    setDevisForm({ ...devisForm, articles: newArticles });
                                  }}
                                  className="text-sm"
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="flex-1">
                                  <Label className="text-xs">Total</Label>
                                  <div className="text-sm font-medium p-2 bg-slate-100 rounded">
                                    {formatCurrency(article.total)}
                                  </div>
                                </div>
                                {devisForm.articles.length > 1 && (
                                  <Button 
                                    type="button" 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => {
                                      const newArticles = devisForm.articles.filter((_, i) => i !== index);
                                      // Renumber items
                                      newArticles.forEach((a, i) => {
                                        a.item = i + 1;
                                      });
                                      setDevisForm({ ...devisForm, articles: newArticles });
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>

                    <Card className="bg-slate-50">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Sous-total:</span>
                            <span className="font-medium">{formatCurrency(calculateDevisTotal(devisForm.articles).sousTotal)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>TVA (18%):</span>
                            <span className="font-medium">{formatCurrency(calculateDevisTotal(devisForm.articles).tva)}</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold border-t pt-2">
                            <span>Total TTC:</span>
                            <span>{formatCurrency(calculateDevisTotal(devisForm.articles).totalTTC)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsDevisDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button type="submit" disabled={loading || !devisForm.client_id}>
                        {loading ? 'Création...' : 'Créer le Devis'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Advanced Search Filters for Devis */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Search className="mr-2 h-5 w-5 text-blue-600" />
                  Recherche Avancée & Filtres
                </CardTitle>
                <CardDescription>
                  Filtrez les devis par client, date, montant ou statut
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="filter_client_nom">Nom du client</Label>
                    <Input
                      id="filter_client_nom"
                      placeholder="Nom du client..."
                      value={devisFilters.client_nom}
                      onChange={(e) => setDevisFilters({ ...devisFilters, client_nom: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="filter_numero_devis">N° Devis</Label>
                    <Input
                      id="filter_numero_devis"
                      placeholder="DEV/CLIENT/..."
                      value={devisFilters.numero_devis}
                      onChange={(e) => setDevisFilters({ ...devisFilters, numero_devis: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="filter_devise_devis">Devise</Label>
                    <Select value={devisFilters.devise} onValueChange={(value) => setDevisFilters({ ...devisFilters, devise: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Toutes devises" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="toutes">Toutes devises</SelectItem>
                        <SelectItem value="FCFA">FCFA</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="filter_date_debut_devis">Date début</Label>
                    <Input
                      id="filter_date_debut_devis"
                      type="date"
                      value={devisFilters.date_debut}
                      onChange={(e) => setDevisFilters({ ...devisFilters, date_debut: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="filter_date_fin_devis">Date fin</Label>
                    <Input
                      id="filter_date_fin_devis"
                      type="date"
                      value={devisFilters.date_fin}
                      onChange={(e) => setDevisFilters({ ...devisFilters, date_fin: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="filter_statut_devis">Statut</Label>
                    <Select value={devisFilters.statut} onValueChange={(value) => setDevisFilters({ ...devisFilters, statut: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Tous statuts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tous">Tous statuts</SelectItem>
                        <SelectItem value="en_attente">En attente</SelectItem>
                        <SelectItem value="accepte">Accepté</SelectItem>
                        <SelectItem value="refuse">Refusé</SelectItem>
                        <SelectItem value="expire">Expiré</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => handleResetFilters('devis')}
                    disabled={loading}
                  >
                    🗑️ Effacer les filtres
                  </Button>
                  <Button 
                    onClick={() => handleAdvancedSearch('devis', devisFilters)}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? '⏳ Recherche...' : '🔍 Rechercher'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Interface de Recherche Intelligente pour Devis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="mr-2 h-5 w-5" />
                  Recherche de Devis Intelligente
                </CardTitle>
                <CardDescription>
                  Recherchez par numéro de devis ou nom de client
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Tapez le numéro de devis ou nom du client..."
                    value={devisSearch}
                    onChange={(e) => setDevisSearch(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleDevisSearch}>
                    <Search className="mr-2 h-4 w-4" />
                    Rechercher
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setDevisSearch('');
                      setShowDevisData(true);
                    }}
                  >
                    Voir Tout ({devis.length})
                  </Button>
                  {showDevisData && (
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowDevisData(false)}
                    >
                      Masquer Tout
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Affichage des Résultats Devis */}
            {showDevisData && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Résultats ({getFilteredDevis().length} devis)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Numéro</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredDevis().length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            <FileCheck className="mx-auto h-12 w-12 mb-2" />
                            <p>Aucun devis trouvé</p>
                            <p className="text-sm">Essayez une recherche différente</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        getFilteredDevis().map((d) => (
                          <TableRow key={d.devis_id}>
                            <TableCell className="font-medium">{d.numero_devis}</TableCell>
                            <TableCell>{d.client_nom}</TableCell>
                            <TableCell>{formatDate(d.date_devis)}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(d.total_ttc, d.devise)}</TableCell>
                            <TableCell>
                              <Badge variant={getStatutBadge(d.statut)}>{d.statut}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleViewDocument('devis', d.devis_id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {d.statut !== 'converti' && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => convertDevisToFacture(d.devis_id)}
                                    disabled={loading}
                                  >
                                    <ArrowRightLeft className="h-4 w-4 mr-1" />
                                    Facture
                                  </Button>
                                )}
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleDownloadDocument('devis', d.devis_id)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Fournisseurs Tab - Complete Implementation */}
          <TabsContent value="fournisseurs" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Gestion des Fournisseurs</h2>
              <Dialog open={isFournisseurDialogOpen} onOpenChange={setIsFournisseurDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau Fournisseur
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Nouveau Fournisseur</DialogTitle>
                    <DialogDescription>
                      Remplissez les informations complètes du fournisseur.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleFournisseurSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fournisseur_nom">Nom/Raison Sociale *</Label>
                        <Input
                          id="fournisseur_nom"
                          required
                          value={fournisseurForm.nom}
                          onChange={(e) => setFournisseurForm({ ...fournisseurForm, nom: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="fournisseur_cc">Numéro CC</Label>
                        <Input
                          id="fournisseur_cc"
                          value={fournisseurForm.numero_cc}
                          onChange={(e) => setFournisseurForm({ ...fournisseurForm, numero_cc: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fournisseur_rc">Numéro RC</Label>
                        <Input
                          id="fournisseur_rc"
                          value={fournisseurForm.numero_rc}
                          onChange={(e) => setFournisseurForm({ ...fournisseurForm, numero_rc: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="fournisseur_email">Email</Label>
                        <Input
                          id="fournisseur_email"
                          type="email"
                          value={fournisseurForm.email}
                          onChange={(e) => setFournisseurForm({ ...fournisseurForm, email: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fournisseur_telephone">Téléphone</Label>
                        <Input
                          id="fournisseur_telephone"
                          value={fournisseurForm.telephone}
                          onChange={(e) => setFournisseurForm({ ...fournisseurForm, telephone: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="fournisseur_devise">Devise</Label>
                        <Select value={fournisseurForm.devise} onValueChange={(value) => setFournisseurForm({ ...fournisseurForm, devise: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FCFA">FCFA (Local)</SelectItem>
                            <SelectItem value="EUR">EUR (International)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="fournisseur_adresse">Adresse</Label>
                      <Textarea
                        id="fournisseur_adresse"
                        value={fournisseurForm.adresse}
                        onChange={(e) => setFournisseurForm({ ...fournisseurForm, adresse: e.target.value })}
                        rows={2}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="fournisseur_conditions">Conditions de paiement</Label>
                      <Input
                        id="fournisseur_conditions"
                        value={fournisseurForm.conditions_paiement}
                        onChange={(e) => setFournisseurForm({ ...fournisseurForm, conditions_paiement: e.target.value })}
                        placeholder="Ex: 30 jours fin de mois"
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsFournisseurDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Enregistrement...' : 'Créer'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Interface de Recherche Intelligente pour Fournisseurs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="mr-2 h-5 w-5" />
                  Recherche de Fournisseurs Intelligente
                </CardTitle>
                <CardDescription>
                  Recherchez par nom ou email pour afficher les fournisseurs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Tapez le nom ou email du fournisseur..."
                    value={fournisseursSearch}
                    onChange={(e) => setFournisseursSearch(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleFournisseursSearch}>
                    <Search className="mr-2 h-4 w-4" />
                    Rechercher
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setFournisseursSearch('');
                      setShowFournisseursData(true);
                    }}
                  >
                    Voir Tout ({fournisseurs.length})
                  </Button>
                  {showFournisseursData && (
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowFournisseursData(false)}
                    >
                      Masquer Tout
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Affichage des Résultats */}
            {showFournisseursData && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Résultats ({getFilteredFournisseurs().length} fournisseur{getFilteredFournisseurs().length > 1 ? 's' : ''})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom/Raison Sociale</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Identifiants</TableHead>
                        <TableHead>Devise</TableHead>
                        <TableHead>Conditions Paiement</TableHead>
                        <TableHead>Date Création</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredFournisseurs().length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            <Building2 className="mx-auto h-12 w-12 mb-2" />
                            <p>Aucun fournisseur trouvé</p>
                            <p className="text-sm">Essayez une recherche différente</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        getFilteredFournisseurs().map((fournisseur) => (
                          <TableRow key={fournisseur.fournisseur_id}>
                            <TableCell className="font-medium">
                              <div>
                                <p>{fournisseur.nom}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {fournisseur.telephone && <p className="text-sm">{fournisseur.telephone}</p>}
                                {fournisseur.email && <p className="text-xs text-muted-foreground">{fournisseur.email}</p>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {fournisseur.numero_cc && <p className="text-xs">CC: {fournisseur.numero_cc}</p>}
                                {fournisseur.numero_rc && <p className="text-xs">RC: {fournisseur.numero_rc}</p>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={fournisseur.devise === 'EUR' ? 'default' : 'secondary'}>
                                {fournisseur.devise}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{fournisseur.conditions_paiement || 'Non défini'}</p>
                            </TableCell>
                            <TableCell>{formatDate(fournisseur.created_at)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleViewDocument('fournisseur', fournisseur.fournisseur_id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleEditFournisseur(fournisseur.fournisseur_id)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleDeleteFournisseur(fournisseur.fournisseur_id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Factures Tab - Complete Implementation */}
          <TabsContent value="factures" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Gestion des Factures</h2>
              <Dialog open={isFactureDialogOpen} onOpenChange={setIsFactureDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle Facture
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nouvelle Facture</DialogTitle>
                    <DialogDescription>
                      Créer une nouvelle facture indépendamment d'un devis.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleFactureSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="facture_client">Client *</Label>
                        <Select 
                          value={factureForm.client_id} 
                          onValueChange={(value) => {
                            const selectedClient = clients.find(c => c.client_id === value);
                            setFactureForm({ 
                              ...factureForm, 
                              client_id: value, 
                              client_nom: selectedClient?.nom || '' 
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un client" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.client_id} value={client.client_id}>
                                {client.nom} ({client.devise})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="facture_reference">Référence commande</Label>
                        <Input
                          id="facture_reference"
                          value={factureForm.reference_commande}
                          onChange={(e) => setFactureForm({ ...factureForm, reference_commande: e.target.value })}
                          placeholder="Ex: CMD2025001"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="facture_delai">Délai de livraison</Label>
                        <Input
                          id="facture_delai"
                          value={factureForm.delai_livraison}
                          onChange={(e) => setFactureForm({ ...factureForm, delai_livraison: e.target.value })}
                          placeholder="Ex: 15 jours"
                        />
                      </div>
                      <div>
                        <Label htmlFor="facture_conditions">Conditions de paiement</Label>
                        <Input
                          id="facture_conditions"
                          value={factureForm.conditions_paiement}
                          onChange={(e) => setFactureForm({ ...factureForm, conditions_paiement: e.target.value })}
                          placeholder="Ex: 30% à la commande"
                        />
                      </div>
                      <div>
                        <Label htmlFor="facture_livraison">Mode de livraison</Label>
                        <Select value={factureForm.mode_livraison} onValueChange={(value) => setFactureForm({ ...factureForm, mode_livraison: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner le mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ex-works">Ex-Works (départ usine)</SelectItem>
                            <SelectItem value="livraison-incluse">Livraison incluse</SelectItem>
                            <SelectItem value="franco-domicile">Franco domicile</SelectItem>
                            <SelectItem value="collecte-client">Collecte par le client</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="col-span-2">
                        <Label htmlFor="facture_commentaires">Commentaires/Notes</Label>
                        <textarea
                          id="facture_commentaires"
                          className="w-full p-2 border border-gray-300 rounded-md resize-vertical"
                          rows="3"
                          value={factureForm.commentaires || ''}
                          onChange={(e) => setFactureForm({ ...factureForm, commentaires: e.target.value })}
                          placeholder="Informations complémentaires, instructions spéciales, notes internes..."
                        />
                      </div>
                    </div>

                    {/* Articles section similar to devis */}
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <Label>Articles</Label>
                        <Button type="button" onClick={() => {
                          const newArticle = {
                            item: factureForm.articles.length + 1,
                            ref: '', designation: '', quantite: 1, prix_unitaire: 0, total: 0
                          };
                          setFactureForm({
                            ...factureForm,
                            articles: [...factureForm.articles, newArticle]
                          });
                        }} size="sm" variant="outline">
                          <Plus className="mr-2 h-4 w-4" />
                          Ajouter un article
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        {factureForm.articles.map((article, index) => (
                          <Card key={index} className="p-4">
                            <div className="grid grid-cols-6 gap-3 items-end">
                              <div>
                                <Label className="text-xs">REF</Label>
                                <Input
                                  value={article.ref}
                                  onChange={(e) => {
                                    const newArticles = [...factureForm.articles];
                                    newArticles[index].ref = e.target.value;
                                    setFactureForm({ ...factureForm, articles: newArticles });
                                  }}
                                  placeholder="Référence"
                                  className="text-sm"
                                />
                              </div>
                              <div className="col-span-2">
                                <Label className="text-xs">Désignation *</Label>
                                <Input
                                  required
                                  value={article.designation}
                                  onChange={(e) => {
                                    const newArticles = [...factureForm.articles];
                                    newArticles[index].designation = e.target.value;
                                    setFactureForm({ ...factureForm, articles: newArticles });
                                  }}
                                  placeholder="Description de l'article"
                                  className="text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Qté *</Label>
                                <Input
                                  required
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={article.quantite}
                                  onChange={(e) => {
                                    const newArticles = [...factureForm.articles];
                                    newArticles[index].quantite = parseFloat(e.target.value) || 0;
                                    newArticles[index].total = newArticles[index].quantite * newArticles[index].prix_unitaire;
                                    setFactureForm({ ...factureForm, articles: newArticles });
                                  }}
                                  className="text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Prix U. *</Label>
                                <Input
                                  required
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={article.prix_unitaire}
                                  onChange={(e) => {
                                    const newArticles = [...factureForm.articles];
                                    newArticles[index].prix_unitaire = parseFloat(e.target.value) || 0;
                                    newArticles[index].total = newArticles[index].quantite * newArticles[index].prix_unitaire;
                                    setFactureForm({ ...factureForm, articles: newArticles });
                                  }}
                                  className="text-sm"
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="flex-1">
                                  <Label className="text-xs">Total</Label>
                                  <div className="text-sm font-medium p-2 bg-slate-100 rounded">
                                    {formatCurrency(article.total)}
                                  </div>
                                </div>
                                {factureForm.articles.length > 1 && (
                                  <Button 
                                    type="button" 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => {
                                      const newArticles = factureForm.articles.filter((_, i) => i !== index);
                                      newArticles.forEach((article, i) => {
                                        article.item = i + 1;
                                      });
                                      setFactureForm({ ...factureForm, articles: newArticles });
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>

                    <Card className="bg-slate-50">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Sous-total:</span>
                            <span className="font-medium">{formatCurrency(calculateDevisTotal(factureForm.articles).sousTotal)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>TVA (18%):</span>
                            <span className="font-medium">{formatCurrency(calculateDevisTotal(factureForm.articles).tva)}</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold border-t pt-2">
                            <span>Total TTC:</span>
                            <span>{formatCurrency(calculateDevisTotal(factureForm.articles).totalTTC)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsFactureDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button type="submit" disabled={loading || !factureForm.client_id}>
                        {loading ? 'Création...' : 'Créer la Facture'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Interface de Recherche Intelligente pour Factures */}
            <Card>  
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="mr-2 h-5 w-5" />
                  Recherche de Factures Intelligente
                </CardTitle>
                <CardDescription>
                  Recherchez par numéro de facture ou nom de client
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Tapez le numéro de facture ou nom du client..."
                    value={facturesSearch}
                    onChange={(e) => setFacturesSearch(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleFacturesSearch}>
                    <Search className="mr-2 h-4 w-4" />
                    Rechercher
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setFacturesSearch('');
                      setShowFacturesData(true);
                    }}
                  >
                    Voir Tout ({factures.length})
                  </Button>
                  {showFacturesData && (
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowFacturesData(false)}
                    >
                      Masquer Tout
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Affichage des Résultats Factures */}
            {showFacturesData && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Résultats ({getFilteredFactures().length} facture{getFilteredFactures().length > 1 ? 's' : ''})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Numéro</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Statut Paiement</TableHead>
                        <TableHead>Montant Payé</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredFactures().length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            <Receipt className="mx-auto h-12 w-12 mb-2" />
                            <p>Aucune facture trouvée</p>
                            <p className="text-sm">Essayez une recherche différente</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        getFilteredFactures().map((f) => (
                          <TableRow key={f.facture_id}>
                            <TableCell className="font-medium">{f.numero_facture}</TableCell>
                            <TableCell>
                              <div>
                                <p>{f.client_nom}</p>
                                {f.reference_commande && (
                                  <p className="text-xs text-muted-foreground">Ref: {f.reference_commande}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(f.date_facture)}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(f.total_ttc, f.devise)}</TableCell>
                            <TableCell>
                              <Badge variant={getStatutBadge(f.statut_paiement)}>{f.statut_paiement}</Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{formatCurrency(f.montant_paye || 0, f.devise)}</p>
                                {f.statut_paiement === 'partiel' && (
                                  <p className="text-xs text-orange-600">
                                    Reste: {formatCurrency((f.total_ttc - (f.montant_paye || 0)), f.devise)}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleViewDocument('facture', f.facture_id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {f.statut_paiement !== 'payé' && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      setPaiementForm({
                                        facture_id: f.facture_id,
                                        client_id: f.client_id,
                                        devise: f.devise,
                                        montant: f.total_ttc - (f.montant_paye || 0),
                                        mode_paiement: '',
                                        date_paiement: new Date().toISOString().split('T')[0],
                                        numero_transaction: '',
                                        commentaires: ''
                                      });
                                      setIsPaiementDialogOpen(true);
                                    }}
                                  >
                                    <CreditCard className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleDownloadDocument('facture', f.facture_id)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Stock Tab - Complete Implementation */}
          <TabsContent value="stock" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Gestion du Stock</h2>
              <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvel Article
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Nouvel Article Stock</DialogTitle>
                    <DialogDescription>
                      Ajouter un nouvel article dans votre inventaire.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleStockSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="stock_ref">Référence *</Label>
                        <Input
                          id="stock_ref"
                          required
                          value={stockForm.ref}
                          onChange={(e) => setStockForm({ ...stockForm, ref: e.target.value })}
                          placeholder="Ex: PUMP001"
                        />
                      </div>
                      <div>
                        <Label htmlFor="stock_emplacement">Emplacement</Label>
                        <Input
                          id="stock_emplacement"
                          value={stockForm.emplacement}
                          onChange={(e) => setStockForm({ ...stockForm, emplacement: e.target.value })}
                          placeholder="Ex: Entrepôt A-12"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="stock_designation">Désignation *</Label>
                      <Input
                        id="stock_designation"
                        required
                        value={stockForm.designation}
                        onChange={(e) => setStockForm({ ...stockForm, designation: e.target.value })}
                        placeholder="Description complète de l'article"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="stock_quantite">Quantité en stock *</Label>
                        <Input
                          id="stock_quantite"
                          required
                          type="number"
                          step="0.01"
                          min="0"
                          value={stockForm.quantite_stock}
                          onChange={(e) => setStockForm({ ...stockForm, quantite_stock: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="stock_minimum">Stock minimum *</Label>
                        <Input
                          id="stock_minimum"
                          required
                          type="number"
                          step="0.01"
                          min="0"
                          value={stockForm.stock_minimum}
                          onChange={(e) => setStockForm({ ...stockForm, stock_minimum: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="stock_prix_achat">Prix d'achat moyen</Label>
                        <Input
                          id="stock_prix_achat"
                          type="number"
                          step="0.01"
                          min="0"
                          value={stockForm.prix_achat_moyen}
                          onChange={(e) => setStockForm({ ...stockForm, prix_achat_moyen: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="stock_prix_vente">Prix de vente</Label>
                        <Input
                          id="stock_prix_vente"
                          type="number"
                          step="0.01"
                          min="0"
                          value={stockForm.prix_vente}
                          onChange={(e) => setStockForm({ ...stockForm, prix_vente: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="stock_fournisseur">Fournisseur principal</Label>
                      <Select value={stockForm.fournisseur_principal} onValueChange={(value) => setStockForm({ ...stockForm, fournisseur_principal: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un fournisseur" />
                        </SelectTrigger>
                        <SelectContent>
                          {fournisseurs.map((fournisseur) => (
                            <SelectItem key={fournisseur.fournisseur_id} value={fournisseur.fournisseur_id}>
                              {fournisseur.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsStockDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Enregistrement...' : 'Créer'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Stock Alerts */}
            {alerts.length > 0 && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>Alertes Stock :</strong> {alerts.length} article(s) sont en dessous du stock minimum.
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Référence</TableHead>
                      <TableHead>Désignation</TableHead>
                      <TableHead>Stock Actuel</TableHead>
                      <TableHead>Stock Minimum</TableHead>
                      <TableHead>Prix Achat</TableHead>
                      <TableHead>Prix Vente</TableHead>
                      <TableHead>Emplacement</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stock.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          <Package className="mx-auto h-12 w-12 mb-2" />
                          <p>Aucun article en stock</p>
                          <p className="text-sm">Ajoutez vos premiers articles pour commencer la gestion du stock</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      stock.map((article) => (
                        <TableRow key={article.article_id}>
                          <TableCell className="font-medium">{article.ref}</TableCell>
                          <TableCell>
                            <div>
                              <p>{article.designation}</p>
                              {article.fournisseur_principal && (
                                <p className="text-xs text-muted-foreground">
                                  Fourn: {fournisseurs.find(f => f.fournisseur_id === article.fournisseur_principal)?.nom}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span className={`font-medium ${article.quantite_stock <= article.stock_minimum ? 'text-red-600' : 'text-green-600'}`}>
                                {article.quantite_stock}
                              </span>
                              {article.quantite_stock <= article.stock_minimum && (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{article.stock_minimum}</TableCell>
                          <TableCell>{formatCurrency(article.prix_achat_moyen)}</TableCell>
                          <TableCell>{formatCurrency(article.prix_vente)}</TableCell>
                          <TableCell>{article.emplacement || 'Non défini'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleViewDocument('stock', article.article_id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEditStock(article.article_id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleStockMovement(article.article_id)}
                              >
                                <Package className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modern Stock Movement Dialog */}
          <Dialog open={stockMovementDialog.open} onOpenChange={(open) => setStockMovementDialog({ ...stockMovementDialog, open })}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader className="border-b pb-4">
                <DialogTitle className="text-xl font-bold text-green-600">📦 Mouvement de Stock</DialogTitle>
                <DialogDescription className="text-gray-600">
                  {stockMovementDialog.article?.designation} - Gestion des entrées et sorties
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleStockMovementSubmit} className="space-y-6 pt-4">
                {stockMovementDialog.article && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-medium text-blue-800 mb-2">📋 Informations actuelles</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Stock actuel:</span>
                        <span className="ml-2 font-bold text-blue-600">{stockMovementDialog.article.quantite_stock}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Stock minimum:</span>
                        <span className="ml-2 font-bold text-orange-600">{stockMovementDialog.article.stock_minimum}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Référence:</span>
                        <span className="ml-2 font-mono text-gray-800">{stockMovementDialog.article.ref}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Emplacement:</span>
                        <span className="ml-2 text-gray-800">{stockMovementDialog.article.emplacement || 'Non défini'}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="movement_type" className="text-sm font-medium">Type d'opération *</Label>
                    <Select 
                      value={stockMovementDialog.type} 
                      onValueChange={(value) => setStockMovementDialog({ ...stockMovementDialog, type: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in">📥 Entrée (Réception)</SelectItem>
                        <SelectItem value="out">📤 Sortie (Vente/Consommation)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="movement_quantity" className="text-sm font-medium">Quantité *</Label>
                    <Input
                      id="movement_quantity"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={stockMovementDialog.movement}
                      onChange={(e) => setStockMovementDialog({ ...stockMovementDialog, movement: e.target.value })}
                      placeholder="Quantité à déplacer"
                      className="mt-1"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="movement_reason" className="text-sm font-medium">Motif/Commentaire</Label>
                  <Select 
                    value={stockMovementDialog.reason} 
                    onValueChange={(value) => setStockMovementDialog({ ...stockMovementDialog, reason: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner un motif..." />
                    </SelectTrigger>
                    <SelectContent>
                      {stockMovementDialog.type === 'in' ? (
                        <>
                          <SelectItem value="reception_fournisseur">📦 Réception fournisseur</SelectItem>
                          <SelectItem value="retour_client">🔄 Retour client</SelectItem>
                          <SelectItem value="correction_inventaire">📊 Correction inventaire</SelectItem>
                          <SelectItem value="transfert_entrant">⬅️ Transfert entrant</SelectItem>
                          <SelectItem value="autre_entree">➕ Autre entrée</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="vente_client">💰 Vente client</SelectItem>
                          <SelectItem value="consommation_interne">🔧 Consommation interne</SelectItem>
                          <SelectItem value="perte_casse">❌ Perte/Casse</SelectItem>
                          <SelectItem value="transfert_sortant">➡️ Transfert sortant</SelectItem>
                          <SelectItem value="autre_sortie">➖ Autre sortie</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                {stockMovementDialog.article && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">🧮 Simulation</h4>
                    <div className="text-sm">
                      <span className="text-gray-600">Nouveau stock après opération: </span>
                      <span className="font-bold text-lg">
                        {stockMovementDialog.movement && !isNaN(stockMovementDialog.movement) ? (
                          stockMovementDialog.type === 'in' ? 
                            parseFloat(stockMovementDialog.article.quantite_stock) + parseFloat(stockMovementDialog.movement || 0) :
                            parseFloat(stockMovementDialog.article.quantite_stock) - parseFloat(stockMovementDialog.movement || 0)
                        ) : stockMovementDialog.article.quantite_stock}
                      </span>
                      {stockMovementDialog.movement && !isNaN(stockMovementDialog.movement) && (
                        <span className={`ml-2 text-sm ${
                          (stockMovementDialog.type === 'in' ? 
                            parseFloat(stockMovementDialog.article.quantite_stock) + parseFloat(stockMovementDialog.movement) :
                            parseFloat(stockMovementDialog.article.quantite_stock) - parseFloat(stockMovementDialog.movement)
                          ) <= stockMovementDialog.article.stock_minimum ? 'text-red-600 font-bold' : 'text-green-600'
                        }`}>
                          {(stockMovementDialog.type === 'in' ? 
                            parseFloat(stockMovementDialog.article.quantite_stock) + parseFloat(stockMovementDialog.movement) :
                            parseFloat(stockMovementDialog.article.quantite_stock) - parseFloat(stockMovementDialog.movement)
                          ) <= stockMovementDialog.article.stock_minimum ? '⚠️ Stock bas' : '✅ Stock correct'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setStockMovementDialog({ open: false, article: null, movement: '', reason: '', type: 'in' })}
                    className="px-6"
                  >
                    ❌ Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading || !stockMovementDialog.movement} 
                    className="px-6 bg-green-600 hover:bg-green-700"
                  >
                    {loading ? '⏳ Enregistrement...' : `✅ ${stockMovementDialog.type === 'in' ? 'Entrée' : 'Sortie'} Stock`}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Global Payment Dialog - Can be triggered from any tab */}
          <Dialog open={isPaiementDialogOpen} onOpenChange={setIsPaiementDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader className="border-b pb-4">
                <DialogTitle className="text-xl font-bold text-blue-600">💳 Enregistrer un Paiement</DialogTitle>
                <DialogDescription className="text-gray-600">
                  Enregistrer un paiement reçu d'un client pour une facture.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handlePaiementSubmit} className="space-y-6 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="global_paiement_type" className="text-sm font-medium">Type de document *</Label>
                    <Select value={paiementForm.type_document} onValueChange={(value) => setPaiementForm({ ...paiementForm, type_document: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="facture">💰 Facture</SelectItem>
                        <SelectItem value="achat">📋 Bon de commande</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="global_paiement_devise" className="text-sm font-medium">Devise *</Label>
                    <Select value={paiementForm.devise} onValueChange={(value) => setPaiementForm({ ...paiementForm, devise: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FCFA">🇨🇮 FCFA</SelectItem>
                        <SelectItem value="EUR">🇪🇺 EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="global_paiement_document" className="text-sm font-medium">Document à payer *</Label>
                  <Select value={paiementForm.document_id} onValueChange={(value) => {
                    setPaiementForm({ ...paiementForm, document_id: value });
                    if (paiementForm.type_document === 'facture') {
                      const facture = factures.find(f => f.facture_id === value);
                      if (facture) {
                        setPaiementForm({
                          ...paiementForm,
                          document_id: value,
                          client_id: facture.client_id,
                          devise: facture.devise,
                          montant: facture.total_ttc - (facture.montant_paye || 0)
                        });
                      }
                    }
                  }}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner un document à payer" />
                    </SelectTrigger>
                    <SelectContent>
                      {paiementForm.type_document === 'facture' ? (
                        factures.filter(f => f.statut_paiement !== 'payé').map((facture) => (
                          <SelectItem key={facture.facture_id} value={facture.facture_id}>
                            <div className="flex justify-between w-full">
                              <span className="font-mono text-sm">{facture.numero_facture}</span>
                              <span className="text-gray-600">{facture.client_nom}</span>
                              <span className="font-bold text-red-600">{formatCurrency(facture.total_ttc - (facture.montant_paye || 0), facture.devise)}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none">Aucun bon de commande disponible</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="global_paiement_montant" className="text-sm font-medium">Montant reçu *</Label>
                    <div className="mt-1 relative">
                      <Input
                        id="global_paiement_montant"
                        required
                        type="number"
                        step="0.01"
                        min="0"
                        className="pl-8"
                        value={paiementForm.montant}
                        onChange={(e) => setPaiementForm({ ...paiementForm, montant: parseFloat(e.target.value) || 0 })}
                      />
                      <span className="absolute left-2 top-2 text-gray-500">💰</span>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="global_paiement_mode" className="text-sm font-medium">Mode de paiement *</Label>
                    <Select value={paiementForm.mode_paiement} onValueChange={(value) => setPaiementForm({ ...paiementForm, mode_paiement: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="espèce">💵 Espèce</SelectItem>
                        <SelectItem value="virement">🏦 Virement bancaire</SelectItem>
                        <SelectItem value="mobile_money">📱 Mobile Money</SelectItem>
                        <SelectItem value="chèque">📝 Chèque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="global_paiement_reference" className="text-sm font-medium">Référence paiement</Label>
                  <div className="mt-1 relative">
                    <Input
                      id="global_paiement_reference"
                      className="pl-8"
                      value={paiementForm.reference_paiement}
                      onChange={(e) => setPaiementForm({ ...paiementForm, reference_paiement: e.target.value })}
                      placeholder="Ex: VIR20250730001, CHQ123456"
                    />
                    <span className="absolute left-2 top-2 text-gray-500">🔗</span>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsPaiementDialogOpen(false)} className="px-6">
                    ❌ Annuler
                  </Button>
                  <Button type="submit" disabled={loading} className="px-6 bg-blue-600 hover:bg-blue-700">
                    {loading ? '⏳ Enregistrement...' : '✅ Enregistrer le Paiement'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Paiements Tab - Complete Implementation */}
          <TabsContent value="paiements" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Gestion des Paiements</h2>
              <Dialog open={isPaiementDialogOpen} onOpenChange={setIsPaiementDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau Paiement
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Enregistrer un Paiement</DialogTitle>
                    <DialogDescription>
                      Enregistrer un paiement reçu d'un client.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handlePaiementSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="paiement_type">Type de document *</Label>
                      <Select value={paiementForm.type_document} onValueChange={(value) => setPaiementForm({ ...paiementForm, type_document: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="facture">Facture</SelectItem>
                          <SelectItem value="achat">Bon de commande</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="paiement_document">Document *</Label>
                      <Select value={paiementForm.document_id} onValueChange={(value) => {
                        setPaiementForm({ ...paiementForm, document_id: value });
                        if (paiementForm.type_document === 'facture') {
                          const facture = factures.find(f => f.facture_id === value);
                          if (facture) {
                            setPaiementForm({
                              ...paiementForm,
                              document_id: value,
                              client_id: facture.client_id,
                              devise: facture.devise,
                              montant: facture.total_ttc - (facture.montant_paye || 0)
                            });
                          }
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un document" />
                        </SelectTrigger>
                        <SelectContent>
                          {paiementForm.type_document === 'facture' ? (
                            factures.filter(f => f.statut_paiement !== 'payé').map((facture) => (
                              <SelectItem key={facture.facture_id} value={facture.facture_id}>
                                {facture.numero_facture} - {facture.client_nom} - {formatCurrency(facture.total_ttc - (facture.montant_paye || 0), facture.devise)}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none">Aucun bon de commande disponible</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="paiement_montant">Montant *</Label>
                        <Input
                          id="paiement_montant"
                          required
                          type="number"
                          step="0.01"
                          min="0"
                          value={paiementForm.montant}
                          onChange={(e) => setPaiementForm({ ...paiementForm, montant: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="paiement_devise">Devise</Label>
                        <Select value={paiementForm.devise} onValueChange={(value) => setPaiementForm({ ...paiementForm, devise: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FCFA">FCFA</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="paiement_mode">Mode de paiement *</Label>
                      <Select value={paiementForm.mode_paiement} onValueChange={(value) => setPaiementForm({ ...paiementForm, mode_paiement: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="espece">Espèces</SelectItem>
                          <SelectItem value="cheque">Chèque</SelectItem>
                          <SelectItem value="virement">Virement bancaire</SelectItem>
                          <SelectItem value="mobile_money">Mobile Money</SelectItem>
                          <SelectItem value="visa">Visa/Carte bancaire</SelectItem>
                          <SelectItem value="mastercard">Mastercard</SelectItem>
                          <SelectItem value="paypal">PayPal</SelectItem>
                          <SelectItem value="crypto">Crypto-monnaie</SelectItem>
                          <SelectItem value="autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="paiement_reference">Référence paiement</Label>
                      <Input
                        id="paiement_reference"
                        value={paiementForm.reference_paiement}
                        onChange={(e) => setPaiementForm({ ...paiementForm, reference_paiement: e.target.value })}
                        placeholder="Ex: VIR20250730001, CHQ123456"
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsPaiementDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Enregistrement...' : 'Enregistrer'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Document</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Référence</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paiements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          <CreditCard className="mx-auto h-12 w-12 mb-2" />
                          <p>Aucun paiement enregistré</p>
                          <p className="text-sm">Les paiements reçus apparaîtront ici</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paiements.map((paiement) => (
                        <TableRow key={paiement.paiement_id}>
                          <TableCell>{formatDate(paiement.date_paiement)}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{paiement.type_document === 'facture' ? 'Facture' : 'Achat'}</p>
                              <p className="text-xs text-muted-foreground">
                                {paiement.type_document === 'facture' ? 
                                  factures.find(f => f.facture_id === paiement.document_id)?.numero_facture :
                                  paiement.document_id
                                }
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {clients.find(c => c.client_id === paiement.client_id)?.nom || 'N/A'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(paiement.montant, paiement.devise)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {paiement.mode_paiement}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {paiement.reference_paiement || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatutBadge(paiement.statut)}>
                              {paiement.statut}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleViewDocument('paiement', paiement.paiement_id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDownloadDocument('recu', paiement.paiement_id)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rapports Tab - Complete Implementation */}
          <TabsContent value="rapports" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">États Financiers & Rapports</h2>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleExportPDF}>
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
                <Button variant="outline" onClick={handleExportExcel}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Excel
                </Button>
              </div>
            </div>
            
            {/* Date filters for reports */}
            <Card className="bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Filtres de Période
                </CardTitle>
                <CardDescription>
                  Sélectionnez une période pour filtrer les rapports (optionnel)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date_debut">Date de début</Label>
                    <Input
                      id="date_debut"
                      type="date"
                      value={rapportFilters.date_debut}
                      onChange={(e) => setRapportFilters({ ...rapportFilters, date_debut: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date_fin">Date de fin</Label>
                    <Input
                      id="date_fin"
                      type="date"
                      value={rapportFilters.date_fin}
                      onChange={(e) => setRapportFilters({ ...rapportFilters, date_fin: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setRapportFilters({ date_debut: '', date_fin: '' })}
                  >
                    🗑️ Effacer les filtres
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="text-center">
                  <BarChart3 className="mx-auto h-12 w-12 text-blue-500" />
                  <CardTitle>Journal des Ventes</CardTitle>
                  <CardDescription>Historique détaillé des ventes</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => handleGenerateReport('Journal des Ventes')}
                  >
                    Générer le rapport
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="text-center">
                  <ShoppingCart className="mx-auto h-12 w-12 text-green-500" />
                  <CardTitle>Journal des Achats</CardTitle>
                  <CardDescription>Historique des achats fournisseurs</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => handleGenerateReport('Journal des Achats')}
                  >
                    Générer le rapport
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="text-center">
                  <Users className="mx-auto h-12 w-12 text-purple-500" />
                  <CardTitle>Balance Clients</CardTitle>
                  <CardDescription>Soldes et créances clients</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => handleGenerateReport('Balance Clients')}
                  >
                    Générer le rapport
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="text-center">
                  <Building2 className="mx-auto h-12 w-12 text-orange-500" />
                  <CardTitle>Balance Fournisseurs</CardTitle>
                  <CardDescription>Soldes et dettes fournisseurs</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => handleGenerateReport('Balance Fournisseurs')}
                  >
                    Générer le rapport
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="text-center">
                  <TrendingUp className="mx-auto h-12 w-12 text-red-500" />
                  <CardTitle>Suivi de Trésorerie</CardTitle>
                  <CardDescription>Entrées et sorties de fonds</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => handleGenerateReport('Suivi de Trésorerie')}
                  >
                    Générer le rapport
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="text-center">
                  <FileCheck className="mx-auto h-12 w-12 text-indigo-500" />
                  <CardTitle>Compte de Résultat</CardTitle>
                  <CardDescription>Bénéfices et pertes</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => handleGenerateReport('Compte de Résultat')}
                  >
                    Générer le rapport
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* 
            SECTION COMMENTÉE PAR DEMANDE DE L'UTILISATEUR - Options de génération not needed
            {/* Filtres et options de période *}
            <Card>
              <CardHeader>
                <CardTitle>Options de Génération</CardTitle>
                <CardDescription>Personnalisez vos rapports selon vos besoins</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="rapport_debut">Date de début</Label>
                    <Input
                      id="rapport_debut"
                      type="date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rapport_fin">Date de fin</Label>
                    <Input
                      id="rapport_fin"
                      type="date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rapport_devise">Devise</Label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes</SelectItem>
                        <SelectItem value="FCFA">FCFA uniquement</SelectItem>
                        <SelectItem value="EUR">EUR uniquement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rapport_client">Client spécifique</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les clients" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les clients</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.client_id} value={client.client_id}>
                            {client.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="rapport_statut">Statut</Label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="payé">Payé</SelectItem>
                        <SelectItem value="impayé">Impayé</SelectItem>
                        <SelectItem value="partiel">Partiellement payé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            */}
            
            {/* New Section: Specialized Lists */}
            <div className="mt-8">
              <div className="flex items-center mb-6">
                <div className="flex-grow border-t border-gray-300"></div>
                <div className="flex-shrink-0 px-4">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center">
                    📋 Listes Spécialisées par Période
                  </h3>
                </div>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>
              
              <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                {/* Liste Factures Impayées */}
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-red-200 bg-red-50">
                  <CardHeader className="text-center">
                    <AlertTriangle className="mx-auto h-12 w-12 text-red-600" />
                    <CardTitle className="text-red-700">Factures Impayées</CardTitle>
                    <CardDescription className="text-red-600">
                      Liste des factures en attente de paiement avec retards
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="bg-red-100 p-3 rounded-lg text-sm">
                        <div className="flex justify-between">
                          <span>Factures impayées actuelles:</span>
                          <span className="font-bold text-red-700">
                            {factures.filter(f => f.statut_paiement !== 'payé').length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Montant total:</span>
                          <span className="font-bold text-red-700">
                            {formatCurrency(
                              factures
                                .filter(f => f.statut_paiement !== 'payé')
                                .reduce((sum, f) => sum + (f.total_ttc - (f.montant_paye || 0)), 0)
                            )}
                          </span>
                        </div>
                      </div>
                      <Button 
                        className="w-full bg-red-600 hover:bg-red-700 text-white" 
                        onClick={() => handleGenerateList('factures-impayees')}
                        disabled={loading}
                      >
                        {loading ? '⏳ Génération...' : '📋 Générer la Liste'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Liste Toutes Factures */}
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-blue-200 bg-blue-50">
                  <CardHeader className="text-center">
                    <FileText className="mx-auto h-12 w-12 text-blue-600" />
                    <CardTitle className="text-blue-700">Toutes les Factures</CardTitle>
                    <CardDescription className="text-blue-600">
                      Liste complète des factures avec statuts et montants
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="bg-blue-100 p-3 rounded-lg text-sm">
                        <div className="flex justify-between">
                          <span>Total factures:</span>
                          <span className="font-bold text-blue-700">{factures.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Chiffre d'affaires:</span>
                          <span className="font-bold text-blue-700">
                            {formatCurrency(factures.reduce((sum, f) => sum + f.total_ttc, 0))}
                          </span>
                        </div>
                      </div>
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                        onClick={() => handleGenerateList('factures')}
                        disabled={loading}
                      >
                        {loading ? '⏳ Génération...' : '📋 Générer la Liste'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Liste Tous Devis */}
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-green-200 bg-green-50">
                  <CardHeader className="text-center">
                    <FileCheck className="mx-auto h-12 w-12 text-green-600" />
                    <CardTitle className="text-green-700">Tous les Devis</CardTitle>
                    <CardDescription className="text-green-600">
                      Liste complète des devis avec taux de conversion
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="bg-green-100 p-3 rounded-lg text-sm">
                        <div className="flex justify-between">
                          <span>Total devis:</span>
                          <span className="font-bold text-green-700">{devis.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Valeur totale:</span>
                          <span className="font-bold text-green-700">
                            {formatCurrency(devis.reduce((sum, d) => sum + d.total_ttc, 0))}
                          </span>
                        </div>
                      </div>
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700 text-white" 
                        onClick={() => handleGenerateList('devis')}
                        disabled={loading}
                      >
                        {loading ? '⏳ Génération...' : '📋 Générer la Liste'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-yellow-600 mr-2" />
                  <span className="text-sm text-yellow-800 font-medium">
                    💡 Astuce: Utilisez les filtres de période ci-dessus pour générer des listes sur des dates spécifiques
                  </span>
                </div>
              </div>
            </div>

          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;