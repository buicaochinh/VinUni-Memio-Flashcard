import sys
import io
from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader

# Force UTF-8 for console output to avoid 'charmap' errors on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def test_pdf_extraction(pdf_path):
    print(f"Testing extraction for: {pdf_path}")
    try:
        loader = PyPDFLoader(str(pdf_path))
        pages = loader.load_and_split()
        if not pages:
            print("No pages found.")
            return
        
        print(f"Total pages: {len(pages)}")
        for i, page in enumerate(pages[:2]): # show first 2 pages
            print(f"--- Page {i+1} ---")
            # Encode/decode to ensure print-friendly characters if needed, 
            # but since we set stdout to utf-8 it should be fine.
            content = page.page_content
            print(content[:500]) 
            print("-" * 20)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_path = Path("data/temp_study.pdf")
    if test_path.exists():
        test_pdf_extraction(test_path)
    else:
        print("Test file not found.")
