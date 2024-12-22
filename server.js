const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

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




// Modify your existing MCQ generation endpoint
app.post('/api/generate-mcq', async (req, res) => {
    const { topic, subTopic, numberOfQuestions } = req.body;
    
    if (!topic || !subTopic || !numberOfQuestions) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        const response = await axios.post(
            GEMINI_API_URL,
            {
                contents: [{
                    parts: [{
                        text: `Generate ${numberOfQuestions} multiple choice questions about ${subTopic} in ${topic}. 
                        Format each question exactly like this example, maintaining the exact structure:
                        [
                            {
                                "question": "What is the capital of France?",
                                "options": ["London", "Paris", "Berlin", "Madrid"],
                                "correctAnswer": "Paris"
                            }
                        ]
                        Generate ${numberOfQuestions} questions in this exact format.`
                    }]
                }]
            }
        );

        let questionsText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        // Extract the JSON array from the response
        const jsonMatch = questionsText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('Invalid response format');
        }
        
        // Parse the JSON array
        try {
            const questions = JSON.parse(jsonMatch[0]);
            
            // Validate the structure of each question
            const validatedQuestions = questions.map(q => ({
                question: q.question.trim(),
                options: q.options.map(opt => opt.trim()),
                correctAnswer: q.correctAnswer.trim()
            }));
            
            res.json({ questions: validatedQuestions });
        } catch (parseError) {
            console.error('JSON parsing error:', parseError);
            throw new Error('Failed to parse questions');
        }
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
