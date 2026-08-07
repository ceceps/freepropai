import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser';
import { errorHandler, notFound } from './middleware/errorHandler';
import { validateLLMConfig } from './config/llm';
import { testConnection } from './db';
import { authMiddleware } from './middleware/auth.middleware';

// Load environment variables
dotenv.config();

// Import routes
import listingRoutes from './routes/listing.routes';
import authRoutes from './routes/auth.routes';
// import leadRoutes from './routes/lead.routes';
// import followUpRoutes from './routes/followUp.routes';

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files for uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';
app.use('/uploads', express.static(path.join(__dirname, '..', uploadDir)));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'FreePropAI API is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'FreePropAI API v1.0',
    endpoints: {
      leads: '/api/leads',
      followups: '/api/followups',
      listings: '/api/listings',
    },
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
// app.use('/api/leads', authMiddleware, leadRoutes);
// app.use('/api/followups', authMiddleware, followUpRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Validate LLM configuration
    validateLLMConfig();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API: http://localhost:${PORT}/api`);
      console.log(`💚 Health: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
