# app.py  
from flask import Flask, jsonify, request, render_template  
from flask_cors import CORS  
from pymongo import MongoClient  
from bson import json_util, ObjectId  
import json  
  
app = Flask(__name__, static_folder="static", template_folder="templates")  
CORS(app)  
  
# MongoDB connection  
MONGO_URI = ""   # <-- update as needed  
client = MongoClient(MONGO_URI)
db = client["sports_betting_demo"]  
  
  
def parse_json(data):  
    """Convert MongoDB BSON to JSON-serializable format."""  
    return json.loads(json_util.dumps(data))  
  
  
@app.route("/")  
def index():  
    return render_template("index.html")  
  
  
@app.route("/api/events", methods=["GET"])  
def get_events():  
    """Get events with optional filters."""  
    sport = request.args.get("sport")  
    status = request.args.get("status")  
    featured = request.args.get("featured")  
  
    query = {}  
    if sport:  
        query["sport"] = sport  
    if status:  
        query["status"] = status  
    if featured and featured.lower() == "true":  
        query["is_featured"] = True  
  
    events = list(db.events.find(query).sort("kick_off", 1))  
    return jsonify(parse_json(events))  
  
  
@app.route("/api/events/<event_id>", methods=["GET"])  
def get_event(event_id):  
    """Get a single event by ID."""  
    event = db.events.find_one({"_id": ObjectId(event_id)})  
    if event:  
        return jsonify(parse_json(event))  
    return jsonify({"error": "Event not found"}), 404  
  
  
@app.route("/api/events/nearby", methods=["GET"])  
def get_nearby_events():  
    """Get events near a given location."""  
    lng = float(request.args.get("lng", -0.1278))  # Default: London  
    lat = float(request.args.get("lat", 51.5074))  
    max_distance = int(request.args.get("max_distance", 100000))  # Default: 100km  
  
    events = list(db.events.find({  
        "venue.location": {  
            "$near": {  
                "$geometry": {  
                    "type": "Point",  
                    "coordinates": [lng, lat]  
                },  
                "$maxDistance": max_distance  
            }  
        }  
    }).limit(5))  
  
    return jsonify(parse_json(events))  
  
  
@app.route("/api/events/search", methods=["GET"])  
def search_events():  
    """Text search for events."""  
    q = request.args.get("q", "")  
    if not q:  
        return jsonify([])  
  
    events = list(db.events.find({"$text": {"$search": q}}).sort("kick_off", 1))  
    return jsonify(parse_json(events))  
  
  
@app.route("/api/stats", methods=["GET"])  
def get_stats():  
    """Get summary statistics."""  
    pipeline = [  
        {  
            "$group": {  
                "_id": {"sport": "$sport", "status": "$status"},  
                "count": {"$sum": 1}  
            }  
        }  
    ]  
    stats = list(db.events.aggregate(pipeline))  
    total = db.events.count_documents({})  
    return jsonify({"total": total, "breakdown": parse_json(stats)})  
  
  
if __name__ == "__main__":  
    app.run(debug=True, port=5050)  