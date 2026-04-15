# generate_data.py  
import pymongo  
from datetime import datetime, timedelta  
import random  
from bson import ObjectId  
  
# MongoDB connection  
MONGO_URI = ""   # <-- update as needed  
client = pymongo.MongoClient(MONGO_URI)  
db = client["sports_betting_demo"]  
  
# Drop existing collections  
db.events.drop()  
db.sports.drop()  
  
# ============================================================  
# REALISTIC UK TEAMS & VENUES WITH GEO COORDINATES  
# ============================================================  
  
football_teams = [  
    {"name": "Manchester United", "venue": "Old Trafford", "city": "Manchester", "coordinates": [-2.2913, 53.4631]},  
    {"name": "Manchester City", "venue": "Etihad Stadium", "city": "Manchester", "coordinates": [-2.2004, 53.4831]},  
    {"name": "Liverpool", "venue": "Anfield", "city": "Liverpool", "coordinates": [-2.9616, 53.4308]},  
    {"name": "Arsenal", "venue": "Emirates Stadium", "city": "London", "coordinates": [-0.1085, 51.5549]},  
    {"name": "Chelsea", "venue": "Stamford Bridge", "city": "London", "coordinates": [-0.1910, 51.4817]},  
    {"name": "Tottenham Hotspur", "venue": "Tottenham Hotspur Stadium", "city": "London", "coordinates": [-0.0662, 51.6042]},  
    {"name": "Newcastle United", "venue": "St James' Park", "city": "Newcastle", "coordinates": [-1.6217, 54.9756]},  
    {"name": "Aston Villa", "venue": "Villa Park", "city": "Birmingham", "coordinates": [-1.8847, 52.5092]},  
    {"name": "West Ham United", "venue": "London Stadium", "city": "London", "coordinates": [-0.0166, 51.5386]},  
    {"name": "Brighton & Hove Albion", "venue": "Amex Stadium", "city": "Brighton", "coordinates": [-0.1067, 50.8616]},  
    {"name": "Wolverhampton Wanderers", "venue": "Molineux Stadium", "city": "Wolverhampton", "coordinates": [-2.1303, 52.5903]},  
    {"name": "Everton", "venue": "Goodison Park", "city": "Liverpool", "coordinates": [-2.9664, 53.4387]},  
    {"name": "Leicester City", "venue": "King Power Stadium", "city": "Leicester", "coordinates": [-1.1423, 52.6204]},  
    {"name": "Crystal Palace", "venue": "Selhurst Park", "city": "London", "coordinates": [-0.0855, 51.3983]},  
    {"name": "Fulham", "venue": "Craven Cottage", "city": "London", "coordinates": [-0.2217, 51.4749]},  
    {"name": "Nottingham Forest", "venue": "City Ground", "city": "Nottingham", "coordinates": [-1.1325, 52.9399]},  
    {"name": "Bournemouth", "venue": "Vitality Stadium", "city": "Bournemouth", "coordinates": [-1.8384, 50.7352]},  
    {"name": "Brentford", "venue": "Gtech Community Stadium", "city": "London", "coordinates": [-0.2886, 51.4907]},  
    {"name": "Leeds United", "venue": "Elland Road", "city": "Leeds", "coordinates": [-1.5722, 53.7778]},  
    {"name": "Southampton", "venue": "St Mary's Stadium", "city": "Southampton", "coordinates": [-1.3908, 50.9058]},  
]  
  
rugby_teams = [  
    {"name": "Saracens", "venue": "StoneX Stadium", "city": "London", "coordinates": [-0.2415, 51.6025]},  
    {"name": "Harlequins", "venue": "Twickenham Stoop", "city": "London", "coordinates": [-0.3218, 51.4460]},  
    {"name": "Leicester Tigers", "venue": "Mattioli Woods Welford Road", "city": "Leicester", "coordinates": [-1.1199, 52.6262]},  
    {"name": "Bath Rugby", "venue": "The Recreation Ground", "city": "Bath", "coordinates": [-2.3571, 51.3812]},  
    {"name": "Northampton Saints", "venue": "Franklin's Gardens", "city": "Northampton", "coordinates": [-0.9136, 52.2389]},  
    {"name": "Sale Sharks", "venue": "AJ Bell Stadium", "city": "Salford", "coordinates": [-2.3344, 53.4876]},  
    {"name": "Exeter Chiefs", "venue": "Sandy Park", "city": "Exeter", "coordinates": [-3.4740, 50.7094]},  
    {"name": "Bristol Bears", "venue": "Ashton Gate", "city": "Bristol", "coordinates": [-2.6201, 51.4400]},  
    {"name": "Gloucester Rugby", "venue": "Kingsholm Stadium", "city": "Gloucester", "coordinates": [-2.2407, 51.8699]},  
    {"name": "London Irish", "venue": "Gtech Community Stadium", "city": "London", "coordinates": [-0.2886, 51.4907]},  
    {"name": "Wasps", "venue": "Coventry Building Society Arena", "city": "Coventry", "coordinates": [-1.4953, 52.4485]},  
    {"name": "Newcastle Falcons", "venue": "Kingston Park", "city": "Newcastle", "coordinates": [-1.6714, 55.0011]},  
]  
  
