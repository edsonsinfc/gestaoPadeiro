/**
 * Importador de Dados - Excel → JSON
 * Brago Sistema Padeiro
 * 
 * Importa dados de Padeiros.xls, PAN.xlsx, clientes.xlsx
 * e EMAIL E TELEFONE DOS COLABORADORES..xlsx
 * Gera COD TEC único para cada padeiro
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DATA_DIR = __dirname;
const ROOT_DIR = path.join(__dirname, '..');

function generateCodTec() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

async function importPadeiros() {
  const filePath = path.join(ROOT_DIR, 'Banco Padeiros', 'Padeiros.xls');
  if (!fs.existsSync(filePath)) {
    console.error('❌ Arquivo Padeiros.xls não encontrado!');
    return [];
  }

  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const range = XLSX.utils.decode_range(sheet['!ref']);

  const usedCodes = new Set();
  const padeiros = [];

  // Row 4 = headers, Row 5+ = data
  for (let r = 5; r <= range.e.r; r++) {
    const getCell = (c) => {
      const addr = XLSX.utils.encode_cell({ r, c });
      return sheet[addr] ? String(sheet[addr].v).trim() : '';
    };

    const nome = getCell(0);
    if (!nome) continue;

    let codTec = generateCodTec();
    while (usedCodes.has(codTec)) codTec = generateCodTec();
    usedCodes.add(codTec);

    const email = getCell(12).toLowerCase();
    
    padeiros.push({
      id: generateId(),
      nome: nome,
      cargo: getCell(1),
      funcao: getCell(2),
      filial: getCell(3),
      localTrabalho: getCell(4),
      dataNascimento: getCell(6),
      cpf: getCell(7),
      rg: getCell(8),
      pis: getCell(9),
      carteiraTrabalho: getCell(10),
      numSerie: getCell(11),
      email: email,
      telefone: getCell(13),
      estado: getCell(14),
      codigoExterno: getCell(15),
      desligado: getCell(16),
      codTec: codTec,
      dataAdmissao: getCell(19),
      fusoHorario: getCell(20),
      // Auth
      passwordHash: null, // null = primeiro acesso pendente
      firstAccessToken: null,
      firstAccessExpiry: null,
      ativo: getCell(16) !== 'SIM',
      role: getCell(1) === 'GESTOR' ? 'gestor' : 'padeiro',
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    });
  }

  return padeiros;
}

function importProdutos() {
  const filePath = path.join(ROOT_DIR, 'Banco produtos', 'PAN.xlsx');
  if (!fs.existsSync(filePath)) {
    console.error('❌ Arquivo PAN.xlsx não encontrado!');
    return [];
  }

  const wb = XLSX.readFile(filePath);
  const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

  return data.map(row => ({
    id: generateId(),
    codigo: String(row['Código'] || ''),
    descricao: row['Descrição'] || '',
    fornecedor: row['Nome do fornecedor'] || '',
    fotoPath: row['Diretório para foto do produto'] || '',
    ativo: true,
    criadoEm: new Date().toISOString()
  }));
}

function importClientes() {
  const filePath = path.join(ROOT_DIR, 'clientes', 'clientes.xlsx');
  if (!fs.existsSync(filePath)) {
    console.error('❌ Arquivo clientes.xlsx não encontrado!');
    return [];
  }

  const wb = XLSX.readFile(filePath);
  const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

  return data.map(row => ({
    id: generateId(),
    numero: row['#'],
    nome: row['Cliente'] || '',
    // Campos de localização (preenchidos futuramente)
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    latitude: null,
    longitude: null,
    // Horários de funcionamento
    horarioAbertura: '',
    horarioFechamento: '',
    diasFuncionamento: '',
    ativo: true,
    criadoEm: new Date().toISOString()
  }));
}

/**
 * Importa colaboradores da planilha de Emails e Telefones
 * Contém dados de múltiplas filiais em abas separadas
 */
function importColaboradores() {
  const filePath = path.join(ROOT_DIR, 'Email', 'EMAIL E TELEFONE DOS COLABORADORES..xlsx');
  if (!fs.existsSync(filePath)) {
    console.error('❌ Arquivo de emails não encontrado!');
    return [];
  }

  const wb = XLSX.readFile(filePath);
  const colaboradores = [];

  wb.SheetNames.forEach(sheetName => {
    const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
    data.forEach(row => {
      // Normalizar nomes de colunas (variam entre abas)
      const nome = (row['NOME '] || row['NOME'] || '').trim();
      if (!nome) return;

      const emailPessoal = (row['EMAIL PESSOAL'] || row['EMAIL'] || '').trim().replace(/^Pessoal:\s*/i, '');
      const emailCorp = (row['EMAIL CORPORATIVO'] || '').trim().replace(/^Corporativo:\s*/i, '');
      const telefone = (row['NÚMERO'] || row['NUMERO'] || '').trim();
      const cargo = (row['CARGO'] || '').trim();
      const filial = (row['CNPJ'] || row['CNJP'] || sheetName).trim();

      colaboradores.push({
        id: generateId(),
        nome,
        cargo,
        filial,
        emailPessoal: emailPessoal.toLowerCase(),
        emailCorporativo: emailCorp.toLowerCase(),
        telefone,
        criadoEm: new Date().toISOString()
      });
    });
  });

  return colaboradores;
}

/**
 * Enriquece os dados dos padeiros com email/telefone da planilha de colaboradores
 */
