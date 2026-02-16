import admin from "../config/firebase.js";

export const sendToTokens = async (tokens, payload) => {
  if (!tokens || tokens.length === 0) {
    console.log("No tokens provided");
    return;
  }

  const message = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data || {},
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);

    console.log("FCM success:", response.successCount);
    console.log("FCM failure:", response.failureCount);

    if (response.failureCount > 0) {
      console.log("FCM Errors:", response.responses);
    }

    return response;

  } catch (error) {
    console.error("FCM Send Error:", error);
  }
};

export const sendToTopic = async (topic, payload) => {
  if (!topic) {
    console.log("No topic provided");
    return;
  }

  const message = {
    topic,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data || {},
  };

  try {
    const response = await admin.messaging().send(message);

    console.log("Topic FCM sent successfully:", response);
    return response;

  } catch (error) {
    console.error("Topic FCM error:", error);
  }
};

