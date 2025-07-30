#!/usr/bin/env python3
"""
ECO PUMP AFRIK Logo Fix Test - Test emoji rendering and table structure
"""

import requests
import tempfile
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors

def test_emoji_rendering():
    """Test if emojis render properly in ReportLab PDFs"""
    print("🧪 Testing emoji rendering in ReportLab...")
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            doc = SimpleDocTemplate(tmp_file.name, pagesize=A4)
            story = []
            styles = getSampleStyleSheet()
            
            # Test 1: Direct emoji text
            story.append(Paragraph("Test 1: Direct emojis: 🏭💧🔧", styles['Normal']))
            story.append(Spacer(1, 12))
            
            # Test 2: Table with emojis
            header_table_data = [
                ["🏭", "ECO PUMP AFRIK", "📧 contact@ecopumpafrik.com"],
                ["💧", "Solutions Hydrauliques Professionnelles", "📞 +225 0707806359"],
                ["🔧", "Gestion Intelligente", "🌐 www.ecopumpafrik.com"]
            ]
            
            header_table = Table(header_table_data, colWidths=[30, 300, 150])
            header_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (0, -1), 16),  # Icons column
                ('FONTSIZE', (1, 0), (1, 0), 20),   # Company name 
                ('FONTSIZE', (1, 1), (1, -1), 10), # Subtitle and tagline
                ('FONTSIZE', (2, 0), (2, -1), 8),  # Contact info
                ('TEXTCOLOR', (1, 0), (1, 0), colors.HexColor('#0066cc')),  # Company name blue
                ('TEXTCOLOR', (1, 1), (1, -1), colors.HexColor('#666666')), # Gray text
                ('TEXTCOLOR', (2, 0), (2, -1), colors.HexColor('#444444')), # Contact dark gray
                ('ALIGN', (0, 0), (0, -1), 'CENTER'),  # Center icons
                ('ALIGN', (1, 0), (1, -1), 'LEFT'),    # Left align company info
                ('ALIGN', (2, 0), (2, -1), 'RIGHT'),   # Right align contact
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#0066cc')),  # Add border to make logo visible
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8f9fa')),  # Light background
            ]))
            
            story.append(header_table)
            story.append(Spacer(1, 20))
            
            # Test 3: Alternative symbols
            alt_table_data = [
                ["[FACTORY]", "ECO PUMP AFRIK", "Email: contact@ecopumpafrik.com"],
                ["[WATER]", "Solutions Hydrauliques Professionnelles", "Tel: +225 0707806359"],
                ["[TOOLS]", "Gestion Intelligente", "Web: www.ecopumpafrik.com"]
            ]
            
            alt_table = Table(alt_table_data, colWidths=[60, 270, 150])
            alt_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (0, -1), 10),  # Icons column
                ('FONTSIZE', (1, 0), (1, 0), 20),   # Company name 
                ('FONTSIZE', (1, 1), (1, -1), 10), # Subtitle and tagline
                ('FONTSIZE', (2, 0), (2, -1), 8),  # Contact info
                ('TEXTCOLOR', (1, 0), (1, 0), colors.HexColor('#0066cc')),  # Company name blue
                ('TEXTCOLOR', (1, 1), (1, -1), colors.HexColor('#666666')), # Gray text
                ('TEXTCOLOR', (2, 0), (2, -1), colors.HexColor('#444444')), # Contact dark gray
                ('ALIGN', (0, 0), (0, -1), 'CENTER'),  # Center icons
                ('ALIGN', (1, 0), (1, -1), 'LEFT'),    # Left align company info
                ('ALIGN', (2, 0), (2, -1), 'RIGHT'),   # Right align contact
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#0066cc')),  # Thicker border
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8f9fa')),  # Light background
            ]))
            
            story.append(Paragraph("Alternative with text symbols:", styles['Heading2']))
            story.append(alt_table)
            
            doc.build(story)
            
            print(f"✅ Test PDF created: {tmp_file.name}")
            
            # Check file size
            import os
            size = os.path.getsize(tmp_file.name)
            print(f"📊 Test PDF size: {size} bytes")
            
            return tmp_file.name, size > 2000
            
    except Exception as e:
        print(f"❌ Error creating test PDF: {e}")
        return None, False

def test_backend_pdf_generation():
    """Test the actual backend PDF generation"""
    print("\n🔍 Testing backend PDF generation...")
    
    base_url = "https://28553b55-afa1-45fb-8eb3-dcbd020d939a.preview.emergentagent.com"
    
    # Test a simple report
    try:
        response = requests.get(f"{base_url}/api/pdf/rapport/journal_ventes")
        
        if response.status_code == 200:
            size = len(response.content)
            print(f"✅ Backend PDF generated successfully: {size} bytes")
            
            # Save for inspection
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf', prefix='backend_test_') as tmp_file:
                tmp_file.write(response.content)
                print(f"💾 Backend PDF saved: {tmp_file.name}")
                
                # Try to extract some content
                content_str = response.content.decode('latin-1', errors='ignore')
                
                # Look for key elements
                elements_found = []
                if 'ECO' in content_str:
                    elements_found.append("ECO text")
                if 'PUMP' in content_str:
                    elements_found.append("PUMP text")
                if 'AFRIK' in content_str:
                    elements_found.append("AFRIK text")
                if 'contact@ecopumpafrik.com' in content_str:
                    elements_found.append("Email")
                if '0707806359' in content_str:
                    elements_found.append("Phone")
                if 'Table' in content_str:
                    elements_found.append("Table structure")
                if '#0066cc' in content_str or '0066cc' in content_str:
                    elements_found.append("Blue color")
                if '#f8f9fa' in content_str or 'f8f9fa' in content_str:
                    elements_found.append("Gray background")
                
                print(f"🔍 Elements found in backend PDF: {elements_found}")
                
                return len(elements_found) > 0
        else:
            print(f"❌ Backend PDF generation failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing backend PDF: {e}")
        return False

def main():
    print("🔧 ECO PUMP AFRIK LOGO FIX DIAGNOSTIC")
    print("=" * 50)
    
    # Test 1: Local emoji rendering
    test_pdf, test_success = test_emoji_rendering()
    
    # Test 2: Backend PDF generation
    backend_success = test_backend_pdf_generation()
    
    print("\n" + "=" * 50)
    print("🎯 DIAGNOSTIC RESULTS")
    print("=" * 50)
    
    print(f"Local emoji test: {'✅ PASS' if test_success else '❌ FAIL'}")
    print(f"Backend PDF test: {'✅ PASS' if backend_success else '❌ FAIL'}")
    
    if test_success and backend_success:
        print("\n✅ CONCLUSION: Logo implementation appears to be working")
        print("✅ The issue may be with emoji rendering or PDF viewer compatibility")
        print("📋 RECOMMENDATION: Logo is likely visible but may need alternative symbols")
    elif backend_success:
        print("\n⚠️  CONCLUSION: Backend generates PDFs but local test failed")
        print("⚠️  This suggests emoji rendering issues")
        print("📋 RECOMMENDATION: Consider using text-based symbols instead of emojis")
    else:
        print("\n❌ CONCLUSION: Critical issues with PDF generation")
        print("❌ Both local and backend tests show problems")
        print("📋 RECOMMENDATION: Investigate PDF generation code")
    
    return 0 if (test_success or backend_success) else 1

if __name__ == "__main__":
    exit(main())