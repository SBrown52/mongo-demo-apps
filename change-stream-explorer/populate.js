/**
 * Retail Transaction Simulator
 * Run: node populate.js
 */

const { MongoClient, ObjectId } = require('mongodb');

// --- CONFIGURATION ---
const { MONGO_URI, DB_NAME, COLLECTION_NAME} = require('./env');

// Adjust speed here (lower = faster)
const MIN_DELAY_MS = 500;  // Minimum wait between actions
const MAX_DELAY_MS = 1500; // Maximum wait between actions

// --- DATA POOLS ---
const CUSTOMERS = ["Alice Smith", "Bob Jones", "Charlie Brown", "Diana Prince", "Evan Wright", "Fiona Gallagher"];
const PRODUCTS = [
    { name: "Gaming Mouse", price: 59.99 },
    { name: "Mechanical Keyboard", price: 129.50 },
    { name: "USB-C Cable", price: 12.99 },
    { name: "Monitor Stand", price: 45.00 },
    { name: "Webcam 4K", price: 89.99 },
    { name: "Headset", price: 75.00 }
];
const STATUSES = ["Processing", "Shipped", "Delivered"];

// --- HELPERS ---
const random = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function startSimulation() {
    const client = new MongoClient(MONGO_URI);

    try {
        await client.connect();
        console.log("🚀 Simulation started. Press Ctrl+C to stop.");
        
        const db = client.db(DB_NAME);
        const col = db.collection(COLLECTION_NAME);

        // Keep track of some IDs to simulate updates/deletes
        let recentIds = [];

        while (true) {
            const action = Math.random();
            
            // 80% Chance: NEW ORDER (Insert)
            if (action < 0.8 || recentIds.length === 0) {
                const product = random(PRODUCTS);
                const quantity = randomInt(1, 3);
                
                const doc = {
                    type: 'order',
                    customer: random(CUSTOMERS),
                    items: [
                        { product: product.name, qty: quantity, price: product.price }
                    ],
                    total: parseFloat((product.price * quantity).toFixed(2)),
                    status: 'New',
                    timestamp: new Date()
                };

                const result = await col.insertOne(doc);
                recentIds.push(result.insertedId);
                
                // Keep the local cache small
                if (recentIds.length > 50) recentIds.shift();
                
                console.log(`[INSERT] New order for ${doc.customer} ($${doc.total})`);
            
            // 10% Chance: UPDATE STATUS (Update)
            } else if (action < 0.9) {
                const idToUpdate = random(recentIds);
                const newStatus = random(STATUSES);
                
                await col.updateOne(
                    { _id: idToUpdate },
                    { $set: { status: newStatus, lastUpdated: new Date() } }
                );
                console.log(`[UPDATE] Order ${idToUpdate.toString().slice(-4)} moved to ${newStatus}`);

            // 10% Chance: CANCEL ORDER (Delete)
            } else {
                const idToDelete = recentIds.pop(); // Remove from our local cache
                await col.deleteOne({ _id: idToDelete });
                console.log(`[DELETE] Order ${idToDelete.toString().slice(-4)} cancelled`);
            }

            // Wait for a random duration to simulate natural traffic
            const delay = randomInt(MIN_DELAY_MS, MAX_DELAY_MS);
            await sleep(delay);
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.close();
    }
}

startSimulation();