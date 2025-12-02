require('dotenv').config();
const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const compression = require('compression');

const typeDefs = require('./graphql/schema');
const resolvers = require('./graphql/resolvers');
const { initializeCanvas } = require('./utils/canvas');

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  FRONTEND_URL
].filter(Boolean);

// Validate environment variables
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function startServer() {
  // Create Express app
  const app = express();
  const httpServer = createServer(app);

  // Connect to MongoDB
  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('Connected to MongoDB');
    
    // Initialize canvas chunks
    await initializeCanvas();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.error('Please ensure MongoDB is running and accessible at:', MONGODB_URI);
    console.error('You can start MongoDB with: mongod');
    process.exit(1);
  }

  // Create Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();

  // Setup WebSocket server
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws'
  });

  // WebSocket connection handling
  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');
    
    // Handle WebSocket authentication
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'AUTH') {
          // Verify JWT token
          const token = data.token;
          if (token) {
            try {
              const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
              ws.userId = decoded.userId;
              ws.username = decoded.username;
              ws.authenticated = true;
              
              ws.send(JSON.stringify({
                type: 'AUTH_SUCCESS',
                payload: { username: decoded.username }
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'AUTH_ERROR',
                payload: { message: 'Invalid token' }
              }));
            }
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });

  // Setup middleware
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (NODE_ENV === 'production') {
        // In production, only allow specified origins
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      } else {
        // In development, allow all origins
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));

  // Apply GraphQL middleware
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: ({ req }) => ({
        req,
        wss // Pass WebSocket server to resolvers
      })
    })
  );

  // Basic health check endpoint
  app.get('/health', (req, res) => {
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  // Start the server
  httpServer.listen(PORT, () => {
    console.log(`Server ready at http://localhost:${PORT}`);
    console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
    console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
  });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await mongoose.connection.close();
  process.exit(0);
});

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});