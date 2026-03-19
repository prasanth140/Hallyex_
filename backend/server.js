const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_patta_123';

// Static file serving
app.use(express.static(path.join(__dirname, '../frontend')));

// Root Route
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/index.html'));
});

// MEMORY STORAGE (Temporary for Hackathon - resets on server restart)
let applications = [];
let workflows = [{
    name: 'Rural Patta Flow',
    steps: ['Application Submitted', 'VAO Verified', 'Surveyor Inspection', 'Tahsildar Approval', 'Completed'],
    rules: [
        { priority: 1, condition: 'application.land_area > 5', target: 'Special Surveyor' },
        { priority: 2, condition: 'DEFAULT', target: 'Standard Surveyor' }
    ]
}];

// Auth Endpoints
app.post('/api/auth/register', (req, res) => {
    // Return success without saving anything
    res.status(201).json({ message: 'Success! You can now log in.' });
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Hardcoded Admin & Officer
        if (email === "admin@gmail.com" && password === "admin123") {
            const token = jwt.sign({ id: email, role: 'admin', name: "Admin" }, JWT_SECRET);
            return res.json({ token, role: 'admin', name: "Admin" });
        }
        if (email === "officer@gmail.com" && password === "officer123") {
            const token = jwt.sign({ id: email, role: 'officer', name: "Official Officer" }, JWT_SECRET);
            return res.json({ token, role: 'officer', name: "Official Officer" });
        }

        // Allow ALL other email/passwords to log in as 'citizen'
        const token = jwt.sign({ id: email, role: 'citizen', name: email.split('@')[0] }, JWT_SECRET);
        res.json({ token, role: 'citizen', name: email.split('@')[0] });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Application API
app.get('/api/stats', (req, res) => {
    const total = applications.length;
    const completed = applications.filter(a => a.status === 'completed').length;
    const pending = applications.filter(a => a.status === 'pending').length;
    const survey = applications.filter(a => a.status === 'surveyor_inspection').length;
    const vao = applications.filter(a => a.status === 'vao_verified').length;
    const tahsildar = applications.filter(a => a.status === 'tahsildar_approval').length;
    
    res.json({ total, completed, pending, vao, survey, tahsildar, active: total - completed });
});

app.get('/api/applications', (req, res) => {
    res.json(applications.slice().reverse());
});

app.post('/api/applications', (req, res) => {
    const newApp = {
        _id: Date.now().toString(),
        ...req.body,
        remarks: "Awaiting primary verification by VAO",
        document_name: req.body.document_name || "Original_Deed_Scan.pdf",
        status: 'pending',
        logs: [{ step: 'Application Submitted', actor: 'Citizen', timestamp: new Date() }],
        createdAt: new Date()
    };
    applications.push(newApp);

    // --- Start Automated Simulation ---
    setTimeout(() => {
        const a = applications.find(x => x._id === newApp._id);
        if(a) {
            a.status = 'vao_verified';
            a.remarks = "VAO: Digital document verification automated. No disputes found.";
            a.logs.push({ step: 'VAO Verified (Auto-Audit)', actor: 'Rule Engine', timestamp: new Date() });
        }
    }, 5000);

    setTimeout(() => {
        const a = applications.find(x => x._id === newApp._id);
        if(a) {
            a.status = 'surveyor_inspection';
            a.remarks = "Surveyor: Field boundary digitized via Satellite mapping.";
            a.logs.push({ step: 'Surveyor Inspection Completed', actor: 'GIS System', timestamp: new Date() });
        }
    }, 15000);

    setTimeout(() => {
        const a = applications.find(x => x._id === newApp._id);
        if(a) {
            a.status = 'tahsildar_approval';
            a.remarks = "Tahsildar: Case forwarded for final signature.";
            a.logs.push({ step: 'Final Approval Stage (Task Delayed)', actor: 'System', timestamp: new Date() });
        }
    }, 25000);

    res.status(201).json(newApp);
});

app.post('/api/applications/:id/approve', (req, res) => {
    const app = applications.find(a => a._id === req.params.id);
    if (!app) return res.status(404).json({ error: 'Not found' });
    
    const officerRef = req.body.officer_name || "Official Approver 🧑‍💼";
    const officerRemarks = req.body.remarks || "No additional comments provided.";

    if (app.status === 'tahsildar_approval') {
        app.status = 'completed';
        app.patta_id = `TN-PATTA-${Math.floor(Math.random()*900000)+100000}`;
        app.remarks = `Final: Digital Patta Issued. ${officerRemarks}`;
    } else if (app.status === 'pending') {
        app.status = 'vao_verified';
        app.remarks = `Verified: ${officerRemarks}`;
    } else {
        const stages = ['pending', 'vao_verified', 'surveyor_inspection', 'tahsildar_approval', 'completed'];
        const currentIdx = stages.indexOf(app.status);
        if (currentIdx < stages.length - 1) {
            app.status = stages[currentIdx + 1];
            app.remarks = `Level ${currentIdx+1} Success: ${officerRemarks}`;
        }
    }

    app.logs.push({ 
        step: `Stage: ${app.status.toUpperCase()}`, 
        actor: officerRef,
        timestamp: new Date()
    });

    res.json(app);
});

app.get('/api/workflow', (req, res) => {
    res.json(workflows[workflows.length - 1]);
});

app.post('/api/workflow', (req, res) => {
    const { name, rules } = req.body;
    const wf = { name, rules, createdAt: new Date() };
    workflows.push(wf);
    res.status(201).json(wf);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port http://localhost:${PORT}`));

module.exports = app;
