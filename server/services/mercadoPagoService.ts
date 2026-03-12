import axios from 'axios';

const MERCADO_PAGO_API = 'https://api.mercadopago.com/v1';

export class MercadoPagoService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Tokenizar una tarjeta de crédito con Mercado Pago
   */
  async tokenizeCard(cardData: {
    cardNumber: string;
    cardholderName: string;
    expiryMonth: number;
    expiryYear: number;
    cvv: string;
  }) {
    try {
      console.log('🔐 Tokenizando tarjeta con Mercado Pago...');

      const response = await axios.post(
        `${MERCADO_PAGO_API}/card_tokens`,
        {
          card_number: cardData.cardNumber,
          cardholder: {
            name: cardData.cardholderName,
          },
          expiration_month: cardData.expiryMonth,
          expiration_year: cardData.expiryYear,
          security_code: cardData.cvv,
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ Token generado:', response.data.id);
      return {
        success: true,
        token: response.data.id,
        lastFourDigits: response.data.last_four_digits,
        cardBrand: response.data.payment_method.name,
      };
    } catch (error: any) {
      console.error('❌ Error tokenizando tarjeta:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || 'Error al tokenizar tarjeta con Mercado Pago'
      );
    }
  }

  /**
   * Crear un pago con token de tarjeta
   */
  async createPayment(paymentData: {
    token: string;
    amount: number;
    description: string;
    installments?: number;
    payer?: {
      email: string;
      firstName?: string;
      lastName?: string;
    };
  }) {
    try {
      console.log('💳 Creando pago con Mercado Pago...');

      const response = await axios.post(
        `${MERCADO_PAGO_API}/payments`,
        {
          token: paymentData.token,
          amount: paymentData.amount,
          description: paymentData.description,
          installments: paymentData.installments || 1,
          payer: paymentData.payer || {},
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ Pago creado:', response.data.id);
      return {
        success: true,
        paymentId: response.data.id,
        status: response.data.status,
        statusDetail: response.data.status_detail,
      };
    } catch (error: any) {
      console.error('❌ Error creando pago:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || 'Error al crear pago con Mercado Pago'
      );
    }
  }

  /**
   * Obtener detalles de un pago
   */
  async getPayment(paymentId: string) {
    try {
      const response = await axios.get(
        `${MERCADO_PAGO_API}/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      return {
        success: true,
        payment: response.data,
      };
    } catch (error: any) {
      console.error('❌ Error obteniendo pago:', error.response?.data || error.message);
      throw new Error('Error al obtener detalles del pago');
    }
  }
}

export default MercadoPagoService;
