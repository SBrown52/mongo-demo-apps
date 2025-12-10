# 🍃 MongoDB Feature Demos & Starters

A collection of lightweight, single-purpose applications designed to demonstrate core MongoDB features using Node.js.

These demos are educational sandboxes intended for developers, solution architects, and students who want to see features like **Change Streams**, **Aggregation Pipelines**, and **Search** in action without setting up complex frameworks.

## 📂 Project Structure

This repository is organized by feature. Each folder contains a self-contained demo.

| Directory | Demo Name | Description |
| :--- | :--- | :--- |
| `/change-stream-explorer` | **Change Stream Explorer** | A websocket-based UI to watch Inserts, Updates, and Deletes in real-time. Includes Resume Token and Pipeline filtering logic. |
| `retail-events-simulator` | **Retail Event Store** | A script that generates realistic retail transaction data (Orders, Status Updates, Cancellations) to test database activity. |
| *(More Coming Soon)* |  |  |

## 🛠️ Prerequisites

To run these demos, you will need:

1.  **MongoDB Instance**:
      * **MongoDB Atlas:** (Recommended) A free tier cluster works perfectly.
      * **Local MongoDB:** Must be running as a **Replica Set** (required for Change Streams).
      * Unless otherwise stated, these demos can run on both Atlas or a local self-hosted MongoDB instance

## 🚀 Getting Started
All instructions are self-contained in each demo's folder.
Enjoy!
