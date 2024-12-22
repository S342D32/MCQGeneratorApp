import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';

import MCQGenerator from './MCQGenerator';
import './index.css';





function App() {
  return (
    <Router>
      <div>
        <nav className="bg-gray-800 p-4">
          <div className="container mx-auto flex justify-between items-center">
            <Link to="/" className="text-white text-xl font-bold">Home</Link>
            <div>
              
              <Link to="/mcq" className="text-white hover:text-gray-300">MCQ Quiz</Link>
              
              
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={
            <div className="container mx-auto p-4 text-center">
              <h1 className="text-3xl mb-4 font-mono">Welcome to Learning Platform</h1>
              <div className="flex justify-center space-x-4">
               
                 
                <Link 
                  to="/mcq" 
                  className="bg-green-500 text-white p-4 rounded hover:bg-green-600"
                >
                  Take MCQ Quiz
                </Link>
                
              </div>
            </div>
          } />
          
          <Route path="/mcq" element={<MCQGenerator />} />
          

        </Routes>
      </div>
    </Router>
  );
}

export default App;