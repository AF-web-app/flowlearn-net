const mysql = require('mysql2/promise');
require('dotenv/config');

async function setupDevDatabase() {
  try {
    // Connect to MySQL without specifying a database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT || '3306'),
    });

    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'flowlearn_blog'}\``);
    console.log(`Database ${process.env.DB_NAME || 'flowlearn_blog'} created or already exists.`);

    // Connect to the specific database
    const dbConnection = await mysql.createConnection({
      ...connection.config,
      database: process.env.DB_NAME || 'flowlearn_blog',
    });

    // Create blog_posts table if it doesn't exist
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        excerpt TEXT,
        content TEXT NOT NULL,
        image_url VARCHAR(255),
        published_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_published_date (published_date),
        INDEX idx_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('blog_posts table created or already exists.');

    // Optional: Insert sample data if table is empty
    const [rows] = await dbConnection.query('SELECT COUNT(*) as count FROM blog_posts');
    if (rows[0].count === 0) {
      await dbConnection.query(`
        INSERT INTO blog_posts (title, slug, excerpt, content, image_url) VALUES 
        (
          'Digitalt Lärande: Framtidens Utbildning', 
          'digitalt-larande-framtidens-utbildning', 
          'Utforska hur digital teknik revolutionerar utbildningslandskapet.', 
          '# Digitalt Lärande: En Revolutionerande Resa\n\nI takt med den teknologiska utvecklingen förändras även vårt sätt att lära och undervisa. Digital pedagogik öppnar upp för helt nya möjligheter...', 
          'https://example.com/digital-learning.jpg'
        ),
        (
          'IKT-Pedagogik: Strategier för Framgång', 
          'ikt-pedagogik-strategier-for-framgang', 
          'Effektiva strategier för att integrera informations- och kommunikationsteknik i undervisningen.', 
          '## Moderna Pedagogiska Metoder\n\nInformations- och kommunikationsteknik (IKT) har blivit en central del av modern utbildning...', 
          'https://example.com/ict-pedagogy.jpg'
        )
      `);
      console.log('Sample blog posts inserted.');
    }

    await dbConnection.end();
    await connection.end();
    console.log('Database setup complete!');
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

setupDevDatabase();
