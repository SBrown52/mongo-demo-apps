"""  
Online Gaming/Gambling Product Catalogue Data Generator  
=======================================================  
Generates realistic game product data for:  
- Slots  
- Live Casino  
- Table Games (RNG)  
- Instant Win / Scratch Cards  
- Virtual Sports  
  
Inspired by 888, Betfred, William Hill, Paddy Power, etc.  
"""  
  
import random  
import uuid  
from datetime import datetime, timedelta  
from pymongo import MongoClient, ASCENDING, TEXT  
from faker import Faker  
  
fake = Faker("en_GB")  
  
# ──────────────────────────────────────────────  
# MongoDB Connection  
# ──────────────────────────────────────────────  
MONGO_URI = ""   # <-- update as needed  
DB_NAME = "gaming_catalogue"  
  
client = MongoClient(MONGO_URI)  
db = client[DB_NAME]  
collection = db["games"]  
  
# ──────────────────────────────────────────────  
# Reference / Lookup Data  
# ──────────────────────────────────────────────  
  
PROVIDERS = [  
    "Microgaming", "NetEnt", "Playtech", "Evolution Gaming",  
    "Pragmatic Play", "Play'n GO", "Red Tiger Gaming",  
    "Big Time Gaming", "Yggdrasil", "Blueprint Gaming",  
    "Nolimit City", "Hacksaw Gaming", "Push Gaming",  
    "Relax Gaming", "iSoftBet", "Thunderkick", "ELK Studios",  
    "Quickspin", "Light & Wonder", "IGT",  
]  
  
JURISDICTIONS = ["UKGC", "MGA", "GIB", "DGA", "SGA", "KSA", "AGCO"]  
  
CURRENCIES_LIMITS = {  
    "GBP": {"symbol": "£"},  
    "EUR": {"symbol": "€"},  
    "USD": {"symbol": "$"},  
}  
  
DEVICES = ["desktop", "mobile", "tablet"]  
  
LANGUAGES = ["en", "de", "fr", "es", "it", "sv", "no", "fi", "pt", "da", "nl", "pl", "ro", "tr"]  
  
CERTIFIERS = ["eCOGRA", "GLI", "iTech Labs", "BMM Testlabs", "NMi"]  
  
VOLATILITY_LEVELS = ["Low", "Low-Medium", "Medium", "Medium-High", "High", "Very High"]  
  
# ── Slot-specific ──  
  
SLOT_THEMES = [  
    "Ancient Egypt", "Irish Luck", "Greek Mythology", "Norse Mythology",  
    "Fruit Classic", "Adventure", "Wildlife", "Ocean", "Asian Fortune",  
    "Vikings", "Pirates", "Aztec Gold", "Gems & Jewels", "Horror",  
    "Fantasy", "Wild West", "Retro Arcade", "Fishing", "Music",  
    "Movie & TV", "Christmas", "Halloween", "Fairy Tale", "Steampunk",  
    "Candy & Sweets", "Space", "Roman Empire", "Leprechaun", "Dia de los Muertos",  
]  
  
SLOT_FEATURES = [  
    "Free Spins", "Multipliers", "Wild Symbols", "Expanding Wilds",  
    "Sticky Wilds", "Scatter Symbols", "Bonus Game", "Gamble Feature",  
    "Cascading Reels", "Megaways™", "Cluster Pays", "Hold & Spin",  
    "Progressive Jackpot", "Pick & Click", "Re-Spins", "Split Symbols",  
    "Mystery Symbols", "Walking Wilds", "Colossal Symbols",  
    "Infinity Reels", "xWays™", "xNudge™", "Bonus Buy",  
    "Tumble Feature", "Random Wilds", "Stacked Symbols",  
]  
  
SLOT_SUBCATEGORIES = [  
    "video_slots", "classic_slots", "megaways", "jackpot_slots",  
    "bonus_buy", "cluster_pays",  
]  
  
