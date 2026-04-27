
export interface LabsMobileResponse {
  subid?: string;
  error?: string;
  [key: string]: any;
}

export async function sendSMS(phoneNumber: string, message: string): Promise<LabsMobileResponse> {
  const user = process.env.LABSMOBILE_USER;
  const token = process.env.LABSMOBILE_TOKEN;
  const sender = process.env.LABSMOBILE_SENDER || 'DASO';

  if (!user || !token) {
    throw new Error('LABSMOBILE_USER or LABSMOBILE_TOKEN not configured in environment');
  }

  const auth = Buffer.from(`${user}:${token}`).toString('base64');
  
  // Limpiar número de teléfono (debe incluir el código de país, ej: 52 para México)
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const finalPhone = cleanPhone.startsWith('52') ? cleanPhone : `52${cleanPhone}`;

  try {
    const response = await fetch('https://api.labsmobile.com/json/send', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        message: message,
        tpoa: sender,
        recipient: [{ msisdn: finalPhone }]
      })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('LabsMobile API Error:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getLabsMobileBalance(): Promise<{ balance: number; error?: string }> {
  const user = process.env.LABSMOBILE_USER;
  const token = process.env.LABSMOBILE_TOKEN;

  if (!user || !token) {
    return { balance: 0, error: 'Credentials not configured' };
  }

  const auth = Buffer.from(`${user}:${token}`).toString('base64');

  try {
    const response = await fetch('https://api.labsmobile.com/json/balance', {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Cache-Control': 'no-cache'
      }
    });

    const data = await response.json();
    // LabsMobile devuelve balance en créditos
    return { balance: data.credits || 0 };
  } catch (error) {
    console.error('LabsMobile Balance Error:', error);
    return { balance: 0, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
