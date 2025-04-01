import React, { useState } from 'react';
import useElectron from '../lib/useElectron';

/**
 * FeedbackModal component allows users to submit feedback
 * Can be used for bug reports, feature requests, or other feedback
 * Desktop app includes autonomous patching for bug reports
 */
const FeedbackModal = ({ isOpen, onClose }) => {
  const [feedbackType, setFeedbackType] = useState('Bug');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [submitStatus, setSubmitStatus] = useState(null);
  const { submitFeedback, showNotification, isDesktopApp } = useElectron();

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!description.trim()) {
      setSubmitStatus({
        success: false,
        message: 'Please provide a description.'
      });
      return;
    }
    
    try {
      setSubmitStatus({ loading: true });
      const result = await submitFeedback({
        type: feedbackType,
        description,
        email: email.trim() || null,
        timestamp: new Date().toISOString()
      });
      
      if (result.success) {
        setSubmitStatus({
          success: true,
          message: 'Thank you for your feedback!',
          id: result.id
        });
        
        // Show different message based on feedback type
        let notificationMsg = 'Your feedback has been recorded.';
        if (feedbackType === 'Bug' && isDesktopApp) {
          notificationMsg = 'Bug report received. Our system will attempt to patch this issue automatically.';
        } else if (feedbackType === 'Feature Request') {
          notificationMsg = 'Feature request received. We&apos;ll consider it for future updates.';
        }
        
        showNotification('Feedback Submitted', notificationMsg);
        
        // Reset form after successful submission
        setDescription('');
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error) {
      setSubmitStatus({
        success: false,
        message: `Error: ${error.message || 'Something went wrong'}`
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden w-full max-w-md">
        <div className="p-4 bg-purple-600 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold">Submit Feedback</h2>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200 focus:outline-none"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="feedbackType">
              Feedback Type
            </label>
            <select
              id="feedbackType"
              className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              value={feedbackType}
              onChange={(e) => setFeedbackType(e.target.value)}
            >
              <option value="Bug">Bug Report</option>
              <option value="Feature">Feature Request</option>
              <option value="Other">Other Feedback</option>
            </select>
            
            {feedbackType === 'Bug' && isDesktopApp && (
              <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                Bug reports are automatically analyzed and may be patched without requiring an app update.
              </p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              rows="4"
              className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              placeholder={feedbackType === 'Bug' 
                ? 'Please describe the issue in detail, including steps to reproduce...' 
                : feedbackType === 'Feature'
                  ? 'Please describe the feature you would like to see...'
                  : 'Share your thoughts or suggestions...'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="email">
              Email (optional)
            </label>
            <input
              id="email"
              type="email"
              className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Provide your email if you'd like to receive updates on this feedback.
            </p>
          </div>
          
          {submitStatus && (
            <div className={`mb-4 p-3 rounded-lg ${
              submitStatus.loading
                ? 'bg-blue-50 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : submitStatus.success
                  ? 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              <p className="text-sm">{submitStatus.message}</p>
              {submitStatus.success && feedbackType === 'Bug' && (
                <p className="text-xs mt-1">
                  Reference ID: {submitStatus.id}
                </p>
              )}
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
                submitStatus?.loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={submitStatus?.loading}
            >
              {submitStatus?.loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;