SLOT_NAME_PARTS = {  
    "prefix": [  
        "Book of", "Gates of", "Rise of", "Legacy of", "Treasures of",  
        "Curse of", "Temple of", "Realm of", "Legends of", "Gonzo's",  
        "Eye of", "Dawn of", "Fury of", "Heart of", "Wings of",  
    ],  
    "middle": [  
        "Golden", "Wild", "Mega", "Crystal", "Shadow", "Royal",  
        "Thunder", "Fire", "Mystic", "Diamond", "Dragon", "Phoenix",  
        "Wolf", "Tiger", "Lion", "Aztec", "Viking", "Pharaoh",  
        "Samurai", "Pirate", "Mermaid", "Leprechaun",  
    ],  
    "suffix": [  
        "Fortune", "Riches", "Gold", "Spins", "Fire", "Quest",  
        "Bonanza", "Deluxe", "Megaways", "Blitz", "Jackpot",  
        "Gems", "Cash", "Wilds", "Wins", "Rush", "Frenzy",  
    ],  
}  
  
# ── Live Casino ──  
  
LIVE_GAME_TYPES = {  
    "Blackjack": [  
        "Classic Blackjack", "Speed Blackjack", "Infinite Blackjack",  
        "Power Blackjack", "Lightning Blackjack", "Free Bet Blackjack",  
        "VIP Blackjack", "Salon Privé Blackjack", "All Bets Blackjack",  
    ],  
    "Roulette": [  
        "European Roulette", "Lightning Roulette", "Immersive Roulette",  
        "Speed Roulette", "Auto Roulette", "Double Ball Roulette",  
        "XXXtreme Lightning Roulette", "VIP Roulette", "French Roulette",  
        "Gold Bar Roulette",  
    ],  
    "Baccarat": [  
        "Speed Baccarat", "Lightning Baccarat", "No Commission Baccarat",  
        "Dragon Tiger", "Peek Baccarat",  
    ],  
    "Game Shows": [  
        "Crazy Time", "Dream Catcher", "Monopoly Live",  
        "Deal or No Deal Live", "Lightning Dice", "Mega Ball",  
        "Cash or Crash", "Funky Time", "Sweet Bonanza CandyLand",  
        "Adventures Beyond Wonderland",  
    ],  
    "Poker": [  
        "Casino Hold'em", "Three Card Poker", "Ultimate Texas Hold'em",  
        "Caribbean Stud Poker", "Side Bet City", "Texas Hold'em Bonus",  
    ],  
}  
  
LIVE_PROVIDERS = ["Evolution Gaming", "Playtech", "Pragmatic Play"]  
  
DEALER_LANGUAGES = ["English", "German", "Spanish", "Italian", "Turkish", "Arabic", "Swedish", "Romanian"]  
  
# ── Table Games (RNG) ──  
  
TABLE_GAME_VARIANTS = {  
    "Blackjack": ["Classic", "European", "Atlantic City", "Vegas Strip", "Multi-Hand", "Spanish 21", "Pontoon", "Double Exposure", "Single Deck"],  
    "Roulette": ["European", "French", "American", "Multi-Wheel", "3D", "Mini", "Zoom"],  
    "Baccarat": ["Punto Banco", "Mini Baccarat", "No Commission"],  
    "Poker": ["Casino Hold'em", "Caribbean Stud", "Three Card", "Pai Gow", "Oasis Poker", "Red Dog"],  
    "Craps": ["Classic Craps", "Simplified Craps"],  
    "Sic Bo": ["Classic Sic Bo", "Super Sic Bo"],  
}  
  
# ── Instant Win ──  
  
INSTANT_WIN_THEMES = [  
    "Lucky 7s", "Cash Vault", "Treasure Chest", "Golden Coins",  
    "Diamond Mine", "Emerald Fortune", "Mega Money", "Scratch & Win",  
    "Bingo Blitz", "Keno Classic", "Slingo", "Hi-Lo Gambler",  
    "Plinko Gold", "Wheel of Cash", "Lucky Stars",  
]  
  
INSTANT_WIN_TYPES = ["scratch_card", "number_game", "keno", "bingo", "slingo", "crash_game", "hi_lo", "wheel"]  
  
# ── Virtual Sports ──  
  
