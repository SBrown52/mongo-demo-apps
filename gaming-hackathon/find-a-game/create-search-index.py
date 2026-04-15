"""  
create_search_index.py  
======================  
Standalone script to create (or update) the Atlas Search index  
for the MongoBet gaming catalogue.  
  
Usage:  
    python create_search_index.py  
  
Requirements:  
    pip install pymongo  
"""  
  
import time  
import sys  
from pymongo import MongoClient  
from pymongo.operations import SearchIndexModel  
  
# ──────────────────────────────────────────────  
# Configuration  
# ──────────────────────────────────────────────  
MONGO_URI = ""   # <-- update as needed  
DB_NAME = "gaming_catalogue"  
COLLECTION_NAME = "games"  
SEARCH_INDEX_NAME = "games_search"  
AUTOCOMPLETE_INDEX_NAME = "games_autocomplete"  
  
# ──────────────────────────────────────────────  
# Search Index Definition (main full-text search)  
# ──────────────────────────────────────────────  
SEARCH_INDEX_DEFINITION = {  
    "mappings": {  
        "dynamic": False,  
        "fields": {  
            "name": {  
                "type": "string",  
                "analyzer": "lucene.standard",  
            },  
            "description": {  
                "type": "string",  
                "analyzer": "lucene.standard",  
            },  
            "short_description": {  
                "type": "string",  
                "analyzer": "lucene.standard",  
            },  
            "provider": {  
                "type": "string",  
                "analyzer": "lucene.keyword",  
            },  
            "category": {  
                "type": "stringFacet",  
            },  
            "subcategory": {  
                "type": "stringFacet",  
            },  
            "tags": {  
                "type": "string",  
                "analyzer": "lucene.keyword",  
            },  
            "theme": {  
                "type": "string",  
                "analyzer": "lucene.standard",  
            },  
            "volatility": {  
                "type": "stringFacet",  
            },  
            "features": {  
                "type": "string",  
                "analyzer": "lucene.keyword",  
            },  
            "status": {  
                "type": "stringFacet",  
            },  
            "jurisdictions": {  
                "type": "string",  
                "analyzer": "lucene.keyword",  
            },  
            "popularity_score": {  
                "type": "number",  
            },  
            "player_rating.average": {  
                "type": "number",  
            },  
            "release_date": {  
                "type": "date",  
            },  
            "is_new": {  
                "type": "boolean",  
            },  
            "is_featured": {  
                "type": "boolean",  
            },  
        },  
    },  
}  
  
# ──────────────────────────────────────────────  
# Autocomplete Index Definition (separate index)  
# ──────────────────────────────────────────────  
AUTOCOMPLETE_INDEX_DEFINITION = {  
    "mappings": {  
        "dynamic": False,  
        "fields": {  
            "name": {  
                "type": "autocomplete",  
                "tokenization": "edgeGram",  
                "minGrams": 2,  
                "maxGrams": 15,  
                "foldDiacritics": True,  
            },  
            "provider": {  
                "type": "autocomplete",  
                "tokenization": "edgeGram",  
                "minGrams": 2,  
                "maxGrams": 20,  
                "foldDiacritics": True,  
            },  
            "theme": {  
                "type": "autocomplete",  
                "tokenization": "edgeGram",  
                "minGrams": 2,  
                "maxGrams": 20,  
                "foldDiacritics": True,  
            },  
        },  
    },  
}  
  
  
def get_existing_indexes(collection):  
    """Return a dict of existing search indexes keyed by name."""  
    try:  
        indexes = list(collection.list_search_indexes())  
        return {idx["name"]: idx for idx in indexes}  
    except Exception as e:  
        print(f"  ⚠️  Could not list search indexes: {e}")  
        return {}  
  
  
