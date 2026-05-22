import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface StripePublicKeyResponse {
  publishableKey: string;
}

export interface StripePaymentIntentResponse {
  clientSecret: string;
  id: string;
  amount: number;
  currency: string;
  paymentId: string;
  status: string;
}

export interface CashPaymentResponse {
  paymentId: string;
  status: string;
  paymentMethod: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly baseUrl = `${environment.apiUrl}/payments`;

  constructor(private http: HttpClient) {}

  async getStripePublicKey(): Promise<string> {
    const res = await firstValueFrom(
      this.http.get<StripePublicKeyResponse>(`${this.baseUrl}/stripe-public-key`)
    );
    return res.publishableKey;
  }

  async createStripePaymentIntent(
    appointmentId: string,
    currency = 'usd'
  ): Promise<StripePaymentIntentResponse> {
    const res = await firstValueFrom(
      this.http.post<any>(`${this.baseUrl}/intent`, {
        appointment: appointmentId,
        currency
      })
    );

    // Backend returns: { success: true, data: { clientSecret, id, ..., paymentId, status } }
    const data = res?.data ?? res;
    return {
      clientSecret: data?.clientSecret,
      id: data?.id,
      amount: data?.amount,
      currency: data?.currency,
      paymentId: data?.paymentId,
      status: data?.status
    };
  }

  async createCashPayment(
    appointmentId: string,
    currency = 'usd'
  ): Promise<CashPaymentResponse> {
    const res = await firstValueFrom(
      this.http.post<any>(`${this.baseUrl}/cash`, {
        appointment: appointmentId,
        currency
      })
    );

    // Backend returns: { success: true, data: { paymentId, status, paymentMethod } }
    const data = res?.data ?? res;
    return {
      paymentId: data?.paymentId,
      status: data?.status,
      paymentMethod: data?.paymentMethod
    };
  }

  async verifyPayment(paymentId: string): Promise<any> {
    const res = await firstValueFrom(
      this.http.get<any>(`${this.baseUrl}/verify/${paymentId}`)
    );
    // Backend returns: { success, isPaid, status, data }
    return res;
  }
}
