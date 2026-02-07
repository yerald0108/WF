// backend/src/utils/orderHelpers.js

/**
 * Generar número de orden único
 * Formato: ORD-YYMM-TIMESTAMP-RANDOM
 * Ejemplo: ORD-2502-456789-123
 */
const generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `ORD-${year}${month}-${timestamp}${random}`;
};

/**
 * Validar transición de estado
 */
const isValidStatusTransition = (currentStatus, newStatus) => {
  const transitions = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['processing', 'cancelled'],
    'processing': ['ready', 'cancelled'],
    'ready': ['shipped', 'cancelled'],
    'shipped': ['delivered'],
    'delivered': [],
    'cancelled': [],
    'refunded': []
  };

  return transitions[currentStatus]?.includes(newStatus) || false;
};

/**
 * Obtener mensaje amigable del estado
 */
const getStatusMessage = (status) => {
  const messages = {
    'pending': 'Orden Pendiente de Confirmación',
    'confirmed': 'Orden Confirmada',
    'processing': 'Orden en Preparación',
    'ready': 'Orden Lista para Entrega',
    'shipped': 'Orden Enviada',
    'delivered': 'Orden Entregada',
    'cancelled': 'Orden Cancelada',
    'refunded': 'Orden Reembolsada'
  };

  return messages[status] || status;
};

/**
 * Obtener etiqueta del método de pago
 */
const getPaymentMethodLabel = (method) => {
  const labels = {
    'cash': 'Efectivo',
    'transfer': 'Transferencia Bancaria',
    'card': 'Tarjeta',
    'yappy': 'Yappy',
    'nequi': 'Nequi',
    'other': 'Otro'
  };

  return labels[method] || method;
};

module.exports = {
  generateOrderNumber,
  isValidStatusTransition,
  getStatusMessage,
  getPaymentMethodLabel
};