# ============================================================  
# COMPETITION NAMES  
# ============================================================  
  
football_competitions = [  
    "Premier League",  
    "FA Cup - Third Round",  
    "FA Cup - Fourth Round",  
    "EFL Cup - Quarter Final",  
    "Premier League",  
    "Premier League",  
]  
  
rugby_competitions = [  
    "Gallagher Premiership",  
    "Gallagher Premiership",  
    "European Champions Cup - Pool Stage",  
    "European Challenge Cup - Pool Stage",  
    "Gallagher Premiership",  
]  
  
# ============================================================  
# BETTING MARKET GENERATOR  
# ============================================================  
  
def generate_match_odds(home_team, away_team):  
    """Generate realistic betting odds for a fixture."""  
    # Simulate some home advantage randomness  
    home_strength = random.uniform(0.8, 2.5)  
    away_strength = random.uniform(0.8, 2.5)  
    draw_factor = random.uniform(2.8, 4.5)  
  
    # Convert to decimal odds (European format)  
    home_odds = round(random.uniform(1.20, 6.00), 2)  
    draw_odds = round(random.uniform(2.50, 5.50), 2)  
    away_odds = round(random.uniform(1.20, 6.00), 2)  
  
    # Make sure odds are somewhat realistic (favourite has lower odds)  
    if random.random() > 0.5:  
        home_odds = round(random.uniform(1.20, 2.50), 2)  
        away_odds = round(random.uniform(2.50, 6.00), 2)  
    else:  
        home_odds = round(random.uniform(2.50, 6.00), 2)  
        away_odds = round(random.uniform(1.20, 2.50), 2)  
  
    markets = [  
        {  
            "market_name": "Match Result",  
            "selections": [  
                {"name": home_team, "odds": home_odds, "label": "Home"},  
                {"name": "Draw", "odds": draw_odds, "label": "Draw"},  
                {"name": away_team, "odds": away_odds, "label": "Away"},  
            ]  
        },  
        {  
            "market_name": "Over/Under 2.5 Goals" if "Rugby" not in home_team else "Over/Under 40.5 Points",  
            "selections": [  
                {"name": "Over", "odds": round(random.uniform(1.40, 2.60), 2)},  
                {"name": "Under", "odds": round(random.uniform(1.40, 2.60), 2)},  
            ]  
        },  
        {  
            "market_name": "Both Teams to Score",  
            "selections": [  
                {"name": "Yes", "odds": round(random.uniform(1.40, 2.20), 2)},  
                {"name": "No", "odds": round(random.uniform(1.50, 2.40), 2)},  
            ]  
        },  
    ]  
  
    return markets  
  
  
