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
const BATCH_SIZE = 10;

// Cache for storing generated questions
const questionsCache = new Map();

// MCQ generation endpoint
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
        let allQuestions = [];
        const remainingQuestions = numberOfQuestions;
        
        // Calculate number of full batches and remainder
        const fullBatches = Math.floor(remainingQuestions / BATCH_SIZE);
        const remainderBatch = remainingQuestions % BATCH_SIZE;
        
        // Generate full batches
        for (let i = 0; i < fullBatches; i++) {
            const batchQuestions = await generateQuestionBatch(topic, subTopic, BATCH_SIZE);
            allQuestions = [...allQuestions, ...batchQuestions];
            
            // Add delay between batches
            if (i < fullBatches - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // Generate remainder batch if needed
        if (remainderBatch > 0) {
            const remainderQuestions = await generateQuestionBatch(topic, subTopic, remainderBatch);
            allQuestions = [...allQuestions, ...remainderQuestions];
        }

        // Ensure we have exactly the number of questions requested
        allQuestions = allQuestions.slice(0, numberOfQuestions);

        if (allQuestions.length !== numberOfQuestions) {
            throw new Error(`Generated ${allQuestions.length} questions instead of ${numberOfQuestions}`);
        }

        // Store in cache
        questionsCache.set(cacheKey, allQuestions);
        setTimeout(() => questionsCache.delete(cacheKey), 30 * 60 * 1000);

        res.json({ questions: allQuestions });
    } catch (error) {
        console.error('MCQ Generation Error:', error);
        res.status(500).json({
            error: 'Failed to generate MCQ questions',
            details: error.message
        });
    }
});

async function generateQuestionBatch(topic, subTopic, batchSize) {
    const prompt = `Generate exactly ${batchSize} multiple choice questions about ${subTopic} in ${topic}. 
        Each question must be unique and different from others.
        Format each question exactly as follows, including all properties:
        {
            "question": "Write the question here?",
            "options": ["option a", "option b", "option c", "option d"],
            "correctAnswer": "exact text of correct option"
        }
        Return exactly ${batchSize} questions formatted as a JSON array of objects.`;

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
            timeout: 30000
        }
    );

    let questionsText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // Extract JSON array from response
    const jsonMatch = questionsText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
        throw new Error('Invalid response format');
    }

    try {
        const batchQuestions = JSON.parse(jsonMatch[0]);
        
        // Validate each question has required properties
        const validatedQuestions = batchQuestions.map(q => {
            if (!q.question || !Array.isArray(q.options) || !q.correctAnswer) {
                throw new Error('Invalid question format');
            }
            return {
                question: q.question.trim(),
                options: q.options.map(opt => opt.trim()),
                correctAnswer: q.correctAnswer.trim()
            };
        });

        // Verify batch size
        if (validatedQuestions.length !== batchSize) {
            throw new Error(`Generated ${validatedQuestions.length} questions instead of ${batchSize}`);
        }

        return validatedQuestions;
    } catch (parseError) {
        console.error('Batch parsing error:', parseError);
        throw new Error(`Failed to parse batch: ${parseError.message}`);
    }
}

// Server startup and feedback routes remain the same
app.listen(PORT, async () => {
    console.log(`Server starting on port ${PORT}...`);
    const isConnected = await testApiConnection();
    if (isConnected) {
        console.log('Server is ready to handle requests');
    } else {
        console.log('Server started but API connection test failed - check your API key');
    }
});

// Feedback system initialization
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

// Feedback routes
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

        const existingData = JSON.parse(await fs.readFile(feedbackFile, 'utf8'));
        existingData.push(feedbackData);
        await fs.writeFile(feedbackFile, JSON.stringify(existingData, null, 2));

        res.status(200).json({ message: 'Feedback submitted successfully' });
    } catch (error) {
        console.error('Error saving feedback:', error);
        res.status(500).json({ error: 'Failed to save feedback' });
    }
});

app.get('/api/feedback', async (req, res) => {
    try {
        const feedbackData = JSON.parse(await fs.readFile(feedbackFile, 'utf8'));
        res.json(feedbackData);
    } catch (error) {
        console.error('Error reading feedback:', error);
        res.status(500).json({ error: 'Failed to retrieve feedback' });
    }
});
