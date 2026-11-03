# FaceSnap Website

Website for FaceSnap: Real-Time Personalized Lightstage Facial Performance Capture (Accepted WACV 2027)
 
## How to view the website

Simply open `index.html` in a browser. Since the page loads local videos and images, some browsers (Chrome, Edge) block local file access by default. Use one of the following methods:

### Option 1 — Python local server (recommended)
```bash 
python -m http.server 8000
```
Then open: http://localhost:8000

### Option 2 — VS Code Live Server
Install the **Live Server** extension in VS Code, right-click `index.html` → **Open with Live Server**.

### Option 3 — Node.js
```bash
npx serve .
```
Then open the URL shown in the terminal.
