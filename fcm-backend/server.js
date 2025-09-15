// Simple Node.js backend for FCM V1 API
// Run with: node server.js
// This handles FCM sending and can be called from your Supabase Edge Function

// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require('express');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const admin = require('firebase-admin');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK
let serviceAccount;
try {
  // You can either:
  // 1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable
  // 2. Or paste your service account JSON here
  serviceAccount = require('./service-account-key.json');
} catch (error) {
  console.error('Service account key not found. Please add service-account-key.json');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// FCM sending endpoint
app.post('/send-fcm', async (req, res) => {
  try {
    const { tokens, title, body, data } = req.body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ error: 'Tokens array is required' });
    }

    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }

    // Send to multiple tokens
    const message = {
      notification: {
        title: title,
        body: body
      },
      data: data || {},
      android: {
        priority: 'high'
      },
      tokens: tokens
    };

    const response = await admin.messaging().sendMulticast(message);

    res.json({
      success: response.successCount,
      failure: response.failureCount,
      results: response.responses.map((resp, index) => ({
        success: resp.success,
        messageId: resp.messageId,
        error: resp.error ? resp.error.code : null
      }))
    });

  } catch (error) {
    console.error('FCM send error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`FCM Backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`FCM endpoint: http://localhost:${PORT}/send-fcm`);
});
