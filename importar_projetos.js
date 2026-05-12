require('dotenv').config();

// Fix: força uso do DNS do Google para resolver o SRV do MongoDB Atlas
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Importar Models
const Padeiro = require('./Banco Padeiros/Padeiro');
const Produto = require('./Banco produtos/Produto');
const Cliente = require('./clientes/Cliente');

const uri = process.env.MONGODB_URI;

async function uploadJsonToMongo() {
  try {
    console.log("Conectando ao MongoDB Atlas...");
    await mongoose.connect(uri);
    console.log("Conectado com sucesso!");
    
    // 4. Caminho para o seu arquivo JSON (passado via argumento no terminal)
    const jsonFilePath = process.argv[2];
    
    if (!jsonFilePath || !fs.existsSync(jsonFilePath)) {
      console.error(`❌ Arquivo não encontrado ou não informado: ${jsonFilePath}`);
      console.log("Uso: node importar_projetos.js data/padeiros.json");
      return;
    }
    let Model;
    if (jsonFilePath.includes('padeiros')) Model = Padeiro;
    else if (jsonFilePath.includes('produtos')) Model = Produto;
    else if (jsonFilePath.includes('clientes')) Model = Cliente;
    else {
      // Fallback para schema flexível se não for um dos principais
      Model = mongoose.model('Generic', new mongoose.Schema({}, { strict: false }), 'extra_data');
    }

    // 5. Lendo e interpretando o arquivo JSON
    const rawData = fs.readFileSync(jsonFilePath, 'utf8');
    const dados = JSON.parse(rawData);

    // Garantindo que os dados sejam um array
    const docs = Array.isArray(dados) ? dados : [dados];

    console.log(`Encontrado(s) ${docs.length} registro(s) no arquivo. Subindo para o MongoDB...`);
    
    // 6. Inserindo os dados no MongoDB
    await Model.insertMany(docs);
    console.log("Upload concluído com sucesso!");

  } catch (error) {
    console.error("Erro durante o processo:", error);
  } finally {
    // 7. Fechando a conexão
    await mongoose.connection.close();
    console.log("Conexão encerrada.");
  }
}

// Inicia a execução
uploadJsonToMongo();
