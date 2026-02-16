import axios from "axios";

export const sendSms = async ({ mobileNos, message, templateId }) => {
  try {
    const response = await axios.get(
      "http://msg.icloudsms.com/rest/services/sendSMS/sendGroupSms",
      {
        params: {
          AUTH_KEY: process.env.SMS_AUTH_KEY,
          message,
          senderId: process.env.SMS_SENDER_ID,
          routeId: process.env.SMS_ROUTE_ID,
          mobileNos,
          smsContentType: "english",
          entityid: process.env.SMS_ENTITY_ID,
          tmid: process.env.SMS_TM_ID,
          templateid: templateId || "",
          concentFailoverId: process.env.SMS_CONCENT_FAILOVER_ID,
        },
        timeout: 10000,
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("SMS Error:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};