VIRTUAL_SPORTS = [  
    {"sport": "Football", "event_types": ["League Match", "Cup Final", "World Cup", "Penalty Shootout"]},  
    {"sport": "Horse Racing", "event_types": ["Flat Race", "National Hunt", "Sprint", "Gold Cup"]},  
    {"sport": "Greyhounds", "event_types": ["Sprint", "Standard", "Marathon"]},  
    {"sport": "Tennis", "event_types": ["Singles Match", "Tournament Final"]},  
    {"sport": "Motor Racing", "event_types": ["Grand Prix", "Sprint Race"]},  
    {"sport": "Cycling", "event_types": ["Road Race", "Sprint", "Time Trial"]},  
    {"sport": "Speedway", "event_types": ["Heat", "Final"]},  
]  
  
  
# ──────────────────────────────────────────────  
# Helpers  
# ──────────────────────────────────────────────  
  
def _slug(name: str) -> str:  
    return (  
        name.lower()  
        .replace("'", "")  
        .replace("™", "")  
        .replace("&", "and")  
        .replace("  ", " ")  
        .strip()  
        .replace(" ", "-")  
    )  
  
  
def _rtp(low=92.0, high=98.5):  
    return round(random.uniform(low, high), 2)  
  
  
def _random_date(start_year=2016, end_year=2024):  
    start = datetime(start_year, 1, 1)  
    end = datetime(end_year, 12, 31)  
    return start + timedelta(days=random.randint(0, (end - start).days))  
  
  
def _cdn_url(category, slug, asset):  
    return f"https://cdn.example.com/games/{category}/{slug}/{asset}"  
  
  
def _media(category, slug, include_video=True):  
    m = {  
        "thumbnail": _cdn_url(category, slug, "thumb.webp"),  
        "banner": _cdn_url(category, slug, "banner.webp"),  
        "logo": _cdn_url(category, slug, "logo.svg"),  
        "background": _cdn_url(category, slug, "bg.webp"),  
    }  
    if include_video:  
        m["preview_video"] = _cdn_url(category, slug, "preview.mp4")  
    return m  
  
  
def _stake_limits():  
    limits = []  
    for code, info in CURRENCIES_LIMITS.items():  
        min_s = random.choice([0.01, 0.05, 0.10, 0.20, 0.50, 1.00])  
        max_s = random.choice([100, 200, 500, 1000, 2000, 5000])  
        limits.append({  
            "currency": code,  
            "min_stake": min_s,  
            "max_stake": max_s,  
        })  
    return limits  
  
  
def _tags(category, extras=None):  
    pool = ["new", "popular", "featured", "hot", "top-rated", "exclusive", "editor-pick", "trending"]  
    tags = [category] + random.sample(pool, k=random.randint(0, 3))  
    if extras:  
        tags.extend(extras)  
    return list(set(tags))  
  
  
def _base_fields(product_id_prefix, category, name, slug, provider, release_date):  
    """Fields common to every game document."""  
    return {  
        "product_id": f"{product_id_prefix}-{uuid.uuid4().hex[:12].upper()}",  
        "category": category,  
        "name": name,  
        "slug": slug,  
        "provider": provider,  
        "description": fake.paragraph(nb_sentences=4),  
        "short_description": fake.sentence(nb_words=12),  
        "release_date": release_date,  
        "is_new": release_date > datetime.now() - timedelta(days=90),  
        "is_featured": random.random() < 0.12,  
        "is_exclusive": random.random() < 0.05,  
        "popularity_score": random.randint(1, 100),  
        "player_rating": {  
            "average": round(random.uniform(3.0, 5.0), 1),  
            "count": random.randint(10, 45000),  
        },  
        "jurisdictions": random.sample(JURISDICTIONS, k=random.randint(1, 5)),  
        "device_compatibility": sorted(random.sample(DEVICES, k=random.randint(2, 3))),  
        "supported_languages": sorted(random.sample(LANGUAGES, k=random.randint(3, 8))),  
        "certification": {  
            "tested_by": random.choice(CERTIFIERS),  
            "certificate_id": fake.bothify(text="CERT-####-??##").upper(),  
            "last_audit": _random_date(2023, 2024),  
        },  
        "responsible_gambling": {  
            "reality_check_minutes": random.choice([15, 30, 60]),  
            "session_reminder": True,  
            "stake_limit_configurable": True,  
            "self_exclude_link": "/responsible-gambling/self-exclusion",  
        },  
        "status": random.choices(  
            ["active", "inactive", "maintenance", "coming_soon"],  
            weights=[85, 5, 3, 7],  
        )[0],  
        "created_at": release_date,  
        "updated_at": datetime.now(),  
    }  
  
  
