export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Proxying STK request:', JSON.stringify(req.body, null, 2));
    
    // Use native fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch('https://api.hashback.co.ke/api/v2/initiatestk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(req.body),
      signal: controller.signal,
    });
    
    clearTimeout(timeout);

    const text = await response.text();
    console.log('Hashback response:', response.status, text.substring(0, 500));

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      return res.status(200).json({ 
        ResponseCode: "1", 
        ResponseDescription: "Invalid response from payment provider"
      });
    }
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ 
      ResponseCode: "1",
      ResponseDescription: "Payment service temporarily unavailable: " + error.message
    });
  }
}
