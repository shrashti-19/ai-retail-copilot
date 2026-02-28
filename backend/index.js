export const handler = async (event) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: "Retail Intelligence API is running 🚀",
      timestamp: new Date().toISOString(),
      region: "ap-south-1"
    }),
  };

  return response;
};