# ──────────────────────────────────────────────  
# Game Generators  
# ──────────────────────────────────────────────  
  
def generate_slot():  
    """Generate a single online slot game."""  
    # Build a creative name  
    style = random.choice(["prefix_middle", "middle_suffix", "prefix_middle_suffix", "standalone"])  
    if style == "prefix_middle":  
        name = f"{random.choice(SLOT_NAME_PARTS['prefix'])} {random.choice(SLOT_NAME_PARTS['middle'])}"  
    elif style == "middle_suffix":  
        name = f"{random.choice(SLOT_NAME_PARTS['middle'])} {random.choice(SLOT_NAME_PARTS['suffix'])}"  
    elif style == "prefix_middle_suffix":  
        name = f"{random.choice(SLOT_NAME_PARTS['prefix'])} {random.choice(SLOT_NAME_PARTS['middle'])} {random.choice(SLOT_NAME_PARTS['suffix'])}"  
    else:  
        name = f"{random.choice(SLOT_NAME_PARTS['middle'])} {random.choice(SLOT_NAME_PARTS['suffix'])} {random.randint(2, 5)}"  
  
    slug = _slug(name)  
    provider = random.choice(PROVIDERS)  
    release = _random_date()  
    theme = random.choice(SLOT_THEMES)  
    volatility = random.choice(VOLATILITY_LEVELS)  
    features = sorted(random.sample(SLOT_FEATURES, k=random.randint(3, 8)))  
  
    # Grid layout  
    reels = random.choice([3, 5, 5, 5, 6, 6])  
    rows = random.choice([3, 3, 4, 4, 5])  
    payline_type = random.choice(["fixed", "ways", "megaways", "cluster"])  
  
    if payline_type == "fixed":  
        paylines = random.choice([1, 5, 9, 10, 15, 20, 25, 30, 40, 50, 100])  
    elif payline_type == "ways":  
        paylines = random.choice([243, 576, 1024, 3125])  
    elif payline_type == "megaways":  
        paylines = random.choice([117649, 200704, 262144])  
    else:  
        paylines = None  
  
    rtp = _rtp()  
    max_win = random.choice([500, 1000, 2000, 5000, 5000, 10000, 10000, 15000, 20000, 25000, 50000])  
  
    # Jackpot (≈20 % of slots)  
    jackpot = None  
    if random.random() < 0.20:  
        tier_names = ["Mini", "Minor", "Major", "Grand"]  
        num_tiers = random.randint(2, 4)  
        jackpot = {  
            "type": random.choice(["fixed", "progressive", "daily_drop", "network_progressive"]),  
            "tiers": [  
                {  
                    "name": tier_names[i],  
                    "seed_value": round(random.uniform(10, 5000), 2),  
                    "currency": "GBP",  
                }  
                for i in range(num_tiers)  
            ],  
        }  
  
    has_bonus_buy = "Bonus Buy" in features or random.random() < 0.25  
  
    game = _base_fields("SLOT", "slots", name, slug, provider, release)  
    game.update({  
        "subcategory": random.choice(SLOT_SUBCATEGORIES),  
        "theme": theme,  
        "secondary_themes": random.sample(  
            [t for t in SLOT_THEMES if t != theme], k=random.randint(0, 2)  
        ),  
        "grid": {  
            "reels": reels,  
            "rows": rows,  
            "payline_type": payline_type,  
            "paylines": paylines,  
        },  
        "rtp": {  
            "default": rtp,  
            "range": {  
                "min": round(rtp - random.uniform(0, 2.5), 2),  
                "max": rtp,  
            },  
        },  
        "volatility": volatility,  
        "hit_frequency_pct": round(random.uniform(15.0, 45.0), 2),  
        "max_win_multiplier": f"{max_win}x",  
        "features": features,  
        "bonus_buy": {  
            "available": has_bonus_buy,  
            "cost_multiplier": random.choice([50, 75, 100, 150, 200]) if has_bonus_buy else None,  
        },  
        "jackpot": jackpot,  
        "auto_play": True,  
        "turbo_spin": random.random() < 0.75,  
        "stake_limits": _stake_limits(),  
        "media": _media("slots", slug),  
        "tags": _tags("slots", [_slug(theme), volatility.lower(), _slug(provider)]),  
        "launch_url": f"/play/slots/{slug}",  
        "demo_url": f"/demo/slots/{slug}",  
    })  
    return game  
  
  
