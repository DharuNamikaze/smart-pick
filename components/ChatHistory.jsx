import React from 'react';

const ChatHistory = ({ history, handleSessionClick }) => {
  return (
    <div className="w-64 bg-gray-50 p-4 shadow-lg border-r border-gray-200 overflow-y-auto h-screen">
      <h2 className="text-lg font-semibold text-gray-800 mb-6">Chat History</h2>
      {history.map((session) => (
        <div
          key={session.id}
          className="mb-3 cursor-pointer hover:bg-gray-100 p-3 rounded-lg transition duration-200 ease-in-out"
          onClick={() => handleSessionClick(history.indexOf(session))}
        >
          <p className="text-sm text-gray-700 truncate">
            <span className="font-medium text-gray-900">{session.timestamp}</span>
            <span className="block text-gray-500 text-xs mt-1">{session.preview}</span>
          </p>
        </div>
      ))}
    </div>
  );
};

export default ChatHistory;