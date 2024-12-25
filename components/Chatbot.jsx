import { useState, useRef, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { marked } from "marked"; // Import marked library
import "../styles/globals.css";

const genAI = new GoogleGenerativeAI("");

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];
    setHistory(savedHistory);
  }, []);

  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(history));
  }, [history]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage = { text: input, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);
    setHistory((prev) => [
      ...prev,
      { id: Date.now(), timestamp: new Date().toLocaleString(), messages: [userMessage] },
    ]);
    setInput("");
    setIsProcessing(true);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

      const prompt = `You are a product recommendation assistant. When a user asks for product suggestions, respond with a formatted list like this:
      - **Product Name 1**: Brief description. [Price: $XX.XX]
      - **Product Name 2**: Brief description. [Price: $XX.XX]
      - **Product Name 3**: Brief description. [Price: $XX.XX]

      Only include relevant products based on the user's query. Here is the user's message: "${input}"`;

      const result = await model.generateContent(prompt);
      const botResponseText = result.response.text();

      const botResponse = { text: botResponseText, sender: "bot" };
      setMessages((prev) => [...prev, botResponse]);
      setHistory((prev) => {
        const updatedHistory = [...prev];
        updatedHistory[updatedHistory.length - 1].messages.push(botResponse);
        return updatedHistory;
      });
    } catch (error) {
      let errorMessage = "Sorry, I couldn't process that request.";
      if (error.message.includes("model")) {
        errorMessage = "Failed to load the generative model. Please try again later.";
      }
      const errorResponse = { text: errorMessage, sender: "bot" };
      setMessages((prev) => [...prev, errorResponse]);
      setHistory((prev) => {
        const updatedHistory = [...prev];
        updatedHistory[updatedHistory.length - 1].messages.push(errorResponse);
        return updatedHistory;
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSessionClick = (index) => {
    const selectedSession = history[index];
    setMessages(selectedSession.messages);
  };

  // Function to parse markdown using marked library
  const parseMarkdown = (markdown) => {
    return marked(markdown);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Chat History Sidebar */}
      <div className="w-1/4 bg-white p-4 shadow-md border-r-2 overflow-y-auto">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Chat History</h2>
        {history.map((session) => (
          <div
            key={session.id} // Use session id as key for chat history sessions
            className="mb-3 cursor-pointer hover:bg-gray-200 p-2 rounded-lg"
            onClick={() => handleSessionClick(history.indexOf(session))}
          >
            <p className="text-sm text-gray-600">
              <span className="font-semibold">{session.timestamp}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Right Chat Interface */}
      <div className="w-3/4 flex flex-col bg-white text-black p-6">
        <div className="flex-grow chat-display overflow-y-auto h-80 p-4 bg-gray-50 rounded-lg shadow-sm mb-6">
          {messages.map((msg, index) => (
            <div
              key={index} // Add key here for each message
              className={`p-3 rounded-lg mb-2 ${
                msg.sender === "user"
                  ? "bg-blue-500 text-white self-end ml-auto max-w-xs"
                  : "bg-gray-300 text-black self-start mr-auto max-w-xs"
              }`}
              dangerouslySetInnerHTML={{
                __html: parseMarkdown(msg.text), // Parse markdown before rendering
              }}
            />
          ))}
          {isProcessing && <div className="bot-message p-3 bg-gray-300 rounded-lg">Thinking...</div>}
        </div>

        {/* Input Area */}
        <div className="user-input flex items-center mt-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask SmartPick anything..."
            className="flex-grow border-2 border-gray-300 rounded-lg p-3 bg-gray-100 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            className="ml-4 px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold disabled:bg-gray-400"
            disabled={isProcessing}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
