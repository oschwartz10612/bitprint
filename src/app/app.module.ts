import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { AngularFireModule } from '@angular/fire';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { AngularFireFunctionsModule, ORIGIN } from '@angular/fire/functions';
import { AngularFireAuthModule } from '@angular/fire/auth';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { environment } from '../environments/environment';
import { CheckoutComponent } from './checkout/checkout.component';
import { GenerateComponent } from './generate/generate.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { HomeComponent } from './home/home.component';
import { TermsComponent } from './terms/terms.component';
import { PrivacyComponent } from './privacy/privacy.component';
import { SupportComponent } from './support/support.component';
import { RefundComponent } from './refund/refund.component';
import { AboutComponent } from './about/about.component';
import { SuccessComponent } from './success/success.component';

@NgModule({
  declarations: [
    AppComponent,
    CheckoutComponent,
    GenerateComponent,
    NotFoundComponent,
    HomeComponent,
    TermsComponent,
    PrivacyComponent,
    SupportComponent,
    RefundComponent,
    AboutComponent,
    SuccessComponent,
    InsertComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFirestoreModule,
    AngularFireFunctionsModule,
    FormsModule,
    AngularFireAuthModule,
    ReactiveFormsModule,
    HttpClientModule,
  ],
  providers: [{ provide: ORIGIN, useValue: 'https://bitprint.io' }],
  bootstrap: [AppComponent]
})
export class AppModule { }