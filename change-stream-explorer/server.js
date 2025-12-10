/**
 * Advanced MongoDB Change Stream Monitor
 * Features: Pipelines, Resume Tokens, Replay, Pause/Resume, Branding
 * Run: node monitor.js
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { MongoClient } = require('mongodb');

// --- CONFIGURATION ---
const { MONGO_URI, DB_NAME, COLLECTION_NAME, PORT } = require('./env');

// --- SERVER SETUP ---
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- FRONTEND HTML/JS ---
const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MongoDB Change Stream Explorer</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        
        .mongo-bg { background-color: #11161d; }
        .mongo-card { background-color: #1c2128; }
        .mongo-input { background-color: #0d1117; border-color: #30363d; color: #a3b3bc; }
        .mongo-input:focus { border-color: #00ED64; outline: none; }
        
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #11161d; }
        ::-webkit-scrollbar-thumb { background: #3d4f58; border-radius: 3px; }

        details > summary { list-style: none; cursor: pointer; }
        details > summary::-webkit-details-marker { display: none; }
    </style>
</head>
<body class="mongo-bg text-gray-300 font-sans h-screen flex flex-col overflow-hidden">

    <header class="bg-[#001e2b] border-b border-gray-800 p-4 shadow-lg z-20">
        <div class="flex flex-col gap-4 max-w-6xl mx-auto w-full">
            
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <svg class="w-8 h-8 text-[#00ED64]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                    <h1 class="text-xl font-bold text-white">MongoDB <span class="text-[#00ED64]">Change Stream Explorer</span></h1>
                </div>
                
                <div class="flex items-center gap-4">
                    <div class="text-xs text-gray-500 font-mono border border-gray-700 rounded px-2 py-1">
                        ${DB_NAME}.${COLLECTION_NAME}
                    </div>
                    <button id="toggle-btn" class="flex items-center gap-2 px-4 py-1.5 rounded text-sm font-bold transition-all bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/50">
                        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                        Pause
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#161b22] p-3 rounded border border-gray-800">
                
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-gray-500 uppercase">Match Pipeline (JSON Array)</label>
                    <textarea id="pipeline-input" rows="1" placeholder='e.g. [{"$match": {"operationType": "insert"}}]' 
                        class="mongo-input text-xs px-2 py-1 rounded border font-mono resize-none h-8 focus:h-20 transition-all"></textarea>
                </div>

                <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold text-gray-500 uppercase">Resume Token (JSON)</label>
                    <div class="flex gap-2 h-8">
                        <input id="token-input" type="text" placeholder='{"_data": "..."} or empty for Latest' 
                            class="mongo-input flex-1 text-xs px-2 rounded border font-mono">
                        <button id="restart-btn" class="bg-[#00ED64] hover:bg-[#00c050] text-black text-xs font-bold px-4 rounded transition-colors whitespace-nowrap">
                            Apply / Restart
                        </button>
                    </div>
                </div>

            </div>
        </div>
    </header>

    <main class="flex-1 overflow-y-auto p-4 sm:p-6 relative">
        <div class="max-w-6xl mx-auto">
            <div class="flex justify-between items-center mb-6 border-b border-gray-800 pb-2">
                <span class="text-xs text-gray-500 uppercase tracking-widest font-semibold">Event Feed</span>
                <span id="connection-status" class="text-yellow-500 text-sm font-mono flex items-center gap-2">Connecting...</span>
            </div>

            <div id="events-list" class="space-y-2">
                <div id="empty-state" class="text-center py-24 text-gray-600 border border-dashed border-gray-800 rounded-lg bg-[#161b22]">
                    <p class="text-lg font-light">Waiting for matching events...</p>
                    <p class="text-xs mt-2 text-gray-500">Ensure your pipeline matches data being generated.</p>
                </div>
            </div>
        </div>

        <div id="paused-overlay" class="hidden absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col items-center pt-4 z-10 bg-black/20 backdrop-blur-[1px]">
            <div class="pointer-events-auto relative bg-[#1c2128] border border-yellow-600/50 shadow-2xl rounded-lg p-4 max-w-2xl w-full mx-4">
                <button id="close-overlay-btn" class="absolute -top-3 -right-3 bg-gray-700 hover:bg-gray-600 text-white rounded-full p-1 shadow-lg border border-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                </button>
                <div class="flex justify-between items-center mb-2">
                    <span class="text-yellow-500 font-bold uppercase text-xs tracking-wider flex items-center gap-2">
                        <span class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span> Stream Paused
                    </span>
                    <span class="text-gray-500 text-xs">Copy this token to resume later</span>
                </div>
                <div class="relative group">
                    <textarea id="last-token-display" readonly class="w-full bg-[#0d1117] border border-gray-700 rounded p-3 text-[10px] text-gray-400 font-mono h-20 resize-none focus:outline-none"></textarea>
                    <button onclick="copyToken()" class="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded shadow">Copy</button>
                </div>
            </div>
        </div>
    </main>

    <script>
        const socket = io();
        const eventsList = document.getElementById('events-list');
        const emptyState = document.getElementById('empty-state');
        const statusEl = document.getElementById('connection-status');
        const toggleBtn = document.getElementById('toggle-btn');
        const pausedOverlay = document.getElementById('paused-overlay');
        const closeOverlayBtn = document.getElementById('close-overlay-btn');
        const tokenInput = document.getElementById('token-input');
        const pipelineInput = document.getElementById('pipeline-input');
        const restartBtn = document.getElementById('restart-btn');
        const lastTokenDisplay = document.getElementById('last-token-display');
        
        const MAX_EVENTS = 25;
        let isPaused = false;
        let lastKnownToken = null;

        restartBtn.addEventListener('click', () => {
            const tokenStr = tokenInput.value.trim();
            const pipelineStr = pipelineInput.value.trim();
            eventsList.innerHTML = '';
            socket.emit('restart-stream', { token: tokenStr, pipeline: pipelineStr });
            isPaused = false;
            updateUIState();
        });

        toggleBtn.addEventListener('click', () => { isPaused = !isPaused; updateUIState(); });
        closeOverlayBtn.addEventListener('click', () => { pausedOverlay.classList.add('hidden'); });

        function updateUIState() {
            if (isPaused) {
                toggleBtn.innerHTML = 'Resume';
                toggleBtn.className = "px-4 py-1.5 rounded text-sm font-bold bg-[#00ED64]/10 text-[#00ED64] border border-[#00ED64]/50";
                statusEl.innerHTML = '<span class="text-yellow-500">Paused</span>';
                pausedOverlay.classList.remove('hidden');
                lastTokenDisplay.value = lastKnownToken ? JSON.stringify(lastKnownToken) : "No events received yet.";
            } else {
                toggleBtn.innerHTML = 'Pause';
                toggleBtn.className = "px-4 py-1.5 rounded text-sm font-bold bg-red-500/10 text-red-500 border border-red-500/50";
                statusEl.innerHTML = '<span class="text-[#00ED64]">Live</span>';
                pausedOverlay.classList.add('hidden');
            }
        }

        function copyToken() {
            lastTokenDisplay.select();
            document.execCommand('copy');
        }

        socket.on('connect', () => { statusEl.innerHTML = '<span class="text-[#00ED64]">Connected</span>'; });

        socket.on('mongo-event', (change) => {
            if (isPaused) return;
            lastKnownToken = change._id;
            if (emptyState) emptyState.remove();

            const op = change.operationType;
            const doc = change.fullDocument || {};
            let summary = '', color = 'border-gray-500';
            
            if (op === 'insert') {
                summary = \`Insert: \${doc.customer || 'Unknown'} ($\${doc.total})\`;
                color = 'border-[#00ED64]';
            } else if (op === 'update') {
                summary = \`Update: \${doc.customer || 'Unknown'} (Status: \${doc.status})\`;
                color = 'border-yellow-500';
            } else if (op === 'delete') {
                summary = \`Delete ID: \${change.documentKey._id}\`;
                color = 'border-red-500';
            } else { summary = \`\${op}\`; }

            const div = document.createElement('div');
            div.className = \`fade-in mongo-card border-l-4 \${color} rounded shadow-sm hover:bg-[#222933] transition-colors\`;
            div.innerHTML = \`
                <details>
                    <summary class="p-3 text-sm flex justify-between">
                        <span>\${summary}</span>
                        <span class="text-xs font-mono text-gray-500">\${new Date().toLocaleTimeString()}</span>
                    </summary>
                    <div class="p-3 pt-0 border-t border-gray-800 bg-[#0d1117]">
                        <pre class="text-[10px] text-[#00ED64] font-mono overflow-x-auto">\${JSON.stringify(change, null, 2)}</pre>
                    </div>
                </details>\`;

            eventsList.insertBefore(div, eventsList.firstChild);
            if (eventsList.children.length > MAX_EVENTS) eventsList.removeChild(eventsList.lastChild);
        });

        socket.on('stream-error', (msg) => { alert('Stream Error: ' + msg); });
    </script>
</body>
</html>
`;

// --- BACKEND LOGIC ---
app.get('/', (req, res) => res.send(HTML_CONTENT));

let changeStream = null;
let mongoClient = null;

async function setupDatabase() {
    try {
        mongoClient = new MongoClient(MONGO_URI);
        await mongoClient.connect();
        console.log('✅ Connected to MongoDB');
        startStream(null, null);
    } catch (err) {
        console.error('Mongo Connection Error:', err);
    }
}

async function startStream(resumeTokenString, pipelineString) {
    if (!mongoClient) return;
    if (changeStream) { await changeStream.close(); changeStream = null; }

    const db = mongoClient.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    const options = { fullDocument: 'updateLookup' };
    
    // 1. Handle Pipeline
    let pipeline = [];
    if (pipelineString && pipelineString.trim() !== "") {
        try {
            pipeline = JSON.parse(pipelineString);
            console.log('🔍 Applying Filter Pipeline:', JSON.stringify(pipeline));
        } catch (e) {
            io.emit('stream-error', 'Invalid Pipeline JSON');
            return;
        }
    }

    // 2. Handle Resume Token
    if (resumeTokenString && resumeTokenString.trim() !== "") {
        try {
            options.resumeAfter = JSON.parse(resumeTokenString);
            console.log('🔄 Resuming with Token');
        } catch (e) {
            io.emit('stream-error', 'Invalid Token JSON');
            return;
        }
    }

    try {
        // 3. Start Watch with Pipeline
        changeStream = collection.watch(pipeline, options);
        changeStream.on('change', (change) => io.emit('mongo-event', change));
        changeStream.on('error', (err) => io.emit('stream-error', err.message));
    } catch (err) {
        io.emit('stream-error', err.message);
    }
}

io.on('connection', (socket) => {
    socket.on('restart-stream', (data) => startStream(data.token, data.pipeline));
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    setupDatabase();
});