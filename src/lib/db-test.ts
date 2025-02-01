import 'dotenv/config';
import * as mysql from 'mysql2/promise';

async function testDatabaseConnection() {
  const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'flowlearn',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'News-info',
    port: parseInt(process.env.DB_PORT || '3306')
  };

  console.log('Databasanslutningsinställningar:');
  console.log(JSON.stringify(dbConfig, null, 2));

  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Anslutning lyckades!');
    
    const [rows] = await connection.query('SELECT 1 + 1 AS result');
    console.log('Testfråga resultat:', rows);

    await connection.end();
  } catch (error) {
    console.error('❌ Anslutningsfel:');
    console.error('Felmeddelande:', (error as Error).message);
    console.error('Feldetaljer:', error);
    process.exit(1);
  }
}

testDatabaseConnection();
