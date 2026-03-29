// Hashback API Credentials
const API_KEY = "h26210DzY5gys";
const ACCOUNT_ID = "HP345842";

// Use proxy in development, full URL in production
const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const API_BASE_URL = isDevelopment ? "/api/hashback" : "https://api.hashback.co.ke/api/v2";

export interface InitiateSTKPushRequest {
  api_key: string;
  account_id: string;
  amount: string;
  msisdn: string;
  reference: string;
}

export interface InitiateSTKPushResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  CustomerMessage?: string;
}

export interface CheckTransactionStatusRequest {
  api_key: string;
  account_id: string;
  checkoutid: string;
}

export interface CheckTransactionStatusResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string;
  ResultDesc: string;
}

/**
 * Initiate STK Push to customer's M-Pesa
 * @param amount - Amount to be charged (in KES)
 * @param phoneNumber - Phone number in format 2547XXXXXXXX or 0712345678
 * @param reference - Unique reference for this transaction
 * @returns Promise with checkout_id for tracking
 */
export async function initiateSTKPush(
  amount: string,
  phoneNumber: string,
  reference: string
): Promise<InitiateSTKPushResponse> {
  // Convert phone number to international format if needed
  const msisdn = formatPhoneNumber(phoneNumber);

  console.log(
    "Hashback API key in use (masked):",
    `${API_KEY.slice(0, 5)}...${API_KEY.slice(-4)}`
  );

  const requestBody: InitiateSTKPushRequest = {
    api_key: API_KEY,
    account_id: ACCOUNT_ID,
    amount,
    msisdn,
    reference,
  };

  console.log("STK Push Request:", JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${API_BASE_URL}/initiatestk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("STK Push Error Response:", response.status, errorText);
    throw new Error(`STK Push failed: ${response.status} - ${errorText}`);
  }

  const data: InitiateSTKPushResponse = await response.json();
  console.log("STK Push Success Response:", data);
  
  // Check if response indicates success (ResponseCode "0")
  if (data.ResponseCode !== "0") {
    throw new Error(data.ResponseDescription || "STK Push failed");
  }
  
  return data;
}

/**
 * Check transaction status using checkout_id
 * @param checkoutId - The checkout_id returned from initiateSTKPush
 * @returns Promise with transaction status details
 */
export async function checkTransactionStatus(
  checkoutId: string
): Promise<CheckTransactionStatusResponse> {
  const requestBody: CheckTransactionStatusRequest = {
    api_key: API_KEY,
    account_id: ACCOUNT_ID,
    checkoutid: checkoutId,
  };

  const response = await fetch(`${API_BASE_URL}/transactionstatus`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Status check failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Poll for transaction status until success, failure, or timeout
 * @param checkoutId - The checkout_id to track
 * @param maxAttempts - Maximum number of polling attempts (default: 30)
 * @param intervalMs - Milliseconds between attempts (default: 3000)
 * @returns Promise that resolves when transaction completes or rejects on timeout
 */
export async function pollTransactionStatus(
  checkoutId: string,
  maxAttempts: number = 30,
  intervalMs: number = 3000
): Promise<CheckTransactionStatusResponse> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const checkStatus = async () => {
      try {
        attempts++;
        const status = await checkTransactionStatus(checkoutId);

        // ResultCode "0" means success
        // Any other ResultCode indicates failure or pending
        if (status.ResultCode === "0") {
          resolve(status);
          return;
        }

        // If we've reached max attempts, reject with timeout
        if (attempts >= maxAttempts) {
          reject(new Error("Transaction polling timeout - please check status manually"));
          return;
        }

        // Continue polling
        setTimeout(checkStatus, intervalMs);
      } catch (error) {
        reject(error);
      }
    };

    checkStatus();
  });
}

/**
 * Format phone number to international format (254XXXXXXXXX)
 * Handles both 07XXXXXXXX and 254XXXXXXXXX formats
 */
function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  const digits = phone.replace(/\D/g, "");

  // If starts with 07 or 01, convert to 254 format
  if (digits.startsWith("0") && digits.length === 10) {
    return `254${digits.substring(1)}`;
  }

  // If starts with 254 already, return as is
  if (digits.startsWith("254") && digits.length === 12) {
    return digits;
  }

  // If starts with 7 or 1 and has 9 digits, add 254 prefix
  if ((digits.startsWith("7") || digits.startsWith("1")) && digits.length === 9) {
    return `254${digits}`;
  }

  return digits;
}

/**
 * Validate phone number format
 * Accepts: 07XXXXXXXX, 01XXXXXXXX, 254XXXXXXXXX
 */
export function isValidPhoneNumber(phone: string): boolean {
  const formatted = formatPhoneNumber(phone);
  return /^254[17]\d{8}$/.test(formatted);
}

// KES to USD conversion rate (approximately 130 KES = 1 USD, adjust as needed)
export const KES_TO_USD_RATE = 130;

/**
 * Convert KES amount to USD
 * @param kesAmount - Amount in Kenyan Shillings
 * @returns Amount in USD
 */
export function convertKesToUsd(kesAmount: number): number {
  return kesAmount / KES_TO_USD_RATE;
}