def generate_live_casino_game():  
    """Generate a single live casino game."""  
    game_type = random.choice(list(LIVE_GAME_TYPES.keys()))  
    variant = random.choice(LIVE_GAME_TYPES[game_type])  
    provider = random.choice(LIVE_PROVIDERS)  
    slug = _slug(variant)  
    release = _random_date(2018, 2024)  
  
    min_bet_options = {  
        False: [0.50, 1.00, 2.00, 5.00],       # standard tables  
        True:  [25.00, 50.00, 100.00, 250.00],  # VIP tables  
    }  
    max_bet_options = {  
        False: [500, 1000, 2500, 5000],  
        True:  [10000, 25000, 50000, 100000],  
    }  
    is_vip = random.random() < 0.12  
      
    table = {  
        "table_id": f"TBL-{uuid.uuid4().hex[:8].upper()}",  
        "table_name": f"{variant} {'VIP ' if is_vip else ''}#{random.randint(1, 50)}",  
        "dealer_language": random.choice(DEALER_LANGUAGES),  
        "seats": random.choice([5, 7]) if game_type in ["Blackjack", "Poker"] else None,  
        "operating_hours": random.choice([  
            {"schedule": "24/7"},  
            {"schedule": "scheduled", "open": "08:00", "close": "04:00", "timezone": "Europe/London"},  
        ]),  
    }  
  
    game = _base_fields("LIVE", "live_casino", variant, slug, provider, release)  
    game.update({  
        "subcategory": _slug(game_type),  
        "game_type": game_type,  
        "table": table,  
        "is_vip": is_vip,  
        "rtp": _rtp(90.0 if game_type == "Game Shows" else 94.0, 99.5 if game_type == "Blackjack" else 97.5),  
        "house_edge_pct": round(random.uniform(0.5, 8.0), 2),  
        "stake_limits": [  
            {  
                "currency": "GBP",  
                "min_stake": random.choice(min_bet_options[is_vip]),  
                "max_stake": random.choice(max_bet_options[is_vip]),  
            }  
        ],  
        "side_bets": _live_side_bets(game_type),  
        "features": _live_features(game_type, variant),  
        "stream": {  
            "quality_options": ["SD", "HD", "Full HD"],  
            "multi_camera": random.random() < 0.5,  
            "chat_enabled": True,  
        },  
        "media": _media("live_casino", slug, include_video=False),  
        "tags": _tags("live_casino", [_slug(game_type), _slug(provider)]),  
        "launch_url": f"/play/live/{slug}",  
    })  
    return game  
  
  
def _live_side_bets(game_type):  
    mapping = {  
        "Blackjack": ["Perfect Pairs", "21+3", "Insurance", "Bet Behind", "Hot 3", "Any Pair"],  
        "Roulette": ["Neighbours", "Finals", "Red/Black Splits"],  
        "Baccarat": ["Player Pair", "Banker Pair", "Either Pair", "Big/Small"],  
        "Poker": ["AA Bonus", "Trips Bonus"],  
        "Game Shows": [],  
    }  
    options = mapping.get(game_type, [])  
    return random.sample(options, k=min(random.randint(0, 3), len(options)))  
  
  
def _live_features(game_type, variant):  
    base = ["Live Chat", "Game History", "Statistics Panel"]  
    extras = {  
        "Blackjack": ["Bet Behind", "Pre-Decision", "Side Bets"],  
        "Roulette": ["Racetrack View", "Favourite Bets", "Auto-Play"],  
        "Baccarat": ["Squeeze", "Roadmap", "Trends"],  
        "Game Shows": ["Bonus Rounds", "Multipliers", "Interactive Elements"],  
        "Poker": ["Optimal Strategy Hint"],  
    }  
    features = base + random.sample(extras.get(game_type, []), k=random.randint(0, 2))  
    if "Lightning" in variant:  
        features.append("Lightning Multipliers")  
    return features  
  
  
