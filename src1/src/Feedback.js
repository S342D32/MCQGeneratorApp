import React, { useState } from 'react';
import { Star } from 'lucide-react';

const Feedback = () => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [topicSuggestion, setTopicSuggestion] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Please provide a rating');
      return;
    }

    try {
      const response = await fetch('https://mcqgeneratorapp.onrender.com/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          feedback,
          topicSuggestion,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        setSubmitted(true);
        setError('');
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (err) {
      setError('Failed to submit feedback. Please try again.');
    }
  };

  if (submitted) {
    return (
      <div className="text-center p-6 bg-green-50 rounded-lg">
        <h3 className="text-xl font-semibold text-green-700 mb-2">Thank You!</h3>
        <p className="text-green-600">Your feedback has been submitted successfully.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Share Your Feedback</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-gray-700 mb-2">Rating</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={32}
                className={`cursor-pointer transition-colors ${
                  (hoveredRating || rating) >= star
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-gray-700 mb-2">
            Suggest New Topics/Subtopics
          </label>
          <input
            type="text"
            value={topicSuggestion}
            onChange={(e) => setTopicSuggestion(e.target.value)}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Advanced Mathematics, Machine Learning"
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">
            Additional Comments
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full p-3 border rounded-lg h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Share your experience and suggestions..."
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-200"
        >
          Submit Feedback
        </button>
      </form>
    </div>
  );
};

export default Feedback;
