import React from 'react';

const ChatHistory = ({ history, handleSessionClick }) => {
  return (
    <div className="w-1/4 bg-white p-4 shadow-md border-r-2 overflow-y-auto">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">Chat History</h2>
      {history.map((session) => (
        <div
          key={session.id}
          className="mb-3 cursor-pointer hover:bg-gray-200 p-2 rounded-lg"
          onClick={() => handleSessionClick(history.indexOf(session))}
        >
          <p className="text-sm text-gray-600">
            <span className="font-semibold">{session.timestamp}</span>
          </p>
        </div>
      ))}
    </div>
  );
};

export default ChatHistory;
