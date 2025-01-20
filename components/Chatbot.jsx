import { useState, useRef, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { marked } from "marked";
import axios from "axios";
import "../styles/globals.css";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_API_KEY);
const RAPID_API_KEY = process.env.NEXT_PUBLIC_RAPID_API_KEY;

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];
    setHistory(savedHistory);
  }, []);

  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchProducts = async (query) => {
    const options = {
      method: "GET",
      hostname: "realtime-amazon-data.p.rapidapi.com",
      path: "/product-details?asin=B09J9X8DLR&country=us",
      headers: {
        "x-rapidapi-key": RAPID_API_KEY,
        "x-rapidapi-host": "realtime-amazon-data.p.rapidapi.com",
      },
    };

    try {
      const response = await axios.request(options);
      if (!response.data.data || !response.data.data.products) {
        throw new Error("Invalid API response format");
      }

      return response.data.data.products.map((product) => ({
        product_name: product.product_title,
        product_price: product.product_price || "Price not available",
        product_rating: product.product_rating || "No rating",
        product_url: product.product_url,
        product_image: product.product_photo,
        product_description: product.product_description || "No description available",
        reviews_count: product.reviews_count || 0,
        asin: product.asin,
      }));
    } catch (error) {
      console.error("Error fetching products:", error);
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
  };

  const generateProductSummary = async (products) => {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const productDetails = products
        .slice(0, 5)
        .map(
          (p) => `
Product: ${p.product_name}
Price: ${p.product_price}
Rating: ${p.product_rating} (${p.reviews_count} reviews)
Description: ${p.product_description}
        `
        )
        .join("\n\n");

      const prompt = `You are a helpful shopping assistant. Analyze these Amazon products and provide a detailed summary:
      ${productDetails}
      
      Please provide:
      1. Best overall product recommendation with reasoning
      2. Best value for money option
      3. Price comparison analysis
      4. Common features across products
      5. Notable differences between products
      
      Format your response in Markdown with appropriate headers. Keep it concise but informative.`;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("Error generating summary:", error);
      throw new Error("Failed to analyze products");
    }
  };

  const formatProductResponse = (products, summary) => {
    const productList = products
      .slice(0, 5)
      .map(
        (product) => `
### ${product.product_name}
- 💰 Price: ${product.product_price}
- ⭐ Rating: ${product.product_rating} (${product.reviews_count} reviews)
- 🔗 [View on Amazon](${product.product_url})
${product.product_image ? `- 🖼️ [Product Image](${product.product_image})` : ""}
      `
      )
      .join("\n");

    return `
# Product Analysis

${summary}

## Top Products Found
${productList}

---
*Prices and availability are from Amazon via RapidAPI. Prices may vary.*
    `;
  };

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
      if (input.toLowerCase().match(/(product|buy|price|amazon|shop|purchase)/)) {
        const searchQuery = input
          .toLowerCase()
          .replace(/(find|show|products|for|about|buy|recommend|can you|search|look up)/g, "")
          .trim();

        setMessages((prev) => [
          ...prev,
          { text: `🔍 Searching Amazon for "${searchQuery}"...`, sender: "bot" },
        ]);

        const products = await fetchProducts(searchQuery);

        if (products && products.length > 0) {
          setMessages((prev) => [
            ...prev,
            { text: "🤔 Analyzing products and generating recommendations...", sender: "bot" },
          ]);

          const summary = await generateProductSummary(products);
          const formattedResponse = formatProductResponse(products, summary);

          const botResponse = {
            text: formattedResponse,
            sender: "bot",
          };

          setMessages((prev) => prev.slice(0, -2).concat([botResponse]));
          setHistory((prev) => {
            const updatedHistory = [...prev];
            updatedHistory[updatedHistory.length - 1].messages.push(botResponse);
            return updatedHistory;
          });
        } else {
          throw new Error("No products found");
        }
      } else {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const result = await model.generateContent(input);
        const botResponse = { text: result.response.text(), sender: "bot" };
        setMessages((prev) => [...prev, botResponse]);
        setHistory((prev) => {
          const updatedHistory = [...prev];
          updatedHistory[updatedHistory.length - 1].messages.push(botResponse);
          return updatedHistory;
        });
      }
    } catch (error) {
      let errorMessage = "An error occurred while processing your request. Please try again.";

      if (error.message.includes("No products found")) {
        errorMessage = "Sorry, I couldn't find any products matching your search. Please try different keywords.";
      } else if (error.message.includes("API")) {
        errorMessage = "Sorry, I'm having trouble connecting to Amazon right now. Please try again later.";
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

  const parseMarkdown = (markdown) => {
    return { __html: marked(markdown) };
  };

  const handleResetHistory = () => {
    if (window.confirm("Are you sure you want to clear all chat history?")) {
      localStorage.removeItem("chatHistory");
      setHistory([]);
      setMessages([]);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div
        className={`fixed top-0 left-0 h-full transition-all duration-500 ease-in-out ${
          isSidebarOpen ? "w-72" : "w-0"
        } bg-white shadow-lg border-r-2 overflow-hidden z-20`}
      >
        <div className="p-4">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Chat History</h2>
          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-8rem)]">
            {history.map((session, index) => (
              <div
                key={session.id}
                className="cursor-pointer hover:bg-gray-200 p-3 rounded-lg transition-colors"
                onClick={() => handleSessionClick(index)}
              >
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">{session.timestamp}</span>
                </p>
                <p className="text-sm text-gray-500 truncate">{session.messages[0].text}</p>
              </div>
            ))}
          </div>
          {history.length > 0 && (
            <button
              onClick={handleResetHistory}
              className="mt-4 w-full py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Clear History
            </button>
          )}
        </div>
      </div>
      <div
        className={`flex-1 flex flex-col h-full transition-all duration-500 ease-in-out ${
          isSidebarOpen ? "ml-72" : "ml-0"
        }`}
      >
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="fixed top-4 left-4 z-30 p-2 bg-white rounded-full hover:bg-gray-100 shadow-md transition-colors"
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {isSidebarOpen ? "←" : "→"}
        </button>
        <div className="flex-1 overflow-y-auto p-4 pb-32">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <p className="text-xl font-semibold">Welcome to the AI Shopping Assistant!</p>
              <p className="mt-2">Ask me about products or any other questions you have.</p>
              <p className="mt-1 text-sm">Try asking:</p>
              <div className="mt-2 space-y-1">
                <p>"Find me the best gaming laptops under $1500"</p>
                <p>"What are the top-rated wireless earbuds?"</p>
                <p>"Search for 4K monitors for home office"</p>
              </div>
            </div>
          )}
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg mb-4 max-w-3xl mx-auto ${
                msg.sender === "user" ? "bg-blue-500 text-white" : "bg-white shadow-md"
              }`}
            >
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={parseMarkdown(msg.text)}
              />
            </div>
          ))}
          <div ref={messagesEndRef} />
          {isProcessing && (
            <div className="p-4 rounded-lg mb-4 max-w-3xl mx-auto bg-white shadow-md">
              <div className="flex items-center space-x-2">
                <div className="animate-bounce">⋯</div>
                <p>Processing your request...</p>
              </div>
            </div>
          )}
        </div>
        <div className="fixed bottom-8 left-0 right-0 px-4 z-20">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/80 backdrop-blur-md shadow-lg rounded-lg p-4 border border-gray-200">
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search for products or ask any question..."
                  className="flex-1 p-3 bg-transparent border rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                  disabled={isProcessing}
                />
                <button
                  onClick={handleSend}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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
