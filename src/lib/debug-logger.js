// Debug-logger för WordPress-autentisering
// Denna fil används för att logga information om WordPress-autentisering i produktionsmiljön

export function logWordPressCredentials() {
  console.log('=== WordPress Credentials Debug ===');
  console.log(`WORDPRESS_URL: ${process.env.WORDPRESS_URL ? 'finns (längd: ' + process.env.WORDPRESS_URL.length + ')' : 'saknas'}`);
  console.log(`WORDPRESS_USERNAME: ${process.env.WORDPRESS_USERNAME ? 'finns (längd: ' + process.env.WORDPRESS_USERNAME.length + ')' : 'saknas'}`);
  console.log(`WORDPRESS_APP_PASSWORD: ${process.env.WORDPRESS_APP_PASSWORD ? 'finns (längd: ' + process.env.WORDPRESS_APP_PASSWORD.length + ')' : 'saknas'}`);
  
  if (process.env.WORDPRESS_URL && process.env.WORDPRESS_USERNAME && process.env.WORDPRESS_APP_PASSWORD) {
    // Skapa Basic Auth header för att verifiera formatet
    const credentials = Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_APP_PASSWORD}`).toString('base64');
    console.log(`Basic Auth header: Basic ${credentials}`);
    
    // Visa första 4 tecknen av lösenordet för att verifiera att det är korrekt
    console.log(`App-lösenord första 4 tecken: ${process.env.WORDPRESS_APP_PASSWORD.substring(0, 4)}...`);
  }
  console.log('=== End Debug ===');
}
