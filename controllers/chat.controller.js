import axios from "axios";

const chatBot = async (req, res) => {
  try {
    const { user_id, query, language } = req.body;

    if (!user_id || !query) {
      return res.status(400).json({
        status: "error",
        message: "user_id and query are required",
      });
    }

    // Call external chatbot API
    const response = await axios.post("https://python.krishigyanai.com/api/chat", {
      user_id,
      query,
      language: language || "English", // fallback to English
    });

    // console.log("Chatbot API response:", response.data);

    return res.json({
      status: "success",
      answer: response.data.answer || null,
    });
  } catch (err) {
    console.error("❌ Error calling chatbot:", err.message || err);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// chat history
const chatHistory = async (req, res) => {
  try {
    const { user_id, limit = 10, skip = 0 } = req.params;

    if (!user_id) {
      return res.status(400).json({
        status: "error",
        message: "user_id is required",
      });
    }

    // Call external chat history API
    const response = await axios.get(
      `https://python.krishigyanai.com/api/chat-history/`,
      {
        params: {
          user_id,
          limit,
          skip,
        },
      }
    );

    // console.log("Chat history API response:", response.data);

    return res.json({
      status: "success",
      data: response.data, // This should contain the list of previous messages
    });
  } catch (err) {
    console.error("❌ Error fetching chat history:", err.message || err);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export { chatBot, chatHistory };