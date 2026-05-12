/**
 * MySQL Database Wrapper - BRAGO Sistema Padeiro
 * Mimics Mongoose interface for seamless transition
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'sistema_padeiro',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL conectado com sucesso!');
    conn.release();
  })
  .catch(err => {
    console.error('❌ ERRO AO CONECTAR NO MYSQL:', err.message);
    console.log('👉 Verifique se os dados no seu arquivo .env estão corretos.');
  });

class SqlCollection {
  constructor(name, tableName) {
    this.name = name;
    this.tableName = tableName;
  }

  // Helper to wrap results
  wrapDoc(doc) {
    if (!doc) return null;
    if (Array.isArray(doc)) return doc.map(d => this.wrapDoc(d));
    
    return {
      ...doc,
      toJSON: function() { return this; },
      toObject: function() { return this; }
    };
  }

  // Convert query object to SQL WHERE clause
  buildWhere(query) {
    const keys = Object.keys(query);
    if (keys.length === 0) return { sql: '', values: [] };
    
    const parts = [];
    const values = [];
    
    keys.forEach(key => {
      const val = query[key];
      if (val instanceof RegExp) {
        parts.push(`\`${key}\` REGEXP ?`);
        values.push(val.source);
      } else if (typeof val === 'object' && val !== null) {
        if (val.$gte) { parts.push(`\`${key}\` >= ?`); values.push(val.$gte); }
        if (val.$lte) { parts.push(`\`${key}\` <= ?`); values.push(val.$lte); }
        if (val.$in) { 
          if (Array.isArray(val.$in) && val.$in.length > 0) {
            parts.push(`\`${key}\` IN (?)`); 
            values.push(val.$in); 
          } else {
            // If empty array, force a condition that is always false for this field
            parts.push(`1 = 0`); 
          }
        }
      } else {
        parts.push(`\`${key}\` = ?`);
        values.push(val);
      }
    });
    
    return { sql: ' WHERE ' + parts.join(' AND '), values };
  }

  find(query = {}) {
    let sql = `SELECT * FROM \`${this.tableName}\``;
    let where = this.buildWhere(query);
    let orderBy = '';
    let limitClause = '';
    
    const self = this;
    const chain = {
      results: null,
      sort: (options) => {
        const key = Object.keys(options)[0];
        const dir = options[key] === -1 ? 'DESC' : 'ASC';
        orderBy = ` ORDER BY \`${key}\` ${dir}`;
        return chain;
      },
      select: () => chain,
      limit: (n) => {
        limitClause = ` LIMIT ${n}`;
        return chain;
      },
      then: async (resolve, reject) => {
        try {
          const finalSql = sql + where.sql + orderBy + limitClause;
          const [rows] = await pool.query(finalSql, where.values);
          // Parse JSON fields
          const parsedRows = rows.map(row => self.parseRow(row));
          resolve(self.wrapDoc(parsedRows));
        } catch (err) {
          if (reject) reject(err);
          else throw err;
        }
      }
    };
    return chain;
  }

  async findOne(query = {}) {
    const res = await this.find(query).limit(1);
    return res[0] || null;
  }

  async findById(id) {
    return this.findOne({ id });
  }

  async create(doc) {
    const id = doc.id || doc._id || Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    const newDoc = { ...doc, id };
    delete newDoc._id;

    const keys = Object.keys(newDoc);
    const values = keys.map(k => typeof newDoc[k] === 'object' ? JSON.stringify(newDoc[k]) : newDoc[k]);
    const placeholders = keys.map(() => '?').join(', ');
    
    const sql = `INSERT INTO \`${this.tableName}\` (\`${keys.join('`, `')}\`) VALUES (${placeholders})`;
    await pool.query(sql, values);
    
    return this.wrapDoc(newDoc);
  }

  async insertMany(docs) {
    if (!Array.isArray(docs) || docs.length === 0) return [];
    
    const results = [];
    for (const doc of docs) {
      results.push(await this.create(doc));
    }
    return results;
  }

  async findByIdAndUpdate(id, update, options = {}) {
    const keys = Object.keys(update);
    const values = keys.map(k => typeof update[k] === 'object' ? JSON.stringify(update[k]) : update[k]);
    const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
    
    const sql = `UPDATE \`${this.tableName}\` SET ${setClause} WHERE \`id\` = ?`;
    const [result] = await pool.query(sql, [...values, id]);
    
    if (result.affectedRows === 0 && options.upsert) {
      return this.create({ ...update, id });
    }
    
    return this.findById(id);
  }

  async findByIdAndDelete(id) {
    const doc = await this.findById(id);
    if (!doc) return null;
    
    const sql = `DELETE FROM \`${this.tableName}\` WHERE \`id\` = ?`;
    await pool.query(sql, [id]);
    return doc;
  }

  async deleteMany(query = {}) {
    const where = this.buildWhere(query);
    const sql = `DELETE FROM \`${this.tableName}\`${where.sql}`;
    const [result] = await pool.query(sql, where.values);
    return { deletedCount: result.affectedRows };
  }

  async countDocuments(query = {}) {
    const where = this.buildWhere(query);
    const sql = `SELECT COUNT(*) as count FROM \`${this.tableName}\`${where.sql}`;
    const [rows] = await pool.query(sql, where.values);
    return rows[0].count;
  }

  parseRow(row) {
    if (!row) return null;
    const newRow = { ...row };
    // Auto-detect JSON strings and parse them
    for (const key in newRow) {
      if (typeof newRow[key] === 'string' && (newRow[key].startsWith('{') || newRow[key].startsWith('['))) {
        try {
          newRow[key] = JSON.parse(newRow[key]);
        } catch (e) {}
      }
    }
    return newRow;
  }
}

// Model proxies
function createProxy(instance) {
  return new Proxy(instance, {
    construct(target, args) {
      const doc = args[0] || {};
      return {
        ...doc,
        save: async function() {
          if (this.id || this._id) {
            return target.findByIdAndUpdate(this.id || this._id, this);
          } else {
            const created = await target.create(this);
            Object.assign(this, created);
            return this;
          }
        },
        toJSON: function() { return this; },
        toObject: function() { return this; }
      };
    }
  });
}

module.exports = {
  pool,
  Padeiro: createProxy(new SqlCollection('Padeiro', 'padeiros')),
  Produto: createProxy(new SqlCollection('Produto', 'produtos')),
  Cliente: createProxy(new SqlCollection('Cliente', 'clientes')),
  Colaborador: createProxy(new SqlCollection('Colaborador', 'colaboradores')),
  Admin: createProxy(new SqlCollection('Admin', 'admins')),
  Meta: createProxy(new SqlCollection('Meta', 'metas')),
  Atividade: createProxy(new SqlCollection('Atividade', 'atividades')),
  Avaliacao: createProxy(new SqlCollection('Avaliacao', 'avaliacoes')),
  Cronograma: createProxy(new SqlCollection('Cronograma', 'cronogramas')),
  Criterio: createProxy(new SqlCollection('Criterio', 'criterios')),
  Localizacao: createProxy(new SqlCollection('Localizacao', 'localizacoes'))
};
