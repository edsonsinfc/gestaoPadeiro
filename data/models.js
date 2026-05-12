/**
 * Mongoose Models - BRAGO Sistema Padeiro
 * All schemas and models for MongoDB
 */
const { mongoose } = require('./db');
const Schema = mongoose.Schema;

// ─── PADEIRO ───────────────────────────────
const padeiroSchema = new Schema({
  nome: String,
  cargo: String,
  funcao: String,
  filial: String,
  localTrabalho: String,
  dataNascimento: String,
  cpf: String,
  rg: String,
  pis: String,
  carteiraTrabalho: String,
  numSerie: String,
  email: { type: String, default: '' },
  emailPessoal: String,
  emailCorporativo: String,
  telefone: String,
  estado: String,
  codigoExterno: String,
  desligado: String,
  codTec: { type: String, index: true },
  dataAdmissao: String,
  fusoHorario: String,
  passwordHash: { type: String, default: null },
  firstAccessToken: { type: String, default: null },
  firstAccessExpiry: String,
  ativo: { type: Boolean, default: true },
  role: { type: String, default: 'padeiro', enum: ['padeiro', 'gestor'] },
  criadoEm: String,
  atualizadoEm: String
}, { timestamps: false, versionKey: false });

// ─── PRODUTO ───────────────────────────────
const produtoSchema = new Schema({
  codigo: String,
  descricao: String,
  fornecedor: String,
  fotoPath: String,
  ativo: { type: Boolean, default: true },
  criadoEm: String
}, { timestamps: false, versionKey: false });

// ─── CLIENTE ───────────────────────────────
const clienteSchema = new Schema({
  numero: Schema.Types.Mixed,
  nome: String,
  cnpj: String,
  inscricaoEstadual: String,
  telefone: String,
  endereco: String,
  cidade: String,
  estado: String,
  cep: String,
  latitude: Schema.Types.Mixed,
  longitude: Schema.Types.Mixed,
  horarioAbertura: String,
  horarioFechamento: String,
  diasFuncionamento: String,
  ativo: { type: Boolean, default: true },
  criadoEm: String
}, { timestamps: false, versionKey: false });

// ─── COLABORADOR ───────────────────────────
const colaboradorSchema = new Schema({
  nome: String,
  cargo: String,
  filial: String,
  emailPessoal: String,
  emailCorporativo: String,
  telefone: String,
  criadoEm: String
}, { timestamps: false, versionKey: false });

// ─── ADMIN ─────────────────────────────────
const adminSchema = new Schema({
  nome: String,
  email: { type: String, index: true },
  passwordHash: String,
  role: { type: String, default: 'admin' },
  ativo: { type: Boolean, default: true },
  criadoEm: String
}, { timestamps: false, versionKey: false });

// ─── META ──────────────────────────────────
const metaSchema = new Schema({
  padeiroId: { type: String, index: true },
  padeiroNome: String,
  metaKg: Number,
  periodo: String,
  tipo: String,
  criadoPor: String,
  criadoEm: String,
  atualizadoEm: String
}, { timestamps: false, versionKey: false });

// ─── ATIVIDADE ─────────────────────────────
const atividadeSchema = new Schema({
  padeiroId: { type: String, index: true },
  padeiroNome: String,
  clienteId: String,
  clienteNome: String,
  cronogramaId: String,
  produtoId: String,
  produtoNome: String,
  kgTotal: Schema.Types.Mixed,
  status: { type: String, default: 'em_andamento' },
  data: { type: String, index: true },
  hora: String,
  inicioEm: String,
  terminadoEm: String,
  fimEm: String,
  tempoMinimoMinutos: { type: Number, default: 0 },
  fotos: Schema.Types.Mixed,
  assinatura: String,
  localizacao: String,
  latitude: Schema.Types.Mixed,
  longitude: Schema.Types.Mixed,
  observacao: String,
  notaCliente: Number,
  atualizadoEm: String
}, { strict: false, timestamps: false, versionKey: false });

// ─── AVALIACAO ─────────────────────────────
const avaliacaoSchema = new Schema({
  padeiroId: { type: String, index: true },
  padeiroNome: String,
  nota: Number,
  tipo: String,
  criterios: Schema.Types.Mixed,
  avaliadoPor: String,
  avaliadoPorNome: String,
  observacao: String,
  criadoEm: String
}, { strict: false, timestamps: false, versionKey: false });

// ─── CRONOGRAMA ────────────────────────────
const cronogramaSchema = new Schema({
  padeiroId: { type: String, index: true },
  padeiroNome: String,
  codTec: String,
  clienteId: String,
  clienteNome: String,
  data: { type: String, index: true },
  horario: String,
  status: { type: String, default: 'pendente' },
  tempoMinimoMinutos: { type: Number, default: 0 },
  posicao: { type: Number, default: 0 },
  observacao: String,
  criadoPor: String,
  criadoEm: String,
  atualizadoEm: String
}, { timestamps: false, versionKey: false });

// ─── CRITERIO ──────────────────────────────
const criterioSchema = new Schema({
  texto: String,
  tipo: String
}, { timestamps: false, versionKey: false });

// ─── EXPORT MODELS ─────────────────────────
// Use _id as string 'id' in JSON output
function addIdTransform(schema) {
  schema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      return ret;
    }
  });
  schema.set('toObject', {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      return ret;
    }
  });
}

[padeiroSchema, produtoSchema, clienteSchema, colaboradorSchema, adminSchema,
 metaSchema, atividadeSchema, avaliacaoSchema, cronogramaSchema, criterioSchema
].forEach(addIdTransform);

module.exports = {
  Padeiro: mongoose.model('Padeiro', padeiroSchema),
  Produto: mongoose.model('Produto', produtoSchema),
  Cliente: mongoose.model('Cliente', clienteSchema),
  Colaborador: mongoose.model('Colaborador', colaboradorSchema),
  Admin: mongoose.model('Admin', adminSchema),
  Meta: mongoose.model('Meta', metaSchema),
  Atividade: mongoose.model('Atividade', atividadeSchema),
  Avaliacao: mongoose.model('Avaliacao', avaliacaoSchema),
  Cronograma: mongoose.model('Cronograma', cronogramaSchema),
  Criterio: mongoose.model('Criterio', criterioSchema)
};
