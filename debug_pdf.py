from app import app, db, Ebook
import requests

with app.app_context():
    # Get first ebook with PDF
    ebook = Ebook.query.filter((Ebook.pdf_url \!= None) | (Ebook.pdf_file \!= None)).first()
    if ebook:
        print(f"Ebook ID: {ebook.id}")
        print(f"Name: {ebook.name}")
        print(f"PDF URL: {ebook.pdf_url}")
        print(f"PDF File: {ebook.pdf_file}")
        
        if ebook.pdf_url:
            # Test if URL is accessible
            try:
                response = requests.head(ebook.pdf_url, timeout=5)
                print(f"PDF URL Status: {response.status_code}")
            except Exception as e:
                print(f"PDF URL Error: {e}")
    else:
        print("No ebooks with PDFs found")
