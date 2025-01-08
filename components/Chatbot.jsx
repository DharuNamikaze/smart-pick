import { useState, useRef, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { marked } from "marked"; // Import marked library
import "../styles/globals.css";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_API_KEY);

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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

  const handleResetHistory = () => {
    localStorage.removeItem("chatHistory");
    setHistory([]);
    setMessages([]);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar with smoother transition */}
      <div 
        className={`fixed top-0 left-0 h-full transition-all duration-500 ease-in-out ${
          isSidebarOpen ? 'w-72' : 'w-0'
        } bg-white shadow-lg border-r-2 overflow-hidden z-20`}
      >
        <div className="p-4">
          <h2 className="text-xl font-semibold text-gray-700">Chat History</h2>
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
      </div>

      {/* Main chat area */}
      <div className={`flex-1 flex flex-col h-full transition-all duration-500 ease-in-out ${
        isSidebarOpen ? 'ml-72' : 'ml-0'
      }`}>
        {/* Toggle button with better positioning */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="fixed top-4 left-4 z-30 p-2 bg-white rounded-full hover:bg-gray-100 shadow-md"
        >
          {isSidebarOpen ? '←' : '→'}
        </button>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 pb-32">
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

        {/* Floating prompt bar */}
        <div className="fixed bottom-8 left-0 right-0 px-4 z-20">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/80 backdrop-blur-md shadow-lg rounded-lg p-3 border border-gray-200">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type your message..."
                  className="flex-1 p-2 bg-transparent border rounded-lg focus:outline-none focus:border-blue-500"
                  disabled={isProcessing}
                />
                <button
                  onClick={handleSend}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
                >
                  {isProcessing ? "Processing..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
