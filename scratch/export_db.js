const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const dbUrl = 'mysql://root:dWKKvzdfAqgRWbbjscWHRItNPXZjrtvy@reseau.proxy.rlwy.net:18663/railway';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl
    }
  }
});

async function run() {
  try {
    console.log('--- Step 1: Connecting to DB ---');
    const tables = await prisma.$queryRawUnsafe('SHOW TABLES;');
    console.log('Connection SUCCESS! Total tables found:', tables.length);

    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log('Tables:', tableNames.join(', '));

    console.log('\n--- Step 2: Row Counts & Schema Verification ---');
    const counts = {};
    for (const tbl of tableNames) {
      try {
        const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM \`${tbl}\`;`);
        counts[tbl] = Number(count[0].count);
      } catch (e) {
        counts[tbl] = 'Error: ' + e.message;
      }
    }
    console.table(counts);

    console.log('\n--- Step 3: Exporting Database Dump to SQL ---');
    let sqlDump = `-- Database Export: ZaneZion Database
-- Generated at: ${new Date().toISOString()}
-- Source: ${dbUrl.replace(/:[^:@]+@/, ':***@')}

SET FOREIGN_KEY_CHECKS = 0;

`;

    for (const tbl of tableNames) {
      // 1. Create table DDL
      const createTableResult = await prisma.$queryRawUnsafe(`SHOW CREATE TABLE \`${tbl}\`;`);
      const createSql = createTableResult[0]['Create Table'];
      sqlDump += `--\n-- Table structure for table \`${tbl}\`\n--\n\n`;
      sqlDump += `DROP TABLE IF EXISTS \`${tbl}\`;\n`;
      sqlDump += `${createSql};\n\n`;

      // 2. Table Data
      const rows = await prisma.$queryRawUnsafe(`SELECT * FROM \`${tbl}\`;`);
      if (rows.length > 0) {
        sqlDump += `--\n-- Dumping data for table \`${tbl}\` (${rows.length} rows)\n--\n\n`;
        
        // Batch insert
        const cols = Object.keys(rows[0]);
        const colList = cols.map(c => `\`${c}\``).join(', ');
        
        const valueRows = rows.map(row => {
          const vals = cols.map(c => {
            const val = row[c];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return val;
            if (typeof val === 'boolean') return val ? 1 : 0;
            if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
            return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;
          });
          return `(${vals.join(', ')})`;
        });

        // Write in batches of 100
        for (let i = 0; i < valueRows.length; i += 100) {
          const batch = valueRows.slice(i, i + 100);
          sqlDump += `INSERT INTO \`${tbl}\` (${colList}) VALUES\n${batch.join(',\n')};\n`;
        }
        sqlDump += '\n';
      }
    }

    sqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`;

    const exportPath = path.join(__dirname, 'database_export.sql');
    fs.writeFileSync(exportPath, sqlDump, 'utf8');
    console.log(`Database exported successfully to: ${exportPath}`);
    console.log(`File size: ${(Buffer.byteLength(sqlDump, 'utf8') / 1024).toFixed(2)} KB`);

  } catch (err) {
    console.error('Database Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
