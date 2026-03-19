const express = require('express');
const mongoose = require('mongoose');
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
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Models
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['citizen', 'officer', 'admin'], default: 'citizen' }
});
const User = mongoose.model('User', userSchema);

const applicationSchema = new mongoose.Schema({
  citizen_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  survey_number: String,
  land_area: Number,
  land_unit: { type: String, default: 'Acres' },
  village: String,
  district: String,
  remarks: String,
  document_name: String,
  patta_id: String, // Dynamic ID for completed state
  geo_location: {
      lat: Number,
      lng: Number,
      address: String
  },
  status: { type: String, default: 'pending' }, 
  logs: [{
      step: String,
      actor: String,
      timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });
const Application = mongoose.model('Application', applicationSchema);

const workflowSchema = new mongoose.Schema({
  name: { type: String, default: 'Rural Patta Flow' },
  steps: [String],
  rules: [{
    priority: Number,
    condition: String,
    target: String
  }]
}, { timestamps: true });
const Workflow = mongoose.model('Workflow', workflowSchema);

// Workflow API
app.get('/api/workflow', async (req, res) => {
  try {
    let wf = await Workflow.findOne().sort({ createdAt: -1 });
    if (!wf) {
      // Default initial workflow
      wf = new Workflow({
        rules: [
          { priority: 1, condition: 'application.land_area > 5', target: 'Special Surveyor' },
          { priority: 2, condition: 'DEFAULT', target: 'Standard Surveyor' }
        ]
      });
    }
    res.json(wf);
  } catch (err) { res.status(500).json(err); }
});

app.post('/api/workflow', async (req, res) => {
  try {
    const { name, rules } = req.body;
    const wf = new Workflow({ name, rules });
    await wf.save();
    console.log(`✅ Workflow Published: ${wf.name}`);
    res.status(201).json(wf);
  } catch (err) { res.status(500).json(err); }
});

// Auth Endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role });
    await user.save();
    res.status(201).json({ message: 'User created' });
  } catch (err) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, JWT_SECRET);
    res.json({ token, role: user.role, name: user.name });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Application API
app.get('/api/stats', async (req, res) => {
  try {
    const total = await Application.countDocuments();
    const completed = await Application.countDocuments({ status: 'completed' });
    const pending = await Application.countDocuments({ status: 'pending' });
    const survey = await Application.countDocuments({ status: 'surveyor_inspection' });
    const vao = await Application.countDocuments({ status: 'vao_verified' });
    const tahsildar = await Application.countDocuments({ status: 'tahsildar_approval' });
    
    res.json({ total, completed, pending, vao, survey, tahsildar, active: total - completed });
  } catch (err) { res.status(500).json(err); }
});

app.get('/api/applications', async (req, res) => {
  try {
    const apps = await Application.find().sort({ createdAt: -1 });
    res.json(apps);
  } catch (err) { res.status(500).json(err); }
});

app.post('/api/applications', async (req, res) => {
  try {
    const app = new Application({
        ...req.body,
        remarks: "Awaiting primary verification by VAO",
        document_name: req.body.document_name || "Original_Deed_Scan.pdf"
    });
    app.logs.push({ step: 'Application Submitted', actor: 'Citizen' });
    await app.save();

    // --- Start Automated Simulation ---
    // Step 1: VAO Verification (after 5 seconds)
    setTimeout(async () => {
        const a = await Application.findById(app._id);
        a.status = 'vao_verified';
        a.remarks = "VAO: Digital document verification automated success. No disputes found.";
        a.logs.push({ step: 'VAO Verified (Auto-Audit)', actor: 'Rule Engine' });
        await a.save();
        console.log(`Auto-Verified VAO for ${app._id}`);
    }, 5000);

    // Step 2: Surveyor Inspection (after 15 seconds)
    setTimeout(async () => {
        const a = await Application.findById(app._id);
        a.status = 'surveyor_inspection';
        a.remarks = "Surveyor: Field boundary digitized via Satellite mapping. Matched with Revenue Records.";
        a.logs.push({ step: 'Surveyor Inspection Completed', actor: 'GIS System' });
        await a.save();
        console.log(`Auto-Surveyed for ${app._id}`);
    }, 15000);

    // Step 3: Tahsildar Delay (after 25 seconds - shows as "Processing" but stays there)
    setTimeout(async () => {
        const a = await Application.findById(app._id);
        a.status = 'tahsildar_approval';
        a.remarks = "Tahsildar: Case forwarded for final signature. Expected delay: 48 hours for physical verification.";
        a.logs.push({ step: 'Final Approval Stage (Task Delayed)', actor: 'System' });
        await a.save();
    }, 25000);

    res.status(201).json(app);
  } catch (err) { res.status(500).json(err); }
});

app.post('/api/applications/:id/approve', async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);
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
        // Generic progression
        const stages = ['pending', 'vao_verified', 'surveyor_inspection', 'tahsildar_approval', 'completed'];
        const currentIdx = stages.indexOf(app.status);
        if (currentIdx < stages.length - 1) {
            app.status = stages[currentIdx + 1];
            app.remarks = `Level ${currentIdx + 1} Success: ${officerRemarks}`;
        }
    }

    app.logs.push({ 
        step: `Stage: ${app.status.toUpperCase()}`, 
        actor: officerRef,
        timestamp: new Date()
    });

    await app.save();
    res.json(app);
  } catch (err) { res.status(500).json(err); }
});

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/patta_workflow';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port http://localhost:${PORT}`));

module.exports = app;
