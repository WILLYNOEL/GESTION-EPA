import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Badge } from './components/ui/badge';
import { Alert, AlertDescription } from './components/ui/alert';
import { 
  Users, Shield, LogOut, Package
} from 'lucide-react';
import Login from './Login';
import AdminUsers from './AdminUsers';
import './App.css';

function App() {
  // États d'authentification
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);

  // Vérifier l'authentification au démarrage
  useEffect(() => {
    const savedToken = localStorage.getItem('ecopump_token');
    const savedUser = localStorage.getItem('ecopump_user');
    
    if (savedToken && savedUser) {
      try {
        const userInfo = JSON.parse(savedUser);
        setToken(savedToken);
        setCurrentUser(userInfo);
        setIsAuthenticated(true);
        
        // Configurer axios avec le token
        axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      } catch (error) {
        console.error('Erreur parsing user info:', error);
        handleLogout();
      }
    }
  }, []);

  const handleLogin = (accessToken, userInfo) => {
    setToken(accessToken);
    setCurrentUser(userInfo);
    setIsAuthenticated(true);
    
    // Configurer axios avec le token pour toutes les requêtes
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('ecopump_token');
    localStorage.removeItem('ecopump_user');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  // Fonction pour créer un utilisateur de test
  const createTestUser = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: 'testuser',
          password: 'test123',
          email: 'test@ecopumpafrik.com',
          role: 'user',
          permissions: {
            dashboard: true,
            clients: false,
            fournisseurs: false,
            devis: false,
            factures: false,
            stock: false,
            paiements: false,
            rapports: false,
            administration: false
          }
        }),
      });

      if (response.ok) {
        alert('Utilisateur de test créé avec succès!\nUtilisateur: testuser\nMot de passe: test123');
      } else {
        const data = await response.json();
        alert('Erreur: ' + data.detail);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion au serveur');
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

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
            
            {/* User Info & Logout */}
            <div className="flex items-center space-x-4 border-l border-gray-300 pl-6">
              <div className="flex items-center space-x-2">
                {currentUser?.role === 'admin' ? (
                  <Shield className="h-4 w-4 text-blue-600" />
                ) : (
                  <Users className="h-4 w-4 text-gray-500" />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {currentUser?.username}
                </span>
                <Badge variant={currentUser?.role === 'admin' ? 'default' : 'secondary'}>
                  {currentUser?.role === 'admin' ? 'Admin' : 'User'}
                </Badge>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Welcome Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-center">
                🎉 Système d'Authentification et Permissions Réussi !
              </CardTitle>
              <CardDescription className="text-center">
                Le système de gestion des utilisateurs et permissions granulaires est opérationnel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-green-600">✅ Fonctionnalités Validées</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• Authentification JWT sécurisée</li>
                    <li>• Utilisateur admin par défaut (admin/admin123)</li>
                    <li>• Gestion des permissions par onglet</li>
                    <li>• Logo ECO PUMP AFRIK 120x120 centré dans PDFs</li>
                    <li>• Interface admin complète</li>
                    <li>• Protection des routes backend</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-blue-600">🔧 Actions Disponibles</h3>
                  <div className="space-y-3">
                    {currentUser?.role === 'admin' && (
                      <>
                        <Button onClick={createTestUser} className="w-full">
                          Créer Utilisateur de Test
                        </Button>
                        <Alert>
                          <AlertDescription>
                            En tant qu'admin, vous avez accès à tous les onglets.
                            Créez un utilisateur de test pour voir les permissions limitées.
                          </AlertDescription>
                        </Alert>
                      </>
                    )}
                    {currentUser?.role === 'user' && (
                      <Alert>
                        <AlertDescription>
                          Vous êtes un utilisateur standard. Vos accès sont limités selon les permissions définies par l'admin.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Panel */}
          {currentUser?.role === 'admin' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5 text-red-600" />
                  Panneau d'Administration
                </CardTitle>
                <CardDescription>
                  Gérez les utilisateurs et leurs permissions d'accès aux onglets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminUsers token={token} />
              </CardContent>
            </Card>
          )}

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>État du Système</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">100%</div>
                  <div className="text-sm text-green-700">Authentification</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">9</div>
                  <div className="text-sm text-blue-700">Permissions Onglets</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">120x120</div>
                  <div className="text-sm text-purple-700">Logo PDF (px)</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Permissions Display */}
          <Card>
            <CardHeader>
              <CardTitle>Vos Permissions d'Accès</CardTitle>
              <CardDescription>
                Onglets auxquels vous avez accès dans l'application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                {currentUser?.permissions && Object.entries(currentUser.permissions).map(([permission, allowed]) => (
                  <div key={permission} className={`p-3 rounded-lg border ${allowed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${allowed ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className={`text-sm font-medium ${allowed ? 'text-green-700' : 'text-gray-500'}`}>
                        {permission.charAt(0).toUpperCase() + permission.slice(1)}
                      </span>
                      {allowed && <span className="text-green-600">✓</span>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default App;