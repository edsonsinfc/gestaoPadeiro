const cors = require('cors');

const corsOptions = {
  origin: "*", // Permite todas as origens (ajustar para produção se necessário)
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 204
};

module.exports = cors(corsOptions);
