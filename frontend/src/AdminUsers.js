import React, { useState, useEffect } from 'react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { Label } from './components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Badge } from './components/ui/badge';
import { Alert, AlertDescription } from './components/ui/alert';
import { Checkbox } from './components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Plus, Edit, Trash2, Users, Shield, User as UserIcon, Settings, Key } from 'lucide-react';

const AdminUsers = ({ token }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingPermissions, setEditingPermissions] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    role: 'user'
  });

  // Permissions disponibles
  const availablePermissions = [
    { key: 'dashboard', label: 'Tableau de Bord', icon: '📊' },
    { key: 'clients', label: 'Clients', icon: '👥' },
    { key: 'fournisseurs', label: 'Fournisseurs', icon: '🏢' },
    { key: 'devis', label: 'Devis', icon: '📋' },
    { key: 'factures', label: 'Factures', icon: '🧾' },
    { key: 'stock', label: 'Stock', icon: '📦' },
    { key: 'paiements', label: 'Paiements', icon: '💳' },
    { key: 'rapports', label: 'Rapports', icon: '📈' },
    { key: 'administration', label: 'Administration', icon: '⚙️' }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        setError('Erreur lors du chargement des utilisateurs');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const url = editingUser 
        ? `${process.env.REACT_APP_BACKEND_URL}/api/auth/users/${editingUser.user_id}`
        : `${process.env.REACT_APP_BACKEND_URL}/api/auth/users`;
      
      const method = editingUser ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess(editingUser ? 'Utilisateur modifié avec succès' : 'Utilisateur créé avec succès');
        setIsDialogOpen(false);
        resetForm();
        fetchUsers();
      } else {
        const data = await response.json();
        setError(data.detail || 'Erreur lors de l\'opération');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      email: user.email || '',
      role: user.role
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setSuccess('Utilisateur supprimé avec succès');
        fetchUsers();
      } else {
        const data = await response.json();
        setError(data.detail || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPermissions = (user) => {
    setEditingPermissions(user);
    setIsPermissionsDialogOpen(true);
  };

  const handleUpdatePermissions = async (userId, permissions) => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/users/${userId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          permissions: permissions
        }),
      });

      if (response.ok) {
        setSuccess('Permissions mises à jour avec succès');
        setIsPermissionsDialogOpen(false);
        setEditingPermissions(null);
        fetchUsers();
      } else {
        const data = await response.json();
        setError(data.detail || 'Erreur lors de la mise à jour des permissions');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      email: '',
      role: 'user'
    });
    setEditingUser(null);
    setError('');
    setSuccess('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Jamais';
    return new Date(dateString).toLocaleString('fr-FR');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Users className="mr-2 h-6 w-6" />
            Gestion des Utilisateurs & Permissions
          </h2>
          <p className="text-muted-foreground">
            Gérez les accès à l'application ECO PUMP AFRIK et contrôlez les permissions par onglet
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvel Utilisateur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'}
              </DialogTitle>
              <DialogDescription>
                {editingUser 
                  ? 'Modifiez les informations de l\'utilisateur' 
                  : 'Ajoutez un nouvel utilisateur à l\'application'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              
              <div>
                <Label htmlFor="username">Nom d'utilisateur *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  disabled={loading || editingUser}
                  placeholder="nom_utilisateur"
                />
              </div>
              
              <div>
                <Label htmlFor="password">
                  Mot de passe {editingUser ? '(laisser vide pour ne pas changer)' : '*'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                  disabled={loading}
                  placeholder="mot_de_passe"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={loading}
                  placeholder="email@exemple.com"
                />
              </div>
              
              <div>
                <Label htmlFor="role">Rôle *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Utilisateur</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Enregistrement...' : (editingUser ? 'Modifier' : 'Créer')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-700">
            {success}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Utilisateurs</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center space-x-2">
            <Key className="h-4 w-4" />
            <span>Gestion des Permissions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Utilisateurs de l'application</CardTitle>
              <CardDescription>
                Liste de tous les utilisateurs ayant accès à ECO PUMP AFRIK
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Dernière connexion</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Chargement des utilisateurs...
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        <UserIcon className="mx-auto h-12 w-12 mb-2" />
                        <p>Aucun utilisateur trouvé</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            {user.role === 'admin' ? (
                              <Shield className="mr-2 h-4 w-4 text-blue-600" />
                            ) : (
                              <UserIcon className="mr-2 h-4 w-4 text-gray-500" />
                            )}
                            {user.username}
                          </div>
                        </TableCell>
                        <TableCell>{user.email || 'Non renseigné'}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? 'success' : 'destructive'}>
                            {user.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.permissions && Object.entries(user.permissions)
                              .filter(([_, allowed]) => allowed)
                              .slice(0, 3)
                              .map(([permission, _]) => (
                                <Badge key={permission} variant="outline" className="text-xs">
                                  {availablePermissions.find(p => p.key === permission)?.icon} {permission}
                                </Badge>
                              ))
                            }
                            {user.permissions && Object.entries(user.permissions).filter(([_, allowed]) => allowed).length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{Object.entries(user.permissions).filter(([_, allowed]) => allowed).length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(user.last_login)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button size="sm" variant="outline" onClick={() => handleEditPermissions(user)}>
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEdit(user)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleDelete(user.user_id)}
                              disabled={user.username === 'admin'}
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
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="mr-2 h-5 w-5" />
                Gestion des Permissions par Utilisateur
              </CardTitle>
              <CardDescription>
                Contrôlez l'accès aux différents onglets de l'application pour chaque utilisateur
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {users.filter(user => user.role !== 'admin').map((user) => (
                  <div key={user.user_id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <UserIcon className="h-5 w-5 text-gray-500" />
                        <span className="font-medium">{user.username}</span>
                        <Badge variant="secondary">{user.role}</Badge>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleEditPermissions(user)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Configurer
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {availablePermissions.map((permission) => (
                        <div key={permission.key} className="flex items-center space-x-2">
                          <span className={`inline-block w-4 h-4 rounded ${
                            user.permissions?.[permission.key] ? 'bg-green-500' : 'bg-gray-300'
                          }`}></span>
                          <span className="text-sm">
                            {permission.icon} {permission.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {users.filter(user => user.role !== 'admin').length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Key className="mx-auto h-12 w-12 mb-2" />
                    <p>Aucun utilisateur standard à configurer</p>
                    <p className="text-sm">Les administrateurs ont automatiquement tous les accès</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de gestion des permissions */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Key className="mr-2 h-5 w-5" />
              Gérer les Permissions - {editingPermissions?.username}
            </DialogTitle>
            <DialogDescription>
              Cochez les onglets auxquels cet utilisateur aura accès dans l'application
            </DialogDescription>
          </DialogHeader>
          
          {editingPermissions && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {availablePermissions.map((permission) => (
                  <div key={permission.key} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={permission.key}
                      checked={editingPermissions.permissions?.[permission.key] || false}
                      onCheckedChange={(checked) => {
                        const newPermissions = {
                          ...editingPermissions.permissions,
                          [permission.key]: checked
                        };
                        setEditingPermissions({
                          ...editingPermissions,
                          permissions: newPermissions
                        });
                      }}
                    />
                    <Label htmlFor={permission.key} className="flex items-center space-x-2 cursor-pointer">
                      <span>{permission.icon}</span>
                      <span>{permission.label}</span>
                    </Label>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsPermissionsDialogOpen(false);
                    setEditingPermissions(null);
                  }}
                >
                  Annuler
                </Button>
                <Button 
                  onClick={() => handleUpdatePermissions(editingPermissions.user_id, editingPermissions.permissions)}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Enregistrement...' : 'Sauvegarder les Permissions'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;