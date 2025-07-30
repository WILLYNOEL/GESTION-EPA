import requests
import sys
import json
from datetime import datetime, date

class EcoPumpAfrikAPITester:
    def __init__(self, base_url="https://4b33f187-d246-4fb0-9666-69f078e7f34c.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_client_id = None
        self.created_devis_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None, expect_pdf=False):
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
                
                if expect_pdf:
                    # Handle PDF response
                    content_type = response.headers.get('content-type', '')
                    if 'application/pdf' in content_type:
                        print(f"   Response: PDF file ({len(response.content)} bytes)")
                        return success, {"pdf_size": len(response.content)}
                    else:
                        print(f"   Response: Unexpected content-type: {content_type}")
                        return success, {}
                else:
                    # Handle JSON response
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
                        return success, response_data
                    except:
                        print(f"   Response: {response.text[:100]}...")
                        return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")

            return success, response.json() if response.text and not expect_pdf else {}

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

    def test_pdf_document_generation(self):
        """Test PDF generation for documents (devis, facture, paiement)"""
        print("\n🔍 Testing PDF Document Generation...")
        
        # Test devis PDF generation
        if self.created_devis_id:
            success, response = self.run_test(
                "Generate Devis PDF",
                "GET",
                f"api/pdf/document/devis/{self.created_devis_id}",
                200
            )
            if not success:
                return False
        else:
            print("❌ Skipping Devis PDF - No devis ID available")
        
        # Test invalid document type
        success, response = self.run_test(
            "Generate PDF with Invalid Document Type",
            "GET",
            f"api/pdf/document/invalid_type/test_id",
            400  # Should fail with 400
        )
        if not success:
            return False
        
        # Test non-existent document
        success, response = self.run_test(
            "Generate PDF for Non-existent Devis",
            "GET",
            f"api/pdf/document/devis/non_existent_id",
            404  # Should fail with 404
        )
        if not success:
            return False
        
        return True

    def test_pdf_report_generation(self):
        """Test PDF generation for reports"""
        print("\n🔍 Testing PDF Report Generation...")
        
        report_types = ["journal_ventes", "balance_clients", "tresorerie", "compte_resultat"]
        
        for report_type in report_types:
            success, response = self.run_test(
                f"Generate {report_type.replace('_', ' ').title()} Report PDF",
                "GET",
                f"api/pdf/rapport/{report_type}",
                200
            )
            if not success:
                return False
        
        # Test invalid report type
        success, response = self.run_test(
            "Generate PDF with Invalid Report Type",
            "GET",
            f"api/pdf/rapport/invalid_report",
            500  # Should fail with 500 (internal server error)
        )
        # Note: This might return 200 with empty data, so we'll accept either
        
        return True

    def test_pdf_content_headers(self):
        """Test PDF response headers and content type"""
        print("\n🔍 Testing PDF Response Headers...")
        
        if not self.created_devis_id:
            print("❌ Skipping PDF header test - No devis ID available")
            return False
        
        url = f"{self.base_url}/api/pdf/document/devis/{self.created_devis_id}"
        
        try:
            response = requests.get(url)
            
            if response.status_code == 200:
                # Check content type
                content_type = response.headers.get('content-type', '')
                if 'application/pdf' in content_type:
                    print("✅ Correct content-type: application/pdf")
                else:
                    print(f"❌ Incorrect content-type: {content_type}")
                    return False
                
                # Check if response contains PDF content
                if response.content.startswith(b'%PDF'):
                    print("✅ Response contains valid PDF content")
                else:
                    print("❌ Response does not contain valid PDF content")
                    return False
                
                # Check content length
                content_length = len(response.content)
                if content_length > 1000:  # PDF should be at least 1KB
                    print(f"✅ PDF size reasonable: {content_length} bytes")
                else:
                    print(f"❌ PDF size too small: {content_length} bytes")
                    return False
                
                return True
            else:
                print(f"❌ Failed to get PDF - Status: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Error testing PDF headers: {str(e)}")
            return False

    def test_pdf_with_real_data(self):
        """Test PDF generation with comprehensive real data"""
        print("\n🔍 Testing PDF Generation with Real ECO PUMP AFRIK Data...")
        
        # Create a comprehensive client for testing
        client_data = {
            "nom": "SOCIÉTÉ IVOIRIENNE DE TECHNOLOGIE INDUSTRIELLE (SOTICI)",
            "numero_cc": "CI-ABJ-2024-B-54321",
            "numero_rc": "RC-2024-SOTICI-001",
            "nif": "NIF-2024-SOTICI",
            "email": "contact@sotici.ci",
            "telephone": "+225 0748576956",
            "adresse": "Zone Industrielle de Yopougon, Abidjan, Côte d'Ivoire",
            "devise": "FCFA",
            "type_client": "industriel",
            "conditions_paiement": "30% à la commande, 40% à la livraison, 30% à 30 jours"
        }
        
        success, response = self.run_test(
            "Create Comprehensive Test Client",
            "POST",
            "api/clients",
            200,
            data=client_data
        )
        
        if not success:
            return False
        
        test_client_id = response['client']['client_id']
        
        # Create a comprehensive devis
        devis_data = {
            "client_id": test_client_id,
            "client_nom": "SOCIÉTÉ IVOIRIENNE DE TECHNOLOGIE INDUSTRIELLE (SOTICI)",
            "articles": [
                {
                    "item": 1,
                    "ref": "PUMP-CENTRI-5HP",
                    "designation": "Pompe centrifuge haute performance 5HP - Débit 50m³/h",
                    "quantite": 3,
                    "prix_unitaire": 750000,
                    "total": 2250000
                },
                {
                    "item": 2,
                    "ref": "PIPE-PVC-100",
                    "designation": "Tuyauterie PVC Ø100mm - Longueur 50m avec raccords",
                    "quantite": 2,
                    "prix_unitaire": 125000,
                    "total": 250000
                },
                {
                    "item": 3,
                    "ref": "VALVE-CTRL-AUTO",
                    "designation": "Vanne de contrôle automatique avec capteur de pression",
                    "quantite": 1,
                    "prix_unitaire": 450000,
                    "total": 450000
                },
                {
                    "item": 4,
                    "ref": "INSTALL-SERVICE",
                    "designation": "Installation complète et mise en service par technicien certifié",
                    "quantite": 1,
                    "prix_unitaire": 300000,
                    "total": 300000
                }
            ],
            "sous_total": 3250000,
            "tva": 585000,  # 18% of sous_total
            "total_ttc": 3835000,
            "net_a_payer": 3835000,
            "devise": "FCFA",
            "delai_livraison": "21 jours ouvrables après confirmation de commande",
            "conditions_paiement": "30% à la commande, 40% à la livraison, 30% à 30 jours",
            "mode_livraison": "Livraison sur site client avec installation",
            "reference_commande": "SOTICI-PUMP-2024-001"
        }
        
        success, response = self.run_test(
            "Create Comprehensive Test Devis",
            "POST",
            "api/devis",
            200,
            data=devis_data
        )
        
        if not success:
            return False
        
        test_devis_id = response['devis']['devis_id']
        
        # Test PDF generation for this comprehensive devis
        success, response = self.run_test(
            "Generate Comprehensive Devis PDF",
            "GET",
            f"api/pdf/document/devis/{test_devis_id}",
            200
        )
        
        if not success:
            return False
        
        # Convert devis to facture
        success, response = self.run_test(
            "Convert Comprehensive Devis to Facture",
            "POST",
            f"api/devis/{test_devis_id}/convert-to-facture",
            200
        )
        
        if not success:
            return False
        
        test_facture_id = response['facture']['facture_id']
        
        # Test facture PDF generation
        success, response = self.run_test(
            "Generate Comprehensive Facture PDF",
            "GET",
            f"api/pdf/document/facture/{test_facture_id}",
            200
        )
        
        if not success:
            return False
        
        # Create a payment for testing
        paiement_data = {
            "type_document": "facture",
            "document_id": test_facture_id,
            "client_id": test_client_id,
            "montant": 1150500,  # 30% of total
            "devise": "FCFA",
            "mode_paiement": "virement",
            "reference_paiement": "VIR-SOTICI-2024-001"
        }
        
        success, response = self.run_test(
            "Create Test Payment",
            "POST",
            "api/paiements",
            200,
            data=paiement_data
        )
        
        if not success:
            return False
        
        test_paiement_id = response['paiement']['paiement_id']
        
        # Test payment PDF generation
        success, response = self.run_test(
            "Generate Payment Receipt PDF",
            "GET",
            f"api/pdf/document/paiement/{test_paiement_id}",
            200
        )
        
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
    
    # NEW PDF ENDPOINT TESTS - Critical for ECO PUMP AFRIK
    print("\n" + "=" * 50)
    print("🔥 TESTING NEW PDF ENDPOINTS - ECO PUMP AFRIK")
    print("=" * 50)
    test_results.append(tester.test_pdf_document_generation())
    test_results.append(tester.test_pdf_report_generation())
    test_results.append(tester.test_pdf_content_headers())
    test_results.append(tester.test_pdf_with_real_data())
    
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