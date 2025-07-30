import requests
import sys
import json
from datetime import datetime, date

class EcoPumpAfrikAPITester:
    def __init__(self, base_url="https://b49fd2cf-a326-4c6a-9c5a-4106c64f2b2b.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_client_id = None
        self.created_devis_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if method == 'POST' and 'client' in response_data:
                        print(f"   Response: Client created with ID {response_data['client']['client_id']}")
                    elif method == 'POST' and 'devis' in response_data:
                        print(f"   Response: Devis created with number {response_data['devis']['numero_devis']}")
                    elif method == 'GET' and 'clients' in response_data:
                        print(f"   Response: Found {len(response_data['clients'])} clients")
                    elif method == 'GET' and 'devis' in response_data:
                        print(f"   Response: Found {len(response_data['devis'])} devis")
                    elif method == 'GET' and 'stats' in response_data:
                        stats = response_data['stats']
                        print(f"   Response: {stats['total_clients']} clients, {stats['total_devis']} devis, {stats['montant_devis_mois']} FCFA this month")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")

            return success, response.json() if response.text else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health check"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        return success

    def test_create_client(self):
        """Test client creation"""
        client_data = {
            "nom": "TEST CLIENT SOTICI",
            "numero_cc": "CC123456",
            "email": "test@sotici.com",
            "telephone": "+225 0707806359",
            "adresse": "Cocody - Angré 7e Tranche",
            "devise": "FCFA",
            "type_client": "standard"
        }
        
        success, response = self.run_test(
            "Create Client",
            "POST",
            "api/clients",
            200,
            data=client_data
        )
        
        if success and 'client' in response:
            self.created_client_id = response['client']['client_id']
            return True
        return False

    def test_get_clients(self):
        """Test getting all clients"""
        success, response = self.run_test(
            "Get All Clients",
            "GET",
            "api/clients",
            200
        )
        return success

    def test_get_client_by_id(self):
        """Test getting specific client"""
        if not self.created_client_id:
            print("❌ Skipping - No client ID available")
            return False
            
        success, response = self.run_test(
            "Get Client by ID",
            "GET",
            f"api/clients/{self.created_client_id}",
            200
        )
        return success

    def test_update_client(self):
        """Test client update"""
        if not self.created_client_id:
            print("❌ Skipping - No client ID available")
            return False
            
        update_data = {
            "telephone": "+225 0707806360",
            "type_client": "revendeur"
        }
        
        success, response = self.run_test(
            "Update Client",
            "PUT",
            f"api/clients/{self.created_client_id}",
            200,
            data=update_data
        )
        return success

    def test_create_devis(self):
        """Test devis creation"""
        if not self.created_client_id:
            print("❌ Skipping - No client ID available")
            return False
            
        devis_data = {
            "client_id": self.created_client_id,
            "client_nom": "TEST CLIENT SOTICI",
            "articles": [
                {
                    "item": 1,
                    "ref": "PUMP001",
                    "designation": "Pompe hydraulique centrifuge 5HP",
                    "quantite": 2,
                    "prix_unitaire": 500000,
                    "total": 1000000
                },
                {
                    "item": 2,
                    "ref": "PIPE002",
                    "designation": "Tuyauterie PVC 50mm - 10m",
                    "quantite": 5,
                    "prix_unitaire": 25000,
                    "total": 125000
                }
            ],
            "sous_total": 1125000,
            "tva": 202500,  # 18% of sous_total
            "total_ttc": 1327500,
            "net_a_payer": 1327500,
            "devise": "FCFA",
            "delai_livraison": "15 jours",
            "conditions_paiement": "30% à la commande, 70% à la livraison"
        }
        
        success, response = self.run_test(
            "Create Devis",
            "POST",
            "api/devis",
            200,
            data=devis_data
        )
        
        if success and 'devis' in response:
            self.created_devis_id = response['devis']['devis_id']
            # Verify devis number format
            numero_devis = response['devis']['numero_devis']
            if numero_devis.startswith('DEV/TESTCLIENTSO/'):
                print(f"✅ Devis number format correct: {numero_devis}")
            else:
                print(f"⚠️  Devis number format unexpected: {numero_devis}")
            return True
        return False

    def test_get_devis(self):
        """Test getting all devis"""
        success, response = self.run_test(
            "Get All Devis",
            "GET",
            "api/devis",
            200
        )
        return success

    def test_get_devis_by_id(self):
        """Test getting specific devis"""
        if not self.created_devis_id:
            print("❌ Skipping - No devis ID available")
            return False
            
        success, response = self.run_test(
            "Get Devis by ID",
            "GET",
            f"api/devis/{self.created_devis_id}",
            200
        )
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "api/dashboard/stats",
            200
        )
        
        if success and 'stats' in response:
            stats = response['stats']
            # Verify stats structure
            required_fields = ['total_clients', 'total_devis', 'devis_ce_mois', 'montant_devis_mois', 'clients_fcfa', 'clients_eur']
            missing_fields = [field for field in required_fields if field not in stats]
            if missing_fields:
                print(f"⚠️  Missing stats fields: {missing_fields}")
            else:
                print("✅ All required stats fields present")
        
        return success

    def test_delete_client_with_devis(self):
        """Test that client with devis cannot be deleted"""
        if not self.created_client_id:
            print("❌ Skipping - No client ID available")
            return False
            
        success, response = self.run_test(
            "Delete Client with Devis (should fail)",
            "DELETE",
            f"api/clients/{self.created_client_id}",
            400  # Should fail with 400
        )
        return success

    def test_currency_handling(self):
        """Test EUR client creation"""
        eur_client_data = {
            "nom": "EUROPEAN CLIENT TEST",
            "email": "test@europe.com",
            "devise": "EUR",
            "type_client": "industriel"
        }
        
        success, response = self.run_test(
            "Create EUR Client",
            "POST",
            "api/clients",
            200,
            data=eur_client_data
        )
        return success

    def test_convert_devis_to_facture(self):
        """Test converting devis to facture"""
        if not self.created_devis_id:
            print("❌ Skipping - No devis ID available")
            return False
            
        success, response = self.run_test(
            "Convert Devis to Facture",
            "POST",
            f"api/devis/{self.created_devis_id}/convert-to-facture",
            200
        )
        
        if success and 'facture' in response:
            facture = response['facture']
            print(f"✅ Facture created with number: {facture['numero_facture']}")
            print(f"✅ Devis reference: {facture['devis_id']}")
        
        return success

    def test_get_factures(self):
        """Test getting all factures"""
        success, response = self.run_test(
            "Get All Factures",
            "GET",
            "api/factures",
            200
        )
        return success

    def test_get_fournisseurs(self):
        """Test getting all fournisseurs"""
        success, response = self.run_test(
            "Get All Fournisseurs",
            "GET",
            "api/fournisseurs",
            200
        )
        return success

    def test_create_fournisseur(self):
        """Test fournisseur creation"""
        fournisseur_data = {
            "nom": "FOURNISSEUR TEST SOTICI",
            "numero_cc": "CC789012",
            "email": "fournisseur@test.com",
            "telephone": "+225 0707806361",
            "adresse": "Zone Industrielle Yopougon",
            "devise": "FCFA",
            "conditions_paiement": "60 jours fin de mois"
        }
        
        success, response = self.run_test(
            "Create Fournisseur",
            "POST",
            "api/fournisseurs",
            200,
            data=fournisseur_data
        )
        return success

    def test_get_stock(self):
        """Test getting stock"""
        success, response = self.run_test(
            "Get Stock",
            "GET",
            "api/stock",
            200
        )
        return success

    def test_get_stock_alerts(self):
        """Test getting stock alerts"""
        success, response = self.run_test(
            "Get Stock Alerts",
            "GET",
            "api/stock/alerts",
            200
        )
        return success

    def test_get_paiements(self):
        """Test getting paiements"""
        success, response = self.run_test(
            "Get Paiements",
            "GET",
            "api/paiements",
            200
        )
        return success

    def test_search_functionality(self):
        """Test search functionality"""
        success, response = self.run_test(
            "Search Documents",
            "GET",
            "api/search",
            200,
            params={"q": "TEST"}
        )
        
        if success and 'results' in response:
            results = response['results']
            print(f"✅ Search found: {len(results.get('clients', []))} clients, {len(results.get('devis', []))} devis, {len(results.get('factures', []))} factures")
        
        return success

