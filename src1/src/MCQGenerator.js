import React, { useState } from 'react';
import axios from 'axios';
import Badge from "./Badge";

const MCQGenerator = () => {
  const [topic, setTopic] = useState('');
  const [subTopic, setSubTopic] = useState('');
  const [numberOfQuestions, setNumberOfQuestions] = useState(5);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [retryMode, setRetryMode] = useState(false); // New state for retry mode
  const [score, setScore] = useState(0);
  const [userName, setUserName] = useState('');

  const topics = {
    'Computer Science': ['Programming', 'Algorithms', 'Data Structures'],
    'Mathematics': ['Algebra', 'Geometry', 'Calculus'],
    'Physics': ['Mechanics', 'Electromagnetism', 'Quantum Physics'],
    'General-knowledge': ['History', 'Geography', 'Science', 'Literature', 'Sports', 'Current Affairs'],
    'SQL-queries': ['SQL all operator', 'PostgreSQL', 'BASICS']
  };

  const fetchMCQQuestions = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/generate-mcq', {
        topic,
        subTopic,
        numberOfQuestions
      });
      setQuestions(response.data.questions);
      setSelectedAnswers(new Array(response.data.questions.length).fill(null));
    } catch (error) {
      console.error('Error fetching MCQ questions:', error);
    }
  };

  const handleAnswerSelection = (questionIndex, selectedOption) => {
    const newSelectedAnswers = [...selectedAnswers];
    newSelectedAnswers[questionIndex] = selectedOption;
    setSelectedAnswers(newSelectedAnswers);
  };

  const calculateScore = () => {
    const correctAnswers = questions.map(q => q.correctAnswer);
    const userScore = selectedAnswers.reduce((acc, answer, index) =>
      answer === correctAnswers[index] ? acc + 1 : acc, 0);
    setScore(userScore);
    setShowResults(true);
  };

  const resetQuiz = () => {
    setTopic('');
    setSubTopic('');
    setQuestions([]);
    setSelectedAnswers([]);
    setShowResults(false);
    setRetryMode(false); // Reset retry mode
    setScore(0);
    setCurrentQuestionIndex(0);
  };

  const retryQuiz = () => {
    setRetryMode(true); // Enable retry mode
    setShowResults(false); // Hide results
    setCurrentQuestionIndex(0); // Start from the first question
  };

  return (
    <div className="container mx-auto p-4">
      {!questions.length ? (
        <div>
          <h2 className="text-2xl mb-4">MCQ Quiz Setup</h2>
          <div className="mb-4">
            <label>Your Name:</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter your name"
              required
            />
          </div>
          <div className="mb-4">
            <label>Select Topic:</label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Topic</option>
              {Object.keys(topics).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          {topic && (
            <div className="mb-4">
              <label>Select Subtopic:</label>
              <select
                value={subTopic}
                onChange={(e) => setSubTopic(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select Subtopic</option>
                {topics[topic].map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          )}
          {subTopic && (
            <div className="mb-4">
              <label>Number of Questions:</label>
              <input
                type="number"
                value={numberOfQuestions}
                onChange={(e) => setNumberOfQuestions(parseInt(e.target.value))}
                min="1"
                max="20"
                className="w-full p-2 border rounded"
              />
            </div>
          )}
          {subTopic && (
            <button
              onClick={fetchMCQQuestions}
              className="w-full bg-blue-500 text-white p-2 rounded"
            >
              Generate Quiz
            </button>
          )}
        </div>
      ) : !showResults ? (
        <div>
          <h2 className="text-xl mb-4">
            Question {currentQuestionIndex + 1} of {questions.length}
          </h2>
          <div className="bg-white p-6 rounded shadow">
            <p className="mb-4">{questions[currentQuestionIndex].question}</p>
            {questions[currentQuestionIndex].options.map((option, optionIndex) => (
              <div
                key={optionIndex}
                onClick={() => handleAnswerSelection(currentQuestionIndex, option)}
                className={`p-2 mb-2 border rounded cursor-pointer ${
                  selectedAnswers[currentQuestionIndex] === option
                    ? 'bg-blue-200'
                    : 'hover:bg-gray-100'
                }`}
              >
                {option}
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between">
            {currentQuestionIndex > 0 && (
              <button
                onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                className="bg-gray-500 text-white p-2 rounded"
              >
                Previous
              </button>
            )}
            {currentQuestionIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                disabled={selectedAnswers[currentQuestionIndex] === null}
                className="bg-blue-500 text-white p-2 rounded disabled:opacity-50"
              >
                Next
              </button>
            ) : (
              <button
                onClick={calculateScore}
                disabled={selectedAnswers[currentQuestionIndex] === null}
                className="bg-green-500 text-white p-2 rounded disabled:opacity-50"
              >
                Submit Quiz
              </button>
            )}
          </div>
        </div>
      ) : retryMode ? (
        <div>
          <h2 className="text-2xl mb-4">Retry Quiz</h2>
          {questions.map((question, index) => (
            <div
              key={index}
              className={`mb-4 p-4 rounded ${
                selectedAnswers[index] === question.correctAnswer
                  ? 'bg-green-100'
                  : 'bg-red-100'
              }`}
            >
              <p>{question.question}</p>
              <p>Your Answer: {selectedAnswers[index]}</p>
              <p className="font-bold text-lg text-green-600">Correct Answer: {question.correctAnswer}</p>
              <div>
  <h2 className="text-2xl mb-4">Quiz Results</h2>
  <Badge label={`Your Score: ${score}`} />
  <p className="text-xl mb-4">Your Score: {score} / {questions.length}</p>
</div>

            </div>
          ))}
          <button
            onClick={resetQuiz}
            className="w-full bg-blue-500 text-white p-2 rounded mt-4"
          >
            Start New Quiz
          </button>
        </div>
      ) : (
        <div>
          <h2 className="text-2xl mb-4">Quiz Results</h2>
          <p className="text-xl mb-4">Your Score: {score} / {questions.length}</p>
          {questions.map((question, index) => (
            <div
              key={index}
              className={`mb-4 p-4 rounded ${
                selectedAnswers[index] === question.correctAnswer
                  ? 'bg-green-100'
                  : 'bg-red-100'
              }`}
            >
              <p>{question.question}</p>
              <p>Your Answer: {selectedAnswers[index]}</p>
              <p className="font-bold text-lg text-green-600">Correct Answer: {question.correctAnswer}</p>
            </div>
          ))}
          <button
            onClick={retryQuiz}
            className="w-full bg-yellow-500 text-white p-2 rounded mt-4"
          >
            Retry Quiz
          </button>
        </div>
      )}
    </div>
  );
};

export default MCQGenerator;
