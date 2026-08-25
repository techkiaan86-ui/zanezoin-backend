import axios from 'axios';

async function debugRailwayUserObject() {
  try {
    const loginRes = await axios.post('https://zanezoin-backend-production.up.railway.app/api/v1/auth/login', {
      email: 'superadmin@zanezion.com',
      password: 'admin123'
    });

    console.log('Login Response User Data:');
    console.log(JSON.stringify(loginRes.data.data.user, null, 2));

  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

debugRailwayUserObject();
