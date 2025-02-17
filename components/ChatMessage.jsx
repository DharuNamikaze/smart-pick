import React from 'react';
import parseMarkdown from '../utils/markdownParser';

const ChatMessage = ({ msg }) => {
  return (
    <div
      className={`p-3 rounded-lg mb-2 ${
        msg.sender === "user"
          ? "bg-blue-900 text-white self-end ml-auto max-w-xs"
          : "bg-gray-300 text-black self-start mr-auto max-w-xs"
      }`}
      dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }}
    />
  );
};

export default ChatMessage;
