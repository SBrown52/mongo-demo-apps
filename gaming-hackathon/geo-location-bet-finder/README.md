# 🏟️ SportsBetUK - GeoLocation Bet Finder
  
> ⚠️ **This is a DEMO application. No real betting or money is involved.**  
  
A vibe-coded sports betting demo app built during a hackathon, showcasing **MongoDB geospatial queries**, real-time fixture browsing, and a slick betting UI inspired by popular UK bookmakers.  
  
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)  
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)  
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)  
  
---  
  
## 🎯 What Is This?  
  
A quick-and-dirty sports betting UI that lets you browse **UK Football** and **Rugby** fixtures, view betting odds, and find events near your location — all powered by **MongoDB** with geospatial indexing.  
  
This was **vibe coded** during a hackathon. Speed over perfection. Ship it and demo it. 🚀  
  
---  
  
## ✨ Features  
  
- ⚽ **30 Football fixtures** — Premier League, FA Cup, EFL Cup with real UK team names  
- 🏉 **20 Rugby fixtures** — Gallagher Premiership, European Champions Cup  
- 📍 **Geospatial search** — Find fixtures near any UK city using MongoDB `2dsphere` indexes  
- 🔴 **Live / Upcoming / Completed** status filtering  
- 🎰 **Betting markets** — Match Result, Over/Under, BTTS, Handicap, First Try Scorer  
- 📍 **"Near You" collapsible section** — Shows closest fixtures based on your set location  
- ⚙️ **Location settings widget** — Set your location manually, pick a city, or use browser geolocation  
- 🔍 **Text search** — Search by team name or competition  
- 📱 **Responsive design** — Works on mobile and desktop  
- 🏟️ **Real UK venues** — Accurate geo coordinates for every stadium  
  
---  
  
## 🛠️ Tech Stack  
  
| Layer      | Tech                          |  
|------------|-------------------------------|  
| Database   | **MongoDB** (with 2dsphere geo index) |  
| Backend    | **Python / Flask**            |  
| Frontend   | **Vanilla HTML/CSS/JS**       |  
| Data Gen   | **Python script**             |  
  
---  
  
## 📁 Project Structure  
  
ports-betting-demo/
│
├── generate_data.py # Generates fixture data and inserts into MongoDB
├── app.py # Flask API server
├── requirements.txt # Python dependencies
│
└── templates/
└── index.html # Frontend (single-page app)

  
## 🚀 Quick Start  
  
### Prerequisites  
  
- **Python 3.8+**  
- **MongoDB** running locally or on Atlas
  
### Setup  
  
```bash
# Install dependencies  
pip install -r requirements.txt  
  
# Generate the data (seeds MongoDB)  
python generate_data.py  
  
# Start the app  
python app.py  
Then open http://localhost:5050 in your browser. That's it. 🎉

📦 MongoDB Details
Database: sports_betting_demo
Collection: events

Indexes Created
Index	Type	Purpose
venue.location	2dsphere	Geospatial queries (find nearby fixtures)
sport + status + kick_off	Compound	Filter by sport, status, and date
competition	Single field	Filter by competition
is_featured + kick_off	Compound	Featured events queries
home_team + away_team + competition	Text	Full-text search
Sample Document
{  
  "sport": "Football",  
  "competition": "Premier League",  
  "home_team": "Manchester United",  
  "away_team": "Liverpool",  
  "venue": {  
    "name": "Old Trafford",  
    "city": "Manchester",  
    "location": {  
      "type": "Point",  
      "coordinates": [-2.2913, 53.4631]  
    }  
  },  
  "kick_off": "2025-01-25T15:00:00",  
  "status": "upcoming",  
  "score": null,  
  "markets": [  
    {  
      "market_name": "Match Result",  
      "selections": [  
        { "name": "Manchester United", "odds": 2.10, "label": "Home" },  
        { "name": "Draw", "odds": 3.40, "label": "Draw" },  
        { "name": "Liverpool", "odds": 3.20, "label": "Away" }  
      ]  
    }  
  ],  
  "is_featured": true  
}  

🌍 Geospatial Queries
The app uses MongoDB's $near operator with the 2dsphere index to find fixtures near a given point:
```
db.events.find({  
    "venue.location": {  
        "$near": {  
            "$geometry": {  
                "type": "Point",  
                "coordinates": [-2.2426, 53.4808]  # Manchester  
            },  
            "$maxDistance": 50000  # 50km in meters  
        }  
    }  
}) 
```

Results are automatically sorted by distance (nearest first). The frontend calculates display distances using the Haversine formula.


📜 License
This is a hackathon demo. Do whatever you want with it. MIT License.

Built with MongoDB, Flask, and ☕ during a hackathon.