def generate_rugby_markets(home_team, away_team):  
    """Generate rugby-specific betting markets."""  
    home_odds = round(random.uniform(1.20, 4.50), 2)  
    draw_odds = round(random.uniform(15.00, 30.00), 2)  # Draws rare in rugby  
    away_odds = round(random.uniform(1.20, 4.50), 2)  
  
    if random.random() > 0.5:  
        home_odds = round(random.uniform(1.20, 2.20), 2)  
        away_odds = round(random.uniform(2.00, 4.50), 2)  
    else:  
        home_odds = round(random.uniform(2.00, 4.50), 2)  
        away_odds = round(random.uniform(1.20, 2.20), 2)  
  
    handicap = random.choice([-14.5, -10.5, -7.5, -3.5, 3.5, 7.5, 10.5, 14.5])  
  
    markets = [  
        {  
            "market_name": "Match Result",  
            "selections": [  
                {"name": home_team, "odds": home_odds, "label": "Home"},  
                {"name": "Draw", "odds": draw_odds, "label": "Draw"},  
                {"name": away_team, "odds": away_odds, "label": "Away"},  
            ]  
        },  
        {  
            "market_name": "Handicap",  
            "selections": [  
                {"name": f"{home_team} ({'+' if handicap > 0 else ''}{handicap})", "odds": round(random.uniform(1.70, 2.10), 2)},  
                {"name": f"{away_team} ({'+' if -handicap > 0 else ''}{-handicap})", "odds": round(random.uniform(1.70, 2.10), 2)},  
            ]  
        },  
        {  
            "market_name": "Over/Under 45.5 Points",  
            "selections": [  
                {"name": "Over", "odds": round(random.uniform(1.50, 2.30), 2)},  
                {"name": "Under", "odds": round(random.uniform(1.50, 2.30), 2)},  
            ]  
        },  
        {  
            "market_name": "First Try Scorer",  
            "selections": [  
                {"name": random.choice(["Marcus Smith", "Freddie Steward", "Louis Lynagh", "Max Malins", "Ollie Thorley"]), "odds": round(random.uniform(5.00, 15.00), 2)},  
                {"name": random.choice(["Ben Earl", "Jack Willis", "Sam Simmonds", "Alex Dombrandt", "Tom Curry"]), "odds": round(random.uniform(6.00, 18.00), 2)},  
                {"name": random.choice(["Elliot Daly", "Joe Marchant", "Henry Slade", "Manu Tuilagi", "Ollie Lawrence"]), "odds": round(random.uniform(7.00, 20.00), 2)},  
            ]  
        },  
    ]  
  
    return markets  
  
  
# ============================================================  
# GENERATE FIXTURES  
# ============================================================  
  
events = []  
base_date = datetime(2025, 1, 18, 12, 0, 0)  # Starting date  
  
statuses = ["upcoming", "upcoming", "upcoming", "live", "completed"]  
  
print("🏈 Generating Football fixtures...")  
  
# Generate Football fixtures  
used_football_pairs = set()  
for i in range(30):  
    while True:  
        home = random.choice(football_teams)  
        away = random.choice(football_teams)  
        if home["name"] != away["name"] and (home["name"], away["name"]) not in used_football_pairs:  
            used_football_pairs.add((home["name"], away["name"]))  
            break  
  
    match_date = base_date + timedelta(  
        days=random.randint(0, 60),  
        hours=random.choice([0, 3, 5.25, 7.5]),  # 12:00, 15:00, 17:15, 19:30  
    )  
  
    status = random.choice(statuses)  
  
    score = None  
    minute = None  
    if status == "completed":  
        score = {  
            "home": random.randint(0, 5),  
            "away": random.randint(0, 4),  
        }  
    elif status == "live":  
        score = {  
            "home": random.randint(0, 3),  
            "away": random.randint(0, 2),  
        }  
        minute = random.randint(1, 90)  
  
    event = {  
        "sport": "Football",  
        "competition": random.choice(football_competitions),  
        "home_team": home["name"],  
        "away_team": away["name"],  
        "venue": {  
            "name": home["venue"],  
            "city": home["city"],  
            "location": {  
                "type": "Point",  
                "coordinates": home["coordinates"]  # [longitude, latitude]  
            }  
        },  
        "kick_off": match_date,  
        "status": status,  
        "score": score,  
        "current_minute": minute,  
        "markets": generate_match_odds(home["name"], away["name"]),  
        "is_featured": random.random() > 0.7,  
        "created_at": datetime.utcnow(),  
        "updated_at": datetime.utcnow(),  
    }  
  
    events.append(event)  
    print(f"  ⚽ {home['name']} vs {away['name']} at {home['venue']}")  
  
print(f"\n🏉 Generating Rugby fixtures...")  
  
