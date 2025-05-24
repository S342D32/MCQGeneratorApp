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
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + API_KEY;

// Common headers for Gemini API
const getApiHeaders = () => ({
    'Content-Type': 'application/json',
    'Accept': 'application/json'
});

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
            },
            {
                headers: getApiHeaders(),
                timeout: 10000
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
            message: error.message,
            url: GEMINI_API_URL.substring(0, 100) + '...' // Don't log full URL with API key
        });
        return false;
    }
}

// Batch size for question generation
const BATCH_SIZE = 5; // Reduced batch size to avoid timeout

// Cache for storing generated questions
const questionsCache = new Map();

// MCQ generation endpoint
app.post('/api/generate-mcq', async (req, res) => {
    const { topic, subTopic, numberOfQuestions } = req.body;
    
    console.log('Received request:', { topic, subTopic, numberOfQuestions });
    
    if (!topic || !subTopic || !numberOfQuestions) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    const cacheKey = `${topic}-${subTopic}-${numberOfQuestions}`;
    
    if (questionsCache.has(cacheKey)) {
        console.log('Returning cached questions');
        return res.json({ questions: questionsCache.get(cacheKey) });
    }

    try {
        let allQuestions = [];
        const remainingQuestions = numberOfQuestions;
        
        // Calculate number of full batches and remainder
        const fullBatches = Math.floor(remainingQuestions / BATCH_SIZE);
        const remainderBatch = remainingQuestions % BATCH_SIZE;
        
        console.log(`Generating ${numberOfQuestions} questions in ${fullBatches} full batches + ${remainderBatch} remainder`);
        
        // Generate full batches
        for (let i = 0; i < fullBatches; i++) {
            console.log(`Generating batch ${i + 1}/${fullBatches}`);
            const batchQuestions = await generateQuestionBatch(topic, subTopic, BATCH_SIZE);
            allQuestions = [...allQuestions, ...batchQuestions];
            
            // Add delay between batches
            if (i < fullBatches - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // Generate remainder batch if needed
        if (remainderBatch > 0) {
            console.log(`Generating remainder batch of ${remainderBatch} questions`);
            const remainderQuestions = await generateQuestionBatch(topic, subTopic, remainderBatch);
            allQuestions = [...allQuestions, ...remainderQuestions];
        }

        // Ensure we have exactly the number of questions requested
        allQuestions = allQuestions.slice(0, numberOfQuestions);

        if (allQuestions.length === 0) {
            throw new Error('No questions were generated');
        }

        console.log(`Successfully generated ${allQuestions.length} questions`);

        // Store in cache
        questionsCache.set(cacheKey, allQuestions);
        setTimeout(() => questionsCache.delete(cacheKey), 30 * 60 * 1000);

        res.json({ questions: allQuestions });
    } catch (error) {
        console.error('MCQ Generation Error:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data
        });
        res.status(500).json({
            error: 'Failed to generate MCQ questions',
            details: error.message
        });
    }
});

async function generateQuestionBatch(topic, subTopic, batchSize) {
    const prompt = `Generate exactly ${batchSize} multiple choice questions about "${subTopic}" in the subject of "${topic}".

Requirements:
- Each question must be unique and educational
- Provide 4 options for each question (A, B, C, D)
- One option must be clearly correct
- Questions should be at appropriate difficulty level

Format your response as a valid JSON array with this exact structure:
[
  {
    "question": "What is the question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A"
  }
]

Generate exactly ${batchSize} questions in this format.`;

    try {
        console.log(`Making API request for ${batchSize} questions...`);
        
        const response = await axios.post(
            GEMINI_API_URL,
            {
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2000,
                    topP: 0.8,
                    topK: 40
                }
            },
            {
                headers: getApiHeaders(),
                timeout: 30000
            }
        );

        console.log('API Response received, status:', response.status);

        if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error('Invalid API response structure');
        }

        let questionsText = response.data.candidates[0].content.parts[0].text;
        console.log('Raw response text:', questionsText.substring(0, 200) + '...');
        
        // Clean up the response text
        questionsText = questionsText.trim();
        
        // Extract JSON array from response - try multiple patterns
        let jsonMatch = questionsText.match(/\[[\s\S]*\]/);
        
        if (!jsonMatch) {
            // Try to find JSON between code blocks
            const codeBlockMatch = questionsText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/i);
            if (codeBlockMatch) {
                jsonMatch = [codeBlockMatch[1]];
            }
        }
        
        if (!jsonMatch) {
            console.error('No JSON array found in response:', questionsText);
            throw new Error('No valid JSON array found in API response');
        }

        let batchQuestions;
        try {
            batchQuestions = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
            console.error('JSON parsing failed:', parseError.message);
            console.error('Attempted to parse:', jsonMatch[0]);
            throw new Error(`Failed to parse JSON response: ${parseError.message}`);
        }

        if (!Array.isArray(batchQuestions)) {
            throw new Error('Response is not an array');
        }
        
        // Validate each question has required properties
        const validatedQuestions = batchQuestions.map((q, index) => {
            if (!q.question || !Array.isArray(q.options) || !q.correctAnswer) {
                console.error(`Invalid question at index ${index}:`, q);
                throw new Error(`Question ${index + 1} is missing required properties`);
            }
            
            if (q.options.length !== 4) {
                console.error(`Question ${index + 1} does not have exactly 4 options:`, q);
                throw new Error(`Question ${index + 1} must have exactly 4 options`);
            }
            
            return {
                question: q.question.trim(),
                options: q.options.map(opt => String(opt).trim()),
                correctAnswer: String(q.correctAnswer).trim()
            };
        });

        console.log(`Successfully parsed ${validatedQuestions.length} questions`);
        return validatedQuestions;
        
    } catch (error) {
        console.error('Batch generation error:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
        });
        
        if (error.response?.status === 400) {
            throw new Error(`API request failed: ${error.response?.data?.error?.message || 'Bad request format'}`);
        } else if (error.response?.status === 429) {
            throw new Error('API rate limit exceeded. Please try again later.');
        } else if (error.response?.status === 403) {
            throw new Error('API access forbidden. Check your API key permissions.');
        }
        
        throw error;
    }
}

// Server startup
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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
