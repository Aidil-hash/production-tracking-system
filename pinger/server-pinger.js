import https from 'https';

setInterval(() => {
  https.get('https://project-roland.onrender.com/', (res) => {
    console.log(`Pinged server. Status: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error('Error pinging server:', err);
  });
}, 5 * 60 * 1000); // Every 5 minutes