import { useState, useRef } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "../styles/globals.css";

// Replace 'YOUR_API_KEY' with your actual API key
const genAI = new GoogleGenerativeAI("AIzaSyCfCEmZ-LRdAobq03ABMo5dJ3b8iRSERaw");

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { text: input, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);

    try {
      // Load the Generative Model
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
      });

      // Generate content based on the user's input
      const prompt = input; // Input is the user's message
      const result = await model.generateContent(prompt);

      // Access and log the response text
      const botResponseText = result.response.text(); // Use the `.text()` method from your sample
      console.log(botResponseText);

      const botResponse = {
        text: botResponseText,
        sender: "bot",
      };

      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error("Error generating content:", error.message);

      let errorMessage = "Sorry, I couldn't process that request.";
      if (error.message.includes("model")) {
        errorMessage = "Failed to load the generative model. Please try again later.";
      }

      setMessages((prev) => [
        ...prev,
        { text: errorMessage, sender: "bot" },
      ]);
    }

    // Clear the input field after the response
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chatbot-container p-4 max-w-md mx-auto bg-gray-100 rounded-2xl shadow-lg shadow-black">
      <div className="chat-display mb-4 p-1">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={msg.sender === "user" ? "user-message text-right p-5" : "bot-message pr-5"}
          >
            {msg.text}
          </div>
        ))}
      </div>
      <div className="user-input flex">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask SmartPick anything..."
          className="flex-grow border rounded p-2"
        />
        <button onClick={handleSend} className="ml-2 bg-blue-800 text-white p-2 rounded">
          Send
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