def main():
    print("🚀 Starting ECO PUMP AFRIK API Tests")
    print("=" * 50)
    
    tester = EcoPumpAfrikAPITester()
    
    # Run all tests in sequence
    test_results = []
    
    # Basic API tests
    test_results.append(tester.test_health_check())
    test_results.append(tester.test_create_client())
    test_results.append(tester.test_get_clients())
    test_results.append(tester.test_get_client_by_id())
    test_results.append(tester.test_update_client())
    
    # Devis tests
    test_results.append(tester.test_create_devis())
    test_results.append(tester.test_get_devis())
    test_results.append(tester.test_get_devis_by_id())
    
    # Dashboard tests
    test_results.append(tester.test_dashboard_stats())
    
    # Business logic tests
    test_results.append(tester.test_delete_client_with_devis())
    test_results.append(tester.test_currency_handling())
    
    # Additional comprehensive tests
    test_results.append(tester.test_convert_devis_to_facture())
    test_results.append(tester.test_get_factures())
    test_results.append(tester.test_get_fournisseurs())
    test_results.append(tester.test_create_fournisseur())
    test_results.append(tester.test_get_stock())
    test_results.append(tester.test_get_stock_alerts())
    test_results.append(tester.test_get_paiements())
    test_results.append(tester.test_search_functionality())
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed! Backend API is working correctly.")
        return 0
    else:
        print("⚠️  Some tests failed. Check the details above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())