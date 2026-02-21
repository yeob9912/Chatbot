const http = require('http');

const PORT = 5138;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const testUser = {
    name: 'Verifier',
    email: 'verifier@test.com',
    password: 'password123'
};

function request(path, method, body, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: '127.0.0.1',
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function verify() {
    console.log(`Starting verification on ${BASE_URL}...`);

    // 1. Check Server Root
    try {
        const root = await request('/', 'GET');
        if (root.status === 200) {
            console.log('✅ Server is reachable.');
        } else {
            console.error(`❌ Server returned ${root.status} on root.`);
            process.exit(1);
        }
    } catch (e) {
        console.error('❌ Server is NOT reachable. Is it running?');
        console.error(e.message);
        process.exit(1);
    }

    // 2. Register/Login
    console.log('Attempting login...');
    let token = '';
    let login = await request('/api/auth/login', 'POST', { email: testUser.email, password: testUser.password });

    if (login.status === 200) {
        token = login.body.token;
        console.log('✅ Login successful.');
    } else {
        console.log('Login failed, attempting registration...');
        const register = await request('/api/auth/register', 'POST', {
            firstName: 'Verifier',
            lastName: 'Test',
            email: testUser.email,
            password: testUser.password
        });

        if (register.status === 200) {
            token = register.body.token;
            console.log('✅ Registration successful.');
        } else if (register.body.msg === 'User already exists') {
            // Retry login just in case
            login = await request('/api/auth/login', 'POST', { email: testUser.email, password: testUser.password });
            if (login.status === 200) {
                token = login.body.token;
                console.log('✅ Login successful (after exist check).');
            } else {
                console.error('❌ Login failed after user check.');
                process.exit(1);
            }
        } else {
            console.error('❌ Registration failed:', register.body);
            process.exit(1);
        }
    }

    if (!token) {
        console.error('❌ Could not obtain token.');
        process.exit(1);
    }

    // 3. Test Protected Chat Route
    console.log('Testing Chat endpoint protection...');
    const noAuthChat = await request('/api/chat', 'POST', { query: 'test' });
    if (noAuthChat.status === 401) {
        console.log('✅ Chat endpoint correctly rejected unauthenticated request.');
    } else {
        console.error(`❌ Chat endpoint allowed request without token! Status: ${noAuthChat.status}`);
    }

    // 4. Test Authenticated Chat (Simulated)
    // Note: checking if we get a 200 (or stream start) is enough to verify auth passed.
    // The chat endpoint returns a stream, so JSON.parse might fail in helper, but response status checks auth.
    console.log('Testing Authenticated Chat request...');
    /* 
       We manually request here because our helper expects JSON response but chat chunks it.
       We just look for headers status 200.
    */
    const options = {
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/chat',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    await new Promise((resolve) => {
        const req = http.request(options, (res) => {
            if (res.statusCode === 200) {
                console.log('✅ Chat endpoint accepted authenticated request.');
            } else {
                console.error(`❌ Chat endpoint failed with status ${res.statusCode}`);
            }
            resolve();
        });
        req.on('error', (e) => {
            console.error('❌ Chat request passed auth check but failed connection:', e.message);
            resolve();
        });
        req.write(JSON.stringify({ query: 'hello' }));
        req.end();
    });

    console.log('Verification Complete.');
}

verify();
