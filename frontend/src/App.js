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
import { Plus, Users, FileText, Euro, DollarSign, Eye, Edit, Trash2, Download } from 'lucide-react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [devis, setDevis] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Client form state
  const [clientForm, setClientForm] = useState({
    nom: '',
    numero_cc: '',
    email: '',
    telephone: '',
    adresse: '',
    devise: 'FCFA',
    type_client: 'standard'
  });
  
  // Devis form state
  const [devisForm, setDevisForm] = useState({
    client_id: '',
    client_nom: '',
    articles: [{ item: 1, ref: '', designation: '', quantite: 1, prix_unitaire: 0, total: 0 }],
    delai_livraison: '',
    conditions_paiement: ''
  });
  
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isDevisDialogOpen, setIsDevisDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  // Fetch data functions
  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/clients`);
      setClients(response.data.clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchDevis = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/devis`);
      setDevis(response.data.devis || []);
    } catch (error) {
      console.error('Error fetching devis:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/dashboard/stats`);
      setStats(response.data.stats || {});
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchClients();
    fetchDevis();
  }, []);

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
      
      setClientForm({
        nom: '',
        numero_cc: '',
        email: '',
        telephone: '',
        adresse: '',
        devise: 'FCFA',
        type_client: 'standard'
      });
      
      setIsClientDialogOpen(false);
      setEditingClient(null);
      fetchClients();
      fetchStats();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Erreur lors de la sauvegarde du client');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClient = (client) => {
    setClientForm({
      nom: client.nom,
      numero_cc: client.numero_cc || '',
      email: client.email || '',
      telephone: client.telephone || '',
      adresse: client.adresse || '',
      devise: client.devise,
      type_client: client.type_client
    });
    setEditingClient(client);
    setIsClientDialogOpen(true);
  };

  const handleDeleteClient = async (clientId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/clients/${clientId}`);
        fetchClients();
        fetchStats();
      } catch (error) {
        console.error('Error deleting client:', error);
        alert('Erreur lors de la suppression du client');
      }
    }
  };

  // Devis form handlers
  const calculateArticleTotal = (quantite, prixUnitaire) => {
    return quantite * prixUnitaire;
  };

  const calculateDevisTotal = () => {
    const sousTotal = devisForm.articles.reduce((sum, article) => sum + article.total, 0);
    const tva = sousTotal * 0.18; // 18% TVA
    const totalTTC = sousTotal + tva;
    return { sousTotal, tva, totalTTC };
  };

  const handleArticleChange = (index, field, value) => {
    const newArticles = [...devisForm.articles];
    newArticles[index][field] = value;
    
    if (field === 'quantite' || field === 'prix_unitaire') {
      newArticles[index].total = calculateArticleTotal(
        newArticles[index].quantite,
        newArticles[index].prix_unitaire
      );
    }
    
    setDevisForm({ ...devisForm, articles: newArticles });
  };

  const addArticle = () => {
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
  };

  const removeArticle = (index) => {
    if (devisForm.articles.length > 1) {
      const newArticles = devisForm.articles.filter((_, i) => i !== index);
      // Renumber items
      newArticles.forEach((article, i) => {
        article.item = i + 1;
      });
      setDevisForm({ ...devisForm, articles: newArticles });
    }
  };

  const handleDevisSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { sousTotal, tva, totalTTC } = calculateDevisTotal();
      
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
        client_id: '',
        client_nom: '',
        articles: [{ item: 1, ref: '', designation: '', quantite: 1, prix_unitaire: 0, total: 0 }],
        delai_livraison: '',
        conditions_paiement: ''
      });
      
      setIsDevisDialogOpen(false);
      fetchDevis();
      fetchStats();
    } catch (error) {
      console.error('Error creating devis:', error);
      alert('Erreur lors de la création du devis');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = 'FCFA') => {
    const formatted = new Intl.NumberFormat('fr-FR').format(amount);
    return currency === 'EUR' ? `${formatted} €` : `${formatted} F CFA`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">ECO PUMP AFRIK</h1>
                <p className="text-sm text-slate-600">Gestion Intelligente</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Cocody - Angré 7e Tranche</p>
              <p className="text-sm text-slate-600">+225 0707806359</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="dashboard">Tableau de bord</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="devis">Devis</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_clients || 0}</div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                    <span>FCFA: {stats.clients_fcfa || 0}</span>
                    <span>EUR: {stats.clients_eur || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Devis Totaux</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_devis || 0}</div>
                  <p className="text-xs text-muted-foreground">Toutes périodes</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Devis ce mois</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.devis_ce_mois || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Montant Devis</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.montant_devis_mois || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Ce mois</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Activité Récente</CardTitle>
                  <CardDescription>Derniers devis créés</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {devis.slice(0, 5).map((d) => (
                      <div key={d.devis_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{d.numero_devis}</p>
                          <p className="text-xs text-muted-foreground">{d.client_nom}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatCurrency(d.total_ttc, d.devise)}</p>
                          <Badge variant="secondary" className="text-xs">{d.statut}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Actions Rapides</CardTitle>
                  <CardDescription>Raccourcis vers les fonctionnalités principales</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={() => setActiveTab('clients')} 
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Gérer les clients
                  </Button>
                  <Button 
                    onClick={() => setActiveTab('devis')} 
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Créer un devis
                  </Button>
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
                  <Button onClick={() => { setEditingClient(null); setClientForm({ nom: '', numero_cc: '', email: '', telephone: '', adresse: '', devise: 'FCFA', type_client: 'standard' }); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau Client
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>{editingClient ? 'Modifier le Client' : 'Nouveau Client'}</DialogTitle>
                    <DialogDescription>
                      Remplissez les informations du client.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleClientSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="nom">Nom du Client *</Label>
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

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Devise</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date Création</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.client_id}>
                        <TableCell className="font-medium">
                          <div>
                            <p>{client.nom}</p>
                            {client.numero_cc && <p className="text-xs text-muted-foreground">CC: {client.numero_cc}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {client.telephone && <p className="text-sm">{client.telephone}</p>}
                            {client.email && <p className="text-xs text-muted-foreground">{client.email}</p>}
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
                            <Button size="sm" variant="outline" onClick={() => handleDeleteClient(client.client_id)}>
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
          </TabsContent>

          {/* Devis Tab */}
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
                        <Label htmlFor="delai_livraison">Délai de livraison</Label>
                        <Input
                          id="delai_livraison"
                          value={devisForm.delai_livraison}
                          onChange={(e) => setDevisForm({ ...devisForm, delai_livraison: e.target.value })}
                          placeholder="Ex: 15 jours"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="conditions_paiement">Conditions de paiement</Label>
                      <Input
                        id="conditions_paiement"
                        value={devisForm.conditions_paiement}
                        onChange={(e) => setDevisForm({ ...devisForm, conditions_paiement: e.target.value })}
                        placeholder="Ex: 30% à la commande, 70% à la livraison"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <Label>Articles</Label>
                        <Button type="button" onClick={addArticle} size="sm" variant="outline">
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
                                  onChange={(e) => handleArticleChange(index, 'ref', e.target.value)}
                                  placeholder="Référence"
                                  className="text-sm"
                                />
                              </div>
                              <div className="col-span-2">
                                <Label className="text-xs">Désignation *</Label>
                                <Input
                                  required
                                  value={article.designation}
                                  onChange={(e) => handleArticleChange(index, 'designation', e.target.value)}
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
                                  onChange={(e) => handleArticleChange(index, 'quantite', parseFloat(e.target.value) || 0)}
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
                                  onChange={(e) => handleArticleChange(index, 'prix_unitaire', parseFloat(e.target.value) || 0)}
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
                                    onClick={() => removeArticle(index)}
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
                            <span className="font-medium">{formatCurrency(calculateDevisTotal().sousTotal)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>TVA (18%):</span>
                            <span className="font-medium">{formatCurrency(calculateDevisTotal().tva)}</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold border-t pt-2">
                            <span>Total TTC:</span>
                            <span>{formatCurrency(calculateDevisTotal().totalTTC)}</span>
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

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numéro</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Devise</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devis.map((d) => (
                      <TableRow key={d.devis_id}>
                        <TableCell className="font-medium">{d.numero_devis}</TableCell>
                        <TableCell>{d.client_nom}</TableCell>
                        <TableCell>{formatDate(d.date_devis)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(d.total_ttc, d.devise)}</TableCell>
                        <TableCell>
                          <Badge variant={d.devise === 'EUR' ? 'default' : 'secondary'}>
                            {d.devise}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{d.statut}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;