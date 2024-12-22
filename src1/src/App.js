import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import MCQGenerator from './MCQGenerator';
import Feedback from './Feedback';
import './index.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
        <nav className="bg-gradient-to-br from-blue-800 to-black shadow-md p-4">
          <div className="container mx-auto flex justify-between items-center">
            <Link to="/" className="text-white text-2xl font-bold">Quizee</Link>
            <div className="space-x-4">
              <Link to="/mcq" className="text-white hover:text-gray-300">MCQ Quiz</Link>
              <Link to="/feedback" className="text-white hover:text-gray-300">Feedback</Link>
            </div>
          </div>
        </nav>

        <Routes>
          <Route 
            path="/" 
            element={
              <div className="container mx-auto p-6 text-center mt-8">
                <div className="bg-gradient-to-br from-blue-200 to-white bg-white bg-opacity-90 p-8 rounded-lg shadow-md shadow-xl">
                  <h1 className="text-4xl font-extrabold text-gray-800 mb-6">
                    Welcome to Your Personalized Learning Platform
                  </h1>
                  <p className="text-lg text-gray-600 mb-8">
                    Embark on a journey of knowledge with interactive quizzes designed to sharpen your skills.
                  </p>
                  <div className="space-y-4 sm:space-y-0 sm:space-x-4 flex flex-col sm:flex-row justify-center">
                    <Link 
                      to="/mcq" 
                      className="bg-green-500 text-white px-6 py-3 rounded-full text-lg hover:bg-green-600 shadow-md transform hover:-translate-y-1 transition duration-200"
                    >
                      Take the MCQ Quiz Now
                    </Link>
                    <Link 
                      to="/feedback" 
                      className="bg-blue-500 text-white px-6 py-3 rounded-full text-lg hover:bg-blue-600 shadow-md transform hover:-translate-y-1 transition duration-200"
                    >
                      Share Your Feedback
                    </Link>
                  </div>
                </div>
                <div className="mt-12 bg-gradient-to-br from-gray-50 to-gray-200 p-6 rounded-lg shadow-md">
                  <h2 className="text-2xl font-bold text-gray-700 mb-4">About the App</h2>
                  <p className="text-gray-600 mb-2">
                    Please note that this app may take some time to generate questions because it uses a free API and is deployed on a free platform.
                  </p>
                  <p className="text-gray-600 mb-2">
                    The app is under active development, and many exciting features are on their way. 
                  </p>
                  <p className="text-gray-600 mb-4">
                    Your valuable feedback is crucial to enhance and improve this platform.
                  </p>
                  <p className="text-gray-600 font-semibold">
                    Thank you, 
                  </p>
                  <p className="text-gray-600 font-semibold">
                    Sourajit Nayak, Creator
                  </p>
                </div>
              </div>
            }
          />
          <Route path="/mcq" element={<MCQGenerator />} />
          <Route path="/feedback" element={<Feedback />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
