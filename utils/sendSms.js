import axios from "axios";

export const sendSms = async ({ mobileNos, message, templateId }) => {
  try {
    const baseUrl = "http://msg.icloudsms.com/rest/services/sendSMS/sendGroupSms";
    
    const params = new URLSearchParams({
      AUTH_KEY: process.env.SMS_AUTH_KEY,
      senderId: process.env.SMS_SENDER_ID,
      routeId: process.env.SMS_ROUTE_ID,
      mobileNos,
      smsContentType: "english",
      templateid: templateId || "",
      concentFailoverId: process.env.SMS_CONCENT_FAILOVER_ID,
      message,
    });

    const response = await axios.get(`${baseUrl}?${params.toString()}`, {
      timeout: 10000,
    });

    return { success: true, data: response.data };

  } catch (error) {
    console.error("SMS Error:", error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};
