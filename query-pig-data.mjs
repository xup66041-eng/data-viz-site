import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Query card 270001 data
const [rows] = await connection.execute(
  'SELECT period, itemName, value FROM dataPoints WHERE cardId = 270001 ORDER BY period DESC, itemName'
);

console.log('Card 270001 Data:');
console.log(rows);

// Query the specific row with value 61895
const [rows2] = await connection.execute(
  'SELECT period, itemName, value FROM dataPoints WHERE cardId = 270001 AND value = 61895'
);

console.log('\nData point with value 61895:');
console.log(rows2);

await connection.end();