def generate_table_game():  
    """Generate a single RNG table game (non-live)."""  
    game_type = random.choice(list(TABLE_GAME_VARIANTS.keys()))  
    variant = random.choice(TABLE_GAME_VARIANTS[game_type])  
    provider = random.choice(PROVIDERS)  
    name = f"{variant} {game_type}"  
    slug = _slug(name)  
    release = _random_date()  
  
    game = _base_fields("TBL", "table_games", name, slug, provider, release)  
    game.update({  
        "subcategory": _slug(game_type),  
        "game_type": game_type,  
        "variant": variant,  
        "rtp": _rtp(94.0, 99.6),  
        "house_edge_pct": round(random.uniform(0.4, 5.5), 2),  
        "number_of_decks": (  
            random.choice([1, 2, 4, 6, 8])  
            if game_type in ["Blackjack", "Baccarat", "Poker"]  
            else None  
        ),  
        "auto_play": game_type not in ["Poker", "Craps"],  
        "has_demo": True,  
        "stake_limits": _stake_limits(),  
        "rules_url": f"/help/rules/{slug}",  
        "media": _media("table_games", slug),  
        "tags": _tags("table_games", [_slug(game_type), _slug(provider)]),  
        "launch_url": f"/play/table/{slug}",  
        "demo_url": f"/demo/table/{slug}",  
    })  
    return game  
  
  
def generate_instant_win_game():  
    """Generate an instant-win / scratch card / number game."""  
    game_type = random.choice(INSTANT_WIN_TYPES)  
    theme = random.choice(INSTANT_WIN_THEMES)  
    provider = random.choice(PROVIDERS)  
    name = f"{theme} {'Scratch' if game_type == 'scratch_card' else game_type.replace('_', ' ').title()}"  
    slug = _slug(name)  
    release = _random_date()  
  
    # Prize tiers  
    num_tiers = random.randint(3, 7)  
    prize_tiers = []  
    for i in range(num_tiers):  
        multiplier = random.choice([1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 5000, 10000])  
        prize_tiers.append({  
            "tier": i + 1,  
            "match_condition": f"Match {random.randint(2, 5)} symbols" if game_type == "scratch_card" else f"Tier {i + 1}",  
            "win_multiplier": f"{multiplier}x",  
            "probability_pct": round(random.uniform(0.001, 15.0), 3),  
        })  
  
    game = _base_fields("IW", "instant_win", name, slug, provider, release)  
    game.update({  
        "subcategory": game_type,  
        "theme": theme,  
        "rtp": _rtp(85.0, 96.0),  
        "max_prize_multiplier": f"{max(int(t['win_multiplier'].replace('x','')) for t in prize_tiers)}x",  
        "prize_tiers": prize_tiers,  
        "price_points": sorted(random.sample([0.50, 1.00, 2.00, 3.00, 5.00, 10.00, 20.00], k=random.randint(2, 5))),  
        "currency": "GBP",  
        "auto_reveal": game_type in ["crash_game", "hi_lo"],  
        "stake_limits": _stake_limits(),  
        "media": _media("instant_win", slug),  
        "tags": _tags("instant_win", [game_type, _slug(theme)]),  
        "launch_url": f"/play/instant/{slug}",  
    })  
    return game  
  
  
