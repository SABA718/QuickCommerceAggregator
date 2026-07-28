import os
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from rapidfuzz import process, fuzz
from deep_translator import GoogleTranslator
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables (e.g., from a .env file)
load_dotenv()

app = FastAPI(title="DealDock AI Service")

# --- MOCK DATABASE FOR NORMALIZATION ---
# 🌟 THE FIX: Completely generic categories. 
# This ensures searches do not force a specific brand, returning a true market comparison.
STANDARD_PRODUCTS = [
    "milk",
    "bread",
    "eggs",
    "onion",
    "tomato",
    "potato",
    "sugar",
    "salt",
    "rice",
    "dal"
]

# --- REQUEST MODELS ---
class ProductQuery(BaseModel):
    raw_name: str

class TranslateQuery(BaseModel):
    text: str

class ParseListQuery(BaseModel):
    raw_list: str

# ==========================================
# FEATURE 1: FUZZY MATCHING & NORMALIZATION
# ==========================================
@app.post("/api/normalize")
async def normalize_product(query: ProductQuery):
    """
    Solves 'Inconsistent Product Names' by matching variations to a standard generic catalog.
    """
    clean_query = query.raw_name.lower().strip()
    
    # Use RapidFuzz to find the closest match in our standard list
    # WRatio automatically applies the best matching strategy (including partial sets)
    best_match = process.extractOne(
        clean_query, 
        STANDARD_PRODUCTS, 
        scorer=fuzz.WRatio 
    )
    
    # best_match returns a tuple: (Match String, Score, Index)
    if best_match and best_match[1] > 65: # 65% confidence threshold
        return {
            "success": True,
            "original": query.raw_name,
            "normalized": best_match[0],
            "confidence": round(best_match[1], 2)
        }
    
    return {
        "success": False, 
        "message": "No standard match found, trigger fallback."
    }

# ==========================================
# FEATURE 2: REGIONAL LANGUAGE PROCESSING
# ==========================================
@app.post("/api/translate")
async def translate_query(query: TranslateQuery):
    """
    Solves the 'Language Barrier' by detecting regional languages and translating to English.
    """
    try:
        # Auto-detects source language (Tamil, Kannada, Hindi, etc.) and translates to English
        translated_text = GoogleTranslator(source='auto', target='en').translate(query.text)
        return {
            "success": True,
            "original": query.text,
            "translated": translated_text.lower()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# FEATURE 3: SMART LIST PARSING (LLM)
# ==========================================
@app.post("/api/parse-list")
async def parse_grocery_list(query: ParseListQuery):
    """
    Takes unstructured text (like a WhatsApp message) and returns a structured JSON cart.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not set in the environment.")
        
    genai.configure(api_key=api_key)
    
    # Using Gemini Flash for fast, cost-effective structured data extraction
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = f"""
    You are a highly accurate grocery list parser. 
    Extract the individual grocery items and their quantities from the following messy text.
    Return ONLY a valid JSON array of objects. Do not include markdown formatting like ```json.
    Format: [{{"item": "product name", "quantity": "amount"}}]
    
    Raw Text: {query.raw_list}
    """
    
    try:
        response = model.generate_content(prompt)
        
        # Clean the response to ensure it is parseable JSON
        cleaned_response = response.text.replace('```json', '').replace('```', '').strip()
        parsed_data = json.loads(cleaned_response)
        
        return {
            "success": True,
            "parsed_items": parsed_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse list: {str(e)}")