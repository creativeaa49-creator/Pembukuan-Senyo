/**
 * Google Sheets Synchronization Engine for Senyo
 * This helper dynamically handles environment switching:
 * 1. Tries to use the server-side `/api/proxy` route.
 * 2. If it is running on a static hosting environment like Vercel (where `/api/proxy` doesn't exist and returns 404/405/Network Error),
 *    it automatically falls back to direct client-side fetch.
 * 3. Uses `text/plain` for POST requests to completely bypass browser CORS OPTIONS preflight checks when communicating with Apps Script.
 */

interface SyncPayload {
  events: any[];
}

/**
 * Checks if a string is a valid JSON.
 */
function attemptParseJSON(text: string): { status: 'success' | 'error'; data?: any; message?: string } {
  const trimmed = text.trim();
  if (trimmed.startsWith('<') || text.toLowerCase().includes('doctype html') || text.toLowerCase().includes('google-signin')) {
    return {
      status: 'error',
      message: 'Google Apps Script mengembalikan halaman HTML. Ini biasanya terjadi karena Web App dideploy dengan akses terbatas. Silakan buka Google Sheets Anda, Deploy Ulang (New Deployment) dengan memilih "Who has access" -> "Anyone" (Siapa saja) bray!'
    };
  }
  try {
    const data = JSON.parse(text);
    return { status: 'success', data };
  } catch (err) {
    return {
      status: 'error',
      message: 'Gagal mendownload data: Respons dari Web App Google Sheets bukan format JSON yang valid.'
    };
  }
}

/**
 * Fetches data from Google Sheets (GET / Pull)
 */
export async function pullFromSheets(sheetUrl: string): Promise<any[]> {
  const queryUrl = `${sheetUrl}${sheetUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
  
  // Try Proxy first
  try {
    const proxyResponse = await fetch(`/api/proxy?url=${encodeURIComponent(queryUrl)}`);
    if (proxyResponse.ok) {
      const text = await proxyResponse.text();
      const parse = attemptParseJSON(text);
      if (parse.status === 'success') {
        if (parse.data?.status === 'success' && Array.isArray(parse.data.events)) {
          return parse.data.events;
        } else if (parse.data?.status === 'error') {
          throw new Error(parse.data.message || 'Error dari Apps Script.');
        }
      } else {
        throw new Error(parse.message);
      }
    } else if (proxyResponse.status !== 404 && proxyResponse.status !== 405) {
      // If proxy responded with internal error, let's bubble it up or let fallback try
      throw new Error(`Proxy error: ${proxyResponse.status}`);
    }
  } catch (proxyError) {
    console.warn('Proxy GET failed, trying direct client-to-sheets fetch...', proxyError);
  }

  // Fallback: Direct client-side fetch
  try {
    const directResponse = await fetch(queryUrl, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!directResponse.ok) {
      throw new Error(`Google Sheets membalas dengan status: ${directResponse.status}`);
    }
    
    const text = await directResponse.text();
    const parse = attemptParseJSON(text);
    if (parse.status === 'success') {
      if (parse.data?.status === 'success' && Array.isArray(parse.data.events)) {
        return parse.data.events;
      } else if (parse.data?.status === 'error') {
        throw new Error(parse.data.message || 'Error dari Apps Script.');
      }
      throw new Error('Format respon Google Sheets tidak kompatibel.');
    } else {
      throw new Error(parse.message);
    }
  } catch (directError: any) {
    console.error('Direct GET Sync failed too:', directError);
    throw new Error(directError.message || 'Koneksi ke Google Sheets gagal bray. Periksa jaringan dan setelan deploy Web App Anda bray!');
  }
}

/**
 * Pushes data to Google Sheets (POST / Push)
 */
export async function pushToSheets(sheetUrl: string, payload: SyncPayload): Promise<boolean> {
  // Try Proxy first
  try {
    const proxyResponse = await fetch('/api/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: sheetUrl,
        body: payload
      })
    });

    if (proxyResponse.ok) {
      const text = await proxyResponse.text();
      const parse = attemptParseJSON(text);
      if (parse.status === 'success' && parse.data?.status === 'success') {
        return true;
      } else if (parse.status === 'error') {
        throw new Error(parse.message);
      } else {
        throw new Error(parse.data?.message || 'Gagal menyimpan database.');
      }
    } else if (proxyResponse.status !== 404 && proxyResponse.status !== 405) {
      throw new Error(`Proxy error: ${proxyResponse.status}`);
    }
  } catch (proxyError) {
    console.warn('Proxy POST failed, trying direct client-to-sheets push...', proxyError);
  }

  // Fallback: Direct client-side POST (Using text/plain to bypass OPTIONS preflight CORS checks)
  try {
    const directResponse = await fetch(sheetUrl, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (!directResponse.ok) {
      throw new Error(`Google Sheets membalas dengan status: ${directResponse.status}`);
    }

    const text = await directResponse.text();
    const parse = attemptParseJSON(text);
    if (parse.status === 'success') {
      if (parse.data?.status === 'success') {
        return true;
      }
      throw new Error(parse.data?.message || 'Web App Google Sheets melaporkan kegagalan pengiriman bray.');
    } else {
      throw new Error(parse.message);
    }
  } catch (directError: any) {
    console.error('Direct POST Sync failed too:', directError);
    throw new Error(directError.message || 'Gagal mengirim data. Pastikan status Web App dideploy dengan benar bray.');
  }
}

/**
 * Tests connection with Google Sheets
 */
export async function testConnection(sheetUrl: string): Promise<string> {
  const queryUrl = `${sheetUrl}${sheetUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
  
  // Try Proxy first
  try {
    const proxyResponse = await fetch(`/api/proxy?url=${encodeURIComponent(queryUrl)}`);
    if (proxyResponse.ok) {
      const text = await proxyResponse.text();
      const parse = attemptParseJSON(text);
      if (parse.status === 'success') {
        if (parse.data?.status === 'success') {
          return 'Koneksi Sukses! Web App Google Sheets terhubung dengan sangat lancar bray!';
        } else {
          return parse.data?.message || 'Menerima respons eror dari Apps Script.';
        }
      } else {
        throw new Error(parse.message);
      }
    } else if (proxyResponse.status !== 404 && proxyResponse.status !== 405) {
      throw new Error(`Proxy error: ${proxyResponse.status}`);
    }
  } catch (proxyError) {
    console.warn('Proxy testConnection failed, trying direct...', proxyError);
  }

  // Fallback: Direct client-side fetch
  try {
    const directResponse = await fetch(queryUrl, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!directResponse.ok) {
      throw new Error(`Google Sheets membalas dengan status: ${directResponse.status}`);
    }
    
    const text = await directResponse.text();
    const parse = attemptParseJSON(text);
    if (parse.status === 'success') {
      if (parse.data?.status === 'success') {
        return 'Koneksi Sukses & Realtime bray! Web App terhubung mandiri tanpa proxy!';
      } else {
        throw new Error(parse.data?.message || 'Apps Script melaporkan error.');
      }
    } else {
      throw new Error(parse.message);
    }
  } catch (directError: any) {
    console.error('Direct testConnection failed too:', directError);
    throw new Error(directError.message || 'Pastikan Web App dideploy dengan akses "Siapa Saja (Anyone)".');
  }
}