def generate_virtual_sport():  
    """Generate a virtual sports product."""  
    vs = random.choice(VIRTUAL_SPORTS)  
    sport = vs["sport"]  
    event_type = random.choice(vs["event_types"])  
    provider = random.choice(["Inspired Entertainment", "Kiron Interactive", "Pragmatic Play", "Playtech"])  
    name = f"Virtual {sport} - {event_type}"  
    slug = _slug(name)  
    release = _random_date(2019, 2024)  
  
    event_frequency = random.choice([  
        {"interval_seconds": 60, "label": "Every minute"},  
        {"interval_seconds": 90, "label": "Every 90 seconds"},  
        {"interval_seconds": 120, "label": "Every 2 minutes"},  
        {"interval_seconds": 180, "label": "Every 3 minutes"},  
        {"interval_seconds": 300, "label": "Every 5 minutes"},  
    ])  
  
    # Markets available for this virtual sport  
    market_pool = {  
        "Football": ["Match Result", "Over/Under 2.5 Goals", "Both Teams to Score", "Correct Score", "First Goalscorer", "Half Time Result"],  
        "Horse Racing": ["Win", "Each Way", "Forecast", "Tricast", "Place"],  
        "Greyhounds": ["Win", "Each Way", "Forecast", "Tricast"],  
        "Tennis": ["Match Winner", "Set Betting", "Total Games Over/Under"],  
        "Motor Racing": ["Race Winner", "Podium Finish", "Fastest Lap"],  
        "Cycling": ["Race Winner", "Top 3 Finish", "Sprint Winner"],  
        "Speedway": ["Heat Winner", "Match Result"],  
    }  
  
    game = _base_fields("VS", "virtual_sports", name, slug, provider, release)  
    game.update({  
        "subcategory": _slug(sport),  
        "sport": sport,  
        "event_type": event_type,  
        "event_frequency": event_frequency,  
        "available_markets": random.sample(  
            market_pool.get(sport, ["Winner"]),  
            k=min(random.randint(2, 5), len(market_pool.get(sport, ["Winner"]))),  
        ),  
        "rtp": _rtp(85.0, 95.0),  
        "participants_per_event": (  
            random.choice([8, 10, 12, 16]) if sport in ["Horse Racing", "Greyhounds", "Motor Racing", "Cycling"]  
            else 2  
        ),  
        "commentary": random.random() < 0.6,  
        "animation_quality": random.choice(["Standard", "HD", "Ultra HD"]),  
        "stake_limits": _stake_limits(),  
        "media": _media("virtual_sports", slug),  
        "tags": _tags("virtual_sports", [_slug(sport), _slug(provider)]),  
        "launch_url": f"/play/virtuals/{slug}",  
    })  
    return game  
  
  
# ──────────────────────────────────────────────  
# Main Generation & Insert Logic  
# ──────────────────────────────────────────────  
  