def wait_for_index_ready(collection, index_name, timeout_seconds=300):  
    """Poll until the search index status is READY."""  
    print(f"\n⏳ Waiting for index '{index_name}' to become ready …")  
    start = time.time()  
    while True:  
        elapsed = time.time() - start  
        if elapsed > timeout_seconds:  
            print(f"\n❌ Timed out after {timeout_seconds}s. The index may still be building.")  
            print("   Check the Atlas UI: Database → Atlas Search to see the status.")  
            return False  
  
        try:  
            indexes = list(collection.list_search_indexes())  
            for idx in indexes:  
                if idx.get("name") == index_name:  
                    status = idx.get("status", "UNKNOWN")  
                    queryable = idx.get("queryable", False)  
                    print(  
                        f"   [{int(elapsed):>3d}s] status: {status:<12s}  queryable: {queryable}",  
                        end="\r",  
                    )  
                    if queryable and status == "READY":  
                        print(  
                            f"\n   ✅ Index '{index_name}' is READY and queryable! "  
                            f"(took {int(elapsed)}s)"  
                        )  
                        return True  
        except Exception as e:  
            print(f"\n   ⚠️  Error checking status: {e}")  
  
        time.sleep(5)  
  
  
def create_or_replace_index(collection, index_name, definition, existing_indexes):  
    """Create a search index, dropping the old one first if it exists."""  
    if index_name in existing_indexes:  
        status = existing_indexes[index_name].get("status", "UNKNOWN")  
        print(f"   Found existing index '{index_name}' (status: {status})")  
        choice = input(f"   Drop and recreate '{index_name}'? (y/N): ").strip().lower()  
        if choice == "y":  
            print(f"   🗑️  Dropping '{index_name}' …")  
            try:  
                collection.drop_search_index(index_name)  
                print(f"   ✅ Dropped. Waiting 10s for propagation …")  
                time.sleep(10)  
            except Exception as e:  
                print(f"   ❌ Failed to drop: {e}")  
                return False  
        else:  
            print(f"   Keeping existing '{index_name}'.")  
            if status != "READY":  
                wait_for_index_ready(collection, index_name)  
            return True  
  
    print(f"\n🏗️  Creating search index '{index_name}' …")  
    print(f"   Mapped fields: {len(definition['mappings']['fields'])}")  
  
    try:  
        model = SearchIndexModel(  
            definition=definition,  
            name=index_name,  
        )  
        result = collection.create_search_index(model=model)  
        print(f"   ✅ Index creation initiated! Response: {result}")  
        return True  
    except Exception as e:  
        error_msg = str(e).lower()  
        if "already exists" in error_msg or "duplicate" in error_msg:  
            print(f"   ⚠️  Index already exists (race condition).")  
            return True  
        else:  
            print(f"   ❌ Failed to create index: {e}")  
            print()  
            print("   Common causes:")  
            print("   • Not connected to MongoDB Atlas (search indexes require Atlas)")  
            print("   • Atlas user missing 'atlasAdmin' or 'Search Index Management' role")  
            print("   • PyMongo version < 4.4 (upgrade: pip install --upgrade pymongo)")  
            import pymongo  
            print(f"   • Installed PyMongo version: {pymongo.version}")  
            return False  
  
  
def run_test_search(collection):  
    """Run a test $search query to verify the main search index works."""  
    print("\n🧪 Testing search index …")  
    try:  
        pipeline = [  
            {  
                "$search": {  
                    "index": SEARCH_INDEX_NAME,  
                    "text": {  
                        "query": "gold",  
                        "path": ["name", "description", "theme"],  
                    },  
                }  
            },  
            {"$limit": 3},  
            {"$project": {  
                "name": 1,  
                "category": 1,  
                "provider": 1,  
                "score": {"$meta": "searchScore"},  
            }},  
        ]  
        results = list(collection.aggregate(pipeline))  
        if results:  
            print(f"   ✅ Search returned {len(results)} result(s):")  
            for r in results:  
                print(  
                    f"      • {r.get('name', '?'):40s}  "  
                    f"[{r.get('category', '?')}]  "  
                    f"score={r.get('score', 0):.2f}"  
                )  
        else:  
            print("   ⚠️  No results for 'gold' — OK if your data doesn't contain that term.")  
    except Exception as e:  
        print(f"   ❌ Search test failed: {e}")  
  
  
