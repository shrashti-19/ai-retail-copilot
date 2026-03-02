export const handler = async (event) => {

  const body = JSON.parse(event.body || "{}");
  const question = body.question?.toLowerCase() || "";

  let insight = "Please ask about sales, inventory, or specific product.";

  if (question.includes("shoes")) {
    insight = "Sales for Shoes dropped significantly week-over-week. Inventory is low, indicating possible stockout risk.";
  } 
  else if (question.includes("inventory")) {
    insight = "Inventory levels for certain products are below optimal levels. Consider restocking fast-moving items.";
  }
  else if (question.includes("sales")) {
    insight = "Overall sales show mixed trends. Some categories are growing while others are declining.";
  }

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
    },
    body: JSON.stringify({
      question: question,
      insight: insight
    }),
  };
};