function enrichPadeiros(padeiros, colaboradores) {
  let enriched = 0;
  padeiros.forEach(padeiro => {
    // Busca por nome (normalizado)
    const nomeNorm = padeiro.nome.toUpperCase().trim();
    const match = colaboradores.find(c => c.nome.toUpperCase().trim() === nomeNorm);
    if (match) {
      // Se o padeiro não tem email, usar o email pessoal do colaborador
      if (!padeiro.email && match.emailPessoal) {
        padeiro.email = match.emailPessoal;
      }
      // Sempre adicionar os campos extras
      padeiro.emailPessoal = match.emailPessoal || padeiro.email || '';
      padeiro.emailCorporativo = match.emailCorporativo || '';
      if (!padeiro.telefone && match.telefone) {
        padeiro.telefone = match.telefone;
      }
      enriched++;
    }
  });
  return enriched;
}

async function createAdminUser() {
  const hash = await bcrypt.hash('Admin123', 10);
  return {
    id: 'admin-001',
    nome: 'Administrador',
    email: 'admin@brago.com',
    passwordHash: hash,
    role: 'admin',
    ativo: true,
    criadoEm: new Date().toISOString()
  };
}

/**
 * Cria usuário genérico de padeiro para testes
 * Email: padeirobrago@gmail.com / Senha: pad123
 */
async function createPadeiroUser() {
  const hash = await bcrypt.hash('pad123', 10);
  let codTec = generateCodTec();
  return {
    id: 'padeiro-teste-001',
    nome: 'Padeiro Brago (Teste)',
    cargo: 'PADEIRO PLENO',
    filial: 'Brago Goiania',
    email: 'padeirobrago@gmail.com',
    emailPessoal: 'padeirobrago@gmail.com',
    emailCorporativo: '',
    telefone: '',
    cpf: '',
    rg: '',
    codTec: codTec,
    passwordHash: hash,
    firstAccessToken: null,
    ativo: true,
    role: 'padeiro',
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString()
  };
}

async function runImport() {
  console.log('🍞 ══════════════════════════════════════════');
  console.log('   IMPORTAÇÃO DE DADOS - BRAGO SISTEMA PADEIRO');
  console.log('   ══════════════════════════════════════════\n');

  // Import Padeiros
  console.log('📋 Importando padeiros...');
  const padeiros = await importPadeiros();
  console.log(`   ✅ ${padeiros.length} padeiros importados`);

  // Import Colaboradores (Emails/Telefones)
  console.log('📧 Importando emails e telefones dos colaboradores...');
  const colaboradores = importColaboradores();
  console.log(`   ✅ ${colaboradores.length} colaboradores importados`);

  // Enriquecer padeiros com dados de email/telefone
  console.log('🔗 Enriquecendo dados dos padeiros...');
  const enriched = enrichPadeiros(padeiros, colaboradores);
  console.log(`   ✅ ${enriched} padeiros enriquecidos com email/telefone`);

  // Import Produtos
  console.log('📦 Importando produtos...');
  const produtos = importProdutos();
  console.log(`   ✅ ${produtos.length} produtos importados`);

  // Import Clientes
  console.log('🏪 Importando clientes...');
  const clientes = importClientes();
  console.log(`   ✅ ${clientes.length} clientes importados (com campos de localização preparados)`);

  // Create Admin
  console.log('🔐 Criando usuário admin...');
  const admin = await createAdminUser();
  console.log(`   ✅ Admin criado (email: admin@brago.com, senha: Admin123)`);

  // Create Padeiro test user
  console.log('👨‍🍳 Criando usuário padeiro genérico...');
  const padeiroTeste = await createPadeiroUser();
  padeiros.push(padeiroTeste);
  console.log(`   ✅ Padeiro criado (email: padeirobrago@gmail.com, senha: pad123)`);

  // Save JSON files
  const saveJSON = (filename, data) => {
    const filepath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`   💾 ${filename} salvo`);
  };

  console.log('\n💾 Salvando arquivos JSON...');
  saveJSON('padeiros.json', padeiros);
  saveJSON('produtos.json', produtos);
  saveJSON('clientes.json', clientes);
  saveJSON('colaboradores.json', colaboradores);
  saveJSON('admin.json', [admin]);
  saveJSON('metas.json', []);
  saveJSON('atividades.json', []);
  saveJSON('avaliacoes.json', []);

  // Create uploads directory
  const uploadsDir = path.join(ROOT_DIR, 'uploads');
  const producaoDir = path.join(uploadsDir, 'producao');
  const assinaturasDir = path.join(uploadsDir, 'assinaturas');
  [uploadsDir, producaoDir, assinaturasDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
  console.log('   📁 Diretórios de upload criados');

  console.log('\n══════════════════════════════════════════');
  console.log('   ✅ IMPORTAÇÃO CONCLUÍDA COM SUCESSO!');
  console.log('══════════════════════════════════════════');
  console.log(`\n   Padeiros: ${padeiros.length}`);
  console.log(`   Colaboradores: ${colaboradores.length}`);
  console.log(`   Produtos: ${produtos.length}`);
  console.log(`   Clientes: ${clientes.length}`);
  console.log(`\n   Login Padeiro: padeirobrago@gmail.com / pad123`);
  console.log(`   Login Admin:   admin@brago.com / Admin123\n`);
}

// Run if called directly
if (require.main === module) {
  runImport().catch(console.error);
}

module.exports = { importPadeiros, importProdutos, importClientes, importColaboradores, runImport };