def run_test_autocomplete(collection):  
    """Run a test autocomplete query to verify the autocomplete index works."""  
    print("\n🧪 Testing autocomplete index …")  
    try:  
        pipeline = [  
            {  
                "$search": {  
                    "index": AUTOCOMPLETE_INDEX_NAME,  
                    "autocomplete": {  
                        "query": "lig",  
                        "path": "name",  
                    },  
                }  
            },  
            {"$limit": 5},  
            {"$project": {  
                "name": 1,  
                "category": 1,  
                "score": {"$meta": "searchScore"},  
            }},  
        ]  
        results = list(collection.aggregate(pipeline))  
        if results:  
            print(f"   ✅ Autocomplete returned {len(results)} result(s) for 'lig':")  
            for r in results:  
                print(f"      • {r.get('name', '?'):40s}  [{r.get('category', '?')}]")  
        else:  
            print("   ⚠️  No autocomplete results for 'lig' — OK if data doesn't match.")  
    except Exception as e:  
        print(f"   ❌ Autocomplete test failed: {e}")  
  
  
def main():  
    print("=" * 60)  
    print("  MongoBet — Atlas Search Index Creator")  
    print("=" * 60)  
    print()  
  
    # ── Connect ──  
    print(f"🔌 Connecting to MongoDB …")  
    print(f"   URI:        {MONGO_URI[:40]}…")  
    print(f"   Database:   {DB_NAME}")  
    print(f"   Collection: {COLLECTION_NAME}")  
    print()  
  
    try:  
        client = MongoClient(MONGO_URI)  
        client.admin.command("ping")  
        print("   ✅ Connected successfully.\n")  
    except Exception as e:  
        print(f"   ❌ Connection failed: {e}")  
        sys.exit(1)  
  
    db = client[DB_NAME]  
    collection = db[COLLECTION_NAME]  
  
    # ── Check document count ──  
    doc_count = collection.count_documents({})  
    print(f"📊 Collection '{COLLECTION_NAME}' has {doc_count:,} documents.")  
    if doc_count == 0:  
        print("   ⚠️  No documents found! Run the data generator first.")  
        print("   Indexes will still be created but won't have anything to search.\n")  
    print()  
  
    # ── Get existing indexes ──  
    print(f"🔍 Checking for existing search indexes …")  
    existing = get_existing_indexes(collection)  
    if existing:  
        print(f"   Found {len(existing)} existing index(es): {', '.join(existing.keys())}")  
    else:  
        print("   No existing search indexes found.")  
    print()  
  
    # ── Create main search index ──  
    print("━" * 60)  
    print("  INDEX 1: Full-Text Search")  
    print("━" * 60)  
    search_ok = create_or_replace_index(  
        collection, SEARCH_INDEX_NAME, SEARCH_INDEX_DEFINITION, existing  
    )  
  
    # ── Create autocomplete index ──  
    print()  
    print("━" * 60)  
    print("  INDEX 2: Autocomplete")  
    print("━" * 60)  
    auto_ok = create_or_replace_index(  
        collection, AUTOCOMPLETE_INDEX_NAME, AUTOCOMPLETE_INDEX_DEFINITION, existing  
    )  
  
    # ── Wait for both to be ready ──  
    if search_ok:  
        wait_for_index_ready(collection, SEARCH_INDEX_NAME)  
    if auto_ok:  
        wait_for_index_ready(collection, AUTOCOMPLETE_INDEX_NAME)  
  
    # ── Test queries ──  
    if search_ok:  
        run_test_search(collection)  
    if auto_ok:  
        run_test_autocomplete(collection)  
  
    # ── Summary ──  
    print()  
    print("=" * 60)  
    print("  ✅ All done! Search indexes are configured.")  
    print()  
    print(f"  📖 Full-text search index:  {SEARCH_INDEX_NAME}")  
    print(f"  ⌨️  Autocomplete index:      {AUTOCOMPLETE_INDEX_NAME}")  
    print()  
    print("  You can now run:  node mongobet.js")  
    print("=" * 60)  
  
    client.close()  
  
  
if __name__ == "__main__":  
    main()  