# Generate Rugby fixtures  
used_rugby_pairs = set()  
for i in range(20):  
    while True:  
        home = random.choice(rugby_teams)  
        away = random.choice(rugby_teams)  
        if home["name"] != away["name"] and (home["name"], away["name"]) not in used_rugby_pairs:  
            used_rugby_pairs.add((home["name"], away["name"]))  
            break  
  
    match_date = base_date + timedelta(  
        days=random.randint(0, 60),  
        hours=random.choice([0, 3, 5.25]),  # 12:00, 15:00, 17:15  
    )  
  
    status = random.choice(statuses)  
  
    score = None  
    minute = None  
    if status == "completed":  
        score = {  
            "home": random.choice([7, 10, 14, 17, 19, 21, 24, 27, 28, 31, 33, 35, 38, 42, 45]),  
            "away": random.choice([5, 7, 10, 12, 14, 17, 19, 21, 24, 26, 28, 31, 33]),  
        }  
    elif status == "live":  
        score = {  
            "home": random.choice([0, 3, 5, 7, 10, 12, 14, 17, 19, 21]),  
            "away": random.choice([0, 3, 5, 7, 10, 12, 14, 17]),  
        }  
        minute = random.randint(1, 80)  
  
    event = {  
        "sport": "Rugby",  
        "competition": random.choice(rugby_competitions),  
        "home_team": home["name"],  
        "away_team": away["name"],  
        "venue": {  
            "name": home["venue"],  
            "city": home["city"],  
            "location": {  
                "type": "Point",  
                "coordinates": home["coordinates"]  # [longitude, latitude]  
            }  
        },  
        "kick_off": match_date,  
        "status": status,  
        "score": score,  
        "current_minute": minute,  
        "markets": generate_rugby_markets(home["name"], away["name"]),  
        "is_featured": random.random() > 0.7,  
        "created_at": datetime.utcnow(),  
        "updated_at": datetime.utcnow(),  
    }  
  
    events.append(event)  
    print(f"  🏉 {home['name']} vs {away['name']} at {home['venue']}")  
  
# ============================================================  
# INSERT INTO MONGODB  
# ============================================================  
  
print(f"\n📦 Inserting {len(events)} events into MongoDB...")  
result = db.events.insert_many(events)  
print(f"✅ Inserted {len(result.inserted_ids)} events")  
  
# ============================================================  
# CREATE INDEXES  
# ============================================================  
  
print("\n📐 Creating indexes...")  
  
# 2dsphere geo index on venue location  
db.events.create_index([("venue.location", pymongo.GEOSPHERE)])  
print("  ✅ Created 2dsphere index on venue.location")  
  
# Compound index for common queries  
db.events.create_index([("sport", 1), ("status", 1), ("kick_off", 1)])  
print("  ✅ Created compound index on sport + status + kick_off")  
  
# Index on competition  
db.events.create_index([("competition", 1)])  
print("  ✅ Created index on competition")  
  
# Index on featured events  
db.events.create_index([("is_featured", 1), ("kick_off", 1)])  
print("  ✅ Created index on is_featured + kick_off")  
  
# Text index for search  
db.events.create_index([("home_team", "text"), ("away_team", "text"), ("competition", "text")])  
print("  ✅ Created text index on team names and competition")  
  
# ============================================================  
# VERIFY GEO INDEX WITH A SAMPLE QUERY  
# ============================================================  
  
print("\n🔍 Testing geo query - events near London (51.5074, -0.1278), within 50km:")  
london_events = db.events.find({  
    "venue.location": {  
        "$near": {  
            "$geometry": {  
                "type": "Point",  
                "coordinates": [-0.1278, 51.5074]  
            },  
            "$maxDistance": 50000  # 50km in meters  
        }  
    }  
})  
  
for event in london_events:  
    print(f"  📍 {event['home_team']} vs {event['away_team']} at {event['venue']['name']} ({event['venue']['city']})")  
  
# ============================================================  
# SUMMARY  
# ============================================================  
  
print("\n" + "=" * 60)  
print("📊 SUMMARY")  
print("=" * 60)  
print(f"  Database:    sports_betting_demo")  
print(f"  Collection:  events")  
print(f"  Total docs:  {db.events.count_documents({})}")  
print(f"  Football:    {db.events.count_documents({'sport': 'Football'})}")  
print(f"  Rugby:       {db.events.count_documents({'sport': 'Rugby'})}")  
print(f"  Upcoming:    {db.events.count_documents({'status': 'upcoming'})}")  
print(f"  Live:        {db.events.count_documents({'status': 'live'})}")  
print(f"  Completed:   {db.events.count_documents({'status': 'completed'})}")  
print(f"  Featured:    {db.events.count_documents({'is_featured': True})}")  
print(f"  Indexes:     {list(db.events.index_information().keys())}")  
print("=" * 60)  
  
client.close()  
print("\n✅ Done! Data generation complete.")  