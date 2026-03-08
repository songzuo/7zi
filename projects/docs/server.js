/* eslint-disable @typescript-eslint/no-require-imports */
const express = require('express');
const cors = require('cors');
const YAML = require('yamljs');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load OpenAPI specification
const specPath = path.join(__dirname, 'spec', 'openapi.yaml');
const openapiSpec = YAML.load(specPath);

// API Routes
app.get('/spec/openapi.yaml', (req, res) => {
    res.sendFile(specPath);
});

app.get('/spec/openapi.json', (req, res) => {
    res.json(openapiSpec);
});

// Mock API endpoints for demonstration
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Email and password are required',
            code: 'VALIDATION_ERROR'
        });
    }

    // Mock authentication
    if (password.length < 8) {
        return res.status(401).json({
            error: 'Invalid credentials',
            message: 'The provided credentials are invalid',
            code: 'INVALID_CREDENTIALS'
        });
    }

    res.json({
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        token_type: 'Bearer',
        expires_in: 3600
    });
});

app.post('/api/auth/logout', (req, res) => {
    res.json({
        message: 'Successfully logged out'
    });
});

app.post('/api/auth/refresh', (req, res) => {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
        return res.status(401).json({
            error: 'Invalid refresh token',
            message: 'Refresh token is required',
            code: 'INVALID_TOKEN'
        });
    }

    res.json({
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        token_type: 'Bearer',
        expires_in: 3600
    });
});

// Users endpoints
app.get('/api/users', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const sort = req.query.sort || 'created_at';

    // Mock users data
    const users = Array.from({ length: limit }, (_, i) => ({
        id: `550e8400-e29b-41d4-a716-4466554400${i.toString().padStart(2, '0')}`,
        email: `user${i + (page - 1) * limit + 1}@example.com`,
        name: `User ${i + (page - 1) * limit + 1}`,
        role: i % 3 === 0 ? 'admin' : 'user',
        created_at: new Date(Date.now() - i * 86400000).toISOString(),
        updated_at: new Date().toISOString()
    }));

    res.json({
        data: users,
        pagination: {
            page,
            limit,
            total: 150,
            total_pages: Math.ceil(150 / limit)
        }
    });
});

app.post('/api/users', (req, res) => {
    const { email, password, name, role } = req.body;
    
    if (!email || !password || !name) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Email, password, and name are required',
            code: 'VALIDATION_ERROR'
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Password must be at least 8 characters',
            code: 'VALIDATION_ERROR'
        });
    }

    res.status(201).json({
        id: '550e8400-e29b-41d4-a716-446655440001',
        email,
        name,
        role: role || 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });
});

app.get('/api/users/:userId', (req, res) => {
    const { userId } = req.params;
    
    res.json({
        id: userId,
        email: 'user@example.com',
        name: 'John Doe',
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });
});

app.put('/api/users/:userId', (req, res) => {
    const { userId } = req.params;
    const { name, role } = req.body;
    
    res.json({
        id: userId,
        email: 'user@example.com',
        name: name || 'John Doe',
        role: role || 'user',
        updated_at: new Date().toISOString()
    });
});

app.delete('/api/users/:userId', (req, res) => {
    res.status(204).send();
});

// Documents endpoints
app.get('/api/documents', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const documents = Array.from({ length: limit }, (_, i) => ({
        id: `doc_${i + 1000}`,
        title: search ? `Document about ${search} ${i + 1}` : `Document ${i + 1}`,
        content: `This is the content of document ${i + 1}. It contains important information about various topics.`,
        author_id: '550e8400-e29b-41d4-a716-446655440001',
        status: i % 3 === 0 ? 'draft' : 'published',
        created_at: new Date(Date.now() - i * 86400000).toISOString(),
        updated_at: new Date().toISOString()
    }));

    res.json({
        data: documents,
        pagination: {
            page,
            limit,
            total: 50,
            total_pages: Math.ceil(50 / limit)
        }
    });
});

app.post('/api/documents', (req, res) => {
    const { title, content, status } = req.body;
    
    if (!title || !content) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Title and content are required',
            code: 'VALIDATION_ERROR'
        });
    }

    res.status(201).json({
        id: `doc_${Date.now()}`,
        title,
        content,
        author_id: '550e8400-e29b-41d4-a716-446655440001',
        status: status || 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });
});

app.get('/api/documents/:documentId', (req, res) => {
    const { documentId } = req.params;
    
    res.json({
        id: documentId,
        title: 'API Documentation',
        content: 'This is the complete API documentation content...',
        author_id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'Something went wrong on our end',
        code: 'INTERNAL_ERROR'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found',
        code: 'NOT_FOUND'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                           ║
║   📘 API Documentation System                            ║
║                                                           ║
║   Server running at: http://localhost:${PORT}             ║
║   Documentation:  http://localhost:${PORT}/               ║
║   OpenAPI Spec:    http://localhost:${PORT}/spec/openapi.yaml
║                                                           ║
╚══════════════════════════════════════════════════════════╝
    `);
});