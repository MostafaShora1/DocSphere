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

  async createStripePaymentIntent(appointmentId: string, currency = 'usd'): Promise<StripePaymentIntentResponse> {
    return await firstValueFrom(
      this.http.post<StripePaymentIntentResponse>(`${this.baseUrl}/intent`, {
        appointment: appointmentId,
        currency
      })
    );
  }

  async createCashPayment(appointmentId: string, currency = 'usd'): Promise<CashPaymentResponse> {
    return await firstValueFrom(
      this.http.post<CashPaymentResponse>(`${this.baseUrl}/cash`, {
        appointment: appointmentId,
        currency
      })
    );
  }

  async verifyPayment(paymentId: string): Promise<any> {
    return await firstValueFrom(
      this.http.get(`${this.baseUrl}/verify/${paymentId}`)
    );
  }
}
