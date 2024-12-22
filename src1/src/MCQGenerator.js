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
  const [ setRetryMode] = useState(false); // New state for retry mode
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
    <div className="container mx-auto p-4 max-w-2xl">
      {!questions.length ? (
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl mb-4 font-semibold">MCQ Quiz Setup</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name:</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Topic:</label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Topic</option>
                {Object.keys(topics).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            {topic && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Subtopic:</label>
                <select
                  value={subTopic}
                  onChange={(e) => setSubTopic(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Subtopic</option>
                  {topics[topic].map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            )}
            {subTopic && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Questions:</label>
                <input
                  type="number"
                  value={numberOfQuestions}
                  onChange={(e) => setNumberOfQuestions(parseInt(e.target.value))}
                  min="1"
                  max="20"
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
            {subTopic && (
              <button
                onClick={fetchMCQQuestions}
                className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition duration-200 text-sm sm:text-base"
              >
                Generate Quiz
              </button>
            )}
          </div>
        </div>
      ) : !showResults ? (
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg sm:text-xl mb-4 font-semibold">
            Question {currentQuestionIndex + 1} of {questions.length}
          </h2>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200">
            <p className="mb-4 text-base sm:text-lg font-medium text-gray-800">
              {questions[currentQuestionIndex].question}
            </p>
            <div className="space-y-2">
              {questions[currentQuestionIndex].options.map((option, optionIndex) => (
                <div
                  key={optionIndex}
                  onClick={() => handleAnswerSelection(currentQuestionIndex, option)}
                  className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 text-sm sm:text-base ${
                    selectedAnswers[currentQuestionIndex] === option
                      ? 'bg-blue-100 border-blue-400 text-blue-700'
                      : 'hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  {option}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex justify-between">
            {currentQuestionIndex > 0 && (
              <button
                onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 text-sm sm:text-base"
              >
                Previous
              </button>
            )}
            {currentQuestionIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                disabled={selectedAnswers[currentQuestionIndex] === null}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                Next
              </button>
            ) : (
              <button
                onClick={calculateScore}
                disabled={selectedAnswers[currentQuestionIndex] === null}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                Submit Quiz
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl mb-4 font-semibold">Quiz Results</h2>
          <div className="mb-6">
            <Badge name={userName} score={score} totalQuestions={questions.length} />
          </div>
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg ${
                  selectedAnswers[index] === question.correctAnswer
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <p className="text-sm sm:text-base mb-2">{question.question}</p>
                <p className="text-sm sm:text-base">Your Answer: {selectedAnswers[index]}</p>
                <p className="font-semibold text-sm sm:text-base text-green-600">
                  Correct Answer: {question.correctAnswer}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-3">
            <button
              onClick={retryQuiz}
              className="w-full bg-yellow-500 text-white p-3 rounded-lg hover:bg-yellow-600 text-sm sm:text-base"
            >
              Retry Quiz
            </button>
            <button
              onClick={resetQuiz}
              className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 text-sm sm:text-base"
            >
              Start New Quiz
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MCQGenerator;
