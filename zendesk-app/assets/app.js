var client = ZAFClient.init();
client.invoke('resize', { width: '100%', height: '600px' });

let API_URL = null;
let API_KEY = null;

client.metadata().then(({ settings }) => {
  API_URL = settings.API_URL; // e.g. https://dev-care.parkingmd.com/api/extension/task-details
  API_KEY = settings.X_KEY;   // base64 key

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
});

async function init() {
  try {
    showLoading('Fetching patient info…');

    const requesterRes = await client.get('ticket.requester');
    const requester = requesterRes?.['ticket.requester'] ?? {};

    const email = requester.email;
    const phone = requester.phone;

    if (!email && !phone) {
      throw new Error('Requester has no email or phone');
    }

    const html = await fetchHtml({ email, phone });
    renderHtml(html);
  } catch (err) {
    showError(err);
    console.error(err);
  }
}

function showLoading(text) {
  const el = document.getElementById('loading');
  if (el) {
    el.style.display = 'block';
    el.textContent = text;
  }
}

function showError(err) {
  const el = document.getElementById('loading');
  if (el) {
    el.style.display = 'block';
    el.innerHTML = `<span style="color:red">Error: ${err?.message ?? err}</span>`;
  }
}

async function fetchHtml({ email, phone }) {
  const response = await client.request({
    url: API_URL,
    type: 'GET',
    headers: {
      'x-api-key': API_KEY,
    },
    data: {
      email,
      phone,
    },
  });

  if (!response) {
    throw new Error('Empty response from server');
  }

  return response;
}

function renderHtml(html) {
  const loadingEl = document.getElementById('loading');
  const contentEl = document.getElementById('content');

  if (loadingEl) loadingEl.style.display = 'none';
  if (contentEl) contentEl.innerHTML = html;
}
