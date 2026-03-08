/* eslint-disable @typescript-eslint/no-require-imports */
const express = require('express');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// In-memory storage for users (in a real app, this would be a database)
let users = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
];

let nextId = 3;

// GET /users - Retrieve all users
app.get('/users', (req, res) => {
  res.json(users);
});

// GET /users/:id - Retrieve a specific user by ID
app.get('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const user = users.find(u => u.id === id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json(user);
});

// POST /users - Create a new user
app.post('/users', (req, res) => {
  const { name, email } = req.body;
  
  // Basic validation
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  
  // Check if email already exists
  if (users.some(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already exists' });
  }
  
  const newUser = {
    id: nextId++,
    name,
    email
  };
  
  users.push(newUser);
  res.status(201).json(newUser);
});

// PUT /users/:id - Update an existing user
app.put('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { name, email } = req.body;
  
  const userIndex = users.findIndex(u => u.id === id);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Basic validation
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  
  // Check if email already exists (excluding current user)
  if (users.some(u => u.email === email && u.id !== id)) {
    return res.status(400).json({ error: 'Email already exists' });
  }
  
  users[userIndex] = { id, name, email };
  res.json(users[userIndex]);
});

// DELETE /users/:id - Delete a user
app.delete('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === id);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const deletedUser = users.splice(userIndex, 1)[0];
  res.json(deletedUser);
});

// Start the server
app.listen(port, () => {
  console.log(`User management API running at http://localhost:${port}`);
});

module.exports = app;