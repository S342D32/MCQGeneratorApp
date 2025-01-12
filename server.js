const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const fs = require('fs').promises;
const path = require('path');

// Ensure feedback directory exists
const feedbackDir = path.join(__dirname, 'feedback');
const feedbackFile = path.join(feedbackDir, 'feedback.json');


// Middleware
app.use(cors({
    origin: 'https://mcqgeneratorapp232.onrender.com',
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

// Get API key
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error('ERROR: GEMINI_API_KEY is not set in environment variables');
    process.exit(1);
}

// Correct API URL format for Gemini
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + API_KEY;

// Test API connection on startup
async function testApiConnection() {
    try {
        console.log('Testing Gemini API connection...');
        const response = await axios.post(
            GEMINI_API_URL,
            {
                contents: [{
                    parts: [{
                        text: "Test connection"
                    }]
                }]
            }
        );
        console.log('API Test successful:', {
            status: response.status,
            hasData: !!response.data
        });
        return true;
    } catch (error) {
        console.error('API Test failed:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            error: error.response?.data?.error,
            message: error.message
        });
        return false;
    }
}

// Batch size for question generation
const BATCH_SIZE = 20;

// Cache for storing generated questions
const questionsCache = new Map();



// Modify your existing MCQ generation endpoint
app.post('/api/generate-mcq', async (req, res) => {
    const { topic, subTopic, numberOfQuestions } = req.body;
    
    if (!topic || !subTopic || !numberOfQuestions) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    const cacheKey = `${topic}-${subTopic}-${numberOfQuestions}`;
    
    if (questionsCache.has(cacheKey)) {
        return res.json({ questions: questionsCache.get(cacheKey) });
    }

    try {
        const allQuestions = [];
        const batches = Math.ceil(numberOfQuestions / BATCH_SIZE);
        
        // Create an array of promises for parallel execution
        const batchPromises = Array.from({ length: batches }, async (_, index) => {
            const questionsInBatch = Math.min(
                BATCH_SIZE,
                numberOfQuestions - (index * BATCH_SIZE)
            );

            const prompt = `Generate ${questionsInBatch} multiple choice questions about ${subTopic} in ${topic}. 
                Focus on different aspects for each question. 
                Keep questions concise and clear.
                Format: [{"question":"brief question?","options":["a","b","c","d"],"correctAnswer":"actual correct answer"}]
                Ensure questions are distinct from each other and cover different concepts.`;

            const response = await axios.post(
                GEMINI_API_URL,
                {
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 1000,
                    }
                },
                {
                    timeout: 30000 // 30 second timeout for each batch
                }
            );

            let questionsText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            const jsonMatch = questionsText.match(/\[[\s\S]*\]/);
            
            if (!jsonMatch) {
                throw new Error(`Invalid response format in batch ${index + 1}`);
            }

            return JSON.parse(jsonMatch[0]);
        });

        // Execute batches with rate limiting
        for (let i = 0; i < batchPromises.length; i++) {
            try {
                const batchQuestions = await batchPromises[i];
                allQuestions.push(...batchQuestions);
                
                // Add a small delay between batches to prevent rate limiting
                if (i < batchPromises.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.error(`Error in batch ${i + 1}:`, error);
                // Continue with other batches even if one fails
            }
        }

        // Validate and format all questions
        const validatedQuestions = allQuestions.slice(0, numberOfQuestions).map(q => ({
            question: q.question.trim(),
            options: q.options.map(opt => opt.trim()),
            correctAnswer: q.correctAnswer.trim()
        }));

        // Store in cache for 30 minutes
        questionsCache.set(cacheKey, validatedQuestions);
        setTimeout(() => questionsCache.delete(cacheKey), 30 * 60 * 1000);

        res.json({ questions: validatedQuestions });
    } catch (error) {
        console.error('MCQ Generation Error:', error);
        res.status(500).json({
            error: 'Failed to generate MCQ questions',
            details: error.message
        });
    }
});


app.listen(PORT, async () => {
    console.log(`Server starting on port ${PORT}...`);
    const isConnected = await testApiConnection();
    if (isConnected) {
        console.log('Server is ready to handle requests');
    } else {
        console.log('Server started but API connection test failed - check your API key');
    }
});


async function ensureFeedbackFile() {
  try {
    await fs.mkdir(feedbackDir, { recursive: true });
    try {
      await fs.access(feedbackFile);
    } catch {
      await fs.writeFile(feedbackFile, '[]');
    }
  } catch (error) {
    console.error('Error initializing feedback system:', error);
  }
}

ensureFeedbackFile();

// Route to submit feedback
app.post('/api/feedback', async (req, res) => {
  try {
    const { rating, feedback, topicSuggestion, timestamp } = req.body;

    if (rating === undefined) {
      return res.status(400).json({ error: 'Rating is required' });
    }

    const feedbackData = {
      rating,
      feedback,
      topicSuggestion,
      timestamp
    };

    // Read existing feedback
    const existingData = JSON.parse(await fs.readFile(feedbackFile, 'utf8'));
    
    // Add new feedback
    existingData.push(feedbackData);
    
    // Save updated feedback
    await fs.writeFile(feedbackFile, JSON.stringify(existingData, null, 2));

    res.status(200).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

// Route to get all feedback (for admin purposes)
app.get('/api/feedback', async (req, res) => {
  try {
    const feedbackData = JSON.parse(await fs.readFile(feedbackFile, 'utf8'));
    res.json(feedbackData);
  } catch (error) {
    console.error('Error reading feedback:', error);
    res.status(500).json({ error: 'Failed to retrieve feedback' });
  }
});
