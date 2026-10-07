/**
 * PONTO DE ENTRADA DO MÓDULO BIA AUTÔNOMA
 * SmartGestor - Brago Distribuidora
 */

const MetasAutonomasService = require('./metas-autonomas.service');
const BiaCronMetasService = require('./bia-cron-metas.service');
const controller = require('./bia-autonoma.controller');
const routes = require('./bia-autonoma.routes');

module.exports = {
  MetasAutonomasService,
  BiaCronMetasService,
  controller,
  routes
};
