export const handler = async (event) => {

  const question = event.queryStringParameters?.question?.toLowerCase() || "";

  let insight = "Please ask about sales, inventory, or specific product.";

  const retailData = {
    shoes: {
      salesLastWeek: 120,
      salesPreviousWeek: 200,
      inventory: 40
    },
    tshirts: {
      salesLastWeek: 300,
      salesPreviousWeek: 250,
      inventory: 500
    }
  };

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
    body: JSON.stringify({
      question: question,
      insight: insight
    }),
  };
};