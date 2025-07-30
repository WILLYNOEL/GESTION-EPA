// Code pour remplacer l'affichage direct des DEVIS par l'affichage intelligent

/* REMPLACEMENT POUR L'ONGLET DEVIS */
// Remplacez la section après </Dialog> </div> dans l'onglet devis par :

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
            <TableHead>Total TTC</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Actions</TableHead>
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
                <TableCell>{formatCurrency(d.total_ttc, d.devise)}</TableCell>
                <TableCell>
                  <Badge variant={getStatutBadge(d.statut)}>{d.statut}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleViewDocument('devis', d.devis_id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => convertDevisToFacture(d.devis_id)}>
                      <ArrowRightLeft className="h-4 w-4" />
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

/* REMPLACEMENT POUR L'ONGLET FACTURES */
// Remplacez la section après </Dialog> </div> dans l'onglet factures par :

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
            <TableHead>Total TTC</TableHead>
            <TableHead>Statut Paiement</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {getFilteredFactures().length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-2" />
                <p>Aucune facture trouvée</p>
                <p className="text-sm">Essayez une recherche différente</p>
              </TableCell>
            </TableRow>
          ) : (
            getFilteredFactures().map((f) => (
              <TableRow key={f.facture_id}>
                <TableCell className="font-medium">{f.numero_facture}</TableCell>
                <TableCell>{f.client_nom}</TableCell>
                <TableCell>{formatDate(f.date_facture)}</TableCell>
                <TableCell>{formatCurrency(f.total_ttc, f.devise)}</TableCell>
                <TableCell>
                  <Badge variant={getStatutBadge(f.statut_paiement)}>{f.statut_paiement}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleViewDocument('facture', f.facture_id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsPaiementDialogOpen(true)}>
                      <CreditCard className="h-4 w-4" />
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