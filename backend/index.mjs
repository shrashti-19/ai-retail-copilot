import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: "ap-south-1",
});

function generateRetailContext(question) {
  if (question.toLowerCase().includes("women")) {
    return {
      region: "Mumbai",
      category: "Women's Footwear",
      lastWeekSales: 4800,
      thisWeekSales: 6200,
      inventory: 1100,
      stockoutRate: 0.22,
      grossMargin: 0.38,
      onlineShare: 0.64
    };
  }

  if (question.toLowerCase().includes("shoes")) {
    return {
      region: "Mumbai",
      category: "Footwear",
      lastWeekSales: 7200,
      thisWeekSales: 8950,
      inventory: 2000,
      stockoutRate: 0.18,
      grossMargin: 0.35,
      onlineShare: 0.58
    };
  }

  return {
    region: "Mumbai",
    category: "General Retail",
    lastWeekSales: 10000,
    thisWeekSales: 11500,
    inventory: 5000,
    stockoutRate: 0.12,
    grossMargin: 0.32,
    onlineShare: 0.52
  };
}

export const handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : event;
    const question = body.question || "";

    const data = generateRetailContext(question);

    const growthRate =
      (data.thisWeekSales - data.lastWeekSales) / data.lastWeekSales;

    const contextBlock = `
Retail Data Context:
Region: ${data.region}
Category: ${data.category}
Last Week Sales: ${data.lastWeekSales} units
This Week Sales: ${data.thisWeekSales} units
Weekly Growth Rate: ${(growthRate * 100).toFixed(1)}%
Inventory On Hand: ${data.inventory} units
Stockout Rate: ${(data.stockoutRate * 100).toFixed(1)}%
Gross Margin: ${(data.grossMargin * 100).toFixed(1)}%
Online Share: ${(data.onlineShare * 100).toFixed(1)}%
`;

    const systemPrompt = `
You are a Retail Risk Intelligence Engine for Bharat MSMEs.

STRICT RULES:
- Use ONLY the provided Retail Data Context.
- Do NOT invent numbers.
- Perform calculations explicitly.
- Keep units separate from revenue.
- No storytelling.
- Executive structured output only.

TIME CONTEXT:
Assume today is March 3, 2026.
If 30-day analysis required:
"Analysis Period: Feb 1 – Mar 2, 2026"

RISK THRESHOLDS:

Stockout Risk:
0–10% → LOW RISK
10–20% → MODERATE RISK
>20% → HIGH RISK

Escalating Risk:
If stockout >10% AND growth >10%

Overstock Risk:
If Inventory > 4 weeks of sales

Dead Stock:
If no SKU aging → INSUFFICIENT DATA

FORECASTING:
If growth >10%:
Projected Demand = (This Week Sales × 4) × (1 + Growth Rate)

FINANCIAL IMPACT:
Potential Demand = This Week Sales / (1 - Stockout Rate)
Lost Units = Potential Demand - This Week Sales
Revenue Opportunity = Lost Units × Average Selling Price
(Do NOT assume selling price.)

OUTPUT STRUCTURE:

Retail Intelligence Report
Analysis Period: Feb 1 – Mar 2, 2026

1. Current Performance
2. Risk Classification
3. 30-Day Demand Forecast
4. Financial Impact
5. Executive Actions (3 bullets only)

Scenario Outlook (Next 30 Days)
If no action taken →
If actions executed →

Anomaly Detection Layer
(Trigger if growth >15% OR stockout >15%)

Add AI Confidence Score (Low / Medium / High)
`;

    const finalPrompt = `
${systemPrompt}

${contextBlock}

User Query:
${question}
`;

    const command = new InvokeModelCommand({
      modelId:
        "arn:aws:bedrock:ap-south-1:YOUR_ACCOUNT_ID:inference-profile/YOUR_PROFILE_ID",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: [{ text: finalPrompt }]
          }
        ],
        inferenceConfig: {
          maxTokens: 700,
          temperature: 0.2
        }
      }),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    const aiText = responseBody.output.message.content[0].text;

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ insight: aiText }),
    };

  } catch (error) {
    console.error("Error:", error);

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        insight: "Error generating AI response.",
      }),
    };
  }
};