def create_indexes():  
    """Create useful indexes for the gaming catalogue."""  
    print("📇 Creating indexes …")  
    collection.create_index([("product_id", ASCENDING)], unique=True)  
    collection.create_index([("category", ASCENDING), ("subcategory", ASCENDING)])  
    collection.create_index([("provider", ASCENDING)])  
    collection.create_index([("status", ASCENDING)])  
    collection.create_index([("popularity_score", ASCENDING)])  
    collection.create_index([("tags", ASCENDING)])  
    collection.create_index([("jurisdictions", ASCENDING)])  
    collection.create_index([("slug", ASCENDING)], unique=True)  
    collection.create_index(  
        [("name", TEXT), ("description", TEXT), ("short_description", TEXT)],  
        name="text_search",  
    )  
    print("  ✅ Standard Indexes ready.")  
    # Atlas Search index  
    print("  🔍 Creating Atlas Search index …")  
    search_index_definition = {  
        "name": "games_search",  
        "definition": {  
            "mappings": {  
                "dynamic": False,  
                "fields": {  
                    "name": {  
                        "type": "string",  
                        "analyzer": "lucene.standard",  
                        "multi": {  
                            "autocomplete": {  
                                "type": "autocomplete",  
                                "tokenization": "edgeGram",  
                                "minGrams": 2,  
                                "maxGrams": 15,  
                                "foldDiacritics": True,  
                            }  
                        },  
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
        },  
    }  
  
    try:  
        collection.create_search_index(search_index_definition)  
        print("  ✅ Atlas Search index 'games_search' created.")  
        print("     ⏳ Note: The search index builds asynchronously — it may take")  
        print("        a minute or two before it becomes queryable.")  
    except Exception as e:  
        if "already exists" in str(e).lower() or "duplicate" in str(e).lower():  
            print("  ⚠️  Atlas Search index 'games_search' already exists — skipping.")  
        else:  
            print(f"  ❌ Could not create Atlas Search index: {e}")  
            print("     Make sure you are running against MongoDB Atlas (M10+ or free-tier M0).")  
            print("     Atlas Search indexes are not available on standalone/on-prem MongoDB.") 
  
  
def generate_catalogue(  
    num_slots=200,  
    num_live=50,  
    num_table=40,  
    num_instant=30,  
    num_virtual=25,  
):  
    """Generate and insert the full gaming catalogue."""  
  
    generators = [  
        ("Slots", generate_slot, num_slots),  
        ("Live Casino", generate_live_casino_game, num_live),  
        ("Table Games", generate_table_game, num_table),  
        ("Instant Win", generate_instant_win_game, num_instant),  
        ("Virtual Sports", generate_virtual_sport, num_virtual),  
    ]  
  
    total = sum(n for _, _, n in generators)  
    print(f"\n🎰 Generating {total} gaming products …\n")  
  
    all_games = []  
    for label, gen_fn, count in generators:  
        games = [gen_fn() for _ in range(count)]  
        all_games.extend(games)  
        print(f"  🎮 {label:15s}  → {count} products generated")  
  
    # Deduplicate slugs (in case of collisions)  
    seen_slugs = set()  
    unique_games = []  
    for g in all_games:  
        if g["slug"] not in seen_slugs:  
            seen_slugs.add(g["slug"])  
            unique_games.append(g)  
        else:  
            g["slug"] = g["slug"] + "-" + uuid.uuid4().hex[:6]  
            g["product_id"] = g["product_id"] + "-DUP"  
            unique_games.append(g)  
  
    print(f"\n📦 Inserting {len(unique_games)} documents into '{DB_NAME}.{collection.name}' …")  
    result = collection.insert_many(unique_games)  
    print(f"  ✅ Inserted {len(result.inserted_ids)} documents.\n")  
  
    return result  
  
  
def print_sample_stats():  
    """Print some quick stats about what was generated."""  
    pipeline = [  
        {"$group": {  
            "_id": "$category",  
            "count": {"$sum": 1},  
            "avg_popularity": {"$avg": "$popularity_score"},  
            "providers": {"$addToSet": "$provider"},  
        }},  
        {"$sort": {"count": -1}},  
    ]  
    results = list(collection.aggregate(pipeline))  
  
    print("─" * 60)  
    print(f"{'Category':<20} {'Count':>6} {'Avg Pop.':>10} {'Providers':>10}")  
    print("─" * 60)  
    for r in results:  
        print(  
            f"{r['_id']:<20} {r['count']:>6} "  
            f"{r['avg_popularity']:>10.1f} {len(r['providers']):>10}"  
        )  
    print("─" * 60)  
    print(f"{'TOTAL':<20} {collection.count_documents({}):>6}")  
    print()  
  
    # Show one sample slot  
    sample = collection.find_one({"category": "slots", "status": "active"})  
    if sample:  
        print("🎰 Sample Slot Document:")  
        print("-" * 40)  
        for key in ["product_id", "name", "provider", "subcategory", "volatility",  
                     "rtp", "max_win_multiplier", "grid", "features", "jackpot",  
                     "status", "jurisdictions", "tags"]:  
            if key in sample:  
                val = sample[key]  
                print(f"  {key:.<30} {val}")  
        print()  
  
  
# ──────────────────────────────────────────────  
# Entry Point  
# ──────────────────────────────────────────────  
  
if __name__ == "__main__":  
    # Drop existing data for a clean run (remove this in production!)  
    print(f"🗑️  Dropping existing '{collection.name}' collection …")  
    collection.drop()  
  
    create_indexes()  
  
    generate_catalogue(  
        num_slots=200,  
        num_live=5,  
        num_table=40,  
        num_instant=30,  
        num_virtual=25,  
    )  
  
    print_sample_stats()  
  
    print("✅ Done! Your gaming catalogue is ready in MongoDB.")  
    print(f"   Connection: {MONGO_URI}")  
    print(f"   Database:   {DB_NAME}")  
    print(f"   Collection: {collection.name}")  