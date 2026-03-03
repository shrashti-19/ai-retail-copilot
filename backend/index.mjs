// export const handler = async (event) => {

//   const body = JSON.parse(event.body || "{}");
//   const question = body.question?.toLowerCase() || "";

//   let insight = "Please ask about sales, inventory, or specific product.";

//   if (question.includes("shoes")) {
//     insight = "Sales for Shoes dropped significantly week-over-week. Inventory is low, indicating possible stockout risk.";
//   } 
//   else if (question.includes("inventory")) {
//     insight = "Inventory levels for certain products are below optimal levels. Consider restocking fast-moving items.";
//   }
//   else if (question.includes("sales")) {
//     insight = "Overall sales show mixed trends. Some categories are growing while others are declining.";
//   }

//   return {
//     statusCode: 200,
//     headers: {
//       "Access-Control-Allow-Origin": "*",
//       "Access-Control-Allow-Headers": "Content-Type",
//       "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
//     },
//     body: JSON.stringify({
//       question: question,
//       insight: insight
//     }),
//   };
// };

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: "ap-south-1", // Mumbai region
});

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const userPrompt = body.prompt || "Show inventory risks.";

    const systemPrompt = `
You are a Retail Intelligence Copilot designed for executive-level retail decision support.

Follow structured retail analytics logic strictly.
Always anchor to Analysis Period: Feb 1 – Mar 2, 2026.

Apply:
- Risk thresholds
- Forecasting math
- Financial impact calculation
- Scenario simulation
- Anomaly detection

Keep output structured and executive-level.
`;

    const requestBody = {
      messages: [
        {
          role: "system",
          content: [{ text: systemPrompt }]
        },
        {
          role: "user",
          content: [{ text: userPrompt }]
        }
      ],
      inferenceConfig: {
        maxTokens: 900,
        temperature: 0.3,
        topP: 0.9
      }
    };

    const command = new InvokeModelCommand({
      modelId: "arn:aws:bedrock:ap-south-1:YOUR_ACCOUNT_ID:inference-profile/YOUR_PROFILE_ID",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(requestBody),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    const outputText = responseBody.output.message.content[0].text;

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ insight: outputText }),
    };

  } catch (error) {
    console.error("Error:", error);

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ insight: "Error generating AI response." }),
    };
  }
};
